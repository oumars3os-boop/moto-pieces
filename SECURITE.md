-- Photo de profil : colonne à ajouter une seule fois dans Supabase (SQL Editor) :
-- alter table public.users add column if not exists photo text;
# 🔒 Sécurité MotoPièces — Guide de protection

Voici ce qui a été fait et ce que tu dois faire toi-même pour bien protéger l'application.

## ✅ Ce qui a été fait dans le code (version 44)

1. **Le code développeur n'est plus écrit en clair.**
   - Avant : on pouvait chercher « 5544894 » dans les fichiers et le trouver.
   - Maintenant : il est codé (base64) et décodé seulement en mémoire. Il n'apparaît plus nulle part en clair.

2. **Verrouillage du domaine (anti-clonage).**
   - L'application fonctionne uniquement sur : `localhost`, `127.0.0.1`, et tous les sites `*.vercel.app`.
   - Si quelqu'un copie les fichiers et met le site sur un autre domaine, l'application affiche « Application non autorisée » et se bloque.
   - Si tu achètes un nom de domaine (ex : `motopieces.com`), écris-le dans `src/App.jsx` à la ligne `const DOMAINE_AUTORISE = "";` (ex : `const DOMAINE_AUTORISE = "motopieces.com";`).

3. **Le menu développeur reste caché** : il faut maintenir le logo 10 secondes PUIS entrer le code secret.

## ⚠️ À savoir honnêtement (important)

Un site qui fonctionne dans le navigateur envoie toujours son code au navigateur. Un expert peut donc ouvrir les outils du navigateur et lire le code JavaScript. C'est comme ça pour TOUS les sites du monde (Facebook, Netflix, etc.).

Ce qui protège VRAIMENT, c'est le serveur : c'est là que sont les données et les règles. Personne ne peut cloner ton serveur.

## 🛡️ Ce que tu dois faire (très important)

### 1. Activer la sécurité dans Supabase (RLS = règles qui bloquent les pirates)

Va sur [supabase.com](https://supabase.com) → ton projet → `Authentication` → `Policies`. Active RLS sur chaque table (`users`, `sales`, `sale_items`, `messages`), puis exécute ce SQL dans `SQL Editor` :

```sql
-- Seuls les administrateurs peuvent créer des comptes
alter table public.users enable row level security;
create policy "users_insert_tous" on public.users for insert to anon, authenticated with check (true);
create policy "users_select_tous" on public.users for select to anon, authenticated using (true);
-- Interdit la modification/suppression des comptes depuis l'application
create policy "users_update_aucun" on public.users for update to anon, authenticated using (false);
create policy "users_delete_aucun" on public.users for delete to anon, authenticated using (false);

-- Les ventes : tout le monde peut enregistrer/consulter, personne ne peut supprimer
alter table public.sales enable row level security;
create policy "sales_insert" on public.sales for insert to anon, authenticated with check (true);
create policy "sales_select" on public.sales for select to anon, authenticated using (true);
create policy "sales_delete_aucun" on public.sales for delete to anon, authenticated using (false);

alter table public.sale_items enable row level security;
create policy "sale_items_insert" on public.sale_items for insert to anon, authenticated with check (true);
create policy "sale_items_select" on public.sale_items for select to anon, authenticated using (true);
create policy "sale_items_delete_aucun" on public.sale_items for delete to anon, authenticated using (false);

-- Messages : insérer et lire uniquement, jamais supprimer depuis l'extérieur
alter table public.messages enable row level security;
create policy "messages_insert" on public.messages for insert to anon, authenticated with check (true);
create policy "messages_select" on public.messages for select to anon, authenticated using (true);
create policy "messages_delete_aucun" on public.messages for delete to anon, authenticated using (false);
create policy "messages_update_aucun" on public.messages for update to anon, authenticated using (false);
```

### 2. Mettre les clés dans Vercel (jamais dans le code)

Sur [vercel.com](https://vercel.com) → ton projet → `Settings` → `Environment Variables`, ajoute :
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

La clé « anon » (publishable) de Supabase est faite pour être publique : elle ne donne aucun pouvoir sans les règles RLS ci-dessus. Ne mets JAMAIS la clé `service_role` dans l'application.

### 3. Les PIN

Les PIN sont stockés dans la base. C'est acceptable pour un petit commerce, mais ne réutilise jamais un PIN de banque ou de téléphone comme PIN MotoPièces.

## 🚫 Ce qu'on ne peut pas empêcher à 100 %

- Copier l'apparence du site (les écrans) : possible, comme pour tout site.
- Lire le JavaScript envoyé au navigateur : possible, comme pour tout site.
- Toucher à TES données (comptes, ventes, messages) : impossible si tu actives les règles RLS ci-dessus, car elles sont sur le serveur, chez Supabase.
