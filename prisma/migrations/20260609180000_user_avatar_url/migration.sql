-- Foto de perfil del usuario (URL pública, p. ej. Supabase Storage).

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT;
