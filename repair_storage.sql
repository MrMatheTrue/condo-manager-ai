-- SET STORAGE BUCKETS TO PUBLIC
UPDATE storage.buckets SET public = true WHERE id IN ('documentos', 'fotos-checkin', 'avatares');

-- ENSURE RLS FOR STORAGE (If not already set)
-- This allows anyone to read if public=true, but we can still restrict uploads
DO $$ 
BEGIN
    INSERT INTO storage.policies (name, bucket_id, definition, action)
    VALUES ('Allow Public Read', 'documentos', '{"role": "anon"}', 'SELECT')
    ON CONFLICT DO NOTHING;
    
    INSERT INTO storage.policies (name, bucket_id, definition, action)
    VALUES ('Allow Public Read Checkin', 'fotos-checkin', '{"role": "anon"}', 'SELECT')
    ON CONFLICT DO NOTHING;
END $$;
