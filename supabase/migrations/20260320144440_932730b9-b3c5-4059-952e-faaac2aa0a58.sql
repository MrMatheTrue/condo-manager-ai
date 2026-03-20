-- Step 1: Add missing columns
ALTER TABLE public.condominio_acessos ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pendente';
ALTER TABLE public.condominio_acessos ADD COLUMN IF NOT EXISTS colaborador_nome TEXT;

-- Step 2: Drop functions with CASCADE
DROP FUNCTION IF EXISTS public.has_condominio_access(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.has_role(UUID, public.app_role) CASCADE;