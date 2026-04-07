/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useSpring } from 'motion/react';
import { 
  Search, 
  Menu, 
  ArrowUpRight, 
  Clock, 
  Zap, 
  Shield, 
  Cpu,
  TrendingUp,
  Activity,
  Share2,
  Check,
  X,
} from 'lucide-react';
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import Markdown from 'react-markdown';
import OpenAI from 'openai';
import { cn } from './lib/utils';
import { Article } from './types';
import { fetchNewsArticles } from './services/newsService';

const SITE_NAME = 'TheNewNews';
const SITE_URL = 'https://thenewnews.vercel.app';
const SITE_DESCRIPTION = 'TheNewNews delivers live news headlines and an AI News Digest powered by Poke API and NewsAPI.';
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.svg`;

function updateMetaTag(selector: string, attribute: 'name' | 'property', value: string) {
  let tag = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${selector}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attribute, selector);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", value);
}

function updatePageMetadata(article: Article | null) {
  const title = article ? `${article.title} | ${SITE_NAME}` : SITE_NAME;
  const description = article?.summary || SITE_DESCRIPTION;
  const image = article?.imageUrl || DEFAULT_OG_IMAGE;
  const url = article ? `${SITE_URL}/article/${encodeURIComponent(article.id)}` : SITE_URL;

  document.title = title;
  updateMetaTag('description', 'name', description);
  updateMetaTag('og:type', 'property', 'website');
  updateMetaTag('og:site_name', 'property', SITE_NAME);
  updateMetaTag('og:title', 'property', title);
  updateMetaTag('og:description', 'property', description);
  updateMetaTag('og:image', 'property', image);
  updateMetaTag('og:url', 'property', url);
  updateMetaTag('twitter:card', 'name', 'summary_large_image');
  updateMetaTag('twitter:title', 'name', title);
  updateMetaTag('twitter:description', 'name', description);
  updateMetaTag('twitter:image', 'name', image);
}

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_POKE_API_KEY,
  baseURL: import.meta.env.VITE_POKE_API_BASE_URL,
  dangerouslyAllowBrowser: true,
});

export default function App() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [aiDigest, setAiDigest] = useState<string>('');
  const [isGeneratingDigest, setIsGeneratingDigest] = useState(false);
  const [isLoadingArticles, setIsLoadingArticles] = useState(true);
  const [articlesError, setArticlesError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Search and Filter State
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedAuthor, setSelectedAuthor] = useState<string>('All');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });

  useEffect(() => {
    updatePageMetadata(null);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadArticles = async () => {
      setIsLoadingArticles(true);
      setArticlesError(null);

      try {
        const liveArticles = await fetchNewsArticles();
        if (!isMounted) {
          return;
        }
        setArticles(liveArticles);
      } catch (error) {
        console.error('News loading failed:', error);
        if (isMounted) {
          setArticles([]);
          setArticlesError('Live news could not be loaded right now.');
        }
      } finally {
        if (isMounted) {
          setIsLoadingArticles(false);
        }
      }
    };

    loadArticles();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!articles.length) {
      return;
    }

    const articlePrefix = '/article/';
    const pathname = window.location.pathname;

    if (!pathname.startsWith(articlePrefix)) {
      return;
    }

    const rawId = pathname.slice(articlePrefix.length);
    const decodedId = decodeURIComponent(rawId);
    const match = articles.find((article) => article.id === decodedId || encodeURIComponent(article.id) === rawId || article.id === rawId);

    if (match) {
      setSelectedArticle(match);
    }
  }, [articles]);

  useEffect(() => {
    updatePageMetadata(selectedArticle);
  }, [selectedArticle]);
  const filteredArticles = articles.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         article.summary.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || article.category === selectedCategory;
    const matchesAuthor = selectedAuthor === 'All' || article.author === selectedAuthor;
    
    let matchesDate = true;
    if (dateRange.start || dateRange.end) {
      const articleDate = new Date(article.timestamp);
      const start = dateRange.start ? startOfDay(new Date(dateRange.start)) : new Date(0);
      const end = dateRange.end ? endOfDay(new Date(dateRange.end)) : new Date();
      matchesDate = isWithinInterval(articleDate, { start, end });
    }

    return matchesSearch && matchesCategory && matchesAuthor && matchesDate;
  });

  // Dynamic filter options based on current search query (ignoring other filters for options)
  const searchMatches = articles.filter(article => 
    article.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    article.summary.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const availableCategories = ['All', ...new Set(searchMatches.map(a => a.category))];
  const availableAuthors = ['All', ...new Set(searchMatches.map(a => a.author))];

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const generateAIDigest = async () => {
      if (!articles.length) {
        setAiDigest('No live articles are available yet.');
        return;
      }

      setIsGeneratingDigest(true);
      try {
        const response = await openai.chat.completions.create({
          model: import.meta.env.VITE_POKE_MODEL || 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You summarize news clearly and concisely in markdown.',
            },
            {
              role: 'user',
              content: `Analyze these news articles and provide a concise, informative summary for each of the top ${Math.min(8, articles.length)} articles. 
Each summary should be exactly one or two sentences, allowing users to quickly grasp the main points.
Crucially, for each summary, explicitly mention the source of the information (e.g., "According to [Source], ...").

Articles:
${articles.map((a, i) => `${i + 1}. ${a.title} (Source: ${a.source}): ${a.summary}`).join('\n')}

Format the output in clean Markdown as a list of "Top Trending Summaries".`,
            },
          ],
          temperature: 0.3,
        });

        const digest = response.choices[0]?.message?.content?.trim();
        setAiDigest(digest || 'Live articles are loaded, but the digest response was empty.');
      } catch (error) {
        console.error('AI Digest generation failed:', error);
        setAiDigest('Failed to generate live digest.');
      } finally {
        setIsGeneratingDigest(false);
      }
    };

    generateAIDigest();
  }, [articles]);

  const handleShare = (article: Article) => {
    const url = `${window.location.origin}/article/${encodeURIComponent(article.id)}`;
    if (navigator.share) {
      navigator.share({
        title: article.title,
        text: article.summary,
        url: url,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(url).then(() => {
        // We can use a global toast or just let the button handle its own state
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col selection:bg-ink selection:text-base">
      {/* Top Navigation Rail */}
      <nav className="border-b border-line px-6 py-3.5 flex justify-between items-center sticky top-0 bg-base/90 backdrop-blur-md z-50">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
            </span>
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-red-600/80 font-medium">Live</span>
          </div>
          <div className="hidden md:flex gap-1">
            {['Intelligence', 'Markets', 'Geopolitics', 'Science'].map((item) => (
              <button key={item} className="px-3 py-1.5 text-[11px] uppercase tracking-widest font-medium rounded-full hover:bg-ink/5 hover:text-ink transition-all opacity-50 hover:opacity-100">
                {item}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 font-mono text-[10px] opacity-40 bg-ink/5 px-3 py-1.5 rounded-full">
            <span>{format(currentTime, 'HH:mm:ss')}</span>
            <span className="opacity-40">·</span>
            <span>{format(currentTime, 'MMM dd')}</span>
          </div>
          <button 
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className={cn(
              "p-2 rounded-full transition-all",
              isSearchOpen ? "bg-ink text-base shadow-md" : "hover:bg-ink/8 text-ink/60 hover:text-ink"
            )}
          >
            {isSearchOpen ? <X size={17} strokeWidth={2} /> : <Search size={17} strokeWidth={1.5} />}
          </button>
          <button className="p-2 hover:bg-ink/8 rounded-full transition-colors text-ink/60 hover:text-ink">
            <Menu size={17} strokeWidth={1.5} />
          </button>
        </div>
      </nav>

      {/* Search and Filter Overlay */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-base border-b border-line overflow-hidden sticky top-[69px] z-40"
          >
            <div className="px-6 py-8 max-w-7xl mx-auto">
              <div className="flex items-center gap-4 mb-8">
                <Search size={24} className="opacity-20" />
                <input 
                  type="text"
                  placeholder="Search intelligence reports..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent border-none text-2xl md:text-4xl font-serif focus:ring-0 placeholder:opacity-20"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Category Filter */}
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-widest opacity-40 mb-3 block">Category</label>
                  <div className="flex flex-wrap gap-2">
                    {availableCategories.map((category) => (
                      <button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-mono uppercase transition-colors",
                          selectedCategory === category ? "bg-ink text-base" : "bg-ink/5 hover:bg-ink/10"
                        )}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Author Filter */}
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-widest opacity-40 mb-3 block">Source</label>
                  <div className="flex flex-wrap gap-2">
                    {availableAuthors.map((author) => (
                      <button
                        key={author}
                        onClick={() => setSelectedAuthor(author)}
                        className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-mono uppercase transition-colors",
                          selectedAuthor === author ? "bg-ink text-base" : "bg-ink/5 hover:bg-ink/10"
                        )}
                      >
                        {author}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date Range Filter */}
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-widest opacity-40 mb-3 block">Date Range</label>
                  <div className="flex gap-2 items-center">
                    <input 
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                      className="bg-transparent border border-line rounded-lg px-3 py-2 text-[10px] font-mono uppercase focus:ring-ink focus:border-ink"
                    />
                    <span className="opacity-20">—</span>
                    <input 
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                      className="bg-transparent border border-line rounded-lg px-3 py-2 text-[10px] font-mono uppercase focus:ring-ink focus:border-ink"
                    />
                  </div>
                </div>
              </div>

              {(searchQuery || selectedCategory !== 'All' || selectedAuthor !== 'All' || dateRange.start || dateRange.end) && (
                <div className="mt-8 pt-8 border-t border-line flex justify-between items-center">
                  <div className="text-[10px] font-mono uppercase opacity-40">
                    {filteredArticles.length} Results found
                  </div>
                  <button 
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('All');
                      setSelectedAuthor('All');
                      setDateRange({ start: '', end: '' });
                    }}
                    className="text-[10px] font-mono uppercase tracking-widest hover:underline"
                  >
                    Reset Intelligence Parameters
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_400px] xl:grid-cols-[1fr_480px]">
        {/* Main Feed */}
        <div className="border-r border-line">
          <header className="px-6 py-14 md:py-20 border-b border-line">
            <div className="flex items-start gap-3 mb-2">
              <span className="mt-2 px-2.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-mono uppercase tracking-widest rounded-full border border-amber-200 font-medium">
                v4.2 · Live
              </span>
            </div>
            <h1 className="text-[13vw] md:text-[8vw] lg:text-[6vw] font-serif font-bold leading-[0.85] tracking-[-0.04em] uppercase">
              The <br />
              <span className="gradient-text">New</span> <br />
              News
            </h1>
            <div className="mt-8 flex flex-wrap gap-4 items-end justify-between">
              <p className="max-w-md text-sm md:text-base opacity-55 leading-relaxed">
                Live news curation powered by AI intelligence and headlines from real publishers worldwide.
              </p>
              <div className="flex gap-2">
                <div className="px-3 py-1.5 bg-ink text-base rounded-full text-[10px] font-mono uppercase flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                  Agent Active
                </div>
              </div>
            </div>
            {articlesError && (
              <div className="mt-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 px-4 py-3 rounded-xl">
                <span className="text-red-500">⚠</span>
                {articlesError}
              </div>
            )}
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2">
            {isLoadingArticles ? (
              <div className="col-span-2 p-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className={cn("p-8 border-b border-line animate-pulse", i % 2 === 0 ? "md:border-r" : "")}>
                      <div className="flex gap-2 mb-6">
                        <div className="h-3 w-16 bg-ink/8 rounded-full" />
                        <div className="h-3 w-12 bg-ink/5 rounded-full" />
                      </div>
                      <div className="space-y-2 mb-4">
                        <div className="h-6 bg-ink/8 rounded w-full" />
                        <div className="h-6 bg-ink/8 rounded w-4/5" />
                        <div className="h-6 bg-ink/5 rounded w-3/5" />
                      </div>
                      <div className="space-y-2">
                        <div className="h-3 bg-ink/5 rounded w-full" />
                        <div className="h-3 bg-ink/5 rounded w-5/6" />
                        <div className="h-3 bg-ink/5 rounded w-4/6" />
                      </div>
                      {i === 0 && <div className="mt-6 h-40 bg-ink/5 rounded-xl" />}
                    </div>
                  ))}
                </div>
              </div>
            ) : filteredArticles.length > 0 ? (
              filteredArticles.map((article, idx) => (
                <ArticleCard 
                  key={article.id} 
                  article={article} 
                  isFeatured={idx === 0 && !searchQuery}
                  className={cn(
                    "border-b border-line p-6 md:p-10",
                    idx % 2 === 0 ? "md:border-r" : ""
                  )}
                  onClick={() => setSelectedArticle(article)}
                />
              ))
            ) : (
              <div className="col-span-2 p-20 text-center">
                <div className="text-5xl mb-4 opacity-20">◎</div>
                <div className="text-2xl font-serif italic opacity-30 mb-3">No results found.</div>
                <p className="text-sm opacity-40 font-mono uppercase tracking-widest">Try adjusting your search or filters.</p>
              </div>
            )}
          </div>
        </div>

        {/* AI Digest Sidebar */}
        <aside className="bg-ink text-base p-6 md:p-10 sticky top-[61px] h-[calc(100vh-61px)] overflow-y-auto">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-amber-500/20 rounded-xl flex items-center justify-center border border-amber-500/20">
                <Cpu size={15} className="text-amber-400" />
              </div>
              <div>
                <h2 className="text-xs font-mono uppercase tracking-widest text-base/60">AI Digest</h2>
                <div className="text-[10px] text-base/30 mt-0.5">Top stories · Summarized</div>
              </div>
            </div>
            <button 
              onClick={() => setArticles([...articles])}
              disabled={isGeneratingDigest}
              className="p-2 hover:bg-base/10 rounded-full transition-colors disabled:opacity-30 border border-base/10 hover:border-base/20"
              title="Refresh digest"
            >
              <Activity size={14} className={cn(isGeneratingDigest && "animate-spin")} />
            </button>
          </div>

          <div className="space-y-10">
            {isGeneratingDigest ? (
              <div className="space-y-5 animate-pulse">
                <div className="h-3 bg-base/10 w-2/3 rounded-full" />
                <div className="space-y-2">
                  <div className="h-2.5 bg-base/8 w-full rounded-full" />
                  <div className="h-2.5 bg-base/8 w-5/6 rounded-full" />
                  <div className="h-2.5 bg-base/6 w-4/6 rounded-full" />
                </div>
                <div className="h-24 bg-base/5 w-full rounded-xl" />
                <div className="space-y-2">
                  <div className="h-2.5 bg-base/8 w-full rounded-full" />
                  <div className="h-2.5 bg-base/6 w-3/4 rounded-full" />
                </div>
                <div className="h-24 bg-base/5 w-full rounded-xl" />
              </div>
            ) : (
              <div className="prose prose-invert prose-sm max-w-none prose-headings:font-serif prose-headings:font-bold prose-headings:tracking-tight prose-a:text-amber-400 prose-strong:text-base/90">
                <div className="opacity-85 leading-relaxed font-light text-sm">
                  <Markdown>{aiDigest}</Markdown>
                </div>
              </div>
            )}

            <div className="pt-8 border-t border-base/10">
              <h3 className="text-[10px] font-mono uppercase tracking-[0.2em] text-base/40 mb-5">Market Pulse</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 bg-base/5 rounded-2xl border border-base/8 hover:bg-base/8 transition-colors">
                  <div className="text-[10px] text-base/40 uppercase tracking-wide mb-2">Tech Index</div>
                  <div className="text-xl font-serif text-green-400">+4.2%</div>
                  <div className="text-[10px] text-base/30 mt-1 font-mono">↑ Trending up</div>
                </div>
                <div className="p-4 bg-base/5 rounded-2xl border border-base/8 hover:bg-base/8 transition-colors">
                  <div className="text-[10px] text-base/40 uppercase tracking-wide mb-2">Volatility</div>
                  <div className="text-xl font-serif text-red-400">High</div>
                  <div className="text-[10px] text-base/30 mt-1 font-mono">⚡ Watch closely</div>
                </div>
              </div>
            </div>

            <div className="p-5 bg-amber-500/8 border border-amber-500/15 rounded-2xl">
              <div className="flex items-center gap-2 text-amber-400 mb-2.5">
                <Shield size={13} />
                <span className="text-[10px] font-mono uppercase tracking-widest font-medium">Source Integrity</span>
              </div>
              <p className="text-xs leading-relaxed text-base/50">
                Headlines are fetched from verified publishers and summarized by AI. Always check original sources for full coverage.
              </p>
            </div>
          </div>
        </aside>
      </main>

      {/* Article Detail Modal */}
      <AnimatePresence>
        {selectedArticle && (
          <ArticleDetail 
            article={selectedArticle} 
            onClose={() => setSelectedArticle(null)} 
          />
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="border-t border-line px-6 py-14 bg-base">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-2">
            <div className="text-2xl font-serif font-bold uppercase tracking-tighter mb-1">TheNewNews</div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-amber-600/70 mb-4">Autonomous Intelligence Platform</div>
            <p className="text-sm opacity-40 max-w-xs leading-relaxed">
              An experimental interface for autonomous information synthesis. 
              Built for the next generation of intelligence consumers.
            </p>
          </div>
          <div>
            <h4 className="text-[10px] font-mono uppercase tracking-widest opacity-40 mb-5">Protocols</h4>
            <ul className="space-y-3 text-xs opacity-50">
              {['Editorial Standards', 'Agent Transparency', 'Data Integrity', 'Privacy Policy'].map(item => (
                <li key={item} className="hover:opacity-80 cursor-pointer transition-opacity">{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-[10px] font-mono uppercase tracking-widest opacity-40 mb-5">Connect</h4>
            <ul className="space-y-3 text-xs opacity-50">
              {['API Access', 'Newsletter', 'Terminal Login', 'Support'].map(item => (
                <li key={item} className="hover:opacity-80 cursor-pointer transition-opacity">{item}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-16 pt-6 border-t border-line flex flex-wrap justify-between gap-4 text-[10px] font-mono opacity-25 uppercase tracking-widest">
          <span>© 2026 TheNewNews Corp.</span>
          <span>Encrypted · AES-256</span>
        </div>
      </footer>
    </div>
  );
}

function ArticleDetail({ article, onClose }: { article: Article; onClose: () => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    container: scrollRef,
  });
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  const importanceColors = {
    high: 'bg-red-50 text-red-600 border-red-100',
    medium: 'bg-amber-50 text-amber-600 border-amber-100',
    low: 'bg-green-50 text-green-600 border-green-100',
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10 bg-ink/40 backdrop-blur-xl"
      onClick={onClose}
    >
      <motion.div 
        ref={scrollRef}
        initial={{ y: 30, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 30, opacity: 0, scale: 0.98 }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="w-full max-w-5xl bg-base border border-line/50 h-full overflow-y-auto relative shadow-2xl rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Reading Progress Bar */}
        <motion.div
          className="sticky top-0 left-0 right-0 h-[3px] bg-amber-500 origin-left z-50 rounded-full"
          style={{ scaleX }}
        />

        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2.5 hover:bg-ink/8 rounded-full z-10 transition-colors border border-line/50 hover:border-line"
          aria-label="Close"
        >
          <X size={18} strokeWidth={1.5} />
        </button>

        {article.imageUrl && (
          <div className="overflow-hidden rounded-t-3xl">
            <img
              src={article.imageUrl}
              alt={article.title}
              className="w-full aspect-[21/9] object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        )}

        <div className="p-8 md:p-14">
          <div className="flex items-center gap-2.5 mb-7 flex-wrap">
            <span className="px-3 py-1 bg-ink text-base text-[10px] font-mono uppercase rounded-full">
              {article.category}
            </span>
            <span className={cn(
              "px-3 py-1 text-[10px] font-mono uppercase rounded-full border",
              importanceColors[article.importance]
            )}>
              {article.importance === 'high' ? '⚡ Breaking' : article.importance === 'medium' ? '↑ Trending' : '● Standard'}
            </span>
            <span className="px-3 py-1 border border-line text-[10px] font-mono uppercase rounded-full text-ink/50">
              {article.source}
            </span>
            <span className="text-[10px] font-mono text-ink/35 uppercase tracking-widest ml-auto">
              {format(new Date(article.timestamp), 'MMM dd, yyyy')}
            </span>
          </div>

          <h2 className="text-3xl md:text-6xl font-serif font-bold leading-[1] tracking-tight mb-10">
            {article.title}
          </h2>

          <div className="flex items-center gap-5 mb-10 pb-8 border-b border-line">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-ink/8 border border-line rounded-full flex items-center justify-center font-serif italic text-lg">
                {article.author[0]}
              </div>
              <div>
                <div className="text-sm font-semibold">{article.author}</div>
                <div className="text-[10px] text-ink/40 uppercase tracking-wide">Intelligence Analyst</div>
              </div>
            </div>
            <div className="h-8 w-px bg-line" />
            <div className="flex items-center gap-1.5 text-ink/40">
              <Clock size={13} />
              <span className="text-[10px] font-mono uppercase">{article.readingTime} read</span>
            </div>
            <div className="h-8 w-px bg-line" />
            <ShareButton article={article} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-10">
            <div className="prose prose-lg max-w-none">
              <p className="text-xl md:text-2xl font-serif italic leading-relaxed text-ink/75 mb-8 border-l-4 border-amber-400/60 pl-5">
                {article.summary}
              </p>
              <div className="space-y-5 text-ink/65 leading-relaxed text-base">
                <p>
                  In a world increasingly defined by the invisible hand of algorithmic governance, the emergence of autonomous newsrooms represents a pivotal shift in how information is synthesized and distributed. The traditional editorial model, long plagued by human bias and the constraints of 24-hour news cycles, is giving way to a more resilient, data-driven architecture.
                </p>
                <p>
                  This transition is not merely technical; it is philosophical. By leveraging decentralized intelligence clusters, we can now monitor global shifts with a granularity that was previously impossible. From the subtle fluctuations in quantum computing stability to the macro-economic implications of AI-curated sovereign wealth, the "Autonomous Newsroom" provides a lens into the future that is both sharp and uncompromising.
                </p>
                <p>
                  As we move further into this silicon renaissance, the role of the reader also evolves. It is no longer enough to be a passive consumer of information. The modern intellectual must engage with these autonomous digests as a partner in sense-making, navigating the complex interplay of risk vectors and systemic shifts that define our era.
                </p>
              </div>
            </div>

            <aside className="space-y-6">
              <div className="p-5 bg-ink/[0.03] rounded-2xl border border-line">
                <h4 className="text-[10px] font-mono uppercase tracking-widest text-ink/40 mb-4">Key Implications</h4>
                <ul className="space-y-3.5">
                  {[
                    "Structural decoupling of human oversight",
                    "Accelerated cross-industry convergence",
                    "Emergence of post-human editorial standards"
                  ].map((item, i) => (
                    <li key={i} className="flex gap-2.5 text-xs leading-relaxed text-ink/70">
                      <Zap size={13} className="shrink-0 text-amber-500 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="p-5 bg-ink text-base rounded-2xl">
                <h4 className="text-[10px] font-mono uppercase tracking-widest text-base/40 mb-3">Agent Confidence</h4>
                <div className="text-4xl font-serif mb-3 text-green-400">98.4%</div>
                <div className="w-full h-1.5 bg-base/10 rounded-full overflow-hidden">
                  <div className="w-[98.4%] h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full" />
                </div>
                <div className="mt-2 text-[10px] text-base/30 font-mono">High confidence signal</div>
              </div>
            </aside>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ShareButton({ article, className }: { article: Article; className?: string }) {
  const [isCopied, setIsCopied] = useState(false);

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/article/${encodeURIComponent(article.id)}`;
    
    if (navigator.share) {
      navigator.share({
        title: article.title,
        text: article.summary,
        url: url,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(url).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      });
    }
  };

  return (
    <button 
      onClick={handleShare}
      className={cn(
        "flex items-center gap-2 p-1.5 hover:bg-ink/5 rounded-lg transition-colors group/share",
        className
      )}
    >
      {isCopied ? (
        <Check size={14} className="text-green-500" />
      ) : (
        <Share2 size={14} className="opacity-40 group-hover/share:opacity-100 transition-opacity" />
      )}
      <span className={cn(
        "text-[10px] font-mono uppercase tracking-widest transition-all",
        isCopied ? "text-green-500 opacity-100" : "opacity-0 group-hover/share:opacity-40"
      )}>
        {isCopied ? "Copied" : "Share"}
      </span>
    </button>
  );
}

function ArticleCard({ 
  article, 
  isFeatured, 
  className, 
  onClick 
}: { 
  article: Article; 
  isFeatured?: boolean;
  className?: string;
  onClick: () => void;
}) {
  const importanceBadge = {
    high: { label: 'Breaking', className: 'text-red-600 bg-red-50 border border-red-100' },
    medium: { label: 'Trending', className: 'text-amber-600 bg-amber-50 border border-amber-100' },
    low: { label: null, className: '' },
  }[article.importance];

  return (
    <motion.div 
      whileHover={{ backgroundColor: 'rgba(26, 26, 26, 0.025)' }}
      className={cn("group cursor-pointer flex flex-col", className)}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-mono text-ink/50 uppercase tracking-widest">
            {article.category}
          </span>
          <span className="text-ink/20">·</span>
          <span className="text-[10px] font-mono text-ink/40 uppercase tracking-widest">
            {article.source}
          </span>
          {importanceBadge.label && (
            <span className={cn(
              "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono uppercase font-medium",
              importanceBadge.className
            )}>
              <TrendingUp size={9} />
              {importanceBadge.label}
            </span>
          )}
        </div>
        <ArrowUpRight size={15} className="opacity-0 group-hover:opacity-30 transition-opacity shrink-0" />
      </div>

      {isFeatured && article.imageUrl && (
        <div className="mb-6 overflow-hidden rounded-2xl border border-line/50">
          <img 
            src={article.imageUrl} 
            alt={article.title}
            className="w-full aspect-[21/9] object-cover article-img-reveal"
            referrerPolicy="no-referrer"
          />
        </div>
      )}

      {!isFeatured && article.imageUrl && (
        <div className="mb-5 overflow-hidden rounded-xl border border-line/50">
          <img 
            src={article.imageUrl} 
            alt={article.title}
            className="w-full aspect-[16/7] object-cover article-img-reveal"
            referrerPolicy="no-referrer"
          />
        </div>
      )}

      <h3 className={cn(
        "font-serif font-bold leading-[1] tracking-tight group-hover:opacity-65 transition-opacity",
        isFeatured ? "text-4xl md:text-5xl mb-6" : "text-xl md:text-2xl mb-4"
      )}>
        {article.title}
      </h3>

      <p className={cn(
        "text-ink/55 leading-relaxed mb-6 line-clamp-3",
        isFeatured ? "text-base" : "text-sm"
      )}>
        {article.summary}
      </p>

      <div className="mt-auto flex items-center justify-between pt-4 border-t border-line/40">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-ink/8 rounded-full flex items-center justify-center text-[10px] font-serif italic">
            {article.author[0]}
          </div>
          <span className="text-[10px] font-semibold text-ink/50">{article.author}</span>
        </div>
        <div className="flex items-center gap-3">
          <ShareButton article={article} />
          <div className="flex items-center gap-1.5 text-ink/30">
            <Clock size={11} />
            <span className="text-[10px] font-mono uppercase">{article.readingTime}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
