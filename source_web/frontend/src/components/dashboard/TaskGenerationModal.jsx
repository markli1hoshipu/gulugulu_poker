import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building2,
  Target,
  Users,
  MessageSquare,
  Building,
  Calendar,
  Flag,
  RefreshCw,
  Check,
  Plus,
  Edit3,
  Save,
  Loader2
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectItem } from '../ui/select';
import { generateTasksFromClients, generateTasksFromMeetings, generateTasksFromGoals, refineTasksFromFeedback, refineClientTasksFromFeedback, saveModifiedTasks, saveTasksToDatabase, saveClientTasksToDatabase } from '../../services/taskGenerationApi';
import { useAuth } from '../../auth/hooks/useAuth';
import CommunicationTipsModal from './CommunicationTipsModal';
import TaskEmailModal from './TaskEmailModal';

const TaskGenerationModal = ({ isOpen, onClose, onAcceptTasks, generationType }) => {
  const { user, idToken } = useAuth();
  const [suggestedTasks, setSuggestedTasks] = useState([]);
  const [selectedTasks, setSelectedTasks] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sessionData, setSessionData] = useState(null);
  const [sourceType, setSourceType] = useState('both'); // 'crm', 'leads', 'both'
  const [feedback, setFeedback] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackHistory, setFeedbackHistory] = useState([]);
  const [creatingEmployee, setCreatingEmployee] = useState(false);
  
  // Task editing state (for goals type)
  const [editingTasks, setEditingTasks] = useState(new Set());
  const [editedTasks, setEditedTasks] = useState({});
  const [originalTasks, setOriginalTasks] = useState({});
  const [saveLoading, setSaveLoading] = useState(false);

  // Task saving state
  const [savingTasks, setSavingTasks] = useState(false);
  const [saveResults, setSaveResults] = useState(null);

  // Individual task feedback state
  const [taskFeedbackMode, setTaskFeedbackMode] = useState(new Set()); // Which tasks are in feedback mode

  // Communication Tips state
  const [showCommunicationTips, setShowCommunicationTips] = useState(false);

  // Email editing state
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [selectedEmailTask, setSelectedEmailTask] = useState(null);
  const [taskFeedbacks, setTaskFeedbacks] = useState({}); // Feedback text for each task
  const [refiningTasks, setRefiningTasks] = useState(new Set()); // Which tasks are being refined

  useEffect(() => {
    if (isOpen && generationType) {
      generateTasks();
    } else if (!isOpen) {
      // Clear state when modal closes
      setSaveResults(null);
      setError(null);
    }
  }, [isOpen, generationType]);

  const generateTasks = async () => {
    setLoading(true);
    setError(null);
    setSuggestedTasks([]);
    setSelectedTasks(new Set());

    // Clear editing state
    setEditingTasks(new Set());
    setEditedTasks({});
    setOriginalTasks({});

    // Clear individual feedback state
    setTaskFeedbackMode(new Set());
    setTaskFeedbacks({});
    setRefiningTasks(new Set());

    // Clear save results from previous operations
    setSaveResults(null);

    try {
      let result;
      switch (generationType) {
        case 'clients':
          if (!user?.email) {
            throw new Error('User email not available. Please ensure you are logged in.');
          }
          result = await generateTasksFromClients(user.email, sourceType);
          break;
        case 'meetings':
          result = await generateTasksFromMeetings();
          break;
        case 'goals':
          if (!user?.email) {
            throw new Error('User email not available. Please ensure you are logged in.');
          }
          result = await generateTasksFromGoals(user.email);
          break;
        default:
          throw new Error('Invalid generation type');
      }

      if (result.success) {
        setSuggestedTasks(result.tasks || []);
        setSessionData(result.sessionData || null);
        // Pre-select all tasks by default
        setSelectedTasks(new Set(result.tasks?.map(task => task.id) || []));
      } else {
        throw new Error(result.error || 'Failed to generate tasks');
      }
    } catch (err) {
      console.error('Error generating tasks:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const refineTasks = async () => {
    if (!feedback.trim()) {
      setError('Please provide feedback to refine the tasks');
      return;
    }

    if (hasUnsavedChanges || hasActiveTaskFeedback) {
      setError('Please save or cancel your current edits and task feedback before refining all tasks');
      return;
    }

    if (!sessionData) {
      setError('Session data not available for refinement');
      return;
    }

    setLoading(true);
    setError(null);
    setSaveResults(null); // Clear previous save results

    try {
      if (!user?.email) {
        throw new Error('User email not available. Please ensure you are logged in.');
      }

      // Use appropriate refinement function based on generation type
      const result = generationType === 'clients'
        ? await refineClientTasksFromFeedback(
            suggestedTasks,
            feedback,
            sessionData,
            user.email
          )
        : await refineTasksFromFeedback(
            feedback,
            suggestedTasks,
            sessionData,
            user.email
          );

      if (result.success) {
        // Add feedback to history
        setFeedbackHistory(prev => [...prev, {
          feedback: feedback,
          timestamp: new Date().toISOString(),
          tasksCount: result.tasks?.length || 0
        }]);

        setSuggestedTasks(result.tasks || []);
        setSessionData(result.sessionData);
        // Pre-select all refined tasks
        setSelectedTasks(new Set(result.tasks?.map(task => task.id) || []));
        setFeedback('');
        setShowFeedback(false);
      } else {
        throw new Error(result.error || 'Failed to refine tasks');
      }
    } catch (err) {
      console.error('Error refining tasks:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskToggle = (taskId) => {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedTasks(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedTasks.size === suggestedTasks.length) {
      setSelectedTasks(new Set());
    } else {
      setSelectedTasks(new Set(suggestedTasks.map(task => task.id)));
    }
  };

  const handleAcceptSelected = async () => {
    const tasksToAccept = suggestedTasks.filter(task => selectedTasks.has(task.id));

    // For goal-generated and client-generated tasks, save to database
    if (generationType === 'goals' || generationType === 'clients') {
      setSavingTasks(true);
      setError(null);
      setSaveResults(null);

      try {
        // Get JWT token from auth context
        if (!idToken) {
          throw new Error('Authentication token not found. Please log in again.');
        }

        // Use appropriate save function based on generation type
        const saveResult = generationType === 'goals'
          ? await saveTasksToDatabase(tasksToAccept, idToken)
          : await saveClientTasksToDatabase(tasksToAccept, idToken);

        setSaveResults(saveResult);

        if (saveResult.success) {
          // All tasks saved successfully
          onAcceptTasks(tasksToAccept); // Still call parent for UI updates
          onClose();
        } else {
          // Some or all tasks failed to save
          const errorMessage = saveResult.errors.length === tasksToAccept.length
            ? `Failed to save all ${tasksToAccept.length} tasks`
            : `Saved ${saveResult.successCount} of ${tasksToAccept.length} tasks. ${saveResult.errorCount} failed.`;
          setError(errorMessage);
        }

      } catch (error) {
        console.error('Error saving tasks to database:', error);
        setError(error.message || 'Failed to save tasks to database');
      } finally {
        setSavingTasks(false);
      }
    } else {
      // For other task types (meetings, etc.), use the original behavior
      onAcceptTasks(tasksToAccept);
      onClose();
    }
  };

  // Task editing handlers (for goals type)
  const handleEditTask = (taskId) => {
    const task = suggestedTasks.find(t => t.id === taskId);
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
      
      // Call the save API
      const saveResult = await saveModifiedTasks([{
        id: taskId,
        ...editedTask
      }], sessionData, user?.email);

      if (saveResult.success) {
        // Update the task in suggestions array
        setSuggestedTasks(prev => prev.map(task => 
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
  const hasActiveTaskFeedback = taskFeedbackMode.size > 0 || refiningTasks.size > 0;

  // Individual task feedback handlers
  const handleTaskFeedbackToggle = (taskId) => {
    setTaskFeedbackMode(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
        // Clear feedback text when closing
        setTaskFeedbacks(prevFeedbacks => {
          const newFeedbacks = { ...prevFeedbacks };
          delete newFeedbacks[taskId];
          return newFeedbacks;
        });
      } else {
        newSet.add(taskId);
        // Clear save results when starting individual task feedback
        setSaveResults(null);
      }
      return newSet;
    });
  };

  const handleTaskFeedbackChange = (taskId, feedback) => {
    setTaskFeedbacks(prev => ({
      ...prev,
      [taskId]: feedback
    }));
  };

  const handleRefineIndividualTask = async (taskId) => {
    const feedback = taskFeedbacks[taskId];
    if (!feedback || !feedback.trim()) {
      setError('Please provide feedback for this task');
      return;
    }

    const taskToRefine = suggestedTasks.find(t => t.id === taskId);
    if (!taskToRefine) {
      setError('Task not found');
      return;
    }

    setRefiningTasks(prev => new Set(prev).add(taskId));
    setError(null);
    setSaveResults(null); // Clear previous save results

    try {
      // Call the appropriate refinement API for a single task
      const result = generationType === 'clients'
        ? await refineClientTasksFromFeedback(
            [taskToRefine], // Only this specific task
            feedback,
            sessionData,
            user?.email
          )
        : await refineTasksFromFeedback(
            feedback,
            [taskToRefine], // Only this specific task
            sessionData,
            user?.email
          );

      if (result.success && result.tasks && result.tasks.length > 0) {
        console.log(`Individual refinement returned ${result.tasks.length} tasks`);

        if (result.tasks.length === 1) {
          // 1-to-1 replacement: Update the existing task
          const refinedTask = result.tasks[0];
          setSuggestedTasks(prev => prev.map(task => 
            task.id === taskId ? { ...refinedTask, id: taskId } : task
          ));

          // Add to feedback history for single task refinement
          setFeedbackHistory(prev => [...prev, {
            feedback: `Task-specific: ${feedback}`,
            timestamp: new Date().toISOString(),
            tasksCount: 1,
            taskId: taskId,
            taskTitle: taskToRefine.title
          }]);

        } else {
          // 1-to-many expansion: Replace original task with multiple new tasks
          setSuggestedTasks(prev => {
            const otherTasks = prev.filter(task => task.id !== taskId);
            const newTasks = result.tasks.map((refinedTask, index) => ({
              ...refinedTask,
              id: `${taskId}-split-${index + 1}` // Create unique IDs for split tasks
            }));
            return [...otherTasks, ...newTasks];
          });

          // Pre-select all the new split tasks (since the original was likely selected)
          if (selectedTasks.has(taskId)) {
            setSelectedTasks(prev => {
              const newSelected = new Set(prev);
              newSelected.delete(taskId); // Remove original task
              // Add all split tasks
              result.tasks.forEach((_, index) => {
                newSelected.add(`${taskId}-split-${index + 1}`);
              });
              return newSelected;
            });
          }

          // Add to feedback history for task splitting
          setFeedbackHistory(prev => [...prev, {
            feedback: `Task-specific: ${feedback}`,
            timestamp: new Date().toISOString(),
            tasksCount: result.tasks.length,
            taskId: taskId,
            taskTitle: taskToRefine.title,
            splitInto: result.tasks.length // Flag to indicate this was a split operation
          }]);
        }

        // Clear the feedback for this task (common cleanup)
        setTaskFeedbacks(prev => {
          const newFeedbacks = { ...prev };
          delete newFeedbacks[taskId];
          return newFeedbacks;
        });

        // Close feedback mode for this task (common cleanup)
        setTaskFeedbackMode(prev => {
          const newSet = new Set(prev);
          newSet.delete(taskId);
          return newSet;
        });

      } else {
        throw new Error(result.error || 'Failed to refine individual task');
      }
    } catch (err) {
      console.error('Error refining individual task:', err);
      setError(`Failed to refine task: ${err.message}`);
    } finally {
      setRefiningTasks(prev => {
        const newSet = new Set(prev);
        newSet.delete(taskId);
        return newSet;
      });
    }
  };

  const handleEmailEdit = (task) => {
    setSelectedEmailTask(task);
    setShowEmailModal(true);
  };

  const handleEmailSend = async (emailData) => {
    try {
      console.log('📧 Sending email:', emailData);

      // Here you would integrate with your email sending service
      // For now, we'll just log the email data and show a success message

      // You could integrate with:
      // 1. Your backend email service
      // 2. Gmail API
      // 3. Other email providers

      // Example integration:
      // await emailService.sendEmail(emailData);

      console.log('✅ Email sent successfully');

      // Update task status to completed if needed
      if (selectedEmailTask) {
        setSuggestedTasks(prev => prev.map(task =>
          task.id === selectedEmailTask.id
            ? { ...task, status: 'completed', emailSent: true }
            : task
        ));
      }

    } catch (error) {
      console.error('❌ Failed to send email:', error);
      throw error; // Re-throw to let the modal handle the error
    }
  };

  const isEmailTask = (task) => {
    return task.type === 'email-task' ||
           task.metadata?.task_type === 'email' ||
           task.metadata?.communication_method === 'email' ||
           task.title?.toLowerCase().includes('email');
  };

  const getGenerationTypeConfig = () => {
    switch (generationType) {
      case 'clients':
        return {
          title: 'Tasks from Client Data',
          description: 'AI-generated follow-up tasks based on your client interactions and lead status',
          icon: Building,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50'
        };
      case 'meetings':
        return {
          title: 'Tasks from Meetings',
          description: 'Action items and follow-ups generated from your recent meetings',
          icon: MessageSquare,
          color: 'text-purple-600',
          bgColor: 'bg-purple-50'
        };
      case 'goals':
        return {
          title: 'Tasks from Goals',
          description: 'Strategic tasks generated to help you achieve your business objectives',
          icon: Target,
          color: 'text-green-600',
          bgColor: 'bg-green-50'
        };
      default:
        return {
          title: 'Generate Tasks',
          description: 'AI-generated tasks',
          icon: Plus,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50'
        };
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'in-progress':
        return <Clock className="w-4 h-4 text-indigo-600" />;
      case 'overdue':
        return <AlertCircle className="w-4 h-4 text-rose-600" />;
      default:
        return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'lead-followup': return <Target className="w-4 h-4" />;
      case 'interaction-followup': return <Users className="w-4 h-4" />;
      case 'meeting-followup': return <MessageSquare className="w-4 h-4" />;
      case 'email-task': return <Mail className="w-4 h-4 text-blue-600" />;
      default: return <Building2 className="w-4 h-4" />;
    }
  };

  if (!isOpen) return null;

  const config = getGenerationTypeConfig();
  const IconComponent = config.icon;

  return (
    <AnimatePresence>
      <motion.div
        key="main-modal"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={`px-6 py-4 border-b border-slate-200 ${config.bgColor}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${config.bgColor} rounded-lg flex items-center justify-center`}>
                  <IconComponent className={`w-5 h-5 ${config.color}`} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-800">{config.title}</h2>
                  <p className="text-sm text-slate-600">{config.description}</p>

                  {/* Source Type Selection for Client Tasks */}
                  {generationType === 'clients' && (
                    <div className="flex items-center space-x-4 mt-2">
                      <span className="text-xs font-medium text-slate-500">Source:</span>
                      <div className="flex items-center space-x-3">
                        <label className="flex items-center space-x-1 cursor-pointer">
                          <input
                            type="radio"
                            name="sourceType"
                            value="both"
                            checked={sourceType === 'both'}
                            onChange={(e) => setSourceType(e.target.value)}
                            className="text-blue-600 focus:ring-blue-500 w-3 h-3"
                          />
                          <span className="text-xs text-slate-600">Both</span>
                        </label>
                        <label className="flex items-center space-x-1 cursor-pointer">
                          <input
                            type="radio"
                            name="sourceType"
                            value="crm"
                            checked={sourceType === 'crm'}
                            onChange={(e) => setSourceType(e.target.value)}
                            className="text-blue-600 focus:ring-blue-500 w-3 h-3"
                          />
                          <span className="text-xs text-slate-600">CRM</span>
                        </label>
                        <label className="flex items-center space-x-1 cursor-pointer">
                          <input
                            type="radio"
                            name="sourceType"
                            value="leads"
                            checked={sourceType === 'leads'}
                            onChange={(e) => setSourceType(e.target.value)}
                            className="text-blue-600 focus:ring-blue-500 w-3 h-3"
                          />
                          <span className="text-xs text-slate-600">Leads</span>
                        </label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={generateTasks}
                          disabled={loading}
                          className="text-xs px-2 py-1 h-6"
                        >
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Regenerate
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {generationType === 'clients' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCommunicationTips(true)}
                    className="text-blue-600 border-blue-200 hover:bg-blue-50"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Communication Tips
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={onClose} className="rounded-full w-8 h-8 p-0">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading && (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-6 h-6 text-gray-400 animate-spin mr-3" />
                <span className="text-gray-500">Generating tasks...</span>
              </div>
            )}

            {error && (
              <div className="text-center py-12">
                <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
                <p className="text-red-600 mb-4">{error}</p>
                {saveResults && saveResults.errors.length > 0 && (
                  <div className="mb-4 text-left max-w-md mx-auto">
                    <p className="text-sm text-gray-600 mb-2">Failed tasks:</p>
                    <ul className="text-sm text-red-600 space-y-1">
                      {saveResults.errors.map((error, index) => (
                        <li key={index}>• {error.originalTask.title}: {error.error}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <Button onClick={generateTasks} variant="outline">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              </div>
            )}

            {saveResults && saveResults.success && (
              <div className="text-center py-12">
                <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-3" />
                <p className="text-green-600 mb-2">Tasks saved successfully!</p>
                <p className="text-sm text-gray-500">
                  {saveResults.successCount} task{saveResults.successCount !== 1 ? 's' : ''} added to your dashboard
                </p>
              </div>
            )}

            {!loading && !error && suggestedTasks.length === 0 && (
              <div className="text-center py-12">
                <IconComponent className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 mb-2">No tasks to generate</p>
                <p className="text-sm text-gray-400">
                  {generationType === 'clients' && 'No active leads or client interactions found.'}
                  {generationType === 'meetings' && 'No recent meetings found.'}
                  {generationType === 'goals' && 'No active goals found.'}
                </p>
              </div>
            )}

            {!loading && !error && suggestedTasks.length > 0 && (
              <div className="space-y-4">
                {/* Select All Header */}
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedTasks.size === suggestedTasks.length}
                      onCheckedChange={handleSelectAll}
                    />
                    <span className="font-medium text-slate-700">
                      Select All ({suggestedTasks.length} tasks)
                    </span>
                  </div>
                  <span className="text-sm text-slate-500">
                    {selectedTasks.size} of {suggestedTasks.length} selected
                  </span>
                </div>

                {/* Task List */}
                <div className="space-y-3">
                  {suggestedTasks.map((task, index) => {
                    const isEditing = editingTasks.has(task.id);
                    const editedTask = editedTasks[task.id];
                    const isGoalType = generationType === 'goals';
                    const isClientType = generationType === 'clients';
                    const supportsEditing = isGoalType || isClientType;

                    return (
                      <motion.div
                        key={task.id || `task-${index}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`p-4 border rounded-lg transition-all ${
                          isEditing 
                            ? 'border-blue-300 bg-blue-50/50' 
                            : selectedTasks.has(task.id)
                              ? 'border-blue-200 bg-blue-50/50'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={selectedTasks.has(task.id)}
                            onCheckedChange={() => handleTaskToggle(task.id)}
                            disabled={isEditing}
                            className={`mt-1 ${isEditing ? 'opacity-50' : ''}`}
                          />
                          
                          <div className="flex-1 min-w-0">
                            {isEditing && supportsEditing ? (
                              /* Editing Mode for Goals */
                              <div className="space-y-4">
                                {/* Task Title */}
                                <div>
                                  <label className="block text-xs font-medium text-slate-700 mb-1">
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
                                  <label className="block text-xs font-medium text-slate-700 mb-1">
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

                                {/* Priority, Hours, and Due Date */}
                                <div className="grid grid-cols-3 gap-3">
                                  <div>
                                    <label className="block text-xs font-medium text-slate-700 mb-1">
                                      Priority
                                    </label>
                                    <Select
                                      value={editedTask?.priority || 'medium'}
                                      onValueChange={(value) => handleTaskFieldChange(task.id, 'priority', value)}
                                      className="w-full"
                                    >
                                      <SelectItem value="low">Low</SelectItem>
                                      <SelectItem value="medium">Medium</SelectItem>
                                      <SelectItem value="high">High</SelectItem>
                                    </Select>
                                  </div>

                                  <div>
                                    <label className="block text-xs font-medium text-slate-700 mb-1">
                                      Estimated Hours
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
                                    <label className="block text-xs font-medium text-slate-700 mb-1">
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
                                  <div className="text-xs text-slate-600 bg-green-50 border border-green-200 p-3 rounded-lg">
                                    <div className="flex items-center gap-2">
                                      <Target className="w-4 h-4 text-green-600" />
                                      <strong>Goal Alignment:</strong> {task.goalAlignment}
                                    </div>
                                  </div>
                                )}

                                {/* Edit Action Buttons */}
                                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
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
                                    className="flex items-center gap-1 bg-green-600 hover:bg-green-700"
                                  >
                                    {saveLoading ? (
                                      <RefreshCw className="w-3 h-3 animate-spin" />
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
                                <div className="flex items-start justify-between mb-2 gap-3">
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    {getTypeIcon(task.type)}
                                    <h4 className="font-medium text-slate-800 truncate">{task.title}</h4>
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    {supportsEditing && (
                                      <>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleTaskFeedbackToggle(task.id)}
                                          className={`h-6 px-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 ${
                                            taskFeedbackMode.has(task.id) ? 'bg-blue-100 text-blue-700' : ''
                                          }`}
                                          title="Refine this task with AI feedback"
                                        >
                                          <MessageSquare className="w-3 h-3" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleEditTask(task.id)}
                                          className="h-6 px-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                                          title="Edit task manually"
                                        >
                                          <Edit3 className="w-3 h-3" />
                                        </Button>
                                        {isEmailTask(task) && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleEmailEdit(task)}
                                            className="h-6 px-2 text-blue-500 hover:text-blue-700 hover:bg-blue-100"
                                            title="Edit email content"
                                          >
                                            <Mail className="w-3 h-3" />
                                          </Button>
                                        )}
                                      </>
                                    )}
                                    <Badge className={getPriorityColor(task.priority)} variant="outline">
                                      <Flag className="w-3 h-3 mr-1" />
                                      {task.priority}
                                    </Badge>
                                    {getStatusIcon(task.status)}
                                  </div>
                                </div>
                                
                                {task.description && (
                                  <p className="text-sm text-slate-600 mb-2">{task.description}</p>
                                )}
                                
                                <div className="flex items-center gap-4 text-xs text-slate-500">
                                  {task.due && (
                                    <div className="flex items-center gap-1">
                                      <Calendar className="w-3 h-3" />
                                      <span>Due: {task.due}</span>
                                    </div>
                                  )}
                                  {task.estimatedHours && supportsEditing && (
                                    <div className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      <span>{task.estimatedHours}h</span>
                                    </div>
                                  )}
                                  {task.assignedTo && (
                                    <div className="flex items-center gap-1">
                                      <Users className="w-3 h-3" />
                                      <span>{task.assignedTo}</span>
                                    </div>
                                  )}
                                  {task.source && (
                                    <Badge variant="outline" className="text-xs">
                                      {task.source}
                                    </Badge>
                                  )}
                                  {task.goalAlignment && isGoalType && (
                                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                      <Target className="w-3 h-3 mr-1" />
                                      Goal-aligned
                                    </Badge>
                                  )}
                                  {task.clientAlignment && isClientType && (
                                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                      <Building2 className="w-3 h-3 mr-1" />
                                      Client-focused
                                    </Badge>
                                  )}
                                </div>

                                {/* Individual Task Feedback Interface */}
                                {taskFeedbackMode.has(task.id) && isGoalType && (
                                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                    <div className="flex items-center gap-2 mb-2">
                                      <MessageSquare className="w-4 h-4 text-blue-600" />
                                      <span className="text-sm font-medium text-blue-700">Refine This Task</span>
                                    </div>
                                    <div className="space-y-2">
                                      <Textarea
                                        value={taskFeedbacks[task.id] || ''}
                                        onChange={(e) => handleTaskFeedbackChange(task.id, e.target.value)}
                                        placeholder={`How would you like to improve "${task.title}"? Examples: "Make this more specific", "Add technical details", "Split into 3 subtasks", "Include timeline"`}
                                        className="w-full text-sm"
                                        rows={2}
                                      />
                                      <div className="flex items-center gap-2">
                                        <Button
                                          size="sm"
                                          onClick={() => handleRefineIndividualTask(task.id)}
                                          disabled={!taskFeedbacks[task.id]?.trim() || refiningTasks.has(task.id)}
                                          className="bg-blue-600 hover:bg-blue-700 text-white"
                                        >
                                          {refiningTasks.has(task.id) ? (
                                            <>
                                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                              Refining...
                                            </>
                                          ) : (
                                            <>
                                              <RefreshCw className="w-3 h-3 mr-1" />
                                              Refine Task
                                            </>
                                          )}
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleTaskFeedbackToggle(task.id)}
                                        >
                                          <X className="w-3 h-3 mr-1" />
                                          Cancel
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Feedback Section - Only for non-goals types */}
          {!loading && !error && suggestedTasks.length > 0 && generationType !== 'goals' && (
            <div className="px-6 py-4 border-t border-slate-200">
              {/* Feedback History */}
              {feedbackHistory.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-slate-700 mb-2">Refinement History</h4>
                  <div className="space-y-2">
                    {feedbackHistory.map((item, index) => (
                      <div key={index} className={`text-xs p-2 rounded border ${
                        item.taskId ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <div className="font-medium text-slate-600">
                          {item.taskId ? (
                            <>
                              <MessageSquare className="w-3 h-3 inline mr-1" />
                              Task "{item.taskTitle}": "{item.feedback.replace('Task-specific: ', '')}"
                            </>
                          ) : (
                            <>
                              Feedback {index + 1}: "{item.feedback}"
                            </>
                          )}
                        </div>
                        <div className="text-slate-500 mt-1">
                          {item.taskId ? (
                            item.splitInto ? 
                              `Task split into ${item.splitInto} subtasks` : 
                              'Individual task refined'
                          ) : (
                            `Generated ${item.tasksCount} tasks`
                          )} • {new Date(item.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Feedback Toggle */}
              <div className="flex items-center justify-between mb-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowFeedback(!showFeedback);
                    if (!showFeedback) {
                      // Clear save results when starting to provide feedback
                      setSaveResults(null);
                    }
                  }}
                  className="flex items-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  {showFeedback ? 'Hide Feedback' : 'Provide Feedback'}
                </Button>

                {sessionData && (
                  <span className="text-xs text-slate-500">
                    Session: {sessionData.sessionId?.slice(-8)}
                  </span>
                )}
              </div>

              {/* Feedback Input */}
              <AnimatePresence>
                {showFeedback && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3"
                  >
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        How would you like to adjust these tasks?
                      </label>
                      <textarea
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        placeholder="e.g., 'Make tasks more specific', 'Add more technical tasks', 'Reduce the timeline', etc."
                        className="w-full p-3 border border-slate-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={3}
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        onClick={refineTasks}
                        disabled={!feedback.trim() || loading || hasUnsavedChanges || hasActiveTaskFeedback}
                        className="flex items-center gap-2"
                      >
                        {loading ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
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
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Footer */}
          {!loading && !error && suggestedTasks.length > 0 && (
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
              {/* Unsaved Changes Warning */}
              {(hasUnsavedChanges || hasActiveTaskFeedback) && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <span className="text-sm font-medium text-amber-700">Active Changes</span>
                  </div>
                  <p className="text-sm text-amber-700">
                    {hasUnsavedChanges && `You have ${editingTasks.size} task(s) with unsaved edits. `}
                    {hasActiveTaskFeedback && `You have ${taskFeedbackMode.size} task(s) in feedback mode. `}
                    Please complete or cancel your changes before continuing.
                  </p>
                </div>
              )}

              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">
                  {selectedTasks.size} task{selectedTasks.size !== 1 ? 's' : ''} selected
                </span>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAcceptSelected}
                    disabled={selectedTasks.size === 0 || hasUnsavedChanges || hasActiveTaskFeedback || savingTasks}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {savingTasks ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving Tasks...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Accept Selected ({selectedTasks.size})
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* Communication Tips Modal */}
      <CommunicationTipsModal
        key="communication-tips-modal"
        isOpen={showCommunicationTips}
        onClose={() => setShowCommunicationTips(false)}
        user={user}
        context={`Task generation context for ${generationType}`}
      />

      {/* Task Email Modal */}
      <TaskEmailModal
        key="task-email-modal"
        isOpen={showEmailModal}
        onClose={() => {
          setShowEmailModal(false);
          setSelectedEmailTask(null);
        }}
        task={selectedEmailTask}
        onSend={handleEmailSend}
      />
    </AnimatePresence>
  );
};

export default TaskGenerationModal;
