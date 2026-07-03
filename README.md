# BaruCollect

Progressive Web App (PWA) mobile-first pour scanner, estimer et partager votre collection de mangas et light novels.

## Stack

- Next.js 15 · Supabase · Tailwind CSS · next-intl · @zxing/browser · Serwist

## Démarrage rapide

### 1. Installer les dépendances

```bash
npm install
```

### 2. Supabase (cloud)

1. Crée un projet sur [supabase.com](https://supabase.com)
2. **SQL Editor** → exécute `supabase/migrations/20260703180000_initial_schema.sql`
3. **Authentication → Providers** → active Email + Google (optionnel)
4. **Authentication → URL Configuration** → ajoute `http://localhost:3000/auth/callback`

### 3. Variables d'environnement

```bash
cp .env.example .env.local
```

Remplis `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` depuis **Settings → API**.

### 4. Lancer l'app

```bash
npm run dev
```

Ouvre [http://localhost:3000](http://localhost:3000)

## Supabase local (optionnel)

Si tu as Docker + [Supabase CLI](https://supabase.com/docs/guides/cli) :

```bash
supabase start
supabase db reset
```

Puis utilise les clés affichées par `supabase status` dans `.env.local`.

## Fonctionnalités

- Auth email + Google OAuth
- Scanner ISBN (caméra arrière)
- Métadonnées : Open Library → Google Books → OpenBD
- Estimation prix (simulation sans clé eBay)
- Dashboard groupé par série
- Profil public `/fr/user/[username]`
- PWA installable + cache offline (Serwist)
- i18n FR / EN

## Licence

Projet et dépendances : MIT / Apache 2.0 / ISC uniquement.
