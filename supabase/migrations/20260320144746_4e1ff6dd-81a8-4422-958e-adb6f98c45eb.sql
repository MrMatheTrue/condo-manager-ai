-- Recreate helper functions first
CREATE OR REPLACE FUNCTION public.has_role(uid UUID, r public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = uid AND role = r);
$$;

CREATE OR REPLACE FUNCTION public.has_condominio_access(uid UUID, cid UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.condominios WHERE id = cid AND sindico_id = uid
    UNION ALL
    SELECT 1 FROM public.condominio_acessos WHERE condominio_id = cid AND user_id = uid AND status = 'aprovado'
  );
$$;