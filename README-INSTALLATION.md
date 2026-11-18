# MotoPièces — guide d'installation

## 1. Variables du site (`.env`, ou variables de ton hébergeur)
Copie `.env.example` en `.env` et remplis les deux lignes :
```
VITE_SUPABASE_URL=https://ton-projet.supabase.co
VITE_SUPABASE_ANON_KEY=ta_cle_publiable (sb_publishable_…)
```
**Aucune autre clé dans l'application.** Les clés Mistral et Cloudflare vont dans les secrets Supabase (étape 3).

## 2. Base de données (Supabase → SQL Editor → Run)
À exécuter dans cet ordre, chaque script peut être relancé sans risque :
1. `supabase_schema.sql` (tables, temps réel)
2. `REPARER-MESSAGERIE.sql` (table des messages, y compris si une ancienne version existait)
3. `SQL-VENTES-PAR-ADMIN.sql` (ventes séparées par administrateur)

## 3. Fonctions serveur (Supabase → Edge Functions)
Secrets à créer (Edge Functions → Secrets) :
| Secret | Rôle |
|---|---|
| `ALLOWED_ORIGINS` | adresse de ton site, ex. `https://monsite.vercel.app` |
| `MISTRAL_API_KEY` | reconnaissance des photos (voir `MISTRAL-SECURISE.md`) |
| `CF_TURN_KEY_ID` et `CF_TURN_API_TOKEN` | relais des appels (voir ci-dessous) |

Fonctions à déployer, **« Verify JWT » désactivé** pour chacune :
- `mistral-proxy` → `supabase/functions/mistral-proxy/index.ts`
- `ice-servers` → `supabase/functions/ice-servers/index.ts`

**Relais des appels (Cloudflare).** Sans relais, un appel entre deux téléphones sur des réseaux 4G différents échoue souvent.
Sur le tableau de bord Cloudflare : Realtime → TURN → créer une clé. Copie l'identifiant et le jeton dans les deux secrets ci-dessus.
Sans ces secrets, les appels fonctionnent seulement quand la liaison directe est possible (même Wi-Fi, ou réseaux simples), et l'écran d'appel l'indique.

## 4. Construire et publier
```
npm install
npm run build
```
Publie le dossier `dist`. **Le site doit être en https** : sans cela, le navigateur refuse le micro et la caméra.

## 5. Vérifier avant de se servir de l'application
Les tests automatiques de la logique (appels, isolation de l'objet, synchronisation) :
```
npm run test:logique
```
Ils ne remplacent pas un essai sur de vrais téléphones. Liste à faire avec **deux téléphones et deux comptes** :
1. Messages texte, photo, vidéo, vocal dans les deux sens ; ✓ puis ✓✓ puis ✓✓ bleus quand l'autre ouvre la discussion.
2. « en ligne » (point vert) et « écrit… » visibles chez l'autre.
3. Appel audio : sonne, décrocher, couper/réactiver le micro, raccrocher ; durée affichée.
4. Appel vidéo : les deux images, couper la caméra, changer de caméra, raccrocher.
5. Refuser un appel, ne pas répondre (45 s) : trace « manqué » dans la discussion.
6. Appel avec les deux téléphones **sur la 4G** (pas le même Wi-Fi) : c'est le vrai test du relais.
7. Photo d'un article : trouvé / « Aucun article ».
8. Créer un crédit, le payer ; deux administrateurs : chacun ne voit que ses ventes.
