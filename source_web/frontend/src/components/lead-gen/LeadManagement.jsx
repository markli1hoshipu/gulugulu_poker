import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import { useLeadContext } from '../../contexts/LeadContext';

import {
  Users,
  RefreshCw,
  Trash2,
  Loader2,
  Upload,
  ChevronDown,
  Building,
  MapPin,
  Phone,
  Mail,
  Save,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Activity,
  Settings,
  Globe,
  MoreVertical,
  Plus
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import leadsApiService from '../../services/leadsApi';
import ConfirmDialog from '../ui/ConfirmDialog';
import LeadDetailModal from './LeadDetailModal';
import AddLeadModal from './AddLeadModal';
import CSVUploadModal from './CSVUploadModal';
import FilterDropdown from './FilterDropdown';
import SearchBarWithColumns from '../crm/SearchBarWithColumns';

const LeadManagement = () => {
  // Use Lead Context
  const {
    leads,
    workflowLeads,
    isLoading,
    hasInitialLoad,
    loadLeads,
    updateLeadStatus: contextUpdateLeadStatus,
    deleteLead: contextDeleteLead,
    removeLeadFromState,
    isCacheValid
  } = useLeadContext();

  // Local state management (filters, UI state)
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchColumns, setSearchColumns] = useState({
    company: true,
    location: true,
    industry: true,
    email: true,
    phone: true,
    website: true
  });
  const [sortBy, setSortBy] = useState('company'); // Default sort by company name
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' or 'desc'
  const [selectedLead, setSelectedLead] = useState(null);
  const [localLoading, setLocalLoading] = useState(false); // For local UI operations

  // Modal and dropdown states
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [showCSVUploadModal, setShowCSVUploadModal] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(null);
  const [modalActiveTab, setModalActiveTab] = useState('information'); // 'information' or 'email'

  // Delete confirmation states
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // AI suggestions state - keyed by lead ID
  const [aiSuggestions, setAiSuggestions] = useState({});
  const [isLoadingAiSuggestions, setIsLoadingAiSuggestions] = useState(false);
  const [aiSuggestionsError, setAiSuggestionsError] = useState({});


  // Column filters and visibility state - default to only essential columns
  const [columnFilters, setColumnFilters] = useState({});
  const [visibleColumns, setVisibleColumns] = useState({
    company: true,    // Always visible - cannot be deselected
    location: false,
    industry: true,   // Default visible
    email: false,
    phone: false,
    website: true,    // Default visible
    status: true      // Default visible
  });

  // New lead creation state
  const [isAddingNewLead, setIsAddingNewLead] = useState(false);
  const [newLeadData, setNewLeadData] = useState({
    company: '',
    name: '',
    email: '',
    phone: '',
    location: '',
    address: '',
    industry: '',
    status: 'new'
  });

  // Dropdown states
  const [showAddLeadsDropdown, setShowAddLeadsDropdown] = useState(false);
  const [showMoreOptionsDropdown, setShowMoreOptionsDropdown] = useState(false);

  // Refs
  const scrollContainerRef = useRef(null);
  const addLeadsDropdownRef = useRef(null);
  const moreOptionsDropdownRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (addLeadsDropdownRef.current && !addLeadsDropdownRef.current.contains(event.target)) {
        setShowAddLeadsDropdown(false);
      }
      if (moreOptionsDropdownRef.current && !moreOptionsDropdownRef.current.contains(event.target)) {
        setShowMoreOptionsDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle sorting
  const handleSort = (field) => {
    try {
      if (!field) return;

      let newSortOrder = 'asc';
      if (sortBy === field && sortOrder === 'asc') {
        newSortOrder = 'desc';
      }
      setSortBy(field);
      setSortOrder(newSortOrder);
    } catch (error) {
      console.error('Error in handleSort:', error);
    }
  };

  // Handle column visibility toggle
  const handleColumnToggle = (columnId, isVisible) => {
    setVisibleColumns(prev => ({
      ...prev,
      [columnId]: isVisible
    }));
  };

  // Apply column filter (similar to CRM implementation)
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

  // Handle adding new lead
  const handleAddNewLead = () => {
    setIsAddingNewLead(true);
    setNewLeadData({
      company: '',
      name: '',
      email: '',
      phone: '',
      location: '',
      address: '',
      industry: '',
      status: 'new'
    });
  };

  // Handle saving new lead
  const handleSaveNewLead = async () => {
    try {
      // Validate required fields
      if (!newLeadData.company.trim()) {
        toast.error('Company name is required');
        return;
      }

      // Prepare lead data for API
      const leadData = {
        company: newLeadData.company.trim(),
        name: newLeadData.name.trim(),
        email: newLeadData.email.trim(),
        phone: newLeadData.phone.trim(),
        location: newLeadData.location.trim(),
        address: newLeadData.address.trim(),
        industry: newLeadData.industry.trim(),
        status: newLeadData.status
      };

      // Call API to save lead
      const response = await leadsApiService.createLead(leadData);

      // Check if response indicates success
      if (response && (response.success !== false)) {
        toast.success('Lead added successfully');
        setIsAddingNewLead(false);
        // Refresh leads to show the new one
        await loadLeads(true);
      } else {
        throw new Error(response?.error || response?.message || 'Failed to add lead');
      }
    } catch (error) {
      console.error('Error saving new lead:', error);
      toast.error(`Failed to add lead: ${error.message}`);
    }
  };

  // Handle canceling new lead
  const handleCancelNewLead = () => {
    setIsAddingNewLead(false);
    setNewLeadData({
      company: '',
      name: '',
      email: '',
      phone: '',
      location: '',
      address: '',
      industry: '',
      status: 'new'
    });
  };

  // Handle new lead data change
  const handleNewLeadChange = (field, value) => {
    setNewLeadData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Render new lead input row
  const renderNewLeadRow = () => {
    if (!isAddingNewLead) return null;

    return (
      <tr className="bg-blue-50 border-2 border-blue-200">
        {/* Company column */}
        {visibleColumns.company && (
          <td className="px-4 py-3 whitespace-nowrap">
            <div className="flex items-center">
              <div className="space-y-1">
                <input
                  type="text"
                  value={newLeadData.company}
                  onChange={(e) => handleNewLeadChange('company', e.target.value)}
                  placeholder="Company name *"
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  autoFocus
                />
                {visibleColumns.name && (
                  <input
                    type="text"
                    value={newLeadData.name}
                    onChange={(e) => handleNewLeadChange('name', e.target.value)}
                    placeholder="Contact name"
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                )}
              </div>
            </div>
          </td>
        )}
        {/* Status column */}
        {visibleColumns.status && (
          <td className="px-4 py-3 whitespace-nowrap">
            <select
              value={newLeadData.status}
              onChange={(e) => handleNewLeadChange('status', e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </td>
        )}
        {/* Contact column */}
        {(visibleColumns.email || visibleColumns.phone) && (
          <td className="px-4 py-3 whitespace-nowrap">
            <div className="space-y-1">
              {visibleColumns.email && (
                <input
                  type="email"
                  value={newLeadData.email}
                  onChange={(e) => handleNewLeadChange('email', e.target.value)}
                  placeholder="Email"
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              )}
              {visibleColumns.phone && (
                <input
                  type="tel"
                  value={newLeadData.phone}
                  onChange={(e) => handleNewLeadChange('phone', e.target.value)}
                  placeholder="Phone"
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              )}
            </div>
          </td>
        )}
        {/* Location column */}
        {visibleColumns.location && (
          <td className="px-4 py-3 whitespace-nowrap">
            <input
              type="text"
              value={newLeadData.location}
              onChange={(e) => handleNewLeadChange('location', e.target.value)}
              placeholder="Location"
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </td>
        )}
        {/* Actions column */}
        <td className="px-4 py-2 text-right">
          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={handleSaveNewLead}
              className="text-green-600 hover:text-green-800 hover:bg-green-50 p-1 rounded transition-colors"
              title="Save Lead"
            >
              <Save className="w-4 h-4" />
            </button>
            <button
              onClick={handleCancelNewLead}
              className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition-colors"
              title="Cancel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </td>
      </tr>
    );
  };

  // Status options for the dropdown
  const statusOptions = [
    { value: 'new', label: 'New', color: 'bg-blue-100 text-blue-800' },
    { value: 'contacted', label: 'Contacted', color: 'bg-purple-100 text-purple-800' },
    { value: 'qualified', label: 'Qualified', color: 'bg-green-100 text-green-800' },
    { value: 'lost', label: 'Lost', color: 'bg-red-100 text-red-800' }
  ];

  // Get status option by value
  const getStatusOption = (status) => {
    return statusOptions.find(option => option.value === status) || statusOptions[0];
  };

  // Field configuration for inline editing - matches backend schema exactly
  const fieldConfig = {
    company: {
      id: 'company',
      type: 'text',
      label: 'Company',
      icon: Building,
      required: true,
      sortable: true,
      disabled: true, // Cannot be deselected
      validation: (value) => value?.length >= 2 ? null : 'Company name must be at least 2 characters'
    },
    location: {
      id: 'location',
      type: 'text',
      label: 'Location',
      icon: MapPin,
      sortable: true
    },
    industry: {
      id: 'industry',
      type: 'text',
      label: 'Industry',
      icon: Building,
      sortable: true
    },
    email: {
      id: 'email',
      type: 'email',
      label: 'Email',
      icon: Mail,
      sortable: true,
      validation: (value) => {
        if (!value) return null; // Email is optional
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(value) ? null : 'Invalid email format';
      }
    },
    phone: {
      id: 'phone',
      type: 'tel',
      label: 'Phone',
      icon: Phone,
      sortable: true,
      validation: (value) => !value || value.length >= 10 ? null : 'Phone number must be at least 10 digits'
    },
    website: {
      id: 'website',
      type: 'url',
      label: 'Website',
      icon: Globe,
      sortable: true,
      validation: (value) => {
        if (!value) return null; // Website is optional
        try {
          new URL(value);
          return null;
        } catch {
          return 'Invalid website URL';
        }
      }
    },
    status: {
      id: 'status',
      type: 'select',
      label: 'Status',
      sortable: true,
      options: statusOptions
    }
  };

  // Sort leads function
  const sortLeads = useCallback((leadsArray) => {
    return [...leadsArray].sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];

      // Handle special cases
      if (sortBy === 'created_at') {
        aVal = new Date(aVal || 0);
        bVal = new Date(bVal || 0);
      } else if (sortBy === 'status') {
        // Sort by status priority
        const statusPriority = { 'converted': 7, 'qualified': 6, 'hot': 5, 'warm': 4, 'contacted': 3, 'new_lead': 2, 'cold': 1, 'lost': 0 };
        aVal = statusPriority[aVal] || 0;
        bVal = statusPriority[bVal] || 0;
      } else {
        // String comparison
        aVal = String(aVal || '').toLowerCase();
        bVal = String(bVal || '').toLowerCase();
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [sortBy, sortOrder]);

  // Auto-load leads on mount or when cache expires
  useEffect(() => {
    if (!hasInitialLoad || !isCacheValid) {
      loadLeads();
    }
  }, [hasInitialLoad, isCacheValid, loadLeads]);

  // Filter workflow leads
  const filteredWorkflowLeads = useMemo(() => {
    const filtered = workflowLeads.map((lead, index) => ({
      ...lead,
      id: lead.id || `workflow-${index}`, // Ensure every lead has an ID
      status: lead.status || 'new' // Ensure default status
    })).filter(lead => {
      // Search filter with column selection
      const matchesSearch = searchTerm.length === 0 || (() => {
        const searchLower = searchTerm.toLowerCase();
        const searchableFields = [];
        
        if (searchColumns.company) searchableFields.push(lead.company);
        if (searchColumns.name) searchableFields.push(lead.name);
        if (searchColumns.email) searchableFields.push(lead.email);
        if (searchColumns.phone) searchableFields.push(lead.phone);
        if (searchColumns.location) searchableFields.push(lead.address);
        
        return searchableFields.some(field => 
          field && field.toLowerCase().includes(searchLower)
        );
      })();

      // Status filter
      const matchesStatus = filterStatus === 'all' || lead.status === filterStatus;

      // Column filters
      for (const [field, filter] of Object.entries(columnFilters)) {
        if (!applyColumnFilter(lead[field], filter)) {
          return false;
        }
      }

      return matchesSearch && matchesStatus;
    });

    return sortLeads(filtered);
  }, [workflowLeads, filterStatus, searchTerm, searchColumns, columnFilters, sortLeads]);

  // Filter manual leads
  const filteredManualLeads = useMemo(() => {
    const filtered = leads.map((lead, index) => ({
      ...lead,
      id: lead.id || `manual-${index}`, // Ensure every lead has an ID
      status: lead.status || 'new' // Ensure default status
    })).filter(lead => {
      // Search filter with column selection
      const matchesSearch = searchTerm.length === 0 || (() => {
        const searchLower = searchTerm.toLowerCase();
        const searchableFields = [];
        
        if (searchColumns.company) searchableFields.push(lead.company);
        if (searchColumns.name) searchableFields.push(lead.name);
        if (searchColumns.email) searchableFields.push(lead.email);
        if (searchColumns.phone) searchableFields.push(lead.phone);
        if (searchColumns.location) searchableFields.push(lead.address);
        
        return searchableFields.some(field => 
          field && field.toLowerCase().includes(searchLower)
        );
      })();

      // Status filter
      const matchesStatus = filterStatus === 'all' || lead.status === filterStatus;

      // Column filters
      for (const [field, filter] of Object.entries(columnFilters)) {
        if (!applyColumnFilter(lead[field], filter)) {
          return false;
        }
      }

      return matchesSearch && matchesStatus;
    });

    return sortLeads(filtered);
  }, [leads, filterStatus, searchTerm, searchColumns, columnFilters, sortLeads]);


  // Handle status update
  const handleStatusUpdate = useCallback(async (leadId, newStatus) => {
    try {
      // Update using context method
      await contextUpdateLeadStatus(leadId, newStatus);

      const statusLabel = getStatusOption(newStatus).label;
      toast.success(`Lead status updated to ${statusLabel}`);
      setStatusDropdownOpen(null);
    } catch (error) {
      toast.error('Failed to update lead status');
      console.error('Status update error:', error);
    }
  }, [contextUpdateLeadStatus, getStatusOption]);

  // Delete handlers
  const handleDeleteClick = useCallback((lead) => {
    setLeadToDelete(lead);
    setShowDeleteConfirmation(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!leadToDelete) return;

    try {
      setIsDeleting(true);

      // Delete using context method
      await contextDeleteLead(leadToDelete.id);

      toast.success(`Lead "${leadToDelete.company}" deleted successfully`);

    } catch (error) {
      toast.error('Failed to delete lead');
      console.error('Delete error:', error);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirmation(false);
      setLeadToDelete(null);
    }
  }, [leadToDelete, contextDeleteLead]);

  const handleDeleteCancel = useCallback(() => {
    setShowDeleteConfirmation(false);
    setLeadToDelete(null);
  }, []);

  // Handle row click to open modal
  const handleRowClick = useCallback((lead, e) => {
    // Don't open modal if user clicked on an editable cell or a button
    if (e.target.closest('.editable-cell') || e.target.closest('button') || e.target.closest('select') || e.target.closest('input')) {
      return;
    }
    setSelectedLead(lead);
    setShowLeadModal(true);
    setModalActiveTab('information'); // Reset to information tab
    // Don't reset AI suggestions - they're now keyed by lead ID
    setIsLoadingAiSuggestions(false);
  }, []);

  // Load cached AI suggestions when lead profile opens (does not generate new)
  const loadCachedAiSuggestions = useCallback(async (leadId) => {
    if (!leadId) return;

    try {
      const cached = await leadsApiService.getCachedAISuggestions(leadId);

      if (cached) {
        // Store cached suggestions
        setAiSuggestions(prev => ({
          ...prev,
          [leadId]: cached
        }));
      }
    } catch (error) {
      console.error('❌ Failed to load cached AI analysis:', error);
      // Silent fail - user can still click Regenerate Report button
    }
  }, []);

  // Regenerate AI suggestions for the selected lead (always generates fresh)
  const regenerateAiSuggestions = useCallback(async (leadId) => {
    if (!leadId) return;

    setIsLoadingAiSuggestions(true);
    // Clear error for this specific lead
    setAiSuggestionsError(prev => ({
      ...prev,
      [leadId]: null
    }));

    try {
      const suggestions = await leadsApiService.regenerateAISuggestions(leadId);

      // Store suggestions keyed by lead ID
      setAiSuggestions(prev => ({
        ...prev,
        [leadId]: suggestions
      }));
    } catch (error) {
      console.error('❌ Failed to regenerate AI analysis:', error);

      // Store error keyed by lead ID
      setAiSuggestionsError(prev => ({
        ...prev,
        [leadId]: error.message || 'Failed to regenerate AI analysis'
      }));
    } finally {
      setIsLoadingAiSuggestions(false);
    }
  }, []);


  // Handle email sent
  const handleEmailSent = useCallback(async (emailData) => {
    toast.success('Email sent successfully!');

    // Update the lead status if it was changed by the email send
    if (emailData && emailData.status_changed === true && emailData.new_status) {
      try {
        // Find the lead ID from the email data - we need to match by email address
        const leadToUpdate = [...leads, ...workflowLeads].find(lead =>
          lead.email === emailData.sent_to
        );

        if (leadToUpdate) {
          await contextUpdateLeadStatus(leadToUpdate.lead_id, emailData.new_status);
          toast.success(`Lead status updated to ${emailData.new_status}`);
        }
      } catch (error) {
        console.error('❌ Failed to update lead status:', error);
        toast.error('Email sent, but failed to update lead status');
      }
    }
  }, [leads, workflowLeads, contextUpdateLeadStatus]);

  // Handle add lead to CRM action
  const handleAddToCRM = useCallback(async (lead, person = null) => {
    try {
      setLocalLoading(true);
      const loadingToastId = toast.loading(
        `Adding ${lead.company}${person ? ` (${person.first_name || person.name})` : ''} to CRM...`
      );

      const result = await leadsApiService.addLeadToCRM(
        lead.id,
        person?.personnel_id || null
      );

      toast.dismiss(loadingToastId);

      if (result.success) {
        if (result.already_exists) {
          toast.success(
            `ℹ️ ${lead.company} already exists in CRM (Customer ID: ${result.crm_customer_id})`,
            { duration: 4000 }
          );
        } else {
          toast.success(
            `✅ Successfully added ${lead.company} to CRM! (Customer ID: ${result.crm_customer_id})`,
            { duration: 4000 }
          );
        }

        // Remove lead from local state (optimistic update)
        removeLeadFromState(lead.id);

        // Close modal if this lead is currently selected
        if (selectedLead?.id === lead.id) {
          setSelectedLead(null);
          setShowLeadModal(false);
        }
      } else {
        toast.error(`❌ Failed to add to CRM: ${result.message}`, { duration: 6000 });
      }
    } catch (error) {
      toast.error(`❌ Error adding to CRM: ${error.message}`, { duration: 6000 });
    } finally {
      setLocalLoading(false);
    }
  }, [removeLeadFromState, selectedLead]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 bg-white">
        {/* Unified Toolbar */}
        <div className="flex items-center justify-between mb-4">
          {/* Left Side - Add Leads */}
          <div className="flex items-center gap-3">
            <div className="relative" ref={addLeadsDropdownRef}>
              <button
                onClick={() => setShowAddLeadsDropdown(!showAddLeadsDropdown)}
                disabled={isLoading || localLoading}
                className="inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none active:scale-95 font-manrope h-10 bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Add Leads"
                tabIndex="0"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Leads
                <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${showAddLeadsDropdown ? 'rotate-180' : ''}`} />
              </button>

              {/* Add Leads Dropdown */}
              {showAddLeadsDropdown && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        handleAddNewLead();
                        setShowAddLeadsDropdown(false);
                      }}
                      disabled={isAddingNewLead}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-pink-50 hover:text-pink-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Users className="w-4 h-4" />
                      <span className="font-medium">Add Lead</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowCSVUploadModal(true);
                        setShowAddLeadsDropdown(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-pink-50 hover:text-pink-700 transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                      <span className="font-medium">Import CSV</span>
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
                { key: 'company', label: 'Company', icon: '🏢' },
                { key: 'name', label: 'Name', icon: '👤' },
                { key: 'email', label: 'Email', icon: '📧' },
                { key: 'phone', label: 'Phone', icon: '📞' },
                { key: 'location', label: 'Location', icon: '📍' }
              ]}
              placeholder="Search leads..."
            />

            {/* Filter Dropdown */}
            <FilterDropdown
              columns={Object.values(fieldConfig)}
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
                        loadLeads(true);
                        setShowMoreOptionsDropdown(false);
                      }}
                      disabled={isLoading || localLoading}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-pink-50 hover:text-pink-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                      <span className="font-medium">
                        {isLoading ? 'Refreshing...' : 'Refresh Data'}
                      </span>
                    </button>

                    {/* Divider */}
                    <div className="border-t border-gray-200 my-1"></div>

                    {/* Column Selector Section */}
                    <div className="px-4 py-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-gray-500 uppercase">Select Columns</span>
                        <span className="text-xs text-gray-500">
                          {Object.values(visibleColumns).filter(Boolean).length}/{Object.values(fieldConfig).length}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {Object.values(fieldConfig).map((column) => {
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

      </div>

      {/* Lead Tables */}
      <div ref={scrollContainerRef} className="flex-1 overflow-auto px-4 pt-0 pb-4">
        {isLoading && !hasInitialLoad ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading leads...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Workflow Generated Section */}
            {filteredWorkflowLeads.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border">
                <table className="w-full" style={{ tableLayout: 'fixed' }}>
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      {/* Company - always visible */}
                      {visibleColumns.company && (
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <div
                            className="flex items-center gap-2 cursor-pointer hover:text-gray-700"
                            onClick={() => handleSort('company')}
                          >
                            <Building className="w-4 h-4" />
                            <span>Company</span>
                            {sortBy === 'company' ? (
                              sortOrder === 'asc' ?
                                <ArrowUp className="w-3 h-3 text-blue-600" /> :
                                <ArrowDown className="w-3 h-3 text-blue-600" />
                            ) : (
                              <ArrowUpDown className="w-3 h-3 text-gray-400" />
                            )}
                          </div>
                        </th>
                      )}
                      {/* Location */}
                      {visibleColumns.location && (
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <div
                            className="flex items-center gap-2 cursor-pointer hover:text-gray-700"
                            onClick={() => handleSort('location')}
                          >
                            <MapPin className="w-4 h-4" />
                            <span>Location</span>
                            {sortBy === 'location' ? (
                              sortOrder === 'asc' ?
                                <ArrowUp className="w-3 h-3 text-blue-600" /> :
                                <ArrowDown className="w-3 h-3 text-blue-600" />
                            ) : (
                              <ArrowUpDown className="w-3 h-3 text-gray-400" />
                            )}
                          </div>
                        </th>
                      )}
                      {/* Industry */}
                      {visibleColumns.industry && (
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <div
                            className="flex items-center gap-2 cursor-pointer hover:text-gray-700"
                            onClick={() => handleSort('industry')}
                          >
                            <Building className="w-4 h-4" />
                            <span>Industry</span>
                            {sortBy === 'industry' ? (
                              sortOrder === 'asc' ?
                                <ArrowUp className="w-3 h-3 text-blue-600" /> :
                                <ArrowDown className="w-3 h-3 text-blue-600" />
                            ) : (
                              <ArrowUpDown className="w-3 h-3 text-gray-400" />
                            )}
                          </div>
                        </th>
                      )}
                      {/* Email */}
                      {visibleColumns.email && (
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <div
                            className="flex items-center gap-2 cursor-pointer hover:text-gray-700"
                            onClick={() => handleSort('email')}
                          >
                            <Mail className="w-4 h-4" />
                            <span>Email</span>
                            {sortBy === 'email' ? (
                              sortOrder === 'asc' ?
                                <ArrowUp className="w-3 h-3 text-blue-600" /> :
                                <ArrowDown className="w-3 h-3 text-blue-600" />
                            ) : (
                              <ArrowUpDown className="w-3 h-3 text-gray-400" />
                            )}
                          </div>
                        </th>
                      )}
                      {/* Phone */}
                      {visibleColumns.phone && (
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <div
                            className="flex items-center gap-2 cursor-pointer hover:text-gray-700"
                            onClick={() => handleSort('phone')}
                          >
                            <Phone className="w-4 h-4" />
                            <span>Phone</span>
                            {sortBy === 'phone' ? (
                              sortOrder === 'asc' ?
                                <ArrowUp className="w-3 h-3 text-blue-600" /> :
                                <ArrowDown className="w-3 h-3 text-blue-600" />
                            ) : (
                              <ArrowUpDown className="w-3 h-3 text-gray-400" />
                            )}
                          </div>
                        </th>
                      )}
                      {/* Website */}
                      {visibleColumns.website && (
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <div
                            className="flex items-center gap-2 cursor-pointer hover:text-gray-700"
                            onClick={() => handleSort('website')}
                          >
                            <Globe className="w-4 h-4" />
                            <span>Website</span>
                            {sortBy === 'website' ? (
                              sortOrder === 'asc' ?
                                <ArrowUp className="w-3 h-3 text-blue-600" /> :
                                <ArrowDown className="w-3 h-3 text-blue-600" />
                            ) : (
                              <ArrowUpDown className="w-3 h-3 text-gray-400" />
                            )}
                          </div>
                        </th>
                      )}
                      {/* Status */}
                      {visibleColumns.status && (
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <div
                            className="flex items-center gap-2 cursor-pointer hover:text-gray-700"
                            onClick={() => handleSort('status')}
                          >
                            <Activity className="w-4 h-4" />
                            <span>Status</span>
                            {sortBy === 'status' ? (
                              sortOrder === 'asc' ?
                                <ArrowUp className="w-3 h-3 text-blue-600" /> :
                                <ArrowDown className="w-3 h-3 text-blue-600" />
                            ) : (
                              <ArrowUpDown className="w-3 h-3 text-gray-400" />
                            )}
                          </div>
                        </th>
                      )}
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <div className="flex items-center justify-end gap-2">
                          <Settings className="w-4 h-4" />
                          <span>Actions</span>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {renderNewLeadRow()}
                    {filteredWorkflowLeads.map((lead, index) => (
                      <tr
                        key={lead.id}
                        className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors cursor-pointer`}
                        onClick={(e) => handleRowClick(lead, e)}
                      >
                        {/* Company column */}
                        {visibleColumns.company && (
                          <td className="px-4 py-3" style={{ maxWidth: '380px'}}>
                            <div className="flex items-center min-w-0">
                              <div className="min-w-0 flex-1 overflow-hidden">
                                <div className="truncate" title={lead.company}>
                                  <span className="text-gray-900">{lead.company}</span>
                                </div>
                              </div>
                            </div>
                          </td>
                        )}
                        {/* Location column */}
                        {visibleColumns.location && (
                          <td className="px-4 py-3" style={{ maxWidth: '200px'}}>
                            <div className="truncate" title={lead.location}>
                              <span className="text-gray-900">{lead.location || '-'}</span>
                            </div>
                          </td>
                        )}
                        {/* Industry column */}
                        {visibleColumns.industry && (
                          <td className="px-4 py-3" style={{ maxWidth: '150px'}}>
                            <div className="truncate" title={lead.industry}>
                              <span className="text-gray-900">{lead.industry || '-'}</span>
                            </div>
                          </td>
                        )}
                        {/* Email column */}
                        {visibleColumns.email && (
                          <td className="px-4 py-3" style={{ maxWidth: '250px'}}>
                            <div className="truncate" title={lead.email}>
                              <span className="text-gray-900">{lead.email || '-'}</span>
                            </div>
                          </td>
                        )}
                        {/* Phone column */}
                        {visibleColumns.phone && (
                          <td className="px-4 py-3" style={{ maxWidth: '150px'}}>
                            <div className="truncate" title={lead.phone}>
                              <span className="text-gray-900">{lead.phone || '-'}</span>
                            </div>
                          </td>
                        )}
                        {/* Website column */}
                        {visibleColumns.website && (
                          <td className="px-4 py-3" style={{ maxWidth: '200px'}}>
                            <div className="truncate" title={lead.website}>
                              {lead.website ? (
                                <a
                                  href={lead.website}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {lead.website}
                                </a>
                              ) : (
                                <span className="text-gray-900">-</span>
                              )}
                            </div>
                          </td>
                        )}
                        {/* Status column */}
                        {visibleColumns.status && (
                          <td className="px-4 py-3 whitespace-nowrap" style={{ maxWidth: '120px'}}>
                            <div className="relative">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setStatusDropdownOpen(statusDropdownOpen === lead.id ? null : lead.id);
                                }}
                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusOption(lead.status).color} hover:opacity-80 transition-opacity`}
                              >
                                {getStatusOption(lead.status).label}
                                <ChevronDown className="w-3 h-3 ml-1" />
                              </button>
                              {statusDropdownOpen === lead.id && (
                                <div className="absolute top-full left-0 mt-1 w-36 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-48 overflow-y-auto">
                                  {statusOptions.map((option) => (
                                    <button
                                      key={option.value}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleStatusUpdate(lead.id, option.value);
                                      }}
                                      className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 border-b border-gray-100 last:border-b-0 block"
                                    >
                                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${option.color}`}>
                                        {option.label}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        )}
                        {/* Actions column */}
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(lead);
                            }}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition-colors"
                            title={`Delete ${lead.company}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Manual/Uploaded Section */}
            {filteredManualLeads.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="px-4 pt-2 bg-purple-50 border-b border-purple-200 rounded-t-lg">
                  <h3 className="text-sm font-semibold text-purple-800 flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    Manual/Uploaded ({filteredManualLeads.length})
                  </h3>
                </div>
                <table className="w-full" style={{ tableLayout: 'fixed' }}>
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      {/* Company */}
                      {visibleColumns.company && (
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <div
                            className="flex items-center gap-2 cursor-pointer hover:text-gray-700"
                            onClick={() => handleSort('company')}
                          >
                            <Building className="w-4 h-4" />
                            <span>Company</span>
                            {sortBy === 'company' ? (
                              sortOrder === 'asc' ?
                                <ArrowUp className="w-3 h-3 text-blue-600" /> :
                                <ArrowDown className="w-3 h-3 text-blue-600" />
                            ) : (
                              <ArrowUpDown className="w-3 h-3 text-gray-400" />
                            )}
                          </div>
                        </th>
                      )}
                      {/* Location */}
                      {visibleColumns.location && (
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <div
                            className="flex items-center gap-2 cursor-pointer hover:text-gray-700"
                            onClick={() => handleSort('location')}
                          >
                            <MapPin className="w-4 h-4" />
                            <span>Location</span>
                            {sortBy === 'location' ? (
                              sortOrder === 'asc' ?
                                <ArrowUp className="w-3 h-3 text-blue-600" /> :
                                <ArrowDown className="w-3 h-3 text-blue-600" />
                            ) : (
                              <ArrowUpDown className="w-3 h-3 text-gray-400" />
                            )}
                          </div>
                        </th>
                      )}
                      {/* Industry */}
                      {visibleColumns.industry && (
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <div
                            className="flex items-center gap-2 cursor-pointer hover:text-gray-700"
                            onClick={() => handleSort('industry')}
                          >
                            <Building className="w-4 h-4" />
                            <span>Industry</span>
                            {sortBy === 'industry' ? (
                              sortOrder === 'asc' ?
                                <ArrowUp className="w-3 h-3 text-blue-600" /> :
                                <ArrowDown className="w-3 h-3 text-blue-600" />
                            ) : (
                              <ArrowUpDown className="w-3 h-3 text-gray-400" />
                            )}
                          </div>
                        </th>
                      )}
                      {/* Email */}
                      {visibleColumns.email && (
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <div
                            className="flex items-center gap-2 cursor-pointer hover:text-gray-700"
                            onClick={() => handleSort('email')}
                          >
                            <Mail className="w-4 h-4" />
                            <span>Email</span>
                            {sortBy === 'email' ? (
                              sortOrder === 'asc' ?
                                <ArrowUp className="w-3 h-3 text-blue-600" /> :
                                <ArrowDown className="w-3 h-3 text-blue-600" />
                            ) : (
                              <ArrowUpDown className="w-3 h-3 text-gray-400" />
                            )}
                          </div>
                        </th>
                      )}
                      {/* Phone */}
                      {visibleColumns.phone && (
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <div
                            className="flex items-center gap-2 cursor-pointer hover:text-gray-700"
                            onClick={() => handleSort('phone')}
                          >
                            <Phone className="w-4 h-4" />
                            <span>Phone</span>
                            {sortBy === 'phone' ? (
                              sortOrder === 'asc' ?
                                <ArrowUp className="w-3 h-3 text-blue-600" /> :
                                <ArrowDown className="w-3 h-3 text-blue-600" />
                            ) : (
                              <ArrowUpDown className="w-3 h-3 text-gray-400" />
                            )}
                          </div>
                        </th>
                      )}
                      {/* Website */}
                      {visibleColumns.website && (
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <div
                            className="flex items-center gap-2 cursor-pointer hover:text-gray-700"
                            onClick={() => handleSort('website')}
                          >
                            <Globe className="w-4 h-4" />
                            <span>Website</span>
                            {sortBy === 'website' ? (
                              sortOrder === 'asc' ?
                                <ArrowUp className="w-3 h-3 text-blue-600" /> :
                                <ArrowDown className="w-3 h-3 text-blue-600" />
                            ) : (
                              <ArrowUpDown className="w-3 h-3 text-gray-400" />
                            )}
                          </div>
                        </th>
                      )}
                      {/* Status */}
                      {visibleColumns.status && (
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <div
                            className="flex items-center gap-2 cursor-pointer hover:text-gray-700"
                            onClick={() => handleSort('status')}
                          >
                            <Activity className="w-4 h-4" />
                            <span>Status</span>
                            {sortBy === 'status' ? (
                              sortOrder === 'asc' ?
                                <ArrowUp className="w-3 h-3 text-blue-600" /> :
                                <ArrowDown className="w-3 h-3 text-blue-600" />
                            ) : (
                              <ArrowUpDown className="w-3 h-3 text-gray-400" />
                            )}
                          </div>
                        </th>
                      )}
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <div className="flex items-center justify-end gap-2">
                          <Settings className="w-4 h-4" />
                          <span>Actions</span>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredManualLeads.map((lead, index) => (
                      <tr
                        key={lead.id}
                        className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors cursor-pointer`}
                        onClick={(e) => handleRowClick(lead, e)}
                      >
                        {/* Company column */}
                        {visibleColumns.company && (
                          <td className="px-4 py-3" style={{ maxWidth: '380px'}}>
                            <div className="flex items-center min-w-0">
                              <div className="min-w-0 flex-1 overflow-hidden">
                                <div className="truncate" title={lead.company}>
                                  <span className="text-gray-900">{lead.company}</span>
                                </div>
                              </div>
                            </div>
                          </td>
                        )}
                        {/* Location column */}
                        {visibleColumns.location && (
                          <td className="px-4 py-3" style={{ maxWidth: '200px'}}>
                            <div className="truncate" title={lead.location}>
                              <span className="text-gray-900">{lead.location || '-'}</span>
                            </div>
                          </td>
                        )}
                        {/* Industry column */}
                        {visibleColumns.industry && (
                          <td className="px-4 py-3" style={{ maxWidth: '150px'}}>
                            <div className="truncate" title={lead.industry}>
                              <span className="text-gray-900">{lead.industry || '-'}</span>
                            </div>
                          </td>
                        )}
                        {/* Email column */}
                        {visibleColumns.email && (
                          <td className="px-4 py-3" style={{ maxWidth: '250px'}}>
                            <div className="truncate" title={lead.email}>
                              <span className="text-gray-900">{lead.email || '-'}</span>
                            </div>
                          </td>
                        )}
                        {/* Phone column */}
                        {visibleColumns.phone && (
                          <td className="px-4 py-3" style={{ maxWidth: '150px'}}>
                            <div className="truncate" title={lead.phone}>
                              <span className="text-gray-900">{lead.phone || '-'}</span>
                            </div>
                          </td>
                        )}
                        {/* Website column */}
                        {visibleColumns.website && (
                          <td className="px-4 py-3" style={{ maxWidth: '200px'}}>
                            <div className="truncate" title={lead.website}>
                              {lead.website ? (
                                <a
                                  href={lead.website}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {lead.website}
                                </a>
                              ) : (
                                <span className="text-gray-900">-</span>
                              )}
                            </div>
                          </td>
                        )}
                        {/* Status column */}
                        {visibleColumns.status && (
                          <td className="px-4 py-3 whitespace-nowrap" style={{ maxWidth: '120px'}}>
                            <div className="relative">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setStatusDropdownOpen(statusDropdownOpen === lead.id ? null : lead.id);
                                }}
                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusOption(lead.status).color} hover:opacity-80 transition-opacity`}
                              >
                                {getStatusOption(lead.status).label}
                                <ChevronDown className="w-3 h-3 ml-1" />
                              </button>
                              {statusDropdownOpen === lead.id && (
                                <div className="absolute top-full left-0 mt-1 w-36 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-48 overflow-y-auto">
                                  {statusOptions.map((option) => (
                                    <button
                                      key={option.value}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleStatusUpdate(lead.id, option.value);
                                      }}
                                      className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 border-b border-gray-100 last:border-b-0 block"
                                    >
                                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${option.color}`}>
                                        {option.label}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        )}
                        {/* Actions column */}
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(lead);
                            }}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition-colors"
                            title={`Delete ${lead.company}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Empty State */}
            {filteredWorkflowLeads.length === 0 && filteredManualLeads.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No leads found</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm || filterStatus !== 'all' || sortBy !== 'company' || sortOrder !== 'asc'
                    ? 'No leads match your current filters and sorting.'
                    : 'No leads available. Use the "Generating New Leads" tab to get started.'
                  }
                </p>
                {(searchTerm || filterStatus !== 'all' || sortBy !== 'company' || sortOrder !== 'asc') && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm('');
                      setFilterStatus('all');
                      setSortBy('company');
                      setSortOrder('asc');
                    }}
                  >
                    Clear Filters & Reset Sorting
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lead Detail Modal */}
      <LeadDetailModal
        isOpen={showLeadModal}
        onClose={() => setShowLeadModal(false)}
        selectedLead={selectedLead}
        modalActiveTab={modalActiveTab}
        setModalActiveTab={setModalActiveTab}
        aiSuggestions={selectedLead ? aiSuggestions[selectedLead.id] : null}
        isLoadingAiSuggestions={isLoadingAiSuggestions}
        aiSuggestionsError={selectedLead ? aiSuggestionsError[selectedLead.id] : null}
        loadCachedAiSuggestions={loadCachedAiSuggestions}
        regenerateAiSuggestions={regenerateAiSuggestions}
        handleAddToCRM={handleAddToCRM}
        handleEmailSent={handleEmailSent}
      />

      {/* Click outside to close dropdown */}
      {statusDropdownOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setStatusDropdownOpen(null)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirmation}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Lead"
        message={`Are you sure you want to delete "${leadToDelete?.company || 'this lead'}"?`}
        details={leadToDelete ? `Location: ${leadToDelete.location || 'Unknown'} | Industry: ${leadToDelete.industry || 'Unknown'}` : ''}
        confirmText="Delete Lead"
        cancelText="Cancel"
        type="danger"
        isLoading={isDeleting}
      />

      {/* Add Lead Modal */}
      <AddLeadModal
        isOpen={showAddLeadModal}
        onClose={() => setShowAddLeadModal(false)}
      />

      {/* CSV Upload Modal */}
      <CSVUploadModal
        isOpen={showCSVUploadModal}
        onClose={() => setShowCSVUploadModal(false)}
      />

    </div>
  );
};

export default LeadManagement;