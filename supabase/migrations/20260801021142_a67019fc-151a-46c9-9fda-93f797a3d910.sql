GRANT USAGE ON SCHEMA auth TO sandbox_exec;
GRANT SELECT, REFERENCES ON auth.users TO sandbox_exec;
GRANT SELECT, REFERENCES ON auth.identities TO sandbox_exec;
GRANT USAGE ON SCHEMA storage TO sandbox_exec;
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO sandbox_exec;
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.buckets TO sandbox_exec;