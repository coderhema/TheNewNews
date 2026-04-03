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
  ChevronRight,
  TrendingUp,
  Activity,
  Share2,
  Check,
  X,
  Filter,
  Calendar,
  User
} from 'lucide-react';
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import Markdown from 'react-markdown';
import OpenAI from 'openai';
import { cn } from './lib/utils';
import { Article } from './types';
import { fetchNewsArticles } from './services/newsService';

const openai = new OpenAI({
  apiKey: process.env.POKE_API_KEY,
  baseURL: process.env.POKE_API_BASE_URL,
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
    document.title = 'TheNewNews';
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
          model: process.env.POKE_MODEL || 'gpt-4o-mini',
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
    const url = `${window.location.origin}/article/${article.id}`;
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
      <nav className="border-b border-line px-6 py-4 flex justify-between items-center sticky top-0 bg-base/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] opacity-60">Live Newsroom</span>
          </div>
          <div className="hidden md:flex gap-6">
            {['Intelligence', 'Markets', 'Geopolitics', 'Design', 'Science'].map((item) => (
              <button key={item} className="text-[11px] uppercase tracking-widest font-medium hover:opacity-50 transition-opacity">
                {item}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="hidden sm:flex items-center gap-2 font-mono text-[10px] opacity-40">
            <span>{format(currentTime, 'HH:mm:ss')} UTC</span>
            <span className="mx-2">/</span>
            <span>{format(currentTime, 'MMM dd, yyyy')}</span>
          </div>
          <button 
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className={cn(
              "p-2 rounded-full transition-colors",
              isSearchOpen ? "bg-ink text-base" : "hover:bg-ink/5"
            )}
          >
            {isSearchOpen ? <X size={18} strokeWidth={1.5} /> : <Search size={18} strokeWidth={1.5} />}
          </button>
          <button className="p-2 hover:bg-ink/5 rounded-full transition-colors">
            <Menu size={18} strokeWidth={1.5} />
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
          <header className="px-6 py-12 md:py-20 border-b border-line">
            <h1 className="text-[12vw] md:text-[8vw] lg:text-[6vw] font-serif font-bold leading-[0.85] tracking-[-0.04em] uppercase">
              The <br />
              New <br />
              News
            </h1>
            <div className="mt-8 flex flex-wrap gap-4 items-end justify-between">
              <p className="max-w-md text-sm md:text-base opacity-60 leading-relaxed">
                Live news curation powered by Poke API intelligence and headlines from real publishers.
              </p>
              <div className="flex gap-2">
                <div className="px-3 py-1 border border-line rounded-full text-[10px] font-mono uppercase">v4.2.0-live</div>
                <div className="px-3 py-1 bg-ink text-base rounded-full text-[10px] font-mono uppercase">Agent Active</div>
              </div>
            </div>
            {articlesError && (
              <div className="mt-4 text-sm text-red-500">
                {articlesError}
              </div>
            )}
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2">
            {isLoadingArticles ? (
              <div className="col-span-2 p-20 text-center">
                <div className="text-4xl font-serif italic opacity-20 mb-4">Loading live news.</div>
                <p className="text-sm opacity-40 font-mono uppercase tracking-widest">Fetching headlines from real sources.</p>
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
                <div className="text-4xl font-serif italic opacity-20 mb-4">No intelligence matches found.</div>
                <p className="text-sm opacity-40 font-mono uppercase tracking-widest">Broaden your search parameters.</p>
              </div>
            )}
          </div>
        </div>

        {/* AI Digest Sidebar */}
        <aside className="bg-ink text-base p-6 md:p-10 sticky top-[69px] h-[calc(100vh-69px)] overflow-y-auto">
          <div className="flex items-center justify-between mb-12">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-base/10 rounded-lg flex items-center justify-center">
                <Cpu size={16} className="text-base/80" />
              </div>
              <div>
                <h2 className="text-xs font-mono uppercase tracking-widest opacity-50">Trending AI Summaries</h2>
                <div className="text-[10px] opacity-30">Top 8 Stories</div>
              </div>
            </div>
            <button 
              onClick={() => setArticles([...articles])}
              disabled={isGeneratingDigest}
              className="p-2 hover:bg-base/10 rounded-full transition-colors disabled:opacity-30"
            >
              <Activity size={16} className={cn(isGeneratingDigest && "animate-spin")} />
            </button>
          </div>

          <div className="space-y-12">
            {isGeneratingDigest ? (
              <div className="space-y-4 animate-pulse">
                <div className="h-4 bg-base/10 w-3/4 rounded" />
                <div className="h-4 bg-base/10 w-1/2 rounded" />
                <div className="h-32 bg-base/5 w-full rounded-xl" />
              </div>
            ) : (
              <div className="prose prose-invert prose-sm max-w-none">
                <div className="markdown-body opacity-90 leading-relaxed font-light">
                  <Markdown>{aiDigest}</Markdown>
                </div>
              </div>
            )}

            <div className="pt-12 border-t border-base/10">
              <h3 className="text-[10px] font-mono uppercase tracking-[0.2em] opacity-40 mb-6">Market Sentiment</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-base/5 rounded-xl border border-base/10">
                  <div className="text-[10px] opacity-40 uppercase mb-1">Tech Index</div>
                  <div className="text-xl font-serif">+4.2%</div>
                </div>
                <div className="p-4 bg-base/5 rounded-xl border border-base/10">
                  <div className="text-[10px] opacity-40 uppercase mb-1">Volatility</div>
                  <div className="text-xl font-serif text-red-400">High</div>
                </div>
              </div>
            </div>

            <div className="pt-8">
              <div className="p-6 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
                <div className="flex items-center gap-2 text-blue-400 mb-2">
                  <Shield size={14} />
                  <span className="text-[10px] font-mono uppercase tracking-widest">Security Alert</span>
                </div>
                <p className="text-xs leading-relaxed opacity-70">
                  Live headlines are refreshed from public news providers and summarized with the Poke API.
                </p>
              </div>
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
      <footer className="border-t border-line px-6 py-12 bg-base">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-2">
            <div className="text-2xl font-serif font-bold uppercase tracking-tighter mb-4">TheNewNews</div>
            <p className="text-sm opacity-40 max-w-xs leading-relaxed">
              A experimental interface for autonomous information synthesis. 
              Built for the next generation of intelligence.
            </p>
          </div>
          <div>
            <h4 className="text-[10px] font-mono uppercase tracking-widest opacity-40 mb-6">Protocols</h4>
            <ul className="space-y-3 text-xs opacity-60">
              <li>Editorial Standards</li>
              <li>Agent Transparency</li>
              <li>Data Integrity</li>
              <li>Privacy Policy</li>
            </ul>
          </div>
          <div>
            <h4 className="text-[10px] font-mono uppercase tracking-widest opacity-40 mb-6">Connect</h4>
            <ul className="space-y-3 text-xs opacity-60">
              <li>API Access</li>
              <li>Newsletter</li>
              <li>Terminal Login</li>
              <li>Support</li>
            </ul>
          </div>
        </div>
        <div className="mt-20 pt-8 border-t border-line flex flex-wrap justify-between gap-4 text-[10px] font-mono opacity-30 uppercase tracking-widest">
          <span>© 2026 TheNewNews Corp.</span>
          <span>Encrypted Connection / AES-256</span>
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

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-12 bg-base/95 backdrop-blur-xl"
    >
      <motion.div 
        ref={scrollRef}
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        className="w-full max-w-5xl bg-base border border-line h-full overflow-y-auto relative shadow-2xl rounded-3xl"
      >
        {/* Reading Progress Bar */}
        <motion.div
          className="sticky top-0 left-0 right-0 h-1 bg-ink origin-left z-50"
          style={{ scaleX }}
        />

        <button 
          onClick={onClose}
          className="absolute top-8 right-8 p-3 hover:bg-ink/5 rounded-full z-10 transition-colors"
        >
          <ChevronRight size={24} className="rotate-90" />
        </button>

        <div className="p-8 md:p-20">
          <div className="flex items-center gap-4 mb-8">
            <span className="px-3 py-1 bg-ink text-base text-[10px] font-mono uppercase rounded-full">
              {article.category}
            </span>
            <span className="px-3 py-1 border border-line text-[10px] font-mono uppercase rounded-full opacity-60">
              {article.source}
            </span>
            <span className="text-[10px] font-mono opacity-40 uppercase tracking-widest">
              {format(new Date(article.timestamp), 'MMM dd, yyyy')}
            </span>
          </div>

          <h2 className="text-4xl md:text-7xl font-serif font-bold leading-[0.95] tracking-tight mb-12">
            {article.title}
          </h2>

          <div className="flex items-center gap-6 mb-12 pb-12 border-b border-line">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-ink/5 rounded-full flex items-center justify-center font-serif italic text-lg">
                {article.author[0]}
              </div>
              <div>
                <div className="text-xs font-semibold">{article.author}</div>
                <div className="text-[10px] opacity-40 uppercase">Senior Intelligence Analyst</div>
              </div>
            </div>
            <div className="h-8 w-px bg-line" />
            <div className="flex items-center gap-2 opacity-40">
              <Clock size={14} />
              <span className="text-[10px] font-mono uppercase">{article.readingTime} read</span>
            </div>
            <div className="h-8 w-px bg-line" />
            <ShareButton article={article} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-12">
            <div className="prose prose-lg max-w-none">
              <p className="text-xl md:text-2xl font-serif italic leading-relaxed opacity-80 mb-8">
                {article.summary}
              </p>
              <div className="space-y-6 opacity-70 leading-relaxed">
                <p>
                  In a world increasingly defined by the invisible hand of algorithmic governance, the emergence of autonomous newsrooms represents a pivotal shift in how information is synthesized and distributed. The traditional editorial model, long plagued by human bias and the constraints of 24-hour news cycles, is giving way to a more resilient, data-driven architecture.
                </p>
                <p>
                  This transition is not merely technical; it is philosophical. By leveraging decentralized intelligence clusters, we can now monitor global shifts with a granularity that was previously impossible. From the subtle fluctuations in quantum computing stability to the macro-economic implications of AI-curated sovereign wealth, the "Autonomous Newsroom" provides a lens into the future that is both sharp and uncompromising.
                </p>
                <img 
                  src={article.imageUrl} 
                  alt={article.title}
                  className="w-full aspect-video object-cover rounded-2xl my-12"
                  referrerPolicy="no-referrer"
                />
                <p>
                  As we move further into this silicon renaissance, the role of the reader also evolves. It is no longer enough to be a passive consumer of information. The modern intellectual must engage with these autonomous digests as a partner in sense-making, navigating the complex interplay of risk vectors and systemic shifts that define our era.
                </p>
              </div>
            </div>

            <aside className="space-y-8">
              <div className="p-6 bg-ink/5 rounded-2xl border border-line">
                <h4 className="text-[10px] font-mono uppercase tracking-widest opacity-40 mb-4">Key Implications</h4>
                <ul className="space-y-4">
                  {[
                    "Structural decoupling of human oversight",
                    "Accelerated cross-industry convergence",
                    "Emergence of post-human editorial standards"
                  ].map((item, i) => (
                    <li key={i} className="flex gap-3 text-xs leading-relaxed">
                      <Zap size={14} className="shrink-0 text-ink/40" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="p-6 bg-ink text-base rounded-2xl">
                <h4 className="text-[10px] font-mono uppercase tracking-widest opacity-40 mb-4">Agent Confidence</h4>
                <div className="text-3xl font-serif mb-2">98.4%</div>
                <div className="w-full h-1 bg-base/10 rounded-full overflow-hidden">
                  <div className="w-[98.4%] h-full bg-base" />
                </div>
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
    const url = `${window.location.origin}/article/${article.id}`;
    
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
  return (
    <motion.div 
      whileHover={{ backgroundColor: 'rgba(26, 26, 26, 0.02)' }}
      className={cn("group cursor-pointer flex flex-col", className)}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono opacity-40 uppercase tracking-widest">
            {article.category}
          </span>
          <span className="text-[10px] font-mono opacity-40 uppercase tracking-widest px-2 border-l border-line">
            {article.source}
          </span>
          {article.importance === 'high' && (
            <div className="flex items-center gap-1 text-red-500">
              <TrendingUp size={10} />
              <span className="text-[10px] font-mono uppercase">Critical</span>
            </div>
          )}
        </div>
        <ArrowUpRight size={16} className="opacity-0 group-hover:opacity-40 transition-opacity" />
      </div>

      <h3 className={cn(
        "font-serif font-bold leading-[0.95] tracking-tight group-hover:opacity-70 transition-opacity",
        isFeatured ? "text-4xl md:text-6xl mb-8" : "text-2xl md:text-3xl mb-6"
      )}>
        {article.title}
      </h3>

      <p className={cn(
        "opacity-60 leading-relaxed mb-8 line-clamp-3",
        isFeatured ? "text-lg" : "text-sm"
      )}>
        {article.summary}
      </p>

      {isFeatured && (
        <div className="mb-8 overflow-hidden rounded-2xl">
          <img 
            src={article.imageUrl} 
            alt={article.title}
            className="w-full aspect-[21/9] object-cover group-hover:scale-105 transition-transform duration-700"
            referrerPolicy="no-referrer"
          />
        </div>
      )}

      <div className="mt-auto flex items-center justify-between pt-6 border-t border-line/5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-ink/5 rounded-full flex items-center justify-center text-[10px] font-serif italic">
            {article.author[0]}
          </div>
          <span className="text-[10px] font-semibold opacity-60">{article.author}</span>
        </div>
        <div className="flex items-center gap-4">
          <ShareButton article={article} />
          <div className="flex items-center gap-2 opacity-30">
            <Clock size={12} />
            <span className="text-[10px] font-mono uppercase">{article.readingTime}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
