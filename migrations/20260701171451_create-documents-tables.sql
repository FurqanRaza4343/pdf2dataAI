CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size BIGINT,
  file_type TEXT,
  input_format TEXT DEFAULT 'pdf',
  output_format TEXT DEFAULT 'xlsx',
  storage_path TEXT,
  status TEXT DEFAULT 'pending',
  overall_confidence INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.extracted_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  field_label TEXT NOT NULL,
  field_value TEXT,
  confidence INTEGER DEFAULT 0,
  needs_review BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  description TEXT,
  quantity INTEGER,
  unit_price NUMERIC(12,2),
  total NUMERIC(12,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.document_raw_text (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  raw_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extracted_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_raw_text ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can view own documents"
  ON public.documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users can insert own documents"
  ON public.documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users can update own documents"
  ON public.documents FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "users can delete own documents"
  ON public.documents FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "users can view own extracted fields"
  ON public.extracted_fields FOR SELECT
  USING (document_id IN (SELECT id FROM public.documents WHERE user_id = auth.uid()));

CREATE POLICY "users can insert extracted fields"
  ON public.extracted_fields FOR INSERT
  WITH CHECK (document_id IN (SELECT id FROM public.documents WHERE user_id = auth.uid()));

CREATE POLICY "users can update own extracted fields"
  ON public.extracted_fields FOR UPDATE
  USING (document_id IN (SELECT id FROM public.documents WHERE user_id = auth.uid()));

CREATE POLICY "users can view own line items"
  ON public.line_items FOR SELECT
  USING (document_id IN (SELECT id FROM public.documents WHERE user_id = auth.uid()));

CREATE POLICY "users can insert line items"
  ON public.line_items FOR INSERT
  WITH CHECK (document_id IN (SELECT id FROM public.documents WHERE user_id = auth.uid()));

CREATE POLICY "users can view own raw text"
  ON public.document_raw_text FOR SELECT
  USING (document_id IN (SELECT id FROM public.documents WHERE user_id = auth.uid()));

CREATE POLICY "users can insert raw text"
  ON public.document_raw_text FOR INSERT
  WITH CHECK (document_id IN (SELECT id FROM public.documents WHERE user_id = auth.uid()));

GRANT ALL ON public.documents TO authenticated;
GRANT ALL ON public.extracted_fields TO authenticated;
GRANT ALL ON public.line_items TO authenticated;
GRANT ALL ON public.document_raw_text TO authenticated;
