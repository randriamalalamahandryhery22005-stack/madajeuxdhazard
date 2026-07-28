# Déploiement

## Prérequis
```bash
npm install          # .npmrc active legacy-peer-deps (React 19)
npm run build        # sortie de production dans dist/ (dist/client + dist/server)
```

## Netlify
`netlify.toml` est prêt : build `npm run build:netlify`, publication `dist/client`,
preset Nitro `netlify` (SSR + routes `/api/*`).
Variables à définir dans Netlify → Site settings → Environment :
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID` (publiques)
- `LOVABLE_API_KEY` (secrète, requise pour `/api/ai-*`)

## EdgeOne Pages
Commande de build : `npm run build:edgeone` — répertoire de sortie : `dist/client`
(preset Nitro `static` : site pré-rendu, aucune fonction serveur requise).
Les routes `/api/ai-*` ne sont pas disponibles en mode statique ; pour les
conserver, déployer sur Netlify ou définir `NITRO_PRESET` sur le preset
serveur de la plateforme.

## Secrets
Aucune clé privée n'est présente dans le dépôt : `.env` ne contient que des clés
publiables. `LOVABLE_API_KEY` et la clé de service ne sont lues que côté serveur
via `process.env`.
