import React, { useState } from 'react';
import {
  CheckSquare,
  Square,
  MoreHorizontal,
  CheckCircle2,
  Clock,
  Circle,
  Pause,
  AlertCircle,
  Trash2,
  Loader2,
  X
} from 'lucide-react';
import { Button } from '../ui/button';
import { motion, AnimatePresence } from 'framer-motion';

const statusOptions = [
  { value: 'not-started', label: 'Not Started', icon: Circle, color: 'text-slate-600' },
  { value: 'in-progress', label: 'In Progress', icon: Clock, color: 'text-indigo-600' },
  { value: 'completed', label: 'Completed', icon: CheckCircle2, color: 'text-emerald-600' },
  { value: 'overdue', label: 'Overdue', icon: AlertCircle, color: 'text-rose-600' }
];

const BulkTaskActions = ({ 
  selectedTasks, 
  onSelectAll, 
  onDeselectAll, 
  onBulkStatusUpdate,
  onBulkDelete,
  totalTasks,
  isAllSelected,
  disabled = false
}) => {
  const [showActions, setShowActions] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateType, setUpdateType] = useState(null);

  const selectedCount = selectedTasks.size;
  const hasSelection = selectedCount > 0;

  const handleBulkStatusUpdate = async (newStatus) => {
    if (!hasSelection || disabled || isUpdating) return;

    setIsUpdating(true);
    setUpdateType('status');
    try {
      await onBulkStatusUpdate(Array.from(selectedTasks), newStatus);
      setShowActions(false);
    } catch (error) {
      console.error('Bulk status update failed:', error);
    } finally {
      setIsUpdating(false);
      setUpdateType(null);
    }
  };

  const handleBulkDelete = async () => {
    if (!hasSelection || disabled || isUpdating) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedCount} task${selectedCount > 1 ? 's' : ''}? This action cannot be undone.`
    );

    if (!confirmed) return;

    setIsUpdating(true);
    setUpdateType('delete');
    try {
      await onBulkDelete(Array.from(selectedTasks));
      setShowActions(false);
    } catch (error) {
      console.error('Bulk delete failed:', error);
    } finally {
      setIsUpdating(false);
      setUpdateType(null);
    }
  };

  if (!hasSelection) {
    return (
      <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
        <Button
          variant="ghost"
          size="sm"
          onClick={onSelectAll}
          disabled={disabled}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-800"
        >
          <Square className="w-4 h-4" />
          Select All ({totalTasks})
        </Button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200"
    >
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={isAllSelected ? onDeselectAll : onSelectAll}
          disabled={disabled || isUpdating}
          className="flex items-center gap-2 text-blue-700 hover:text-blue-800"
        >
          <CheckSquare className="w-4 h-4" />
          {isAllSelected ? 'Deselect All' : `Select All (${totalTasks})`}
        </Button>
        
        <div className="h-4 w-px bg-blue-300" />
        
        <span className="text-sm font-medium text-blue-800">
          {selectedCount} task{selectedCount > 1 ? 's' : ''} selected
        </span>
      </div>

      <div className="flex items-center gap-2">
        {isUpdating && (
          <div className="flex items-center gap-2 text-blue-700">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">
              {updateType === 'delete' ? 'Deleting...' : 'Updating...'}
            </span>
          </div>
        )}

        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowActions(!showActions)}
            disabled={disabled || isUpdating}
            className="flex items-center gap-2 bg-white border-blue-300 text-blue-700 hover:bg-blue-50"
          >
            <MoreHorizontal className="w-4 h-4" />
            Actions
          </Button>

          <AnimatePresence>
            {showActions && (
              <>
                {/* Backdrop */}
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowActions(false)}
                />
                
                {/* Actions Menu */}
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full right-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-slate-200 py-2 z-20"
                >
                  <div className="px-3 py-2 border-b border-slate-100">
                    <h4 className="text-sm font-medium text-slate-700">Change Status</h4>
                  </div>
                  
                  {statusOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.value}
                        onClick={() => handleBulkStatusUpdate(option.value)}
                        disabled={isUpdating}
                        className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-slate-50 transition-colors"
                      >
                        <Icon className={`w-4 h-4 ${option.color}`} />
                        <span className="text-sm">{option.label}</span>
                      </button>
                    );
                  })}

                  <div className="border-t border-slate-100 mt-2 pt-2">
                    <button
                      onClick={handleBulkDelete}
                      disabled={isUpdating}
                      className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-red-50 text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="text-sm">Delete Selected</span>
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onDeselectAll}
          disabled={disabled || isUpdating}
          className="text-slate-500 hover:text-slate-700"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
};

export default BulkTaskActions;
