import { Clock, AlertCircle, CheckCircle2, Circle, Plus, Filter, Calendar, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Select, SelectContent, SelectItem } from "../../ui/select";
import { motion } from 'framer-motion';

const statusConfig = {
  'not-started': {
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

const TasksSection = ({ tasks = [], title = "Tasks", onTasksChange }) => {
  const [filteredTasks, setFilteredTasks] = useState(tasks);
  const [dateFilter, setDateFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [dateFilter, statusFilter]);

  // Update filtered tasks when tasks prop changes
  useEffect(() => {
    applyFilters(dateFilter, statusFilter);
  }, [tasks, dateFilter, statusFilter]);

  const handleDateFilterChange = (value) => {
    setDateFilter(value);
    applyFilters(value, statusFilter);
  };

  const handleStatusFilterChange = (value) => {
    setStatusFilter(value);
    applyFilters(dateFilter, value);
  };

  const applyFilters = (dateFilterValue, statusFilterValue) => {
    let filtered = [...tasks];

    // Apply status filter
    if (statusFilterValue !== 'all') {
      filtered = filtered.filter(task => task.status === statusFilterValue);
    }

    // Apply date filter
    if (dateFilterValue !== 'all') {
      filtered = filtered.filter(task => {
        if (!task.due) return false;

        switch (dateFilterValue) {
          case 'today':
            return task.due.toLowerCase().includes('today');
          case 'tomorrow':
            return task.due.toLowerCase().includes('tomorrow');
          case 'overdue':
            return task.status === 'overdue';
          default:
            return true;
        }
      });
    }

    setFilteredTasks(filtered);
  };

  const handleTaskStatusChange = (taskId, newStatus) => {
    if (onTasksChange) {
      const updatedTasks = tasks.map(task =>
        task.id === taskId ? { ...task, status: newStatus } : task
      );
      onTasksChange(updatedTasks);
    }
  };

  const handleAddTask = () => {
    if (newTaskTitle.trim() && onTasksChange) {
      const newTask = {
        id: Date.now(),
        title: newTaskTitle,
        due: newTaskDueDate || 'No due date',
        status: 'not-started'
      };
      onTasksChange([...tasks, newTask]);
      setNewTaskTitle('');
      setNewTaskDueDate('');
      setShowAddTask(false);
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

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6 flex flex-col hover:shadow-md transition-shadow shadow-[0px_20px_92px_0px_rgba(0,0,0,0.03)]">
        {/* Header with collapse button in top-right */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-slate-800">{title}</h3>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1 h-6 w-6 bg-white border border-gray-200 rounded-full shadow-sm hover:shadow-md"
            >
              {isCollapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
            </Button>

            {!isCollapsed && (
              <Button
                onClick={() => setShowAddTask(true)}
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Task
              </Button>
            )}
          </div>
        </div>

        {/* Collapsed View */}
        {isCollapsed && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{filteredTasks.length} tasks</span>
            <div className="flex items-center gap-2">
              {filteredTasks.filter(t => t.status === 'completed').length > 0 && (
                <span className="text-green-600">
                  {filteredTasks.filter(t => t.status === 'completed').length} completed
                </span>
              )}
              {filteredTasks.filter(t => t.status === 'overdue').length > 0 && (
                <span className="text-red-600">
                  {filteredTasks.filter(t => t.status === 'overdue').length} overdue
                </span>
              )}
            </div>
          </div>
        )}

        {/* Expanded View */}
        {!isCollapsed && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Filter className="w-4 h-4" />
                  <span>Filter by:</span>
                </div>

                <Select value={dateFilter} onValueChange={handleDateFilterChange} className="w-32" size="sm">
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="tomorrow">Tomorrow</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={handleStatusFilterChange} className="w-36" size="sm">
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="not-started">Not Started</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Add Task Form */}
            {showAddTask && (
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <div className="space-y-3">
                  <Input
                    placeholder="Task title..."
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    className="bg-white"
                  />
                  <div className="flex items-center gap-2">
                    <Input
                      type="date"
                      value={newTaskDueDate}
                      onChange={(e) => setNewTaskDueDate(e.target.value)}
                      className="bg-white flex-1"
                    />
                    <Button onClick={handleAddTask} size="sm">
                      Add
                    </Button>
                    <Button
                      onClick={() => setShowAddTask(false)}
                      variant="outline"
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Tasks List */}
            {filteredTasks.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Circle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No tasks found</p>
                <p className="text-sm">Add a new task to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {paginatedTasks.map((task) => {
                  const statusInfo = statusConfig[task.status];
                  const StatusIcon = statusInfo.icon;

                  return (
                    <div key={task.id} className="flex items-center gap-3 p-4 rounded-lg hover:bg-slate-50/50 transition-colors border border-transparent hover:border-slate-200/50">
                      <button
                        onClick={() => {
                          const nextStatus = task.status === 'completed' ? 'not-started' : 'completed';
                          handleTaskStatusChange(task.id, nextStatus);
                        }}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${statusInfo.color} ${statusInfo.bgColor} hover:scale-110`}
                      >
                        <StatusIcon className="w-3 h-3" />
                      </button>

                      <div className="flex-1 min-w-0">
                        <h4 className={`font-medium text-sm ${task.status === 'completed' ? 'line-through text-muted-foreground' : 'text-slate-800'}`}>
                          {task.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs px-2 py-1 rounded-full border ${statusInfo.bgColor} ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {task.due}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
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
        )}
      </div>
    </motion.div>
  );
};

export default TasksSection;
