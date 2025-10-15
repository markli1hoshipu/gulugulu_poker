/**
 * News API Service for HTTP REST Integration
 * Provides methods to fetch daily news via HTTP REST API
 */

const API_BASE_URL = 'http://localhost:8004';

/**
 * Get authentication token from localStorage
 */
function getAuthToken() {
  const token = localStorage.getItem('id_token');
  if (!token || token === 'null' || token === 'undefined') {
    throw new NewsApiError('No authentication token found');
  }
  return token;
}

/**
 * Make HTTP request with authentication and error handling
 */
async function makeAuthenticatedRequest(endpoint, options = {}) {
  try {
    const token = getAuthToken();
    
    const defaultOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };

    const requestOptions = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers
      }
    };

    console.log(`📡 Making HTTP request to: ${API_BASE_URL}${endpoint}`);
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, requestOptions);
    
    if (!response.ok) {
      throw new NewsApiError(
        `HTTP request failed: ${response.status} ${response.statusText}`,
        response.status
      );
    }

    const data = await response.json();
    console.log('📡 HTTP request completed successfully');
    return data;
    
  } catch (error) {
    console.error('📡 HTTP request error:', error);
    throw error instanceof NewsApiError ? error : new NewsApiError(`Request failed: ${error.message}`);
  }
}

class NewsApiError extends Error {
  constructor(message, status = null, data = null) {
    super(message);
    this.name = 'NewsApiError';
    this.status = status;
    this.data = data;
  }
}

// Cache for news data
const newsCache = new Map();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

/**
 * Check if cached data is still valid
 */
function isCacheValid(cacheKey) {
  const cached = newsCache.get(cacheKey);
  if (!cached) return false;
  
  const now = Date.now();
  return (now - cached.timestamp) < CACHE_DURATION;
}

/**
 * Get cached data if valid
 */
function getCachedData(cacheKey) {
  if (isCacheValid(cacheKey)) {
    return newsCache.get(cacheKey).data;
  }
  return null;
}

/**
 * Cache data with timestamp
 */
function setCachedData(cacheKey, data) {
  newsCache.set(cacheKey, {
    data,
    timestamp: Date.now()
  });
}

// All news functionality now uses HTTP REST API
// This ensures single entry point principle for news functionality

/**
 * Fetch daily news articles with optional industry filtering
 * @param {string} category - News category (business, technology, general, industry, market)
 * @param {number} limit - Maximum number of articles (default: 10)
 * @param {boolean} forceRefresh - Force refresh, bypass cache (default: false)
 * @param {string} userEmail - User email for industry-based filtering (optional)
 * @returns {Promise<Object>} News response with articles array
 */
export async function fetchDailyNews(category = 'business', limit = 10, forceRefresh = false, userEmail = null, industries = []) {
  const cacheKey = `daily_news_${category}_${limit}_${userEmail || 'no_user'}_${industries.join(',')}`;

  // Check cache first (unless force refresh)
  if (!forceRefresh) {
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      console.log('📰 Returning cached news data');
      return cachedData;
    }
  } else {
    console.log('📰 Force refresh - bypassing cache and clearing existing cache');
    // Clear the specific cache entry
    newsCache.delete(cacheKey);
    // Also clear all related cache entries
    for (const key of newsCache.keys()) {
      if (key.includes(category)) {
        newsCache.delete(key);
      }
    }
  }

  try {
    console.log(`📰 Fetching daily news via HTTP: category=${category}, limit=${limit}, industries=${industries.length}`);

    // Prepare request data
    const requestData = {
      category,
      limit,
      user_email: userEmail,
      industries: industries || []
    };

    // Make HTTP request
    const response = await makeAuthenticatedRequest('/api/agents/news/daily', {
      method: 'POST',
      body: JSON.stringify(requestData)
    });

    if (response.success && response.result) {
      // Format response for frontend compatibility
      const formattedResponse = {
        success: true,
        articles: response.result.articles || [],
        category: response.result.category || category,
        source: response.result.source || 'News API',
        total: response.result.total || (response.result.articles ? response.result.articles.length : 0),
        timestamp: new Date().toISOString()
      };

      // Cache successful response
      setCachedData(cacheKey, formattedResponse);
      return formattedResponse;
    } else {
      throw new NewsApiError('Failed to fetch news from HTTP server', null, response);
    }
  } catch (error) {
    console.error('📰 Error fetching daily news via HTTP:', error);
    
    // Return fallback data on error
    return {
      success: false,
      error: error.message,
      articles: getFallbackNews(category),
      category,
      timestamp: new Date().toISOString(),
      total_count: 0
    };
  }
}

/**
 * Fetch news from multiple categories
 * @param {Array<string>} categories - Array of categories
 * @param {number} limitPerCategory - Articles per category
 * @returns {Promise<Object>} Categorized news response
 */
export async function fetchNewsByCategories(categories = ['business', 'technology'], limitPerCategory = 5) {
  const cacheKey = `multi_news_${categories.join('_')}_${limitPerCategory}`;
  
  // Check cache first
  const cachedData = getCachedData(cacheKey);
  if (cachedData) {
    console.log('📰 Returning cached multi-category news data');
    return cachedData;
  }

  try {
    console.log(`📰 Fetching multi-category news via HTTP: categories=${categories.join(',')}, limit=${limitPerCategory}`);

    // Make HTTP request
    const response = await makeAuthenticatedRequest('/api/agents/news/categories', {
      method: 'POST',
      body: JSON.stringify({
        categories,
        limit_per_category: limitPerCategory
      })
    });

    if (response.success && response.result) {
      setCachedData(cacheKey, response.result);
      return response.result;
    } else {
      throw new NewsApiError('Failed to fetch categorized news via HTTP', null, response);
    }
  } catch (error) {
    console.error('📰 Error fetching categorized news via HTTP:', error);
    
    // Return fallback data
    const fallbackResult = {
      success: false,
      error: error.message,
      categories: {},
      timestamp: new Date().toISOString(),
      total_articles: 0
    };
    
    categories.forEach(category => {
      fallbackResult.categories[category] = getFallbackNews(category, limitPerCategory);
    });
    
    return fallbackResult;
  }
}

/**
 * Fetch trending news articles
 * @param {number} limit - Maximum number of trending articles
 * @returns {Promise<Object>} Trending news response
 */
export async function fetchTrendingNews(limit = 5) {
  const cacheKey = `trending_news_${limit}`;
  
  // Check cache first
  const cachedData = getCachedData(cacheKey);
  if (cachedData) {
    console.log('📰 Returning cached trending news data');
    return cachedData;
  }

  try {
    console.log(`📰 Fetching trending news via HTTP: limit=${limit}`);

    // Make HTTP request (GET request for trending news)
    const response = await makeAuthenticatedRequest(`/api/agents/news/trending?limit=${limit}`, {
      method: 'GET'
    });

    if (response.success && response.result) {
      setCachedData(cacheKey, response.result);
      return response.result;
    } else {
      throw new NewsApiError('Failed to fetch trending news via HTTP', null, response);
    }
  } catch (error) {
    console.error('📰 Error fetching trending news via HTTP:', error);
    
    return {
      success: false,
      error: error.message,
      trending_articles: getFallbackNews('business', limit),
      timestamp: new Date().toISOString(),
      total_count: 0
    };
  }
}

/**
 * Get fallback news data when API fails
 */
function getFallbackNews(category = 'business', limit = 5) {
  const fallbackArticles = [
    {
      id: '1',
      title: 'Market Analysis: Tech Sector Shows Strong Growth',
      summary: 'Technology companies continue to demonstrate resilience with strong quarterly earnings and innovative product launches.',
      source: 'Business Wire',
      time: '2 hours ago',
      category: 'business',
      readTime: '3 min read',
      trending: true
    },
    {
      id: '2',
      title: 'AI Innovation Drives Enterprise Transformation',
      summary: 'Artificial intelligence adoption accelerates across industries, with companies reporting significant productivity gains.',
      source: 'Tech Today',
      time: '4 hours ago',
      category: 'technology',
      readTime: '4 min read',
      trending: false
    },
    {
      id: '3',
      title: 'Global Supply Chain Optimization Trends',
      summary: 'Manufacturing and logistics companies implement new technologies to improve efficiency and reduce costs.',
      source: 'Industry Report',
      time: '6 hours ago',
      category: 'industry',
      readTime: '5 min read',
      trending: false
    }
  ];

  return fallbackArticles
    .filter(article => article.category === category || category === 'general')
    .slice(0, limit);
}

/**
 * Fetch full article content from URL
 * @param {string} url - Article URL to extract content from
 * @returns {Promise<Object>} Full article content response
 */
export async function fetchFullArticle(url) {
  try {
    console.log('📄 Fetching full article content via HTTP from:', url);

    // Make HTTP request
    const response = await makeAuthenticatedRequest('/api/agents/news/full-article', {
      method: 'POST',
      body: JSON.stringify({ url: url })
    });

    console.log('📄 Full article response via HTTP:', response);

    if (response.success && response.result) {
      console.log('📄 Full article content extracted successfully via HTTP');
      console.log(`📊 Word count: ${response.result.word_count} words`);

      // Ensure we have the required fields
      const result = {
        success: true,
        url: response.result.url || url,
        title: response.result.title || 'Article Title',
        full_content: response.result.full_content || response.result.content || 'Content not available',
        author: response.result.author || 'Unknown',
        publish_date: response.result.publish_date || '',
        image_url: response.result.image_url || '',
        word_count: response.result.word_count || 0,
        read_time: response.result.read_time || '5 min read',
        meta_description: response.result.meta_description || '',
        extracted_at: response.result.extracted_at || new Date().toISOString(),
        extraction_error: response.result.extraction_error || null
      };

      return result;
    } else {
      console.error('📄 Failed to fetch article via HTTP:', response);
      throw new NewsApiError('Failed to fetch full article content via HTTP', null, response);
    }
  } catch (error) {
    console.error('📄 Error fetching full article:', error);

    // Provide a fallback response with error information
    return {
      success: false,
      url: url,
      title: 'Unable to Extract Article',
      full_content: `Unable to extract the full content from this article. This may be due to:\n\n• The website blocking automated content extraction\n• The article being behind a paywall\n• Technical issues with the content scraper\n\nPlease try clicking "Read Full Article" to view the original article on the publisher's website.`,
      author: 'Unknown',
      publish_date: '',
      image_url: '',
      word_count: 0,
      read_time: 'Unknown',
      meta_description: '',
      extracted_at: new Date().toISOString(),
      extraction_error: error.message || 'Content extraction failed'
    };
  }
}

/**
 * Get AI summary for a news article
 * @param {Object} article - News article object
 * @returns {Promise<Object>} AI summary response
 */
export async function getAINewsSummary(article) {
  try {
    console.log('🤖 Requesting AI summary via HTTP for:', article.title);

    // Prepare request data
    const requestData = {
      title: article.title,
      summary: article.summary || article.full_content || '',
      url: article.url,
      source: article.source,
      category: article.category,
      full_content: article.full_content || ''
    };

    // Make HTTP request
    const response = await makeAuthenticatedRequest('/api/agents/news/ai-summary', {
      method: 'POST',
      body: JSON.stringify(requestData)
    });

    if (response.success && response.result) {
      console.log('🤖 AI summary generated successfully via HTTP');
      return response.result;
    } else {
      throw new NewsApiError('Failed to generate AI summary via HTTP', null, response);
    }
  } catch (error) {
    console.error('🤖 Error getting AI summary via HTTP:', error);
    throw error;
  }
}

/**
 * Analyze a news article with AI for structured insights
 * @param {Object} article - News article object
 * @returns {Promise<Object>} Analysis response with facts, impact, and actions
 */
export async function analyzeNewsArticle(article) {
  try {
    console.log('🔍 Requesting AI analysis via HTTP for:', article.title);

    // Prepare request data
    const requestData = {
      title: article.title || '',
      summary: article.summary || article.description || '',
      url: article.url || '',
      source: article.source || '',
      full_content: article.full_content || ''
    };

    // Make HTTP request
    const response = await makeAuthenticatedRequest('/api/agents/news/analyze', {
      method: 'POST',
      body: JSON.stringify(requestData)
    });

    if (response.success && response.result) {
      console.log('🔍 AI analysis completed successfully via HTTP');
      return response.result;
    } else {
      throw new NewsApiError('Failed to analyze article via HTTP', null, response);
    }
  } catch (error) {
    console.error('🔍 Error analyzing article via HTTP:', error);

    // Return fallback analysis on error
    return {
      success: false,
      error: error.message,
      article_title: article.title || '',
      article_url: article.url || '',
      analysis: {
        facts: ['Analysis service temporarily unavailable'],
        impact: 'Unable to provide analysis at this time',
        actions: ['Please try again later']
      },
      analyzed_at: new Date().toISOString()
    };
  }
}

/**
 * Get user accessible industries from leads table
 * @param {string} userEmail - User email to get industries for
 * @returns {Promise<Object>} Industries response with list of industries
 */
export async function getUserIndustries(userEmail) {
  try {
    console.log('🏭 Fetching user industries via HTTP for:', userEmail);

    // Make HTTP request
    const response = await makeAuthenticatedRequest('/api/agents/news/user-industries', {
      method: 'POST',
      body: JSON.stringify({
        user_email: userEmail
      })
    });

    if (response.success && response.result) {
      const result = response.result;
      if (result.success) {
        console.log('🏭 Retrieved industries via HTTP:', result.industries);
        return {
          success: true,
          industries: result.industries || [],
          count: result.count || 0,
          source: result.source || 'unknown',
          fetched_at: result.fetched_at,
          user_email: result.user_email
        };
      } else {
        throw new NewsApiError('Failed to get user industries via HTTP', null, result);
      }
    } else {
      throw new NewsApiError('Failed to call industries API via HTTP', null, response);
    }
  } catch (error) {
    console.error('🏭 Error getting user industries via HTTP:', error);

    // Return fallback industries on error
    return {
      success: false,
      error: error.message,
      industries: [
        'Technology', 'Finance', 'Healthcare', 'Manufacturing', 'Retail',
        'Real Estate', 'Education', 'Energy', 'Automotive', 'Media'
      ],
      count: 10,
      fallback: true
    };
  }
}

/**
 * Search news by keywords using Google News
 * @param {string} keywords - Search keywords
 * @param {string} category - News category (business, technology, general, etc.)
 * @param {number} limit - Maximum number of articles (default: 10)
 * @returns {Promise<Object>} News search response with articles array
 */
export async function searchNewsByKeywords(keywords, category = 'business', limit = 10) {
  try {
    console.log(`🔍 Searching news for keywords via HTTP: "${keywords}" in ${category}`);

    // Clear any related cache entries to ensure fresh results
    for (const key of newsCache.keys()) {
      if (key.includes('daily_news') || key.includes('search')) {
        newsCache.delete(key);
      }
    }

    // Prepare request data
    const requestData = {
      keywords: keywords,
      category: category,
      limit: limit
    };

    // Make HTTP request
    const response = await makeAuthenticatedRequest('/api/agents/news/search', {
      method: 'POST',
      body: JSON.stringify(requestData)
    });

    if (response.success && response.result) {
      // Format response for frontend compatibility
      const formattedResponse = {
        success: true,
        articles: response.result.articles || [],
        category: response.result.category || category,
        keywords: response.result.keywords || keywords,
        source: response.result.source || 'Google News Search',
        total: response.result.total || (response.result.articles ? response.result.articles.length : 0),
        timestamp: new Date().toISOString()
      };

      console.log(`🔍 Search completed: ${formattedResponse.articles.length} articles found`);
      return formattedResponse;
    } else {
      throw new NewsApiError('Failed to search news by keywords via HTTP', null, response);
    }
  } catch (error) {
    console.error('🔍 Error searching news by keywords via HTTP:', error);
    throw error;
  }
}

/**
 * Clear news cache
 */
export function clearNewsCache() {
  newsCache.clear();
  console.log('📰 News cache cleared');
}

export default {
  fetchDailyNews,
  fetchNewsByCategories,
  fetchTrendingNews,
  fetchFullArticle,
  getAINewsSummary,
  searchNewsByKeywords,
  clearNewsCache
};