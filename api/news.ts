type NewsApiArticle = {
  source?: { id?: string | null; name?: string };
  author?: string | null;
  title?: string | null;
  description?: string | null;
  url?: string | null;
  urlToImage?: string | null;
  publishedAt?: string | null;
  content?: string | null;
};

type NewsApiResponse = {
  status?: 'ok' | 'error';
  articles?: NewsApiArticle[];
  data?: { articles?: NewsApiArticle[] };
  results?: NewsApiArticle[];
  message?: string;
};

type Article = {
  id: string;
  title: string;
  summary: string;
  content: string;
  author: string;
  category: string;
  timestamp: string;
  imageUrl: string;
  readingTime: string;
  importance: 'high' | 'medium' | 'low';
  source: string;
};

const CATEGORY_FEEDS: Array<{ apiCategory: string; displayCategory: string }> = [
  { apiCategory: 'technology', displayCategory: 'Technology' },
  { apiCategory: 'business', displayCategory: 'Business' },
  { apiCategory: 'science', displayCategory: 'Science' },
  { apiCategory: 'general', displayCategory: 'World' },
  { apiCategory: 'health', displayCategory: 'Health' },
];

function toDisplaySourceName(source?: { id?: string | null; name?: string }) {
  return source?.name?.trim() || source?.id?.trim() || 'News Desk';
}

function capitalizeCategory(category: string) {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

function buildFallbackImage(seed: string) {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/1200/800`;
}

function getReadingTime(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 220));
  return `${minutes} min`;
}

function getImportance(category: string, sourceName: string) {
  const highPrioritySources = ['Reuters', 'Associated Press', 'Financial Times', 'BBC News', 'CNN', 'TechCrunch'];
  if (highPrioritySources.includes(sourceName)) {
    return 'high' as const;
  }

  if (['technology', 'business', 'science'].includes(category.toLowerCase())) {
    return 'medium' as const;
  }

  return 'low' as const;
}

function summarizeText(...parts: Array<string | null | undefined>) {
  const combined = parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  if (!combined) {
    return 'Live coverage and reporting from a major news outlet.';
  }
  return combined.length > 220 ? `${combined.slice(0, 217).trimEnd()}...` : combined;
}

function extractArticles(payload: NewsApiResponse) {
  return payload.articles ?? payload.data?.articles ?? payload.results ?? [];
}

function normalizeArticle(article: NewsApiArticle, category: string, index: number): Article | null {
  const title = article.title?.trim();
  const publishedAt = article.publishedAt || new Date().toISOString();

  if (!title || !article.url) {
    return null;
  }

  const sourceName = toDisplaySourceName(article.source);
  const contentSummary = summarizeText(article.description, article.content);
  const content = summarizeText(article.content, article.description);
  const seed = `${category}-${index}-${title}`;

  return {
    id: article.url,
    title,
    summary: contentSummary,
    content,
    author: article.author?.trim() || sourceName,
    category: capitalizeCategory(category),
    timestamp: publishedAt,
    imageUrl: article.urlToImage || buildFallbackImage(seed),
    readingTime: getReadingTime(contentSummary),
    importance: getImportance(category, sourceName),
    source: sourceName,
  };
}

async function fetchCategoryArticles(
  baseUrl: string,
  apiKey: string,
  category: (typeof CATEGORY_FEEDS)[number],
): Promise<Article[]> {
  const url = new URL(`${baseUrl.replace(/\/$/, '')}/top-headlines`);
  url.searchParams.set('country', 'us');
  url.searchParams.set('category', category.apiCategory);
  url.searchParams.set('pageSize', '10');
  url.searchParams.set('apiKey', apiKey);

  const response = await fetch(url.toString());
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(body || `News request failed for ${category.displayCategory}: ${response.status}`);
  }

  const payload = (await response.json()) as NewsApiResponse;
  const articles = extractArticles(payload);

  if (payload.status === 'error' && !articles.length) {
    throw new Error(payload.message || `News request failed for ${category.displayCategory}`);
  }

  return articles
    .map((article, index) => normalizeArticle(article, category.displayCategory, index))
    .filter((article): article is Article => Boolean(article));
}

function getRequestLimit(req: any) {
  const raw = Array.isArray(req.query?.limit) ? req.query.limit[0] : req.query?.limit;
  const parsed = Number.parseInt(raw ?? '8', 10);
  if (Number.isNaN(parsed)) {
    return 8;
  }
  return Math.min(Math.max(parsed, 1), 20);
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.NEWS_API_KEY || process.env.VITE_NEWS_API_KEY;
  const baseUrl = process.env.NEWS_API_BASE_URL || process.env.VITE_NEWS_API_BASE_URL || 'https://newsapi.org/v2';
  const limit = getRequestLimit(req);

  if (!apiKey) {
    res.status(500).json({ error: 'NEWS_API_KEY is required for the News proxy.' });
    return;
  }

  try {
    const results = await Promise.allSettled(
      CATEGORY_FEEDS.map((category) => fetchCategoryArticles(baseUrl, apiKey, category))
    );

    const fulfilled = results.filter((result): result is PromiseFulfilledResult<Article[]> => result.status === 'fulfilled');
    const merged = fulfilled.flatMap((result) => result.value);

    if (!merged.length) {
      const firstError = results.find((result): result is PromiseRejectedResult => result.status === 'rejected');
      throw firstError?.reason instanceof Error
        ? firstError.reason
        : new Error(firstError ? String(firstError.reason) : 'No news articles were returned from the provider.');
    }

    const deduped = Array.from(new Map(merged.map((article) => [article.id, article])).values());

    const articles = deduped
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);

    res.status(200).json({ articles });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load live news.';
    res.status(500).json({ error: message });
  }
}
