export type BookMetadata = {
  isbn: string;
  title: string;
  subtitle?: string;
  author?: string;
  publisher?: string;
  language?: string;
  coverUrl?: string;
  volumeNumber?: number;
  seriesTitle?: string;
  bookType: "manga" | "light_novel";
  source: "open_library" | "google_books" | "openbd" | "manual";
  raw?: unknown;
};

function detectBookType(
  title: string,
  subjects: string[] = [],
): "manga" | "light_novel" {
  const haystack = `${title} ${subjects.join(" ")}`.toLowerCase();
  if (haystack.includes("light novel") || haystack.includes("roman")) {
    return "light_novel";
  }
  return "manga";
}

function extractVolumeNumber(title: string): number | undefined {
  const patterns = [
    /(?:tome|vol\.?|volume|#)\s*(\d+)/i,
    /\b(\d{1,3})\s*(?:er|e|ème|th)?\s*(?:tome|volume)?\b/i,
  ];
  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match?.[1]) return parseInt(match[1], 10);
  }
  return undefined;
}

function extractSeriesTitle(title: string): string {
  return title
    .replace(/\s*[-–:]\s*(?:tome|vol\.?|volume)\s*\d+.*/i, "")
    .replace(/\s*#\d+.*/, "")
    .trim();
}

async function fetchOpenLibrary(isbn: string): Promise<BookMetadata | null> {
  const res = await fetch(`https://openlibrary.org/isbn/${isbn}.json`, {
    next: { revalidate: 86400 },
  });
  if (!res.ok) return null;

  const data = await res.json();
  const title: string = data.title ?? "";
  const authors: string[] = [];

  if (data.authors?.[0]?.key) {
    const authorRes = await fetch(
      `https://openlibrary.org${data.authors[0].key}.json`,
      {
        next: { revalidate: 86400 },
      },
    );
    if (authorRes.ok) {
      const authorData = await authorRes.json();
      if (authorData.name) authors.push(authorData.name);
    }
  }

  const coverUrl = data.covers?.[0]
    ? `https://covers.openlibrary.org/b/id/${data.covers[0]}-L.jpg`
    : undefined;

  return {
    isbn,
    title,
    author: authors.join(", ") || undefined,
    publisher: data.publishers?.[0],
    language: data.languages?.[0]?.key?.replace("/languages/", ""),
    coverUrl,
    volumeNumber: extractVolumeNumber(title),
    seriesTitle: extractSeriesTitle(title),
    bookType: detectBookType(title),
    source: "open_library",
    raw: data,
  };
}

async function fetchGoogleBooks(isbn: string): Promise<BookMetadata | null> {
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  const url = new URL("https://www.googleapis.com/books/v1/volumes");
  url.searchParams.set("q", `isbn:${isbn}`);
  if (apiKey) url.searchParams.set("key", apiKey);

  const res = await fetch(url.toString(), { next: { revalidate: 86400 } });
  if (!res.ok) return null;

  const data = await res.json();
  const item = data.items?.[0]?.volumeInfo;
  if (!item) return null;

  // 🛠️ LE CORRECTIF EST ICI : On fusionne proprement le titre et le sous-titre
  const baseTitle: string = item.title ?? "";
  const fullTitle = item.subtitle
    ? `${baseTitle}: ${item.subtitle}`
    : baseTitle;

  return {
    isbn,
    title: fullTitle, // On utilise le titre complet
    subtitle: item.subtitle,
    author: item.authors?.join(", "),
    publisher: item.publisher,
    language: item.language,
    coverUrl: item.imageLinks?.thumbnail?.replace("http:", "https:"),
    volumeNumber: extractVolumeNumber(fullTitle), // On cherche le tome dans le titre complet
    seriesTitle: extractSeriesTitle(fullTitle), // La série aura son vrai nom ("Re:Zero")
    bookType: detectBookType(fullTitle, item.categories ?? []),
    source: "google_books",
    raw: item,
  };
}

async function fetchOpenBD(isbn: string): Promise<BookMetadata | null> {
  const res = await fetch(`https://api.openbd.jp/v1/get?isbn=${isbn}`, {
    next: { revalidate: 86400 },
  });
  if (!res.ok) return null;

  const data = await res.json();
  const summary = data?.[0]?.summary;
  if (!summary) return null;

  const title: string = summary.title ?? "";
  return {
    isbn,
    title,
    author: summary.author,
    publisher: summary.publisher,
    coverUrl: summary.cover?.startsWith("http") ? summary.cover : undefined,
    volumeNumber: summary.volume
      ? parseInt(summary.volume, 10)
      : extractVolumeNumber(title),
    seriesTitle: summary.series ?? extractSeriesTitle(title),
    bookType: detectBookType(title),
    source: "openbd",
    raw: summary,
  };
}

export async function resolveIsbnMetadata(
  isbn: string,
): Promise<BookMetadata | null> {
  const normalized = isbn.replace(/[-\s]/g, "");

  for (const fetcher of [fetchOpenLibrary, fetchGoogleBooks, fetchOpenBD]) {
    try {
      const result = await fetcher(normalized);
      if (result?.title) return result;
    } catch {
      // try next source
    }
  }

  return null;
}
