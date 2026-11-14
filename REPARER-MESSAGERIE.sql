-- ============================================================
-- RÉPARER LA MESSAGERIE (à exécuter UNE FOIS dans Supabase > SQL Editor > Run)
-- Crée ou répare la table « messages » quel que soit son état actuel :
-- colonnes manquantes, anciennes colonnes obligatoires (ex. « auteur »),
-- anciennes règles de contrôle, droits d'écriture.
-- Sans risque : peut être relancé autant de fois que nécessaire.
-- Les anciens messages déjà présents sont conservés.
-- ============================================================

-- 1) La table (créée seulement si elle n'existe pas)
CREATE TABLE IF NOT EXISTS public.messages (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  destinataire text,
  de text,
  nom text,
  type text,
  contenu text,
  date timestamptz DEFAULT now(),
  telecharges text
);

-- 2) Les colonnes utilisées par l'application, si une ancienne table ne les avait pas
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS destinataire text;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS de text;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS nom text;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS type text;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS contenu text;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS date timestamptz DEFAULT now();
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS telecharges text;

-- 3) Retire TOUTES les obligations des anciennes versions (ex. colonne « auteur » obligatoire),
--    ainsi que les contrôles et liens vers d'autres tables qui bloqueraient l'envoi
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.column_name::text AS colonne
    FROM information_schema.columns c
    WHERE c.table_schema = 'public' AND c.table_name = 'messages'
      AND c.is_nullable = 'NO' AND c.is_identity = 'NO'
      AND c.column_name::text NOT IN (
        SELECT a.attname::text FROM pg_index i
        JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
        WHERE i.indrelid = 'public.messages'::regclass AND i.indisprimary)
  LOOP
    EXECUTE format('ALTER TABLE public.messages ALTER COLUMN %I DROP NOT NULL', r.colonne);
  END LOOP;

  FOR r IN
    SELECT conname::text AS nom_regle FROM pg_constraint
    WHERE conrelid = 'public.messages'::regclass AND contype IN ('c', 'f')
  LOOP
    EXECUTE format('ALTER TABLE public.messages DROP CONSTRAINT %I', r.nom_regle);
  END LOOP;
END $$;

-- 4) Si l'ancienne colonne « id » n'avait pas de numérotation automatique, on la lui donne
DO $$
DECLARE t text; d text; ident text;
BEGIN
  SELECT data_type, column_default, is_identity INTO t, d, ident
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'id';
  IF t IS NOT NULL AND d IS NULL AND ident = 'NO' THEN
    IF t = 'uuid' THEN
      EXECUTE 'ALTER TABLE public.messages ALTER COLUMN id SET DEFAULT gen_random_uuid()';
    ELSIF t IN ('bigint', 'integer') THEN
      EXECUTE 'CREATE SEQUENCE IF NOT EXISTS public.messages_id_seq';
      EXECUTE 'SELECT setval(''public.messages_id_seq'', COALESCE((SELECT max(id) FROM public.messages), 0) + 1, false)';
      EXECUTE 'ALTER TABLE public.messages ALTER COLUMN id SET DEFAULT nextval(''public.messages_id_seq'')';
      EXECUTE 'GRANT USAGE, SELECT ON SEQUENCE public.messages_id_seq TO anon, authenticated';
    END IF;
  END IF;
END $$;

-- 5) Droits : lecture, écriture, modification et suppression (l'application gère la confidentialité)
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lecture publique messages" ON public.messages;
CREATE POLICY "Lecture publique messages" ON public.messages FOR SELECT USING (true);
DROP POLICY IF EXISTS "Ecriture publique messages" ON public.messages;
CREATE POLICY "Ecriture publique messages" ON public.messages FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Mise a jour publique messages" ON public.messages;
CREATE POLICY "Mise a jour publique messages" ON public.messages FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Suppression publique messages" ON public.messages;
CREATE POLICY "Suppression publique messages" ON public.messages FOR DELETE USING (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO anon, authenticated;

-- 6) Temps réel sur les messages
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 7) Demande à Supabase de recharger sa liste de tables (indispensable après une réparation)
NOTIFY pgrst, 'reload schema';
