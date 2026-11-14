-- ============================================================
-- VENTES SÉPARÉES PAR ADMINISTRATEUR
-- À exécuter UNE FOIS dans Supabase > SQL Editor > Run.
-- Sans risque : peut être relancé sans erreur, aucune vente n'est supprimée.
-- ============================================================

-- 1) Chaque vente garde l'équipe (téléphone de l'administrateur) et le nom de la personne qui l'a faite
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS equipe text;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS vendeur_personne text;
CREATE INDEX IF NOT EXISTS sales_equipe_idx ON public.sales (equipe);

-- 2) Rattache les ANCIENNES ventes à la bonne équipe quand c'est possible
--    a) par le nom de la personne (vendeur ou administrateur)
UPDATE public.sales s
SET equipe = CASE WHEN u.role = 'admin' THEN u.tel ELSE NULLIF(u.equipe, '') END
FROM public.users u
WHERE s.equipe IS NULL AND u.nom = s.vendeur_nom;

--    b) par le nom de la boutique enregistré dans les réglages de chaque administrateur
DO $$ BEGIN
  UPDATE public.sales s
  SET equipe = r.equipe
  FROM public.reglages_data r
  WHERE s.equipe IS NULL
    AND r.contenu -> 'entreprise' ->> 'nom' IS NOT NULL
    AND r.contenu -> 'entreprise' ->> 'nom' = s.vendeur_nom;
EXCEPTION WHEN undefined_table THEN NULL;   -- la table des réglages n'existe pas encore : on passe
END $$;

--    c) s'il n'y a qu'UN SEUL administrateur, toutes ses anciennes ventes sont les siennes
DO $$
DECLARE nb int; tel_admin text;
BEGIN
  SELECT count(*), max(tel) INTO nb, tel_admin FROM public.users WHERE role = 'admin';
  IF nb = 1 AND tel_admin IS NOT NULL THEN
    UPDATE public.sales SET equipe = tel_admin WHERE equipe IS NULL;
  END IF;
END $$;

-- 3) Pour attribuer à la main les ventes restantes à un administrateur précis
--    (retire les deux tirets de la ligne ci-dessous et remplace le numéro) :
-- UPDATE public.sales SET equipe = '+225XXXXXXXXXX' WHERE equipe IS NULL;

-- 4) Demande à Supabase de recharger sa liste de colonnes
NOTIFY pgrst, 'reload schema';
