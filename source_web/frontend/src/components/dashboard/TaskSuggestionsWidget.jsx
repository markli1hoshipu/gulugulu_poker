import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target,
  RefreshCw,
  MessageSquare,
  Check,
  X,
  Clock,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Send,
  Loader2,
  Edit3,
  Save,
  RotateCcw
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { Select, SelectItem } from '../ui/select';
import { generateTasksFromGoals, refineTasksFromFeedback, saveModifiedTasks } from '../../services/taskGenerationApi';
import { useAuth } from '../../auth/hooks/useAuth';

const TaskSuggestionsWidget = ({ onAcceptTasks, employeeEmail }) => {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState([]);
  const [sessionData, setSessionData] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [feedbackHistory, setFeedbackHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedTasks, setSelectedTasks] = useState(new Set());
  const [showFeedback, setShowFeedback] = useState(false);
  
  // Task editing state
  const [editingTasks, setEditingTasks] = useState(new Set());
  const [editedTasks, setEditedTasks] = useState({});
  const [originalTasks, setOriginalTasks] = useState({});
  const [saveLoading, setSaveLoading] = useState(false);

  const generateSuggestions = async () => {
    setLoading(true);
    setError(null);
    setSuggestions([]);
    setSelectedTasks(new Set());
    setFeedbackHistory([]);
    setSessionData(null);
    
    // Clear editing state
    setEditingTasks(new Set());
    setEditedTasks({});
    setOriginalTasks({});

    try {
      // Use employeeEmail prop or fall back to authenticated user's email
      const userEmail = employeeEmail || user?.email;
      if (!userEmail) {
        throw new Error('User email not available. Please ensure you are logged in.');
      }

      const result = await generateTasksFromGoals(userEmail);
      
      if (result.success) {
        setSuggestions(result.tasks || []);
        setSessionData(result.sessionData);
        // Pre-select all tasks by default
        setSelectedTasks(new Set(result.tasks?.map(task => task.id) || []));
      } else {
        throw new Error(result.error || 'Failed to generate task suggestions');
      }
    } catch (err) {
      console.error('Error generating task suggestions:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const refineSuggestions = async () => {
    if (!feedback.trim()) {
      setError('Please provide feedback to refine the tasks');
      return;
    }

    // Check for unsaved changes
    if (hasUnsavedChanges) {
      setError('Please save or cancel your current edits before refining tasks');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Use employeeEmail prop or fall back to authenticated user's email
      const userEmail = employeeEmail || user?.email;
      if (!userEmail) {
        throw new Error('User email not available. Please ensure you are logged in.');
      }

      const result = await refineTasksFromFeedback(
        feedback,
        suggestions,
        sessionData,
        userEmail
      );
      
      if (result.success) {
        // Add feedback to history
        setFeedbackHistory(prev => [...prev, {
          feedback: feedback,
          timestamp: new Date().toISOString(),
          tasksCount: result.tasks?.length || 0
        }]);
        
        setSuggestions(result.tasks || []);
        setSessionData(result.sessionData);
        // Pre-select all refined tasks
        setSelectedTasks(new Set(result.tasks?.map(task => task.id) || []));
        setFeedback('');
        setShowFeedback(false);
      } else {
        throw new Error(result.error || 'Failed to refine task suggestions');
      }
    } catch (err) {
      console.error('Error refining task suggestions:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskToggle = (taskId) => {
    setSelectedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const handleAcceptSelected = () => {
    const selectedTaskList = suggestions.filter(task => selectedTasks.has(task.id));
    if (selectedTaskList.length > 0 && onAcceptTasks) {
      onAcceptTasks(selectedTaskList);
      // Reset state after accepting
      setSuggestions([]);
      setSelectedTasks(new Set());
      setSessionData(null);
      setFeedbackHistory([]);
      
      // Clear editing state
      setEditingTasks(new Set());
      setEditedTasks({});
      setOriginalTasks({});
    }
  };

  // Task editing handlers
  const handleEditTask = (taskId) => {
    const task = suggestions.find(t => t.id === taskId);
    if (task) {
      setEditingTasks(prev => new Set(prev).add(taskId));
      setOriginalTasks(prev => ({ ...prev, [taskId]: { ...task } }));
      setEditedTasks(prev => ({ 
        ...prev, 
        [taskId]: { 
          title: task.title,
          description: task.description,
          priority: task.priority,
          due: task.due,
          estimatedHours: task.estimatedHours || 2
        } 
      }));
    }
  };

  const handleCancelEdit = (taskId) => {
    setEditingTasks(prev => {
      const newSet = new Set(prev);
      newSet.delete(taskId);
      return newSet;
    });
    setEditedTasks(prev => {
      const newEdited = { ...prev };
      delete newEdited[taskId];
      return newEdited;
    });
  };

  const handleSaveTask = async (taskId) => {
    try {
      setSaveLoading(true);
      const editedTask = editedTasks[taskId];
      const originalTask = originalTasks[taskId];

      // Use employeeEmail prop or fall back to authenticated user's email
      const userEmail = employeeEmail || user?.email;
      
      // Call the save API (for now, this is just a placeholder)
      const saveResult = await saveModifiedTasks([{
        id: taskId,
        ...editedTask
      }], sessionData, userEmail);

      if (saveResult.success) {
        // Update the task in suggestions array
        setSuggestions(prev => prev.map(task => 
          task.id === taskId 
            ? { 
                ...task, 
                title: editedTask.title,
                description: editedTask.description,
                priority: editedTask.priority,
                due: editedTask.due,
                estimatedHours: editedTask.estimatedHours
              }
            : task
        ));

        // Remove from editing state
        setEditingTasks(prev => {
          const newSet = new Set(prev);
          newSet.delete(taskId);
          return newSet;
        });

        // Clean up edited tasks state
        setEditedTasks(prev => {
          const newEdited = { ...prev };
          delete newEdited[taskId];
          return newEdited;
        });

        // Clear any previous errors
        setError(null);
      } else {
        throw new Error(saveResult.error || 'Failed to save task');
      }

    } catch (err) {
      console.error('Error saving task:', err);
      setError('Failed to save task changes: ' + err.message);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleTaskFieldChange = (taskId, field, value) => {
    setEditedTasks(prev => ({
      ...prev,
      [taskId]: {
        ...prev[taskId],
        [field]: value
      }
    }));
  };

  const hasUnsavedChanges = editingTasks.size > 0;

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <Target className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Task Suggestions from Goals</h3>
            <p className="text-sm text-gray-500">AI-generated tasks based on your objectives</p>
          </div>
        </div>
        
        <Button
          onClick={generateSuggestions}
          disabled={loading}
          className="flex items-center gap-2"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          Generate Tasks
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span className="text-sm font-medium text-red-700">Task Generation Error</span>
          </div>
          <p className="text-sm text-red-700 mb-2">{error}</p>
          {error.includes('Employee not found') && (
            <div className="text-xs text-red-600 bg-red-100 p-2 rounded">
              <p className="font-medium mb-1">Troubleshooting:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Make sure you're logged in with a valid employee email</li>
                <li>Check that your email exists in the employee database</li>
                <li>Contact your administrator if the issue persists</li>
              </ul>
              <p className="mt-2">
                <strong>Current user email:</strong> {user?.email || 'Not available'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-gray-400" />
          <p className="text-gray-500">Generating task suggestions...</p>
        </div>
      )}

      {/* No Suggestions State */}
      {!loading && !error && suggestions.length === 0 && (
        <div className="text-center py-8">
          <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-2">No task suggestions yet</p>
          <p className="text-sm text-gray-400">Click "Generate Tasks" to create suggestions from your goals</p>
        </div>
      )}

      {/* Task Suggestions */}
      {!loading && suggestions.length > 0 && (
        <div className="space-y-4">
          {/* Feedback History */}
          {feedbackHistory.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Refinement History</h4>
              <div className="space-y-2">
                {feedbackHistory.map((item, index) => (
                  <div key={index} className="text-xs bg-gray-50 p-2 rounded border">
                    <div className="font-medium text-gray-600">
                      Feedback {index + 1}: "{item.feedback}"
                    </div>
                    <div className="text-gray-500 mt-1">
                      Generated {item.tasksCount} tasks • {new Date(item.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Task List */}
          <div className="space-y-3">
            {suggestions.map((task) => {
              const isEditing = editingTasks.has(task.id);
              const editedTask = editedTasks[task.id];
              
              return (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`border rounded-lg p-4 transition-colors ${
                    isEditing 
                      ? 'border-blue-300 bg-blue-50' 
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => handleTaskToggle(task.id)}
                      disabled={isEditing}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                        selectedTasks.has(task.id)
                          ? 'bg-green-600 border-green-600 text-white'
                          : 'border-gray-300 hover:border-green-400'
                      } ${isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {selectedTasks.has(task.id) && <Check className="w-3 h-3" />}
                    </button>
                    
                    <div className="flex-1">
                      {isEditing ? (
                        /* Editing Mode */
                        <div className="space-y-3">
                          {/* Task Title */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Task Title
                            </label>
                            <Input
                              value={editedTask?.title || ''}
                              onChange={(e) => handleTaskFieldChange(task.id, 'title', e.target.value)}
                              className="w-full"
                              placeholder="Enter task title..."
                            />
                          </div>

                          {/* Task Description */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Description
                            </label>
                            <Textarea
                              value={editedTask?.description || ''}
                              onChange={(e) => handleTaskFieldChange(task.id, 'description', e.target.value)}
                              className="w-full"
                              rows={3}
                              placeholder="Enter task description..."
                            />
                          </div>

                          {/* Priority and Hours Row */}
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Priority
                              </label>
                              <Select
                                value={editedTask?.priority || 'medium'}
                                onValueChange={(value) => handleTaskFieldChange(task.id, 'priority', value)}
                              >
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                              </Select>
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Hours
                              </label>
                              <Input
                                type="number"
                                min="0.5"
                                max="40"
                                step="0.5"
                                value={editedTask?.estimatedHours || 2}
                                onChange={(e) => handleTaskFieldChange(task.id, 'estimatedHours', parseFloat(e.target.value) || 2)}
                                className="w-full"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Due Date
                              </label>
                              <Input
                                type="date"
                                value={editedTask?.due || ''}
                                onChange={(e) => handleTaskFieldChange(task.id, 'due', e.target.value)}
                                className="w-full"
                              />
                            </div>
                          </div>

                          {/* Goal Alignment Display */}
                          {task.goalAlignment && (
                            <div className="text-xs text-gray-600 bg-blue-100 p-2 rounded">
                              <strong>Goal:</strong> {task.goalAlignment}
                            </div>
                          )}

                          {/* Edit Action Buttons */}
                          <div className="flex items-center justify-end gap-2 pt-2 border-t border-blue-200">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCancelEdit(task.id)}
                              className="flex items-center gap-1"
                            >
                              <X className="w-3 h-3" />
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleSaveTask(task.id)}
                              disabled={saveLoading}
                              className="flex items-center gap-1"
                            >
                              {saveLoading ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Save className="w-3 h-3" />
                              )}
                              Save Changes
                            </Button>
                          </div>
                        </div>
                      ) : (
                        /* Display Mode */
                        <div>
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-medium text-gray-900">{task.title}</h4>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditTask(task.id)}
                                className="h-6 px-2 text-gray-500 hover:text-gray-700"
                              >
                                <Edit3 className="w-3 h-3" />
                              </Button>
                              <Badge className={getPriorityColor(task.priority)}>
                                {task.priority}
                              </Badge>
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <Clock className="w-3 h-3" />
                                {task.estimatedHours}h
                              </div>
                            </div>
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                          
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>Due: {task.due}</span>
                            {task.goalAlignment && (
                              <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded">
                                Goal: {task.goalAlignment}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-gray-200">
            {/* Unsaved Changes Warning */}
            {hasUnsavedChanges && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-medium text-amber-700">Unsaved Changes</span>
                </div>
                <p className="text-sm text-amber-700">
                  You have {editingTasks.size} task(s) with unsaved changes. Please save or cancel your edits before continuing.
                </p>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowFeedback(!showFeedback)}
                  disabled={hasUnsavedChanges}
                  className="flex items-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  Provide Feedback
                </Button>
                
                <span className="text-sm text-gray-500">
                  {selectedTasks.size} of {suggestions.length} selected
                </span>
              </div>
              
              <Button
                onClick={handleAcceptSelected}
                disabled={selectedTasks.size === 0 || hasUnsavedChanges}
                className="flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Accept Selected ({selectedTasks.size})
              </Button>
            </div>
          </div>

          {/* Feedback Input */}
          <AnimatePresence>
            {showFeedback && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="border-t border-gray-200 pt-4"
              >
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      How would you like to adjust these tasks?
                    </label>
                    <Textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="e.g., 'Make tasks more specific', 'Add more technical tasks', 'Reduce the timeline', etc."
                      className="w-full"
                      rows={3}
                    />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={refineSuggestions}
                      disabled={!feedback.trim() || loading}
                      className="flex items-center gap-2"
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      Refine Tasks
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowFeedback(false);
                        setFeedback('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default TaskSuggestionsWidget;
