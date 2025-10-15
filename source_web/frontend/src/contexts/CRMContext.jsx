import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { getAllCustomers, getAllEmployees } from '../data/mockData';
import { useAuth } from '../auth/hooks/useAuth';
import { databaseService } from '../services/databaseService';

const CRMContext = createContext();

const useCRM = () => {
  const context = useContext(CRMContext);
  if (!context) {
    throw new Error('useCRM must be used within a CRMProvider');
  }
  return context;
};

// Export the hook
export { useCRM };

const CRMProvider = ({ children }) => {
  // Authentication state
  const { isAuthenticated, isLoading: authLoading, authFetch, user } = useAuth();

  // CRM API base URL
  const CRM_API_BASE_URL = import.meta.env.VITE_CRM_API_URL || 'http://localhost:8003';

  // Initialization state
  const [isInitialized, setIsInitialized] = useState(false);
  const [initializationError, setInitializationError] = useState(null);
  const [hasInitialLoad, setHasInitialLoad] = useState(false); // Track if data loaded once

  // Customer data
  const [customers, setCustomers] = useState([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customersError, setCustomersError] = useState(null);
  const [customersLastFetch, setCustomersLastFetch] = useState(null);
  const [activeFilters, setActiveFilters] = useState({});

  // Use refs to access current values without adding to dependencies
  const customersRef = useRef(customers);
  const customersLastFetchRef = useRef(customersLastFetch);

  // Update refs when state changes
  useEffect(() => {
    customersRef.current = customers;
    customersLastFetchRef.current = customersLastFetch;
  }, [customers, customersLastFetch]);
  
  // Employee data
  const [employees, setEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [employeesError, setEmployeesError] = useState(null);
  const [employeesLastFetch, setEmployeesLastFetch] = useState(null);

  // Analytics insights
  const [analyticsInsights, setAnalyticsInsights] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState(null);
  const [insightsLastFetch, setInsightsLastFetch] = useState(null);
  
  // Deals data
  const [deals, setDeals] = useState([]);
  const [dealsLoading, setDealsLoading] = useState(false);
  const [dealsError, setDealsError] = useState(null);
  const [dealsLastFetch, setDealsLastFetch] = useState(null);

  // Cached summaries data
  const [cachedSummaries, setCachedSummaries] = useState({});
  const [summariesLoading, setSummariesLoading] = useState(false);
  const [summariesError, setSummariesError] = useState(null);
  const [summariesLastFetch, setSummariesLastFetch] = useState(null);

  // Cache duration (1 hour)
  const CACHE_DURATION = 60 * 60 * 1000;

  // Check if cache is valid
  const isCacheValid = (lastFetch) => {
    if (!lastFetch) return false;
    return Date.now() - lastFetch < CACHE_DURATION;
  };

  // Load customers data
  const loadCustomers = useCallback(async (forceRefresh = false, filters = {}) => {
    // Skip if already loading
    if (customersLoading && !forceRefresh) {
      console.log('⏳ Already loading customers, skipping...');
      return;
    }

    // Use cache if valid and not forcing refresh - use refs to get current values
    const currentCustomers = customersRef.current;
    const currentLastFetch = customersLastFetchRef.current;

    // Only use cache if no filters are applied
    if (!forceRefresh && !Object.keys(filters).length && currentCustomers.length > 0 && isCacheValid(currentLastFetch)) {
      console.log('✅ Using cached customers data');
      return;
    }

    console.log('🔄 Loading customers from API...');
    setCustomersLoading(true);
    setCustomersError(null);

    try {
      // Get user email for database lookup
      const userEmail = user?.email || user?.user_email;
      if (!userEmail) {
        throw new Error('User email not available');
      }

      // Build query parameters
      const queryParams = new URLSearchParams();
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.industry) queryParams.append('industry', filters.industry);
      if (filters.churn_risk) queryParams.append('churn_risk', filters.churn_risk);
      
      const queryString = queryParams.toString();
      const endpoint = queryString ? `/api/crm/customers?${queryString}` : '/api/crm/customers';

      // Use database service to make API request with correct database
      const response = await databaseService.makeAuthenticatedApiRequest(
        CRM_API_BASE_URL,
        endpoint,
        userEmail,
        authFetch
      );

      if (response.ok) {
        const data = await response.json();
        setCustomers(data);
        setCustomersLastFetch(Date.now());
        setHasInitialLoad(true);
        console.log(`✅ Loaded ${data.length} customers`);

        // Load summaries separately - don't await to avoid blocking
        loadCachedSummaries(forceRefresh).catch(err =>
          console.error('Error loading summaries:', err)
        );
      } else {
        throw new Error('Failed to fetch customers');
      }
    } catch (error) {
      console.error('Error loading customers:', error);
      setCustomersError(error.message);
      // Fallback to mock data
      setCustomers(getAllCustomers());
      setHasInitialLoad(true);
    } finally {
      setCustomersLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authFetch, CRM_API_BASE_URL, customersLoading, user]);

  // Load cached summaries data
  const loadCachedSummaries = useCallback(async (forceRefresh = false) => {
    // Skip if already loading
    if (summariesLoading && !forceRefresh) return;

    // Use cache if valid and not forcing refresh
    if (!forceRefresh && Object.keys(cachedSummaries).length > 0 && isCacheValid(summariesLastFetch)) {
      console.log('Using cached summaries data');
      return;
    }

    setSummariesLoading(true);
    setSummariesError(null);

    try {
      // Get user email for database lookup
      const userEmail = user?.email || user?.user_email;
      if (!userEmail) {
        throw new Error('User email not available');
      }

      // Fetch all cached summaries in a single batch query
      const response = await databaseService.makeAuthenticatedApiRequest(
        CRM_API_BASE_URL,
        '/api/crm/cached-summaries/batch',
        userEmail,
        authFetch
      );
      
      if (response.ok) {
        const summariesArray = await response.json();

        // Convert array to customer_id -> summary mapping
        const summariesMap = {};
        summariesArray.forEach(summary => {
          summariesMap[summary.customer_id] = summary;
        });

        setCachedSummaries(summariesMap);
        setSummariesLastFetch(Date.now());
        console.log(`Loaded ${summariesArray.length} cached summaries`);
      } else {
        throw new Error('Failed to fetch cached summaries');
      }
    } catch (error) {
      console.error('Error loading cached summaries:', error);
      setSummariesError(error.message);
      // Don't fallback to empty data - just log the error
    } finally {
      setSummariesLoading(false);
    }
  }, [authFetch, CRM_API_BASE_URL, summariesLoading, cachedSummaries, summariesLastFetch]);

  // Load employees data
  const loadEmployees = useCallback(async (forceRefresh = false) => {
    if (employeesLoading && !forceRefresh) return;
    
    if (!forceRefresh && employees.length > 0 && isCacheValid(employeesLastFetch)) {
      console.log('Using cached employees data');
      return;
    }
    
    setEmployeesLoading(true);
    setEmployeesError(null);
    
    try {
      // Get user email for database lookup
      const userEmail = user?.email || user?.user_email;
      if (!userEmail) {
        throw new Error('User email not available');
      }

      // Use database service to make API request with correct database
      const response = await databaseService.makeAuthenticatedApiRequest(
        CRM_API_BASE_URL,
        '/api/crm/employees',
        userEmail,
        authFetch
      );
      
      if (response.ok) {
        const data = await response.json();
        setEmployees(data);
        setEmployeesLastFetch(Date.now());
      } else {
        throw new Error('Failed to fetch employees');
      }
    } catch (error) {
      console.error('Error loading employees:', error);
      setEmployeesError(error.message);
      // Fallback to mock data
      setEmployees(getAllEmployees());
    } finally {
      setEmployeesLoading(false);
    }
  }, [authFetch, CRM_API_BASE_URL, employeesLoading, employees.length, employeesLastFetch]);

  // Load analytics insights
  const loadAnalyticsInsights = useCallback(async (forceRefresh = false) => {
    if (insightsLoading && !forceRefresh) return;
    
    if (!forceRefresh && analyticsInsights && isCacheValid(insightsLastFetch)) {
      console.log('Using cached analytics insights');
      return;
    }
    
    setInsightsLoading(true);
    setInsightsError(null);
    
    try {
      const response = await authFetch(`${CRM_API_BASE_URL}/api/crm/generate-analytics-insights`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      if (response.ok) {
        setAnalyticsInsights(data.insights);
        setInsightsLastFetch(Date.now());
      } else {
        throw new Error('Failed to generate insights');
      }
    } catch (error) {
      console.error('Error loading insights:', error);
      setInsightsError(error.message);
    } finally {
      setInsightsLoading(false);
    }
  }, [authFetch, CRM_API_BASE_URL, insightsLoading, analyticsInsights, insightsLastFetch]);

  // Load deals data
  const loadDeals = useCallback(async (forceRefresh = false) => {
    // Prevent multiple concurrent loads
    if (dealsLoading && !forceRefresh) {
      console.log('Already loading deals, skipping...');
      return;
    }
    
    // Use cache if valid
    if (!forceRefresh && deals.length > 0 && isCacheValid(dealsLastFetch)) {
      console.log('Using cached deals data');
      return;
    }
    
    // Check if we recently had an error (prevent retry loops)
    if (!forceRefresh && dealsError && dealsLastFetch && (Date.now() - dealsLastFetch < 5000)) {
      console.log('Recent error loading deals, skipping retry...');
      return;
    }
    
    setDealsLoading(true);
    setDealsError(null);
    
    try {
      // Get user email for database lookup
      const userEmail = user?.email || user?.user_email;
      if (!userEmail) {
        throw new Error('User email not available');
      }

      // Use database service to make API request with correct database
      const response = await databaseService.makeAuthenticatedApiRequest(
        CRM_API_BASE_URL,
        '/api/crm/deals',
        userEmail,
        authFetch
      );
      
      if (response.ok) {
        const data = await response.json();
        setDeals(data);
        setDealsLastFetch(Date.now());
        setDealsError(null);
      } else if (response.status === 403 || response.status === 401) {
        // Authentication issues - don't retry
        console.warn('Authentication issue loading deals:', response.status);
        setDealsError('Authentication required');
        setDealsLastFetch(Date.now()); // Set timestamp to prevent immediate retry
        setDeals([]);
      } else {
        throw new Error(`Failed to fetch deals: ${response.status}`);
      }
    } catch (error) {
      console.error('Error loading deals:', error);
      setDealsError(error.message);
      setDealsLastFetch(Date.now()); // Set timestamp to prevent immediate retry
      // Keep empty deals array on error
      setDeals([]);
    } finally {
      setDealsLoading(false);
    }
  }, [authFetch, CRM_API_BASE_URL, dealsLoading, deals.length, dealsLastFetch, dealsError]);

  // Initialize CRM data on login
  const initializeOnLogin = useCallback(async () => {
    if (isInitialized) return;

    console.log('🚀 CRM Context initialized and ready');
    setInitializationError(null);
    setIsInitialized(true);
  }, [isInitialized]);

  // Mark as initialized when authenticated and load initial data once
  useEffect(() => {
    if (isAuthenticated && !authLoading && !hasInitialLoad) {
      console.log('🚀 CRM Context: Loading initial CRM data (customers + deals)...');
      setIsInitialized(true);
      // Load both customers and deals in parallel for instant tab switching
      Promise.all([
        loadCustomers(false),
        loadDeals(false)
      ]).catch(err => {
        console.error('Error loading initial CRM data:', err);
      });
    }
  }, [isAuthenticated, authLoading, hasInitialLoad, loadCustomers, loadDeals]);

  // Add/Update customer
  const addCustomer = useCallback(async (customerData) => {
    try {
      const response = await authFetch(`${CRM_API_BASE_URL}/api/crm/customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(customerData),
      });

      if (response.ok) {
        const newCustomer = await response.json();
        setCustomers(prev => [newCustomer, ...prev]);
        return { success: true, customer: newCustomer };
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add customer');
      }
    } catch (error) {
      console.error('Error adding customer:', error);
      return { success: false, error: error.message };
    }
  }, [authFetch, CRM_API_BASE_URL]);

  // Delete customer
  const deleteCustomer = useCallback(async (customerId) => {
    try {
      const response = await authFetch(`${CRM_API_BASE_URL}/api/crm/customers/${customerId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        // Remove customer from local state
        setCustomers(prev => prev.filter(customer => customer.id !== customerId));
        return { success: true, message: result.message };
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to delete customer');
      }
    } catch (error) {
      console.error('Error deleting customer:', error);
      return { success: false, error: error.message };
    }
  }, [authFetch, CRM_API_BASE_URL]);

  // Update customer function
  const updateCustomer = useCallback((updatedCustomer) => {
    setCustomers(prev => 
      prev.map(customer => 
        customer.id === updatedCustomer.id ? updatedCustomer : customer
      )
    );
  }, []);

  // Update deal function
  const updateDeal = useCallback((updatedDeal) => {
    setDeals(prev =>
      prev.map(deal =>
        deal.deal_id === updatedDeal.deal_id ? updatedDeal : deal
      )
    );
  }, []);

  // Delete deal function
  const deleteDeal = useCallback(async (dealId) => {
    try {
      const response = await authFetch(`${CRM_API_BASE_URL}/api/crm/deals/${dealId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const result = await response.json();
        // Remove deal from local state immediately
        setDeals(prev => prev.filter(deal => deal.deal_id !== dealId));
        return { success: true, message: result.message };
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to delete deal');
      }
    } catch (error) {
      console.error('Error deleting deal:', error);
      return { success: false, error: error.message };
    }
  }, [authFetch, CRM_API_BASE_URL]);

  // Search and filter customers
  const searchAndFilterCustomers = useCallback(async (filters = {}) => {
    setActiveFilters(filters);
    return loadCustomers(true, filters);
  }, [loadCustomers]);

  // Clear filters and reload all customers
  const clearFilters = useCallback(async () => {
    setActiveFilters({});
    return loadCustomers(true, {});
  }, [loadCustomers]);

  // Refresh functions
  const refreshCustomers = useCallback(() => loadCustomers(true, activeFilters), [loadCustomers, activeFilters]);
  const refreshEmployees = useCallback(() => loadEmployees(true), [loadEmployees]);
  const refreshAnalytics = useCallback(() => loadAnalyticsInsights(true), [loadAnalyticsInsights]);
  const refreshDeals = useCallback(() => loadDeals(true), [loadDeals]);
  const refreshCachedSummaries = useCallback(() => loadCachedSummaries(true), [loadCachedSummaries]);

  const refreshAll = useCallback(async () => {
    console.log('🔄 Refreshing all CRM data...');
    await Promise.allSettled([
      loadCustomers(true),
      loadEmployees(true),
      loadAnalyticsInsights(true),
      loadDeals(true),
      loadCachedSummaries(true)
    ]);
  }, [loadCustomers, loadEmployees, loadAnalyticsInsights, loadDeals, loadCachedSummaries]);

  // Clear all caches
  const clearCache = useCallback(() => {
    console.log('🗑️ Clearing CRM cache...');
    setCustomersLastFetch(null);
    setEmployeesLastFetch(null);
    setInsightsLastFetch(null);
    setDealsLastFetch(null);
    setSummariesLastFetch(null);
    setIsInitialized(false);
  }, []);

  const value = {
    // Customer data
    customers,
    customersLoading,
    customersError,
    loadCustomers,
    refreshCustomers,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    searchAndFilterCustomers,
    clearFilters,
    activeFilters,
    setCustomers,  // Export setter for optimistic updates

    // Cached summaries data
    cachedSummaries,
    summariesLoading,
    summariesError,
    loadCachedSummaries,
    refreshCachedSummaries,

    // Employee data
    employees,
    employeesLoading,
    employeesError,
    loadEmployees,
    refreshEmployees,

    // Analytics
    analyticsInsights,
    insightsLoading,
    insightsError,
    loadAnalyticsInsights,
    refreshAnalytics,

    // Deals data
    deals,
    dealsLoading,
    dealsError,
    loadDeals,
    refreshDeals,
    updateDeal,
    deleteDeal,
    setDeals,  // Export setter for optimistic updates

    // Utilities
    refreshAll,
    clearCache,
    isInitialized,
    initializationError,

    // API URL for components that need it
    CRM_API_BASE_URL,
    authFetch
  };

  return (
    <CRMContext.Provider value={value}>
      {children}
    </CRMContext.Provider>
  );
};

// Add display name for better debugging
CRMProvider.displayName = 'CRMProvider';

// Export the provider component
export { CRMProvider };