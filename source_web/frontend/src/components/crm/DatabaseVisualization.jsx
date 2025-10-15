import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import {
  Database,
  Users,
  Mail,
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  PieChart,
  Download,
  RefreshCw,
  Eye,
  EyeOff,
  X,
  ChevronDown,
  ChevronUp,
  Filter,
  Search,
  Calendar,
  User,
  Building,
  MessageSquare,
  Link,
  Unlink,
  AlertCircle,
  CheckCircle,
  Clock,
  Star,
  Sparkles,
  Brain,
  Target
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { useAuth } from '../../auth/hooks/useAuth';

const DatabaseVisualization = ({ isOpen, onClose }) => {
  const { authFetch } = useAuth();
  const CRM_API_BASE_URL = import.meta.env.VITE_CRM_API_URL || 'http://localhost:8003';
  const [databaseStats, setDatabaseStats] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [emails] = useState([]); // No longer fetching emails, keeping as empty array
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [showEmailContent, setShowEmailContent] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [analyticsInsights, setAnalyticsInsights] = useState(null);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [insightsError, setInsightsError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchDatabaseData();
    }
  }, [isOpen]);

  const fetchDatabaseData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch database stats
              const statsResponse = await fetch(`${CRM_API_BASE_URL}/api/crm/database/stats`);
      if (statsResponse.ok) {
        const stats = await statsResponse.json();
        setDatabaseStats(stats);
      }

      // Fetch all customers
              const customersResponse = await fetch(`${CRM_API_BASE_URL}/api/crm/customers`);
      if (customersResponse.ok) {
        const customersData = await customersResponse.json();
        setCustomers(customersData);
      }

      // Removed the email fetching call that was causing 404 errors
              // const emailsResponse = await fetch(`${CRM_API_BASE_URL}/api/crm/customers/1/emails`);
      // if (emailsResponse.ok) {
      //   const emailsData = await emailsResponse.json();
      //   setEmails(emailsData.slice(0, 50)); // Limit to 50 emails for performance
      // }

    } catch (err) {
      setError('Failed to fetch database data');
      console.error('Database fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const getStatusColor = (status) => {
    const colors = {
      'healthy': 'bg-green-100 text-green-800',
      'at-risk': 'bg-yellow-100 text-yellow-800',
      'churned': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const generateAnalyticsInsights = async () => {
    setIsGeneratingInsights(true);
    setInsightsError('');

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
      } else {
        setInsightsError('Failed to generate analytics insights');
      }
    } catch (err) {
      console.error('Error generating insights:', err);
      setInsightsError('Error connecting to server');
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  const formatAnalysisText = (text) => {
    if (!text) return '';

    // Convert markdown-style formatting to HTML
    let formatted = text
      // Convert **bold** to <strong>
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
      // Convert section headers like "**1. SECTION**" to proper headings
      .replace(/^\*\*(\d+\.\s+[^*]+)\*\*$/gm, '<h3 class="text-lg font-bold text-gray-900 mt-6 mb-3 border-b border-gray-200 pb-2">$1</h3>')
      // Convert bullet points starting with * to proper list items
      .replace(/^\*\s+(.+)$/gm, '<li class="ml-4 mb-2">• $1</li>')
      // Convert line breaks to paragraphs
      .replace(/\n\n/g, '</p><p class="mb-4">')
      // Wrap in paragraph tags
      .replace(/^/, '<p class="mb-4">')
      .replace(/$/, '</p>');

    // Clean up any empty paragraphs
    formatted = formatted.replace(/<p class="mb-4"><\/p>/g, '');

    // Wrap consecutive list items in ul tags
    formatted = formatted.replace(/(<li class="ml-4 mb-2">.*?<\/li>)(\s*<li class="ml-4 mb-2">.*?<\/li>)*/g, (match) => {
      return '<ul class="list-none space-y-1 mb-4">' + match + '</ul>';
    });

    return formatted;
  };

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.company.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || customer.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'emails', label: 'Emails', icon: Mail },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp }
  ];

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <Database className="w-6 h-6 text-purple-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">Database Visualization</h2>
              <p className="text-sm text-gray-600">Real-time CRM database insights</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={fetchDatabaseData}
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700"
              size="sm"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <p className="text-red-600">{error}</p>
              </div>
            </div>
          ) : (
            <div className="h-full overflow-y-auto p-6">
              <AnimatePresence mode="wait">
                {activeTab === 'overview' && (
                  <motion.div
                    key="overview"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-6"
                  >
                    {/* Database Stats */}
                    {databaseStats && (
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2">
                              <Users className="w-5 h-5 text-blue-600" />
                              <span className="text-sm font-medium text-gray-600">Total Customers</span>
                            </div>
                            <p className="text-2xl font-bold text-gray-900 mt-1">
                              {databaseStats.customer_count}
                            </p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2">
                              <Mail className="w-5 h-5 text-green-600" />
                              <span className="text-sm font-medium text-gray-600">Total Emails</span>
                            </div>
                            <p className="text-2xl font-bold text-gray-900 mt-1">
                              {databaseStats.email_count}
                            </p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2">
                              <Link className="w-5 h-5 text-purple-600" />
                              <span className="text-sm font-medium text-gray-600">Linked Emails</span>
                            </div>
                            <p className="text-2xl font-bold text-gray-900 mt-1">
                              {databaseStats.linked_email_count}
                            </p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2">
                              <Activity className="w-5 h-5 text-orange-600" />
                              <span className="text-sm font-medium text-gray-600">Link Rate</span>
                            </div>
                            <p className="text-2xl font-bold text-gray-900 mt-1">
                              {databaseStats.email_count > 0
                                ? Math.round((databaseStats.linked_email_count / databaseStats.email_count) * 100)
                                : 0}%
                            </p>
                          </CardContent>
                        </Card>
                      </div>
                    )}

                    {/* Status Distribution */}
                    {databaseStats?.status_distribution && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <PieChart className="w-5 h-5" />
                            Customer Status Distribution
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {Object.entries(databaseStats.status_distribution).map(([status, count]) => (
                              <div key={status} className="text-center">
                                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(status)}`}>
                                  {status.charAt(0).toUpperCase() + status.slice(1)}
                                </div>
                                <p className="text-2xl font-bold text-gray-900 mt-2">{count}</p>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Database Info */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Database className="w-5 h-5" />
                          Database Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Database Path:</span>
                            <span className="font-mono text-sm">{databaseStats?.database_path}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Last Updated:</span>
                            <span>{formatDate(new Date())}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {activeTab === 'customers' && (
                  <motion.div
                    key="customers"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-4"
                  >
                    {/* Search and Filters */}
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <div className="relative">
                          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Search customers..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border rounded-lg"
                          />
                        </div>
                      </div>
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="border rounded-lg px-3 py-2"
                      >
                        <option value="all">All Status</option>
                        <option value="healthy">Healthy</option>
                        <option value="at-risk">At Risk</option>
                        <option value="churned">Churned</option>
                      </select>
                    </div>

                    {/* Customers List */}
                    <div className="grid gap-4">
                      {filteredCustomers.map((customer) => (
                        <Card key={customer.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <User className="w-5 h-5 text-gray-400" />
                                  <h3 className="font-semibold text-gray-900">{customer.name}</h3>
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(customer.status)}`}>
                                    {customer.status}
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                  <div>
                                    <span className="text-gray-600">Email:</span>
                                    <p className="font-medium">{customer.email}</p>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">Company:</span>
                                    <p className="font-medium">{customer.company}</p>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">ARR:</span>
                                    <p className="font-medium">{formatCurrency(customer.arr)}</p>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">Created:</span>
                                    <p className="font-medium">{formatDate(customer.created_at)}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </motion.div>
                )}

                {activeTab === 'emails' && (
                  <motion.div
                    key="emails"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Recent Emails</h3>
                      <Button
                        onClick={() => setShowEmailContent(!showEmailContent)}
                        variant="ghost"
                        size="sm"
                      >
                        {showEmailContent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        {showEmailContent ? 'Hide Content' : 'Show Content'}
                      </Button>
                    </div>

                    <div className="space-y-4">
                      {emails.map((email) => (
                        <Card key={email.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Mail className="w-4 h-4 text-gray-400" />
                                  <h4 className="font-semibold text-gray-900">{email.subject}</h4>
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    email.direction === 'inbound' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                                  }`}>
                                    {email.direction}
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                                  <div>
                                    <span className="text-gray-600">From:</span>
                                    <p className="font-medium">{email.sender}</p>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">To:</span>
                                    <p className="font-medium">{email.recipient}</p>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">Date:</span>
                                    <p className="font-medium">{formatDate(email.date)}</p>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">Linked:</span>
                                    <p className="font-medium">
                                      {email.customer_id ? (
                                        <CheckCircle className="w-4 h-4 text-green-600 inline" />
                                      ) : (
                                        <Unlink className="w-4 h-4 text-gray-400 inline" />
                                      )}
                                    </p>
                                  </div>
                                </div>
                                {showEmailContent && (
                                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                                    <p className="text-sm text-gray-700">{email.body}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </motion.div>
                )}

                {activeTab === 'analytics' && (
                  <motion.div
                    key="analytics"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-6"
                  >
                    {/* AI Insights Section */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Brain className="w-5 h-5 text-purple-600" />
                          AI-Powered Analytics Insights
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {insightsError && (
                          <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
                            <p className="text-red-700">{insightsError}</p>
                          </div>
                        )}

                        {analyticsInsights ? (
                          <div className="space-y-6">
                            {/* Data Summary Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                                <div className="text-2xl font-bold text-blue-800">{analyticsInsights.data_summary.total_customers}</div>
                                <div className="text-sm text-blue-600">Total Customers</div>
                              </div>
                              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
                                <div className="text-2xl font-bold text-green-800">${(analyticsInsights.data_summary.total_arr / 1000000).toFixed(1)}M</div>
                                <div className="text-sm text-green-600">Total ARR</div>
                              </div>
                              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-4 rounded-lg border border-yellow-200">
                                <div className="text-2xl font-bold text-orange-800">{analyticsInsights.data_summary.at_risk_count}</div>
                                <div className="text-sm text-orange-600">At Risk</div>
                              </div>
                              <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-200">
                                <div className="text-2xl font-bold text-purple-800">{analyticsInsights.data_summary.expansion_opportunities_count}</div>
                                <div className="text-sm text-purple-600">Expansion Opps</div>
                              </div>
                            </div>

                                                         {/* AI Analysis */}
                             <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-6 rounded-lg border border-gray-200">
                               <div className="flex items-center justify-between mb-4">
                                 <div className="flex items-center gap-2">
                                   <Target className="w-5 h-5 text-blue-600" />
                                   <h3 className="text-lg font-semibold text-gray-900">AI Analysis</h3>
                                   <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                     Generated by {analyticsInsights.generated_by}
                                   </span>
                                 </div>
                                 <button
                                   onClick={() => setAnalyticsInsights(null)}
                                   className="p-1 hover:bg-gray-200 rounded-full transition-colors duration-200"
                                   title="Close analysis"
                                 >
                                   <X className="w-5 h-5 text-gray-500 hover:text-gray-700" />
                                 </button>
                               </div>
                               <div className="prose prose-sm max-w-none">
                                 <div className="text-gray-700 text-sm leading-relaxed space-y-4">
                                   <ReactMarkdown
                                     rehypePlugins={[rehypeSanitize]}
                                     components={{
                                       h3: ({children}) => <h3 className="text-lg font-bold text-gray-900 mt-6 mb-3 border-b border-gray-200 pb-2">{children}</h3>,
                                       ul: ({children}) => <ul className="list-none space-y-1 mb-4">{children}</ul>,
                                       li: ({children}) => <li className="ml-4 mb-2">• {children}</li>,
                                       p: ({children}) => <p className="mb-4">{children}</p>,
                                       strong: ({children}) => <strong className="font-semibold text-gray-900">{children}</strong>
                                     }}
                                   >
                                     {analyticsInsights.analysis_text}
                                   </ReactMarkdown>
                                 </div>
                               </div>
                               <div className="mt-4 text-xs text-gray-500">
                                 Analysis by: {analyticsInsights.analyst}
                               </div>
                             </div>
                          </div>
                        ) : (
                          <div className="text-center py-12">
                            <div className="w-16 h-16 bg-gradient-to-r from-purple-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                              <Brain className="w-8 h-8 text-purple-600" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                              AI-Powered Analytics
                            </h3>
                            <p className="text-gray-600 mb-4">
                              Generate intelligent insights about your customer portfolio using AI analysis
                            </p>
                            <Button
                              onClick={generateAnalyticsInsights}
                              disabled={isGeneratingInsights}
                              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                            >
                              <Sparkles className="w-4 h-4 mr-2" />
                              Generate AI Insights
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Traditional Analytics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5" />
                            Customer Growth
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-center">
                            <p className="text-3xl font-bold text-gray-900">{customers.length}</p>
                            <p className="text-sm text-gray-600">Total Customers</p>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <MessageSquare className="w-5 h-5" />
                            Email Activity
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-center">
                            <p className="text-3xl font-bold text-gray-900">{emails.length}</p>
                            <p className="text-sm text-gray-600">Recent Emails</p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <BarChart3 className="w-5 h-5" />
                          Customer Status Analytics
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {databaseStats?.status_distribution && Object.entries(databaseStats.status_distribution).map(([status, count]) => (
                            <div key={status} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${
                                  status === 'customer' ? 'bg-green-500' :
                                  status === 'lead' ? 'bg-yellow-500' :
                                  status === 'prospect' ? 'bg-blue-500' : 'bg-red-500'
                                }`}></div>
                                <span className="capitalize">{status}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-32 bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-purple-600 h-2 rounded-full"
                                    style={{
                                      width: `${databaseStats.customer_count > 0 ? (count / databaseStats.customer_count) * 100 : 0}%`
                                    }}
                                  ></div>
                                </div>
                                <span className="text-sm font-medium">{count}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default DatabaseVisualization;