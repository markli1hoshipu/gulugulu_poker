import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Calendar,
  Clock,
  User,
  Mail,
  Phone,
  Users,
  MessageSquare,
  Building,
  ArrowRight,
  ExternalLink,
  FileText,
  Star,
  Trash2,
  RefreshCw,
  Edit3,
  Save,
  XCircle
} from 'lucide-react';
import { Button } from '../ui/button';

const InteractionDetailsModal = ({
  event,
  customer,
  isOpen,
  onClose,
  notes = [],
  customerInteractions = [],
  onDelete,
  onUpdate,
  authFetch
}) => {
  const CRM_API_BASE_URL = import.meta.env.VITE_CRM_API_URL || 'http://localhost:8003';

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editedTheme, setEditedTheme] = useState('');
  const [editedContent, setEditedContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  const MAX_THEME_LENGTH = 50;
  const MAX_CONTENT_LENGTH = 5000;

  // Check if this is a call event
  const isCallEvent = event?.originalType === 'call';

  // Initialize edit fields when event changes
  useEffect(() => {
    if (event && isCallEvent) {
      setEditedTheme(event.metadata?.theme || event.title || '');
      setEditedContent(event.description || '');
      setIsEditing(false);
      setError('');
    }
  }, [event, isCallEvent]);

  // Handle ESC key press
  useEffect(() => {
    const handleEscKey = (e) => {
      if (e.key === 'Escape') {
        if (isEditing) {
          handleCancelEdit();
        } else {
          onClose();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, isEditing, onClose]);

  // Early return AFTER all hooks
  if (!isOpen || !event) return null;

  // Get notes linked to this interaction - try multiple possible ID fields
  const interactionId = event.metadata?.interactionId || event.id || event.metadata?.interaction_id;

  const linkedNotes = notes.filter(note => note.interaction_id === interactionId);

  // Format date and time
  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';

    return {
      date: date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    };
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

  const dateTime = formatDateTime(event.date);

  // Handle save edit for call events
  const handleSaveEdit = async () => {
    if (!editedContent.trim()) {
      setError('Call summary content cannot be empty');
      return;
    }

    if (editedContent.length > MAX_CONTENT_LENGTH) {
      setError(`Content cannot exceed ${MAX_CONTENT_LENGTH} characters`);
      return;
    }

    if (editedTheme.length > MAX_THEME_LENGTH) {
      setError(`Theme cannot exceed ${MAX_THEME_LENGTH} characters`);
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const response = await authFetch(
        `${CRM_API_BASE_URL}/api/crm/customers/${customer.id}/call-summaries/${interactionId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: editedContent.trim(),
            theme: editedTheme.trim() || null
          }),
        }
      );

      if (response.ok) {
        const updatedCallSummary = await response.json();
        if (onUpdate) {
          await onUpdate(updatedCallSummary);
        }
        setIsEditing(false);
      } else {
        const errorData = await response.json();
        setError('Failed to update call summary: ' + (errorData.detail || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error updating call summary:', err);
      setError('Error updating call summary: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditedTheme(event.metadata?.theme || event.title || '');
    setEditedContent(event.description || '');
    setIsEditing(false);
    setError('');
  };

  // Handle delete for call events
  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this call summary?')) {
      return;
    }

    setIsDeleting(true);
    setError('');

    try {
      const response = await authFetch(
        `${CRM_API_BASE_URL}/api/crm/customers/${customer.id}/call-summaries/${interactionId}`,
        {
          method: 'DELETE',
        }
      );

      if (response.ok) {
        if (onDelete) {
          await onDelete(interactionId);
        }
        onClose();
      } else {
        const errorData = await response.json();
        setError('Failed to delete call summary: ' + (errorData.detail || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error deleting call summary:', err);
      setError('Error deleting call summary: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // Get type-specific icon and styling
  const getTypeConfig = (type) => {
    switch (type) {
      case 'email':
        return {
          icon: Mail,
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-600',
          borderColor: 'border-blue-200'
        };
      case 'call':
        return {
          icon: Phone,
          bgColor: 'bg-green-100',
          textColor: 'text-green-600',
          borderColor: 'border-green-200'
        };
      case 'meeting':
        return {
          icon: Users,
          bgColor: 'bg-purple-100',
          textColor: 'text-purple-600',
          borderColor: 'border-purple-200'
        };
      default:
        return {
          icon: MessageSquare,
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-600',
          borderColor: 'border-gray-200'
        };
    }
  };

  const typeConfig = getTypeConfig(event.originalType);
  const TypeIcon = typeConfig.icon;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full ${typeConfig.bgColor} flex items-center justify-center`}>
                  <TypeIcon className={`w-6 h-6 ${typeConfig.textColor}`} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{event.title}</h2>
                  <p className="text-sm text-gray-500 capitalize">{event.originalType} Interaction</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Date and Time */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{dateTime.date}</p>
                    <p className="text-xs text-gray-500">Date</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{dateTime.time}</p>
                    <p className="text-xs text-gray-500">Time</p>
                  </div>
                </div>
              </div>

              {/* Participants */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-gray-600" />
                  Participants
                </h3>
                
                {/* Email-specific sender/receiver logic */}
                {event.originalType === 'email' && event.metadata?.sourceName && event.metadata?.sourceType ? (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium">
                          {event.metadata.sourceType === 'customer' ? event.metadata.sourceName : event.employeeName}
                        </span>
                        <span className="text-xs text-gray-500">
                          ({event.metadata.sourceType === 'customer' ? 'Customer' : 'Employee'})
                        </span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium">
                          {event.metadata.sourceType === 'customer' ? event.employeeName : customer?.company}
                        </span>
                        <span className="text-xs text-gray-500">
                          ({event.metadata.sourceType === 'customer' ? 'Employee' : 'Customer'})
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium">{event.employeeName}</span>
                        <span className="text-xs text-gray-500">(Employee)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium">{customer?.company}</span>
                        <span className="text-xs text-gray-500">(Customer)</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>



              {/* Interaction Content */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-gray-600" />
                    Content
                  </h3>
                  {isCallEvent && !isEditing && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-2"
                    >
                      <Edit3 className="w-4 h-4" />
                      Edit
                    </Button>
                  )}
                </div>

                {isCallEvent && isEditing ? (
                  <div className="space-y-4">
                    {/* Theme Input */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Theme <span className="text-gray-400">(Optional)</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={editedTheme}
                          onChange={(e) => setEditedTheme(e.target.value)}
                          placeholder="Call theme..."
                          className="w-full px-3 py-2 pr-20 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm"
                          maxLength={MAX_THEME_LENGTH}
                          disabled={isSaving}
                        />
                        <div className="absolute bottom-2 right-3 text-xs text-gray-400">
                          {editedTheme.length}/{MAX_THEME_LENGTH}
                        </div>
                      </div>
                    </div>

                    {/* Content Textarea */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Summary <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <textarea
                          value={editedContent}
                          onChange={(e) => setEditedContent(e.target.value)}
                          placeholder="Call summary..."
                          className="w-full h-48 px-3 py-2 pr-20 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm"
                          maxLength={MAX_CONTENT_LENGTH}
                          disabled={isSaving}
                        />
                        <div className="absolute bottom-3 right-3 text-xs text-gray-400">
                          {editedContent.length}/{MAX_CONTENT_LENGTH}
                        </div>
                      </div>
                    </div>

                    {/* Edit Actions */}
                    <div className="flex gap-2">
                      <Button
                        onClick={handleSaveEdit}
                        disabled={!editedContent.trim() || isSaving}
                        className="flex items-center gap-2 bg-pink-600 hover:bg-pink-700 text-white"
                      >
                        {isSaving ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            Save Changes
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleCancelEdit}
                        disabled={isSaving}
                        className="flex items-center gap-2"
                      >
                        <XCircle className="w-4 h-4" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {event.description || 'No content available'}
                    </p>
                  </div>
                )}
              </div>



              {/* Gmail Integration */}
              {event.metadata?.gmailMessageId && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <ExternalLink className="w-5 h-5 text-gray-600" />
                    Integration
                  </h3>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">Gmail Message ID</span>
                    </div>
                    <p className="text-xs text-blue-700 mt-1 font-mono">{event.metadata.gmailMessageId}</p>
                  </div>
                </div>
              )}

              {/* Linked Notes Section */}
              {linkedNotes.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-gray-600" />
                    Notes ({linkedNotes.length})
                  </h3>
                  <div className="space-y-3">
                    {linkedNotes.map((note) => (
                      <div
                        key={note.id}
                        className={`rounded-lg border p-4 ${
                          note.isStarred ? 'border-yellow-200 bg-yellow-50' : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <div className="flex gap-3">
                          {/* Avatar */}
                          <div className="flex-shrink-0">
                            <div className="w-7 h-7 bg-gray-700 rounded-full flex items-center justify-center">
                              <User className="w-3 h-3 text-white" />
                            </div>
                          </div>

                          {/* Note Content */}
                          <div className="flex-1 min-w-0">
                            {/* Header */}
                            <div className="flex items-center gap-2 mb-1">
                              {note.title && (
                                <h5 className="text-sm font-medium text-gray-900 truncate">
                                  {note.title}
                                </h5>
                              )}
                              {note.isStarred && (
                                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-xs flex-shrink-0">
                                  <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
                                  {getStarDisplayText(note.star)}
                                </div>
                              )}
                            </div>

                            {/* Body */}
                            <div className="text-sm text-gray-700 leading-relaxed mb-2">
                              {note.body || note.content}
                            </div>

                            {/* Date */}
                            <div className="text-xs text-gray-500">
                              {formatNoteDate(note.date)}
                              {note.updated_at && note.updated_at.getTime() !== note.date.getTime() && (
                                <span> • edited {formatNoteDate(note.updated_at)}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end items-center gap-3 p-6 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isSaving || isDeleting}
              >
                Close
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default InteractionDetailsModal;
