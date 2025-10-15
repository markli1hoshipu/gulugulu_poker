import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { getAvailableTables, getPrecomputedTrends, getPrecomputedComparative, getPrecomputedOverall, getAvailableInsights, getPreGeneratedInsights } from '../services/salesDataApi';
import { useAuth } from '../auth/hooks/useAuth';

const SalesCenterContext = createContext();

const useSalesCenter = () => {
  const context = useContext(SalesCenterContext);
  if (!context) {
    throw new Error('useSalesCenter must be used within a SalesCenterProvider');
  }
  return context;
};

// Export the hook
export { useSalesCenter };

const SalesCenterProvider = ({ children }) => {
  // Authentication state
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // Cache duration (1 hour)
  const CACHE_DURATION = 60 * 60 * 1000;

  // Check if cache is valid
  const isCacheValid = (lastFetch) => {
    if (!lastFetch) return false;
    return Date.now() - lastFetch < CACHE_DURATION;
  };

  // Table management state
  const [selectedTable, setSelectedTable] = useState('');
  const [availableTables, setAvailableTables] = useState([]);
  const [tablesLoading, setTablesLoading] = useState(false);

  // Initialization state
  const [isInitialized, setIsInitialized] = useState(false);
  const [initializationError, setInitializationError] = useState(null);

  // Comparative data (unified employee, location, products, customers)
  const [comparativeData, setComparativeData] = useState(null);
  const [comparativeLoading, setComparativeLoading] = useState(false);
  const [comparativeError, setComparativeError] = useState(null);
  const [comparativeUpdatedAt, setComparativeUpdatedAt] = useState(null);

  // Overall data
  const [overallData, setOverallData] = useState(null);
  const [overallLoading, setOverallLoading] = useState(false);
  const [overallError, setOverallError] = useState(null);

  // Insights data - retrieval-based system
  const [insights, setInsights] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState('daily');
  const [selectedDate, setSelectedDate] = useState(null);
  const [availableInsights, setAvailableInsights] = useState(null);
  const [insightMetadata, setInsightMetadata] = useState(null);

  // Trends data (simplified for precomputed metrics)
  const [trendsData, setTrendsData] = useState(null);
  const [trendsUpdatedAt, setTrendsUpdatedAt] = useState(null);
  const [trendsLoading, setTrendsLoading] = useState(false);
  const [trendsError, setTrendsError] = useState(null);

  // Precomputed data timestamps for staleness indicators
  const [overallUpdatedAt, setOverallUpdatedAt] = useState(null);

  // Last fetch timestamps for cache validation
  const [comparativeLastFetch, setComparativeLastFetch] = useState(null);
  const [overallLastFetch, setOverallLastFetch] = useState(null);
  const [trendsLastFetch, setTrendsLastFetch] = useState(null);
  const [hasInitialLoad, setHasInitialLoad] = useState(false);

  // Refs to prevent multiple simultaneous requests and access current values
  const tableLoadingRef = useRef(false);
  const comparativeDataRef = useRef(comparativeData);
  const comparativeLastFetchRef = useRef(comparativeLastFetch);
  const overallDataRef = useRef(overallData);
  const overallLastFetchRef = useRef(overallLastFetch);
  const trendsDataRef = useRef(trendsData);
  const trendsLastFetchRef = useRef(trendsLastFetch);

  // Update refs when state changes
  useEffect(() => {
    comparativeDataRef.current = comparativeData;
    comparativeLastFetchRef.current = comparativeLastFetch;
    overallDataRef.current = overallData;
    overallLastFetchRef.current = overallLastFetch;
    trendsDataRef.current = trendsData;
    trendsLastFetchRef.current = trendsLastFetch;
  }, [comparativeData, comparativeLastFetch, overallData, overallLastFetch, trendsData, trendsLastFetch]);

  // Load available tables function (extracted for reusability)
  const loadAvailableTables = useCallback(async (forceRefresh = false) => {
    // Debouncing: prevent multiple simultaneous calls using ref instead of state
    if (tableLoadingRef.current && !forceRefresh) {
      console.log('⏸️ Tables already loading (ref check), skipping duplicate request');
      return;
    }

    // Set both state and ref to prevent race conditions
    tableLoadingRef.current = true;
    setTablesLoading(true);
    try {
      console.log('🔄 Loading available tables', forceRefresh ? '(FORCE REFRESH)' : '');
      const tables = await getAvailableTables();
      setAvailableTables(tables);
      // Auto-select newly uploaded table or set first available table as default
      if (tables.length > 0) {
        if (!selectedTable) {
          // No table selected, choose first available
          const firstTable = typeof tables[0] === 'string' ? tables[0] : tables[0]?.table_name || tables[0]?.name;
          if (firstTable !== selectedTable) {
            setSelectedTable(firstTable);
            console.log('📋 Auto-selected first table:', firstTable);
          }
        } else if (forceRefresh) {
          // Check if current selected table still exists
          const tableExists = tables.some(table => {
            const tableName = typeof table === 'string' ? table : table?.table_name || table?.name;
            return tableName === selectedTable;
          });
          
          if (!tableExists) {
            // Current table doesn't exist anymore, select first available
            const firstTable = typeof tables[0] === 'string' ? tables[0] : tables[0]?.table_name || tables[0]?.name;
            if (firstTable !== selectedTable) {
              setSelectedTable(firstTable);
              console.log('📋 Previous table no longer exists, selected:', firstTable);
            }
          }
        }
      }
      console.log('✅ Available tables loaded:', tables.length, 'tables');
    } catch (error) {
      console.error('Failed to load tables:', error);
      setAvailableTables([]);
      if (!selectedTable) {
        setSelectedTable('');
      }
    } finally {
      // Reset both state and ref
      tableLoadingRef.current = false;
      setTablesLoading(false);
    }
  }, [selectedTable]);

  // Reload available tables function for refresh operations
  const reloadAvailableTables = useCallback(async () => {
    return loadAvailableTables(true);
  }, [loadAvailableTables]);

  // Load available tables on mount (remove dependency to prevent loops)
  useEffect(() => {
    loadAvailableTables();
  }, []); // Empty dependency array - only run on mount

  // Load available insights metadata
  const loadAvailableInsights = useCallback(async () => {
    try {
      console.log('🔄 Loading available insights metadata...');
      const result = await getAvailableInsights();
      setAvailableInsights(result);
      console.log('✅ Available insights metadata loaded');
    } catch (error) {
      console.error('❌ Failed to load available insights:', error);
      setAvailableInsights(null);
    }
  }, []);

  // Get pre-generated insights data - retrieval-based approach
  const getPreGeneratedInsightsData = useCallback(async (
    tableName = selectedTable,
    timeframe = selectedTimeframe,
    specificDate = selectedDate
  ) => {
    if (!tableName) return;

    setInsightsLoading(true);
    setInsightsError(null);

    try {
      console.log('⚡ Getting pre-generated insights for:', tableName, 'timeframe:', timeframe, 'date:', specificDate);

      // Use the unified API function with optional date parameter
      const result = await getPreGeneratedInsights(tableName, timeframe, specificDate);

      if (result?.success && result?.insights_data) {
        // Use insights_data directly - backend returns part_1_summary and part_2_actions
        setInsights(result.insights_data);
        setInsightMetadata({
          confidence_score: result.confidence_score,
          analysis_date: result.analysis_date,
          created_at: result.created_at
        });

        console.log('✅ Pre-generated insights loaded successfully');
      } else {
        setInsights(null);
        setInsightsError('No pre-generated insights available for this selection');
      }
    } catch (error) {
      console.error('❌ Failed to get pre-generated insights:', error);
      setInsights(null);
      setInsightsError(error.message || 'Failed to retrieve insights');
    } finally {
      setInsightsLoading(false);
    }
  }, [selectedTable, selectedTimeframe, selectedDate]);

  // Load precomputed trends data - instant loading from cache
  const loadTrendsData = useCallback(async (tableName = selectedTable, forceRefresh = false) => {
    if (!tableName) return;

    // Guard 1: Already loading
    if (trendsLoading && !forceRefresh) {
      console.log('⏳ Already loading trends, skipping...');
      return;
    }

    // Guard 2: Cache valid - use refs to get current values
    const currentTrendsData = trendsDataRef.current;
    const currentLastFetch = trendsLastFetchRef.current;

    if (!forceRefresh && currentTrendsData && currentTrendsData.length > 0 && isCacheValid(currentLastFetch)) {
      console.log('✅ Using cached trends data');
      return;
    }

    // Guard 3: Recent error - prevent retry loops
    if (!forceRefresh && trendsError && trendsLastFetch && (Date.now() - trendsLastFetch < 5000)) {
      console.log('⏸️ Recent error loading trends, skipping retry...');
      return;
    }

    setTrendsLoading(true);
    setTrendsError(null);
    try {
      console.log('🔄 Loading precomputed trend data for table:', tableName);

      const result = await getPrecomputedTrends(tableName, false);
      
      if (result.success && result.data) {
        // Transform object format to array format for TrendsGrid component
        // result.data now contains the metrics object from the API

        // Define priority order for charts
        const priorityOrder = ['revenue_trend', 'profit_trend', 'avg_order_trend', 'customers_trend'];

        // Sort entries by priority order
        const sortedEntries = Object.entries(result.data).sort(([aId], [bId]) => {
          const aIndex = priorityOrder.indexOf(aId);
          const bIndex = priorityOrder.indexOf(bId);
          const aPriority = aIndex === -1 ? 999 : aIndex;
          const bPriority = bIndex === -1 ? 999 : bIndex;
          return aPriority - bPriority;
        });

        const transformedData = sortedEntries.map(([metricId, metricData]) => {
          // Access metadata from the API response metadata object
          const metadata = result.metadata?.[metricId] || {};
          
          // Transform time_period to date for frontend compatibility
          const transformedDataPoints = (metricData.data || []).map(point => ({
            ...point,
            date: point.time_period || point.date, // Convert time_period to date
            value: point.value
          }));

          return {
            id: metricId,
            title: metadata.title || metricId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            data: transformedDataPoints,
            color: metadata.color || 'blue',
            format_type: metadata.format_type || 'number',
            icon: metadata.icon || 'TrendingUp',
            description: `${transformedDataPoints.length || 0} data points`,
            table_total: transformedDataPoints.reduce((sum, point) => sum + (parseFloat(point.value) || 0), 0) || 0
          };
        });
        
        // Remove duplicates based on id
        const uniqueData = transformedData.filter((item, index, self) => 
          index === self.findIndex(t => t.id === item.id)
        );
        
        setTrendsData(uniqueData);
        setTrendsUpdatedAt(result.updatedAt);
        setTrendsLastFetch(Date.now());
        console.log('✅ Precomputed trend data loaded successfully');
        console.log('📅 Data last updated:', result.updatedAt);
        console.log('📊 Loaded', uniqueData.length, 'unique trend metrics (filtered from', transformedData.length, 'total)');
      } else {
        throw new Error('No precomputed trend data available');
      }

    } catch (error) {
      console.error('❌ Failed to load precomputed trend data:', error);
      setTrendsLastFetch(Date.now());
      setTrendsError(error.message || 'Failed to load trends data');
    } finally {
      setTrendsLoading(false);
    }
  }, [selectedTable, trendsLoading, trendsError, trendsLastFetch]);

  // Load precomputed overall data - instant loading from cache
  const loadOverallData = useCallback(async (tableName = selectedTable, forceRefresh = false) => {
    if (!tableName) return;

    // Guard 1: Already loading
    if (overallLoading && !forceRefresh) {
      console.log('⏳ Already loading overall data, skipping...');
      return;
    }

    // Guard 2: Cache valid - use refs to get current values
    const currentOverallData = overallDataRef.current;
    const currentLastFetch = overallLastFetchRef.current;

    if (!forceRefresh && currentOverallData && isCacheValid(currentLastFetch)) {
      console.log('✅ Using cached overall data');
      return;
    }

    // Guard 3: Recent error - prevent retry loops
    if (!forceRefresh && overallError && overallLastFetch && (Date.now() - overallLastFetch < 5000)) {
      console.log('⏸️ Recent error loading overall data, skipping retry...');
      return;
    }

    setOverallLoading(true);
    setOverallError(null);
    try {
      console.log('🔄 Loading precomputed overall data for table:', tableName);

      const result = await getPrecomputedOverall(tableName);

      if (result.success && result.data) {
        setOverallData(result.data);
        setOverallUpdatedAt(result.updatedAt);
        setOverallLastFetch(Date.now());
        setOverallError(null);
        console.log('✅ Precomputed overall data loaded successfully');
        console.log('📅 Data last updated:', result.updatedAt);
        console.log('📊 Overall metrics processed:', Object.keys(result.data).length);
      } else {
        throw new Error('No precomputed overall data available');
      }

    } catch (error) {
      console.error('❌ Failed to load precomputed overall data:', error);
      setOverallData(null);
      setOverallLastFetch(Date.now());
      setOverallError(error.message || 'Failed to load overall data');
    } finally {
      setOverallLoading(false);
    }
  }, [selectedTable, overallLoading, overallError, overallLastFetch]);

  // Load precomputed comparative data - unified loading for all 4 categories
  const loadComparativeData = useCallback(async (tableName = selectedTable, forceRefresh = false) => {
    if (!tableName) return;

    // Guard 1: Already loading
    if (comparativeLoading && !forceRefresh) {
      console.log('⏳ Already loading comparative data, skipping...');
      return;
    }

    // Guard 2: Cache valid - use refs to get current values
    const currentComparativeData = comparativeDataRef.current;
    const currentLastFetch = comparativeLastFetchRef.current;

    if (!forceRefresh && currentComparativeData && isCacheValid(currentLastFetch)) {
      console.log('✅ Using cached comparative data');
      return;
    }

    // Guard 3: Recent error - prevent retry loops
    if (!forceRefresh && comparativeError && comparativeLastFetch && (Date.now() - comparativeLastFetch < 5000)) {
      console.log('⏸️ Recent error loading comparative data, skipping retry...');
      return;
    }

    setComparativeLoading(true);
    setComparativeError(null);
    try {
      console.log('🔄 Loading precomputed comparative data for table:', tableName);

      const result = await getPrecomputedComparative(tableName);

      if (result.success && result.categories) {
        setComparativeData(result.categories);
        setComparativeUpdatedAt(result.updatedAt);
        setComparativeLastFetch(Date.now());
        setComparativeError(null);
        console.log('✅ Precomputed comparative data loaded successfully');
        console.log('📅 Data last updated:', result.updatedAt);
        console.log('📊 Categories processed:', Object.keys(result.categories).length);
      } else {
        throw new Error('No precomputed comparative data available');
      }

    } catch (error) {
      console.error('❌ Failed to load precomputed comparative data:', error);
      setComparativeData(null);
      setComparativeError(error.message || 'Failed to load comparative data');
      setComparativeLastFetch(Date.now());
    } finally {
      setComparativeLoading(false);
    }
  }, [selectedTable, comparativeLoading, comparativeError, comparativeLastFetch]);

  // Initialize sales center data on login - simplified like CRM
  useEffect(() => {
    if (isAuthenticated && !authLoading && selectedTable && !hasInitialLoad) {
      console.log('🚀 Sales Center: Loading initial data...');
      setIsInitialized(true);

      // Load all data in parallel for instant display
      Promise.all([
        loadComparativeData(selectedTable, false),
        loadOverallData(selectedTable, false)
      ]).then(() => {
        setHasInitialLoad(true);
        console.log('✅ Sales center initial load completed');
      }).catch(err => {
        console.error('Error loading initial sales data:', err);
        setInitializationError(err);
        setHasInitialLoad(true); // Set anyway to prevent retry loops
      });
    }
  }, [isAuthenticated, authLoading, selectedTable, hasInitialLoad, loadComparativeData, loadOverallData]);

  // Unified cache clearing function
  const clearAllSalesCenterCache = useCallback(() => {
    console.log('🗑️ Clearing all sales center caches...');

    // Clear context state
    setComparativeData(null);
    setOverallData(null);

    // Clear retrieval-based insights state
    setInsights(null);
    setInsightsError(null);
    setSelectedTimeframe('daily');
    setSelectedDate(null);
    setAvailableInsights(null);
    setInsightMetadata(null);

    setTrendsData(null);
    setTrendsUpdatedAt(null);
    setTrendsError(null);
    setComparativeUpdatedAt(null);
    setOverallError(null);

    // Clear cache timestamps
    setComparativeLastFetch(null);
    setOverallLastFetch(null);
    setTrendsLastFetch(null);

    // Reset initialization state to allow re-initialization
    setIsInitialized(false);
    setHasInitialLoad(false);

    console.log('✅ All sales center caches cleared');
  }, []);

  // Refresh functions - simplified to use load functions with forceRefresh
  const refreshOverallData = useCallback(async () => {
    await loadOverallData(selectedTable, true);
  }, [loadOverallData, selectedTable]);

  const refreshComparativeData = useCallback(async () => {
    await loadComparativeData(selectedTable, true);
  }, [loadComparativeData, selectedTable]);

  const refreshAll = useCallback(async () => {
    console.log('🔄 Refreshing all sales center data...');
    await Promise.allSettled([
      loadAvailableTables(true),
      loadComparativeData(selectedTable, true),
      loadOverallData(selectedTable, true),
      loadTrendsData(selectedTable, true)
    ]);
  }, [loadAvailableTables, loadComparativeData, loadOverallData, loadTrendsData, selectedTable]);

  // Handle table change
  const handleTableChange = useCallback(async (newTable) => {
    console.log('🔄 Changing table from', selectedTable, 'to', newTable);

    // Don't change if it's the same table
    if (selectedTable === newTable) {
      console.log('⏸️ Same table selected, skipping change');
      return;
    }

    setSelectedTable(newTable);

    // Clear all caches using unified function
    clearAllSalesCenterCache();

    console.log('✅ Table change completed');
  }, [selectedTable, clearAllSalesCenterCache]);

  const value = {
    // Table management
    selectedTable,
    availableTables,
    setAvailableTables,
    tablesLoading,
    handleTableChange,
    loadAvailableTables,
    reloadAvailableTables,

    // Comparative data (unified employee, location, products, customers)
    comparativeData,
    comparativeLoading,
    comparativeError,
    comparativeUpdatedAt,
    loadComparativeData,

    // Overall data
    overallData,
    overallLoading,
    overallError,
    loadOverallData,

    // Insights data - retrieval-based system
    insights,
    insightsLoading,
    insightsError,
    selectedTimeframe,
    selectedDate,
    availableInsights,
    insightMetadata,
    setSelectedTimeframe,
    setSelectedDate,
    loadAvailableInsights,
    getPreGeneratedInsightsData,
    
    // Trends data (precomputed)
    trendsData,
    trendsUpdatedAt,
    trendsLoading,
    trendsError,
    loadTrendsData,

    // Overall data timestamps for staleness
    overallUpdatedAt,

    // Refresh functions
    refreshComparativeData,
    refreshOverallData,
    refreshAll,

    // Cache management
    clearAllSalesCenterCache,

    // Initialization state
    isInitialized,
    initializationError,
  };

  return (
    <SalesCenterContext.Provider value={value}>
      {children}
    </SalesCenterContext.Provider>
  );
};

// Add display name for better debugging and Fast Refresh compatibility
SalesCenterProvider.displayName = 'SalesCenterProvider';

// Export the provider component
export { SalesCenterProvider }; 
