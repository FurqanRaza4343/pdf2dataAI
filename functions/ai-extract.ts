import { createAdminClient } from 'npm:@insforge/sdk';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

interface ExtractionRequest {
  documentId: string;
  userId: string;
  text: string;
  outputFormat: string;
}

export default async function (req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body: ExtractionRequest = await req.json();
    const { documentId, userId, text, outputFormat } = body;

    if (!documentId || !userId || !text) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createAdminClient({
      baseUrl: Deno.env.get('INSFORGE_BASE_URL')!,
      apiKey: Deno.env.get('INSFORGE_API_KEY')!,
    });

    const MISTRAL_API_KEY = Deno.env.get('MISTRAL_API_KEY')!;
    if (!MISTRAL_API_KEY) {
      return new Response(JSON.stringify({ error: 'Mistral API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const mistralResponse = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + MISTRAL_API_KEY,
      },
      body: JSON.stringify({
        model: 'mistral-large-latest',
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: 'You are an AI document extraction engine. Extract structured data from the provided document text. Return JSON with: fields (array of {key, label, value, confidence}), lineItems (array of {description, quantity, unit_price, total}), and rawText. Confidence should be 0-100 based on how clear/complete the data appears. Fields with unclear or missing data should get lower confidence.',
          },
          {
            role: 'user',
            content: 'Extract all data fields and line items from this document. Output format target: ' + outputFormat + '\n\nDocument text:\n' + text,
          },
        ],
        temperature: 0.1,
        max_tokens: 4000,
      }),
    });

    if (!mistralResponse.ok) {
      const errorText = await mistralResponse.text();
      return new Response(JSON.stringify({ error: 'Mistral API error', detail: errorText }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const mistralData = await mistralResponse.json();
    const content = mistralData.choices?.[0]?.message?.content;
    if (!content) {
      return new Response(JSON.stringify({ error: 'No content in Mistral response' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      return new Response(JSON.stringify({ error: 'Failed to parse Mistral response as JSON' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const fields = parsed.fields || [];
    const lineItems = parsed.lineItems || [];
    const rawText = parsed.rawText || text;

    const overallConfidence = fields.length > 0
      ? Math.round(fields.reduce((sum: number, f: any) => sum + (f.confidence || 0), 0) / fields.length)
      : 50;

    const needsReview = fields.some((f: any) => (f.confidence || 0) < 90);

    await admin.database.from('extracted_fields').delete().match({ document_id: documentId });
    await admin.database.from('line_items').delete().match({ document_id: documentId });
    await admin.database.from('document_raw_text').delete().match({ document_id: documentId });

    if (fields.length > 0) {
      const fieldRows = fields.map((f: any) => ({
        document_id: documentId,
        field_key: f.key || f.label?.toLowerCase().replace(/\s+/g, '_') || 'unknown',
        field_label: f.label || f.key || 'Unknown',
        field_value: String(f.value ?? ''),
        confidence: Math.min(100, Math.max(0, f.confidence || 50)),
        needs_review: (f.confidence || 0) < 90,
      }));
      await admin.database.from('extracted_fields').insert(fieldRows);
    }

    if (lineItems.length > 0) {
      const itemRows = lineItems.map((li: any) => ({
        document_id: documentId,
        description: li.description || '',
        quantity: li.quantity || 0,
        unit_price: li.unit_price || 0,
        total: li.total || 0,
      }));
      await admin.database.from('line_items').insert(itemRows);
    }

    await admin.database.from('document_raw_text').insert([{
      document_id: documentId,
      raw_text: rawText,
    }]);

    await admin.database.from('documents').update({
      status: needsReview ? 'needs_review' : 'completed',
      overall_confidence: overallConfidence,
      updated_at: new Date().toISOString(),
    }).match({ id: documentId });

    return new Response(JSON.stringify({
      success: true,
      overallConfidence,
      needsReview,
      fieldsCount: fields.length,
      lineItemsCount: lineItems.length,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
