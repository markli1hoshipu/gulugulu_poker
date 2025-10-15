import React, { useState, useEffect, useCallback } from 'react';
import { 
  Save, 
  X, 
  Edit3, 
  Check, 
  AlertCircle, 
  Loader2,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Calendar,
  User,
  Building,
  Phone,
  Mail,
  MapPin,
  Trash2,
  Filter,
  Bell,
  TrendingUp,
  Plus,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Settings
} from 'lucide-react';
import { useCRM } from '../../contexts/CRMContext';
import { useAuth } from '../../auth/hooks/useAuth';
import CustomerProfileDisplay from './CustomerProfileDisplay';
import FilterDropdown from './FilterDropdown';
import DeleteConfirmationModal from './DeleteConfirmationModal';

const EditableCustomerTable = ({
  searchTerm: propSearchTerm,
  setSearchTerm: propSetSearchTerm,
  searchColumns,
  isAddingCustomer: propIsAddingCustomer,
  setIsAddingCustomer: propSetIsAddingCustomer,
  showFilters: propShowFilters,
  setShowFilters: propSetShowFilters,
  visibleColumns,
  onColumnToggle
}) => {
  const { customers, customersLoading, customersError, updateCustomer, deleteCustomer, setCustomers, loadCustomers, CRM_API_BASE_URL, authFetch } = useCRM();
  const { isAuthenticated, user } = useAuth();
  const [editingCells, setEditingCells] = useState(new Set());
  const [editValues, setEditValues] = useState({});
  const [savingCells, setSavingCells] = useState(new Set());
  const [errors, setErrors] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [modalCustomer, setModalCustomer] = useState(null);
  const [notification, setNotification] = useState(null);
  const [filters, setFilters] = useState({
    churnRisk: '',
    // NOTE: healthScore removed - DO NOT ADD BACK
    industry: '',
    status: '',
    upsellPotential: ''
  });
  const [localShowFilters, setLocalShowFilters] = useState(false);
  const [churnAlerts, setChurnAlerts] = useState([]);
  const [showChurnAlertsModal, setShowChurnAlertsModal] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [localSearchTerm, setLocalSearchTerm] = useState('');
  const [localIsAddingCustomer, setLocalIsAddingCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({});
  const [columnFilters, setColumnFilters] = useState({});
  const [isSavingNewCustomer, setIsSavingNewCustomer] = useState(false);

  // Delete confirmation modal state
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    customer: null,
    isDeleting: false
  });

  // Use props when available, fallback to local state
  const searchTerm = propSearchTerm !== undefined ? propSearchTerm : localSearchTerm;
  const setSearchTerm = propSetSearchTerm || setLocalSearchTerm;
  const isAddingCustomer = propIsAddingCustomer !== undefined ? propIsAddingCustomer : localIsAddingCustomer;
  const setIsAddingCustomer = propSetIsAddingCustomer || setLocalIsAddingCustomer;
  const showFilters = propShowFilters !== undefined ? propShowFilters : localShowFilters;
  const setShowFilters = propSetShowFilters || setLocalShowFilters;

  // Auto-hide notification after 3 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Removed backend filtering - now handled locally to avoid continuous refreshing
  
  // Monitor for high churn risk customers
  useEffect(() => {
    const highChurnCustomers = customers.filter(c => c.churnRisk === 'high' && c.id);
    if (highChurnCustomers.length > 0) {
      setChurnAlerts(highChurnCustomers.map(c => ({
        id: c.id,
        company: c.company,
        message: `${c.company} has high churn risk! Consider immediate engagement.`
      })));
    } else {
      setChurnAlerts([]);
    }
  }, [customers]);
  
  // Handle sorting
  const handleSort = (key) => {
    try {
      if (!key) return;
      
      let direction = 'asc';
      if (sortConfig.key === key && sortConfig.direction === 'asc') {
        direction = 'desc';
      }
      setSortConfig({ key, direction });
    } catch (error) {
      console.error('Error in handleSort:', error);
    }
  };

  // Field configurations with types and validation
  const fieldConfig = {
    company: {
      type: 'text',
      label: 'Company',
      icon: Building,
      required: true,
      sortable: true,
      validation: (value) => value?.length >= 2 ? null : 'Company name must be at least 2 characters'
    },
    primaryContact: {
      type: 'text',
      label: 'Contact',
      icon: User,
      sortable: true,
      validation: (value) => value?.length >= 1 ? null : 'Contact name is required'
    },
    email: {
      type: 'email',
      label: 'Email',
      icon: Mail,
      validation: (value) => {
        if (!value) return 'Email is required';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(value) ? null : 'Invalid email format';
      }
    },
    phone: {
      type: 'tel',
      label: 'Phone',
      icon: Phone,
      validation: (value) => !value || value.length >= 10 ? null : 'Phone number must be at least 10 digits'
    },
    industry: {
      type: 'text',
      label: 'Industry',
      icon: Building,
      sortable: true
    },
    status: {
      type: 'select',
      label: 'Status',
      sortable: true,
      options: [
        { value: 'active', label: 'Active', color: 'bg-green-100 text-green-800' },
        { value: 'inactive', label: 'Inactive', color: 'bg-yellow-100 text-yellow-800' },
        { value: 'completed', label: 'Completed', color: 'bg-blue-100 text-blue-800' },
        { value: 'lost', label: 'Lost', color: 'bg-red-100 text-red-800' }
      ]
    },
    churnRisk: {
      type: 'select',
      label: 'Churn Risk',
      options: [
        { value: 'low', label: 'Low', color: 'bg-green-100 text-green-800' },
        { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
        { value: 'high', label: 'High', color: 'bg-red-100 text-red-800' }
      ]
    },
    lifetimeValue: { 
      type: 'currency', 
      label: 'Lifetime Value', 
      icon: DollarSign,
      validation: (value) => {
        const num = parseFloat(value);
        return isNaN(num) || num < 0 ? 'Must be a valid positive number' : null;
      }
    },
    upsellPotential: { 
      type: 'select', 
      label: 'Upsell Potential',
      sortable: true,
      options: [
        { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-800' },
        { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
        { value: 'high', label: 'High', color: 'bg-green-100 text-green-800' }
      ]
    },
    // NOTE: Health Score field configuration removed - DO NOT ADD BACK
    lastContactDate: {
      type: 'date',
      label: 'Last Contacted',
      icon: Calendar,
      sortable: true
    }
  };

  // Apply column filter
  const applyColumnFilter = (value, filter) => {
    if (!filter || !filter.condition) return true;
    
    const { condition, value: filterValue } = filter;
    const strValue = String(value || '').toLowerCase();
    const strFilterValue = String(filterValue || '').toLowerCase();
    
    switch (condition) {
      case 'contains': return strValue.includes(strFilterValue);
      case 'not_contains': return !strValue.includes(strFilterValue);
      case 'equals': return strValue === strFilterValue;
      case 'not_equals': return strValue !== strFilterValue;
      case 'starts_with': return strValue.startsWith(strFilterValue);
      case 'ends_with': return strValue.endsWith(strFilterValue);
      case 'is_empty': return !value || value === '';
      case 'not_empty': return value && value !== '';
      case 'greater_than': return parseFloat(value) > parseFloat(filterValue);
      case 'less_than': return parseFloat(value) < parseFloat(filterValue);
      case 'greater_equal': return parseFloat(value) >= parseFloat(filterValue);
      case 'less_equal': return parseFloat(value) <= parseFloat(filterValue);
      case 'between': {
        const [min, max] = filterValue.split(',').map(v => parseFloat(v));
        const numValue = parseFloat(value);
        return numValue >= min && numValue <= max;
      }
      case 'in': return filterValue.split(',').includes(String(value));
      case 'not_in': return !filterValue.split(',').includes(String(value));
      default: return true;
    }
  };

  // Sort and filter customers locally to avoid API calls and page refreshing
  const sortedAndFilteredCustomers = React.useMemo(() => {
    let result = customers.filter(customer => {
      // Search filter with column selection
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const searchableFields = [];
        
        // Build searchable fields based on searchColumns (or default if not provided)
        const columnsToSearch = searchColumns || {
          company: true,
          primaryContact: true,
          email: true,
          industry: true
        };
        
        if (columnsToSearch.company) searchableFields.push(customer.company);
        if (columnsToSearch.primaryContact) searchableFields.push(customer.primaryContact);
        if (columnsToSearch.email) searchableFields.push(customer.email);
        if (columnsToSearch.industry) searchableFields.push(customer.industry);
        if (columnsToSearch.phone) searchableFields.push(customer.phone);
        if (columnsToSearch.status) searchableFields.push(customer.status);
        if (columnsToSearch.notes) searchableFields.push(customer.notes);
        
        if (!searchableFields.some(field => field?.toLowerCase().includes(searchLower))) {
          return false;
        }
      }
      
      // Column filters for advanced filtering
      for (const [field, filter] of Object.entries(columnFilters)) {
        if (!applyColumnFilter(customer[field], filter)) {
          return false;
        }
      }
      
      // Status, industry, churn risk and other filters
      if (filters.churnRisk && customer.churnRisk !== filters.churnRisk) return false;
      if (filters.status && customer.status !== filters.status) return false;
      if (filters.industry && !customer.industry?.toLowerCase().includes(filters.industry.toLowerCase())) return false;
      if (filters.upsellPotential && customer.expansionPotential !== filters.upsellPotential) return false;
      
      return true;
    });

    // Sort results
    if (sortConfig.key && result.length > 0) {
      try {
        result.sort((a, b) => {
          // Safely get values
          let aValue = a && a[sortConfig.key] !== undefined ? a[sortConfig.key] : '';
          let bValue = b && b[sortConfig.key] !== undefined ? b[sortConfig.key] : '';
          
          // Get field config safely
          const config = fieldConfig[sortConfig.key];
          
          // Handle different data types
          if (config?.type === 'currency' || sortConfig.key === 'lifetimeValue') {
            aValue = parseFloat(aValue) || 0;
            bValue = parseFloat(bValue) || 0;
          } else if (config?.type === 'date' || sortConfig.key === 'lastContactDate') {
            aValue = new Date(aValue || '1900-01-01');
            bValue = new Date(bValue || '1900-01-01');
          } else if (config?.type === 'select') {
            // Handle select fields as strings
            aValue = String(aValue || '').toLowerCase();
            bValue = String(bValue || '').toLowerCase();
          } else {
            // Handle as string
            aValue = String(aValue || '').toLowerCase();
            bValue = String(bValue || '').toLowerCase();
          }
          
          // Safe comparison
          try {
            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
          } catch (compareError) {
            console.error('Error comparing values:', compareError);
            return 0;
          }
        });
      } catch (sortError) {
        console.error('Error sorting customers:', sortError);
      }
    }

    return result;
  }, [customers, sortConfig, columnFilters, searchTerm, searchColumns, filters]);

  // fieldConfig moved before sortedAndFilteredCustomers to fix initialization order

  // Get cell ID for tracking editing state
  const getCellId = (customerId, field) => `${customerId}-${field}`;

  // Handle clicking on a customer row to view details
  const handleCustomerRowClick = (customer, e) => {
    // Don't open modal if user clicked on an editable cell or a button
    if (e.target.closest('.editable-cell') || e.target.closest('button') || e.target.closest('select') || e.target.closest('input')) {
      return;
    }
    setModalCustomer(customer);
    setShowModal(true);
  };

  // Keep modalCustomer in sync with customers array when it updates
  useEffect(() => {
    if (modalCustomer && showModal) {
      const updatedCustomer = customers.find(c => c.id === modalCustomer.id);
      if (updatedCustomer) {
        setModalCustomer(updatedCustomer);
      }
    }
  }, [customers, modalCustomer?.id, showModal]);

  // Start editing a cell
  const startEditing = (customerId, field, currentValue) => {
    const cellId = getCellId(customerId, field);
    setEditingCells(prev => new Set([...prev, cellId]));
    setEditValues(prev => ({
      ...prev,
      [cellId]: currentValue || ''
    }));
    setErrors(prev => ({
      ...prev,
      [cellId]: null
    }));
  };

  // Cancel editing a cell
  const cancelEditing = (customerId, field) => {
    const cellId = getCellId(customerId, field);
    setEditingCells(prev => {
      const newSet = new Set(prev);
      newSet.delete(cellId);
      return newSet;
    });
    setEditValues(prev => {
      const newValues = { ...prev };
      delete newValues[cellId];
      return newValues;
    });
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[cellId];
      return newErrors;
    });
  };
  
  // Handle deleting a customer
  const handleDeleteCustomer = async (customerId, e) => {
    e.stopPropagation();

    if (!isAuthenticated) {
      setNotification({
        type: 'error',
        message: 'You must be logged in to delete customers'
      });
      return;
    }

    // Find the customer to show in modal
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return;

    // Open delete confirmation modal
    setDeleteModal({
      isOpen: true,
      customer: customer,
      isDeleting: false
    });
  };

  const confirmDelete = async () => {
    const customer = deleteModal.customer;
    if (!customer) return;

    setDeleteModal(prev => ({ ...prev, isDeleting: true }));

    try {
      // Use the deleteCustomer function from CRMContext
      const result = await deleteCustomer(customer.id);

      if (result.success) {
        setNotification({
          type: 'success',
          message: `Customer "${customer.company}" deleted successfully`
        });

        // Close modal
        setDeleteModal({
          isOpen: false,
          customer: null,
          isDeleting: false
        });
      } else {
        throw new Error(result.error || 'Failed to delete customer');
      }
    } catch (error) {
      console.error('Error deleting customer:', error);
      setNotification({
        type: 'error',
        message: `Failed to delete customer: ${error.message}`
      });

      // Close modal even on error
      setDeleteModal({
        isOpen: false,
        customer: null,
        isDeleting: false
      });
    }
  };

  const cancelDelete = () => {
    setDeleteModal({
      isOpen: false,
      customer: null,
      isDeleting: false
    });
  };

  // Save cell value
  const saveCell = async (customerId, field) => {
    const cellId = getCellId(customerId, field);
    const newValue = editValues[cellId];
    const config = fieldConfig[field];

    // Check authentication
    if (!isAuthenticated) {
      setErrors(prev => ({
        ...prev,
        [cellId]: 'You must be logged in to edit data'
      }));
      return;
    }

    // Validate the value
    if (config?.validation) {
      const error = config.validation(newValue);
      if (error) {
        setErrors(prev => ({
          ...prev,
          [cellId]: error
        }));
        return;
      }
    }

    // Show saving state
    setSavingCells(prev => new Set([...prev, cellId]));

    try {
      // Prepare the update payload
      let processedValue = newValue;
      
      // Process different field types
      if (config?.type === 'currency' || config?.type === 'number') {
        processedValue = parseFloat(newValue) || 0;
      } else if (config?.type === 'date') {
        processedValue = newValue || null;
      }

      console.log(`Updating customer ${customerId}, field: ${field}, value:`, processedValue);

      // Make API call to update customer using authenticated fetch
      const response = await authFetch(`${CRM_API_BASE_URL}/api/crm/customers/${customerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          [field]: processedValue
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${response.status}: Failed to update customer`);
      }

      const updatedCustomer = await response.json();
      
      // Update the customer in context
      updateCustomer(updatedCustomer);

      // Exit editing mode
      setEditingCells(prev => {
        const newSet = new Set(prev);
        newSet.delete(cellId);
        return newSet;
      });
      
      setEditValues(prev => {
        const newValues = { ...prev };
        delete newValues[cellId];
        return newValues;
      });

      // Success - no notification needed for individual edits

    } catch (error) {
      console.error('Error updating customer:', error);
      setErrors(prev => ({
        ...prev,
        [cellId]: 'Failed to save changes'
      }));
      
      // Show error notification
      setNotification({
        type: 'error',
        message: `Failed to update: ${error.message}`
      });
    } finally {
      setSavingCells(prev => {
        const newSet = new Set(prev);
        newSet.delete(cellId);
        return newSet;
      });
    }
  };

  // Format display value
  const formatDisplayValue = (value, field) => {
    const config = fieldConfig[field];
    
    if (!value && value !== 0) return '-';
    
    switch (config?.type) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(value);
      case 'date':
        return value ? new Date(value).toLocaleDateString() : '-';
      case 'select':
        const option = config.options?.find(opt => opt.value === value);
        return option ? option.label : value;
      default:
        return value;
    }
  };
  
  // Render health score bar
  // NOTE: Health score bar rendering function removed - DO NOT ADD BACK
  
  // Render churn risk indicator
  const renderChurnRiskIndicator = (risk) => {
    const config = {
      low: { color: 'bg-green-500', textColor: 'text-green-700', bgColor: 'bg-green-50' },
      medium: { color: 'bg-yellow-500', textColor: 'text-yellow-700', bgColor: 'bg-yellow-50' },
      high: { color: 'bg-red-500', textColor: 'text-red-700', bgColor: 'bg-red-50' }
    };
    
    const riskConfig = config[risk] || config.low;
    
    return (
      <div className={`flex items-center gap-2 px-2 py-1 rounded-lg ${riskConfig.bgColor}`}>
        <div className="flex gap-1">
          {['low', 'medium', 'high'].map((level, idx) => (
            <div
              key={level}
              className={`h-3 w-1 rounded-sm ${
                ['low', 'medium', 'high'].indexOf(risk) >= idx 
                  ? riskConfig.color 
                  : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
        <span className={`text-xs font-medium ${riskConfig.textColor}`}>
          {risk.charAt(0).toUpperCase() + risk.slice(1)}
        </span>
      </div>
    );
  };

  // Get badge color for select fields
  const getBadgeColor = (value, field) => {
    const config = fieldConfig[field];
    if (config?.type === 'select') {
      const option = config.options?.find(opt => opt.value === value);
      return option?.color || 'bg-gray-100 text-gray-800';
    }
    return '';
  };

  // Render editable cell
  const renderEditableCell = (customer, field) => {
    const cellId = getCellId(customer.id, field);
    const isEditing = editingCells.has(cellId);
    const isSaving = savingCells.has(cellId);
    const error = errors[cellId];
    const config = fieldConfig[field];
    const currentValue = customer[field];
    const editValue = editValues[cellId];

    if (isEditing) {
      return (
        <div className="relative">
          {config?.type === 'select' ? (
            <select
              value={editValue}
              onChange={(e) => setEditValues(prev => ({
                ...prev,
                [cellId]: e.target.value
              }))}
              onBlur={() => saveCell(customer.id, field)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  saveCell(customer.id, field);
                } else if (e.key === 'Escape') {
                  cancelEditing(customer.id, field);
                }
              }}
              className={`px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full ${
                error ? 'border-red-300' : 'border-gray-300'
              }`}
              autoFocus
            >
              {config.options?.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              type={config?.type || 'text'}
              value={editValue}
              onChange={(e) => setEditValues(prev => ({
                ...prev,
                [cellId]: e.target.value
              }))}
              onBlur={() => saveCell(customer.id, field)}
              className={`px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full ${
                error ? 'border-red-300' : 'border-gray-300'
              }`}
              min={config?.min}
              max={config?.max}
              step={config?.type === 'currency' ? '0.01' : undefined}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  saveCell(customer.id, field);
                } else if (e.key === 'Escape') {
                  cancelEditing(customer.id, field);
                  }
                }}
              />
            )}
          
          {error && (
            <div className="absolute top-full left-0 mt-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded border border-red-200 shadow-sm z-10">
              {error}
            </div>
          )}
        </div>
      );
    }

    // NOTE: Health score special rendering removed - DO NOT ADD BACK
    
    if (field === 'churnRisk') {
      return (
        <div
          className="group cursor-pointer hover:bg-blue-50 px-2 py-1 rounded flex items-center justify-between min-h-[32px] editable-cell"
          onClick={() => startEditing(customer.id, field, currentValue)}
          title="Click to edit"
        >
          {renderChurnRiskIndicator(currentValue || 'low')}
          <Edit3 className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity ml-2" />
        </div>
      );
    }

    // Default display mode
    return (
      <div
        className="group cursor-pointer hover:bg-blue-50 px-2 py-1 rounded flex items-center justify-between min-h-[32px] editable-cell"
        onClick={() => startEditing(customer.id, field, currentValue)}
        title="Click to edit"
      >
        {config?.type === 'select' ? (
          <span className={`px-2 py-1 rounded-full text-xs ${getBadgeColor(currentValue, field)}`}>
            {formatDisplayValue(currentValue, field)}
          </span>
        ) : (
          <span className={currentValue ? 'text-gray-900' : 'text-gray-400 italic'}>
            {formatDisplayValue(currentValue, field)}
          </span>
        )}
        
        <Edit3 className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    );
  };

  if (customersLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading customers...</span>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Notification */}
      {notification && (
        <div className={`mb-4 p-3 rounded-lg flex items-center justify-between animate-fade-in ${
          notification.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-800'
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <Check className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            <span className="text-sm font-medium">{notification.message}</span>
          </div>
          <button 
            onClick={() => setNotification(null)}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Loading State */}
      {customersLoading && (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Loading customers...</span>
        </div>
      )}

      {/* Error State */}
      {customersError && !customersLoading && (
        <div className="p-3">
          <div className="border-red-200 bg-red-50 rounded-lg p-6">
            <div className="flex items-center gap-3 text-red-700">
              <AlertCircle className="w-6 h-6" />
              <div>
                <h3 className="font-semibold">Cannot load database</h3>
                <p className="text-sm mt-1">{customersError}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      {!customersLoading && !customersError && (
        <>
      
      {/* Churn Risk Alerts - Banner */}
      {churnAlerts.length > 0 && (
        <div className="mb-4">
          <div
            className="bg-red-50 border border-red-200 rounded-lg p-3 cursor-pointer hover:bg-red-100 transition-colors"
            onClick={() => setShowChurnAlertsModal(true)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-red-600 animate-pulse" />
                <span className="text-red-800 font-semibold">
                  {churnAlerts.length} {churnAlerts.length === 1 ? 'customer has' : 'customers have'} high churn risk
                </span>
                <span className="text-red-600 text-sm">- Click to view details</span>
              </div>
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full bg-white table-auto">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {/* Company Column */}
              {(!visibleColumns || visibleColumns.company !== false) && (
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  <div
                    className="flex items-center gap-2 cursor-pointer hover:text-gray-700"
                    onClick={() => handleSort('company')}
                  >
                    <Building className="w-4 h-4" />
                    <span>Company</span>
                    {sortConfig.key === 'company' ? (
                      sortConfig.direction === 'asc' ?
                        <ArrowUp className="w-3 h-3 text-blue-600" /> :
                        <ArrowDown className="w-3 h-3 text-blue-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-gray-400" />
                    )}
                  </div>
                </th>
              )}

              {/* Contact Column */}
              {(!visibleColumns || visibleColumns.primaryContact !== false) && (
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  <div
                    className="flex items-center gap-2 cursor-pointer hover:text-gray-700"
                    onClick={() => handleSort('primaryContact')}
                  >
                    <User className="w-4 h-4" />
                    <span>Contact</span>
                    {sortConfig.key === 'primaryContact' ? (
                      sortConfig.direction === 'asc' ?
                        <ArrowUp className="w-3 h-3 text-blue-600" /> :
                        <ArrowDown className="w-3 h-3 text-blue-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-gray-400" />
                    )}
                  </div>
                </th>
              )}

              {/* Other Columns */}
              {Object.entries(fieldConfig)
                .filter(([field]) => field !== 'company' && field !== 'primaryContact')
                .filter(([field]) => !visibleColumns || visibleColumns[field] !== false)
                .map(([field, config]) => (
                  <th
                    key={field}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    <div
                      className="flex items-center gap-2 cursor-pointer hover:text-gray-700"
                      onClick={() => handleSort(field)}
                    >
                      {config.icon && <config.icon className="w-4 h-4" />}
                      <span>{config.label}</span>
                      {sortConfig.key === field ? (
                        sortConfig.direction === 'asc' ?
                          <ArrowUp className="w-3 h-3 text-blue-600" /> :
                          <ArrowDown className="w-3 h-3 text-blue-600" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-gray-400" />
                      )}
                    </div>
                  </th>
                ))}
              
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {/* Add Customer Row */}
            {isAddingCustomer && (
              <tr className="bg-blue-50 border-2 border-blue-200">
                {(!visibleColumns || visibleColumns.company !== false) && (
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      placeholder="Company name"
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={newCustomer.company || ''}
                      onChange={(e) => setNewCustomer(prev => ({ ...prev, company: e.target.value }))}
                      autoFocus
                    />
                  </td>
                )}
                {(!visibleColumns || visibleColumns.primaryContact !== false) && (
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      placeholder="Contact name"
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={newCustomer.primaryContact || ''}
                      onChange={(e) => setNewCustomer(prev => ({ ...prev, primaryContact: e.target.value }))}
                    />
                  </td>
                )}
                {/* Render remaining fields based on fieldConfig */}
                {Object.keys(fieldConfig).filter(field => !['company', 'primaryContact'].includes(field)).filter(field => !visibleColumns || visibleColumns[field] !== false).map(field => {
                  const config = fieldConfig[field];

                  return (
                    <td key={field} className="px-4 py-3">
                      {config.type === 'select' ? (
                        <select
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={newCustomer[field] || (config.options?.[0]?.value || '')}
                          onChange={(e) => setNewCustomer(prev => ({ ...prev, [field]: e.target.value }))}
                        >
                          {config.options?.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      ) : config.type === 'currency' ? (
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={newCustomer[field] || ''}
                          onChange={(e) => setNewCustomer(prev => ({ ...prev, [field]: e.target.value }))}
                        />
                      ) : config.type === 'date' ? (
                        <span className="text-gray-400 text-sm">-</span>
                      ) : (
                        <input
                          type={config.type || 'text'}
                          placeholder={config.label}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={newCustomer[field] || ''}
                          onChange={(e) => setNewCustomer(prev => ({ ...prev, [field]: e.target.value }))}
                        />
                      )}
                    </td>
                  );
                })}
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <button
                      onClick={async () => {
                        // Prevent duplicate submissions
                        if (isSavingNewCustomer) {
                          return;
                        }

                        try {
                          setIsSavingNewCustomer(true);

                          // Validate required fields
                          if (!newCustomer.company) {
                            setNotification({
                              type: 'error',
                              message: 'Company name is required'
                            });
                            return;
                          }

                          // Generate placeholder email if not provided
                          const placeholderEmail = newCustomer.email || `${newCustomer.company.toLowerCase().replace(/\s+/g, '')}@placeholder.com`;

                          const response = await authFetch(`${CRM_API_BASE_URL}/api/crm/customers`, {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                              name: newCustomer.company,  // Backend expects 'name' not 'company'
                              primary_contact: newCustomer.primaryContact || '',
                              email: placeholderEmail,  // Use actual email if provided, otherwise placeholder
                              phone: newCustomer.phone || '',
                              industry: newCustomer.industry || 'Business',
                              status: newCustomer.status || 'active',
                              churn_risk: newCustomer.churnRisk || 'low',
                              contract_value: parseFloat(newCustomer.lifetimeValue) || 0
                              // NOTE: healthScore removed - DO NOT ADD BACK
                            })
                          });

                          if (!response.ok) {
                            throw new Error('Failed to create customer');
                          }

                          // Get the created customer from response
                          const createdCustomer = await response.json();
                          console.log('Customer created successfully:', createdCustomer);

                          // Optimistically add the new customer to local state (like delete does)
                          setCustomers(prev => [createdCustomer, ...prev]);

                          setNotification({
                            type: 'success',
                            message: 'Customer added successfully'
                          });

                          setIsAddingCustomer(false);
                          setNewCustomer({});
                        } catch (error) {
                          console.error('Error creating customer:', error);
                          setNotification({
                            type: 'error',
                            message: 'Failed to create customer'
                          });
                        } finally {
                          setIsSavingNewCustomer(false);
                        }
                      }}
                      disabled={isSavingNewCustomer}
                      className={`p-1 ${isSavingNewCustomer ? 'text-gray-400 cursor-not-allowed' : 'text-green-600 hover:text-green-800'}`}
                      title={isSavingNewCustomer ? "Saving..." : "Save customer"}
                    >
                      {isSavingNewCustomer ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => {
                        setIsAddingCustomer(false);
                        setNewCustomer({});
                      }}
                      disabled={isSavingNewCustomer}
                      className={`p-1 ${isSavingNewCustomer ? 'text-gray-400 cursor-not-allowed' : 'text-red-600 hover:text-red-800'}`}
                      title="Cancel"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            )}
            
            {sortedAndFilteredCustomers.map((customer, index) => (
              <tr
                key={customer.id}
                className={`cursor-pointer hover:bg-blue-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                onClick={(e) => handleCustomerRowClick(customer, e)}
                title="Click to view customer details"
              >
                {(!visibleColumns || visibleColumns.company !== false) && (
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        {renderEditableCell(customer, 'company')}
                      </div>
                    </div>
                  </td>
                )}
                {(!visibleColumns || visibleColumns.primaryContact !== false) && (
                  <td className="px-4 py-2 relative">
                    {renderEditableCell(customer, 'primaryContact')}
                  </td>
                )}
                {Object.keys(fieldConfig)
                  .filter(field => field !== 'company' && field !== 'primaryContact')
                  .filter(field => !visibleColumns || visibleColumns[field] !== false)
                  .map((field) => (
                    <td key={field} className="px-4 py-2 relative">
                      {renderEditableCell(customer, field)}
                    </td>
                  ))}
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCustomer(customer.id, e);
                    }}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition-colors"
                    title={`Delete ${customer.company || 'Customer'}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sortedAndFilteredCustomers.length === 0 && customers.length > 0 && (
        <div className="text-center py-12 text-gray-500">
          <Filter className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No customers match the current search and filters</p>
          <button
            onClick={() => {
              setSearchTerm('');
              setFilters({
                churnRisk: '',
                // NOTE: healthScore removed - DO NOT ADD BACK
                industry: '',
                status: '',
                upsellPotential: ''
              });
            }}
            className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
          >
            Clear search and filters
          </button>
        </div>
      )}
      
      {customers.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Building className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No customers found</p>
        </div>
      )}

        </>
      )}

      {/* Customer Detail Modal */}
      <CustomerProfileDisplay
        customer={modalCustomer}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onCustomerDeleted={(customerId) => {
          // Remove customer from local state
          setShowModal(false);
          setModalCustomer(null);
          // The customer list will be updated via the CRM context
        }}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        customer={deleteModal.customer}
        itemName={deleteModal.customer?.company}
        itemType="customer"
        isDeleting={deleteModal.isDeleting}
        onConfirm={confirmDelete}
        onClose={cancelDelete}
      />

      {/* Churn Risk Alerts Modal */}
      {showChurnAlertsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-red-50">
              <div className="flex items-center gap-3">
                <Bell className="w-6 h-6 text-red-600" />
                <h2 className="text-xl font-semibold text-red-800">
                  High Churn Risk Alerts ({churnAlerts.length})
                </h2>
              </div>
              <button
                onClick={() => setShowChurnAlertsModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="px-6 py-4 overflow-y-auto flex-1">
              <p className="text-sm text-gray-600 mb-4">
                The following customers require immediate engagement to prevent churn:
              </p>
              <div className="space-y-3">
                {churnAlerts.map((alert) => {
                  const customer = customers.find(c => c.id === alert.id);
                  return (
                    <div
                      key={alert.id}
                      className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center justify-between hover:bg-red-100 transition-colors cursor-pointer group"
                      onClick={() => {
                        setModalCustomer(customer);
                        setShowModal(true);
                        setShowChurnAlertsModal(false);
                      }}
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                        <span className="text-red-900 font-medium">{alert.company}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setChurnAlerts(prev => prev.filter(a => a.id !== alert.id));
                          if (churnAlerts.length === 1) {
                            setShowChurnAlertsModal(false);
                          }
                        }}
                        className="text-red-400 hover:text-red-700 ml-3 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Dismiss alert"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setChurnAlerts([])}
                className="px-4 py-2 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
              >
                Dismiss All
              </button>
              <button
                onClick={() => setShowChurnAlertsModal(false)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditableCustomerTable;