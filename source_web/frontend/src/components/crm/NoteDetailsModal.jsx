import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Calendar,
  Clock,
  User,
  FileText,
  Star,
  Trash2,
  RefreshCw,
  Edit3,
  Save,
  XCircle
} from 'lucide-react';
import { Button } from '../ui/button';

const NoteDetailsModal = ({
  note,
  customer,
  isOpen,
  onClose,
  onDelete,
  onUpdate,
  onToggleStar,
  isDeletingNote,
  authFetch
}) => {
  const CRM_API_BASE_URL = import.meta.env.VITE_CRM_API_URL || 'http://localhost:8003';

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedBody, setEditedBody] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const MAX_TITLE_LENGTH = 200;
  const MAX_NOTE_LENGTH = 2000;

  // Initialize edit fields when note changes
  useEffect(() => {
    if (note && isOpen) {
      setEditedTitle(note.title || '');
      setEditedBody(note.body || note.content || '');
      setIsEditing(false);
      setError('');
    }
  }, [note, isOpen]);

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

  // Early returns AFTER all hooks
  if (!isOpen || !note) return null;

  // Validate note object has required fields
  if (!note.id) {
    console.error('Note object missing required id field:', note);
    return null;
  }

  // Format date and time
  const formatDateTime = (dateString) => {
    if (!dateString) return { date: 'N/A', time: 'N/A' };
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return { date: 'Invalid Date', time: '' };

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

  const dateTime = formatDateTime(note.date);
  const updatedDateTime = note.updated_at ? formatDateTime(note.updated_at) : null;
  const noteAuthor = note.author || 'You';
  const noteTitle = note.title || 'Note';
  const noteBody = note.body || note.content || '';
  const noteStar = note.star || null;

  // Handle save edit
  const handleSaveEdit = async () => {
    if (!editedBody.trim()) {
      setError('Note content cannot be empty');
      return;
    }

    if (editedBody.length > MAX_NOTE_LENGTH) {
      setError(`Note cannot exceed ${MAX_NOTE_LENGTH} characters`);
      return;
    }

    if (editedTitle.length > MAX_TITLE_LENGTH) {
      setError(`Title cannot exceed ${MAX_TITLE_LENGTH} characters`);
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const response = await authFetch(`${CRM_API_BASE_URL}/api/crm/notes/${note.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: editedTitle.trim() || null,
          body: editedBody.trim()
        }),
      });

      if (response.ok) {
        const updatedNote = await response.json();
        if (onUpdate) {
          await onUpdate(updatedNote);
        }
        setIsEditing(false);
      } else {
        const errorData = await response.json();
        setError('Failed to update note: ' + (errorData.detail || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error updating note:', err);
      setError('Error updating note: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditedTitle(note.title || '');
    setEditedBody(note.body || note.content || '');
    setIsEditing(false);
    setError('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={!isEditing ? onClose : undefined}
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
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-xl font-bold text-gray-900 truncate">
                      {noteTitle}
                    </h2>
                    {isNoteStarred(noteStar) && (
                      <div className="flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-xs flex-shrink-0">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        {getStarDisplayText(noteStar)}
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">Customer Note</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                disabled={isSaving}
                className="text-gray-400 hover:text-gray-600 flex-shrink-0"
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
                    <p className="text-xs text-gray-500">Created</p>
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

              {/* Updated timestamp if different */}
              {updatedDateTime && note.updated_at && new Date(note.updated_at).getTime() !== new Date(note.date).getTime() && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-700">
                    Last updated: {updatedDateTime.date} at {updatedDateTime.time}
                  </p>
                </div>
              )}

              {/* Author */}
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{noteAuthor}</p>
                  <p className="text-xs text-gray-500">Author</p>
                </div>
              </div>

              {/* Note Content */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-gray-600" />
                    Note Content
                  </h3>
                  {!isEditing && (
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

                {isEditing ? (
                  <div className="space-y-4">
                    {/* Title Input */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Title <span className="text-gray-400">(Optional)</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={editedTitle}
                          onChange={(e) => setEditedTitle(e.target.value)}
                          placeholder="Note title..."
                          className="w-full px-3 py-2 pr-20 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm"
                          maxLength={MAX_TITLE_LENGTH}
                          disabled={isSaving}
                        />
                        <div className="absolute bottom-2 right-3 text-xs text-gray-400">
                          {editedTitle.length}/{MAX_TITLE_LENGTH}
                        </div>
                      </div>
                    </div>

                    {/* Body Textarea */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Content <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <textarea
                          value={editedBody}
                          onChange={(e) => setEditedBody(e.target.value)}
                          placeholder="Note content..."
                          className="w-full h-48 px-3 py-2 pr-20 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm"
                          maxLength={MAX_NOTE_LENGTH}
                          disabled={isSaving}
                        />
                        <div className="absolute bottom-3 right-3 text-xs text-gray-400">
                          {editedBody.length}/{MAX_NOTE_LENGTH}
                        </div>
                      </div>
                    </div>

                    {/* Edit Actions */}
                    <div className="flex gap-2">
                      <Button
                        onClick={handleSaveEdit}
                        disabled={!editedBody.trim() || isSaving}
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
                    {noteTitle && noteTitle !== 'Note' && (
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">
                        {noteTitle}
                      </h4>
                    )}
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {noteBody || 'No content available'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center gap-3 p-6 border-t border-gray-200">
              <div className="flex gap-2">
                {/* Toggle Star Button */}
                <Button
                  variant="outline"
                  onClick={() => onToggleStar && onToggleStar(note.id, noteStar)}
                  disabled={isEditing || isSaving}
                  className={`flex items-center gap-2 ${
                    isNoteStarred(noteStar)
                      ? 'border-yellow-300 bg-yellow-50 hover:bg-yellow-100 text-yellow-700'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <Star className={`w-4 h-4 ${isNoteStarred(noteStar) ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                  {isNoteStarred(noteStar) ? 'Remove Star' : 'Mark Important'}
                </Button>
              </div>

              <Button
                variant="outline"
                onClick={onClose}
                disabled={isSaving}
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

export default NoteDetailsModal;
