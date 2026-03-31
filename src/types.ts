export interface Article {
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
}

export interface AIDigest {
  id: string;
  title: string;
  summary: string;
  keyPoints: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  timestamp: string;
}
