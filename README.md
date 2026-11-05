# MotoPièces — Application de gestion de boutique

Application complète : espace client (commandes par panier, recherche par nom ou par photo),
vendeur (vente par photo ou par code), secrétaire (encaissement, ticket de caisse),
administrateur (produits, marques, catégories, utilisateurs, statistiques, factures A4)
et menu développeur protégé par code secret.

Connexion sécurisée : téléphone + code PIN à 4 chiffres pour chaque compte.

## Démarrage rapide

```bash
npm install
npm run dev          # test sur l'ordinateur : http://localhost:5173
```

## Compiler pour Android (Android Studio)

```bash
npm run build
npm install @capacitor/core @capacitor/cli
npx cap init MotoPieces com.oumar.motopieces --web-dir=dist
npm install @capacitor/android
npx cap add android
npx cap sync
npx cap open android
```

Dans Android Studio : **Build → Build App Bundle(s) / APK(s) → Build APK(s)**.
L'APK est généré dans `android/app/build/outputs/apk/debug/app-debug.apk`.

## MISES À JOUR AUTOMATIQUES (sans recompiler l'APK)

L'application est configurée pour charger directement le site en ligne :
**https://moto-pieces.vercel.app** (voir `capacitor.config.json` → `server.url`).

Une fois le nouvel APK installé, vous n'avez **plus jamais besoin d'Android Studio**.
Pour mettre à jour l'application sur tous les téléphones :

1. Mettre à jour le code du site
2. Compiler le site : `npm run build`
3. Déployer le dossier `dist` sur Vercel (glisser-déposer sur vercel.com/new,
   ou `npx vercel --prod`)
4. C'est fini : au prochain lancement de l'application, la nouvelle version
   se charge automatiquement sur le téléphone (penser à actualiser / rouvrir l'app)

⚠️ Important : avec ce mode, l'application a besoin d'une connexion internet
au lancement, puisqu'elle charge le site en ligne.

## Structure du projet

- `src/App.jsx` — toute l'application (vues client, vendeur, secrétaire, admin, développeur)
- `src/components/ui/` — composants d'interface (shadcn/ui)
- `src/index.css`, `tailwind.config.js` — styles (Tailwind CSS)
- `vite.config.js` — alias `@` → `src/`
- `package.json` — toutes les dépendances avec leurs versions

## Prérequis

- Node.js 18+
- Android Studio (SDK Android API 34+, JDK 17)
- Variables d'environnement : `ANDROID_HOME`, `JAVA_HOME`
