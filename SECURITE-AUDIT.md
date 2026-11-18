# Audit de sécurité — état actuel (à lire)

## Ce qui est sécurisé
- La clé Mistral et les identifiants Cloudflare sont dans les **secrets Supabase** : jamais dans le code ni dans le zip.
- Les fonctions `mistral-proxy` et `ice-servers` exigent la clé du projet, refusent les sites non autorisés, limitent la taille et le nombre de demandes, et ne renvoient jamais les secrets (testé avec des clés factices).

## Ce qui N'EST PAS sécurisé (constaté dans `supabase_schema.sql`)
| Constat | Conséquence |
|---|---|
| **Les 26 règles d'accès (RLS) sont toutes publiques** (`USING (true)`), sur toutes les tables | Toute personne qui possède la clé publique de l'application (elle est dans le code du site) peut lire, modifier et supprimer toutes les données |
| La table `users` contient les **codes PIN en clair (4 chiffres)** et est lisible par tous | Se connecter à n'importe quel compte, y compris administrateur |
| `messages` lisible et modifiable par tous | Lire les messages privés non encore téléchargés |
| `sales`, `produits_data`, `reglages_data`… modifiables par tous | Effacer ou falsifier des ventes et des produits |
| Les canaux temps réel (chat, appels, talkie) sont publics | Fausses invitations d'appel, écoute de la signalisation |

La demande « les utilisateurs n'accèdent qu'aux conversations auxquelles ils participent » **n'est pas réalisée**, et je ne l'ai pas contournée par une apparence de sécurité.

## Pourquoi je ne l'ai pas corrigé ici
L'application a son propre système de comptes (téléphone + PIN) et non l'authentification Supabase. Pour la base de données, tout visiteur est donc « anonyme » : des règles d'accès **ne peuvent pas** distinguer un administrateur d'un pirate. Corriger sérieusement demande de changer la connexion elle-même.

## Plan proposé (non réalisé, à valider)
1. Fonction serveur `connexion` : vérifie téléphone + PIN (PIN **haché**, blocage après 5 essais), puis ouvre une vraie session Supabase.
2. Comptes migrés vers l'authentification Supabase (téléphone, rôle et équipe dans la session).
3. Règles d'accès par table : un compte ne lit que son équipe ; `messages` seulement pour les participants ; `users` sans la colonne PIN.
4. Canaux temps réel privés (chat, appels, talkie).
5. Migration des comptes existants et retour en arrière possible.

**Risque :** écrire ces règles sans pouvoir les essayer peut bloquer tout le monde hors de l'application. À faire d'abord dans un **second projet Supabase de test**, puis seulement ensuite sur le vrai.
En attendant : ne mets pas d'informations sensibles dans l'application, et change les PIN par des codes plus longs.
