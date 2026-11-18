# Ce qui a été testé, et comment

| Fonction | Testé | Comment |
|---|---|---|
| Moteur d'appels (sonnerie, décrocher, refuser, occupé, manqué, annuler, micro, caméra avant/arrière, coupure réseau, reconnexion) | **Oui** : 31 vérifications | `tests/test_appels.mjs`, avec de faux téléphones |
| Isolation de l'objet (retrait du fond) | **Oui** : 11 cas | `tests/test_objet.mjs`, images de synthèse |
| Synchronisation, fusion des crédits, montants | **Oui** : 12 vérifications | `tests/test_sync.mjs` |
| Règle de correspondance OCR, reconnaissance, services `mistral-proxy` et `ice-servers` | **Oui** (logique) | essais avec fausses clés et faux serveurs, hors du zip |
| Code : syntaxe, variables manquantes, ordre des hooks, assemblage | **Oui** | contrôles automatiques |

## NON testé (je n'ai ni téléphone, ni navigateur, ni accès à ta base)
- **Appels réels** entre deux appareils : micro, caméra, audio/vidéo, relais Cloudflare sur la 4G.
- **L'application elle-même** dans un navigateur (affichage, boutons) : le code compile, mais je ne l'ai pas vue s'afficher.
- **Supabase réel** : scripts SQL, fonctions serveur déployées, temps réel.
- Mistral réel : la précision de la reconnaissance sur de vraies photos.
- Navigateurs mobiles (Safari iPhone en particulier), notifications quand l'application est fermée (non prévues : il faudrait un service de notifications push).
