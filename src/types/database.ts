export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string | null;
          avatar_url: string | null;
          bio: string | null;
          is_public: boolean;
          locale: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          display_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          is_public?: boolean;
          locale?: string;
        };
        Update: {
          username?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          is_public?: boolean;
          locale?: string;
        };
        Relationships: [];
      };
      series_catalog: {
        Row: {
          id: string;
          title: string;
          title_romaji: string | null;
          title_native: string | null;
          author: string | null;
          publisher: string | null;
          book_type: "manga" | "light_novel";
          cover_url: string | null;
          total_volumes: number | null;
          metadata_source:
            | "open_library"
            | "google_books"
            | "openbd"
            | "manual"
            | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          title_romaji?: string | null;
          title_native?: string | null;
          author?: string | null;
          publisher?: string | null;
          book_type?: "manga" | "light_novel";
          cover_url?: string | null;
          total_volumes?: number | null;
          metadata_source?:
            | "open_library"
            | "google_books"
            | "openbd"
            | "manual"
            | null;
        };
        Update: {
          id?: string;
          title?: string;
          title_romaji?: string | null;
          title_native?: string | null;
          author?: string | null;
          publisher?: string | null;
          book_type?: "manga" | "light_novel";
          cover_url?: string | null;
          total_volumes?: number | null;
          metadata_source?:
            | "open_library"
            | "google_books"
            | "openbd"
            | "manual"
            | null;
        };
        Relationships: [];
      };
      books_catalog: {
        Row: {
          isbn: string;
          series_id: string | null;
          volume_number: number | null;
          title: string;
          subtitle: string | null;
          author: string | null;
          publisher: string | null;
          language: string | null;
          cover_url: string | null;
          book_type: "manga" | "light_novel";
          last_estimated_eur: number | null;
          metadata_source:
            | "open_library"
            | "google_books"
            | "openbd"
            | "manual"
            | null;
          metadata_raw: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          isbn: string;
          series_id?: string | null;
          volume_number?: number | null;
          title: string;
          subtitle?: string | null;
          author?: string | null;
          publisher?: string | null;
          language?: string | null;
          cover_url?: string | null;
          book_type?: "manga" | "light_novel";
          last_estimated_eur?: number | null;
          metadata_source?:
            | "open_library"
            | "google_books"
            | "openbd"
            | "manual"
            | null;
          metadata_raw?: Json | null;
        };
        Update: {
          isbn?: string;
          series_id?: string | null;
          volume_number?: number | null;
          title?: string;
          subtitle?: string | null;
          author?: string | null;
          publisher?: string | null;
          language?: string | null;
          cover_url?: string | null;
          book_type?: "manga" | "light_novel";
          last_estimated_eur?: number | null;
          metadata_source?:
            | "open_library"
            | "google_books"
            | "openbd"
            | "manual"
            | null;
          metadata_raw?: Json | null;
        };
        Relationships: [];
      };
      user_collection: {
        Row: {
          id: string;
          user_id: string;
          isbn: string;
          condition:
            | "mint"
            | "near_mint"
            | "very_good"
            | "good"
            | "acceptable"
            | "poor";
          purchase_price_eur: number | null;
          custom_value_eur: number | null;
          notes: string | null;
          added_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          isbn: string;
          condition?:
            | "mint"
            | "near_mint"
            | "very_good"
            | "good"
            | "acceptable"
            | "poor";
          purchase_price_eur?: number | null;
          custom_value_eur?: number | null;
          notes?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          isbn?: string;
          condition?:
            | "mint"
            | "near_mint"
            | "very_good"
            | "good"
            | "acceptable"
            | "poor";
          purchase_price_eur?: number | null;
          custom_value_eur?: number | null;
          notes?: string | null;
        };
        Relationships: [];
      };
      price_cache: {
        Row: {
          id: string;
          isbn: string;
          condition:
            | "mint"
            | "near_mint"
            | "very_good"
            | "good"
            | "acceptable"
            | "poor";
          estimated_eur: number;
          currency: string;
          source: "ebay" | "simulation" | "manual";
          sample_size: number | null;
          raw_response: Json | null;
          fetched_at: string;
          expires_at: string;
        };
        Insert: {
          id?: string;
          isbn: string;
          condition?:
            | "mint"
            | "near_mint"
            | "very_good"
            | "good"
            | "acceptable"
            | "poor";
          estimated_eur: number;
          currency?: string;
          source: "ebay" | "simulation" | "manual";
          sample_size?: number | null;
          raw_response?: Json | null;
          expires_at?: string;
        };
        Update: {
          id?: string;
          isbn?: string;
          condition?:
            | "mint"
            | "near_mint"
            | "very_good"
            | "good"
            | "acceptable"
            | "poor";
          estimated_eur?: number;
          currency?: string;
          source?: "ebay" | "simulation" | "manual";
          sample_size?: number | null;
          raw_response?: Json | null;
          expires_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      user_collection_enriched: {
        Row: {
          id: string;
          user_id: string;
          isbn: string;
          condition:
            | "mint"
            | "near_mint"
            | "very_good"
            | "good"
            | "acceptable"
            | "poor";
          purchase_price_eur: number | null;
          custom_value_eur: number | null;
          notes: string | null;
          added_at: string;
          updated_at: string;
          book_title: string;
          volume_number: number | null;
          book_cover_url: string | null;
          book_type: "manga" | "light_novel";
          series_id: string | null;
          series_title: string | null;
          series_total_volumes: number | null;
          estimated_value_eur: number;
        };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: {
      book_type: "manga" | "light_novel";
      book_condition:
        | "mint"
        | "near_mint"
        | "very_good"
        | "good"
        | "acceptable"
        | "poor";
      metadata_source: "open_library" | "google_books" | "openbd" | "manual";
      price_source: "ebay" | "simulation" | "manual";
    };
    CompositeTypes: Record<string, never>;
  };
};

export type BookCondition = Database["public"]["Tables"]["user_collection"]["Row"]["condition"];
export type SeriesSummary = {
  series_id: string;
  series_title: string;
  book_type: "manga" | "light_novel";
  cover_url: string | null;
  owned_volumes: number;
  total_volumes: number | null;
  total_value_eur: number;
};
