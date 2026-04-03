import { Article } from '../types';

type NewsProxyResponse = {
  articles?: Article[];
  error?: string;
  message?: string;
};

export async function fetchNewsArticles(limit = 8): Promise<Article[]> {
  const response = await fetch(`/api/news?limit=${limit}`);
  const payload = (await response.json().catch(() => null)) as NewsProxyResponse | null;

  if (!response.ok) {
    throw new Error(payload?.error || payload?.message || `News proxy failed with status ${response.status}`);
  }

  if (!payload?.articles?.length) {
    throw new Error('No news articles were returned from the proxy.');
  }

  return payload.articles;
}
