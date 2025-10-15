import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Users, TrendingUp, DollarSign, Target, Clock, Building, Mail, Phone, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { motion } from 'framer-motion';
import { fetchCRMSummary, fetchRecentCustomers, fetchCRMPipeline } from '../../../services/crmApi';
import { useAuth } from '../../../auth/hooks/useAuth';

const CRMInsights = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  // CRM Data State
  const [summary, setSummary] = useState(null);
  const [recentLeads, setRecentLeads] = useState([]);
  const [pipeline, setPipeline] = useState([]);




  // Fetch all CRM data
  const fetchCRMData = async (forceRefresh = false) => {
    if (loading && !forceRefresh) return;

    setLoading(true);
    setError(null);

    try {
      const userEmail = user?.email || 'logan@preludeos.com';
      console.log('📊 Fetching CRM data for user:', userEmail);

      // Fetch all CRM data in parallel
      const [summaryResult, customersResult, pipelineResult] = await Promise.allSettled([
        fetchCRMSummary(userEmail),
        fetchRecentCustomers(userEmail, 5),
        fetchCRMPipeline(userEmail)
      ]);

      console.log('📊 CRM fetch results:', {
        summary: summaryResult,
        customers: customersResult,
        pipeline: pipelineResult
      });

      // Handle summary data
      if (summaryResult.status === 'fulfilled' && summaryResult.value && summaryResult.value.success) {
        setSummary(summaryResult.value.data);
        console.log('✅ CRM summary loaded:', summaryResult.value.data);
      } else {
        const error = summaryResult.status === 'rejected' ? summaryResult.reason :
                     (summaryResult.value && summaryResult.value.error) || 'Unknown error';
        console.warn('Failed to fetch CRM summary:', error);
      }

      // Handle recent customers data
      if (customersResult.status === 'fulfilled' && customersResult.value && customersResult.value.success) {
        setRecentLeads(customersResult.value.data || []);
        console.log('✅ Recent customers loaded:', customersResult.value.data?.length || 0, 'customers');
      } else {
        const error = customersResult.status === 'rejected' ? customersResult.reason :
                     (customersResult.value && customersResult.value.error) || 'Unknown error';
        console.warn('Failed to fetch recent customers:', error);
      }

      // Handle pipeline data
      if (pipelineResult.status === 'fulfilled' && pipelineResult.value && pipelineResult.value.success) {
        setPipeline(pipelineResult.value.data || []);
        console.log('✅ Pipeline data loaded:', pipelineResult.value.data?.length || 0, 'stages');
      } else {
        const error = pipelineResult.status === 'rejected' ? pipelineResult.reason :
                     (pipelineResult.value && pipelineResult.value.error) || 'Unknown error';
        console.warn('Failed to fetch pipeline data:', error);
      }

      setLastUpdate(new Date().toISOString());
      console.log('📊 CRM data fetch completed');

    } catch (error) {
      console.error('📊 Error fetching CRM data:', error);
      setError(error.message || 'Failed to fetch CRM data');
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchCRMData();
  }, [user?.email]);



  // Format currency
  const formatCurrency = (amount) => {
    if (!amount) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Get status color
  const getStatusColor = (status) => {
    const colors = {
      // CRM customers statuses
      'active': 'bg-green-100 text-green-800',
      'inactive': 'bg-yellow-100 text-yellow-800',
      'completed': 'bg-blue-100 text-blue-800',
      'lost': 'bg-red-100 text-red-800',
      'prospect': 'bg-blue-100 text-blue-800',
      'lead': 'bg-yellow-100 text-yellow-800',
      'customer': 'bg-green-100 text-green-800',
      'churned': 'bg-red-100 text-red-800',
      // Legacy leads statuses
      'new_lead': 'bg-blue-100 text-blue-800',
      'contacted_lead': 'bg-yellow-100 text-yellow-800',
      'qualified_lead': 'bg-green-100 text-green-800',
      'proposal_lead': 'bg-purple-100 text-purple-800',
      'negotiation_lead': 'bg-orange-100 text-orange-800',
      'converted_lead': 'bg-emerald-100 text-emerald-800',
      'lost_lead': 'bg-red-100 text-red-800',
      'hot': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          CRM Insights
        </h4>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchCRMData(true)}
          disabled={loading}
          className="px-3"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{summary.total_customers || 0}</p>
                  <p className="text-sm text-gray-500">Total Customers</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Target className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{summary.conversion_rate || 0}%</p>
                  <p className="text-sm text-gray-500">Conversion Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{summary.active_customers || 0}</p>
                  <p className="text-sm text-gray-500">Active Customers</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(summary.avg_arr || summary.avg_lead_value)}</p>
                  <p className="text-sm text-gray-500">Avg ARR</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Customers */}
      {recentLeads.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Recent Customers</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-0">
              {recentLeads.slice(0, 3).map((lead, index) => (
                <motion.div
                  key={lead.lead_id || lead.id || index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Building className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-sm">
                          {lead.company || lead.name || 'Unknown Company'}
                        </span>
                        <Badge className={`text-xs ${getStatusColor(lead.status)}`}>
                          {lead.status || 'prospect'}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">
                        {lead.name || lead.industry || lead.position || 'No contact info'}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        {lead.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            <span>{lead.email}</span>
                          </div>
                        )}
                        {lead.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            <span>{lead.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      {(lead.arr || lead.score) && (
                        <p className="text-sm font-medium text-green-600">
                          {lead.arr ? formatCurrency(lead.arr) : `Score: ${lead.score}`}
                        </p>
                      )}
                      {lead.revenue && (
                        <p className="text-xs text-green-600">
                          {lead.revenue}
                        </p>
                      )}
                      <p className="text-xs text-gray-500">
                        {formatDate(lead.created_at)}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pipeline Overview */}
      {pipeline.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Sales Pipeline</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="space-y-3">
              {pipeline.map((stage, index) => (
                <motion.div
                  key={stage.status}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Badge className={`text-xs ${getStatusColor(stage.status)}`}>
                      {stage.status || 'unknown'}
                    </Badge>
                    <span className="text-sm text-gray-600">{stage.count || 0} leads</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {stage.avg_value ? formatCurrency(stage.avg_value) : `Avg Score: ${Math.round(stage.avg_score || 0)}`}
                  </span>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Last Update */}
      {lastUpdate && (
        <div className="text-xs text-gray-500 text-center">
          Last updated: {new Date(lastUpdate).toLocaleTimeString()}
        </div>
      )}

      {/* Loading State */}
      {loading && !summary && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          <span className="ml-2 text-sm text-gray-500">Loading CRM data...</span>
        </div>
      )}



      {/* Empty State */}
      {!loading && !summary && !error && (
        <div className="text-center py-8 text-gray-500">
          <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-sm">No CRM data available</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchCRMData(true)}
            className="mt-2"
          >
            Retry
          </Button>
        </div>
      )}
    </div>
  );
};

export default CRMInsights;
