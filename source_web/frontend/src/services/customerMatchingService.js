/**
 * Customer Matching Service
 * Provides AI-powered customer-to-employee matching algorithms
 * Updated to leverage semantic matching with rule-based fallback
 * Updated to leverage customers_v1_2 real sales data and industry classification
 *
 * Features:
 * - Semantic matching using sentence transformers
 * - Industry-based matching with specialized bonuses
 * - Geographic/location matching
 * - Customer value tier matching
 * - Performance-based scoring
 * - Risk assessment and health scoring
 * - Industry-specific recommendations
 */

import customerApiService from './customerApi';
import employeeApiService from './employeeApi';
import semanticMatchingService from './semanticMatchingService';
import matchingUtilsService from './matchingUtilsService';

/**
 * Generate customer matches using enhanced AI algorithm with semantic matching
 * @returns {Promise<Array>} Array of customer matches with top employee recommendations
 */
export const generateCustomerMatches = async () => {
  try {
    console.log('🚀 Starting semantic customer matching process...');

    // Test API connections first
    console.log('Testing customer API connection...');
    const customers = await customerApiService.getAllCustomers({ excludeAssigned: true });
    console.log(`Successfully fetched ${customers.length} customers`);

    console.log('Testing employee API connection...');
    const allEmployees = await employeeApiService.getAllEmployees();
    console.log(`Successfully fetched ${allEmployees.length} employees`);

    // Check semantic matching service availability with retry for model loading
    let semanticAvailable = await semanticMatchingService.checkServiceHealth();

    // If service is running but model isn't loaded yet, trigger loading and wait
    if (!semanticAvailable) {
      console.log('🤖 Semantic matching service not ready, checking if already preloading...');

      try {
        // Make a test request to trigger model loading (in case preload didn't work)
        await fetch(`${import.meta.env.VITE_SEMANTIC_MATCHING_API_URL || 'http://localhost:7002'}/semantic-similarity`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text1: 'test', text2: 'test' })
        });
      } catch (error) {
        console.log('Failed to trigger model loading:', error);
      }

      // Shorter wait since model should be preloaded
      console.log('🤖 Waiting 2 seconds for model (should be preloaded)...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      semanticAvailable = await semanticMatchingService.checkServiceHealth();

      // One final retry with shorter wait
      if (!semanticAvailable) {
        console.log('🤖 Final retry in 2 seconds...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        semanticAvailable = await semanticMatchingService.checkServiceHealth();
      }
    }

    console.log(`🤖 Semantic matching service: ${semanticAvailable ? 'Available' : 'Unavailable - using fallback'}`);

    console.log('Processing customer matches...');
    const matches = await Promise.all(customers.map(async customer => {
      let employeeScores;

      // Try semantic matching first
      if (semanticAvailable) {
        try {
          const semanticResult = await semanticMatchingService.matchCustomerToEmployees(customer, allEmployees);
          employeeScores = semanticResult.matches.map(match => ({
            employee: match.employee,
            score: match.total_score * 100, // Backend now provides total score including rule-based bonuses
            reasons: [
              `Semantic match: ${(match.semantic_score * 100).toFixed(1)}% similarity`,
              `Industry alignment: ${(match.industry_similarity * 100).toFixed(1)}%`,
              `Skills match: ${(match.skills_similarity * 100).toFixed(1)}%`,
              ...(match.rule_based_reasons || [])
            ],
            confidence: Math.min(95, Math.round(match.total_score * 100)),
            customerValue: customer.total_sales || 0,
            riskLevel: 'unknown',
            semanticScore: match.semantic_score,
            industryAlignment: match.industry_similarity,
            skillsMatch: match.skills_similarity
          }));
        } catch (error) {
          console.warn(`⚠️ Semantic matching failed for ${customer.customer_name || customer.company}, skipping customer:`, error);
          return null; // Skip this customer if semantic matching fails
        }
      } else {
        console.warn(`⚠️ Semantic matching service unavailable, skipping customer: ${customer.customer_name || customer.company}`);
        return null; // Skip this customer if service is unavailable
      }

      // Sort by score and take top 5
      const topMatches = employeeScores
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      // Get industry insights
      const industryTier = await matchingUtilsService.getIndustryTier(customer.industry);
      const industryRecommendations = await matchingUtilsService.getIndustryRecommendations(customer.industry);

      return {
        customer,
        matches: topMatches,
        customerInsights: {
          totalValue: customer.total_sales || 0,
          profitMargin: customer.total_profit && customer.total_sales && customer.total_sales > 0
            ? (customer.total_profit / customer.total_sales) : 0,
          transactionCount: customer.total_transactions || 0,
          avgSalesAmount: customer.avg_sales_amount || 0,
          lastPurchaseDate: customer.last_purchase_date || null,
          firstPurchaseDate: customer.first_purchase_date || null,
          currentMtdSales: customer.current_mtd_sales || 0,
          industry: customer.industry || 'Unknown',
          industryTier: industryTier,
          industryRecommendations: industryRecommendations
        }
      };
    })).then(matches => matches.filter(match => match !== null)); // Filter out null matches

    console.log(`Successfully generated ${matches.length} customer matches with semantic matching`);
    return matches;
  } catch (error) {
    console.error('Detailed error in customer matching:', error);
    console.error('Error stack:', error.stack);
    console.error('Error message:', error.message);
    throw new Error(`Failed to generate customer matches: ${error.message}`);
  }
};

// All matching logic moved to backend_matching service