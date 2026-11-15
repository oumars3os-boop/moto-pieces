# Mistral sécurisé (5 minutes)

**Pourquoi.** Une clé écrite dans l'application est envoyée à chaque navigateur : n'importe qui peut la lire et s'en servir à tes frais.
Ici, la clé reste chez Supabase. L'application appelle une petite fonction « mistral-proxy » qui parle à Mistral à sa place.
La clé n'est ni dans le code, ni dans le zip, ni dans les variables du site.

## À faire (une seule fois)

1. **Supabase → Edge Functions → Secrets** : ajoute deux secrets
   - `MISTRAL_API_KEY` = ta clé Mistral
   - `ALLOWED_ORIGINS` = l'adresse de ton site, par exemple `https://monsite.vercel.app`
     (plusieurs sites : sépare-les par des virgules)
2. **Supabase → Edge Functions → Deploy a new function** (par l'éditeur)
   - nom : `mistral-proxy`
   - colle tout le contenu du fichier `supabase/functions/mistral-proxy/index.ts`
   - clique sur **Deploy**
3. Ouvre la fonction `mistral-proxy`, dans ses réglages **désactive « Verify JWT »**.
   (Nécessaire : l'application utilise la clé `sb_publishable_…`, que ce contrôle ne comprend pas.
   La fonction vérifie elle-même la clé du projet et le site d'origine.)
4. Remplace le projet par le nouveau zip et redéploie le site.
   Si tu avais mis `VITE_MISTRAL_API_KEY` dans les variables de ton hébergeur (Vercel, Netlify…), supprime-la.
5. Sur **console.mistral.ai → Billing**, fixe une limite de dépense mensuelle.

Avec la ligne de commande Supabase, c'est équivalent :
`supabase secrets set MISTRAL_API_KEY=... ALLOWED_ORIGINS=https://monsite.vercel.app`
puis `supabase functions deploy mistral-proxy --no-verify-jwt`

## Ce que la fonction protège
- elle exige la clé du projet et refuse les sites non autorisés ;
- elle n'accepte que 3 actions (lire une photo, reconnaître un objet, assistant) et choisit elle-même le modèle ;
- elle limite la taille des photos et le nombre de demandes (20 par minute et 200 par heure et par personne) ;
- elle ne renvoie jamais la clé.

**Limite honnête :** la clé du projet est publique par nature (elle est dans l'application). La fonction empêche le vol de ta clé Mistral,
mais pas à elle seule quelqu'un qui appellerait la fonction en boucle. Les limites ci-dessus et la limite de dépense chez Mistral (étape 5) couvrent ce risque.

## Si ça ne marche pas
| Message dans l'application | Cause |
|---|---|
| « pas encore installé sur Supabase » | la fonction `mistral-proxy` n'est pas déployée (étape 2) |
| « Accès refusé… » | « Verify JWT » encore activé (étape 3) ou site absent de `ALLOWED_ORIGINS` (étape 1) |
| « secret MISTRAL_API_KEY n'est pas configuré » | étape 1 |
| « clé… refusée par Mistral » | la clé collée dans le secret est fausse ou désactivée |
| « Trop de demandes » | limite de 20 demandes par minute atteinte : attends une minute |
