import React, { useState, useEffect, useRef } from 'react';
import {
  RefreshCw,
  UserSearch,
  Building,
  Sparkles,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import toast from 'react-hot-toast';
import customerApiService from '../../../services/customerApi';
import employeeApiService from '../../../services/employeeApi';
import { generateCustomerMatches } from '../../../services/customerMatchingService';
import semanticMatchingService from '../../../services/semanticMatchingService';

const CustomerMatchingTab = () => {
  // Customer Matching state
  const [customerMatches, setCustomerMatches] = useState([]);
  const [customerMatchingLoading, setCustomerMatchingLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [customersPerPage] = useState(10);
  
  // New Customer Match state
  const [newCustomerMatches, setNewCustomerMatches] = useState([]);

  // Prewarm matching cache on first load (silent)
  const prewarmStartedRef = useRef(false);

  const prewarmMatchingCache = async () => {
    if (prewarmStartedRef.current) return;
    try {
      // If we already have cached pairs, skip
      if (semanticMatchingService.getLocalCacheSize() > 0) return;

      prewarmStartedRef.current = true;
      // Ensure model is loading/loaded
      await semanticMatchingService.preloadModel();

      // Fetch base datasets
      const [customers, employees] = await Promise.all([
        customerApiService.getAllCustomers({ excludeAssigned: true }).catch(() => []),
        employeeApiService.getAllEmployees().catch(() => [])
      ]);

      if (!Array.isArray(customers) || !Array.isArray(employees) || employees.length === 0) {
        return;
      }

      // Warm up all customers
      const customersToWarm = customers;

      // Sequentially warm to avoid overwhelming backend
      for (const customer of customersToWarm) {
        try {
          await semanticMatchingService.matchCustomerToEmployees(customer, employees);
        } catch {
          // Ignore individual failures during prewarm
        }
      }
    } catch {
      // Swallow errors silently; prewarm is best-effort
    }
  };

  useEffect(() => {
    prewarmMatchingCache();
  }, []);

  // Customer Matching Algorithm using real data
  const handleGenerateCustomerMatches = async () => {
    try {
      setCustomerMatchingLoading(true);

      console.log('🚀 Starting customer matching process...');
      const matches = await generateCustomerMatches();

      setCustomerMatches(matches);
      console.log(`✅ Successfully generated ${matches.length} customer matches`);

    } catch (error) {
      console.error('Failed to generate customer matches:', error);
      toast.error(`❌ Failed to generate customer matches: ${error.message}`, {
        duration: 6000
      });
    } finally {
      setCustomerMatchingLoading(false);
    }
  };

  const handleRefreshCustomerMatches = async () => {
    try {
      setCustomerMatchingLoading(true);
      // Clear backend and local caches
      try {
        await semanticMatchingService.clearCache();
      } catch (e) {
        console.warn('Backend cache clear failed, falling back to local clear', e);
        semanticMatchingService.clearLocalCache();
      }
      // Recompute
      const matches = await generateCustomerMatches();
      setCustomerMatches(matches);
    } catch (error) {
      console.error('Failed to refresh customer matches:', error);
      toast.error(`❌ Failed to refresh customer matches: ${error.message}`);
    } finally {
      setCustomerMatchingLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header Section */}
      <div className="p-6 border-b bg-gradient-to-r from-green-50 to-blue-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
              <UserSearch className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Customer Matching</h2>
              <p className="text-gray-600">AI-powered customer-employee matching based on expertise, availability, and performance</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleGenerateCustomerMatches}
              disabled={customerMatchingLoading}
              className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
            >
              <UserSearch className={`w-4 h-4 ${customerMatchingLoading ? 'animate-pulse' : ''}`} />
              {customerMatchingLoading ? 'Generating...' : 'Generate Matches'}
            </Button>
            <Button
              variant="outline"
              onClick={handleRefreshCustomerMatches}
              disabled={customerMatchingLoading}
              className="flex items-center gap-2 px-3 py-1 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${customerMatchingLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="flex-1 p-6 overflow-y-auto">
        {customerMatchingLoading ? (
          <div className="space-y-6">
            {/* Header skeleton matching loaded layout */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full animate-pulse" />
              <div>
                <div className="h-5 w-48 bg-gray-200 rounded animate-pulse mb-2" />
                <div className="h-4 w-72 bg-gray-100 rounded animate-pulse" />
              </div>
            </div>

            {/* Ten skeleton customer cards */}
            <div className="space-y-6">
              {[...Array(10)].map((_, idx) => (
                <div key={idx} className="border-l-4 border-l-green-200 rounded-lg bg-white p-6">
                  {/* Customer header skeleton */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full animate-pulse" />
                      <div>
                        <div className="h-4 w-56 bg-gray-200 rounded animate-pulse mb-2" />
                        <div className="flex items-center gap-4">
                          <div className="h-3 w-48 bg-gray-100 rounded animate-pulse" />
                          <div className="h-5 w-28 bg-blue-100 rounded-full animate-pulse" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="h-4 w-44 bg-gray-200 rounded animate-pulse mb-3" />
                  {/* Grid skeleton mimicking 5 match cards */}
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
                          <div className="flex-1 min-w-0">
                            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-1" />
                            <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
                          </div>
                        </div>
                        <div className="h-2 w-full bg-gray-200 rounded mb-2 animate-pulse" />
                        <div className="h-2 w-3/4 bg-gray-200 rounded animate-pulse" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination skeleton */}
            <div className="flex items-center justify-center gap-4 mt-6">
              <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
              <div className="flex items-center gap-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
                ))}
              </div>
              <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        ) : (
          <>
            {/* New Customer Matches Section */}
            {newCustomerMatches.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-green-600" />
                  <h3 className="text-lg font-semibold text-gray-900">New Customer Matches</h3>
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                    Latest
                  </span>
                </div>
                <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {newCustomerMatches.map((match, index) => (
                      <div key={index} className="bg-white rounded-lg p-4 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                            <span className="text-green-600 font-bold text-sm">
                              {(match.employee.name || 'Unknown').split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm text-gray-900 truncate">
                              {match.employee.name || 'Unknown Employee'}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {match.employee.department || 'No Department'}
                            </div>
                          </div>
                        </div>
                        <div className="mb-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-500">Match Score</span>
                            <span className="font-bold text-green-600">{Math.round(match.score)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                            <div
                              className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(Math.round(match.score), 100)}%` }}
                            ></div>
                          </div>
                        </div>
                        <div className="space-y-1">
                          {match.reasons.slice(0, 2).map((reason, reasonIndex) => (
                            <div key={reasonIndex} className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
                              {reason}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Existing Customer Matches Section */}
            <div className="space-y-6">
              {(() => {
                // Calculate pagination
                const totalPages = Math.ceil(customerMatches.length / customersPerPage);
                const startIndex = (currentPage - 1) * customersPerPage;
                const endIndex = startIndex + customersPerPage;
                const currentCustomers = customerMatches.slice(startIndex, endIndex);

                return currentCustomers.map((customerMatch, index) => (
                  <Card key={index} className="border-l-4 border-l-green-500">
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                            <Building className="w-6 h-6 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">{customerMatch.customer.customer_name}</h3>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span>{customerMatch.customer.email ? `Contact: ${customerMatch.customer.email}` : 'No contact info'}</span>
                              <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700">
                                {customerMatch.customer.country || 'Unknown Location'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3">Top Employee Matches</h4>
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                          {customerMatch.matches.map((match, matchIndex) => (
                            <div key={matchIndex} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                              <div className="flex items-center gap-3 mb-2">
                                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                  <span className="text-green-600 font-bold text-sm">
                                    {(match.employee.name || 'Unknown').split(' ').map(n => n[0]).join('')}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm text-gray-900 truncate">
                                    {match.employee.name || 'Unknown Employee'}
                                  </div>
                                  <div className="text-xs text-gray-500 truncate">
                                    {match.employee.department || 'No Department'}
                                  </div>
                                </div>
                              </div>
                              <div className="mb-2">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-gray-500">Match Score</span>
                                  <span className="font-bold text-green-600">{Math.round(match.score)}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                  <div
                                    className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${Math.min(Math.round(match.score), 100)}%` }}
                                  ></div>
                                </div>
                              </div>
                              <div className="space-y-1">
                                {match.reasons.slice(0, 2).map((reason, reasonIndex) => (
                                  <div key={reasonIndex} className="text-xs text-gray-600 bg-white px-2 py-1 rounded">
                                    {reason}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Card>
                ));
              })()}
            </div>

            {customerMatches.length === 0 && !customerMatchingLoading && (
              <div className="text-center py-12">
                <UserSearch className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Customer Matches</h3>
                <p className="text-gray-500 mb-4">Click "Generate Matches" to start AI-powered customer-employee matching</p>
                <Button
                  onClick={handleGenerateCustomerMatches}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <UserSearch className="w-4 h-4 mr-2" />
                  Generate Matches
                </Button>
              </div>
            )}

            {/* Pagination Controls */}
            {customerMatches.length > 0 && (
              <div className="flex items-center justify-center gap-4 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center gap-2"
                >
                  <ChevronUp className="w-4 h-4 rotate-[-90deg]" />
                  Previous
                </Button>

                <div className="flex items-center gap-2">
                  {(() => {
                    const totalPages = Math.ceil(customerMatches.length / customersPerPage);
                    const pageNumbers = [];

                    // Show page numbers with ellipsis logic
                    for (let i = 1; i <= totalPages; i++) {
                      if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
                        pageNumbers.push(i);
                      } else if (i === currentPage - 2 || i === currentPage + 2) {
                        pageNumbers.push('...');
                      }
                    }

                    return pageNumbers.map((page, index) => (
                      page === '...' ? (
                        <span key={index} className="px-2 py-1 text-gray-500">...</span>
                      ) : (
                        <Button
                          key={index}
                          variant={currentPage === page ? "default" : "outline"}
                          onClick={() => setCurrentPage(page)}
                          className={`px-3 py-1 text-sm ${
                            currentPage === page
                              ? 'bg-green-600 text-white'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {page}
                        </Button>
                      )
                    ));
                  })()}
                </div>

                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.min(Math.ceil(customerMatches.length / customersPerPage), prev + 1))}
                  disabled={currentPage === Math.ceil(customerMatches.length / customersPerPage)}
                  className="flex items-center gap-2"
                >
                  Next
                  <ChevronDown className="w-4 h-4 rotate-[-90deg]" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CustomerMatchingTab;