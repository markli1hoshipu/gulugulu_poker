/**
 * Matching Utilities Service
 * Provides access to backend matching utility functions
 */

const SEMANTIC_MATCHING_API_URL = import.meta.env.VITE_SEMANTIC_MATCHING_API_URL || 'http://localhost:7002';

class MatchingUtilsService {

  /**
   * Get industry tier classification
   */
  async getIndustryTier(industry) {
    // Guard: if no industry, return sensible default without network
    if (!industry || typeof industry !== 'string' || industry.trim() === '') {
      return 'Standard';
    }

    // Prefer local heuristic to avoid 404s when endpoint is not available
    const highValueIndustries = ['Technology', 'Finance', 'Healthcare', 'Energy'];
    const mediumValueIndustries = ['Manufacturing', 'Automotive', 'Construction'];

    if (highValueIndustries.includes(industry)) return 'High-Value';
    if (mediumValueIndustries.includes(industry)) return 'Medium-Value';
    return 'Standard';
  }

  /**
   * Get industry-specific recommendations
   */
  async getIndustryRecommendations(industry) {
    // Guard: if no industry, return generic recommendations without network
    if (!industry || typeof industry !== 'string' || industry.trim() === '') {
      return ['Focus on industry-specific needs', 'Emphasize relevant experience'];
    }

    // Prefer local generic recommendations to avoid 404s when endpoint is not available
    return ['Focus on industry-specific needs', 'Emphasize relevant experience'];
  }

  /**
   * Get industry-specific keywords
   */
  async getIndustryKeywords(industry) {
    // Guard: if no industry, return a simple fallback without network
    if (!industry || typeof industry !== 'string' || industry.trim() === '') {
      return [];
    }

    try {
      const response = await fetch(`${SEMANTIC_MATCHING_API_URL}/industry-keywords/${encodeURIComponent(industry)}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const result = await response.json();
      return result.keywords;
    } catch (error) {
      console.warn('Failed to get industry keywords:', error);
      return [industry.toLowerCase()];
    }
  }

  /**
   * Format currency amount
   */
  async formatCurrency(amount) {
    try {
      const response = await fetch(`${SEMANTIC_MATCHING_API_URL}/format-currency/${amount}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const result = await response.json();
      return result.formatted;
    } catch (error) {
      console.warn('Failed to format currency:', error);
      // Fallback formatting
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount || 0);
    }
  }

  /**
   * Get required experience for customer value
   */
  async getRequiredExperienceForValue(customerValue) {
    try {
      const response = await fetch(`${SEMANTIC_MATCHING_API_URL}/required-experience/${customerValue}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const result = await response.json();
      return result.required_experience;
    } catch (error) {
      console.warn('Failed to get required experience:', error);
      // Fallback logic
      if (customerValue >= 1000000) return 8;
      if (customerValue >= 500000) return 5;
      if (customerValue >= 100000) return 3;
      if (customerValue >= 50000) return 2;
      return 1;
    }
  }
}

// Export singleton instance
const matchingUtilsService = new MatchingUtilsService();
export default matchingUtilsService;