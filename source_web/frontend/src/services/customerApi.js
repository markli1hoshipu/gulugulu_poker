/**
 * Customer API Service for customers_v1_2 table
 * Provides methods to interact with the customer management backend
 */

const CUSTOMER_API_BASE_URL = import.meta.env.VITE_EMPLOYEE_API_URL || 'http://localhost:7001';

class CustomerApiError extends Error {
  constructor(message, status = null, data = null) {
    super(message);
    this.name = 'CustomerApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Handle API response and error cases
 * @param {Response} response - Fetch response object
 * @returns {Promise<any>} Parsed response data
 */
async function handleApiResponse(response) {
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

    try {
      const errorData = await response.json();
      if (errorData.detail) {
        errorMessage = errorData.detail;
      }
      throw new CustomerApiError(errorMessage, response.status, errorData);
    } catch (parseError) {
      if (parseError instanceof CustomerApiError) {
        throw parseError;
      }
      throw new CustomerApiError(errorMessage, response.status);
    }
  }

  try {
    return await response.json();
  } catch {
    throw new CustomerApiError('Failed to parse response JSON', response.status);
  }
}

/**
 * Transform API customer data from customers_v1_2 to frontend format
 * @param {Object} apiCustomer - Customer data from API
 * @returns {Object} Transformed customer data
 */
function transformCustomerData(apiCustomer) {
  return {
    ...apiCustomer,
    // Map customers_v1_2 fields to frontend expected format
    // Core fields
    id: apiCustomer.id,
    customerCode: apiCustomer.customer_code,
    customerName: apiCustomer.customer_name,

    // Frontend compatibility mappings using computed properties
    company: apiCustomer.company || apiCustomer.customer_name,
    primaryContact: apiCustomer.primarycontact || `Contact at ${apiCustomer.customer_name}`,
    title: apiCustomer.title || null,
    email: apiCustomer.cleaned_email || apiCustomer.email,
    phone: apiCustomer.phone || null,

    // Location data
    country: apiCustomer.country,
    provinceState: apiCustomer.province_state,
    city: apiCustomer.city,
    address: apiCustomer.address,
    postalCode: apiCustomer.postal_code,

    // Business classification
    industry: apiCustomer.industry,
    category: apiCustomer.category,
    tier: apiCustomer.tier,
    status: apiCustomer.status,

    // Financial metrics
    totalSales: apiCustomer.total_sales,
    totalProfit: apiCustomer.total_profit,
    avgSalesAmount: apiCustomer.avg_sales_amount,
    contractValue: apiCustomer.contractvalue || apiCustomer.total_sales,
    monthlyValue: apiCustomer.monthlyvalue,

    // Customer behavior
    totalTransactions: apiCustomer.total_transactions,
    firstPurchaseDate: apiCustomer.first_purchase_date,
    lastPurchaseDate: apiCustomer.last_purchase_date,

    // Current metrics
    currentMtdSales: apiCustomer.current_mtd_sales,
    current12MonthAvg: apiCustomer.current_12_month_avg,

    // Computed/derived fields for frontend compatibility
    healthScore: apiCustomer.healthscore,
    renewalDate: apiCustomer.renewaldate,
    lastInteraction: apiCustomer.lastinteraction,
    totalInteractions: apiCustomer.totalinteractions,
    supportTickets: apiCustomer.supporttickets,
    productUsage: apiCustomer.productusage,
    expansionPotential: apiCustomer.expansionpotential,
    assignedEmployeeId: apiCustomer.assignedemployeeid,
    churnRisk: apiCustomer.churnrisk,
    satisfactionScore: apiCustomer.satisfactionscore,
    onboardingComplete: apiCustomer.onboardingcomplete,
    tags: apiCustomer.tags,
    recentActivities: apiCustomer.recentactivities,
    predictiveInsights: apiCustomer.predictiveinsights,
    timeline: apiCustomer.timeline,

    // Timestamps
    createdAt: apiCustomer.created_at,
    updatedAt: apiCustomer.updated_at
  };
}

/**
 * Transform frontend customer data to API format for customers_v1_2
 * @param {Object} frontendCustomer - Customer data from frontend
 * @returns {Object} Transformed customer data for API
 */
function transformCustomerForApi(frontendCustomer) {
  return {
    // Core customers_v1_2 fields
    customer_code: frontendCustomer.customerCode || frontendCustomer.customer_code,
    customer_name: frontendCustomer.customerName || frontendCustomer.customer_name || frontendCustomer.company,
    email: frontendCustomer.email,

    // Location data
    country: frontendCustomer.country,
    province_state: frontendCustomer.provinceState || frontendCustomer.province_state,
    city: frontendCustomer.city,
    address: frontendCustomer.address,
    postal_code: frontendCustomer.postalCode || frontendCustomer.postal_code,

    // Business classification
    industry: frontendCustomer.industry,
    category: frontendCustomer.category,

    // Financial metrics
    total_sales: frontendCustomer.totalSales || frontendCustomer.total_sales || frontendCustomer.contractValue,
    total_profit: frontendCustomer.totalProfit || frontendCustomer.total_profit,
    avg_sales_amount: frontendCustomer.avgSalesAmount || frontendCustomer.avg_sales_amount,

    // Customer behavior
    total_transactions: frontendCustomer.totalTransactions || frontendCustomer.total_transactions,
    first_purchase_date: frontendCustomer.firstPurchaseDate || frontendCustomer.first_purchase_date,
    last_purchase_date: frontendCustomer.lastPurchaseDate || frontendCustomer.last_purchase_date,

    // Current metrics
    current_mtd_sales: frontendCustomer.currentMtdSales || frontendCustomer.current_mtd_sales,
    current_12_month_avg: frontendCustomer.current12MonthAvg || frontendCustomer.current_12_month_avg
  };
}

class CustomerApiService {
  constructor() {
    // Cache for customer data to prevent frequent reloads
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache timeout
  }

  /**
   * Get cached data or fetch from API
   * @param {string} key - Cache key
   * @param {Function} fetchFunction - Function to fetch data if not cached
   * @returns {Promise<any>} Cached or fresh data
   */
  async getCachedData(key, fetchFunction) {
    const cached = this.cache.get(key);
    const now = Date.now();

    // Return cached data if still valid
    if (cached && (now - cached.timestamp) < this.cacheTimeout) {
      console.log(`📦 Using cached CRM data for: ${key}`);
      return cached.data;
    }

    try {
      // Fetch fresh data
      const data = await fetchFunction();
      
      // Cache the result
      this.cache.set(key, { 
        data, 
        timestamp: now 
      });
      
      console.log(`🔄 Cached fresh CRM data for: ${key}`);
      return data;
    } catch (error) {
      // If fetch fails and we have stale cached data, return it
      if (cached) {
        console.warn(`⚠️ API failed, using stale CRM cache for: ${key}`);
        return cached.data;
      }
      throw error;
    }
  }

  /**
   * Clear all cached data
   */
  clearCache() {
    this.cache.clear();
    console.log('🗑️ CRM cache cleared');
  }

  /**
   * Clear specific cache entry
   * @param {string} key - Cache key to clear
   */
  clearCacheEntry(key) {
    this.cache.delete(key);
    console.log(`🗑️ Cleared CRM cache entry: ${key}`);
  }

  /**
   * Invalidate cache entries that might be affected by a data change
   * @param {string|number} customerId - Customer ID that was modified
   */
  invalidateCustomerCache(customerId = null) {
    const keysToDelete = [];
    
    for (const key of this.cache.keys()) {
      // Invalidate all customers list cache
      if (key.startsWith('customers_') || key === 'all_customers') {
        keysToDelete.push(key);
      }
      // Invalidate specific customer cache if ID provided
      if (customerId && key === `customer_${customerId}`) {
        keysToDelete.push(key);
      }
      // Invalidate metrics cache as customer changes affect metrics
      if (key === 'customer_metrics' || key === 'industry_statistics') {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.clearCacheEntry(key));
  }
  /**
   * Get all customers with optional filtering
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} List of customers
   */
  async getAllCustomers(filters = {}) {
    // Create cache key based on filters
    const filterKey = Object.keys(filters).length > 0 ? 
      `customers_${JSON.stringify(filters)}` : 
      'all_customers';

    return this.getCachedData(filterKey, async () => {
      const params = new URLSearchParams();

      if (filters.company) params.append('company', filters.company);
      if (filters.industry) params.append('industry', filters.industry);
      if (filters.tier) params.append('tier', filters.tier);
      if (filters.status) params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);
      if (filters.assignedEmployeeId) params.append('assigned_employee', filters.assignedEmployeeId);
      if (filters.churnRisk) params.append('churn_risk', filters.churnRisk);
      if (filters.excludeAssigned) params.append('exclude_assigned', 'true');

      const queryString = params.toString();
      const url = `${CUSTOMER_API_BASE_URL}/api/customers${queryString ? `?${queryString}` : ''}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const customers = await handleApiResponse(response);
      return customers.map(transformCustomerData);
    });
  }

  /**
   * Get customer by ID
   * @param {number} id - Customer ID
   * @returns {Promise<Object>} Customer data
   */
  async getCustomerById(id) {
    const cacheKey = `customer_${id}`;

    return this.getCachedData(cacheKey, async () => {
      const response = await fetch(`${CUSTOMER_API_BASE_URL}/api/customers/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const customer = await handleApiResponse(response);
      return transformCustomerData(customer);
    });
  }

  /**
   * Create a new customer
   * @param {Object} customer - Customer data
   * @returns {Promise<Object>} Created customer data
   */
  async createCustomer(customer) {
    const apiCustomer = transformCustomerForApi(customer);

    const response = await fetch(`${CUSTOMER_API_BASE_URL}/api/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(apiCustomer),
    });

    const createdCustomer = await handleApiResponse(response);
    const transformedCustomer = transformCustomerData(createdCustomer);
    
    // Invalidate cache since we added a new customer
    this.invalidateCustomerCache();
    
    return transformedCustomer;
  }

  /**
   * Update an existing customer
   * @param {number} id - Customer ID
   * @param {Object} customer - Updated customer data
   * @returns {Promise<Object>} Updated customer data
   */
  async updateCustomer(id, customer) {
    const apiCustomer = transformCustomerForApi(customer);

    const response = await fetch(`${CUSTOMER_API_BASE_URL}/api/customers/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(apiCustomer),
    });

    const updatedCustomer = await handleApiResponse(response);
    const transformedCustomer = transformCustomerData(updatedCustomer);
    
    // Invalidate cache for this specific customer and related data
    this.invalidateCustomerCache(id);
    
    return transformedCustomer;
  }

  /**
   * Delete a customer
   * @param {number} id - Customer ID
   * @returns {Promise<Object>} Deletion result
   */
  async deleteCustomer(id) {
    const response = await fetch(`${CUSTOMER_API_BASE_URL}/api/customers/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await handleApiResponse(response);
    
    // Invalidate cache for this specific customer and related data
    this.invalidateCustomerCache(id);
    
    return result;
  }

  /**
   * Get customer metrics
   * @returns {Promise<Object>} Customer metrics
   */
  async getCustomerMetrics() {
    const cacheKey = 'customer_metrics';

    return this.getCachedData(cacheKey, async () => {
      const response = await fetch(`${CUSTOMER_API_BASE_URL}/api/customers/metrics/summary`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      return await handleApiResponse(response);
    });
  }

  /**
   * Get customers by employee
   * @param {number} employeeId - Employee ID
   * @returns {Promise<Array>} List of customers
   */
  async getCustomersByEmployee(employeeId) {
    const cacheKey = `customers_employee_${employeeId}`;

    return this.getCachedData(cacheKey, async () => {
      const response = await fetch(`${CUSTOMER_API_BASE_URL}/api/customers/by-employee/${employeeId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const customers = await handleApiResponse(response);
      return customers.map(transformCustomerData);
    });
  }

  /**
   * Get leads by employee
   * @param {number} employeeId - Employee ID
   * @returns {Promise<Array>} List of leads
   */
  async getLeadsByEmployee(employeeId) {
    const cacheKey = `leads_employee_${employeeId}`;

    return this.getCachedData(cacheKey, async () => {
      const response = await fetch(`${CUSTOMER_API_BASE_URL}/api/customers/leads/by-employee/${employeeId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const leads = await handleApiResponse(response);
      return leads.map(transformCustomerData);
    });
  }

  /**
   * Search customers
   * @param {string} searchTerm - Search term
   * @returns {Promise<Array>} List of matching customers
   */
  async searchCustomers(searchTerm) {
    return this.getAllCustomers({ search: searchTerm });
  }

  /**
   * Get customers by filter criteria
   * @param {Object} criteria - Filter criteria
   * @returns {Promise<Array>} List of filtered customers
   */
  async getCustomersByFilter(criteria) {
    return this.getAllCustomers(criteria);
  }

  /**
   * Get customers by industry
   * @param {string} industry - Industry name
   * @returns {Promise<Array>} List of customers in the specified industry
   */
  async getCustomersByIndustry(industry) {
    return this.getAllCustomers({ industry });
  }

  /**
   * Get all unique industries from customers
   * @returns {Promise<Array>} List of unique industry names
   */
  async getIndustries() {
    const response = await fetch(`${CUSTOMER_API_BASE_URL}/api/customers/industries`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return await handleApiResponse(response);
  }

  /**
   * Get industry statistics
   * @returns {Promise<Object>} Industry statistics including customer counts and revenue by industry
   */
  async getIndustryStatistics() {
    const cacheKey = 'industry_statistics';

    return this.getCachedData(cacheKey, async () => {
      const response = await fetch(`${CUSTOMER_API_BASE_URL}/api/customers/industries/statistics`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      return await handleApiResponse(response);
    });
  }

  /**
   * Get customers by multiple industries
   * @param {Array<string>} industries - Array of industry names
   * @returns {Promise<Array>} List of customers in the specified industries
   */
  async getCustomersByIndustries(industries) {
    const params = new URLSearchParams();
    industries.forEach(industry => params.append('industry', industry));

    const url = `${CUSTOMER_API_BASE_URL}/api/customers?${params.toString()}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const customers = await handleApiResponse(response);
    return customers.map(transformCustomerData);
  }

  /**
   * Update customer industry
   * @param {number} id - Customer ID
   * @param {string} industry - New industry
   * @returns {Promise<Object>} Updated customer data
   */
  async updateCustomerIndustry(id, industry) {
    const response = await fetch(`${CUSTOMER_API_BASE_URL}/api/customers/${id}/industry`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ industry }),
    });

    const updatedCustomer = await handleApiResponse(response);
    return transformCustomerData(updatedCustomer);
  }

  /**
   * Assign a customer to an employee using names
   * @param {string} customerName - Customer name
   * @param {string} employeeName - Employee name
   * @param {number} matchedScore - Match score percentage
   * @param {string} notes - Optional assignment notes
   * @param {string} clientType - Client type ('customer' or 'lead')
   * @returns {Promise<Object>} Assignment result
   */
  async assignCustomerToEmployee(customerName, employeeName, matchedScore, notes = null, clientType = 'customer') {
    const response = await fetch(`${CUSTOMER_API_BASE_URL}/api/customers/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customer_name: customerName,
        employee_name: employeeName,
        matched_score: matchedScore,
        notes: notes,
        client_type: clientType
      }),
    });

    const result = await handleApiResponse(response);
    
    // Invalidate all customer and employee-related cache since assignments changed
    this.invalidateCustomerCache();
    
    return result;
  }

  /**
   * Assign a customer to an employee using IDs
   * @param {number} customerId - Customer ID
   * @param {number} employeeId - Employee ID
   * @param {number} matchedScore - Match score percentage
   * @param {string} notes - Optional assignment notes
   * @param {string} clientType - Client type ('customer' or 'lead')
   * @returns {Promise<Object>} Assignment result
   */
  async assignCustomerToEmployeeByIds(customerId, employeeId, matchedScore, notes = null, clientType = 'customer') {
    const response = await fetch(`${CUSTOMER_API_BASE_URL}/api/customers/assign-by-ids`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customer_id: customerId,
        employee_id: employeeId,
        matched_score: matchedScore,
        notes: notes,
        client_type: clientType
      }),
    });

    const result = await handleApiResponse(response);
    
    // Invalidate all customer and employee-related cache since assignments changed
    this.invalidateCustomerCache(customerId);
    // Also clear employee-specific cache entries
    this.clearCacheEntry(`customers_employee_${employeeId}`);
    this.clearCacheEntry(`leads_employee_${employeeId}`);
    
    return result;
  }
}

// Export singleton instance
const customerApiService = new CustomerApiService();
export default customerApiService;

// Export error class for external use
export { CustomerApiError };