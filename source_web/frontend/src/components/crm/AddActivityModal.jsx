import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Calendar,
  FileText,
  PhoneCall,
  Star,
  Plus,
  RefreshCw
} from 'lucide-react';
import { Button } from '../ui/button';
import MeetingScheduler from './MeetingScheduler';

const AddActivityModal = ({
  isOpen,
  onClose,
  customer,
  onNoteAdded,
  onInteractionAdded,
  authFetch,
  initialActivityType = 'note'
}) => {
  const MAX_TITLE_LENGTH = 200;
  const MAX_NOTE_LENGTH = 2000;
  const MAX_CALL_SUMMARY_LENGTH = 5000;
  const MAX_THEME_LENGTH = 50;
  const CRM_API_BASE_URL = import.meta.env.VITE_CRM_API_URL || 'http://localhost:8003';

  // State
  const [activityType, setActivityType] = useState(initialActivityType);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [noteStar, setNoteStar] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Call Summary State
  const [callSummary, setCallSummary] = useState('');
  const [callTheme, setCallTheme] = useState('');

  // Reset form when modal opens/closes or activity type changes
  useEffect(() => {
    if (!isOpen) {
      setNoteTitle('');
      setNoteBody('');
      setNoteStar(false);
      setCallSummary('');
      setCallTheme('');
      setError('');
      setSuccess('');
    } else {
      // When modal opens, set the activity type to the initial one
      setActivityType(initialActivityType);
    }
  }, [isOpen, initialActivityType]);

  // Clear messages after timeout
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('');
        setSuccess('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // Handle ESC key
  useEffect(() => {
    const handleEscKey = (e) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen, isSubmitting, onClose]);

  // Validate note input
  const validateNote = () => {
    const trimmedBody = noteBody.trim();
    const trimmedTitle = noteTitle.trim();

    if (trimmedBody.length === 0) {
      return 'Note content cannot be empty';
    }
    if (trimmedBody.length > MAX_NOTE_LENGTH) {
      return `Note cannot exceed ${MAX_NOTE_LENGTH} characters`;
    }
    if (trimmedTitle.length > MAX_TITLE_LENGTH) {
      return `Title cannot exceed ${MAX_TITLE_LENGTH} characters`;
    }
    return null;
  };

  // Validate call summary input
  const validateCallSummary = () => {
    const trimmedSummary = callSummary.trim();
    const trimmedTheme = callTheme.trim();

    if (trimmedSummary.length === 0) {
      return 'Call summary cannot be empty';
    }
    if (trimmedSummary.length > MAX_CALL_SUMMARY_LENGTH) {
      return `Call summary cannot exceed ${MAX_CALL_SUMMARY_LENGTH} characters`;
    }
    if (trimmedTheme.length > MAX_THEME_LENGTH) {
      return `Theme cannot exceed ${MAX_THEME_LENGTH} characters`;
    }
    return null;
  };

  // Handle note submission
  const handleSubmitNote = async () => {
    if (!customer?.id) return;

    const validationError = validateNote();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setSuccess('');
    setIsSubmitting(true);

    const payload = {
      title: noteTitle.trim() || '',
      body: noteBody.trim(),
      star: noteStar ? 'important' : null,
      interaction_id: null // General note, not linked to interaction
    };

    try {
      const response = await authFetch(`${CRM_API_BASE_URL}/api/crm/customers/${customer.id}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setSuccess('Note added successfully!');

        // Trigger data refresh in background (don't wait)
        if (onNoteAdded) {
          onNoteAdded().catch(err => {
            console.error('Error refreshing notes after creation:', err);
          });
        }

        // Close modal immediately after brief success message display
        setTimeout(() => {
          onClose();
        }, 500);
      } else {
        const errorData = await response.json();
        setError('Failed to add note: ' + (errorData.detail || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error adding note:', err);
      setError('Error adding note: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle call summary submission
  const handleSubmitCallSummary = async () => {
    if (!customer?.id) return;

    const validationError = validateCallSummary();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setSuccess('');
    setIsSubmitting(true);

    const payload = {
      content: callSummary.trim(),
      theme: callTheme.trim() || null,
      source: 'manual',
      duration_minutes: null
    };

    try {
      const response = await authFetch(`${CRM_API_BASE_URL}/api/crm/customers/${customer.id}/call-summaries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setSuccess('Call summary added successfully!');

        // Trigger interaction refresh in background (call summaries are interactions)
        if (onInteractionAdded) {
          onInteractionAdded().catch(err => {
            console.error('Error refreshing interactions after call summary creation:', err);
          });
        }

        // Close modal immediately after brief success message display
        setTimeout(() => {
          onClose();
        }, 500);
      } else {
        const errorData = await response.json();
        setError('Failed to add call summary: ' + (errorData.detail || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error adding call summary:', err);
      setError('Error adding call summary: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get tab configuration
  const tabs = [
    { key: 'note', label: 'Add Note', icon: FileText },
    { key: 'meeting', label: 'Schedule Meeting', icon: Calendar },
    { key: 'callSummary', label: 'Add Call Summary', icon: PhoneCall }
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-50 flex justify-center pt-8 px-8"
          onClick={onClose}
        >
          {/* Modal Container - Matches Customer Profile size */}
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            className="w-full bg-white rounded-lg shadow-2xl relative h-full flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pt-5 pb-3 px-6 border-b border-gray-200 flex-shrink-0">
              <h2 className="text-2xl font-bold text-gray-900">Add Activity</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                disabled={isSubmitting}
              >
                <X className="w-5 h-5 text-gray-500" />
              </Button>
            </div>

            {/* Activity Type Tabs */}
            <div className="border-b border-gray-200 flex-shrink-0 px-6">
              <div className="flex gap-2">
                {tabs.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setActivityType(key)}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activityType === key
                        ? 'border-pink-600 text-pink-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                    disabled={isSubmitting}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto py-6 px-6 bg-gray-50">
              {/* Success/Error Messages */}
              {success && (
                <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                  {success}
                </div>
              )}
              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Note Form */}
              {activityType === 'note' && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="space-y-4">
                    {/* Title Input */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Note Title <span className="text-gray-400">(Optional)</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={noteTitle}
                          onChange={(e) => setNoteTitle(e.target.value)}
                          placeholder="Enter note title..."
                          className="w-full px-4 py-3 pr-20 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm"
                          maxLength={MAX_TITLE_LENGTH}
                          disabled={isSubmitting}
                        />
                        <div className="absolute bottom-3 right-3 text-xs text-gray-400">
                          {noteTitle.length}/{MAX_TITLE_LENGTH}
                        </div>
                      </div>
                    </div>

                    {/* Note Body */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Note Content <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <textarea
                          value={noteBody}
                          onChange={(e) => setNoteBody(e.target.value)}
                          placeholder="Add your note..."
                          className="w-full h-48 px-4 py-3 pr-20 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm"
                          maxLength={MAX_NOTE_LENGTH}
                          disabled={isSubmitting}
                        />
                        <div className="absolute bottom-3 right-3 text-xs text-gray-400">
                          {noteBody.length}/{MAX_NOTE_LENGTH}
                        </div>
                      </div>
                    </div>

                    {/* Star Toggle */}
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={noteStar}
                          onChange={(e) => setNoteStar(e.target.checked)}
                          disabled={isSubmitting}
                          className="sr-only"
                        />
                        <div className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm transition-colors ${
                          noteStar
                            ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                            : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
                        }`}>
                          <Star className={`w-4 h-4 ${noteStar ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                          {noteStar ? 'Important' : 'Mark as Important'}
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Meeting Scheduler */}
              {activityType === 'meeting' && (
                <MeetingScheduler
                  customer={customer}
                  onMeetingCreated={async (meeting) => {
                    setSuccess('✅ Meeting created and synced to Google Calendar!');

                    // Trigger interaction refresh in background (meetings are interactions)
                    if (onInteractionAdded) {
                      onInteractionAdded().catch(err => {
                        console.error('Error refreshing interactions after meeting creation:', err);
                      });
                    }

                    // Close modal immediately after brief success message display
                    setTimeout(() => {
                      onClose();
                    }, 500);
                  }}
                  authFetch={authFetch}
                />
              )}

              {/* Call Summary Form */}
              {activityType === 'callSummary' && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="space-y-4">
                    {/* Call Theme Input */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Call Theme <span className="text-gray-400">(Optional)</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={callTheme}
                          onChange={(e) => setCallTheme(e.target.value)}
                          placeholder="e.g., Product Demo, Follow-up, Support..."
                          className="w-full px-4 py-3 pr-20 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm"
                          maxLength={MAX_THEME_LENGTH}
                          disabled={isSubmitting}
                        />
                        <div className="absolute bottom-3 right-3 text-xs text-gray-400">
                          {callTheme.length}/{MAX_THEME_LENGTH}
                        </div>
                      </div>
                    </div>

                    {/* Call Summary Content */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Call Summary <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <textarea
                          value={callSummary}
                          onChange={(e) => setCallSummary(e.target.value)}
                          placeholder="Summarize the key discussion points, outcomes, and any follow-up actions..."
                          className="w-full h-48 px-4 py-3 pr-20 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm"
                          maxLength={MAX_CALL_SUMMARY_LENGTH}
                          disabled={isSubmitting}
                        />
                        <div className="absolute bottom-3 right-3 text-xs text-gray-400">
                          {callSummary.length}/{MAX_CALL_SUMMARY_LENGTH}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              {activityType === 'note' && (
                <Button
                  className="bg-pink-600 hover:bg-pink-700 text-white disabled:bg-gray-400"
                  onClick={handleSubmitNote}
                  disabled={!noteBody.trim() || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Adding Note...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Note
                    </>
                  )}
                </Button>
              )}
              {activityType === 'callSummary' && (
                <Button
                  className="bg-pink-600 hover:bg-pink-700 text-white disabled:bg-gray-400"
                  onClick={handleSubmitCallSummary}
                  disabled={!callSummary.trim() || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Adding Call Summary...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Call Summary
                    </>
                  )}
                </Button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AddActivityModal;

