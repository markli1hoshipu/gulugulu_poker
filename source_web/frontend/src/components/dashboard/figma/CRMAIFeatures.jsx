import { useState, useEffect } from "react";

import { Brain, MessageSquare, CheckSquare, Loader2, Clock, ChevronUp, ChevronDown, Users, TrendingUp, DollarSign, Target, Building, Mail, Phone, RefreshCw, AlertCircle, RotateCcw, Send, Plus } from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { motion } from 'framer-motion';
// Import new HTTP API instead of Socket.IO API
import { fetchCRMTodos, fetchCommunicationSuggestions, fetchCRMSummary, fetchRecentCustomers, fetchCRMPipeline } from '../../../services/crmHttpApi';
import { useAuth } from '../../../auth/hooks/useAuth';
import EmailComposerModal from './EmailComposerModal';
import actionItemsService from '../../../services/actionItemsService';

const CRMAIFeatures = () => {
  const { user } = useAuth();

  // CRM Basic Data State
  const [summary, setSummary] = useState(null);
  const [recentCustomers, setRecentCustomers] = useState([]);
  const [pipeline, setPipeline] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  // AI Features State
  const [todos, setTodos] = useState([]);
  const [communicationSuggestions, setCommunicationSuggestions] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [showAIFeatures, setShowAIFeatures] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0);

  // AI Availability State
  const [aiAvailable, setAiAvailable] = useState({
    todos: true,
    communications: true
  });
  const [aiErrors, setAiErrors] = useState({
    todos: null,
    communications: null
  });

  // Email Composer State
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);

  // Fetch CRM basic data
  const fetchCRMData = async (forceRefresh = false) => {
    if (loading && !forceRefresh) return;

    setLoading(true);
    setError(null);

    try {
      const userEmail = user?.email || 'admin@prelude.com';
      console.log('📊 Fetching CRM data for user:', userEmail);

      const [summaryResult, customersResult, pipelineResult] = await Promise.allSettled([
        fetchCRMSummary(userEmail),
        fetchRecentCustomers(userEmail, 5),
        fetchCRMPipeline(userEmail)
      ]);

      // Handle summary data
      if (summaryResult.status === 'fulfilled' && summaryResult.value?.success) {
        setSummary(summaryResult.value.data);
        console.log('✅ CRM summary loaded:', summaryResult.value.data);
      } else {
        console.warn('Failed to fetch CRM summary:', summaryResult.reason || summaryResult.value?.error);
      }

      // Handle recent customers data
      if (customersResult.status === 'fulfilled' && customersResult.value?.success) {
        setRecentCustomers(customersResult.value.data || []);
        console.log('✅ Recent customers loaded:', customersResult.value.data?.length || 0, 'customers');
      } else {
        console.warn('Failed to fetch recent customers:', customersResult.reason || customersResult.value?.error);
      }

      // Handle pipeline data
      if (pipelineResult.status === 'fulfilled' && pipelineResult.value?.success) {
        setPipeline(pipelineResult.value.data || []);
        console.log('✅ Pipeline data loaded:', pipelineResult.value.data?.length || 0, 'stages');
      } else {
        console.warn('Failed to fetch pipeline data:', pipelineResult.reason || pipelineResult.value?.error);
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

  // Fetch AI todos
  const fetchAITodos = async () => {
    console.log('🤖 fetchAITodos called, setting loading to true');
    setAiLoading(true);
    setTodos([]); // Clear existing todos
    try {
      const userEmail = user?.email || 'admin@prelude.com';
      console.log('🤖 Fetching AI todos for user:', userEmail);

      const todosResult = await fetchCRMTodos(userEmail);
      console.log('🤖 AI todos result:', todosResult);

      if (todosResult?.success) {
        setTodos(todosResult.data || []);
        setAiAvailable(prev => ({ ...prev, todos: true }));
        setAiErrors(prev => ({ ...prev, todos: null }));
        console.log('✅ AI todos loaded:', todosResult.data?.length || 0, 'todos');
        console.log('✅ AI todos data:', todosResult.data);
      } else {
        console.warn('❌ Failed to fetch AI todos:', todosResult?.error);
        setTodos([]); // Ensure todos are cleared on failure
        // Show specific message for AI not available
        if (todosResult?.error === "AI not available") {
          console.warn('⚠️ AI service is not available for todos generation');
          setAiAvailable(prev => ({ ...prev, todos: false }));
          setAiErrors(prev => ({ ...prev, todos: todosResult?.message || "AI service is currently unavailable" }));
        } else {
          setAiAvailable(prev => ({ ...prev, todos: false }));
          setAiErrors(prev => ({ ...prev, todos: todosResult?.error || "Unknown error" }));
        }
      }

    } catch (error) {
      console.error('❌ Error fetching AI todos:', error);
      setTodos([]); // Ensure todos are cleared on error
    } finally {
      console.log('🤖 fetchAITodos completed, setting loading to false');
      setAiLoading(false);
    }
  };

  // Fetch communication suggestions
  const fetchCommSuggestions = async () => {
    console.log('💬 fetchCommSuggestions called, setting loading to true');
    setAiLoading(true);
    setCommunicationSuggestions([]); // Clear existing suggestions
    try {
      const userEmail = user?.email || 'admin@prelude.com';
      console.log('💬 Fetching communication suggestions for user:', userEmail);

      const suggestionsResult = await fetchCommunicationSuggestions(userEmail);
      console.log('💬 Communication suggestions result:', suggestionsResult);

      if (suggestionsResult?.success) {
        setCommunicationSuggestions(suggestionsResult.data || []);
        setAiAvailable(prev => ({ ...prev, communications: true }));
        setAiErrors(prev => ({ ...prev, communications: null }));
        console.log('✅ Communication suggestions loaded:', suggestionsResult.data?.length || 0, 'suggestions');
        console.log('✅ Communication suggestions data:', suggestionsResult.data);
      } else {
        console.warn('❌ Failed to fetch communication suggestions:', suggestionsResult?.error);
        setCommunicationSuggestions([]); // Ensure suggestions are cleared on failure
        // Show specific message for AI not available
        if (suggestionsResult?.error === "AI not available") {
          console.warn('⚠️ AI service is not available for communication suggestions');
          setAiAvailable(prev => ({ ...prev, communications: false }));
          setAiErrors(prev => ({ ...prev, communications: suggestionsResult?.message || "AI service is currently unavailable" }));
        } else {
          setAiAvailable(prev => ({ ...prev, communications: false }));
          setAiErrors(prev => ({ ...prev, communications: suggestionsResult?.error || "Unknown error" }));
        }
      }

    } catch (error) {
      console.error('❌ Error fetching communication suggestions:', error);
      setCommunicationSuggestions([]); // Ensure suggestions are cleared on error
    } finally {
      console.log('💬 fetchCommSuggestions completed, setting loading to false');
      setAiLoading(false);
    }
  };

  // Auto-load AI features when AI panel is opened
  useEffect(() => {
    console.log('🤖 useEffect triggered, showAIFeatures:', showAIFeatures, 'todos.length:', todos.length, 'suggestions.length:', communicationSuggestions.length);
    if (showAIFeatures && todos.length === 0 && communicationSuggestions.length === 0) {
      console.log('🤖 Auto-loading AI features...');
      // Auto-load both AI features when panel is first opened
      fetchAITodos();
      setTimeout(() => fetchCommSuggestions(), 500); // Slight delay to avoid overwhelming
    }
  }, [showAIFeatures]);

  // Load CRM data on component mount
  useEffect(() => {
    fetchCRMData();
  }, [user?.email]);

  // Handle suggestion click for email composition
  const handleSuggestionClick = (suggestion) => {
    console.log('💬 Opening email composer for suggestion:', suggestion);
    setSelectedSuggestion(suggestion);
    setIsEmailModalOpen(true);
  };

  // Handle email send
  const handleEmailSend = async (emailData) => {
    console.log('📧 Sending email:', emailData);
    // Here you would integrate with your email service
    // For now, just show a success message
    const preview = `Email sent successfully!\n\nTo: ${emailData.to}\nSubject: ${emailData.subject}\n\nMessage Preview:\n${emailData.body.substring(0, 200)}...`;
    alert(preview);
  };

  // Handle email modal close
  const handleEmailModalClose = () => {
    setIsEmailModalOpen(false);
    setSelectedSuggestion(null);
  };

  // Regenerate communication suggestions
  const regenerateSuggestions = async () => {
    console.log('🔄 Regenerating communication suggestions...');
    setCommunicationSuggestions([]); // Clear current suggestions
    await fetchCommSuggestions(); // Fetch new ones
  };

  // Regenerate AI todos
  const regenerateTodos = async () => {
    console.log('🔄 Regenerating AI todos...');
    setTodos([]); // Clear current todos
    await fetchAITodos(); // Fetch new ones
  };

  // Add todo to Action Items
  const addTodoToActionItems = async (todo) => {
    console.log('➕ Adding todo to Action Items:', todo);

    try {
      const userEmail = user?.email || 'admin@prelude.com';
      const result = await actionItemsService.addCRMTodoToActionItems(todo, userEmail);

      if (result.success) {
        const taskData = result.data;
        alert(`✅ Todo added to Action Items!\n\nTask: ${taskData.title}\nCustomer: ${taskData.metadata?.customerName || 'N/A'}\nDue: ${new Date(taskData.due).toLocaleDateString()}\nEstimated: ${taskData.metadata?.estimatedDuration || 'N/A'}`);
        console.log('✅ Todo successfully added to Action Items');
      } else {
        throw new Error(result.error || 'Failed to add todo');
      }

    } catch (error) {
      console.error('❌ Error adding todo to Action Items:', error);
      alert(`❌ Failed to add todo to Action Items.\n\nError: ${error.message}`);
    }
  };

  // Add all todos to Action Items
  const addAllTodosToActionItems = async () => {
    if (todos.length === 0) {
      alert('No todos available to add.');
      return;
    }

    const confirmed = confirm(`Add all ${todos.length} AI-generated todos to Action Items?`);
    if (!confirmed) return;

    try {
      const userEmail = user?.email || 'admin@prelude.com';
      console.log(`➕ Adding all ${todos.length} todos to Action Items...`);

      const result = await actionItemsService.bulkAddTodosToActionItems(todos, userEmail);

      if (result.success) {
        alert(`✅ Successfully added all ${result.added} todos to Action Items!`);
      } else {
        alert(`⚠️ Added ${result.added} todos, but ${result.errors} failed.\n\nCheck console for details.`);
        console.warn('Bulk add completed with errors:', result.errorDetails);
      }

    } catch (error) {
      console.error('❌ Error adding all todos to Action Items:', error);
      alert(`❌ Failed to add todos to Action Items.\n\nError: ${error.message}`);
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    if (typeof amount !== 'number') return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  // Format relative time
  const formatRelativeTime = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));

      if (diffInHours < 1) return 'Just now';
      if (diffInHours < 24) return `${diffInHours}h ago`;

      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 7) return `${diffInDays}d ago`;

      const diffInWeeks = Math.floor(diffInDays / 7);
      if (diffInWeeks < 4) return `${diffInWeeks}w ago`;

      return date.toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6 flex flex-col hover:shadow-md transition-shadow shadow-[0px_20px_92px_0px_rgba(0,0,0,0.03)]">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Brain className="w-5 h-5 text-blue-600" />
            CRM AI Assistant
          </h3>
            
            <div className="flex items-center gap-2">
              <Button
                onClick={() => {
                  console.log('🤖 AI button clicked, current state:', showAIFeatures);
                  const newState = !showAIFeatures;
                  setShowAIFeatures(newState);
                  setForceUpdate(prev => prev + 1); // Force re-render
                  console.log('🤖 AI button new state will be:', newState);
                }}
                variant={showAIFeatures ? "default" : "outline"}
                size="sm"
                className="px-3"
              >
                <Brain className="w-4 h-4 mr-1" />
                AI Features
              </Button>

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

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-1 h-6 w-6 bg-white border border-gray-200 rounded-full shadow-sm hover:shadow-md"
              >
                {isCollapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
              </Button>
            </div>
          </div>
          
          {/* Collapsed View */}
          {isCollapsed && (
            <div className="flex items-center justify-between text-sm text-muted-foreground mt-2">
              <span>
                {summary ?
                  `${summary.totalCustomers || 0} customers • ${formatCurrency(summary.totalARR || 0)} ARR` :
                  'AI-powered customer management and communication suggestions'
                }
              </span>
              <div className="flex items-center gap-2">
                {summary && (
                  <Badge variant="secondary" className="text-xs">
                    {summary.activeCustomers || 0} active
                  </Badge>
                )}
                {todos.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {todos.length} todos
                  </Badge>
                )}
                {communicationSuggestions.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {communicationSuggestions.length} suggestions
                  </Badge>
                )}
              </div>
            </div>
          )}

        {!isCollapsed && (
          <div className="space-y-6">
            {/* Error State */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                <div className="flex items-center gap-3 text-red-700 mb-3">
                  <AlertCircle className="w-5 h-5" />
                  <span className="text-sm font-semibold">Error loading CRM data</span>
                </div>
                <p className="text-sm text-red-600 mb-4">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchCRMData(true)}
                  className="border-red-300 text-red-700 hover:bg-red-100"
                >
                  Retry
                </Button>
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                <span className="ml-3 text-base text-slate-500">Loading CRM data...</span>
              </div>
            )}

            {/* CRM Summary Cards */}
            {!loading && summary && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                  className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-medium text-slate-600">Total Customers</h4>
                    <Users className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-slate-900">
                      {summary.totalCustomers || 0}
                    </span>
                    <span className="text-sm font-medium text-green-600">
                      +12% from last period
                    </span>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                  className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-medium text-slate-600">Active Customers</h4>
                    <TrendingUp className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-slate-900">
                      {summary.activeCustomers || 0}
                    </span>
                    <span className="text-sm font-medium text-green-600">
                      +8% from last period
                    </span>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 }}
                  className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-medium text-slate-600">Total ARR</h4>
                    <DollarSign className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-slate-900">
                      {formatCurrency(summary.totalARR || 0)}
                    </span>
                    <span className="text-sm font-medium text-green-600">
                      +15% from last period
                    </span>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.4 }}
                  className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-medium text-slate-600">Avg Health Score</h4>
                    <Target className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-slate-900">
                      {summary.avgHealthScore || 0}%
                    </span>
                    <span className="text-sm font-medium text-green-600">
                      +5% from last period
                    </span>
                  </div>
                </motion.div>
              </div>
            )}

            {/* Recent Customers */}
            {!loading && recentCustomers.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <Building className="w-5 h-5 text-slate-600" />
                    Recent Customers
                  </h3>
                  <Badge variant="secondary" className="text-xs">
                    {recentCustomers.length}
                  </Badge>
                </div>

                <div className="space-y-3">
                  {recentCustomers.slice(0, 3).map((customer, index) => (
                    <motion.div
                      key={customer.id || index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors border border-slate-100"
                    >
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Building className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-slate-900">{customer.company || 'Unknown Company'}</h4>
                        <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {customer.email || 'No email'}
                          </span>
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            {formatCurrency(customer.arr || 0)}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={`text-xs mb-1 ${
                          customer.status === 'active' ? 'bg-green-100 text-green-800' :
                          customer.status === 'inactive' ? 'bg-yellow-100 text-yellow-800' :
                          customer.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                          customer.status === 'lost' ? 'bg-red-100 text-red-800' :
                          'bg-slate-100 text-slate-800'
                        }`}>
                          {customer.status || 'unknown'}
                        </Badge>
                        <p className="text-xs text-slate-500">
                          {formatRelativeTime(customer.createdAt || customer.created_at)}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Customer Pipeline */}
            {!loading && pipeline.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <Target className="w-5 h-5 text-slate-600" />
                    Customer Pipeline
                  </h3>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {pipeline.map((stage, index) => (
                    <motion.div
                      key={stage.status || index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="text-center p-4 bg-slate-50 rounded-lg border border-slate-100 hover:bg-slate-100 transition-colors"
                    >
                      <p className="text-2xl font-bold text-slate-900 mb-1">{stage.count || 0}</p>
                      <p className="text-sm font-medium text-slate-600 capitalize">{stage.status || 'Unknown'}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Features Section */}
            {console.log('🎨 Rendering AI Features Section, showAIFeatures:', showAIFeatures, 'forceUpdate:', forceUpdate)}
            {showAIFeatures && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <Brain className="w-5 h-5 text-blue-600" />
                    AI Features
                  </h3>
                </div>

                {/* AI Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <Button
                    onClick={fetchAITodos}
                    disabled={aiLoading}
                    variant="outline"
                    size="default"
                    className="h-12 justify-start"
                  >
                    {aiLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin mr-3" />
                    ) : (
                      <CheckSquare className="w-5 h-5 mr-3" />
                    )}
                    Generate AI Todos
                  </Button>
                  <Button
                    onClick={fetchCommSuggestions}
                    disabled={aiLoading}
                    variant="outline"
                    size="default"
                    className="h-12 justify-start"
                  >
                    {aiLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin mr-3" />
                    ) : (
                      <MessageSquare className="w-5 h-5 mr-3" />
                    )}
                    Communication Tips
                  </Button>
                </div>

                {/* AI Todos */}
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                      <CheckSquare className="w-5 h-5 text-slate-600" />
                      AI Generated Todos
                      {todos.length > 0 && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {todos.length}
                        </Badge>
                      )}
                    </h4>
                    <div className="flex items-center gap-2">
                      {todos.length > 0 && (
                        <Button
                          onClick={addAllTodosToActionItems}
                          disabled={aiLoading}
                          variant="default"
                          size="sm"
                          className="px-3 bg-blue-600 hover:bg-blue-700"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add All
                        </Button>
                      )}
                      <Button
                        onClick={regenerateTodos}
                        disabled={aiLoading}
                        variant="outline"
                        size="sm"
                        className="px-3"
                      >
                        {aiLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RotateCcw className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {todos.length > 0 ? (
                    <div className="space-y-3">
                      {todos.slice(0, 4).map((todo, index) => (
                        <motion.div
                          key={todo.id || index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-start gap-4 p-4 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors group"
                        >
                          <div className={`w-3 h-3 rounded-full mt-2 ${
                            todo.priority === 'high' ? 'bg-red-500' :
                            todo.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                          }`} />
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-slate-900">{todo.text}</p>
                            <p className="text-xs text-slate-500 mt-1">
                              {todo.customerName || todo.customer_name} • {todo.estimatedDuration || todo.estimated_duration}
                            </p>
                            {todo.description && (
                              <p className="text-xs text-slate-400 mt-2">{todo.description}</p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <div className="flex items-center gap-2">
                              {todo.dueDate && (
                                <p className="text-xs text-slate-500">{formatDate(todo.dueDate)}</p>
                              )}
                              <Badge className={`text-xs ${
                                todo.priority === 'high' ? 'bg-red-100 text-red-800' :
                                todo.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {todo.priority}
                              </Badge>
                            </div>
                            <Button
                              onClick={() => addTodoToActionItems(todo)}
                              size="sm"
                              variant="outline"
                              className="opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 h-6 text-xs"
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Add to Tasks
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : !aiAvailable.todos && aiErrors.todos ? (
                    <div className="text-center py-8 text-red-500">
                      <AlertCircle className="w-12 h-12 mx-auto mb-3 text-red-300" />
                      <p className="text-sm font-semibold mb-2">AI Not Available</p>
                      <p className="text-xs text-red-400">{aiErrors.todos}</p>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      <CheckSquare className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      <p className="text-sm">Click "Generate AI Todos" to get intelligent task suggestions</p>
                    </div>
                  )}
                </div>

                {/* Communication Suggestions */}
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-slate-600" />
                      Communication Suggestions
                      {communicationSuggestions.length > 0 && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {communicationSuggestions.length}
                        </Badge>
                      )}
                    </h4>
                    <Button
                      onClick={regenerateSuggestions}
                      disabled={aiLoading}
                      variant="outline"
                      size="sm"
                      className="px-3"
                    >
                      {aiLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RotateCcw className="w-4 h-4" />
                      )}
                    </Button>
                  </div>

                  {communicationSuggestions.length > 0 ? (
                    <div className="space-y-3">
                      {communicationSuggestions.slice(0, 3).map((suggestion, index) => (
                        <motion.div
                          key={suggestion.id || index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="p-4 bg-white rounded-lg border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer group"
                          onClick={() => handleSuggestionClick(suggestion)}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Badge className={`text-xs ${
                                suggestion.priority === 'high' ? 'bg-red-100 text-red-800' :
                                suggestion.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {suggestion.type}
                              </Badge>
                              <span className="text-xs text-slate-500">{suggestion.customer_name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-xs text-green-600 font-semibold">
                                {suggestion.estimated_response_rate}
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-6 w-6"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSuggestionClick(suggestion);
                                }}
                              >
                                <Send className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                          <p className="text-sm font-semibold text-slate-900 mb-2">{suggestion.suggestion}</p>
                          <p className="text-xs text-slate-600 mb-3">{suggestion.reason}</p>
                          {suggestion.template && (
                            <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-700 mb-3 border-l-4 border-blue-400">
                              <strong className="text-slate-900">Template:</strong> {suggestion.template}
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            <div className="text-xs text-slate-500 flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              Best time: {suggestion.best_time}
                            </div>
                            <div className="text-xs text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                              Click to compose email
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : !aiAvailable.communications && aiErrors.communications ? (
                    <div className="text-center py-8 text-red-500">
                      <AlertCircle className="w-12 h-12 mx-auto mb-3 text-red-300" />
                      <p className="text-sm font-semibold mb-2">AI Not Available</p>
                      <p className="text-xs text-red-400">{aiErrors.communications}</p>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      <MessageSquare className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      <p className="text-sm">Click "Communication Tips" to get personalized suggestions</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Default state when AI features are not shown */}
            {!showAIFeatures && !loading && !summary && !error && (
              <div className="text-center py-12 text-slate-500">
                <Brain className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <h4 className="text-lg font-semibold text-slate-700 mb-2">AI-powered customer management assistant</h4>
                <p className="text-sm text-slate-500">Click "AI Features" to access intelligent todos and communication suggestions</p>
              </div>
            )}

            {/* Empty State for CRM Data */}
            {!loading && !summary && !error && (
              <div className="text-center py-12 text-slate-500">
                <Users className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <h4 className="text-lg font-semibold text-slate-700 mb-2">No CRM data available</h4>
                <p className="text-sm text-slate-500 mb-4">Connect your CRM to see customer insights and AI recommendations</p>
                <Button
                  variant="outline"
                  size="default"
                  onClick={() => fetchCRMData(true)}
                  className="px-6"
                >
                  Load CRM Data
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Email Composer Modal */}
        <EmailComposerModal
          isOpen={isEmailModalOpen}
          onClose={handleEmailModalClose}
          suggestion={selectedSuggestion}
          onSend={handleEmailSend}
        />
      </div>
    </motion.div>
  );
};

export default CRMAIFeatures;
