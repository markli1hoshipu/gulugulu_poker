import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  DollarSign,
  Plus,
  Search,
  Filter,
  RefreshCw,
  TrendingUp,
  Calendar,
  User,
  Building,
  Edit2,
  Trash2,
  ChevronDown,
  Check,
  Clock,
  AlertCircle,
  Loader2,
  X,
  Save,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  MoreVertical,
  Mail
} from 'lucide-react';
import { useCRM } from '../../contexts/CRMContext';
import { useAuth } from '../../auth/hooks/useAuth';
import FilterDropdown from './FilterDropdown';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import SearchBarWithColumns from './SearchBarWithColumns';

const EditableDealsTable = () => {
  const { deals, dealsLoading, dealsError, loadDeals, updateDeal, deleteDeal, setDeals, customers, employees, employeesLoading, loadEmployees, CRM_API_BASE_URL, authFetch } = useCRM();
  const { isAuthenticated, user } = useAuth();

  const [editingCells, setEditingCells] = useState(new Set());
  const [editValues, setEditValues] = useState({});
  const [savingCells, setSavingCells] = useState(new Set());
  const [errors, setErrors] = useState({});
  const [notification, setNotification] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingDeal, setIsAddingDeal] = useState(false);
  const [newDeal, setNewDeal] = useState({});
  const [columnFilters, setColumnFilters] = useState({});
  const [currentUserEmployeeId, setCurrentUserEmployeeId] = useState(null);
  const [loadingCurrentUser, setLoadingCurrentUser] = useState(true);
  const [isSavingNewDeal, setIsSavingNewDeal] = useState(false);
  const [showAddDealsDropdown, setShowAddDealsDropdown] = useState(false);
  const [showMoreOptionsDropdown, setShowMoreOptionsDropdown] = useState(false);

  // Dropdown refs for click outside handling
  const addDealsDropdownRef = React.useRef(null);
  const moreOptionsDropdownRef = React.useRef(null);

  // Column visibility and search state (using fieldConfig keys)
  const [visibleColumns, setVisibleColumns] = useState({
    deal_name: true,
    description: true,
    value_usd: true,
    stage: true,
    expected_close_date: true,
    salesman_name: true,
    client_name: true,
    actions: true
  });

  const [searchColumns, setSearchColumns] = useState({
    deal_name: true,
    description: true,
    client_name: true,
    salesman_name: true
  });

  // Column definitions for the selector (matching fieldConfig keys)
  const columnDefinitions = [
    { id: 'deal_name', label: 'Deal Name', icon: Building, disabled: true }, // Always required
    { id: 'description', label: 'Description', icon: Edit2 },
    { id: 'value_usd', label: 'Value (USD)', icon: DollarSign },
    { id: 'stage', label: 'Stage', icon: null },
    { id: 'expected_close_date', label: 'Expected Close Date', icon: Calendar },
    { id: 'salesman_name', label: 'Assigned Salesman', icon: User },
    { id: 'client_name', label: 'Client', icon: Building },
    { id: 'actions', label: 'Actions', icon: null, disabled: true } // Always required
  ];

  // Handle column toggle
  const handleColumnToggle = (columnId, isVisible) => {
    setVisibleColumns(prev => ({
      ...prev,
      [columnId]: isVisible
    }));
  };

  // Delete confirmation modal state
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    deal: null,
    isDeleting: false
  });

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (addDealsDropdownRef.current && !addDealsDropdownRef.current.contains(event.target)) {
        setShowAddDealsDropdown(false);
      }
      if (moreOptionsDropdownRef.current && !moreOptionsDropdownRef.current.contains(event.target)) {
        setShowMoreOptionsDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load employees on component mount
  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  // Auto-hide notification after 3 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

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

  // Sorting and filtering logic
  const filteredAndSortedDeals = useMemo(() => {
    let filtered = deals;

    // Apply search filter with column selection
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = deals.filter(deal => {
        const searchableFields = [];
        
        if (searchColumns.deal_name) searchableFields.push(deal.deal_name);
        if (searchColumns.description) searchableFields.push(deal.description);
        if (searchColumns.client_name) searchableFields.push(deal.client_name);
        if (searchColumns.salesman_name) searchableFields.push(deal.salesman_name);
        
        return searchableFields.some(field => 
          field && field.toString().toLowerCase().includes(searchLower)
        );
      });
    }
    
    // Apply column filters
    filtered = filtered.filter(deal => {
      for (const [field, filter] of Object.entries(columnFilters)) {
        if (!applyColumnFilter(deal[field], filter)) {
          return false;
        }
      }
      return true;
    });

    // Apply sorting
    if (sortConfig.key) {
      filtered = [...filtered].sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;
        
        const aStr = aVal.toString().toLowerCase();
        const bStr = bVal.toString().toLowerCase();
        
        if (sortConfig.direction === 'asc') {
          return aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
        } else {
          return aStr > bStr ? -1 : aStr < bStr ? 1 : 0;
        }
      });
    }

    return filtered;
  }, [deals, searchTerm, searchColumns, sortConfig, columnFilters]);

  // Handle column sorting
  const handleSort = (field) => {
    setSortConfig(prev => ({
      key: field,
      direction: prev.key === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Handle adding new deal
  const handleAddDeal = () => {
    setIsAddingDeal(true);
    setNewDeal({
      deal_name: '',
      description: '',
      value_usd: 0,
      stage: 'Opportunity',
      expected_close_date: '',
      salesman_name: currentUserEmployeeId || '',  // ← CHANGED: Default to current user
      client_name: ''
    });
  };

  const cancelAddDeal = () => {
    setIsAddingDeal(false);
    setNewDeal({});
  };

  const saveNewDeal = async () => {
    // Prevent duplicate submissions
    if (isSavingNewDeal) {
      return;
    }

    try {
      setIsSavingNewDeal(true);

      console.log('newDeal state:', newDeal);
      console.log('client_name field value:', newDeal.client_name, 'type:', typeof newDeal.client_name);
      console.log('salesman_name field value:', newDeal.salesman_name, 'type:', typeof newDeal.salesman_name);

      // Validate required fields (salesman is now OPTIONAL)
      if (!newDeal.deal_name || !newDeal.client_name) {
        setNotification({
          type: 'error',
          message: 'Deal name and client are required'  // ← CHANGED: Removed salesman requirement
        });
        return;
      }

      // Parse IDs and validate they're valid numbers
      let employeeId = null;  // Default to null for auto-assignment

      if (newDeal.salesman_name && newDeal.salesman_name !== '') {
        // User explicitly selected a salesperson
        employeeId = parseInt(newDeal.salesman_name);

        if (isNaN(employeeId)) {
          setNotification({
            type: 'error',
            message: 'Please select a valid salesman from dropdown'
          });
          return;
        }

        console.log('👤 Manual assignment: employee_id', employeeId);
      } else {
        // No selection - backend will auto-assign
        console.log('🤖 Auto-assignment: employee_id will be set by backend');
      }

      const clientId = parseInt(newDeal.client_name);

      console.log('Parsed IDs - employee:', employeeId, 'client:', clientId);

      if (isNaN(clientId)) {
        setNotification({
          type: 'error',
          message: 'Please select a valid client from dropdown'
        });
        return;
      }

      const payload = {
        deal_name: newDeal.deal_name,
        description: newDeal.description || null,
        value_usd: parseFloat(newDeal.value_usd) || 0,
        stage: newDeal.stage || 'Opportunity',
        employee_id: employeeId,  // ← CHANGED: Can be null for auto-assignment
        client_id: clientId,
        expected_close_date: newDeal.expected_close_date || null
      };

      console.log('Creating deal with payload:', payload);

      const response = await authFetch(`${CRM_API_BASE_URL}/api/crm/deals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Deal creation failed:', response.status, errorData);

        // Enhanced error messages
        let errorMessage = 'Failed to create deal';

        if (errorData.detail) {
          if (errorData.detail.includes('not registered as an employee')) {
            errorMessage = 'You are not registered as an employee. Please contact your administrator.';
          } else if (errorData.detail.includes('Invalid employee_id')) {
            errorMessage = 'Selected salesperson is invalid. Please choose another.';
          } else {
            errorMessage = errorData.detail;
          }
        }

        throw new Error(errorMessage);
      }

      // Get the created deal from response
      const createdDeal = await response.json();
      console.log('Deal created successfully:', createdDeal);

      // Optimistically add the new deal to local state (like delete does)
      setDeals(prev => [createdDeal, ...prev]);

      setNotification({
        type: 'success',
        message: 'Deal added successfully'
      });

      setIsAddingDeal(false);
      setNewDeal({});

    } catch (error) {
      console.error('Error creating deal:', error);
      setNotification({
        type: 'error',
        message: error.message || 'Failed to create deal'
      });
    } finally {
      setIsSavingNewDeal(false);
    }
  };

  // Handle deleting a deal - opens confirmation modal
  const handleDeleteDeal = async (dealId, e) => {
    e.stopPropagation();

    if (!isAuthenticated) {
      setNotification({
        type: 'error',
        message: 'You must be logged in to delete deals'
      });
      return;
    }

    // Find the deal to show in modal
    const deal = deals.find(d => d.deal_id === dealId);
    if (!deal) return;

    // Open delete confirmation modal
    setDeleteModal({
      isOpen: true,
      deal: deal,
      isDeleting: false
    });
  };

  // Confirm delete from modal
  const confirmDeleteDeal = async () => {
    const deal = deleteModal.deal;
    if (!deal) return;

    setDeleteModal(prev => ({ ...prev, isDeleting: true }));

    try {
      // Use the deleteDeal function from CRMContext
      const result = await deleteDeal(deal.deal_id);
      if (result.success) {
        setNotification({
          type: 'success',
          message: `Deal "${deal.deal_name}" deleted successfully`
        });
        // Close modal
        setDeleteModal({
          isOpen: false,
          deal: null,
          isDeleting: false
        });
      } else {
        throw new Error(result.error || 'Failed to delete deal');
      }
    } catch (error) {
      console.error('Error deleting deal:', error);
      setNotification({
        type: 'error',
        message: `Failed to delete deal: ${error.message}`
      });

      // Keep modal open but stop loading state
      setDeleteModal(prev => ({ ...prev, isDeleting: false }));
    }
  };

  // Cancel delete from modal
  const cancelDeleteDeal = () => {
    setDeleteModal({
      isOpen: false,
      deal: null,
      isDeleting: false
    });
  };

  // Field configurations with types and validation
  const fieldConfig = {
    deal_name: { 
      type: 'text', 
      label: 'Deal Name', 
      icon: Building,
      required: true,
      validation: (value) => value?.length >= 2 ? null : 'Deal name must be at least 2 characters'
    },
    description: { 
      type: 'textarea', 
      label: 'Description', 
      icon: Edit2,
      validation: (value) => value?.length >= 5 ? null : 'Description must be at least 5 characters'
    },
    value_usd: { 
      type: 'currency', 
      label: 'Value (USD)', 
      icon: DollarSign,
      validation: (value) => {
        const num = parseFloat(value);
        return isNaN(num) || num < 0 ? 'Must be a valid positive number' : null;
      }
    },
    stage: {
      type: 'select',
      label: 'Stage',
      options: [
        { value: 'Opportunity', label: 'Opportunity', color: 'bg-blue-100 text-blue-800' },
        { value: 'Discovery', label: 'Discovery', color: 'bg-purple-100 text-purple-800' },
        { value: 'Negotiation', label: 'Negotiation', color: 'bg-orange-100 text-orange-800' },
        { value: 'Closed-Won', label: 'Closed Won', color: 'bg-green-100 text-green-800' },
        { value: 'Closed-Lost', label: 'Closed Lost', color: 'bg-red-100 text-red-800' }
      ]
    },
    expected_close_date: { 
      type: 'date', 
      label: 'Expected Close Date', 
      icon: Calendar
    },
    created_at: { 
      type: 'datetime-display', 
      label: 'Started Time', 
      icon: Clock,
      readonly: true
    },
    salesman_name: {
      type: 'select',
      label: 'Assigned Salesman',
      icon: User,
      required: false,
      hideInAddForm: true,  // ← CHANGED: Hide this field when adding new deals
      options: (() => {
        // Use actual employees from employee_info table
        const options = employees?.map(emp => ({
          value: emp.employee_id,
          label: emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || `Employee ${emp.employee_id}`
        })) || [];
        console.log('Salesman dropdown options from employee_info:', options);
        return options;
      })()
    },
    client_name: {
      type: 'select',
      label: 'Client',
      icon: Building,
      required: true,
      options: (() => {
        const options = customers?.map(c => {
          return { value: c.id || c.client_id, label: c.company || c.name };
        }) || [];
        console.log('Client dropdown options (fixed):', options);
        return options;
      })()
    }
  };

  // Fetch current user's employee ID for auto-assignment
  useEffect(() => {
    const fetchCurrentUserEmployeeId = async () => {
      if (!isAuthenticated || !user?.email) {
        setLoadingCurrentUser(false);
        return;
      }

      try {
        setLoadingCurrentUser(true);

        // Fetch all employees and find current user
        const response = await authFetch(`${CRM_API_BASE_URL}/api/crm/employees`);

        if (response.ok) {
          const employees = await response.json();
          const currentEmployee = employees.find(emp => emp.email === user.email);

          if (currentEmployee) {
            setCurrentUserEmployeeId(currentEmployee.employee_id);
            console.log('✅ Current user employee_id:', currentEmployee.employee_id);
          } else {
            console.warn('⚠️ Current user not found in employee_info table');
            setCurrentUserEmployeeId(null);
          }
        }
      } catch (error) {
        console.error('❌ Error fetching current user employee ID:', error);
        setCurrentUserEmployeeId(null);
      } finally {
        setLoadingCurrentUser(false);
      }
    };

    fetchCurrentUserEmployeeId();
  }, [isAuthenticated, user?.email, CRM_API_BASE_URL, authFetch]);

  // Load deals on component mount (only once)
  useEffect(() => {
    if (isAuthenticated && !dealsLoading && deals.length === 0 && !dealsError) {
      loadDeals();
    }
  }, [isAuthenticated]); // Removed loadDeals from deps to prevent infinite loop

  // Helper functions
  const getCellId = (dealId, field) => `${dealId}-${field}`;

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
      case 'datetime-display':
        return value ? new Date(value).toLocaleString() : '-';
      case 'select':
        if (field === 'salesman_name') {
          return value; // Already the display name
        }
        const option = config.options?.find(opt => opt.value === value);
        return option ? option.label : value;
      default:
        return value;
    }
  };

  const getBadgeColor = (value, field) => {
    const config = fieldConfig[field];
    if (config?.type === 'select' && field === 'stage') {
      const option = config.options?.find(opt => opt.value === value);
      return option?.color || 'bg-gray-100 text-gray-800';
    }
    return '';
  };

  // Start editing a cell
  const startEditing = (dealId, field, currentValue) => {
    const config = fieldConfig[field];
    if (config?.readonly) return;

    const cellId = getCellId(dealId, field);
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
  const cancelEditing = (dealId, field) => {
    const cellId = getCellId(dealId, field);
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

  // Save cell value
  const saveCell = async (dealId, field) => {
    const cellId = getCellId(dealId, field);
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
      if (config?.type === 'currency') {
        processedValue = parseFloat(newValue) || 0;
      } else if (config?.type === 'date') {
        processedValue = newValue || null;
      } else if (field === 'salesman_name') {
        // For salesman, we need to update employee_id and keep the name for display
        processedValue = parseInt(newValue) || null;
        field = 'employee_id'; // Update the actual field name for backend
      }

      console.log(`Updating deal ${dealId}, field: ${field}, value:`, processedValue);

      // Make API call to update deal
      const response = await authFetch(`${CRM_API_BASE_URL}/api/crm/deals/${dealId}`, {
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
        throw new Error(errorData.detail || `HTTP ${response.status}: Failed to update deal`);
      }

      const updatedDeal = await response.json();
      
      // Update the deal in CRM context
      updateDeal(updatedDeal);

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

      // Show success notification
      setNotification({
        type: 'success',
        message: `Successfully updated ${config.label}`
      });

    } catch (error) {
      console.error('Error updating deal:', error);
      setErrors(prev => ({
        ...prev,
        [cellId]: error.message
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

  // Render editable cell
  const renderEditableCell = (deal, field) => {
    const cellId = getCellId(deal.deal_id, field);
    const isEditing = editingCells.has(cellId);
    const isSaving = savingCells.has(cellId);
    const error = errors[cellId];
    const config = fieldConfig[field];
    const currentValue = deal[field];
    const editValue = editValues[cellId];

    if (config?.readonly) {
      // Read-only display
      return (
        <div className="px-2 py-1 min-h-[32px]">
          <span className="text-gray-900">
            {formatDisplayValue(currentValue, field)}
          </span>
        </div>
      );
    }

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
              onBlur={() => saveCell(deal.deal_id, field)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  saveCell(deal.deal_id, field);
                } else if (e.key === 'Escape') {
                  cancelEditing(deal.deal_id, field);
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
          ) : config?.type === 'textarea' ? (
            <textarea
              value={editValue}
              onChange={(e) => setEditValues(prev => ({
                ...prev,
                [cellId]: e.target.value
              }))}
              onBlur={() => saveCell(deal.deal_id, field)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  saveCell(deal.deal_id, field);
                } else if (e.key === 'Escape') {
                  cancelEditing(deal.deal_id, field);
                }
              }}
              className={`px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full resize-none ${
                error ? 'border-red-300' : 'border-gray-300'
              }`}
              rows={2}
              autoFocus
            />
          ) : (
            <input
              type={config?.type === 'currency' ? 'text' : config?.type || 'text'}
              value={editValue}
              onChange={(e) => setEditValues(prev => ({
                ...prev,
                [cellId]: e.target.value
              }))}
              onBlur={() => saveCell(deal.deal_id, field)}
              className={`px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full ${
                error ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder={config?.type === 'currency' ? 'Enter amount' : undefined}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  saveCell(deal.deal_id, field);
                } else if (e.key === 'Escape') {
                  cancelEditing(deal.deal_id, field);
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

    // Display mode
    return (
      <div
        className="group cursor-pointer hover:bg-blue-50 px-2 py-1 rounded flex items-center justify-between min-h-[32px] editable-cell"
        onClick={() => startEditing(deal.deal_id, field, currentValue)}
        title="Click to edit"
      >
        {config?.type === 'select' && field === 'stage' ? (
          <span className={`px-2 py-1 rounded-full text-xs ${getBadgeColor(currentValue, field)}`}>
            {formatDisplayValue(currentValue, field)}
          </span>
        ) : (
          <span className={currentValue ? 'text-gray-900' : 'text-gray-400 italic'}>
            {formatDisplayValue(currentValue, field)}
          </span>
        )}
        
        <Edit2 className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    );
  };

  if (dealsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading deals...</span>
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
      
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        {/* Left Side - Add Deals */}
        <div className="flex items-center gap-3">
          <div className="relative" ref={addDealsDropdownRef}>
            <button
              onClick={() => setShowAddDealsDropdown(!showAddDealsDropdown)}
              disabled={!isAuthenticated}
              className="inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none active:scale-95 font-manrope h-10 bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Add Deals"
              tabIndex="0"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Deals
              <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${showAddDealsDropdown ? 'rotate-180' : ''}`} />
            </button>

            {/* Add Deals Dropdown */}
            {showAddDealsDropdown && (
              <div className="absolute top-full left-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                <div className="py-1">
                  <button
                    onClick={() => {
                      handleAddDeal();
                      setShowAddDealsDropdown(false);
                    }}
                    disabled={isAddingDeal}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-pink-50 hover:text-pink-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="font-medium">Add Deal</span>
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
            availableColumns={[
              { key: 'deal_name', label: 'Deal Name', icon: '💼' },
              { key: 'description', label: 'Description', icon: '📝' },
              { key: 'client_name', label: 'Client', icon: '🏢' },
              { key: 'salesman_name', label: 'Salesman', icon: '👤' }
            ]}
            placeholder="Search deals..."
          />

          {/* Filter Dropdown */}
          <FilterDropdown
            columns={[
              { id: 'deal_name', label: 'Deal Name', type: 'text' },
              { id: 'description', label: 'Description', type: 'text' },
              { id: 'value_usd', label: 'Value (USD)', type: 'currency' },
              {
                id: 'stage',
                label: 'Stage',
                type: 'select',
                options: fieldConfig.stage.options
              },
              { id: 'expected_close_date', label: 'Expected Close Date', type: 'date' },
              { id: 'created_at', label: 'Started Time', type: 'datetime' },
              {
                id: 'salesman_name',
                label: 'Assigned Salesman',
                type: 'select',
                options: fieldConfig.salesman_name.options
              },
              { id: 'client_name', label: 'Client', type: 'text' }
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
                      loadDeals(true);
                      setShowMoreOptionsDropdown(false);
                    }}
                    disabled={dealsLoading}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-pink-50 hover:text-pink-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RefreshCw className={`w-4 h-4 ${dealsLoading ? 'animate-spin' : ''}`} />
                    <span className="font-medium">
                      {dealsLoading ? 'Refreshing...' : 'Refresh Data'}
                    </span>
                  </button>

                  {/* Divider */}
                  <div className="border-t border-gray-200 my-1"></div>

                  {/* Column Selector Section */}
                  <div className="px-4 py-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-gray-500 uppercase">Select Columns</span>
                      <span className="text-xs text-gray-500">
                        {Object.values(visibleColumns).filter(Boolean).length}/{columnDefinitions.length}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {columnDefinitions.map((column) => {
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
                            {Icon && <Icon className="w-4 h-4 text-gray-500" />}
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

      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full bg-white">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {Object.entries(fieldConfig).map(([field, config]) => {
                if (!visibleColumns[field]) return null;
                return (
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
                );
              })}
              {visibleColumns.actions && (
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {/* New Deal Row */}
            {isAddingDeal && (
              <tr className="bg-blue-50 border-2 border-blue-200">
                {Object.keys(fieldConfig).map((field) => {
                  if (!visibleColumns[field]) return null;
                  
                  const config = fieldConfig[field];

                  // Skip fields marked as hideInAddForm
                  if (config.hideInAddForm) {
                    return (
                      <td key={field} className="px-4 py-3 align-middle">
                        <div className="text-gray-400 italic text-sm">Auto-assigned</div>
                      </td>
                    );
                  }

                  if (config.readonly) {
                    return (
                      <td key={field} className="px-4 py-3 align-middle">
                        <div className="text-gray-400 italic text-sm">Auto-generated</div>
                      </td>
                    );
                  }
                  return (
                    <td key={field} className="px-4 py-3 align-middle">
                      {config.type === 'select' ? (
                        <select
                          value={newDeal[field] || ''}
                          onChange={(e) => setNewDeal(prev => ({ ...prev, [field]: e.target.value }))}
                          className="w-full px-2 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 h-[38px]"
                        >
                          <option value="">Select...</option>
                          {config.options?.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      ) : config.type === 'textarea' ? (
                        <textarea
                          value={newDeal[field] || ''}
                          onChange={(e) => setNewDeal(prev => ({ ...prev, [field]: e.target.value }))}
                          className="w-full px-2 py-[9px] border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 resize-none h-[38px] leading-tight overflow-hidden align-top"
                          rows={1}
                        />
                      ) : (
                        <input
                          type={config.type === 'currency' ? 'text' : config.type || 'text'}
                          value={newDeal[field] || ''}
                          onChange={(e) => setNewDeal(prev => ({ ...prev, [field]: e.target.value }))}
                          className="w-full px-2 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 h-[38px]"
                          placeholder={config.type === 'currency' ? 'Enter amount' : undefined}
                        />
                      )}
                    </td>
                  );
                })}
                {visibleColumns.actions && (
                  <td className="px-4 py-3 text-right align-middle">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={saveNewDeal}
                        className="text-green-600 hover:text-green-800 p-1"
                        title="Save deal"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={cancelAddDeal}
                        className="text-red-600 hover:text-red-800 p-1"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            )}
            
            {/* Existing Deals */}
            {filteredAndSortedDeals.map((deal, index) => (
              <tr
                key={deal.deal_id}
                className={`hover:bg-blue-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
              >
                {Object.keys(fieldConfig).map((field) => {
                  if (!visibleColumns[field]) return null;
                  return (
                    <td key={field} className="px-4 py-2 relative">
                      {renderEditableCell(deal, field)}
                    </td>
                  );
                })}
                {visibleColumns.actions && (
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={(e) => handleDeleteDeal(deal.deal_id, e)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition-colors"
                      title={`Delete ${deal.deal_name || 'deal'}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredAndSortedDeals.length === 0 && !dealsLoading && !isAddingDeal && (
        <div className="text-center py-12 text-gray-500">
          <DollarSign className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>{dealsError ? `Error: ${dealsError}` : searchTerm ? `No deals found matching "${searchTerm}"` : 'No deals found'}</p>
          {dealsError && (
            <button
              onClick={() => loadDeals(true)}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800"
            >
              Try again
            </button>
          )}
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="mt-2 ml-2 text-sm text-blue-600 hover:text-blue-800"
            >
              Clear search
            </button>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        itemName={deleteModal.deal?.deal_name}
        itemType="deal"
        isDeleting={deleteModal.isDeleting}
        onConfirm={confirmDeleteDeal}
        onClose={cancelDeleteDeal}
      />
    </div>
  );
};

export default EditableDealsTable;

// Add these styles to your global CSS or tailwind config
// @keyframes fade-in {
//   from { opacity: 0; transform: translateY(-10px); }
//   to { opacity: 1; transform: translateY(0); }
// }
// .animate-fade-in { animation: fade-in 0.3s ease-out; }