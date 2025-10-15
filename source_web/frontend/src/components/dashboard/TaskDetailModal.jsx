import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Calendar, 
  Flag, 
  Trash2, 
  Save,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import TaskStatusSelector from './TaskStatusSelector';
import TaskMessagePopup from './TaskMessagePopup';
import { updateTask, deleteTask } from '../../services/taskGenerationApi';
import { useAuth } from '../../auth/hooks/useAuth';

const TaskDetailModal = ({ 
  isOpen, 
  onClose, 
  task, 
  onTaskUpdate,
  onTaskDelete 
}) => {
  const { idToken } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    status: 'not-started',
    due_date: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [popupMessage, setPopupMessage] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form data when task changes
  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        priority: task.priority || 'medium',
        status: task.status || 'not-started',
        due_date: task.due ? task.due.split('T')[0] : '' // Convert to YYYY-MM-DD format
      });
      setHasChanges(false);
    }
  }, [task]);

  // Track changes
  useEffect(() => {
    if (task) {
      const originalData = {
        title: task.title || '',
        description: task.description || '',
        priority: task.priority || 'medium',
        status: task.status || 'not-started',
        due_date: task.due ? task.due.split('T')[0] : ''
      };
      
      const hasChanged = Object.keys(formData).some(key => 
        formData[key] !== originalData[key]
      );
      setHasChanges(hasChanged);
    }
  }, [formData, task]);

  const showPopupMessage = (type, title, message) => {
    setPopupMessage({
      isOpen: true,
      type,
      title,
      message
    });
  };

  const closePopupMessage = () => {
    setPopupMessage(null);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleStatusChange = async (taskId, newStatus) => {
    setFormData(prev => ({
      ...prev,
      status: newStatus
    }));
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      showPopupMessage('error', 'Validation Error', 'Task title is required.');
      return false;
    }

    // Validate due date is not in the past (unless task is already overdue)
    if (formData.due_date && formData.status !== 'overdue') {
      const selectedDate = new Date(formData.due_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        showPopupMessage('error', 'Invalid Date', 'Due date cannot be in the past.');
        return false;
      }
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    if (!idToken) {
      showPopupMessage('error', 'Authentication Required', 'Please log in to update tasks.');
      return;
    }

    setIsLoading(true);

    try {
      // Prepare update data
      const updateData = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        priority: formData.priority,
        status: formData.status,
        due_date: formData.due_date || null
      };

      const result = await updateTask(task.id, updateData, idToken);

      if (result.success) {
        // Transform API response to match existing task format
        const updatedTask = {
          id: result.task.task_id,
          title: result.task.title,
          description: result.task.description,
          status: result.task.status,
          priority: result.task.priority,
          source: result.task.source,
          due: result.task.due_date,
          type: 'dashboard',
          createdAt: result.task.created_at,
          isOverdue: result.task.is_overdue,
          daysUntilDue: result.task.days_until_due
        };

        onTaskUpdate(updatedTask);
        setHasChanges(false);
        showPopupMessage('success', 'Task Updated', 'Task has been successfully updated.');
      } else {
        showPopupMessage('error', 'Update Failed', result.error || 'Failed to update task.');
      }
    } catch (error) {
      console.error('Error updating task:', error);
      showPopupMessage('error', 'Update Failed', 'An unexpected error occurred while updating the task.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!idToken) {
      showPopupMessage('error', 'Authentication Required', 'Please log in to delete tasks.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await deleteTask(task.id, idToken);

      if (result.success) {
        onTaskDelete(task.id);
        onClose();
        showPopupMessage('success', 'Task Deleted', 'Task has been successfully deleted.');
      } else {
        showPopupMessage('error', 'Delete Failed', result.error || 'Failed to delete task.');
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      showPopupMessage('error', 'Delete Failed', 'An unexpected error occurred while deleting the task.');
    } finally {
      setIsLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleClose = () => {
    if (hasChanges) {
      if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (!task) return null;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={handleClose}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Flag className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-slate-800">Task Details</h2>
                      <p className="text-sm text-slate-600">Edit task information</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClose}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Task Title */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Task Title *
                  </label>
                  <Input
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="Enter task title..."
                    className="w-full"
                  />
                </div>

                {/* Task Description */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Description
                  </label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Enter task description..."
                    rows={4}
                    className="w-full"
                  />
                </div>

                {/* Priority and Status Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Priority */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Priority
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) => handleInputChange('priority', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                    <div className="mt-2">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs border ${getPriorityColor(formData.priority)}`}>
                        {formData.priority.charAt(0).toUpperCase() + formData.priority.slice(1)}
                      </span>
                    </div>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Status
                    </label>
                    <TaskStatusSelector
                      currentStatus={formData.status}
                      taskId={task.id}
                      onStatusChange={handleStatusChange}
                      disabled={isLoading}
                      variant="dropdown"
                      showLabel={true}
                    />
                  </div>
                </div>

                {/* Due Date */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Due Date
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        type="date"
                        value={formData.due_date}
                        onChange={(e) => handleInputChange('due_date', e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    {formData.due_date && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleInputChange('due_date', '')}
                        className="text-slate-500 hover:text-slate-700"
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={isLoading}
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Task
                  </Button>
                  
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      onClick={handleClose}
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={isLoading || !hasChanges}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4"
            onClick={() => setShowDeleteConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">Delete Task</h3>
                  <p className="text-sm text-slate-600">This action cannot be undone</p>
                </div>
              </div>
              
              <p className="text-slate-700 mb-6">
                Are you sure you want to delete "<strong>{task.title}</strong>"?
              </p>
              
              <div className="flex items-center justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDelete}
                  disabled={isLoading}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Task
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Task Message Popup */}
      {popupMessage && (
        <TaskMessagePopup
          isOpen={popupMessage.isOpen}
          type={popupMessage.type}
          title={popupMessage.title}
          message={popupMessage.message}
          onClose={closePopupMessage}
          autoClose={true}
          autoCloseDelay={4000}
        />
      )}
    </>
  );
};

export default TaskDetailModal;
