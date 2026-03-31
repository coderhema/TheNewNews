import { Article } from '../types';

export const MOCK_ARTICLES: Article[] = [
  {
    id: '1',
    title: 'The Silicon Renaissance: Autonomous Agents Redefining Global Trade',
    summary: 'A deep dive into how decentralized AI clusters are negotiating cross-border logistics without human intervention, leading to a 14% increase in supply chain efficiency.',
    content: 'Full content here...',
    author: 'Elena Vance',
    category: 'Technology',
    timestamp: new Date().toISOString(),
    imageUrl: 'https://picsum.photos/seed/tech1/1200/800',
    readingTime: '8 min',
    importance: 'high',
    source: 'The Global Intelligence'
  },
  {
    id: '2',
    title: 'Architectural Minimalism in the Age of Digital Noise',
    summary: 'Why the world’s leading designers are returning to the principles of the Swiss Grid to combat the cognitive load of modern interfaces.',
    content: 'Full content here...',
    author: 'Julian Thorne',
    category: 'Design',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    imageUrl: 'https://picsum.photos/seed/design1/1200/800',
    readingTime: '5 min',
    importance: 'medium',
    source: 'Design Quarterly'
  },
  {
    id: '3',
    title: 'Quantum Computing: The First Stable Qubit at Room Temperature',
    summary: 'Researchers in Zurich have achieved what was once thought impossible, paving the way for consumer-grade quantum processors.',
    content: 'Full content here...',
    author: 'Dr. Sarah Chen',
    category: 'Science',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    imageUrl: 'https://picsum.photos/seed/science1/1200/800',
    readingTime: '12 min',
    importance: 'high',
    source: 'Nature Systems'
  },
  {
    id: '4',
    title: 'The Future of Sovereign Wealth: AI Curated Portfolios',
    summary: 'National funds are increasingly turning to autonomous algorithms to manage multi-trillion dollar assets with unprecedented risk mitigation.',
    content: 'Full content here...',
    author: 'Marcus Aurelius',
    category: 'Finance',
    timestamp: new Date(Date.now() - 10800000).toISOString(),
    imageUrl: 'https://picsum.photos/seed/finance1/1200/800',
    readingTime: '7 min',
    importance: 'medium',
    source: 'Financial Times'
  },
  {
    id: '5',
    title: 'Urban Re-wilding: The Tokyo Experiment',
    summary: 'How the world’s most populous city is integrating vertical forests into its skyline to combat the heat island effect.',
    content: 'Full content here...',
    author: 'Kaito Nakamura',
    category: 'Environment',
    timestamp: new Date(Date.now() - 14400000).toISOString(),
    imageUrl: 'https://picsum.photos/seed/env1/1200/800',
    readingTime: '6 min',
    importance: 'low',
    source: 'Eco Urbanist'
  },
  {
    id: '6',
    title: 'The Rise of Synthetic Biology in Sustainable Textiles',
    summary: 'Lab-grown leather and spider silk are moving from high-fashion runways to mass-market production lines.',
    content: 'Full content here...',
    author: 'Sophia Rossi',
    category: 'Innovation',
    timestamp: new Date(Date.now() - 18000000).toISOString(),
    imageUrl: 'https://picsum.photos/seed/bio1/1200/800',
    readingTime: '4 min',
    importance: 'medium',
    source: 'BioTech Review'
  },
  {
    id: '7',
    title: 'Global Semiconductor Shortage: The End in Sight?',
    summary: 'New fabrication plants in Arizona and Germany are finally reaching full capacity, easing the multi-year strain on electronics.',
    content: 'Full content here...',
    author: 'David Wu',
    category: 'Technology',
    timestamp: new Date(Date.now() - 21600000).toISOString(),
    imageUrl: 'https://picsum.photos/seed/semi1/1200/800',
    readingTime: '6 min',
    importance: 'high',
    source: 'TechCrunch'
  },
  {
    id: '8',
    title: 'The Renaissance of Rail: High-Speed Networks Across Africa',
    summary: 'A multi-national consortium is breaking ground on a trans-continental high-speed rail network connecting major economic hubs.',
    content: 'Full content here...',
    author: 'Amara Okafor',
    category: 'Infrastructure',
    timestamp: new Date(Date.now() - 25200000).toISOString(),
    imageUrl: 'https://picsum.photos/seed/rail1/1200/800',
    readingTime: '9 min',
    importance: 'medium',
    source: 'Infrastructure World'
  }
];
