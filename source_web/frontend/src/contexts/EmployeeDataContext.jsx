/**
 * Employee Data Context
 * 
 * Provides global state management for employee data with caching and batch loading.
 * This context reduces API calls and provides shared state across components.
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import employeeDataService from '../services/employeeDataService';

const EmployeeDataContext = createContext();

export const useEmployeeData = () => {
    const context = useContext(EmployeeDataContext);
    if (!context) {
        throw new Error('useEmployeeData must be used within an EmployeeDataProvider');
    }
    return context;
};

export const EmployeeDataProvider = ({ children }) => {
    // Main employee data state
    const [employeesData, setEmployeesData] = useState(new Map());
    const [allEmployees, setAllEmployees] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    
    // Cache and performance tracking
    const [cacheStats, setCacheStats] = useState({});
    const [lastLoadTime, setLastLoadTime] = useState(null);
    
    // Filters and search state
    const [filters, setFilters] = useState({
        department: 'all',
        availability: 'all',
        search: ''
    });
    
    /**
     * Load all employees with full data using batch API
     */
    const loadAllEmployees = useCallback(async (forceRefresh = false) => {
        setLoading(true);
        setError(null);
        
        const startTime = Date.now();
        
        try {
            console.log('🔄 Loading all employees with batch API...');
            
            const params = {
                include_performance: true,
                include_feedback: true,
                include_customers: true
            };
            
            // Add filters if they're not default values
            if (filters.department !== 'all') {
                params.department = filters.department;
            }
            if (filters.search) {
                params.search = filters.search;
            }
            
            const batchResponse = await employeeDataService.getAllEmployeesWithFullData(params, forceRefresh);
            
            // Update state with the new data
            setAllEmployees(batchResponse.employees || []);
            
            // Update individual employee data map
            const newEmployeesMap = new Map();
            batchResponse.employees.forEach(empData => {
                newEmployeesMap.set(empData.employee.id, empData);
            });
            setEmployeesData(newEmployeesMap);
            
            // Update performance tracking
            const loadTime = Date.now() - startTime;
            setLastLoadTime(loadTime);
            setCacheStats(employeeDataService.getCacheStats());
            
            console.log(`✅ Loaded ${batchResponse.employees.length} employees in ${loadTime}ms`);
            console.log('📊 Cache stats:', employeeDataService.getCacheStats());
            
            return batchResponse;
            
        } catch (err) {
            console.error('Failed to load employee data:', err);
            setError(`Failed to load employee data: ${err.message}`);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [filters]);
    
    /**
     * Load specific employee data
     */
    const loadEmployeeData = useCallback(async (employeeId, forceRefresh = false) => {
        // Check if we already have this employee data
        if (!forceRefresh && employeesData.has(employeeId)) {
            return employeesData.get(employeeId);
        }
        
        try {
            console.log(`🔄 Loading data for employee ${employeeId}...`);
            
            // Load individual employee data
            const [employee, performance, customersAndLeads] = await Promise.all([
                employeeDataService.getEmployeeById(employeeId, forceRefresh),
                employeeDataService.getEmployeePerformance(employeeId, forceRefresh),
                employeeDataService.getEmployeeCustomersAndLeads(employeeId, forceRefresh)
            ]);
            
            // Create full employee data object
            const fullEmployeeData = {
                employee,
                performance,
                feedback_summary: employee.feedback_summary || null,
                customer_count: customersAndLeads.customers?.length || 0,
                lead_count: customersAndLeads.leads?.length || 0,
                customers: customersAndLeads.customers || [],
                leads: customersAndLeads.leads || []
            };
            
            // Update the map
            setEmployeesData(prev => {
                const newMap = new Map(prev);
                newMap.set(employeeId, fullEmployeeData);
                return newMap;
            });
            
            // Update allEmployees array if needed
            setAllEmployees(prev => {
                const existingIndex = prev.findIndex(emp => emp.employee.id === employeeId);
                if (existingIndex >= 0) {
                    const newArray = [...prev];
                    newArray[existingIndex] = fullEmployeeData;
                    return newArray;
                } else {
                    return [...prev, fullEmployeeData];
                }
            });
            
            console.log(`✅ Loaded individual data for employee ${employeeId}`);
            
            return fullEmployeeData;
            
        } catch (err) {
            console.error(`Failed to load employee ${employeeId}:`, err);
            throw err;
        }
    }, [employeesData]);
    
    /**
     * Update employee data after changes
     */
    const updateEmployeeData = useCallback((employeeId, updatedData) => {
        // Invalidate cache for this employee
        employeeDataService.invalidateEmployeeCache(employeeId);
        
        // Update local state
        setEmployeesData(prev => {
            const newMap = new Map(prev);
            const existingData = newMap.get(employeeId) || {};
            newMap.set(employeeId, { ...existingData, ...updatedData });
            return newMap;
        });
        
        // Update allEmployees array
        setAllEmployees(prev => {
            return prev.map(empData => {
                if (empData.employee.id === employeeId) {
                    return { ...empData, ...updatedData };
                }
                return empData;
            });
        });
        
        console.log(`📝 Updated data for employee ${employeeId}`);
    }, []);
    
    /**
     * Generate default performance data for new employees
     */
    const generateDefaultPerformanceData = useCallback(() => {
        return {
            peer_evaluations: {
                averageScore: 4.0,
                count: 0
            },
            goal_progress: [],
            performance_score: 80
        };
    }, []);

    /**
     * Create EmployeeFullData structure from new employee
     */
    const createEmployeeFullData = useCallback((newEmployee) => {
        return {
            employee: newEmployee,
            performance: generateDefaultPerformanceData(),
            feedback_summary: null,
            customer_count: 0,
            lead_count: 0,
            customers: [],
            leads: []
        };
    }, [generateDefaultPerformanceData]);

    /**
     * Add new employee to state (optimistic update)
     */
    const addEmployeeToState = useCallback((newEmployee) => {
        const fullEmployeeData = createEmployeeFullData(newEmployee);
        
        // Update the map
        setEmployeesData(prev => {
            const newMap = new Map(prev);
            newMap.set(newEmployee.id, fullEmployeeData);
            return newMap;
        });
        
        // Update allEmployees array
        setAllEmployees(prev => {
            return [...prev, fullEmployeeData];
        });
        
        // Update cache stats
        setCacheStats(employeeDataService.getCacheStats());
        
        console.log(`✅ Added employee ${newEmployee.id} to state optimistically`);
    }, [createEmployeeFullData]);

    /**
     * Rollback employee addition (in case of API failure)
     */
    const rollbackEmployeeAdd = useCallback((employeeId) => {
        // Remove from employeesData Map
        setEmployeesData(prev => {
            const newMap = new Map(prev);
            newMap.delete(employeeId);
            return newMap;
        });
        
        // Remove from allEmployees array
        setAllEmployees(prev => {
            return prev.filter(empData => empData.employee.id !== employeeId);
        });
        
        console.log(`🔄 Rolled back employee ${employeeId} addition`);
    }, []);

    /**
     * Remove employee from state after deletion
     */
    const removeEmployeeFromState = useCallback((employeeId) => {
        // Invalidate cache for this employee
        employeeDataService.invalidateEmployeeCache(employeeId);
        
        // Remove from employeesData Map
        setEmployeesData(prev => {
            const newMap = new Map(prev);
            newMap.delete(employeeId);
            return newMap;
        });
        
        // Remove from allEmployees array
        setAllEmployees(prev => {
            return prev.filter(empData => empData.employee.id !== employeeId);
        });
        
        console.log(`🗑️ Removed employee ${employeeId} from state`);
    }, []);
    
    /**
     * Update filters and reload data if needed
     */
    const updateFilters = useCallback((newFilters) => {
        setFilters(prev => ({ ...prev, ...newFilters }));
        
        // If we're changing filters, we might need to reload data
        // For now, we'll just filter the existing data client-side
        // In production, you might want to reload from server for server-side filtering
    }, []);
    
    /**
     * Get filtered employees based on current filters
     */
    const getFilteredEmployees = useCallback(() => {
        return allEmployees.filter(empData => {
            const employee = empData.employee;
            
            // Department filter
            if (filters.department !== 'all' && employee.department !== filters.department) {
                return false;
            }
            
            // Availability filter
            if (filters.availability !== 'all' && employee.availability !== filters.availability) {
                return false;
            }
            
            // Search filter
            if (filters.search) {
                const searchLower = filters.search.toLowerCase();
                const matchesName = employee.name.toLowerCase().includes(searchLower);
                const matchesRole = employee.role.toLowerCase().includes(searchLower);
                const matchesSpecialties = employee.specialties?.some(skill => 
                    skill.toLowerCase().includes(searchLower)
                );
                
                if (!matchesName && !matchesRole && !matchesSpecialties) {
                    return false;
                }
            }
            
            return true;
        });
    }, [allEmployees, filters]);
    
    /**
     * Refresh all data
     */
    const refreshData = useCallback(async () => {
        await loadAllEmployees(true);
    }, [loadAllEmployees]);
    
    /**
     * Clear all cached data
     */
    const clearCache = useCallback(() => {
        employeeDataService.clearCache();
        setCacheStats(employeeDataService.getCacheStats());
        console.log('🗑️ Cache cleared');
    }, []);
    
    /**
     * Get employee by ID from current data
     */
    const getEmployeeById = useCallback((employeeId) => {
        return employeesData.get(employeeId);
    }, [employeesData]);
    
    /**
     * Check if employee data is loaded
     */
    const isEmployeeLoaded = useCallback((employeeId) => {
        return employeesData.has(employeeId);
    }, [employeesData]);
    
    // Load initial data when component mounts
    useEffect(() => {
        loadAllEmployees();
    }, []); // Only run once on mount
    
    // Update cache stats periodically
    useEffect(() => {
        const interval = setInterval(() => {
            setCacheStats(employeeDataService.getCacheStats());
        }, 30000); // Every 30 seconds
        
        return () => clearInterval(interval);
    }, []);
    
    const value = {
        // Data state
        allEmployees,
        employeesData,
        loading,
        error,
        
        // Filtered data
        filteredEmployees: getFilteredEmployees(),
        filters,
        
        // Performance tracking
        cacheStats,
        lastLoadTime,
        
        // Actions
        loadAllEmployees,
        loadEmployeeData,
        updateEmployeeData,
        addEmployeeToState,
        rollbackEmployeeAdd,
        removeEmployeeFromState,
        updateFilters,
        refreshData,
        clearCache,
        getEmployeeById,
        isEmployeeLoaded,
        
        // Helper functions
        getFilteredEmployees
    };
    
    return (
        <EmployeeDataContext.Provider value={value}>
            {children}
        </EmployeeDataContext.Provider>
    );
};

export default EmployeeDataContext;