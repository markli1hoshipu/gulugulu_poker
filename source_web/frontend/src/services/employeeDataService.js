/**
 * Employee Data Service with Caching
 * 
 * This service implements caching for employee data to reduce API calls and improve performance.
 * It follows the same pattern as other caching services in the application.
 */

import employeeApiService from './employeeApi';

class EmployeeDataService {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 15 * 60 * 1000; // 15 minutes
        this.maxCacheSize = 50; // Maximum number of cached items
        
        // Different cache timeouts for different data types
        this.cacheDurations = {
            EMPLOYEE_BASIC: 30 * 60 * 1000,      // 30 minutes
            EMPLOYEE_PERFORMANCE: 60 * 60 * 1000, // 1 hour  
            EMPLOYEE_FEEDBACK: 15 * 60 * 1000,    // 15 minutes
            CUSTOMER_DATA: 10 * 60 * 1000         // 10 minutes
        };
        
        // Track cache hits and misses for monitoring
        this.metrics = {
            hits: 0,
            misses: 0,
            totalRequests: 0
        };
    }
    
    /**
     * Generate cache key from query parameters
     */
    _generateCacheKey(method, params = {}) {
        const sortedParams = Object.keys(params)
            .sort()
            .map(key => `${key}:${JSON.stringify(params[key])}`)
            .join('|');
        return `${method}_${btoa(sortedParams).replace(/[^a-zA-Z0-9]/g, '')}`;
    }
    
    /**
     * Get cached result if available and not expired
     */
    _getCachedResult(cacheKey, customTimeout = null) {
        const cached = this.cache.get(cacheKey);
        const timeout = customTimeout || this.cacheTimeout;
        
        if (cached && Date.now() - cached.timestamp < timeout) {
            this.metrics.hits++;
            console.log(`📊 Cache hit for ${cacheKey}`);
            return cached.data;
        }
        
        if (cached) {
            this.cache.delete(cacheKey); // Remove expired cache
        }
        
        this.metrics.misses++;
        return null;
    }
    
    /**
     * Set cache for query result
     */
    _setCachedResult(cacheKey, data, customTimeout = null) {
        // Clean up old cache entries if we're at max size
        if (this.cache.size >= this.maxCacheSize) {
            const oldestKey = this.cache.keys().next().value;
            this.cache.delete(oldestKey);
        }
        
        this.cache.set(cacheKey, {
            data,
            timestamp: Date.now(),
            timeout: customTimeout || this.cacheTimeout
        });
        
        console.log(`💾 Cached result for ${cacheKey}`);
    }
    
    /**
     * Get all employees with full data using the new batch API
     */
    async getAllEmployeesWithFullData(params = {}, forceRefresh = false) {
        this.metrics.totalRequests++;
        
        const cacheKey = this._generateCacheKey('employees_full_data', params);
        
        // Check cache first
        if (!forceRefresh) {
            const cached = this._getCachedResult(cacheKey, this.cacheDurations.EMPLOYEE_BASIC);
            if (cached) {
                return cached;
            }
        }
        
        try {
            // Use the new batch API endpoint
            const response = await fetch(`${employeeApiService.baseUrl}/api/employees/batch/full-data`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    employee_ids: params.employee_ids || null,
                    department: params.department || null,
                    search: params.search || null,
                    include_performance: params.include_performance !== false,
                    include_feedback: params.include_feedback !== false,
                    include_customers: params.include_customers !== false
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Cache the result
            this._setCachedResult(cacheKey, data, this.cacheDurations.EMPLOYEE_BASIC);
            
            console.log(`✅ Loaded ${data.employees.length} employees with full data (batch API)`);
            
            return data;
            
        } catch (error) {
            console.error('Batch API failed, falling back to individual calls:', error);
            
            // Fallback to individual API calls
            return this._fallbackToIndividualCalls(params);
        }
    }
    
    /**
     * Fallback method when batch API fails
     */
    async _fallbackToIndividualCalls(params = {}) {
        try {
            const employees = await employeeApiService.getAllEmployeesWithPerformanceAndFeedback(params);
            
            // Transform to match batch API response format
            const transformedData = {
                employees: employees.map(emp => ({
                    employee: emp,
                    performance: emp.performance || null,
                    feedback_summary: emp.feedback_summary || null,
                    customer_count: emp.customer_count || 0,
                    lead_count: emp.lead_count || 0
                })),
                total_count: employees.length,
                performance_metrics: {},
                query_info: {
                    query_type: "fallback_individual_calls",
                    fallback_reason: "batch_api_unavailable"
                }
            };
            
            return transformedData;
            
        } catch (fallbackError) {
            console.error('Fallback API calls also failed:', fallbackError);
            throw fallbackError;
        }
    }
    
    /**
     * Get employee by ID with caching
     */
    async getEmployeeById(employeeId, forceRefresh = false) {
        this.metrics.totalRequests++;
        
        const cacheKey = this._generateCacheKey('employee_by_id', { id: employeeId });
        
        if (!forceRefresh) {
            const cached = this._getCachedResult(cacheKey, this.cacheDurations.EMPLOYEE_BASIC);
            if (cached) {
                return cached;
            }
        }
        
        try {
            const employee = await employeeApiService.getEmployeeById(employeeId);
            this._setCachedResult(cacheKey, employee, this.cacheDurations.EMPLOYEE_BASIC);
            return employee;
            
        } catch (error) {
            console.error(`Error fetching employee ${employeeId}:`, error);
            throw error;
        }
    }
    
    /**
     * Get employee performance with caching
     */
    async getEmployeePerformance(employeeId, forceRefresh = false) {
        this.metrics.totalRequests++;
        
        const cacheKey = this._generateCacheKey('employee_performance', { id: employeeId });
        
        if (!forceRefresh) {
            const cached = this._getCachedResult(cacheKey, this.cacheDurations.EMPLOYEE_PERFORMANCE);
            if (cached) {
                return cached;
            }
        }
        
        try {
            const performance = await employeeApiService.getEmployeePerformance(employeeId);
            this._setCachedResult(cacheKey, performance, this.cacheDurations.EMPLOYEE_PERFORMANCE);
            return performance;
            
        } catch (error) {
            console.error(`Error fetching performance for employee ${employeeId}:`, error);
            throw error;
        }
    }
    
    /**
     * Get customers and leads for employee with caching
     */
    async getEmployeeCustomersAndLeads(employeeId, forceRefresh = false) {
        this.metrics.totalRequests++;
        
        const cacheKey = this._generateCacheKey('employee_customers_leads', { id: employeeId });
        
        if (!forceRefresh) {
            const cached = this._getCachedResult(cacheKey, this.cacheDurations.CUSTOMER_DATA);
            if (cached) {
                return cached;
            }
        }
        
        try {
            const [customers, leads] = await Promise.all([
                employeeApiService.getCustomersByEmployee(employeeId),
                employeeApiService.getLeadsByEmployee(employeeId)
            ]);
            
            const result = { customers, leads };
            this._setCachedResult(cacheKey, result, this.cacheDurations.CUSTOMER_DATA);
            return result;
            
        } catch (error) {
            console.error(`Error fetching customers/leads for employee ${employeeId}:`, error);
            throw error;
        }
    }
    
    /**
     * Invalidate cache for specific employee
     */
    invalidateEmployeeCache(employeeId) {
        const keysToDelete = [];
        
        for (const [key, _value] of this.cache.entries()) {
            if (key.includes(`id:${employeeId}`) || key.includes('employees_full_data')) {
                keysToDelete.push(key);
            }
        }
        
        keysToDelete.forEach(key => {
            this.cache.delete(key);
            console.log(`🗑️ Invalidated cache for ${key}`);
        });
    }
    
    /**
     * Clear all cache
     */
    clearCache() {
        this.cache.clear();
        console.log('🗑️ Employee data cache cleared');
    }
    
    /**
     * Clear expired cache entries
     */
    cleanupExpiredCache() {
        const now = Date.now();
        const keysToDelete = [];
        
        for (const [key, value] of this.cache.entries()) {
            const timeout = value.timeout || this.cacheTimeout;
            if (now - value.timestamp > timeout) {
                keysToDelete.push(key);
            }
        }
        
        keysToDelete.forEach(key => this.cache.delete(key));
        
        if (keysToDelete.length > 0) {
            console.log(`🧹 Cleaned up ${keysToDelete.length} expired cache entries`);
        }
    }
    
    /**
     * Get cache statistics
     */
    getCacheStats() {
        const hitRate = this.metrics.totalRequests > 0 
            ? (this.metrics.hits / this.metrics.totalRequests * 100).toFixed(1)
            : 0;
            
        return {
            cacheSize: this.cache.size,
            maxSize: this.maxCacheSize,
            totalRequests: this.metrics.totalRequests,
            cacheHits: this.metrics.hits,
            cacheMisses: this.metrics.misses,
            hitRate: `${hitRate}%`,
            memoryUsage: this._estimateCacheMemoryUsage()
        };
    }
    
    /**
     * Estimate cache memory usage
     */
    _estimateCacheMemoryUsage() {
        let totalSize = 0;
        for (const [key, value] of this.cache.entries()) {
            totalSize += key.length + JSON.stringify(value.data).length;
        }
        return `${Math.round(totalSize / 1024)}KB`;
    }
    
    /**
     * Start automatic cache cleanup interval
     */
    startCacheCleanup(intervalMinutes = 30) {
        this.cleanupInterval = setInterval(() => {
            this.cleanupExpiredCache();
        }, intervalMinutes * 60 * 1000);
        
        console.log(`🔄 Cache cleanup scheduled every ${intervalMinutes} minutes`);
    }
    
    /**
     * Stop automatic cache cleanup
     */
    stopCacheCleanup() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
            console.log('⏹️ Cache cleanup stopped');
        }
    }
}

// Create and export service instance
const employeeDataService = new EmployeeDataService();

// Start automatic cache cleanup
employeeDataService.startCacheCleanup(30);

export default employeeDataService;