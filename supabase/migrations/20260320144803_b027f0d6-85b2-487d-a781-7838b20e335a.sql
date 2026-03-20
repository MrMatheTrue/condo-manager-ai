-- Add missing SELECT policies for colaboradores and fix execucoes_checkin
DO $$ BEGIN CREATE POLICY "View obrigacoes" ON public.obrigacoes FOR SELECT USING (public.has_condominio_access(auth.uid(), condominio_id)); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "View documentos" ON public.documentos FOR SELECT USING (public.has_condominio_access(auth.uid(), condominio_id)); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "View tarefas" ON public.tarefas_checkin FOR SELECT USING (public.has_condominio_access(auth.uid(), condominio_id)); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "View execucoes" ON public.execucoes_checkin FOR SELECT USING (public.has_condominio_access(auth.uid(), condominio_id)); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "Insert execucoes" ON public.execucoes_checkin FOR INSERT WITH CHECK (executado_por = auth.uid()); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "Manage execucoes" ON public.execucoes_checkin FOR ALL USING (EXISTS (SELECT 1 FROM public.condominios WHERE id = condominio_id AND sindico_id = auth.uid())); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "Colaboradores view condos" ON public.condominios FOR SELECT USING (public.has_condominio_access(auth.uid(), id)); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "Users view own access" ON public.condominio_acessos FOR SELECT USING (user_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "Users insert own access" ON public.condominio_acessos FOR INSERT WITH CHECK (user_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Consolidate notificacoes and chat policies
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notificacoes;
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notificacoes;
DO $$ BEGIN CREATE POLICY "Own notificacoes" ON public.notificacoes FOR ALL USING (user_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN null; END $$;

DROP POLICY IF EXISTS "Users can insert own chat history" ON public.chat_ia_historico;
DROP POLICY IF EXISTS "Users can view own chat history" ON public.chat_ia_historico;
DO $$ BEGIN CREATE POLICY "Own chat" ON public.chat_ia_historico FOR ALL USING (user_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Make storage buckets public
UPDATE storage.buckets SET public = true WHERE id IN ('documentos', 'fotos-checkin');