import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Newspaper, ExternalLink, Clock, TrendingUp, Globe, Briefcase, Search, Filter, ChevronDown, ChevronLeft, ChevronRight, Loader2, ChevronUp, Factory } from 'lucide-react';
import { Button } from '../../ui/button';
import { motion } from 'framer-motion';
import { fetchDailyNews, searchNewsByKeywords } from '../../../services/newsApi';
import NewsDetailsModal from './NewsDetailsModal';
import IndustrySelector from './IndustrySelector';
import { useAuth } from '../../../auth/hooks/useAuth';

const ARTICLES_PER_PAGE = 5;

const DailyNews = () => {
  // Auth context
  const { user } = useAuth();

  // News state
  const [newsItems, setNewsItems] = useState([]);
  const [allNewsItems, setAllNewsItems] = useState([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsError, setNewsError] = useState('Please select the industry you are interested in to view related news');
  const [lastNewsUpdate, setLastNewsUpdate] = useState(null);

  // Search state
  const [searchKeywords, setSearchKeywords] = useState('');
  const [isSearchMode, setIsSearchMode] = useState(false);

  // Filter state
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  // Industry selection state
  const [selectedIndustries, setSelectedIndustries] = useState([]);
  const [showIndustrySelector, setShowIndustrySelector] = useState(true);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [displayedArticles, setDisplayedArticles] = useState([]);

  // Modal state
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [isNewsModalOpen, setIsNewsModalOpen] = useState(false);

  // Collapse state
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Filter options
  const filterOptions = [
    { value: 'all', label: 'All News', icon: '📰' },
    { value: 'trending', label: 'Trending', icon: '🔥' },
    { value: 'mainstream', label: 'Mainstream Sources', icon: '📡' },
    { value: 'business', label: 'Business', icon: '💼' },
    { value: 'technology', label: 'Technology', icon: '💻' },
    { value: 'recent', label: 'Recent (24h)', icon: '⏰' },
    { value: 'international', label: 'International', icon: '🌍' }
  ];

  // Apply filters to news items
  const applyNewsFilter = (articles, filter) => {
    if (!articles || articles.length === 0) return [];

    switch (filter) {
      case 'all':
        return articles;
      case 'trending':
        return articles.filter(article => article.trending);
      case 'mainstream':
        return articles.filter(article => {
          const source = article.source.toLowerCase();
          return ['cnn', 'bbc', 'reuters', 'techcrunch', 'cnbc', 'wired', 'guardian'].some(s => source.includes(s));
        });
      case 'business':
        return articles.filter(article =>
          article.category === 'business' ||
          article.title.toLowerCase().includes('business') ||
          article.summary.toLowerCase().includes('business')
        );
      case 'technology':
        return articles.filter(article =>
          article.category === 'technology' ||
          article.title.toLowerCase().includes('tech') ||
          article.title.toLowerCase().includes('ai') ||
          article.summary.toLowerCase().includes('technology')
        );
      case 'recent':
        return articles.filter(article => {
          const timeText = article.time.toLowerCase();
          return timeText.includes('hour') || timeText.includes('minute') || timeText.includes('just now');
        });
      case 'international':
        return articles.filter(article => {
          const source = article.source.toLowerCase();
          const title = article.title.toLowerCase();
          const summary = article.summary.toLowerCase();
          return ['bbc', 'reuters', 'guardian', 'international', 'global', 'world'].some(s =>
            source.includes(s) || title.includes(s) || summary.includes(s)
          );
        });
      default:
        return articles;
    }
  };

  // Update pagination when filtered articles change
  useEffect(() => {
    const startIndex = (currentPage - 1) * ARTICLES_PER_PAGE;
    const endIndex = startIndex + ARTICLES_PER_PAGE;
    setDisplayedArticles(newsItems.slice(startIndex, endIndex));
  }, [newsItems, currentPage]);

  // Reset to first page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedFilter, isSearchMode]);

  // Calculate pagination info
  const totalPages = Math.ceil(newsItems.length / ARTICLES_PER_PAGE);
  const startIndex = (currentPage - 1) * ARTICLES_PER_PAGE + 1;
  const endIndex = Math.min(currentPage * ARTICLES_PER_PAGE, newsItems.length);

  // Fetch news data
  const fetchNews = async (category = 'business', forceRefresh = false) => {
    if (newsLoading && !forceRefresh) return;

    setNewsLoading(true);
    setNewsError(null);

    try {
      // If industries are selected, search by industry keywords instead of general news
      if (selectedIndustries.length > 0) {
        console.log('📰 Searching news by industries via Google News:', { industries: selectedIndustries, category, forceRefresh });

        // Create search keywords from selected industries with news-specific terms
        const industryKeywords = selectedIndustries.map(industry => {
          // Add news-specific terms to make searches more relevant
          return `${industry} news OR ${industry} industry OR ${industry} market OR ${industry} business`;
        }).join(' OR ');

        console.log('🔍 Search keywords:', industryKeywords);

        const response = await searchNewsByKeywords(industryKeywords, 'general', 20); // Use 'general' for broader search

        if (response.success && response.articles && response.articles.length > 0) {
          // Store all articles for filtering
          setAllNewsItems(response.articles);

          // Apply current filter
          const filteredArticles = applyNewsFilter(response.articles, selectedFilter);
          setNewsItems(filteredArticles);

          setLastNewsUpdate(new Date().toISOString());
          console.log('📰 Industry-based Google News search completed:', response.articles.length, 'articles');
        } else {
          throw new Error(response.error || `No news articles found for industries: ${selectedIndustries.join(', ')}`);
        }
      } else {
        // No industries selected - show message to select industries
        console.log('📰 No industries selected, prompting user to select industries');
        setNewsItems([]);
        setAllNewsItems([]);
        setNewsError('请选择您感兴趣的行业来查看相关新闻');
      }
    } catch (error) {
      console.error('📰 Error fetching news:', error);
      setNewsError(error.message || 'Failed to fetch news');
      setNewsItems([]);
      setAllNewsItems([]);
    } finally {
      setNewsLoading(false);
    }
  };

  // Handle industry selection change
  const handleIndustriesChange = (industries) => {
    setSelectedIndustries(industries);

    // Auto-fetch news when industries change
    if (industries.length > 0) {
      fetchNews('general', true); // Force refresh with new industries
    } else {
      // Clear news when no industries selected
      setNewsItems([]);
      setAllNewsItems([]);
      setNewsError('请选择您感兴趣的行业来查看相关新闻');
    }
  };

  // Handle news search
  const handleNewsSearch = async (keywords) => {
    if (!keywords.trim()) return;

    setNewsLoading(true);
    setNewsError(null);
    setIsSearchMode(true);

    try {
      console.log('🔍 Searching news for:', keywords);
      const response = await searchNewsByKeywords(keywords, 'business', 20);

      if (response.success && response.articles && response.articles.length > 0) {
        setAllNewsItems(response.articles);

        const filteredArticles = applyNewsFilter(response.articles, selectedFilter);
        setNewsItems(filteredArticles);

        setLastNewsUpdate(new Date().toISOString());
        setNewsError(null);
        console.log('🔍 Search completed:', response.articles.length, 'articles found');
        console.log('🔍 Filtered to:', filteredArticles.length, 'articles with filter:', selectedFilter);
      } else {
        setAllNewsItems([]);
        setNewsItems([]);
        setNewsError(`No articles found for "${keywords}"`);
        console.warn('🔍 No articles found for keywords:', keywords);
      }
    } catch (error) {
      console.error('🔍 Error searching news:', error);
      setNewsError(error.message || 'Failed to search news');
      setNewsItems([]);
      setAllNewsItems([]);
    } finally {
      setNewsLoading(false);
    }
  };

  // Handle filter change
  const handleFilterChange = (filterValue) => {
    setSelectedFilter(filterValue);
    setShowFilterDropdown(false);

    const filteredItems = applyNewsFilter(allNewsItems, filterValue);
    setNewsItems(filteredItems);
  };

  // Handle article click
  const handleNewsArticleClick = (article) => {
    setSelectedArticle(article);
    setIsNewsModalOpen(true);
  };

  // Handle AI summary request
  const handleGetAISummary = async (article) => {
    // For now, return a placeholder since we don't have AI summary service
    // This can be implemented later with actual AI service
    return `AI Summary for "${article.title}": This is a placeholder AI summary. The actual implementation would call an AI service to generate a summary of the article content.`;
  };

  // Handle pagination
  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showFilterDropdown && !event.target.closest('.filter-dropdown')) {
        setShowFilterDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilterDropdown]);

  // Don't auto-load news - wait for user to select industries
  // useEffect(() => {
  //   fetchNews('business');
  // }, []);

  // Removed getCategoryColor function as it's no longer needed

  return (
    <>
      <Card className="h-full shadow-sm border-slate-200">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Newspaper className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-slate-900">Daily News</CardTitle>
                <p className="text-sm text-slate-500">Latest headlines from premium sources</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                {isSearchMode ? 'Google News + RSS' : 'Premium RSS Sources'}
              </span>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-1 h-6 w-6 bg-white border border-gray-200 rounded-full shadow-sm hover:shadow-md"
              >
                {isCollapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Collapsed View */}
          {isCollapsed && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{newsItems.length} articles loaded</span>
              <div className="flex items-center gap-2">
                {isSearchMode && searchKeywords && (
                  <span className="text-blue-600">
                    Search: "{searchKeywords}"
                  </span>
                )}
                {selectedFilter !== 'all' && (
                  <span className="text-purple-600">
                    Filter: {filterOptions.find(f => f.value === selectedFilter)?.label}
                  </span>
                )}
                {lastNewsUpdate && (
                  <span className="text-green-600">
                    Updated: {new Date(lastNewsUpdate).toLocaleTimeString()}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Expanded View */}
          {!isCollapsed && (
            <>
              {/* Industry Selector */}
              {showIndustrySelector && (
                <div className="mb-4">
                  <IndustrySelector
                    userEmail={user?.email || "logan@preludeos.com"}
                    selectedIndustries={selectedIndustries}
                    onIndustriesChange={handleIndustriesChange}
                  />
                </div>
              )}

              {/* FORCE VISIBLE DEBUG INFO */}
              <div className="bg-red-100 border-2 border-red-500 p-4 mb-4 rounded">
                <h3 className="font-bold text-red-800">� DEBUG INFO (代码已更新 - {new Date().toLocaleTimeString()})</h3>
                <p>showIndustrySelector: {showIndustrySelector.toString()}</p>
                <p>selectedIndustries: [{selectedIndustries.join(', ')}] (count: {selectedIndustries.length})</p>
                <p>newsItems count: {newsItems.length}</p>
                <p>newsError: {newsError}</p>
                <p>user email: {user?.email || 'null'}</p>
                <p>isCollapsed: {isCollapsed.toString()}</p>
              </div>

              {/* Controls Row */}
          <div className="flex items-center gap-3">
            {/* Search Bar */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search Google News & RSS feeds..."
                value={searchKeywords}
                onChange={(e) => setSearchKeywords(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleNewsSearch(searchKeywords);
                  }
                }}
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            {/* Search Button */}
            <Button
              size="sm"
              className="px-4"
              onClick={() => handleNewsSearch(searchKeywords)}
              disabled={newsLoading || !searchKeywords.trim()}
            >
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>

            {/* Industry Selector Toggle */}
            <Button
              variant="outline"
              size="sm"
              className="px-3"
              onClick={() => setShowIndustrySelector(!showIndustrySelector)}
            >
              <Factory className="w-4 h-4 mr-2" />
              {showIndustrySelector ? '隐藏行业' : '选择行业'}
            </Button>

            {/* Filter Dropdown */}
            <div className="relative filter-dropdown">
              <Button
                variant="outline"
                size="sm"
                className="px-3"
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              >
                <Filter className="w-4 h-4 mr-2" />
                {filterOptions.find(f => f.value === selectedFilter)?.label || 'Filter'}
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>

              {showFilterDropdown && (
                <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[180px]">
                  {filterOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleFilterChange(option.value)}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${
                        selectedFilter === option.value ? 'bg-primary/10 text-primary' : 'text-gray-700'
                      }`}
                    >
                      <span>{option.icon}</span>
                      <span>{option.label}</span>
                      {selectedFilter === option.value && (
                        <span className="ml-auto text-primary">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Refresh Button */}
            <Button
              variant="outline"
              size="sm"
              className="px-3"
              onClick={() => {
                if (isSearchMode) {
                  setIsSearchMode(false);
                  setSearchKeywords('');
                  setSelectedFilter('all');
                }
                // Only refresh if industries are selected
                if (selectedIndustries.length > 0) {
                  fetchNews('general', true);
                } else {
                  setNewsError('请选择您感兴趣的行业来查看相关新闻');
                }
              }}
              disabled={newsLoading}
            >
              {newsLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ExternalLink className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* Industry Status Info */}
          {selectedIndustries.length > 0 && (
            <div className="flex items-center justify-between text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded border border-blue-200">
              <span className="flex items-center gap-2">
                <Factory className="w-3 h-3" />
                基于行业搜索: {selectedIndustries.slice(0, 3).join(', ')}
                {selectedIndustries.length > 3 && ` +${selectedIndustries.length - 3} 更多`}
              </span>
              <button
                onClick={() => setSelectedIndustries([])}
                className="text-blue-600 hover:text-blue-800 underline"
              >
                清除行业过滤
              </button>
            </div>
          )}

          {/* Filter Results Info */}
          {selectedFilter !== 'all' && newsItems.length > 0 && (
            <div className="flex items-center justify-between text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded">
              <span>
                Showing {newsItems.length} of {allNewsItems.length} articles
                • Filter: {filterOptions.find(f => f.value === selectedFilter)?.label}
              </span>
              <button
                onClick={() => handleFilterChange('all')}
                className="text-primary hover:text-primary/80 underline"
              >
                Clear filter
              </button>
            </div>
          )}

          {/* Loading State */}
          {newsLoading && newsItems.length === 0 && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Fetching latest news...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {newsError && newsItems.length === 0 && (
            <div className="text-center py-12">
              <div className="text-red-500 mb-4">
                <Newspaper className="w-8 h-8 mx-auto mb-2" />
                <p className="text-sm">Failed to load news</p>
                <p className="text-xs text-gray-500 mt-1">{newsError}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (selectedIndustries.length > 0) {
                    fetchNews('general', true);
                  } else {
                    setNewsError('请选择您感兴趣的行业来查看相关新闻');
                  }
                }}
                disabled={newsLoading}
              >
                重试
              </Button>
            </div>
          )}

          {/* News Articles */}
          {displayedArticles.length > 0 && (
            <div className="space-y-3">
              {displayedArticles.map((article, index) => (
                <motion.div
                  key={article.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card
                    className={`hover:shadow-md transition-all cursor-pointer ${
                      article.trending ? 'border-l-4 border-l-primary bg-primary/5' : ''
                    }`}
                    onClick={() => handleNewsArticleClick(article)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {/* News Image or Icon */}
                        {article.imageUrl ? (
                          <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                            <img
                              src={article.imageUrl}
                              alt={article.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Newspaper className="w-6 h-6 text-gray-400" />
                          </div>
                        )}

                        {/* News Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h4 className="font-medium text-sm leading-tight line-clamp-2">
                              {article.title}
                              {article.trending && (
                                <span className="ml-2 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">
                                  🔥 Trending
                                </span>
                              )}
                            </h4>
                          </div>

                          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                            {article.summary}
                          </p>

                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{article.source}</span>
                              <span>•</span>
                              <span>{article.time}</span>
                              <span>•</span>
                              <span>{article.readTime}</span>
                            </div>
                            <span className="text-primary hover:text-primary/80">
                              Read More →
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {newsItems.length > ARTICLES_PER_PAGE && (
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex}-{endIndex} of {newsItems.length} articles
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                  className="px-3"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>

                <span className="text-sm text-muted-foreground px-3">
                  Page {currentPage} of {totalPages}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className="px-3"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
          </>
        )}
        </CardContent>
      </Card>

      {/* News Details Modal */}
      <NewsDetailsModal
        isOpen={isNewsModalOpen}
        onClose={() => setIsNewsModalOpen(false)}
        article={selectedArticle}
        onGetAISummary={handleGetAISummary}
      />
    </>
  );
};

export default DailyNews;
