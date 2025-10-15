import React, { useState, useEffect, Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  Clock,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  X,
  RefreshCw,
  Activity,
  TrendingUp,
  FileText,
  User,
  Edit3,
  Copy,
  Send,
  Plus,
  Sparkles,
  Home,
  Trash2,
  Brain,
  Contact,
  Star,
  Search,
  Filter,
  Eye,
  UserPlus,
  PhoneCall,
  Users,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { useCRM } from '../../contexts/CRMContext';
import CRMMeetingDetailsModal from './CRMMeetingDetailsModal';
import InteractionDetailsModal from './InteractionDetailsModal';
import AddNoteModal from './AddNoteModal';
import ActivityPanel from './ActivityPanel';
import NoteDetailsModal from './NoteDetailsModal';

const CustomerProfileDisplay = ({
  customer,
  isOpen,
  onClose,
  onCustomerDeleted
}) => {
  const { authFetch, deleteCustomer: contextDeleteCustomer, refreshCustomers, updateCustomer, cachedSummaries, refreshCachedSummaries } = useCRM();

  // Modal state
  const [modalActiveTab, setModalActiveTab] = useState("overview");

  // Interaction details modal state
  const [selectedInteraction, setSelectedInteraction] = useState(null);
  const [isInteractionModalOpen, setIsInteractionModalOpen] = useState(false);

  // Activity timeline collapse state
  const [isTimelineExpanded, setIsTimelineExpanded] = useState(false);
  const TIMELINE_COLLAPSED_LIMIT = 3;

  // Panel expansion state - only one can be expanded at a time
  const [expandedPanel, setExpandedPanel] = useState(null); // 'activity' or 'summary' or null

  // Email form state
  const [emailForm, setEmailForm] = useState({
    emailType: 'cold_outreach',
    message: '',
    generatedEmail: null,
    editMode: false,
    editedSubject: '',
    editedBody: ''
  });
  const [isEmailSending, setIsEmailSending] = useState(false);

  // Summary state
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState('');
  const [summaryPeriod, setSummaryPeriod] = useState(30);

  // Interactions state
  const [customerInteractions, setCustomerInteractions] = useState([]);
  const [interactionsCache, setInteractionsCache] = useState({}); // Cache interactions by customer ID
  const [loadingInteractions, setLoadingInteractions] = useState(false);

  // Timeline filtering state
  const [timelineFilter, setTimelineFilter] = useState('all');
  const [timelineSearch, setTimelineSearch] = useState('');

  // Meeting modal state
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [showMeetingModal, setShowMeetingModal] = useState(false);

  // Note modal state
  const [selectedNote, setSelectedNote] = useState(null);
  const [showNoteModal, setShowNoteModal] = useState(false);

  // Notes state
  const [notes, setNotes] = useState([]);
  const [notesCache, setNotesCache] = useState({}); // Cache notes by customer ID
  const [newNote, setNewNote] = useState('');
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteStar, setNewNoteStar] = useState(false);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [isDeletingNote, setIsDeletingNote] = useState(null);
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const [isRefreshingNotes, setIsRefreshingNotes] = useState(false);
  const [noteFilter, setNoteFilter] = useState('all'); // 'all', 'starred', 'email', 'call', 'meeting'
  const [noteError, setNoteError] = useState('');
  const [noteSuccess, setNoteSuccess] = useState('');

  // Add Note Modal state
  const [addNoteModalOpen, setAddNoteModalOpen] = useState(false);
  const [selectedInteractionForNote, setSelectedInteractionForNote] = useState(null);

  // Editable fields state
  const [editingField, setEditingField] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  const [isSavingField, setIsSavingField] = useState(false);

  // Deals state
  const [deals, setDeals] = useState([]);
  const [isLoadingDeals, setIsLoadingDeals] = useState(false);
  const [dealsError, setDealsError] = useState('');

  // API base URL
  const CRM_API_BASE_URL = import.meta.env.VITE_CRM_API_URL || 'http://localhost:8003';

  // Note validation constants
  const MAX_NOTE_LENGTH = 2000;
  const MIN_NOTE_LENGTH = 1;
  const MAX_TITLE_LENGTH = 200;

  // Helper function to check if note is starred
  const isNoteStarred = (star) => {
    return star === 'important' || star === 'urgent' || star === 'starred';
  };

  // Helper function to get star display text
  const getStarDisplayText = (star) => {
    switch(star) {
      case 'important': return 'Important';
      case 'urgent': return 'Urgent';
      case 'starred': return 'Starred';
      default: return '';
    }
  };

  // Helper function to get assigned employee name
  const getAssignedEmployeeName = () => {
    // Use the assigned employee name from the customer object (from employee_client_links table)
    if (customer?.assignedEmployeeName) {
      return customer.assignedEmployeeName;
    }
    return 'Not Assigned';
  };

  // Handle field editing
  const handleFieldClick = (fieldName, currentValue) => {
    console.log(`[Edit] Starting to edit field: ${fieldName}, current value:`, currentValue);
    setEditingField(fieldName);
    setEditingValue(currentValue || '');
  };

  const handleFieldCancel = () => {
    console.log(`[Edit] Cancelled editing field: ${editingField}`);
    setEditingField(null);
    setEditingValue('');
  };

  const handleFieldSave = async (fieldName) => {
    if (!customer?.id) {
      console.error('[Edit] No customer ID found, cannot save');
      return;
    }

    console.log(`[Edit] Saving field: ${fieldName}`);
    console.log(`[Edit] Customer ID: ${customer.id}`);
    console.log(`[Edit] Old value:`, customer[fieldName]);
    console.log(`[Edit] New value:`, editingValue);

    setIsSavingField(true);
    try {
      // Map frontend field names to backend field names
      const fieldMapping = {
        'company': 'company',
        'industry': 'industry',
        'location': 'location',
        'email': 'email',
        'phone': 'phone',
        'primaryContact': 'primaryContact'
      };

      const backendField = fieldMapping[fieldName];
      if (!backendField) {
        console.error('[Edit] Unknown field:', fieldName);
        return;
      }

      console.log(`[Edit] Mapped to backend field: ${backendField}`);

      const payload = {
        [backendField]: editingValue
      };
      console.log('[Edit] Sending payload to API:', payload);

      const response = await authFetch(`${CRM_API_BASE_URL}/api/crm/customers/${customer.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      console.log('[Edit] API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Edit] API error response:', errorText);
        throw new Error('Failed to update customer');
      }

      const updatedCustomer = await response.json();
      console.log('[Edit] Updated customer data received:', updatedCustomer);

      // Update the customer in the context (this updates the global state smoothly)
      updateCustomer(updatedCustomer);
      console.log('[Edit] Customer updated in context');

      // Clear editing state
      setEditingField(null);
      setEditingValue('');
      console.log('[Edit] Editing state cleared');

      // Show success message
      setNoteSuccess('Field updated successfully!');
      setTimeout(() => setNoteSuccess(''), 3000);
      console.log('[Edit] Success notification displayed');
    } catch (error) {
      console.error('[Edit] Error updating field:', error);
      console.error('[Edit] Error stack:', error.stack);
      setNoteError('Failed to update field');
      setTimeout(() => setNoteError(''), 3000);
    } finally {
      setIsSavingField(false);
      console.log('[Edit] Save operation completed');
    }
  };

  // Render editable field
  const renderEditableField = (fieldName, value, placeholder = '') => {
    const isEditing = editingField === fieldName;

    if (isEditing) {
      return (
        <div>
          <div className="relative">
            <input
              type="text"
              value={editingValue}
              onChange={(e) => setEditingValue(e.target.value)}
              onBlur={() => !isSavingField && handleFieldCancel()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleFieldSave(fieldName);
                } else if (e.key === 'Escape') {
                  handleFieldCancel();
                }
              }}
              className="w-full px-2 py-1 pr-8 border border-blue-500 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              autoFocus
              disabled={isSavingField}
            />
            {isSavingField && (
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
              </div>
            )}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Press Enter to save, Esc to cancel
          </div>
        </div>
      );
    }

    return (
      <div
        onClick={() => handleFieldClick(fieldName, value)}
        className="cursor-pointer hover:bg-blue-50 py-1 rounded transition-colors"
        title="Click to edit"
      >
        <p className="text-gray-900">
          <span className={value ? '' : 'text-gray-400 italic'}>{value || placeholder}</span>
        </p>
      </div>
    );
  };

  // Fetch deals for this customer
  const fetchDeals = async () => {
    if (!customer?.id) return;

    setIsLoadingDeals(true);
    setDealsError('');

    try {
      console.log('[Deals] Fetching deals for customer:', customer.id);
      const response = await authFetch(`${CRM_API_BASE_URL}/api/crm/deals`);

      if (!response.ok) {
        throw new Error('Failed to fetch deals');
      }

      const allDeals = await response.json();
      console.log('[Deals] All deals received:', allDeals.length);

      // Filter deals for this customer
      const customerDeals = allDeals.filter(deal => deal.client_id === customer.id);
      console.log('[Deals] Deals for this customer:', customerDeals.length);

      setDeals(customerDeals);
    } catch (error) {
      console.error('[Deals] Error fetching deals:', error);
      setDealsError('Failed to load deals');
    } finally {
      setIsLoadingDeals(false);
    }
  };

  // Fetch deals when modal opens and deals tab is selected
  useEffect(() => {
    if (isOpen && customer && modalActiveTab === 'deals') {
      fetchDeals();
    }
  }, [isOpen, customer, modalActiveTab]);

  // Fetch customer interactions with caching
  const fetchCustomerInteractions = async (forceRefresh = false) => {
    if (!customer?.id) return;

    // Check cache first (unless force refresh is requested)
    if (!forceRefresh && interactionsCache[customer.id]) {
      console.log('Loading interactions from cache for customer', customer.id);
      setCustomerInteractions(interactionsCache[customer.id]);
      return;
    }

    setLoadingInteractions(true);
    try {
      const response = await authFetch(`${CRM_API_BASE_URL}/api/crm/customers/${customer.id}/interactions`);
      if (response.ok) {
        const interactions = await response.json();

        // Update both current interactions and cache
        setCustomerInteractions(interactions);
        setInteractionsCache(prev => ({
          ...prev,
          [customer.id]: interactions
        }));

        console.log('Interactions loaded from API and cached for customer', customer.id);
      }
    } catch (err) {
      console.error('Error fetching interactions:', err);
    } finally {
      setLoadingInteractions(false);
    }
  };



  // Load interactions and notes in parallel when customer changes
  useEffect(() => {
    if (customer?.id && isOpen) {
      setSummaryError('');
      // Load interactions and notes in parallel for faster loading
      Promise.all([
        fetchCustomerInteractions(),
        loadCustomerNotes()
      ]).catch(err => {
        console.error('Error loading customer data:', err);
      });
    }
  }, [customer?.id, isOpen]);

  // Get current cached summary for the customer
  const getCurrentCachedSummary = () => {
    if (!customer?.id) return null;
    return cachedSummaries[customer.id] || null;
  };

  // Load customer notes with caching
  const loadCustomerNotes = async (forceRefresh = false) => {
    if (!customer?.id) return;

    // Check cache first (unless force refresh is requested)
    if (!forceRefresh && notesCache[customer.id]) {
      console.log('Loading notes from cache for customer', customer.id);
      setNotes(notesCache[customer.id]);
      return;
    }

    // Set appropriate loading state
    if (forceRefresh) {
      setIsRefreshingNotes(true);
    } else {
      setIsLoadingNotes(true);
    }

    try {
      const response = await authFetch(`${CRM_API_BASE_URL}/api/crm/customers/${customer.id}/notes`);
      if (response.ok) {
        const notesData = await response.json();

        // Transform API response to match frontend format
        const transformedNotes = notesData.map(note => {
          return {
            id: note.note_id,
            content: note.title ? `${note.title}: ${note.body}` : note.body,
            date: new Date(note.created_at),
            author: 'You', // Simplified from employee ID display
            type: 'user',
            title: note.title,
            body: note.body,
            star: note.star,
            employee_id: note.employee_id,
            updated_at: new Date(note.updated_at),
            isStarred: isNoteStarred(note.star),
            interaction_id: note.interaction_id  // NEW: Include interaction link
          };
        });

        // Update both current notes and cache
        setNotes(transformedNotes);
        setNotesCache(prev => ({
          ...prev,
          [customer.id]: transformedNotes
        }));

        console.log('Notes loaded from API and cached for customer', customer.id);
      } else {
        console.error('Failed to load notes:', response.status);
        setNotes([]);
      }
    } catch (error) {
      console.error('Error loading customer notes:', error);
      setNotes([]);
    } finally {
      setIsLoadingNotes(false);
      setIsRefreshingNotes(false);
    }
  };

  // Invalidate notes cache for current customer
  const invalidateNotesCache = () => {
    if (customer?.id) {
      setNotesCache(prev => {
        const newCache = { ...prev };
        delete newCache[customer.id];
        return newCache;
      });
      console.log('Notes cache invalidated for customer', customer.id);
    }
  };

  // Invalidate interactions cache for current customer
  const invalidateInteractionsCache = () => {
    if (customer?.id) {
      setInteractionsCache(prev => {
        const newCache = { ...prev };
        delete newCache[customer.id];
        return newCache;
      });
      console.log('Interactions cache invalidated for customer', customer.id);
    }
  };

  // Refresh interactions manually
  const refreshInteractions = async () => {
    invalidateInteractionsCache();
    await fetchCustomerInteractions(true);
  };

  // Refresh notes manually
  const refreshNotes = async () => {
    invalidateNotesCache();
    await loadCustomerNotes(true);
  };

  // Refresh all customer data (interactions + notes)
  const refreshAllCustomerData = async () => {
    invalidateInteractionsCache();
    invalidateNotesCache();
    await Promise.all([
      fetchCustomerInteractions(true),
      loadCustomerNotes(true)
    ]);
  };

  // Handle note added - refresh only notes (notes are NOT in interactions table)
  const handleNoteAdded = async () => {
    // Invalidate notes cache to ensure fresh data
    invalidateNotesCache();

    // Reload only notes
    await loadCustomerNotes(true);
  };

  // Handle interaction added (calls, meetings) - refresh only interactions
  const handleInteractionAdded = async () => {
    // Invalidate interactions cache to ensure fresh data
    invalidateInteractionsCache();

    // Reload only interactions
    await fetchCustomerInteractions(true);
  };

  // Validate note input
  const validateNote = (noteText, titleText = '') => {
    const trimmedNote = noteText.trim();
    const trimmedTitle = titleText.trim();

    if (trimmedNote.length < MIN_NOTE_LENGTH) {
      return 'Note cannot be empty';
    }
    if (trimmedNote.length > MAX_NOTE_LENGTH) {
      return `Note cannot exceed ${MAX_NOTE_LENGTH} characters`;
    }
    if (trimmedTitle.length > MAX_TITLE_LENGTH) {
      return `Title cannot exceed ${MAX_TITLE_LENGTH} characters`;
    }
    return null;
  };

  // Clear messages after timeout
  const clearMessages = () => {
    setTimeout(() => {
      setNoteError('');
      setNoteSuccess('');
    }, 3000);
  };

  // Add new note (handles both general notes and interaction-linked notes)
  const handleAddNote = async (noteData = null) => {
    if (!customer?.id) return;

    // Determine if this is from modal (interaction note) or Notes tab (general note)
    const isInteractionNote = noteData && selectedInteractionForNote;

    // Use different form values depending on context
    const noteTitle = isInteractionNote ? noteData.title : newNoteTitle;
    const noteBody = isInteractionNote ? noteData.body : newNote;
    const noteStar = isInteractionNote ? noteData.star : newNoteStar;
    const interactionId = isInteractionNote ? selectedInteractionForNote.id : null;

    // Validate input
    const validationError = validateNote(noteBody, noteTitle);
    if (validationError) {
      setNoteError(validationError);
      clearMessages();
      return;
    }

    // Clear any previous messages
    setNoteError('');
    setNoteSuccess('');

    const payload = {
      title: noteTitle.trim() || '',
      body: noteBody.trim(),
      star: noteStar ? 'important' : null,
      interaction_id: interactionId
    };

    setIsAddingNote(true);
    try {
      const response = await authFetch(`${CRM_API_BASE_URL}/api/crm/customers/${customer.id}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        // Invalidate cache and reload ALL notes
        invalidateNotesCache();
        await loadCustomerNotes(true);

        // Reset appropriate form and close modal if needed
        if (isInteractionNote) {
          setAddNoteModalOpen(false);
          setSelectedInteractionForNote(null);
        } else {
          setNewNote('');
          setNewNoteTitle('');
          setNewNoteStar(false);
        }

        setNoteSuccess('Note added successfully!');
        clearMessages();
      } else {
        const errorData = await response.json();
        console.error('Failed to add note:', errorData);
        setNoteError('Failed to add note: ' + (errorData.detail || 'Unknown error'));
        clearMessages();
      }
    } catch (error) {
      console.error('Error adding note:', error);
      setNoteError('Error adding note: ' + error.message);
      clearMessages();
    } finally {
      setIsAddingNote(false);
    }
  };

  // Event click handlers
  const handleEventClick = (event) => {
    console.log('Timeline event clicked:', event);

    if (event.originalType === 'note') {
      // Handle note click - open NoteDetailsModal
      const noteData = notes.find(n => n.id === event.metadata?.noteId);
      if (noteData) {
        setSelectedNote(noteData);
        setShowNoteModal(true);
      } else {
        console.error('Note not found:', event.metadata?.noteId);
      }
    } else if (event.originalType === 'meeting') {
      // Get the interaction ID for CRM meeting
      const interactionId = event.metadata?.interactionId;

      if (!interactionId) {
        console.error('No interaction ID found for meeting event:', event);
        return;
      }

      // Prepare meeting data from parsed content if available
      const parsedData = event.metadata?.parsedMeetingData;
      let meetingData = null;

      if (parsedData) {
        // Use pre-loaded data for immediate display
        meetingData = {
          interaction_id: interactionId,
          customer_id: customer?.id,
          title: parsedData.title || event.metadata?.theme || event.title,
          description: parsedData.description,
          start_time: parsedData.start_time,
          end_time: parsedData.end_time,
          attendees: parsedData.attendees || [],
          location: parsedData.location,
          meeting_link: parsedData.meeting_link,
          timezone: parsedData.timezone || 'UTC',
          created_at: event.date,
          updated_at: event.metadata?.updatedAt
        };
      }

      console.log('Opening CRM meeting modal with data:', meetingData);
      setSelectedMeeting({
        id: interactionId,
        data: meetingData
      });
      setShowMeetingModal(true);
    } else {
      // For all other events (email, call, etc.), use the interaction details modal
      handleInteractionClick(event);
    }
  };

  const handleMeetingModalClose = () => {
    setShowMeetingModal(false);
    setSelectedMeeting(null);
  };

  // Note modal handlers
  const handleNoteModalClose = () => {
    setShowNoteModal(false);
    setSelectedNote(null);
  };

  const handleNoteUpdate = async (updatedNote) => {
    // Refresh notes after update
    await loadCustomerNotes(true);
  };

  // Call event handlers
  const handleCallEventDelete = async (interactionId) => {
    // Refresh interactions after delete
    await fetchCustomerInteractions(true);
  };

  const handleCallEventUpdate = async (updatedCallSummary) => {
    // Refresh interactions after update
    await fetchCustomerInteractions(true);
  };

  // Interaction modal handlers
  const handleInteractionClick = (event) => {
    setSelectedInteraction(event);
    setIsInteractionModalOpen(true);
  };

  const handleInteractionModalClose = () => {
    setIsInteractionModalOpen(false);
    setSelectedInteraction(null);
  };

  // Timeline collapse/expand handler
  const handleTimelineToggle = () => {
    setIsTimelineExpanded(!isTimelineExpanded);
  };

  // Delete note
  const handleDeleteNote = async (noteId) => {
    if (!noteId) return;

    setIsDeletingNote(noteId);
    try {
      const response = await authFetch(`${CRM_API_BASE_URL}/api/crm/notes/${noteId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Optimistically remove the note from the UI
        setNotes(prevNotes => prevNotes.filter(note => note.id !== noteId));

        // Also update cache
        if (customer?.id && notesCache[customer.id]) {
          setNotesCache(prev => ({
            ...prev,
            [customer.id]: prev[customer.id].filter(note => note.id !== noteId)
          }));
        }

        setNoteSuccess('Note deleted successfully!');
        clearMessages();
      } else {
        const errorData = await response.json();
        console.error('Failed to delete note:', errorData);
        setNoteError('Failed to delete note: ' + (errorData.detail || 'Unknown error'));
        clearMessages();
      }
    } catch (error) {
      console.error('Error deleting note:', error);
      setNoteError('Error deleting note: ' + error.message);
      clearMessages();
    } finally {
      setIsDeletingNote(null);
    }
  };

  // Toggle note star/importance status with optimistic updates
  const handleToggleNoteStar = async (noteId, currentStarStatus) => {
    if (!noteId) return;

    // Determine new star status (toggle between important and null)
    const newStarStatus = isNoteStarred(currentStarStatus) ? null : 'important';
    const newIsStarred = isNoteStarred(newStarStatus);

    // Store original state for potential rollback
    const originalNotes = [...notes];

    // OPTIMISTIC UPDATE: Immediately update the UI
    setNotes(prevNotes =>
      prevNotes.map(note =>
        note.id === noteId
          ? {
              ...note,
              star: newStarStatus,
              isStarred: newIsStarred
            }
          : note
      )
    );

    // Also update the cache optimistically
    if (customer?.id && notesCache[customer.id]) {
      setNotesCache(prev => ({
        ...prev,
        [customer.id]: prev[customer.id].map(note =>
          note.id === noteId
            ? {
                ...note,
                star: newStarStatus,
                isStarred: newIsStarred
              }
            : note
        )
      }));
    }

    // Background API call (no loading indicators)
    try {
      const response = await authFetch(`${CRM_API_BASE_URL}/api/crm/notes/${noteId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          star: newStarStatus
        }),
      });

      if (response.ok) {
        // Success - the optimistic update was correct
        const action = newStarStatus ? 'marked as important' : 'unmarked as important';
        setNoteSuccess(`Note ${action} successfully!`);
        clearMessages();

        // Optional: Refresh from backend to ensure absolute consistency
        // This happens silently in the background
        setTimeout(() => {
          invalidateNotesCache();
          loadCustomerNotes(true);
        }, 1000);
      } else {
        // API call failed - revert the optimistic update
        console.error('Failed to toggle note star - reverting optimistic update');
        setNotes(originalNotes);

        // Also revert the cache
        if (customer?.id) {
          setNotesCache(prev => ({
            ...prev,
            [customer.id]: originalNotes
          }));
        }

        const errorData = await response.json();
        setNoteError('Failed to update note importance: ' + (errorData.detail || 'Unknown error'));
        clearMessages();
      }
    } catch (error) {
      // Network/other error - revert the optimistic update
      console.error('Error toggling note star - reverting optimistic update:', error);
      setNotes(originalNotes);

      // Also revert the cache
      if (customer?.id) {
        setNotesCache(prev => ({
          ...prev,
          [customer.id]: originalNotes
        }));
      }

      setNoteError('Error updating note importance: ' + error.message);
      clearMessages();
    }
  };

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setModalActiveTab("overview");
      setEmailForm({
        emailType: 'cold_outreach',
        message: '',
        generatedEmail: null,
        editMode: false,
        editedSubject: '',
        editedBody: ''
      });
      setSummaryError('');
      setCustomerInteractions([]);
      setTimelineFilter('all'); // Always reset to 'all' filter
      setTimelineSearch('');
      setIsTimelineExpanded(false);
      setSelectedMeeting(null);
      setShowMeetingModal(false);
      setNotes([]);
      setNotesCache({}); // Clear entire cache when modal closes
      setInteractionsCache({}); // Clear interactions cache when modal closes
      setNewNote('');
      setNewNoteTitle('');
      setNewNoteStar(false);
      setIsDeletingNote(null);
      setIsLoadingNotes(false);
      setIsRefreshingNotes(false);
      setNoteFilter('all');
      setNoteError('');
      setNoteSuccess('');
      // Reset modal states
      setAddNoteModalOpen(false);
      setSelectedInteractionForNote(null);
    }
  }, [isOpen]);

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

  const formatNoteDate = (date) => {
    if (!date) return 'N/A';
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return 'Invalid Date';
    }
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }).format(parsedDate);
  };

  // Map customer status to sales funnel stages
  const getSalesFunnelStage = (customerStatus) => {
    const statusMap = {
      'lead': 1,
      'prospect': 1,
      'qualified': 2,
      'active': 2,        // Active customer status maps to qualified
      'inactive': 1,      // Inactive maps to lead/prospect
      'completed': 5,     // Completed engagement cycle - successful closure
      'lost': 0,          // Lost customer - no funnel stage
      'proposal': 3,
      'negotiation': 4,
      'customer': 5,
      'closed': 5,
      'at-risk': 2, // Treat at-risk as qualified but need attention
      'expansion-opportunity': 5 // Existing customer with expansion potential
    };
    return statusMap[customerStatus?.toLowerCase()] || 1;
  };

  const getSalesStages = () => [
    { id: 1, name: 'Lead', key: 'lead' },
    { id: 2, name: 'Qualified', key: 'qualified' },
    { id: 3, name: 'Proposal', key: 'proposal' },
    { id: 4, name: 'Negotiation', key: 'negotiation' },
    { id: 5, name: 'Closed', key: 'closed' }
  ];

  const handleGenerateSummary = async () => {
    if (!customer?.id) return;

    setIsGeneratingSummary(true);
    setSummaryError('');

    try {
      // Use GET endpoint with force_refresh=true to generate fresh summary and replace existing one
      const response = await authFetch(`${CRM_API_BASE_URL}/api/crm/interaction-summary/${customer.id}?days_back=${summaryPeriod}&force_refresh=true`);

      const data = await response.json();
      if (response.ok) {
        console.log('Summary generated successfully:', data);
        // Refresh cached summaries to get the newly generated summary
        await refreshCachedSummaries();
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

  // Helper function to get status pill for timeline events
  const getEventStatus = (event, eventDate) => {
    // Don't show status for meeting events
    if (event.originalType === 'meeting') {
      return null;
    }

    const now = new Date();
    const daysDiff = Math.floor((now - eventDate) / (1000 * 60 * 60 * 24));

    if (event.originalType === 'email' && daysDiff > 2) {
      return { text: 'Awaiting Reply', color: 'bg-yellow-100 text-yellow-800' };
    }
    if (event.originalType === 'call' && daysDiff > 7) {
      return { text: 'Follow-Up Needed', color: 'bg-orange-100 text-orange-800' };
    }
    if (eventDate > now) {
      return { text: 'Scheduled', color: 'bg-blue-100 text-blue-800' };
    }
    if (daysDiff <= 1) {
      return { text: 'Recent', color: 'bg-green-100 text-green-800' };
    }
    return null;
  };

  const getTimelineEvents = () => {
    const events = [];

    // Add customer timeline events if available
    if (customer.timeline && Array.isArray(customer.timeline)) {
      customer.timeline.forEach((event, index) => {
        if (event.date && !isNaN(new Date(event.date).getTime())) {
          let normalizedType = event.type ? event.type.toLowerCase().trim() : 'activity';

          // Map database types to filter types for consistency
          const typeMapping = {
            'meet': 'meeting',  // Database uses 'meet', UI filter uses 'meeting'
            'call': 'call',
            'email': 'email'
          };

          const mappedType = typeMapping[normalizedType] || normalizedType;

          events.push({
            type: mappedType,
            originalType: mappedType,
            title: event.title || event.type || 'Customer Activity',
            description: event.description || event.content || '',
            date: event.date,
            employeeName: event.employeeName || 'System',
            metadata: event.metadata || {}
          });
        }
      });
    }

    // Add recent activities if available
    if (customer.recentActivities && Array.isArray(customer.recentActivities)) {
      customer.recentActivities.forEach((activity, index) => {
        const date = activity.date || activity.createdAt || new Date().toISOString();
        if (!isNaN(new Date(date).getTime())) {
          events.push({
            type: 'activity',
            originalType: 'activity',
            title: activity.title || activity.type || 'Customer Activity',
            description: activity.description || activity.content || '',
            date: date,
            employeeName: activity.employeeName || 'System',
            metadata: activity.metadata || {}
          });
        }
      });
    }

    // Add interactions from API with enhanced data
    customerInteractions.forEach(interaction => {
      if (interaction.createdAt && !isNaN(new Date(interaction.createdAt).getTime())) {
        // Normalize the interaction type to ensure consistent filtering
        let normalizedType = interaction.type ? interaction.type.toLowerCase().trim() : 'activity';

        // Map database types to filter types for consistency
        const typeMapping = {
          'meet': 'meeting',  // Database uses 'meet', UI filter uses 'meeting'
          'call': 'call',
          'email': 'email'
        };

        const mappedType = typeMapping[normalizedType] || normalizedType;

        // Parse meeting content if it's a meeting type
        let description = interaction.content;
        let title = interaction.theme || `${mappedType.toUpperCase()}: ${interaction.employeeName}`;
        let parsedMeetingData = null;

        if (mappedType === 'meeting' && interaction.content) {
          try {
            parsedMeetingData = JSON.parse(interaction.content);

            // Add "MEETING:" prefix to theme field
            const meetingTheme = interaction.theme || parsedMeetingData.title || 'Meeting';
            title = `MEETING: ${meetingTheme}`;

            // Format meeting description with start time and attendees
            const startTime = parsedMeetingData.start_time
              ? new Date(parsedMeetingData.start_time).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })
              : 'Time not specified';

            const meetingDescription = parsedMeetingData.description;
            const attendees = parsedMeetingData.attendees;

            // Build formatted description with start time, description, and attendees
            let descriptionParts = [startTime];
            if (meetingDescription) {
              descriptionParts.push(meetingDescription);
            }
            if (attendees && Array.isArray(attendees) && attendees.length > 0) {
              const attendeesList = attendees.join(', ');
              descriptionParts.push(`Attendees: ${attendeesList}`);
            }

            description = descriptionParts.join(' • ');
          } catch (e) {
            console.warn('Failed to parse meeting content JSON:', e);
            // Keep original content if parsing fails
          }
        }

        const eventData = {
          type: mappedType,
          originalType: mappedType,
          title: title,
          description: description,
          date: interaction.createdAt,
          employeeName: interaction.employeeName,
          metadata: {
            interactionId: interaction.id,
            employeeRole: interaction.employeeRole,
            employeeDepartment: interaction.employeeDepartment,
            duration: interaction.duration,
            outcome: interaction.outcome,
            subject: interaction.subject,
            gmailMessageId: interaction.gmailMessageId,
            updatedAt: interaction.updatedAt,
            theme: interaction.theme,
            source: interaction.source,
            sourceName: interaction.sourceName,
            sourceType: interaction.sourceType,
            // Add parsed meeting data to metadata for modal use
            parsedMeetingData: parsedMeetingData
          }
        };
        events.push(eventData);
      }
    });

    // Filter events based on search and filter criteria
    let filteredEvents = events.filter(event => event.date && !isNaN(new Date(event.date).getTime()));

    // Apply type filter
    if (timelineFilter !== 'all') {
      filteredEvents = filteredEvents.filter(event => {
        // Normalize both the event type and filter for comparison
        const eventType = event.originalType ? event.originalType.toLowerCase().trim() : '';
        const filterType = timelineFilter.toLowerCase().trim();
        return eventType === filterType;
      });
    }

    // Apply search filter
    if (timelineSearch.trim()) {
      const searchLower = timelineSearch.toLowerCase();
      filteredEvents = filteredEvents.filter(event =>
        event.title.toLowerCase().includes(searchLower) ||
        event.description.toLowerCase().includes(searchLower) ||
        event.employeeName.toLowerCase().includes(searchLower)
      );
    }

    const finalEvents = filteredEvents.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Debug summary
    const eventTypeCounts = finalEvents.reduce((acc, event) => {
      acc[event.originalType] = (acc[event.originalType] || 0) + 1;
      return acc;
    }, {});

    console.log('🔍 DEBUG: Final filtered events:', finalEvents.map(e => ({ type: e.type, originalType: e.originalType, title: e.title })));
    console.log('🔍 DEBUG: Event type distribution:', eventTypeCounts);
    console.log('🔍 DEBUG: Total events returned:', finalEvents.length);

    return finalEvents;
  };

  // Generate a stable key for the modal
  const customerId = customer?.id || customer?.client_id || customer?.name || 'unknown';
  const modalKey = `customer-profile-${customerId}-${isOpen ? 'open' : 'closed'}`;

  return (
    <Fragment>
    <AnimatePresence>
      {isOpen && customer ? (
        <motion.div
          key={modalKey}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-50 flex justify-center pt-8 px-8"
          onClick={onClose}
        >
          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            className="w-full bg-white rounded-lg shadow-2xl relative h-full flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
        {/* Header - Fixed */}
        <div className="flex items-center justify-between pt-5 pb-3 px-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-pink-600 rounded-lg flex items-center justify-center">
              <Building className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 leading-none self-center -mb-1">{customer.company}</h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
          >
            <X className="w-5 h-5 text-gray-500" />
          </Button>
        </div>

        {/* Navigation Tabs - Fixed */}
        <div className="border-b border-gray-200 flex-shrink-0 px-6">
          <div className="flex">
            <Button
              variant="ghost"
              onClick={() => setModalActiveTab("overview")}
              className={`flex items-center gap-2 p-4 text-sm font-medium border-b-2 rounded-none ${
                modalActiveTab === "overview"
                  ? "border-pink-600 text-pink-600 hover:text-pink-700"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <Home className="w-4 h-4" />
              Overview
            </Button>
            <Button
              variant="ghost"
              onClick={() => setModalActiveTab("email")}
              className={`flex items-center gap-2 p-4 text-sm font-medium border-b-2 rounded-none ${
                modalActiveTab === "email"
                  ? "border-pink-600 text-pink-600 hover:text-pink-700"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <Mail className="w-4 h-4" />
              Send Email
            </Button>
            <Button
              variant="ghost"
              onClick={() => setModalActiveTab("deals")}
              className={`flex items-center gap-2 p-4 text-sm font-medium border-b-2 rounded-none ${
                modalActiveTab === "deals"
                  ? "border-pink-600 text-pink-600 hover:text-pink-700"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <DollarSign className="w-4 h-4" />
              Deals
            </Button>
          </div>
        </div>

        {/* Content Area - Scrollable */}
        <div className="flex-1 overflow-y-auto py-4 px-5 bg-gray-50">
          {modalActiveTab === "overview" && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-10 gap-4">
                {/* Left Column - Customer Information */}
                <div className="lg:col-span-3 lg:order-2 space-y-4">
                  {/* Basic & Contact Information */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6 flex flex-col" style={{ height: 'calc(1000px + 1rem)' }}>
                    <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2 flex-shrink-0">
                      <Building className="w-4 h-4 text-pink-600" />
                      Customer Information
                    </h3>
                    <div className="space-y-4 flex-1 overflow-y-auto">
                      <div>
                        <label className="text-sm font-medium text-gray-600 block mb-1">Company</label>
                        {renderEditableField('company', customer.company, 'Company name')}
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600 block mb-1">Industry</label>
                        {renderEditableField('industry', customer.industry, 'Industry')}
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600 block mb-1">Location</label>
                        {renderEditableField('location', customer.location, 'Location')}
                      </div>

                      {/* Contact Information */}
                      <div>
                        <label className="text-sm font-medium text-gray-600 block mb-1">Primary Contact</label>
                        {renderEditableField('primaryContact', customer.primaryContact, 'Contact name')}
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600 block mb-1">Email</label>
                        {renderEditableField('email', customer.email, 'Email address')}
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600 block mb-1">Phone</label>
                        {renderEditableField('phone', customer.phone, 'Phone number')}
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600 block mb-1">Website</label>
                        <p className="text-gray-900">
                          {customer.website ? (
                            <a
                              href={customer.website.startsWith('http') ? customer.website : `https://${customer.website}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                            >
                              {customer.website}
                            </a>
                          ) : (
                            <span className="text-gray-400 italic">No website</span>
                          )}
                        </p>
                      </div>

                      {/* Assigned Employee - Read Only */}
                      <div>
                        <label className="text-sm font-medium text-gray-600 block mb-1">Assigned Employee</label>
                        <p className="text-gray-900">{getAssignedEmployeeName()}</p>
                      </div>

                      {/* Stats Information */}
                      <div className="pt-4 border-t border-gray-200">
                        <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <Activity className="w-4 h-4 text-pink-600" />
                          Quick Stats
                        </h4>
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium text-gray-600 block mb-1">Current Status</label>
                            <p className="text-gray-900 font-medium capitalize">{customer.status || 'Unknown'}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-600 block mb-1">Annual Recurring Revenue</label>
                            <p className="text-gray-900 font-medium">${customer.revenue || customer.contractValue || '0'}</p>
                          </div>

                          {/* Interaction Count and Engagement Level */}
                          <div>
                            <label className="text-sm font-medium text-gray-600 block mb-1">Interactions (Last 2 weeks)</label>
                            <div className="text-gray-900 font-medium">
                              {getCurrentCachedSummary()?.summary_data?.interaction_count || 0}
                            </div>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-600 block mb-1">Churn Risk</label>
                            <div className="text-gray-900 font-medium">
                              {(() => {
                                const churnRisk = getCurrentCachedSummary()?.churn_risk || getCurrentCachedSummary()?.summary_data?.churn_risk;
                                if (!churnRisk) return 'Unknown';

                                // Color coding for churn risk
                                const riskColors = {
                                  'low': 'text-green-600',
                                  'medium': 'text-yellow-600',
                                  'high': 'text-red-600'
                                };

                                const colorClass = riskColors[churnRisk.toLowerCase()] || 'text-gray-600';

                                return (
                                  <span className={`font-semibold ${colorClass}`}>
                                    {churnRisk.charAt(0).toUpperCase() + churnRisk.slice(1)}
                                  </span>
                                );
                              })()}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column - Activity & Summary */}
                <div className="lg:col-span-7 lg:order-1 space-y-4">

                  {/* Activity Panel */}
                  <ActivityPanel
                    customer={customer}
                    customerInteractions={customerInteractions}
                    loadingInteractions={loadingInteractions}
                    timelineFilter={timelineFilter}
                    setTimelineFilter={setTimelineFilter}
                    timelineSearch={timelineSearch}
                    setTimelineSearch={setTimelineSearch}
                    isTimelineExpanded={isTimelineExpanded}
                    handleTimelineToggle={handleTimelineToggle}
                    expandedPanel={expandedPanel}
                    setExpandedPanel={setExpandedPanel}
                    handleEventClick={handleEventClick}
                    getTimelineEvents={getTimelineEvents}
                    authFetch={authFetch}
                    onNoteAdded={handleNoteAdded}
                    onInteractionAdded={handleInteractionAdded}
                    notes={notes}
                    isLoadingNotes={isLoadingNotes}
                    isRefreshingNotes={isRefreshingNotes}
                    handleDeleteNote={handleDeleteNote}
                    handleToggleNoteStar={handleToggleNoteStar}
                    isDeletingNote={isDeletingNote}
                    onCallDeleted={handleCallEventDelete}
                  />

                  {/* Interaction Summary */}
                  <div className={`bg-white rounded-lg border border-gray-200 flex flex-col transition-all duration-300 ${
                    expandedPanel === 'summary' ? 'h-[calc(1000px+1rem-60px-1rem)] p-6' : expandedPanel === 'activity' ? 'h-[60px] overflow-visible px-6 py-3' : 'h-[500px] p-6'
                  }`}>
                    <div className={`flex items-center justify-between flex-shrink-0 ${expandedPanel === 'activity' ? 'mb-0' : 'mb-6'}`}>
                      <h3 className="text-lg font-bold text-black font-[Inter] flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-pink-600" />
                        Interaction Summary
                      </h3>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Hidden button - accessible via browser console for testing */}
                        <Button
                          id="refresh-summary-button"
                          variant="outline"
                          className="border-gray-300 text-gray-600 hover:bg-gray-50 gap-x-2 whitespace-nowrap hidden"
                          onClick={handleGenerateSummary}
                          disabled={isGeneratingSummary || !customer?.id}
                        >
                          <Brain className="w-4 h-4 flex-shrink-0" />
                          {isGeneratingSummary
                            ? 'Analyzing...'
                            : getCurrentCachedSummary()
                              ? 'Refresh Summary'
                              : 'Generate Summary'
                          }
                        </Button>
                        <button
                          onClick={() => setExpandedPanel(expandedPanel === 'summary' ? null : 'summary')}
                          className="text-gray-500 hover:text-gray-700 transition-colors p-1 hover:bg-gray-100 rounded flex-shrink-0"
                          title={expandedPanel === 'summary' ? 'Collapse' : 'Expand'}
                        >
                          {expandedPanel === 'summary' ? (
                            <ChevronDown className="w-5 h-5" />
                          ) : (
                            <ChevronUp className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>
                    {expandedPanel !== 'activity' && (
                    <div className="flex-1 overflow-y-auto">
                      {isGeneratingSummary ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center">
                            <RefreshCw className="w-8 h-8 text-purple-600 mx-auto mb-3 animate-spin" />
                            <p className="text-gray-600">Analyzing customer interactions...</p>
                          </div>
                        </div>
                      ) : getCurrentCachedSummary() ? (
                        <div className="space-y-4">
                          {/* AI Insights */}
                          {getCurrentCachedSummary()?.summary_data?.recent_activities && getCurrentCachedSummary().summary_data.recent_activities.length > 0 && (
                            <div className="bg-white rounded-lg border border-gray-200 p-5">
                              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
                                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                                  <Sparkles className="w-4 h-4 text-blue-600" />
                                </div>
                                <h4 className="text-base font-semibold text-gray-900">AI Insights</h4>
                              </div>
                              <div className="space-y-4">
                                {getCurrentCachedSummary().summary_data.recent_activities.map((activity, index) => (
                                  <div key={index} className="flex gap-3">
                                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-semibold mt-0.5">
                                      {index + 1}
                                    </div>
                                    <p className="text-sm text-gray-700 leading-relaxed flex-1">{activity}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Next Steps */}
                          {getCurrentCachedSummary()?.summary_data?.next_steps && getCurrentCachedSummary().summary_data.next_steps.length > 0 && (
                            <div className="bg-white rounded-lg border border-gray-200 p-5">
                              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
                                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                                  <CheckCircle className="w-4 h-4 text-blue-600" />
                                </div>
                                <h4 className="text-base font-semibold text-gray-900">Next Steps</h4>
                              </div>
                              <div className="space-y-4">
                                {getCurrentCachedSummary().summary_data.next_steps.map((step, index) => (
                                  <div key={index} className="flex gap-3">
                                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-semibold mt-0.5">
                                      {index + 1}
                                    </div>
                                    <p className="text-sm text-gray-700 leading-relaxed flex-1">{step}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : summaryError ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center text-red-600">
                            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                            <p className="text-sm">Error generating summary</p>
                            <p className="text-xs text-gray-500 mt-1">{summaryError}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center">
                            <Brain className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                            <p className="text-gray-500 text-sm">No interaction summary available</p>
                            <p className="text-gray-400 text-xs mt-1">Click "Generate Summary" to create AI-powered insights</p>
                          </div>
                        </div>
                      )}
                    </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {modalActiveTab === "email" && (
            <div className="h-full flex flex-col">
              <div className="flex flex-col lg:flex-row flex-1 h-full">
                {/* Left Panel - Email Composer */}
                <div className="lg:w-1/3 p-6 border-r border-gray-200 overflow-y-auto bg-gray-50">
                  <div className="space-y-6">
                    {/* Header */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Compose Email</h3>
                      <p className="text-sm text-gray-600">Send a personalized email to {customer.company}</p>
                    </div>

                    {/* Email Type Selection - Only Follow Up and Meeting Request */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Email Purpose
                      </label>
                      <div className="space-y-3">
                        {[
                          { id: 'follow_up', name: 'Follow Up', description: 'Follow up on previous contact or conversation', icon: MessageSquare },
                          { id: 'meeting_request', name: 'Meeting Request', description: 'Request a meeting or schedule a demo', icon: Calendar }
                        ].map((template) => {
                          const Icon = template.icon;
                          return (
                            <button
                              key={template.id}
                              onClick={() => setEmailForm({...emailForm, emailType: template.id})}
                              className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                                emailForm.emailType === template.id
                                  ? 'border-pink-600 bg-pink-50 shadow-sm'
                                  : 'border-gray-200 hover:border-gray-300 bg-white'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`p-2 rounded-lg ${
                                  emailForm.emailType === template.id
                                    ? 'bg-pink-100'
                                    : 'bg-gray-100'
                                }`}>
                                  <Icon className={`w-5 h-5 ${
                                    emailForm.emailType === template.id
                                      ? 'text-pink-600'
                                      : 'text-gray-600'
                                  }`} />
                                </div>
                                <div className="flex-1">
                                  <div className={`font-medium mb-1 ${
                                    emailForm.emailType === template.id
                                      ? 'text-pink-700'
                                      : 'text-gray-900'
                                  }`}>
                                    {template.name}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {template.description}
                                  </div>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Custom Message */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Additional Context
                      </label>
                      <textarea
                        value={emailForm.message}
                        onChange={(e) => setEmailForm({...emailForm, message: e.target.value})}
                        placeholder="Add specific details, topics to discuss, or any context for the AI to include..."
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none bg-white"
                        rows={5}
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        This context will help generate a more personalized email
                      </p>
                    </div>

                    {/* Generate Button */}
                    <button
                      onClick={async () => {
                        setIsEmailSending(true);
                        try {
                          const response = await authFetch(`${CRM_API_BASE_URL}/api/crm/generate-email/${customer.id}`, {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                              email_type: emailForm.emailType,
                              custom_message: emailForm.message,
                              recipient_email: customer.email,
                              recipient_name: customer.primaryContact || customer.company
                            })
                          });

                          if (response.ok) {
                            const data = await response.json();
                            setEmailForm({
                              ...emailForm,
                              generatedEmail: {
                                subject: data.email_data?.subject || `Follow up regarding ${customer.company}`,
                                body: data.email_data?.body || `Hi ${customer.primaryContact || 'there'},\n\nI hope this email finds you well.\n\nBest regards,\n[Your Name]`,
                                to: customer.email
                              }
                            });
                          } else {
                            const errorData = await response.json();
                            throw new Error(errorData.detail || 'Failed to generate email');
                          }
                        } catch (error) {
                          console.error('Email generation error:', error);
                          alert('Failed to generate email: ' + error.message);
                        } finally {
                          setIsEmailSending(false);
                        }
                      }}
                      disabled={isEmailSending || !customer.email && !customer.primaryContact}
                      className="w-full bg-gradient-to-r from-pink-600 to-pink-700 hover:from-pink-700 hover:to-pink-800 disabled:from-gray-400 disabled:to-gray-500 text-white py-3 rounded-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 font-medium"
                    >
                      {isEmailSending ? (
                        <>
                          <RefreshCw className="w-5 h-5 animate-spin" />
                          Generating Email...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5" />
                          Generate with AI
                        </>
                      )}
                    </button>

                    {!customer.email && !customer.primaryContact && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-sm text-red-700 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" />
                          No email address found for this customer
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Panel - Email Preview */}
                <div className="lg:w-2/3 flex flex-col flex-1">
                  <div className="p-6 flex-1 overflow-y-auto h-full">
                    {emailForm.generatedEmail ? (
                      <div className="space-y-4">
                        {/* Email Actions */}
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold text-gray-900">Email Preview</h3>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setEmailForm({...emailForm, editMode: !emailForm.editMode})}
                              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors flex items-center gap-1"
                            >
                              <Edit3 className="w-4 h-4" />
                              {emailForm.editMode ? 'View' : 'Edit'}
                            </button>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(emailForm.editMode ? emailForm.editedBody : emailForm.generatedEmail.body);
                                alert('Copied to clipboard!');
                              }}
                              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors flex items-center gap-1"
                            >
                              <Copy className="w-4 h-4" />
                              Copy
                            </button>
                          </div>
                        </div>

                        {/* Email Content */}
                        <div className="bg-white border border-gray-200 rounded-lg">
                          <div className="p-4 border-b border-gray-200">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <User className="w-4 h-4" />
                                <span>To: {emailForm.generatedEmail.to}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <MessageSquare className="w-4 h-4" />
                                <span>Type: {emailForm.emailType ? emailForm.emailType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Cold Outreach'}</span>
                              </div>
                            </div>
                          </div>
                          <div className="p-4">
                            {emailForm.editMode ? (
                              <div className="space-y-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Subject
                                  </label>
                                  <input
                                    type="text"
                                    value={emailForm.editedSubject || emailForm.generatedEmail.subject}
                                    onChange={(e) => setEmailForm({...emailForm, editedSubject: e.target.value})}
                                    className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-pink-600"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Body
                                  </label>
                                  <textarea
                                    value={emailForm.editedBody || emailForm.generatedEmail.body}
                                    onChange={(e) => setEmailForm({...emailForm, editedBody: e.target.value})}
                                    className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-pink-600 resize-none"
                                    rows={12}
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-4">
                                <div>
                                  <div className="text-sm font-medium text-gray-700 mb-1">Subject:</div>
                                  <div className="font-semibold">{emailForm.generatedEmail.subject}</div>
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-gray-700 mb-2">Message:</div>
                                  <div className="bg-gray-50 p-4 rounded-lg">
                                    <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
                                      {emailForm.generatedEmail.body}
                                    </pre>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Mail className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          Generate Your Email
                        </h3>
                        <p className="text-gray-600">
                          Select an email type and click "Generate Email" to create a personalized message.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Footer Actions */}
                  {emailForm.generatedEmail && (customer.email || customer.primaryContact) && (
                    <div className="p-6 border-t bg-gray-50 flex-shrink-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => {
                              const subject = emailForm.editMode ? emailForm.editedSubject : emailForm.generatedEmail.subject;
                              const body = emailForm.editMode ? emailForm.editedBody : emailForm.generatedEmail.body;
                              const to = emailForm.generatedEmail.to;
                              const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                              window.open(gmailUrl, '_blank');
                            }}
                            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                          >
                            <Mail className="w-4 h-4" />
                            Open in Gmail
                          </button>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setModalActiveTab("overview")}
                            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            Back
                          </button>
                          <button
                            onClick={async () => {
                              if (!emailForm.generatedEmail) {
                                alert('Please generate an email first');
                                return;
                              }

                              setIsEmailSending(true);
                              try {
                                console.log('Sending email from CustomerProfileDisplay...');

                                const authProvider = localStorage.getItem('auth_provider');
                                const accessToken = authProvider === 'google' ? localStorage.getItem('google_access_token') : null;

                                const subject = emailForm.editMode ? emailForm.editedSubject : emailForm.generatedEmail.subject;
                                const body = emailForm.editMode ? emailForm.editedBody : emailForm.generatedEmail.body;

                                const emailData = {
                                  to_email: emailForm.generatedEmail.to,
                                  subject: subject,
                                  body: body,
                                  customer_id: customer.id,
                                  provider: authProvider === 'google' ? 'gmail' : null,
                                  access_token: accessToken
                                };

                                console.log('Sending email with data:', emailData);

                                const response = await authFetch(`${CRM_API_BASE_URL}/api/crm/send-email`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify(emailData)
                                });

                                const data = await response.json();
                                console.log('Send email response:', data);

                                if (response.ok) {
                                  alert(`Email sent successfully to ${data.sent_to}`);
                                  setModalActiveTab("overview");
                                } else {
                                  alert(`Failed to send email: ${data.detail || 'Unknown error'}`);
                                }
                              } catch (error) {
                                console.error('Error sending email:', error);
                                alert(`Failed to send email: ${error.message}`);
                              } finally {
                                setIsEmailSending(false);
                              }
                            }}
                            disabled={isEmailSending}
                            className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                          >
                            {isEmailSending ? (
                              <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                Sending...
                              </>
                            ) : (
                              <>
                                <Send className="w-4 h-4" />
                                Send Email
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {modalActiveTab === "deals" && (
            <div className="space-y-6">
              <div className="w-4/5 mx-auto">
                {/* Deals Header with Stats */}
                <div className="bg-white rounded-lg border border-gray-200 p-6 mb-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <DollarSign className="w-6 h-6 text-pink-600" />
                      <h3 className="text-xl font-semibold text-gray-900">Deals with {customer.company}</h3>
                    </div>
                    <button
                      onClick={fetchDeals}
                      disabled={isLoadingDeals}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
                      title="Refresh deals"
                    >
                      <RefreshCw className={`w-4 h-4 ${isLoadingDeals ? 'animate-spin' : ''}`} />
                      Refresh
                    </button>
                  </div>

                  {/* Summary Stats under title */}
                  {!isLoadingDeals && !dealsError && deals.length > 0 && (
                    <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                      <div>
                        <span className="text-xs text-gray-600">Total Deals</span>
                        <p className="text-2xl font-bold text-gray-900">{deals.length}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-600">Total Value</span>
                        <p className="text-2xl font-bold text-pink-600">
                          ${deals.reduce((sum, deal) => sum + (deal.value_usd || 0), 0).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-600">Active Deals</span>
                        <p className="text-2xl font-bold text-blue-600">
                          {deals.filter(d => !['won', 'lost'].includes(d.stage)).length}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Deals Table */}
                {isLoadingDeals ? (
                  <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <RefreshCw className="w-5 h-5 text-gray-400 animate-spin" />
                      <span className="text-gray-600">Loading deals...</span>
                    </div>
                  </div>
                ) : dealsError ? (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                    <AlertCircle className="w-6 h-6 text-red-600 mx-auto mb-2" />
                    <span className="text-red-700">{dealsError}</span>
                  </div>
                ) : deals.length === 0 ? (
                  <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                    <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg mb-2">No deals found</p>
                    <p className="text-gray-400 text-sm">There are currently no deals associated with this customer.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="w-full bg-white">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4" />
                              <span>Deal Name</span>
                            </div>
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <div className="flex items-center gap-2">
                              <DollarSign className="w-4 h-4" />
                              <span>Value</span>
                            </div>
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <div className="flex items-center gap-2">
                              <TrendingUp className="w-4 h-4" />
                              <span>Stage</span>
                            </div>
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4" />
                              <span>Last Contact</span>
                            </div>
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              <span>Expected Close</span>
                            </div>
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              <span>Created</span>
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {deals.map((deal, index) => (
                          <tr
                            key={deal.deal_id}
                            className={`hover:bg-blue-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                          >
                            {/* Deal Name */}
                            <td className="px-4 py-3">
                              <div>
                                <p className="text-sm font-medium text-gray-900">{deal.deal_name}</p>
                                {deal.description && (
                                  <p className="text-xs text-gray-500 mt-1 line-clamp-1">{deal.description}</p>
                                )}
                              </div>
                            </td>

                            {/* Value */}
                            <td className="px-4 py-3">
                              <span className="text-sm font-semibold text-pink-600">
                                ${deal.value_usd ? deal.value_usd.toLocaleString() : '0'}
                              </span>
                            </td>

                            {/* Stage */}
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                deal.stage === 'won' ? 'bg-green-100 text-green-800' :
                                deal.stage === 'lost' ? 'bg-red-100 text-red-800' :
                                deal.stage === 'negotiation' ? 'bg-blue-100 text-blue-800' :
                                deal.stage === 'proposal' ? 'bg-purple-100 text-purple-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {deal.stage.charAt(0).toUpperCase() + deal.stage.slice(1)}
                              </span>
                            </td>

                            {/* Last Contact Date */}
                            <td className="px-4 py-3">
                              <span className="text-sm text-gray-700">
                                {deal.last_contact_date
                                  ? new Date(deal.last_contact_date).toLocaleDateString()
                                  : '-'}
                              </span>
                            </td>

                            {/* Expected Close Date */}
                            <td className="px-4 py-3">
                              <span className="text-sm text-gray-700">
                                {deal.expected_close_date
                                  ? new Date(deal.expected_close_date).toLocaleDateString()
                                  : '-'}
                              </span>
                            </td>

                            {/* Created Date */}
                            <td className="px-4 py-3">
                              <span className="text-sm text-gray-500">
                                {new Date(deal.created_at).toLocaleDateString()}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
          </motion.div>
        </motion.div>
      ) : null}

    {/* CRM Meeting Details Modal */}
    <CRMMeetingDetailsModal
      isOpen={showMeetingModal}
      onClose={handleMeetingModalClose}
      meetingId={selectedMeeting?.id}
      authFetch={authFetch}
      meeting={selectedMeeting?.data}
    />

    {/* Interaction Details Modal */}
    <InteractionDetailsModal
      event={selectedInteraction}
      customer={customer}
      isOpen={isInteractionModalOpen}
      onClose={handleInteractionModalClose}
      notes={notes}
      customerInteractions={customerInteractions}
        onDelete={handleCallEventDelete}
        onUpdate={handleCallEventUpdate}
        authFetch={authFetch}
      />

      {/* Note Details Modal */}
      <NoteDetailsModal
        note={selectedNote}
        customer={customer}
        isOpen={showNoteModal}
        onClose={handleNoteModalClose}
        onDelete={handleDeleteNote}
        onUpdate={handleNoteUpdate}
        onToggleStar={handleToggleNoteStar}
        isDeletingNote={isDeletingNote}
        authFetch={authFetch}
    />

      {/* Add Note Modal */}
      <AddNoteModal
        isOpen={addNoteModalOpen}
        onClose={() => {
          setAddNoteModalOpen(false);
          setSelectedInteractionForNote(null);
        }}
        onAddNote={handleAddNote}
        interaction={selectedInteractionForNote}
        isAdding={isAddingNote}
      />
    </AnimatePresence>

    {/* CRM Meeting Details Modal */}
    <CRMMeetingDetailsModal
      isOpen={showMeetingModal}
      onClose={handleMeetingModalClose}
      meetingId={selectedMeeting?.id}
      authFetch={authFetch}
      meeting={selectedMeeting?.data}
    />

    {/* Interaction Details Modal */}
    <InteractionDetailsModal
      event={selectedInteraction}
      customer={customer}
      isOpen={isInteractionModalOpen}
      onClose={handleInteractionModalClose}
      notes={notes}
      customerInteractions={customerInteractions}
    />

    {/* Add Note Modal */}
    <AddNoteModal
      isOpen={addNoteModalOpen}
      onClose={() => {
        setAddNoteModalOpen(false);
        setSelectedInteractionForNote(null);
      }}
      onAddNote={handleAddNote}
      interaction={selectedInteractionForNote}
      isAdding={isAddingNote}
    />
    </Fragment>
  );
};

export default CustomerProfileDisplay;