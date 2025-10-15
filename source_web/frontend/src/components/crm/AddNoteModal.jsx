import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  FileText,
  Star,
  Plus,
  RefreshCw,
  Calendar,
  Mail,
  Phone,
  Users
} from 'lucide-react';
import { Button } from '../ui/button';

const AddNoteModal = ({
  isOpen,
  onClose,
  onAddNote,
  interaction,
  isAdding
}) => {
  const MAX_TITLE_LENGTH = 200;
  const MAX_NOTE_LENGTH = 2000;

  const [noteTitle, setNoteTitle] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [noteStar, setNoteStar] = useState(false);

  // Pre-populate title when interaction changes
  useEffect(() => {
    if (interaction?.theme || interaction?.title) {
      setNoteTitle(interaction.theme || interaction.title || '');
    } else {
      setNoteTitle('');
    }
  }, [interaction]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setNoteTitle('');
      setNoteBody('');
      setNoteStar(false);
    }
  }, [isOpen]);

  // Get type-specific icon and styling
  const getTypeConfig = (type) => {
    switch (type?.toLowerCase()) {
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
          icon: Calendar,
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-600',
          borderColor: 'border-gray-200'
        };
    }
  };

  const typeConfig = getTypeConfig(interaction?.type);
  const TypeIcon = typeConfig.icon;

  const handleSubmit = () => {
    if (!noteBody.trim()) return;

    onAddNote({
      title: noteTitle.trim(),
      body: noteBody.trim(),
      star: noteStar
    });
  };

  // Handle ESC key
  useEffect(() => {
    const handleEscKey = (e) => {
      if (e.key === 'Escape' && !isAdding) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen, isAdding, onClose]);

  if (!isOpen || !interaction) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
          onClick={!isAdding ? onClose : undefined}
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
                  <h2 className="text-xl font-bold text-gray-900">Add Note to Interaction</h2>
                  <p className="text-sm text-gray-500 capitalize">{interaction.type} Interaction</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                disabled={isAdding}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Interaction Preview */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-gray-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{interaction.title}</p>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{interaction.description}</p>
                  </div>
                </div>
              </div>

              {/* Note Title */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Note Title
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    placeholder="Note title (optional)..."
                    className="w-full px-4 py-3 pr-20 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    maxLength={MAX_TITLE_LENGTH}
                    disabled={isAdding}
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
                    placeholder="Add your note about this interaction..."
                    className="w-full h-32 px-4 py-3 pr-20 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    maxLength={MAX_NOTE_LENGTH}
                    disabled={isAdding}
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
                    disabled={isAdding}
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

            {/* Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isAdding}
              >
                Cancel
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-400"
                onClick={handleSubmit}
                disabled={!noteBody.trim() || isAdding}
              >
                {isAdding ? (
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
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AddNoteModal;
