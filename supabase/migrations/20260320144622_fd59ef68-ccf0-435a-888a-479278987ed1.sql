-- Create missing table
CREATE TABLE IF NOT EXISTS public.usuarios_operacionais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  perfil public.perfil_operacional NOT NULL DEFAULT 'zelador',
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_por UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.usuarios_operacionais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Manage operacionais" ON public.usuarios_operacionais FOR ALL USING (
  EXISTS (SELECT 1 FROM public.condominios WHERE id = condominio_id AND sindico_id = auth.uid())
);

-- Storage
INSERT INTO storage.buckets (id, name, public) VALUES ('documentos', 'documentos', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('fotos-checkin', 'fotos-checkin', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('avatares', 'avatares', true) ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN CREATE POLICY "Auth upload documentos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documentos'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "Public read documentos" ON storage.objects FOR SELECT USING (bucket_id = 'documentos'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "Auth upload fotos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'fotos-checkin'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "Public read fotos" ON storage.objects FOR SELECT USING (bucket_id = 'fotos-checkin'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "Auth upload avatares" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatares'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "Public read avatares" ON storage.objects FOR SELECT USING (bucket_id = 'avatares'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "Auth delete docs" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'documentos'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "Auth delete fotos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'fotos-checkin'); EXCEPTION WHEN duplicate_object THEN null; END $$;