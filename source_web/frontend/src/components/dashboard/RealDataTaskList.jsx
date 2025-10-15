import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../auth/hooks/useAuth';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  RefreshCw,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Circle,
  Plus,
  Target,
  Users,
  Sparkles,
  MessageSquare,
  Building,
  X,
  Square,
  CheckSquare,
  Loader2,
  Pause
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import { getDashboardTasks } from '../../services/dashboardDataApi';
import { convertSuggestedTasksToActual, updateTaskStatus, updateMultipleTasksStatus, deleteMultipleTasks } from '../../services/taskGenerationApi';
import TaskStatusSelector from './TaskStatusSelector';
import BulkTaskActions from './BulkTaskActions';
import TaskMessagePopup from './TaskMessagePopup';
import TaskGenerationModal from './TaskGenerationModal';
import TaskDetailModal from './TaskDetailModal';

const statusConfig = {
  'not-started': {
    icon: Circle,
    color: 'text-slate-400',
    bgColor: 'bg-slate-50 border-slate-200',
    label: 'Not Started'
  },
  'pending': {
    icon: Circle,
    color: 'text-slate-400',
    bgColor: 'bg-slate-50 border-slate-200',
    label: 'Not Started'
  },
  'in-progress': {
    icon: Clock,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50 border-indigo-200',
    label: 'In Progress'
  },
  overdue: {
    icon: AlertCircle,
    color: 'text-rose-600',
    bgColor: 'bg-rose-50 border-rose-200',
    label: 'Overdue'
  },
  completed: {
    icon: CheckCircle2,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 border-emerald-200',
    label: 'Completed'
  }
};

const TASKS_PER_PAGE = 5;

const RealDataTaskList = () => {
  const { idToken, isAuthenticated } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [dateFilter, setDateFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddTask, setShowAddTask] = useState(false);
  const [addTaskForm, setAddTaskForm] = useState({
    title: '',
    description: '',
    status: 'not-started', // Use the actual database status
    priority: 'medium',
    dueDate: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [showGenerateMenu, setShowGenerateMenu] = useState(false);
  const [showTaskGeneration, setShowTaskGeneration] = useState(false);
  const [generationType, setGenerationType] = useState(null);

  // Task selection and bulk operations state
  const [selectedTasks, setSelectedTasks] = useState(new Set());
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusUpdateError, setStatusUpdateError] = useState(null);
  const [statusUpdateSuccess, setStatusUpdateSuccess] = useState(null);

  // Popup message state
  const [popupMessage, setPopupMessage] = useState(null);

  // Task detail modal state
  const [showTaskDetail, setShowTaskDetail] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  // Helper function to show popup messages
  const showPopupMessage = (type, title, message) => {
    setPopupMessage({ type, title, message, isOpen: true });
  };

  const closePopupMessage = () => {
    setPopupMessage(null);
  };

  // Task detail modal handlers
  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setShowTaskDetail(true);
  };

  const handleTaskDetailClose = () => {
    setShowTaskDetail(false);
    setSelectedTask(null);
  };

  const handleTaskUpdate = (updatedTask) => {
    // Update the task in the local state
    setTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === updatedTask.id ? updatedTask : task
      )
    );
  };

  const handleTaskDelete = (taskId) => {
    // Remove the task from local state
    setTasks(prevTasks =>
      prevTasks.filter(task => task.id !== taskId)
    );
    // Clear selection if the deleted task was selected
    setSelectedTasks(prev => {
      const newSet = new Set(prev);
      newSet.delete(taskId);
      return newSet;
    });
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);

    // Check if user is authenticated
    if (!isAuthenticated || !idToken) {
      setError('Please log in to view tasks');
      setLoading(false);
      return;
    }

    try {
      // Call dashboard service API with authentication
      const response = await fetch('http://localhost:8004/api/tasks', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load tasks');
      }

      const tasks = await response.json();
      
      // Transform API response to match existing task format
      const transformedTasks = tasks.map(task => ({
        id: task.task_id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        source: task.source,
        due: task.due_date,
        type: 'dashboard',
        createdAt: task.created_at,
        isOverdue: task.is_overdue,
        daysUntilDue: task.days_until_due
      }));

      setTasks(transformedTasks);

    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [dateFilter, statusFilter, filter]);

  const handleDateFilterChange = (value) => {
    setDateFilter(value);
  };

  const handleStatusFilterChange = (value) => {
    setStatusFilter(value);
  };


  const handleInlineAddTask = async (e) => {
    e.preventDefault();

    // Validation
    const newErrors = {};
    if (!addTaskForm.title.trim()) {
      newErrors.title = 'Title is required';
    }
    if (!addTaskForm.dueDate) {
      newErrors.dueDate = 'Due date is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setFormErrors(newErrors);
      return;
    }

    // Check if user is authenticated
    if (!isAuthenticated || !idToken) {
      setError('Please log in to create tasks');
      return;
    }

    try {
      // Create task via API
      const requestBody = {
        title: addTaskForm.title.trim(),
        description: addTaskForm.description.trim() || null,
        status: addTaskForm.status,
        priority: addTaskForm.priority,
        due_date: addTaskForm.dueDate,
        source: 'Manual' // Must match TaskSource.MANUAL exactly
      };

      console.log('Creating task with data:', requestBody);
      console.log('Using token:', idToken ? 'Token present' : 'No token');

      const response = await fetch('http://localhost:8004/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        let errorMessage = 'Failed to create task';
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || JSON.stringify(errorData);
        } catch (e) {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const createdTask = await response.json();

      // Transform API response to match existing task format
      const newTask = {
        id: createdTask.task_id,
        title: createdTask.title,
        description: createdTask.description,
        status: createdTask.status,
        priority: createdTask.priority,
        source: createdTask.source,
        due: createdTask.due_date,
        type: 'dashboard',
        createdAt: createdTask.created_at,
        isOverdue: createdTask.is_overdue,
        daysUntilDue: createdTask.days_until_due
      };

      // Add to local state
      setTasks([...tasks, newTask]);

      // Reset form
      setAddTaskForm({
        title: '',
        description: '',
        status: 'not-started',
        priority: 'medium',
        dueDate: ''
      });
      setFormErrors({});
      setShowAddTask(false);

    } catch (error) {
      console.error('Error creating task:', error);
      setError(`Failed to create task: ${error.message}`);
    }
  };

  const handleFormChange = (field, value) => {
    setAddTaskForm(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleCancelAddTask = () => {
    setAddTaskForm({
      title: '',
      description: '',
      status: 'not-started',
      priority: 'medium',
      dueDate: ''
    });
    setFormErrors({});
    setShowAddTask(false);
  };

  const handleTaskStatusChange = async (taskId, newStatus) => {
    if (!idToken) {
      showPopupMessage('error', 'Authentication Required', 'Please log in to update task status.');
      return;
    }

    setIsUpdatingStatus(true);

    try {
      const result = await updateTaskStatus(taskId, newStatus, idToken);

      if (result.success) {
        // Update local state with the updated task
        const updatedTasks = tasks.map(task =>
          task.id === taskId ? { ...task, status: newStatus } : task
        );
        setTasks(updatedTasks);
        showPopupMessage('success', 'Task Updated', `Task status changed to ${newStatus}.`);
      } else {
        showPopupMessage('error', 'Update Failed', result.error || 'Failed to update task status.');
      }
    } catch (error) {
      console.error('Error updating task status:', error);
      showPopupMessage('error', 'Update Failed', 'An unexpected error occurred while updating the task.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Task selection handlers
  const handleTaskSelect = (taskId) => {
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

  const handleSelectAll = () => {
    const allTaskIds = filteredTasks.map(task => task.id);
    setSelectedTasks(new Set(allTaskIds));
  };

  const handleDeselectAll = () => {
    setSelectedTasks(new Set());
  };

  // Bulk operations handlers
  const handleBulkStatusUpdate = async (taskIds, newStatus) => {
    if (!idToken) {
      showPopupMessage('error', 'Authentication Required', 'Please log in to update task statuses.');
      return;
    }

    setIsUpdatingStatus(true);

    try {
      const result = await updateMultipleTasksStatus(taskIds, newStatus, idToken);

      if (result.success) {
        // Update local state for all successfully updated tasks
        const updatedTasks = tasks.map(task =>
          taskIds.includes(task.id) ? { ...task, status: newStatus } : task
        );
        setTasks(updatedTasks);
        setSelectedTasks(new Set()); // Clear selection after successful update

        // Show success message
        const successMsg = `Successfully updated ${result.successCount} task${result.successCount > 1 ? 's' : ''} to ${newStatus}.`;
        showPopupMessage('success', 'Tasks Updated', successMsg);
      } else {
        const errorMsg = result.errors.length > 0
          ? `Failed to update ${result.errorCount} of ${result.totalTasks} tasks. Some tasks may have been updated successfully.`
          : 'Failed to update task statuses.';
        showPopupMessage('error', 'Update Failed', errorMsg);
      }
    } catch (error) {
      console.error('Error updating multiple task statuses:', error);
      showPopupMessage('error', 'Update Failed', 'An unexpected error occurred while updating tasks.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleBulkDelete = async (taskIds) => {
    if (!idToken) {
      showPopupMessage('error', 'Authentication Required', 'Please log in to delete tasks.');
      return;
    }

    // Confirm deletion
    const confirmed = window.confirm(
      `Are you sure you want to delete ${taskIds.length} task${taskIds.length > 1 ? 's' : ''}? This action cannot be undone.`
    );

    if (!confirmed) return;

    setIsUpdatingStatus(true);

    try {
      const result = await deleteMultipleTasks(taskIds, idToken);

      if (result.success) {
        // Remove deleted tasks from local state
        const updatedTasks = tasks.filter(task => !taskIds.includes(task.id));
        setTasks(updatedTasks);
        setSelectedTasks(new Set()); // Clear selection after successful delete

        // Show success message
        const successMsg = `Successfully deleted ${result.successCount} task${result.successCount > 1 ? 's' : ''}.`;
        showPopupMessage('success', 'Tasks Deleted', successMsg);
      } else {
        const errorMsg = result.errors.length > 0
          ? `Failed to delete ${result.errorCount} of ${result.totalTasks} tasks. Some tasks may have been deleted successfully.`
          : 'Failed to delete tasks.';
        showPopupMessage('error', 'Delete Failed', errorMsg);
      }
    } catch (error) {
      console.error('Error deleting multiple tasks:', error);
      showPopupMessage('error', 'Delete Failed', 'An unexpected error occurred while deleting tasks.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleGenerateTaskFromMeeting = () => {
    setGenerationType('meetings');
    setShowTaskGeneration(true);
    setShowGenerateMenu(false);
  };

  const handleGenerateTaskFromGoal = () => {
    setGenerationType('goals');
    setShowTaskGeneration(true);
    setShowGenerateMenu(false);
  };

  const handleGenerateTaskFromClients = () => {
    setGenerationType('clients');
    setShowTaskGeneration(true);
    setShowGenerateMenu(false);
  };

  const handleAcceptGeneratedTasks = (suggestedTasks) => {
    // Convert suggested tasks to actual tasks and add them to the list
    const actualTasks = convertSuggestedTasksToActual(suggestedTasks);
    setTasks(prevTasks => [...prevTasks, ...actualTasks]);
    setShowTaskGeneration(false);
    setGenerationType(null);
  };

  const filteredTasks = tasks.filter(task => {
    // Apply main filter
    if (filter === 'all') {
      // Apply secondary filters only when main filter is 'all'
      let passed = true;

      if (statusFilter !== 'all') {
        passed = passed && (task.status === statusFilter ||
          (statusFilter === 'overdue' && new Date(task.due) < new Date()));
      }

      if (dateFilter !== 'all') {
        if (dateFilter === 'today') {
          const today = new Date().toISOString().split('T')[0];
          passed = passed && task.due === today;
        } else if (dateFilter === 'tomorrow') {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          passed = passed && task.due === tomorrow.toISOString().split('T')[0];
        } else if (dateFilter === 'overdue') {
          passed = passed && new Date(task.due) < new Date();
        }
      }

      return passed;
    }

    // Legacy filter logic for compatibility
    if (filter === 'overdue') return new Date(task.due) < new Date();
    if (filter === 'today') {
      const today = new Date().toISOString().split('T')[0];
      return task.due === today;
    }
    return task.status === filter;
  });


  const getSourceBadgeProps = (source) => {
    switch (source) {
      case 'Goal':
        return {
          className: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: Target
        };
      case 'Meeting':
        return {
          className: 'bg-purple-100 text-purple-800 border-purple-200',
          icon: Users
        };
      case 'Manual':
      default:
        return {
          className: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: null
        };
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




  // Pagination
  const totalPages = Math.ceil(filteredTasks.length / TASKS_PER_PAGE);
  const startIndex = (currentPage - 1) * TASKS_PER_PAGE;
  const paginatedTasks = filteredTasks.slice(startIndex, startIndex + TASKS_PER_PAGE);

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  };

  if (loading) {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6 hover:shadow-md transition-shadow shadow-[0px_20px_92px_0px_rgba(0,0,0,0.03)] h-[650px] flex items-center justify-center">
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 text-gray-400 animate-spin mr-2" />
            <span className="text-gray-500">Loading tasks...</span>
          </div>
        </div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6 hover:shadow-md transition-shadow shadow-[0px_20px_92px_0px_rgba(0,0,0,0.03)] h-[650px] flex items-center justify-center">
          <div className="text-center py-8">
            <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
            <p className="text-red-600 mb-4">Failed to load tasks</p>
            <button
              onClick={loadData}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col transition-shadow shadow-[0px_20px_92px_0px_rgba(0,0,0,0.03)] h-[750px]">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-slate-800">Action Items</h3>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Button
                onClick={() => setShowGenerateMenu(!showGenerateMenu)}
                size="sm"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Task
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>

              {showGenerateMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-md border border-slate-200 shadow-lg z-50">
                  <div className="py-1">
                    <button
                      onClick={handleGenerateTaskFromMeeting}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                    >
                      <MessageSquare className="w-4 h-4" />
                      From Meeting
                    </button>
                    <button
                      onClick={handleGenerateTaskFromGoal}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                    >
                      <Target className="w-4 h-4" />
                      From Goal
                    </button>
                    <button
                      onClick={handleGenerateTaskFromClients}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                    >
                      <Building className="w-4 h-4" />
                      From Clients
                    </button>
                  </div>
                </div>
              )}
            </div>

            <Button
              onClick={() => setShowAddTask(true)}
              size="sm"
              className="bg-slate-600 hover:bg-slate-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Task
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Filter className="w-4 h-4" />
              <span>Filter by:</span>
            </div>

            <Select value={dateFilter} onValueChange={handleDateFilterChange} className="w-32" size="sm">
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="tomorrow">Tomorrow</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </Select>

            <Select value={statusFilter} onValueChange={handleStatusFilterChange} className="w-36" size="sm">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="not-started">Not Started</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </Select>
          </div>
        </div>


        {/* In-place Add Task Form */}
        {showAddTask && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-lg"
          >
            <form onSubmit={handleInlineAddTask} className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-slate-800">Create New Task</h4>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelAddTask}
                  className="text-slate-500 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Title */}
              <div>
                <Label htmlFor="task-title" className="text-sm font-medium text-slate-700 mb-1 block">
                  Title *
                </Label>
                <Input
                  id="task-title"
                  value={addTaskForm.title}
                  onChange={(e) => handleFormChange('title', e.target.value)}
                  placeholder="Enter task title..."
                  className={`bg-white border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 ${formErrors.title ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : ''}`}
                  required
                />
                {formErrors.title && (
                  <p className="text-red-600 text-sm mt-1">{formErrors.title}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="task-description" className="text-sm font-medium text-slate-700 mb-1 block">
                  Description
                </Label>
                <Textarea
                  id="task-description"
                  value={addTaskForm.description}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                  placeholder="Enter task description..."
                  rows={2}
                  className="resize-none bg-white  border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                />
              </div>

              {/* Status and Priority Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="task-status" className="text-sm font-medium text-slate-700 mb-1 block">
                    Status
                  </Label>
                  <Select value={addTaskForm.status} onValueChange={(value) => handleFormChange('status', value)} className="border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-200">
                    <SelectItem value="not-started">Not Started</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="task-priority" className="text-sm font-medium text-slate-700 mb-1 block">
                    Priority
                  </Label>
                  <Select value={addTaskForm.priority} onValueChange={(value) => handleFormChange('priority', value)} className="border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-200">
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </Select>
                </div>
              </div>

              {/* Due Date */}
              <div>
                <Label htmlFor="task-due-date" className="text-sm font-medium text-slate-700 mb-1 block">
                  Due Date *
                </Label>
                <Input
                  id="task-due-date"
                  type="date"
                  value={addTaskForm.dueDate}
                  onChange={(e) => handleFormChange('dueDate', e.target.value)}
                  className={`bg-white border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 ${formErrors.dueDate ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : ''}`}
                  required
                />
                {formErrors.dueDate && (
                  <p className="text-red-600 text-sm mt-1">{formErrors.dueDate}</p>
                )}
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelAddTask}
                  size="sm"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!addTaskForm.title.trim() || !addTaskForm.dueDate}
                  className="bg-slate-600 hover:bg-slate-700 text-white"
                  size="sm"
                >
                  Create Task
                </Button>
              </div>
            </form>
          </motion.div>
        )}



        {/* Bulk Task Actions */}
        {filteredTasks.length > 0 && (
          <div className="mb-4">
            <BulkTaskActions
              selectedTasks={selectedTasks}
              onSelectAll={handleSelectAll}
              onDeselectAll={handleDeselectAll}
              onBulkStatusUpdate={handleBulkStatusUpdate}
              onBulkDelete={handleBulkDelete}
              totalTasks={filteredTasks.length}
              isAllSelected={selectedTasks.size === filteredTasks.length}
              disabled={isUpdatingStatus}
            />
          </div>
        )}

        {/* Tasks List - Scrollable Area */}
        <div className="flex-1 overflow-y-auto">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Circle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No tasks found</p>
              <p className="text-sm">Add a new task to get started</p>
            </div>
          ) : (
            <div className="space-y-3 mb-6">
            {paginatedTasks.map((task) => {
              const statusInfo = statusConfig[task.status] || statusConfig['not-started'];
              const StatusIcon = statusInfo.icon;

              const isSelected = selectedTasks.has(task.id);

              return (
                <div key={task.id} className={`flex items-center gap-3 p-4 rounded-lg transition-colors border ${
                  isSelected
                    ? 'bg-blue-50 border-blue-200'
                    : 'border-transparent hover:border-slate-200/50 hover:bg-slate-50/50'
                }`}>
                  {/* Selection Checkbox */}
                  <button
                    onClick={() => handleTaskSelect(task.id)}
                    className="flex items-center justify-center w-5 h-5 rounded border-2 border-slate-300 hover:border-blue-500 transition-colors"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-blue-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                  </button>

                  {/* Task Status Selector - Always use actual database status */}
                  <TaskStatusSelector
                    currentStatus={task.status}
                    taskId={task.id}
                    onStatusChange={handleTaskStatusChange}
                    disabled={isUpdatingStatus}
                    size="sm"
                    variant="simple"
                  />

                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => handleTaskClick(task)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <h4 className={`font-medium text-sm ${task.status === 'completed' ? 'line-through text-muted-foreground' : 'text-slate-800'} hover:text-blue-600 transition-colors`}>
                        {task.title}
                      </h4>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs px-2 py-1 rounded-full border ${statusInfo.bgColor} ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>

                      {task.source && (() => {
                        const sourceBadgeProps = getSourceBadgeProps(task.source);
                        const SourceIcon = sourceBadgeProps.icon;
                        return (
                          <Badge
                            variant="outline"
                            className={`text-xs ${sourceBadgeProps.className}`}
                          >
                            {SourceIcon && <SourceIcon className="w-3 h-3 mr-1" />}
                            {task.source}
                          </Badge>
                        );
                      })()}

                      <span className={`text-xs px-2 py-1 rounded-full border ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>

                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(task.due).toLocaleDateString()}
                      </span>
                    </div>
                  </div>


                </div>
              );
            })}
            </div>
          )}
        </div>

        {/* Pagination - Fixed at bottom */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              Showing {startIndex + 1}-{Math.min(startIndex + TASKS_PER_PAGE, filteredTasks.length)} of {filteredTasks.length} tasks
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousPage}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground px-3">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>


      {/* Task Generation Modal */}
      <TaskGenerationModal
        isOpen={showTaskGeneration}
        onClose={() => {
          setShowTaskGeneration(false);
          setGenerationType(null);
        }}
        onAcceptTasks={handleAcceptGeneratedTasks}
        generationType={generationType}
      />

      {/* Task Detail Modal */}
      <TaskDetailModal
        isOpen={showTaskDetail}
        onClose={handleTaskDetailClose}
        task={selectedTask}
        onTaskUpdate={handleTaskUpdate}
        onTaskDelete={handleTaskDelete}
      />

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
    </motion.div>
  );
};

export default RealDataTaskList;
