-- =============================================================================
-- BaruCollect — Initial Schema
-- Run in Supabase SQL Editor or via: supabase db push
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
CREATE TYPE public.book_type AS ENUM ('manga', 'light_novel');

CREATE TYPE public.book_condition AS ENUM (
  'mint',
  'near_mint',
  'very_good',
  'good',
  'acceptable',
  'poor'
);

CREATE TYPE public.metadata_source AS ENUM (
  'open_library',
  'google_books',
  'openbd',
  'manual'
);

CREATE TYPE public.price_source AS ENUM (
  'ebay',
  'simulation',
  'manual'
);

-- ---------------------------------------------------------------------------
-- profiles (linked to auth.users)
-- ---------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  username      TEXT NOT NULL,
  display_name  TEXT,
  avatar_url    TEXT,
  bio           TEXT,
  is_public     BOOLEAN NOT NULL DEFAULT FALSE,
  locale        TEXT NOT NULL DEFAULT 'fr',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT profiles_username_format
    CHECK (username ~ '^[a-z0-9_]{3,30}$'),
  CONSTRAINT profiles_username_lowercase
    CHECK (username = LOWER(username)),
  CONSTRAINT profiles_locale_format
    CHECK (locale ~ '^[a-z]{2}(-[A-Z]{2})?$')
);

CREATE UNIQUE INDEX profiles_username_key ON public.profiles (username);

-- ---------------------------------------------------------------------------
-- series_catalog (grouping: "One Piece", "Spice and Wolf", etc.)
-- ---------------------------------------------------------------------------
CREATE TABLE public.series_catalog (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  title_romaji    TEXT,
  title_native    TEXT,
  author          TEXT,
  publisher       TEXT,
  book_type       public.book_type NOT NULL DEFAULT 'manga',
  cover_url       TEXT,
  total_volumes   INT CHECK (total_volumes IS NULL OR total_volumes > 0),
  metadata_source public.metadata_source,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX series_catalog_title_idx ON public.series_catalog (LOWER(title));
CREATE INDEX series_catalog_book_type_idx ON public.series_catalog (book_type);

-- ---------------------------------------------------------------------------
-- books_catalog (one row per ISBN / volume)
-- ---------------------------------------------------------------------------
CREATE TABLE public.books_catalog (
  isbn                TEXT PRIMARY KEY,
  series_id           UUID REFERENCES public.series_catalog (id) ON DELETE SET NULL,
  volume_number       INT CHECK (volume_number IS NULL OR volume_number > 0),
  title               TEXT NOT NULL,
  subtitle            TEXT,
  author              TEXT,
  publisher           TEXT,
  language            TEXT,
  cover_url           TEXT,
  book_type           public.book_type NOT NULL DEFAULT 'manga',
  last_estimated_eur  NUMERIC(10, 2) CHECK (
    last_estimated_eur IS NULL OR last_estimated_eur >= 0
  ),
  metadata_source     public.metadata_source,
  metadata_raw        JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT books_catalog_isbn_format
    CHECK (isbn ~ '^[0-9]{10}([0-9]{3})?$')
);

CREATE INDEX books_catalog_series_id_idx ON public.books_catalog (series_id);
CREATE INDEX books_catalog_series_volume_idx
  ON public.books_catalog (series_id, volume_number);

-- ---------------------------------------------------------------------------
-- user_collection (user-owned volumes)
-- ---------------------------------------------------------------------------
CREATE TABLE public.user_collection (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  isbn                TEXT NOT NULL REFERENCES public.books_catalog (isbn) ON DELETE RESTRICT,
  condition           public.book_condition NOT NULL DEFAULT 'very_good',
  purchase_price_eur  NUMERIC(10, 2) CHECK (
    purchase_price_eur IS NULL OR purchase_price_eur >= 0
  ),
  custom_value_eur    NUMERIC(10, 2) CHECK (
    custom_value_eur IS NULL OR custom_value_eur >= 0
  ),
  notes               TEXT,
  added_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT user_collection_unique_volume
    UNIQUE (user_id, isbn)
);

CREATE INDEX user_collection_user_id_idx ON public.user_collection (user_id);
CREATE INDEX user_collection_user_added_idx
  ON public.user_collection (user_id, added_at DESC);

-- ---------------------------------------------------------------------------
-- price_cache (eBay / simulation / manual estimates)
-- ---------------------------------------------------------------------------
CREATE TABLE public.price_cache (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  isbn            TEXT NOT NULL REFERENCES public.books_catalog (isbn) ON DELETE CASCADE,
  condition       public.book_condition NOT NULL DEFAULT 'very_good',
  estimated_eur   NUMERIC(10, 2) NOT NULL CHECK (estimated_eur >= 0),
  currency        TEXT NOT NULL DEFAULT 'EUR',
  source          public.price_source NOT NULL,
  sample_size     INT CHECK (sample_size IS NULL OR sample_size >= 0),
  raw_response    JSONB,
  fetched_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),

  CONSTRAINT price_cache_unique_lookup
    UNIQUE (isbn, condition, source)
);

CREATE INDEX price_cache_isbn_idx ON public.price_cache (isbn);
CREATE INDEX price_cache_expires_at_idx ON public.price_cache (expires_at);

-- ---------------------------------------------------------------------------
-- updated_at trigger helper
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER series_catalog_set_updated_at
  BEFORE UPDATE ON public.series_catalog
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER books_catalog_set_updated_at
  BEFORE UPDATE ON public.books_catalog
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER user_collection_set_updated_at
  BEFORE UPDATE ON public.user_collection
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Auto-create profile on signup
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_username TEXT;
  candidate     TEXT;
  suffix        INT := 0;
BEGIN
  base_username := LOWER(
    REGEXP_REPLACE(
      COALESCE(NEW.raw_user_meta_data ->> 'username', SPLIT_PART(NEW.email, '@', 1)),
      '[^a-z0-9_]',
      '',
      'g'
    )
  );

  IF base_username IS NULL OR LENGTH(base_username) < 3 THEN
    base_username := 'collector';
  END IF;

  base_username := LEFT(base_username, 24);
  candidate := base_username;

  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = candidate) LOOP
    suffix := suffix + 1;
    candidate := base_username || suffix::TEXT;
  END LOOP;

  INSERT INTO public.profiles (
    id,
    username,
    display_name,
    avatar_url,
    locale
  )
  VALUES (
    NEW.id,
    candidate,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    NEW.raw_user_meta_data ->> 'avatar_url',
    COALESCE(NEW.raw_user_meta_data ->> 'locale', 'fr')
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Sync books_catalog.last_estimated_eur when price_cache updates
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_book_last_estimated_price()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.books_catalog
  SET last_estimated_eur = NEW.estimated_eur
  WHERE isbn = NEW.isbn;

  RETURN NEW;
END;
$$;

CREATE TRIGGER price_cache_sync_book_estimate
  AFTER INSERT OR UPDATE ON public.price_cache
  FOR EACH ROW EXECUTE FUNCTION public.sync_book_last_estimated_price();

-- ---------------------------------------------------------------------------
-- Helper: effective value for a collection item
-- Priority: custom_value_eur > cached price > book catalog estimate
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.effective_item_value(
  p_custom_value_eur NUMERIC,
  p_isbn TEXT,
  p_condition public.book_condition
)
RETURNS NUMERIC
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    p_custom_value_eur,
    (
      SELECT pc.estimated_eur
      FROM public.price_cache pc
      WHERE pc.isbn = p_isbn
        AND pc.condition = p_condition
        AND pc.expires_at > NOW()
      ORDER BY pc.fetched_at DESC
      LIMIT 1
    ),
    (
      SELECT bc.last_estimated_eur
      FROM public.books_catalog bc
      WHERE bc.isbn = p_isbn
    ),
    0
  );
$$;

-- ---------------------------------------------------------------------------
-- View: user collection with resolved metadata
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.user_collection_enriched
WITH (security_invoker = true)
AS
SELECT
  uc.id,
  uc.user_id,
  uc.isbn,
  uc.condition,
  uc.purchase_price_eur,
  uc.custom_value_eur,
  uc.notes,
  uc.added_at,
  uc.updated_at,
  bc.title            AS book_title,
  bc.volume_number,
  bc.cover_url        AS book_cover_url,
  bc.book_type,
  bc.series_id,
  sc.title            AS series_title,
  sc.total_volumes    AS series_total_volumes,
  public.effective_item_value(uc.custom_value_eur, uc.isbn, uc.condition)
    AS estimated_value_eur
FROM public.user_collection uc
JOIN public.books_catalog bc ON bc.isbn = uc.isbn
LEFT JOIN public.series_catalog sc ON sc.id = bc.series_id;

-- ---------------------------------------------------------------------------
-- RPC: total collection value for a user
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_collection_total_value(p_user_id UUID)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    SUM(public.effective_item_value(uc.custom_value_eur, uc.isbn, uc.condition)),
    0
  )
  FROM public.user_collection uc
  WHERE uc.user_id = p_user_id
    AND (
      p_user_id = auth.uid()
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = p_user_id
          AND p.is_public = TRUE
      )
    );
$$;

-- ---------------------------------------------------------------------------
-- RPC: series summary for dashboard grouping
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_collection_series_summary(p_user_id UUID)
RETURNS TABLE (
  series_id UUID,
  series_title TEXT,
  book_type public.book_type,
  cover_url TEXT,
  owned_volumes BIGINT,
  total_volumes INT,
  total_value_eur NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    sc.id AS series_id,
    sc.title AS series_title,
    sc.book_type,
    sc.cover_url,
    COUNT(uc.id) AS owned_volumes,
    sc.total_volumes,
    COALESCE(
      SUM(public.effective_item_value(uc.custom_value_eur, uc.isbn, uc.condition)),
      0
    ) AS total_value_eur
  FROM public.user_collection uc
  JOIN public.books_catalog bc ON bc.isbn = uc.isbn
  LEFT JOIN public.series_catalog sc ON sc.id = bc.series_id
  WHERE uc.user_id = p_user_id
    AND (
      p_user_id = auth.uid()
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = p_user_id
          AND p.is_public = TRUE
      )
    )
  GROUP BY sc.id, sc.title, sc.book_type, sc.cover_url, sc.total_volumes
  ORDER BY sc.title NULLS LAST;
$$;

-- ---------------------------------------------------------------------------
-- RPC: public profile lookup by username
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_public_profile(p_username TEXT)
RETURNS TABLE (
  id UUID,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.bio,
    p.created_at
  FROM public.profiles p
  WHERE p.username = LOWER(p_username)
    AND p.is_public = TRUE;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.series_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_collection ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_cache ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "profiles_select_public_or_own"
  ON public.profiles FOR SELECT
  USING (is_public = TRUE OR id = auth.uid());

CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- series_catalog (catalog data is public read; writes require auth)
CREATE POLICY "series_catalog_select_all"
  ON public.series_catalog FOR SELECT
  USING (TRUE);

CREATE POLICY "series_catalog_insert_authenticated"
  ON public.series_catalog FOR INSERT
  TO authenticated
  WITH CHECK (TRUE);

CREATE POLICY "series_catalog_update_authenticated"
  ON public.series_catalog FOR UPDATE
  TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);

-- books_catalog (catalog data is public read; writes require auth)
CREATE POLICY "books_catalog_select_all"
  ON public.books_catalog FOR SELECT
  USING (TRUE);

CREATE POLICY "books_catalog_insert_authenticated"
  ON public.books_catalog FOR INSERT
  TO authenticated
  WITH CHECK (TRUE);

CREATE POLICY "books_catalog_update_authenticated"
  ON public.books_catalog FOR UPDATE
  TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);

-- user_collection
CREATE POLICY "user_collection_select_own_or_public"
  ON public.user_collection FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = user_collection.user_id
        AND p.is_public = TRUE
    )
  );

CREATE POLICY "user_collection_insert_own"
  ON public.user_collection FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_collection_update_own"
  ON public.user_collection FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_collection_delete_own"
  ON public.user_collection FOR DELETE
  USING (user_id = auth.uid());

-- price_cache (read-only for everyone; writes via service role in app)
CREATE POLICY "price_cache_select_all"
  ON public.price_cache FOR SELECT
  USING (TRUE);

-- ---------------------------------------------------------------------------
-- Storage bucket for avatars (run once in Supabase dashboard if preferred)
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', TRUE)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "avatars_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars_upload_own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );

CREATE POLICY "avatars_update_own"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );

CREATE POLICY "avatars_delete_own"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.series_catalog TO anon, authenticated;
GRANT INSERT, UPDATE ON public.series_catalog TO authenticated;
GRANT SELECT ON public.books_catalog TO anon, authenticated;
GRANT INSERT, UPDATE ON public.books_catalog TO authenticated;
GRANT SELECT ON public.user_collection TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.user_collection TO authenticated;
GRANT SELECT ON public.price_cache TO anon, authenticated;
GRANT SELECT ON public.user_collection_enriched TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_collection_total_value(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_collection_series_summary(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_profile(TEXT) TO anon, authenticated;
