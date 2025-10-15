/**
 * Semantic Matching Service
 * Frontend service to interact with the semantic matching backend
 * Provides caching and fallback mechanisms for robust matching
 */

const SEMANTIC_MATCHING_API_URL = import.meta.env.VITE_SEMANTIC_MATCHING_API_URL || 'http://localhost:7002';

class SemanticMatchingService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.isAvailable = null;

    // Pairwise match cache: key = `${customerKey}||${employeeKey}` → { data: match, timestamp }
    this.pairCache = new Map();
  }

  /**
   * Create a stable cache key for an entity using id or sorted JSON
   */
  createEntityCacheKey(entity) {
    if (!entity) return 'null';
    // Prefer explicit ids if present
    const id = entity.id || entity.customer_id || entity.employee_id || entity.customerId || entity.employeeId;
    if (id !== undefined && id !== null) return `id:${String(id)}`;
    try {
      return `json:${JSON.stringify(entity, Object.keys(entity).sort(), 0)}`;
    } catch {
      return `json:${String(entity)}`;
    }
  }

  /**
   * Store a pairwise match in cache
   */
  setPairCache(customer, employee, match) {
    const customerKey = this.createEntityCacheKey(customer);
    const employeeKey = this.createEntityCacheKey(employee);
    const key = `${customerKey}||${employeeKey}`;
    this.pairCache.set(key, { data: match, timestamp: Date.now() });
  }

  /**
   * Get a pairwise match from cache if fresh
   */
  getPairCache(customer, employee) {
    const customerKey = this.createEntityCacheKey(customer);
    const employeeKey = this.createEntityCacheKey(employee);
    const key = `${customerKey}||${employeeKey}`;
    if (!this.pairCache.has(key)) return null;
    const cached = this.pairCache.get(key);
    if (Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    this.pairCache.delete(key);
    return null;
  }

  /**
   * Preload the model in the background
   */
  async preloadModel() {
    console.log('🚀 Starting model preload in background...');

    try {
      // Check if service is healthy first
      const isHealthy = await this.checkServiceHealth();

      if (!isHealthy) {
        console.log('📡 Semantic service not available, triggering model initialization...');

        // Make a simple test request to trigger model loading
        await fetch(`${SEMANTIC_MATCHING_API_URL}/semantic-similarity`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text1: 'preload', text2: 'initialization' })
        }).catch(() => {
          // Ignore errors during preload
          console.log('📡 Model preload request sent (errors expected during initialization)');
        });

        console.log('⏳ Model loading started in background...');
      } else {
        console.log('✅ Model already loaded and ready');
      }
    } catch (error) {
      console.log('📡 Model preload initiated despite error:', error.message);
    }
  }

  /**
   * Check if the semantic matching service is available
   */
  async checkServiceHealth() {
    try {
      const response = await fetch(`${SEMANTIC_MATCHING_API_URL}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const health = await response.json();

        // Service is healthy but model might still be loading
        if (health.status === 'healthy') {
          if (health.model_loaded) {
            this.isAvailable = true;
            return true;
          } else {
            // Model is still loading - don't cache this as permanently unavailable
            console.log('🤖 Semantic matching service is healthy but model is still loading...');
            return false;
          }
        }
      }

      this.isAvailable = false;
      return false;
    } catch (error) {
      console.warn('Semantic matching service not available:', error);
      this.isAvailable = false;
      return false;
    }
  }

  /**
   * Calculate semantic similarity between two texts
   */
  async calculateSimilarity(text1, text2) {
    const cacheKey = `${text1}|||${text2}`;

    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
      this.cache.delete(cacheKey);
    }

    try {
      if (this.isAvailable === null) {
        await this.checkServiceHealth();
      }

      if (!this.isAvailable) {
        throw new Error('Service not available');
      }

      const response = await fetch(`${SEMANTIC_MATCHING_API_URL}/semantic-similarity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text1,
          text2
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();

      // Cache the result
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      return result;
    } catch (error) {
      console.warn('Semantic similarity calculation failed:', error);
      // Fallback to simple similarity
      return this.calculateSimpleSimilarity(text1, text2);
    }
  }

  /**
   * Match customer to employees using semantic matching
   * Frontend-level sharing: caches pairwise customer-employee results and reuses them
   */
  async matchCustomerToEmployees(customer, employees) {
    try {
      if (this.isAvailable === null) {
        await this.checkServiceHealth();
      }

      if (!this.isAvailable) {
        throw new Error('Service not available');
      }

      // Split employees into cached vs missing
      const cachedMatches = [];
      const missingEmployees = [];

      for (const emp of employees) {
        const cached = this.getPairCache(customer, emp);
        if (cached) {
          cachedMatches.push(cached);
        } else {
          missingEmployees.push(emp);
        }
      }

      let freshMatches = [];
      if (missingEmployees.length > 0) {
        // Fetch only missing pairs from backend
        const response = await fetch(`${SEMANTIC_MATCHING_API_URL}/customer-employee-match`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customer, employees: missingEmployees })
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();
        freshMatches = Array.isArray(result.matches) ? result.matches : [];

        // Populate pair cache with fresh matches
        for (const match of freshMatches) {
          // match.employee is expected to be present per backend contract
          if (match && match.employee) {
            this.setPairCache(customer, match.employee, match);
          }
        }
      }

      // Combine and sort by semantic score (desc) if available, else total_score
      const combined = [...cachedMatches, ...freshMatches];
      combined.sort((a, b) => {
        const as = typeof a.semantic_score === 'number' ? a.semantic_score : (typeof a.total_score === 'number' ? a.total_score : 0);
        const bs = typeof b.semantic_score === 'number' ? b.semantic_score : (typeof b.total_score === 'number' ? b.total_score : 0);
        return bs - as;
      });

      return {
        matches: combined,
        processing_time_ms: 0
      };
    } catch (error) {
      console.warn('Semantic customer-employee matching failed:', error);
      throw error; // Let the caller handle fallback
    }
  }

  /**
   * Fallback simple similarity calculation
   */
  calculateSimpleSimilarity(text1, text2) {
    const words1 = new Set(text1.toLowerCase().split(/\W+/).filter(w => w.length > 2));
    const words2 = new Set(text2.toLowerCase().split(/\W+/).filter(w => w.length > 2));

    if (words1.size === 0 || words2.size === 0) {
      return { similarity: 0.0, confidence: 'very_low' };
    }

    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    const similarity = intersection.size / union.size;

    let confidence = 'very_low';
    if (similarity >= 0.6) confidence = 'high';
    else if (similarity >= 0.4) confidence = 'medium';
    else if (similarity >= 0.2) confidence = 'low';

    return { similarity, confidence };
  }

  /**
   * Get cache statistics
   */
  async getCacheStats() {
    try {
      const response = await fetch(`${SEMANTIC_MATCHING_API_URL}/cache/stats`);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.warn('Failed to get cache stats:', error);
    }
    return null;
  }

  /**
   * Clear the backend cache
   */
  async clearCache() {
    try {
      const response = await fetch(`${SEMANTIC_MATCHING_API_URL}/cache/clear`, {
        method: 'POST'
      });
      if (response.ok) {
        // Also clear local caches
        this.cache.clear();
        this.pairCache.clear();
        return await response.json();
      }
    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }
    return null;
  }

  /**
   * Get local cache size
   */
  getLocalCacheSize() {
    return this.cache.size + this.pairCache.size;
  }

  /**
   * Clear local cache only
   */
  clearLocalCache() {
    this.cache.clear();
    this.pairCache.clear();
  }
}

// Create singleton instance
const semanticMatchingService = new SemanticMatchingService();

export default semanticMatchingService;