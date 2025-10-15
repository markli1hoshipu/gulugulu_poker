import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import UnifiedHeader from '../common/header/UnifiedHeader';
import UnifiedToolbar from '../common/toolbar/UnifiedToolbar';

import {
  Users,
  Mail,
  Building,
  Calendar,
  User,
  DollarSign,
  TrendingUp,
  Zap,
  Plus,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  X,
  Activity,
  BarChart3,
  PieChart,
  UserCheck,
  MessageSquare,
  ShieldCheck,
  AlertCircle,
  Mic,
  Upload,
  Settings,
  Database,
  Bell,
  Gift,
  Brain,
  TrendingUp as TrendingUpIcon,
  Trash2,
  Clock,
  Home,
  FileText,
  Contact,
  Phone,
  MapPin,
  Globe,
  MessageCircle,
  ThumbsUp,
  Reply,
  Download,
  Eye,
  Sparkles,
  Send,
  Edit3,
  Copy,
  Building2,
  Search,
  ChevronDown,
  ChevronUp,
  Check,
  MoreVertical
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import EmailComposer from './EmailComposer';
import CustomerProfileDisplay from './CustomerProfileDisplay';
import DatabaseVisualization from './DatabaseVisualization';
import EditableDealsTable from './EditableDealsTable';
import EditableCustomerTable from './EditableCustomerTable';
import FilterDropdown from './FilterDropdown';
import ColumnSelector from '../lead-gen/ColumnSelector';
import SearchBarWithColumns from './SearchBarWithColumns';
import CustomerCsvUpload from './CustomerCsvUpload';
import { useAuth } from '../../auth/hooks/useAuth';
import { useCRM } from '../../contexts/CRMContext';
// import analyticsApiService from '../../services/analyticsApiService';

const CustomerRelationshipManagement = ({ wsConnection }) => {
  const { authFetch, isAuthenticated } = useAuth();

  // Get data from CRM context
  const {
    customers,
    customersLoading,
    customersError,
    refreshCustomers,
    addCustomer: contextAddCustomer,
    deleteCustomer: contextDeleteCustomer,
    employees,
    employeesLoading,
    analyticsInsights,
    insightsLoading,
    insightsError,
    refreshAnalytics,
    CRM_API_BASE_URL,
    loadCustomers,
    loadEmployees,
    isInitialized
  } = useCRM();

  // Tab state
  const [activeTab, setActiveTab] = useState('customer-management');

  // Local UI state only
  const [searchTerm, setSearchTerm] = useState('');
  const [searchColumns, setSearchColumns] = useState({
    company: true,
    primaryContact: true,
    email: true,
    industry: true,
    phone: false,
    status: false,
    notes: false
  });
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterHealthScore, setFilterHealthScore] = useState('all');
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [customerToAssign, setCustomerToAssign] = useState(null);
  const [showARR, setShowARR] = useState(true);
  const [showAutomationDetails, setShowAutomationDetails] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showCustomerProfile, setShowCustomerProfile] = useState(false);
  const [showDatabaseVisualization, setShowDatabaseVisualization] = useState(false);
  const [showEmailComposer, setShowEmailComposer] = useState(false);
  const [emailCustomer, setEmailCustomer] = useState(null);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [showCsvUpload, setShowCsvUpload] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showSearchColumnDropdown, setShowSearchColumnDropdown] = useState(false);
  const [columnFilters, setColumnFilters] = useState({});
  const [showAddCustomersDropdown, setShowAddCustomersDropdown] = useState(false);
  const [showMoreOptionsDropdown, setShowMoreOptionsDropdown] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    company: true,
    primaryContact: true,
    email: false,
    phone: false,
    industry: false,
    status: true,
    churnRisk: true,
    lifetimeValue: false,
    upsellPotential: false,
    lastContactDate: false
  });

  // New state for Main tab

  // Customer Management modal state
  const [showModal, setShowModal] = useState(false);
  const [modalCustomer, setModalCustomer] = useState(null);
  const [modalActiveTab, setModalActiveTab] = useState("overview");
  const [sortBy, setSortBy] = useState('company');
  const [sortOrder, setSortOrder] = useState('asc');

  // Activity timeline state
  const [customerInteractions, setCustomerInteractions] = useState([]);
  const [loadingInteractions, setLoadingInteractions] = useState(false);

  // Customer summary state (like CustomerProfileDisplay)
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState('');
  const [generatedSummaries, setGeneratedSummaries] = useState({});
  const [summaryPeriod, setSummaryPeriod] = useState(30); // Default 30 days

  // Dropdown refs for click outside handling
  const addCustomersDropdownRef = React.useRef(null);
  const moreOptionsDropdownRef = React.useRef(null);

  // Email form state
  const [emailForm, setEmailForm] = useState({
    to: '',
    subject: '',
    message: '',
    emailType: 'cold_outreach',
    generatedEmail: null,
    editMode: false,
    editedSubject: '',
    editedBody: ''
  });
  const [isEmailSending, setIsEmailSending] = useState(false);

  // Gmail sync state
  const [emailSyncLoading, setEmailSyncLoading] = useState(false);
  const [emailSyncProgress, setEmailSyncProgress] = useState(null);
  const [emailSyncError, setEmailSyncError] = useState(null);
  const [showEmailSyncNotification, setShowEmailSyncNotification] = useState(false);

  // Calendar reminders state
  const [calendarReminders, setCalendarReminders] = useState([
    { id: 1, title: 'John Smith Birthday', date: '2024-01-15', type: 'birthday', customer: 'John Smith', priority: 'high' },
    { id: 2, title: 'New Year Follow-up', date: '2024-01-02', type: 'holiday', customer: 'TechCorp', priority: 'medium' },
    { id: 3, title: 'Q1 Business Review', date: '2024-02-01', type: 'meeting', customer: 'DataFlow Inc', priority: 'high' },
    { id: 4, title: 'Valentine\'s Day Promo', date: '2024-02-14', type: 'holiday', customer: 'All Customers', priority: 'low' },
    { id: 5, title: 'Contract Renewal Discussion', date: '2024-01-30', type: 'renewal', customer: 'ABC Corp', priority: 'high' }
  ]);

  // Analytics state is now managed by context

  // Track if CRM has been initialized
  const [crmInitialized, setCrmInitialized] = useState(false);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (addCustomersDropdownRef.current && !addCustomersDropdownRef.current.contains(event.target)) {
        setShowAddCustomersDropdown(false);
      }
      if (moreOptionsDropdownRef.current && !moreOptionsDropdownRef.current.contains(event.target)) {
        setShowMoreOptionsDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load CRM data on first mount - now relies on context pre-loading
  useEffect(() => {
    if (!crmInitialized && isInitialized) {
      console.log('Checking if CRM data needs initialization...');

      // Only load if data is not already cached (context will handle caching)
      // This ensures data loads if context hasn't pre-loaded yet
      Promise.all([
        loadCustomers(false), // Will use cache if valid
        loadEmployees(false)   // Will use cache if valid
      ]).then(() => {
        setCrmInitialized(true);
        console.log('CRM data ready (from cache or fresh load)');
      }).catch(error => {
        console.error('Error ensuring CRM data:', error);
        setCrmInitialized(true); // Mark as initialized even on error to prevent retry loops
      });
    }
  }, [crmInitialized, isInitialized, loadCustomers, loadEmployees]);

  // Track analytics for CRM module visit
  // useEffect(() => {
  //   analyticsApiService.trackModuleVisit('CRM Dashboard', ['view_customers']);
    
  //   return () => {
  //     analyticsApiService.updateModuleTimeSpent('CRM Dashboard');
  //   };
  // }, []);

  // Tab configuration
  const tabs = [
    { id: 'customer-management', label: 'Customer Management', icon: Users },
    { id: 'deals', label: 'Deals', icon: DollarSign }
  ];

  // Helper function to get employee by ID
  const getEmployeeById = (employeeId) => {
    return employees.find(emp => emp.id === employeeId);
  };

  // Handle column visibility toggle
  const handleColumnToggle = (columnId, isVisible) => {
    setVisibleColumns(prev => ({
      ...prev,
      [columnId]: isVisible
    }));
  };

  // Add function to generate analytics insights
  const generateAnalyticsInsights = async () => {
    if (analyticsInsights && !insightsError) {
      // Use cached insights from context
      return;
    }
    refreshAnalytics();
  };

  // Manual refresh function for testing
  const handleRefreshData = () => {
    refreshCustomers();
  };

  // Add customer function
  const handleAddCustomer = async (customerData) => {
    setIsAddingCustomer(true);
    try {
      const result = await contextAddCustomer(customerData);
      if (result.success) {
        setShowAddCustomerModal(false);
        // Show success message or notification here if needed
      } else {
        console.error('Failed to add customer:', result.error);
        // Handle error - show notification to user
      }
    } catch (error) {
      console.error('Error adding customer:', error);
      // Handle error - show notification to user
    } finally {
      setIsAddingCustomer(false);
    }
  };

  // Handle CSV import completion
  const handleCsvImportComplete = (importResult) => {
    setShowCsvUpload(false);
    // Refresh customer data to show newly imported customers
    refreshCustomers();
    // Could show a success notification with import stats here
    console.log('CSV import completed:', importResult);
  };

  // Fetch customer interactions from API
  const fetchCustomerInteractions = async () => {
    if (!modalCustomer?.id) return;

    setLoadingInteractions(true);
    try {
      const response = await authFetch(`${CRM_API_BASE_URL}/api/crm/customers/${modalCustomer.id}/interactions`);
      if (response.ok) {
        const interactions = await response.json();
        setCustomerInteractions(interactions);
      }
    } catch (err) {
      console.error('Error fetching interactions:', err);
    } finally {
      setLoadingInteractions(false);
    }
  };

  // Generate customer-specific interaction summary (like CustomerProfileDisplay)
  const handleGenerateSummary = async () => {
    if (!modalCustomer?.id) return;

    setIsGeneratingSummary(true);
    setSummaryError('');

    try {
      const response = await authFetch(`${CRM_API_BASE_URL}/api/crm/generate-interaction-summary/${modalCustomer.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          days_back: summaryPeriod
        })
      });

      const data = await response.json();
      if (response.ok) {
        setGeneratedSummaries(prev => ({
          ...prev,
          [modalCustomer.id]: data
        }));
      } else {
        setSummaryError('Failed to generate interaction summary');
      }
    } catch (err) {
      console.error('Error:', err);
      setSummaryError('Error connecting to server');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  // Load analytics insights when component mounts
  useEffect(() => {
    if (showDatabaseVisualization) {
      generateAnalyticsInsights();
    }
  }, [showDatabaseVisualization]);

  // Convert recent activities and interactions to timeline format
  const getTimelineEvents = () => {
    const events = [];

    if (modalCustomer?.recentActivities && Array.isArray(modalCustomer.recentActivities)) {
      modalCustomer.recentActivities.forEach((activity) => {
        const eventDate = activity.date || activity.createdAt || new Date().toISOString();
        if (eventDate) {
          events.push({
            type: 'activity',
            title: activity.title || activity.type || 'Customer Activity',
            description: activity.description || activity.content || '',
            date: eventDate
          });
        }
      });
    }

    if (modalCustomer?.timeline && Array.isArray(modalCustomer.timeline)) {
      modalCustomer.timeline.forEach((item) => {
        if (item.date && item.title) {
          events.push({
            type: item.type || 'activity',
            title: item.title,
            description: item.description || '',
            date: item.date
          });
        }
      });
    }

    customerInteractions.forEach(interaction => {
      if (interaction.createdAt && interaction.type) {
        events.push({
          type: interaction.type === 'email' ? 'note' : 'meeting',
          title: interaction.theme || `${interaction.type.toUpperCase()}: ${interaction.employeeName || 'Team Member'}`,
          description: interaction.content || '',
          date: interaction.createdAt,
          source: interaction.source
        });
      }
    });

    // Filter out events with invalid dates and sort
    return events
      .filter(event => event.date && !isNaN(new Date(event.date).getTime()))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  // Fetch customer interactions when modalCustomer changes
  useEffect(() => {
    if (modalCustomer && modalCustomer.id) {
      fetchCustomerInteractions();
    }
  }, [modalCustomer?.id]);

  const getStatusColor = (status) => {
    const colors = {
      'active': 'bg-green-100 text-green-800',
      'inactive': 'bg-yellow-100 text-yellow-800',
      'completed': 'bg-blue-100 text-blue-800',
      'lost': 'bg-red-100 text-red-800',
      'at-risk': 'bg-red-100 text-red-800',
      'renewal-pending': 'bg-yellow-100 text-yellow-800',
      'churned': 'bg-gray-100 text-gray-800',
      'expansion-opportunity': 'bg-blue-100 text-blue-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getHealthScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getChurnRiskColor = (risk) => {
    const colors = {
      'low': 'bg-green-100 text-green-800',
      'medium': 'bg-yellow-100 text-yellow-800',
      'high': 'bg-red-100 text-red-800'
    };
    return colors[risk] || 'bg-gray-100 text-gray-800';
  };



  const getReminderTypeIcon = (type) => {
    const icons = {
      'birthday': Gift,
      'holiday': Calendar,
      'meeting': Users,
      'renewal': RefreshCw,
      'check-in': UserCheck,
      'checkin': UserCheck, // alias for check-in
      'follow-up': MessageSquare,
      'followup': MessageSquare, // alias for follow-up
      'support': AlertTriangle,
      'expansion': TrendingUp,
      'onboarding': User,
      'risk-management': ShieldCheck,
      'riskmanagement': ShieldCheck // alias for risk-management
    };
    return icons[type] || Bell;
  };

  const filteredCustomers = customers.filter(customer => {
    const matchesStatus = filterStatus === 'all' || customer.status === filterStatus;
    const matchesHealthScore = filterHealthScore === 'all' ||
      (filterHealthScore === 'high' && customer.healthScore >= 80) ||
      (filterHealthScore === 'medium' && customer.healthScore >= 50 && customer.healthScore < 80) ||
      (filterHealthScore === 'low' && customer.healthScore < 50);
    const assignedEmployee = getEmployeeById(customer.assignedEmployeeId);
    const searchString = (searchTerm || '').toLowerCase();
    const matchesSearch = customer.company.toLowerCase().includes(searchString) ||
                         customer.primaryContact.toLowerCase().includes(searchString) ||
                         (assignedEmployee && assignedEmployee.name.toLowerCase().includes(searchString));
    return matchesStatus && matchesHealthScore && matchesSearch;
  });

  // Sorted customers for Customer Management tab
  const sortedCustomers = useMemo(() => {
    if (activeTab !== 'customer-management' || !filteredCustomers || filteredCustomers.length === 0) return [];

    return [...filteredCustomers].sort((a, b) => {
      let aValue = '';
      let bValue = '';

      switch (sortBy) {
        case 'company':
          aValue = a.company || '';
          bValue = b.company || '';
          break;
        case 'contact':
          aValue = a.primaryContact || '';
          bValue = b.primaryContact || '';
          break;
        case 'email':
          aValue = a.email || '';
          bValue = b.email || '';
          break;
        case 'lastInteraction':
          aValue = a.lastContact || '';
          bValue = b.lastContact || '';
          break;
        case 'healthScore':
          aValue = a.healthScore || 0;
          bValue = b.healthScore || 0;
          break;
        case 'dateAdded':
          aValue = a.createdAt || '';
          bValue = b.createdAt || '';
          break;
        default:
          aValue = a.company || '';
          bValue = b.company || '';
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }

      const comparison = String(aValue).localeCompare(String(bValue));
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [activeTab, filteredCustomers, sortBy, sortOrder]);

  const handleCustomerClick = (customer) => {
    setSelectedCustomer(customer);
    setShowCustomerProfile(true);
  };

  const handleExportData = async () => {
    try {
              const response = await fetch(`${CRM_API_BASE_URL}/api/crm/export-customers`);
      if (!response.ok) {
        throw new Error('Export failed');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const contentDisposition = response.headers.get('content-disposition');
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1]
        : 'customer_data.csv';
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  const handleAssignEmployee = (customer) => {
    setCustomerToAssign(customer);
    setShowAssignmentModal(true);
  };

  const confirmAssignment = async (employeeId) => {
    const employee = employees.find(emp => emp.id === employeeId);
    if (employee && customerToAssign) {
      // Update locally for optimistic UI update
      // The actual update should be sent to the backend through an API call
      // For now, we'll just refresh the customers list after assignment
      try {
        // TODO: Add API call to update customer assignment
        await refreshCustomers();
        setShowAssignmentModal(false);
        setCustomerToAssign(null);
      } catch (error) {
        console.error('Failed to assign employee:', error);
      }
    }
  };

  const handleViewAutomationDetails = (customer) => {
    setSelectedCustomer(customer);
    setShowAutomationDetails(true);
  };

  const handleSendEmail = (customer) => {
    setEmailCustomer(customer);
    setShowEmailComposer(true);
  };

  const handleEmailSent = (emailData) => {
    console.log('Email sent:', emailData);
  };


  // Email sync function (uses current auth provider)
  const handleEmailSync = async () => {
    setEmailSyncLoading(true);
    setEmailSyncError(null);
    setEmailSyncProgress({ status: 'Starting sync...', percentage: 0 });

    try {
      // Get the auth provider from login
      const authProvider = localStorage.getItem('auth_provider');
      console.log('Email sync with auth provider:', authProvider);

      if (!authProvider) {
        throw new Error('Please log in with Google or Microsoft to enable email sync.');
      }

      // Use only the provider that matches login
      const providerKey = authProvider === 'google' ? 'google' : 'microsoft';
      const accessToken = localStorage.getItem(`${providerKey}_access_token`);
      const userEmail = localStorage.getItem(`${providerKey}_user_email`);

      console.log('Email sync token check:', {
        authProvider,
        providerKey,
        hasToken: !!accessToken,
        userEmail,
        tokenPreview: accessToken ? `${accessToken.substring(0, 10)}...` : null
      });

      if (!accessToken || accessToken === 'undefined' || accessToken === 'null') {
        throw new Error(`Please log in with ${authProvider === 'google' ? 'Google' : 'Microsoft'} to enable email sync.`);
      }

      if (!userEmail) {
        throw new Error('Email address not available. Please log in again.');
      }

      const provider = authProvider === 'google' ? 'gmail' : 'outlook';

      setEmailSyncProgress({
        status: `Connecting to ${provider === 'gmail' ? 'Gmail' : 'Outlook'}...`,
        percentage: 25
      });

      // Use regular fetch instead of authFetch to avoid automatic logout on 401
      const idToken = localStorage.getItem('id_token');
      console.log('Authentication check:', {
        hasIdToken: !!idToken,
        idTokenValue: idToken?.substring(0, 20) + '...',
        provider,
        endpoint: `${CRM_API_BASE_URL}/api/crm/${provider === 'gmail' ? 'gmail/sync' : 'outlook/sync'}`
      });

      if (!idToken) {
        // Check if user has any auth tokens
        const hasGoogleToken = !!localStorage.getItem('google_access_token');
        const hasOutlookToken = !!localStorage.getItem('outlook_access_token');

        if (hasGoogleToken || hasOutlookToken) {
          throw new Error('You are connected to email but not logged into the main app. Please log in to Prelude first, then try syncing emails.');
        } else {
          throw new Error('Not authenticated. Please log in to Prelude first.');
        }
      }

      setEmailSyncProgress({ status: 'Syncing emails...', percentage: 50 });

      const endpoint = provider === 'gmail' ? 'gmail/sync' : 'outlook/sync';
      const response = await fetch(`${CRM_API_BASE_URL}/api/crm/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          access_token: accessToken,
          include_body: true,
          include_sent: true,
          include_received: true
        })
      });

      if (response.ok) {
        const data = await response.json();

        // Individual sync completes immediately (no job monitoring needed)
        setEmailSyncProgress({
          status: `Successfully synced ${data.emails_synced || 0} emails!`,
          percentage: 100,
          complete: true,
          emailsSynced: data.emails_synced || 0,
          totalEmails: data.total_emails_synced || 0
        });

        // Show success notification
        setShowEmailSyncNotification(true);

        // Auto-hide notification after 5 seconds
        setTimeout(() => {
          setShowEmailSyncNotification(false);
          setEmailSyncProgress(null);
        }, 5000);

      } else {
        let errorMessage = 'Failed to sync emails';
        console.error('Email sync failed:', {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries())
        });

        if (response.status === 404) {
          errorMessage = 'Gmail sync service not available. Please restart the CRM service.';
        } else if (response.status === 401) {
          try {
            const errorData = await response.json();
            console.error('401 Error details:', errorData);

            // Check if it's a Gmail token expiration
            if (errorData.detail && errorData.detail.includes('Gmail access token expired')) {
              errorMessage = '⏰ Your Gmail access has expired. Please log out and log back in with Google to refresh your access.';
            } else if (errorData.detail && errorData.detail !== 'Not authenticated') {
              errorMessage = errorData.detail;
            } else {
              const hasIdToken = !!localStorage.getItem('id_token');
              const hasEmailToken = !!localStorage.getItem('google_access_token') || !!localStorage.getItem('outlook_access_token');

              if (!hasIdToken && hasEmailToken) {
                errorMessage = 'You need to log in to the main Prelude app first. After logging in, you can sync your emails.';
              } else if (!hasIdToken) {
                errorMessage = 'Session expired. Please log in to Prelude again.';
              } else {
                errorMessage = '⏰ Your email access has expired. Please log out and log back in to refresh your access.';
              }
            }
          } catch (e) {
            console.error('Could not parse error response:', e);
            errorMessage = '⏰ Your email access has expired. Please log out and log back in to refresh your access.';
          }
        } else if (response.status === 500) {
          errorMessage = 'Server error. Please try again later.';
        } else {
          try {
            const data = await response.json();
            errorMessage = data.detail || errorMessage;
          } catch {}
        }
        throw new Error(errorMessage);
      }
    } catch (err) {
      setEmailSyncError(err.message || 'Error syncing emails');
      setEmailSyncProgress(null);
      console.error('Error syncing emails:', err);
    } finally {
      setEmailSyncLoading(false);
      // Clear progress after 3 seconds if there was an error
      if (emailSyncError) {
        setTimeout(() => setEmailSyncProgress(null), 3000);
      }
    }
  };

  const monitorTeamSyncProgress = async (provider, jobId) => {
    const pollInterval = 2000; // Poll every 2 seconds
    const maxPolls = 150; // Max 5 minutes (150 * 2 seconds)
    let pollCount = 0;
    
    const poll = async () => {
      try {
        const idToken = localStorage.getItem('id_token');
        if (!idToken) {
          throw new Error('Authentication token not available');
        }
        
        const endpoint = provider === 'gmail' ? 'gmail/team-status' : 'outlook/team-status';
        const response = await fetch(`${CRM_API_BASE_URL}/api/crm/${endpoint}/${jobId}`, {
          headers: {
            'Authorization': `Bearer ${idToken}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          
          setEmailSyncProgress(prev => ({
            ...prev,
            status: data.status || 'Processing team emails...',
            percentage: Math.min(data.progress_percentage || prev?.percentage || 10, 100),
            processedEmployees: data.processed_employees || 0,
            totalEmployees: data.total_employees || prev?.employeeCount || 0,
            currentEmployee: data.current_employee,
            emailsSynced: data.total_emails_synced || 0
          }));
          
          // Check if sync is complete
          if (data.status === 'completed' || data.progress_percentage >= 100) {
            setEmailSyncLoading(false);
            setEmailSyncProgress({
              status: `Team sync completed! Synced ${data.total_emails_synced || 0} emails across ${data.total_employees || 0} employees.`,
              percentage: 100,
              complete: true,
              emailsSynced: data.total_emails_synced || 0,
              totalEmails: data.total_emails_synced || 0
            });
            
            // Show success notification
            setShowEmailSyncNotification(true);
            
            // Clear progress after 5 seconds
            setTimeout(() => {
              setShowEmailSyncNotification(false);
              setEmailSyncProgress(null);
            }, 5000);
            return;
          }
          
          // Check if sync failed
          if (data.status === 'failed' || data.status === 'error') {
            throw new Error(data.error_message || 'Team sync failed');
          }
          
          // Continue polling if still in progress
          if (pollCount < maxPolls && emailSyncLoading) {
            pollCount++;
            setTimeout(poll, pollInterval);
          } else if (pollCount >= maxPolls) {
            throw new Error('Team sync monitoring timed out');
          }
          
        } else {
          throw new Error(`Failed to get sync status: ${response.status}`);
        }
        
      } catch (err) {
        console.error('Error monitoring team sync progress:', err);
        setEmailSyncError(err.message || 'Error monitoring team sync progress');
        setEmailSyncLoading(false);
        // Clear progress after 3 seconds on error
        setTimeout(() => {
          setEmailSyncProgress(null);
        }, 3000);
      }
    };
    
    // Start polling
    setTimeout(poll, pollInterval);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';

    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return 'Invalid Date';
    }

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(parsedDate);
  };


  // Database Tab Content (existing functionality)
  const renderDatabaseTab = () => (
    <div className="h-full flex">
      {/* Customer List */}
      <div className={`${showCustomerProfile ? 'w-1/2' : 'w-full'} border-r overflow-y-auto`}>
        <div className="p-4">
          {/* Unified Toolbar with Search and Filters */}
          <div className="mb-4">
            <UnifiedToolbar
              config={{
                primaryAction: null,
                search: null,
                filters: [
                  {
                    id: 'customer-filters',
                    icon: 'filter',
                    label: 'Filters',
                    title: 'Filter & Sort Customers',
                    hasActiveFilters: filterStatus !== 'all' || filterHealthScore !== 'all',
                    content: ({ onClose }) => (
                      <div className="space-y-6">
                        {/* Status Filter Section */}
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-3">Filter by Status</h4>
                          <div className="grid grid-cols-2 gap-2">
                            <label className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-gray-50">
                              <input
                                type="radio"
                                name="status-filter"
                                value="all"
                                checked={filterStatus === 'all'}
                                onChange={() => setFilterStatus('all')}
                                className="text-pink-600"
                              />
                              <span className="text-sm text-gray-700 font-medium">All Status</span>
                            </label>
                            {[
                              { value: 'active', label: 'Active' },
                              { value: 'at-risk', label: 'At Risk' },
                              { value: 'renewal-pending', label: 'Renewal Pending' }
                            ].map((option) => (
                              <label key={option.value} className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-gray-50">
                                <input
                                  type="radio"
                                  name="status-filter"
                                  value={option.value}
                                  checked={filterStatus === option.value}
                                  onChange={() => setFilterStatus(option.value)}
                                  className="text-pink-600"
                                />
                                <span className="text-sm text-gray-700">{option.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        {/* Health Score Filter Section */}
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-3">Filter by Health Score</h4>
                          <div className="grid grid-cols-2 gap-2">
                            <label className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-gray-50">
                              <input
                                type="radio"
                                name="health-score-filter"
                                value="all"
                                checked={filterHealthScore === 'all'}
                                onChange={() => setFilterHealthScore('all')}
                                className="text-pink-600"
                              />
                              <span className="text-sm text-gray-700 font-medium">All Health Scores</span>
                            </label>
                            {[
                              { value: 'high', label: 'High (80+)' },
                              { value: 'medium', label: 'Medium (50-79)' },
                              { value: 'low', label: 'Low (<50)' }
                            ].map((option) => (
                              <label key={option.value} className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-gray-50">
                                <input
                                  type="radio"
                                  name="health-score-filter"
                                  value={option.value}
                                  checked={filterHealthScore === option.value}
                                  onChange={() => setFilterHealthScore(option.value)}
                                  className="text-pink-600"
                                />
                                <span className="text-sm text-gray-700">{option.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        {/* Reset Button */}
                        <div className="pt-3 border-t border-gray-200 flex justify-end">
                          <button
                            onClick={() => {
                              setFilterStatus('all');
                              setFilterHealthScore('all');
                              onClose();
                            }}
                            className="text-sm text-pink-600 hover:text-pink-800 font-medium"
                          >
                            Reset filters
                          </button>
                        </div>
                      </div>
                    )
                  }
                ],
                themeColor: 'pink'
              }}
            />
          </div>

          {/* Customer List */}
          <div className="space-y-2">
            {filteredCustomers.map(customer => (
              <div
                key={customer.id}
                onClick={() => handleCustomerClick(customer)}
                className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                  selectedCustomer?.id === customer.id
                    ? 'border-purple-600 bg-purple-50'
                    : 'hover:border-gray-300'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{customer.company}</h3>
                    <div className="text-sm text-gray-600">{customer.primaryContact}</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm ${getHealthScoreColor(customer.healthScore)}`}>
                      {customer.healthScore}% Health
                    </div>
                    <div className={`text-xs px-2 py-1 rounded-full mt-1 ${getStatusColor(customer.status)}`}>
                      {customer.status.charAt(0).toUpperCase() + customer.status.slice(1)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Customer Profile */}
      {showCustomerProfile && selectedCustomer && (
        <div className="w-1/2 overflow-y-auto">
          <CustomerProfileDisplay
            customer={selectedCustomer}
            isOpen={showCustomerProfile}
            onClose={() => {
              setShowCustomerProfile(false);
              setSelectedCustomer(null);
            }}
          />
        </div>
      )}
    </div>
  );

  // Customer Management Tab Content (adapted from Database Tab)
  const renderCustomerManagementTab = () => {
    const handleCustomerModalClick = (customer) => {
      setModalCustomer(customer);
      setShowModal(true);
    };

    const handleDeleteCustomer = async (customerId, e) => {
      e.stopPropagation();
      if (window.confirm('Are you sure you want to delete this customer? This action cannot be undone.')) {
        try {
          const result = await contextDeleteCustomer(customerId);
          if (result.success) {
            console.log('Customer deleted successfully');
            // Refresh the customer list to reflect the deletion
            refreshCustomers();
          } else {
            console.error('Failed to delete customer:', result.error);
            alert('Failed to delete customer: ' + result.error);
          }
        } catch (error) {
          console.error('Error deleting customer:', error);
          alert('Error deleting customer: ' + error.message);
        }
      }
    };

    return (
      <div className="h-full flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-4">
          {/* Left Side - Add Customers */}
          <div className="flex items-center gap-3">
            <div className="relative" ref={addCustomersDropdownRef}>
              <button
                onClick={() => setShowAddCustomersDropdown(!showAddCustomersDropdown)}
                disabled={!isAuthenticated}
                className="inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none active:scale-95 font-manrope h-10 bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Add Customers"
                tabIndex="0"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Customers
                <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${showAddCustomersDropdown ? 'rotate-180' : ''}`} />
              </button>

              {/* Add Customers Dropdown */}
              {showAddCustomersDropdown && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setIsAddingCustomer(true);
                        setShowAddCustomersDropdown(false);
                      }}
                      disabled={isAddingCustomer}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-pink-50 hover:text-pink-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="font-medium">Add Customer</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowCsvUpload(true);
                        setShowAddCustomersDropdown(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-pink-50 hover:text-pink-700 transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                      <span className="font-medium">Upload CSV</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Side - Search, Filters, More Options */}
          <div className="flex items-center gap-3">
            {/* Search with Column Selection */}
            <SearchBarWithColumns
              value={searchTerm}
              onChange={setSearchTerm}
              onClear={() => setSearchTerm('')}
              searchColumns={searchColumns}
              onColumnChange={setSearchColumns}
              placeholder="Search customers..."
            />

            {/* Filter Dropdown */}
            <FilterDropdown
              columns={[
                { id: 'company', label: 'Company', type: 'text' },
                { id: 'primaryContact', label: 'Contact', type: 'text' },
                { id: 'email', label: 'Email', type: 'email' },
                { id: 'phone', label: 'Phone', type: 'tel' },
                { id: 'industry', label: 'Industry', type: 'text' },
                {
                  id: 'status',
                  label: 'Status',
                  type: 'select',
                  options: [
                    { value: 'active', label: 'Active' },
                    { value: 'inactive', label: 'Inactive' },
                    { value: 'completed', label: 'Completed' },
                    { value: 'lost', label: 'Lost' }
                  ]
                },
                {
                  id: 'churnRisk',
                  label: 'Churn Risk',
                  type: 'select',
                  options: [
                    { value: 'low', label: 'Low' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'high', label: 'High' }
                  ]
                },
                { id: 'lifetimeValue', label: 'Lifetime Value', type: 'currency' },
                {
                  id: 'upsellPotential',
                  label: 'Upsell Potential',
                  type: 'select',
                  options: [
                    { value: 'low', label: 'Low' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'high', label: 'High' }
                  ]
                },
                { id: 'lastContactDate', label: 'Last Contacted', type: 'date' }
              ]}
              onApplyFilters={setColumnFilters}
              activeFilters={columnFilters}
            />

            {/* More Options Dropdown */}
            <div className="relative" ref={moreOptionsDropdownRef}>
              <button
                onClick={() => setShowMoreOptionsDropdown(!showMoreOptionsDropdown)}
                className="inline-flex items-center justify-center font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none active:scale-95 font-inter text-xs h-8 w-8 p-0 rounded-lg transition-all duration-200 text-gray-500 hover:bg-pink-50 hover:text-pink-600 active:bg-pink-100"
                title="More options"
                aria-label="More Options"
                tabIndex="0"
              >
                <MoreVertical className="w-5 h-5" />
              </button>

              {/* More Options Dropdown */}
              {showMoreOptionsDropdown && (
                <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-[500px] overflow-y-auto">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        handleEmailSync();
                        setShowMoreOptionsDropdown(false);
                      }}
                      disabled={emailSyncLoading}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-pink-50 hover:text-pink-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Mail className="w-4 h-4" />
                      <span className="font-medium">
                        {emailSyncLoading ? 'Syncing Emails...' : 'Sync Emails'}
                      </span>
                    </button>
                    <button
                      onClick={() => {
                        handleRefreshData();
                        setShowMoreOptionsDropdown(false);
                      }}
                      disabled={customersLoading}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-pink-50 hover:text-pink-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <RefreshCw className={`w-4 h-4 ${customersLoading ? 'animate-spin' : ''}`} />
                      <span className="font-medium">
                        {customersLoading ? 'Refreshing...' : 'Refresh Data'}
                      </span>
                    </button>

                    {/* Divider */}
                    <div className="border-t border-gray-200 my-1"></div>

                    {/* Column Selector Section */}
                    <div className="px-4 py-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-gray-500 uppercase">Select Columns</span>
                        <span className="text-xs text-gray-500">
                          {Object.values(visibleColumns).filter(Boolean).length}/
                          {[
                            { id: 'company', label: 'Company', icon: Building, disabled: true },
                            { id: 'primaryContact', label: 'Contact', icon: User },
                            { id: 'email', label: 'Email', icon: Mail },
                            { id: 'phone', label: 'Phone', icon: Phone },
                            { id: 'industry', label: 'Industry', icon: Building2 },
                            { id: 'status', label: 'Status', icon: TrendingUp },
                            { id: 'churnRisk', label: 'Churn Risk', icon: AlertTriangle },
                            { id: 'lifetimeValue', label: 'Lifetime Value', icon: DollarSign },
                            { id: 'upsellPotential', label: 'Upsell Potential', icon: TrendingUpIcon },
                            { id: 'lastContactDate', label: 'Last Contacted', icon: Clock }
                          ].length}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {[
                          { id: 'company', label: 'Company', icon: Building, disabled: true },
                          { id: 'primaryContact', label: 'Contact', icon: User },
                          { id: 'email', label: 'Email', icon: Mail },
                          { id: 'phone', label: 'Phone', icon: Phone },
                          { id: 'industry', label: 'Industry', icon: Building2 },
                          { id: 'status', label: 'Status', icon: TrendingUp },
                          { id: 'churnRisk', label: 'Churn Risk', icon: AlertTriangle },
                          { id: 'lifetimeValue', label: 'Lifetime Value', icon: DollarSign },
                          { id: 'upsellPotential', label: 'Upsell Potential', icon: TrendingUpIcon },
                          { id: 'lastContactDate', label: 'Last Contacted', icon: Clock }
                        ].map((column) => {
                          const Icon = column.icon;
                          return (
                            <label
                              key={column.id}
                              className={`flex items-center gap-2 px-2 py-1.5 rounded transition-colors ${
                                column.disabled
                                  ? 'cursor-not-allowed opacity-60'
                                  : 'hover:bg-pink-50 cursor-pointer'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={visibleColumns[column.id] !== false}
                                onChange={() => {
                                  if (!column.disabled) {
                                    handleColumnToggle(column.id, !visibleColumns[column.id]);
                                  }
                                }}
                                disabled={column.disabled}
                                className="w-4 h-4 text-pink-600 border-gray-300 rounded focus:ring-pink-500"
                              />
                              <Icon className="w-4 h-4 text-gray-500" />
                              <span className="text-sm text-gray-700 flex-1">
                                {column.label}
                                {column.disabled && <span className="text-xs text-gray-400 ml-1">(Required)</span>}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>


        {/* Email Sync Progress */}
        {emailSyncProgress && (
          <div className={`mb-4 rounded-lg p-4 ${
            emailSyncProgress.complete ? 'bg-green-50 border border-green-200' : 'bg-blue-50 border border-blue-200'
          }`}>
              <div className="flex items-center gap-2 mb-2">
                {emailSyncProgress.complete ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
                )}
                <span className={`text-sm font-medium ${
                  emailSyncProgress.complete ? 'text-green-700' : 'text-blue-700'
                }`}>
                  {emailSyncProgress.status}
                </span>
              </div>
              {!emailSyncProgress.complete && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${emailSyncProgress.percentage}%` }}
                  />
                </div>
              )}
              {emailSyncProgress.complete && emailSyncProgress.emailsSynced !== undefined && (
                <div className="text-sm text-green-600 mt-2">
                  {emailSyncProgress.emailsSynced} new emails synced • Total: {emailSyncProgress.totalEmails} emails
                </div>
            )}
          </div>
        )}

        {/* Email Sync Error */}
        {emailSyncError && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{emailSyncError}</span>
              <button
                onClick={() => setEmailSyncError(null)}
                className="ml-auto text-red-500 hover:text-red-700"
              >
                <X className="w-4 h-4" />
              </button>
          </div>
        )}

        {/* Editable Customer Table */}
        <div className="flex-1 overflow-hidden">
          <EditableCustomerTable 
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            searchColumns={searchColumns}
            isAddingCustomer={isAddingCustomer}
            setIsAddingCustomer={setIsAddingCustomer}
            showFilters={showFilters}
            setShowFilters={setShowFilters}
            columnFilters={columnFilters}
            visibleColumns={visibleColumns}
            onColumnToggle={handleColumnToggle}
          />
        </div>

        {/* Customer Detail Modal */}
        <CustomerProfileDisplay
          customer={modalCustomer}
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onCustomerDeleted={(customerId) => {
            // Handle customer deletion if needed
            console.log('Customer deleted:', customerId);
          }}
        />

        {/* Modal has been moved to CustomerProfileModal component */}
      </div>
    );
  };


  // Deals Tab Content
  const renderDealsTab = () => {
    return <EditableDealsTable />;
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'customer-management':
        return renderCustomerManagementTab();
      case 'deals':
        return renderDealsTab();
      default:
        return renderCustomerManagementTab();
    }
  };

  // Show loading only on initial load
  const loading = customersLoading && customers.length === 0;

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-4 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="h-80 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const totalRevenue = customers.reduce((sum, c) => sum + c.contractValue, 0);
  const avgHealthScore = customers.length > 0 ? Math.round(customers.reduce((sum, c) => sum + c.healthScore, 0) / customers.length) : 0;
  const atRiskCustomers = customers.filter(c => c.churnRisk === 'high').length;
  const expansionOpportunities = customers.filter(c => c.status === 'expansion-opportunity').length;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <UnifiedHeader
        title="Customer Relations"
        themeColor="pink"
        tabs={tabs.map(tab => ({
          id: tab.id,
          label: tab.label,
          icon: tab.icon,
          isActive: activeTab === tab.id,
          onClick: () => setActiveTab(tab.id)
        }))}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {renderTabContent()}
          </motion.div>
        </div>
      </div>

      {/* Automation Details Modal */}
      {showAutomationDetails && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-purple-50">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Zap className="w-6 h-6 text-blue-600" />
                    Automation Details
                  </h2>
                  <p className="text-gray-600 mt-1">{selectedCustomer.company} • Advanced Workflow Management</p>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => setShowAutomationDetails(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XCircle className="w-6 h-6" />
                </Button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Active Workflows */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-green-600" />
                    Active Workflows
                  </h3>
                  <div className="space-y-3">
                    <div className="p-4 border rounded-lg bg-green-50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-green-800">Health Score Monitoring</span>
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Active</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">Automatically tracks customer health metrics and triggers alerts</p>
                      <div className="text-xs text-gray-500">Last triggered: 2 hours ago</div>
                    </div>

                    <div className="p-4 border rounded-lg bg-blue-50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-blue-800">Renewal Reminder</span>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">Scheduled</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">Sends renewal notifications 90 days before contract expiry</p>
                      <div className="text-xs text-gray-500">Next run: In 15 days</div>
                    </div>

                    <div className="p-4 border rounded-lg bg-purple-50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-purple-800">Usage Analytics</span>
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">Active</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">Daily analysis of product usage patterns and insights</p>
                      <div className="text-xs text-gray-500">Last run: 1 hour ago</div>
                    </div>
                  </div>
                </div>

                {/* Automation Tools */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Settings className="w-5 h-5 text-gray-600" />
                    Available Tools
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <Button className="flex flex-col items-center gap-2 h-20 bg-blue-600 hover:bg-blue-700">
                      <Mic className="w-5 h-5" />
                      <span className="text-xs">Voice Notes</span>
                    </Button>

                    <Button variant="outline" className="flex flex-col items-center gap-2 h-20">
                      <Calendar className="w-5 h-5" />
                      <span className="text-xs">Auto Sync</span>
                    </Button>

                    <Button variant="outline" className="flex flex-col items-center gap-2 h-20">
                      <Upload className="w-5 h-5" />
                      <span className="text-xs">Smart Upload</span>
                    </Button>

                    <Button variant="outline" className="flex flex-col items-center gap-2 h-20">
                      <MessageSquare className="w-5 h-5" />
                      <span className="text-xs">Auto Engage</span>
                    </Button>
                  </div>

                  {/* Recent Activity */}
                  <div className="mt-6">
                    <h4 className="font-medium text-gray-900 mb-3">Recent Activity</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <div className="flex-1">
                          <div className="text-sm font-medium">Health score updated</div>
                          <div className="text-xs text-gray-500">2 hours ago</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                        <AlertCircle className="w-4 h-4 text-yellow-500" />
                        <div className="flex-1">
                          <div className="text-sm font-medium">Usage alert triggered</div>
                          <div className="text-xs text-gray-500">1 day ago</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                        <Zap className="w-4 h-4 text-blue-500" />
                        <div className="flex-1">
                          <div className="text-sm font-medium">Auto-sync completed</div>
                          <div className="text-xs text-gray-500">2 days ago</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowAutomationDetails(false)}>
                  Close
                </Button>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Settings className="w-4 h-4 mr-2" />
                  Configure Automation
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assignment Modal */}
      {showAssignmentModal && customerToAssign && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Assign Customer Success Manager</h3>
              <button
                onClick={() => setShowAssignmentModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600">
                Assigning <strong>{customerToAssign.company}</strong> to:
              </p>
            </div>

            <div className="space-y-2">
              {employees.map((employee) => (
                <div
                  key={employee.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => confirmAssignment(employee.id)}
                >
                  <div>
                    <div className="font-medium">{employee.name}</div>
                    <div className="text-sm text-gray-600">{employee.role}</div>
                    <div className="text-xs text-gray-500">
                      Specialties: {employee.specialties.join(', ')}
                    </div>
                  </div>
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Email Composer Modal */}
      {showEmailComposer && emailCustomer && (
        <EmailComposer
          customer={emailCustomer}
          onClose={() => {
            setShowEmailComposer(false);
            setEmailCustomer(null);
          }}
          onEmailSent={handleEmailSent}
        />
      )}

      {/* Add Customer Modal */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Add New Customer</h2>
              <button
                onClick={() => setShowAddCustomerModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const customerData = {
                name: formData.get('name'),
                primary_contact: formData.get('primary_contact'),
                email: formData.get('email'),
                phone: formData.get('phone'),
                industry: formData.get('industry'),
                location: formData.get('location'),
                status: formData.get('status'),
                client_type: formData.get('client_type'),
                notes: formData.get('notes'),
                contract_value: parseFloat(formData.get('contract_value')) || 0,
                monthly_value: parseFloat(formData.get('monthly_value')) || 0,
                health_score: parseFloat(formData.get('health_score')) || 75,
                satisfaction_score: parseFloat(formData.get('satisfaction_score')) || 80,
                churn_risk: formData.get('churn_risk'),
                expansion_potential: formData.get('expansion_potential'),
                current_stage: formData.get('current_stage'),
                renewal_date: formData.get('renewal_date') || null,
                contact_birthday: formData.get('contact_birthday') || null,
              };
              handleAddCustomer(customerData);
            }} className="space-y-4">

              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter company name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Primary Contact *
                  </label>
                  <input
                    type="text"
                    name="primary_contact"
                    required
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter contact name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter email address"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter phone number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Industry
                  </label>
                  <select
                    name="industry"
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="Business">Business</option>
                    <option value="Technology">Technology</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Finance">Finance</option>
                    <option value="Education">Education</option>
                    <option value="Manufacturing">Manufacturing</option>
                    <option value="Retail">Retail</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    name="location"
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter location"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    name="status"
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="active">Active</option>
                    <option value="prospect">Prospect</option>
                    <option value="at-risk">At Risk</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client Type
                  </label>
                  <select
                    name="client_type"
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="lead">Lead</option>
                    <option value="customer">Customer</option>
                  </select>
                </div>
              </div>

              {/* Financial Information */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-medium mb-3">Financial Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contract Value ($)
                    </label>
                    <input
                      type="number"
                      name="contract_value"
                      min="0"
                      step="0.01"
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Monthly Value ($)
                    </label>
                    <input
                      type="number"
                      name="monthly_value"
                      min="0"
                      step="0.01"
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Renewal Date
                    </label>
                    <input
                      type="date"
                      name="renewal_date"
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>

              {/* Customer Metrics */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-medium mb-3">Customer Metrics</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Health Score (0-100)
                    </label>
                    <input
                      type="number"
                      name="health_score"
                      min="0"
                      max="100"
                      defaultValue="75"
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Satisfaction Score (0-100)
                    </label>
                    <input
                      type="number"
                      name="satisfaction_score"
                      min="0"
                      max="100"
                      step="1"
                      defaultValue="80"
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Churn Risk
                    </label>
                    <select
                      name="churn_risk"
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expansion Potential
                    </label>
                    <select
                      name="expansion_potential"
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="very low">Very Low</option>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="very high">Very High</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Current Stage
                    </label>
                    <select
                      name="current_stage"
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="prospect">Prospect</option>
                      <option value="qualified">Qualified</option>
                      <option value="proposal">Proposal</option>
                      <option value="negotiation">Negotiation</option>
                      <option value="closed-won">Closed Won</option>
                      <option value="closed-lost">Closed Lost</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Birthday
                    </label>
                    <input
                      type="date"
                      name="contact_birthday"
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="border-t pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  name="notes"
                  rows="3"
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter any additional notes about the customer"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-700"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isAddingCustomer}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {isAddingCustomer ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Customer
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Database Visualization Modal */}
      <DatabaseVisualization
        isOpen={showDatabaseVisualization}
        onClose={() => setShowDatabaseVisualization(false)}
      />

      {/* CSV Upload Modal */}
      {showCsvUpload && (
        <CustomerCsvUpload
          onImportComplete={handleCsvImportComplete}
          onClose={() => setShowCsvUpload(false)}
        />
      )}

      {/* Email Sync Success Notification */}
      {showEmailSyncNotification && emailSyncProgress?.complete && (
        <div className="fixed top-4 right-4 z-50">
          <motion.div
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            className="bg-green-500 text-white p-4 rounded-lg shadow-lg flex items-center gap-3 max-w-md"
          >
            <CheckCircle className="w-6 h-6 text-green-100" />
            <div>
              <div className="font-medium">Email Sync Complete!</div>
              <div className="text-sm text-green-100">
                Successfully synced {emailSyncProgress.emailsSynced} new emails
              </div>
            </div>
            <button
              onClick={() => setShowEmailSyncNotification(false)}
              className="ml-auto text-green-100 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default CustomerRelationshipManagement;