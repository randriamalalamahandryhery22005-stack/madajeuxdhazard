# Plan — Refonte v3.0.4

Grande demande multi-volets. Voici la découpe proposée avant implémentation.

## 1. Messagerie temps réel (Chats Up)
- Vérifier RLS + `ALTER PUBLICATION supabase_realtime` sur `global_chat_messages`, `chat_messages`, `chat_message_reads`, `conversation_members`
- S'assurer que `Chat.tsx` s'abonne via `useEffect` (channel unique, cleanup)
- Conserver l'historique (aucune purge) et charger via pagination descendante
- Fix: éviter les doublons via `setState` déduplication par `id`
- Badge non lu déjà en place — validation

## 2. Badge GEN Store
- Nouveau hook `useUnreadStore(userId)` : compte `gen_store_items` créés après `last_seen_at` stocké dans `profiles.gen_store_last_seen_at` (nouvelle colonne)
- Subscription Realtime sur `gen_store_items` INSERT
- Badge rouge animé sur icône Store dans `BottomNav`
- Reset via UPDATE `last_seen_at = now()` à l'ouverture de `/gen-store`

## 3. Version → 3.0.4
- `package.json`, splash footer, `about`, tout affichage version

## 4. Splash Screen Premium (~7s)
- Progression 0→100% sur 7000ms
- Étapes de chargement affichées (Préchargement, Authentification, Synchronisation, Prêt)
- Animations fluides, transition fade+scale
- Respect `prefers-reduced-motion` (fallback 1.2s)

## 5. Recherche de compte
- `search-accounts` edge function : requête OR élargie (nom, email, téléphone via `phone` si présent), tolérance accents via `unaccent` si dispo, tri par pertinence, retourne max 15
- Frontend : loader stable, debounce 200ms, feedback vide, gestion erreur claire

## 6. UI Bienvenue / Login / Signup
- Refonte moderne : hero gradient, glassmorphism, sections claires, responsive mobile-first
- Cohérence avec design tokens existants
- Aucune modif de logique auth

## 7. Aviator Premium (Zone A / Zone B)
- Refonte cartes résultats : gradient premium, badges statuts, animations d'apparition (framer-motion via CSS), meilleure hiérarchie visuelle
- Aucun changement d'algo prédiction

## 8. GEN Store admin
- Panneau admin : formulaire unifié pour publier {annonce, image, fichier, mise à jour, lien}
- Utilise colonnes existantes (`post_type`, `link_url`, `body`, `file_url`, `image_url`)
- Aperçu instant + apparition Realtime côté client

## 9. Admin Dashboard
- Audit rapide de chaque panneau (coins, users, gen store, IA config, bonus premium)
- Correction erreurs runtime détectées

## 10. Audit global
- `tsgo --noEmit`
- Cleanup imports morts, warnings console
- Vérif routes + guards

## Migrations DB nécessaires
1. `profiles.gen_store_last_seen_at TIMESTAMPTZ`
2. `ALTER PUBLICATION supabase_realtime ADD TABLE ...` (idempotent) pour tables chat + gen_store_items si absent

## Livrables
Modifications concentrées sur frontend + 1 migration légère. Zéro suppression de données, zéro changement de logique métier.

## Question
Le périmètre est très large (10 chantiers). Je peux :
- **A)** Tout livrer d'un coup dans un gros patch (long, risque plus élevé)
- **B)** Livrer en 2-3 lots priorisés (ex: lot 1 = messagerie + badge store + version + splash ; lot 2 = auth UI + Aviator Premium ; lot 3 = admin/store + audit final)

Quelle option préférez-vous ?
