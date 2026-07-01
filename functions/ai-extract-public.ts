const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

interface ExtractRequest {
  text: string;
  fileName: string;
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
    const body: ExtractRequest = await req.json();
    const { text, fileName, outputFormat } = body;

    if (!text || text.trim().length < 5) {
      return new Response(JSON.stringify({ error: 'Document text is too short or empty' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const MISTRAL_API_KEY = Deno.env.get('MISTRAL_API_KEY');
    if (!MISTRAL_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI not configured' }), {
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
            content: 'You are a document data extraction engine. Analyze the document text and extract structured data. Return JSON with: docType (string like "Invoice", "Receipt", "CV/Resume", "Purchase Order", "Form", "Contract", "Report", or "Other"), fields (array of {key, label, value, confidence}), lineItems (array of {description, quantity, unit_price, total}), and rawText (copy of input). Confidence 0-100 based on data clarity. The file name is: ' + (fileName || 'document'),
          },
          {
            role: 'user',
            content: 'Extract all structured data from this document. Target output format: ' + (outputFormat || 'xlsx') + '\n\nDocument text:\n' + text.slice(0, 15000),
          },
        ],
        temperature: 0.1,
        max_tokens: 4000,
      }),
    });

    if (!mistralResponse.ok) {
      const errorText = await mistralResponse.text();
      return new Response(JSON.stringify({ error: 'AI service error', detail: errorText.slice(0, 200) }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const mistralData = await mistralResponse.json();
    const content = mistralData.choices?.[0]?.message?.content;
    if (!content) {
      return new Response(JSON.stringify({ error: 'Empty AI response' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid AI response format' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const fields = parsed.fields || [];
    const lineItems = parsed.lineItems || [];
    const docType = parsed.docType || 'Document';
    const rawText = text.slice(0, 3000);

    const overallConfidence = fields.length > 0
      ? Math.round(fields.reduce((s: number, f: any) => s + (f.confidence || 50), 0) / fields.length)
      : 60;

    const needsReview = fields.some((f: any) => (f.confidence || 0) < 90);

    return new Response(JSON.stringify({
      success: true,
      docType,
      fileName,
      overallConfidence,
      needsReview,
      fields: fields.map((f: any) => ({
        key: f.key || f.label?.toLowerCase().replace(/\s+/g, '_') || 'field_' + Math.random().toString(36).slice(2, 6),
        label: f.label || f.key || 'Field',
        value: String(f.value ?? ''),
        confidence: Math.min(100, Math.max(0, f.confidence || 50)),
      })),
      lineItems: lineItems.map((li: any) => ({
        description: li.description || '',
        quantity: li.quantity || 1,
        unit_price: li.unit_price || 0,
        total: li.total || 0,
      })),
      rawText,
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
