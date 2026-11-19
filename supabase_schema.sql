-- =====================================================================
-- SCHÉMA BASE DE DONNÉES SUPABASE COMPLET ET CORRIGÉ (MOTO-PIECES)
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Table des utilisateurs / profils
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    nom TEXT,
    prenom TEXT,
    role TEXT DEFAULT 'vendeur' CHECK (role IN ('admin', 'secretaire', 'vendeur')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Table des catégories (id en TEXT pour s'aligner avec les clés étrangères)
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    nom TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Table des articles / pièces de moto
-- Marques supportées : TVS, Apsonic, Sanili, Fenghao, Aloba, Haojue, Sanya, Fanga, Kapano, etc.
CREATE TABLE IF NOT EXISTS public.articles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code_barre TEXT UNIQUE,
    designation TEXT NOT NULL,
    marque_moto TEXT,
    categorie_id TEXT, -- Alignement en TEXT pour correspondre à public.categories(id)
    prix_achat NUMERIC(12, 2) DEFAULT 0 CHECK (prix_achat >= 0),
    prix_vente NUMERIC(12, 2) DEFAULT 0 CHECK (prix_vente >= 0),
    quantite_stock INT DEFAULT 0 CHECK (quantite_stock >= 0),
    seuil_alerte INT DEFAULT 5,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alter de précaution si la table existait déjà avec l'ancien type UUID
DO $$ 
BEGIN 
    ALTER TABLE public.articles ALTER COLUMN categorie_id TYPE TEXT USING categorie_id::text;
EXCEPTION 
    WHEN OTHERS THEN NULL;
END $$;

-- Clé étrangère propre
ALTER TABLE IF EXISTS public.articles DROP CONSTRAINT IF EXISTS articles_categorie_id_fkey;
ALTER TABLE public.articles 
    ADD CONSTRAINT articles_categorie_id_fkey 
    FOREIGN KEY (categorie_id) 
    REFERENCES public.categories(id) 
    ON DELETE SET NULL;

-- 4. Table des ventes
CREATE TABLE IF NOT EXISTS public.ventes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code_vente TEXT UNIQUE,
    vendeur_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    montant_total NUMERIC(12, 2) NOT NULL CHECK (montant_total >= 0),
    mode_paiement TEXT DEFAULT 'espece',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Table des lignes de vente
CREATE TABLE IF NOT EXISTS public.lignes_vente (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vente_id UUID REFERENCES public.ventes(id) ON DELETE CASCADE,
    article_id UUID REFERENCES public.articles(id) ON DELETE SET NULL,
    quantite INT NOT NULL CHECK (quantite > 0),
    prix_unitaire NUMERIC(12, 2) NOT NULL CHECK (prix_unitaire >= 0),
    sous_total NUMERIC(12, 2) GENERATED ALWAYS AS (quantite * prix_unitaire) STORED,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Table de la messagerie interne
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expediteur_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    destinataire_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    contenu TEXT NOT NULL,
    lu BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Activer RLS (Row Level Security)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ventes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lignes_vente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 8. Politiques RLS (Row Level Security)
DROP POLICY IF EXISTS "Lecture profils" ON public.profiles;
CREATE POLICY "Lecture profils" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Modification profils" ON public.profiles;
CREATE POLICY "Modification profils" ON public.profiles FOR ALL USING (auth.uid() = id);

DROP POLICY IF EXISTS "Accès total categories" ON public.categories;
CREATE POLICY "Accès total categories" ON public.categories FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Accès total articles" ON public.articles;
CREATE POLICY "Accès total articles" ON public.articles FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Accès total ventes" ON public.ventes;
CREATE POLICY "Accès total ventes" ON public.ventes FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Accès total lignes_vente" ON public.lignes_vente;
CREATE POLICY "Accès total lignes_vente" ON public.lignes_vente FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Accès messagerie" ON public.messages;
CREATE POLICY "Accès messagerie" ON public.messages FOR ALL USING (auth.uid() = expediteur_id OR auth.uid() = destinataire_id);
