import { CheckSquare, Calendar, Users, Clock, TrendingUp, AlertTriangle, CheckCircle, X } from "lucide-react";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { motion, AnimatePresence } from 'framer-motion';

const KPIDetailsModal = ({ isOpen, onClose, kpiType, data }) => {
  if (!isOpen || !kpiType) return null;

  const getModalConfig = () => {
    switch (kpiType) {
      case 'tasks-completed':
        return {
          title: 'Tasks Completed This Week',
          icon: CheckSquare,
          iconColor: 'text-emerald-600',
          bgColor: 'bg-emerald-50',
          borderColor: 'border-emerald-200',
          items: data.completedTasks || [],
          type: 'tasks'
        };
      case 'overdue-tasks':
        return {
          title: 'Overdue Tasks',
          icon: AlertTriangle,
          iconColor: 'text-rose-600',
          bgColor: 'bg-rose-50',
          borderColor: 'border-rose-200',
          items: data.overdueTasks || [],
          type: 'tasks'
        };
      case 'upcoming-meetings':
        return {
          title: 'Upcoming Meetings This Week',
          icon: Users,
          iconColor: 'text-indigo-600',
          bgColor: 'bg-indigo-50',
          borderColor: 'border-indigo-200',
          items: data.upcomingMeetings || [],
          type: 'meetings'
        };
      case 'tasks-due-today':
        return {
          title: 'Tasks Due Today',
          icon: Clock,
          iconColor: 'text-amber-600',
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-200',
          items: data.tasksDueToday || [],
          type: 'tasks'
        };
      case 'completion-rate':
        return {
          title: 'Completion Rate Details',
          icon: TrendingUp,
          iconColor: 'text-purple-600',
          bgColor: 'bg-purple-50',
          borderColor: 'border-purple-200',
          items: data.allTasks || [],
          type: 'tasks'
        };
      default:
        return null;
    }
  };

  const config = getModalConfig();
  if (!config) return null;

  const getStatusConfig = (status) => {
    switch (status) {
      case 'completed':
        return { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Completed' };
      case 'in-progress':
        return { color: 'bg-indigo-100 text-indigo-700 border-indigo-200', label: 'In Progress' };
      case 'overdue':
        return { color: 'bg-rose-100 text-rose-700 border-rose-200', label: 'Overdue' };
      default:
        return { color: 'bg-slate-100 text-slate-700 border-slate-200', label: 'Not Started' };
    }
  };

  const getPriorityConfig = (priority) => {
    switch (priority) {
      case 'high':
        return { color: 'bg-rose-100 text-rose-700', label: 'High' };
      case 'medium':
        return { color: 'bg-amber-100 text-amber-700', label: 'Medium' };
      case 'low':
        return { color: 'bg-slate-100 text-slate-700', label: 'Low' };
      default:
        return null;
    }
  };

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const IconComponent = config.icon;

  return (
    <AnimatePresence>
      <motion.div
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
          className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <IconComponent className={`w-5 h-5 ${config.iconColor}`} />
                <h2 className="text-lg font-semibold text-slate-800">{config.title}</h2>
              </div>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Summary */}
            <div className={`${config.bgColor} rounded-lg p-4 border ${config.borderColor}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <IconComponent className={`w-5 h-5 ${config.iconColor}`} />
                    <span className="font-medium text-slate-800">
                      {config.items.length} {config.type === 'tasks' ? 'tasks' : 'meetings'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">
                    {config.type === 'tasks' 
                      ? `Total ${kpiType === 'overdue-tasks' ? 'overdue' : kpiType === 'tasks-completed' ? 'completed' : ''} tasks for this period`
                      : 'Scheduled meetings for this week'
                    }
                  </p>
                </div>
                <div className={`text-3xl font-bold ${config.iconColor}`}>
                  {config.items.length}
                </div>
              </div>
            </div>

            {/* Items List */}
            {config.items.length > 0 ? (
              <div className="space-y-3">
                <h4 className="font-medium text-slate-800">Details</h4>
                {config.type === 'tasks' ? (
                  // Tasks List
                  config.items.map((task) => {
                    const statusConfig = getStatusConfig(task.status);
                    const priorityConfig = getPriorityConfig(task.priority);
                    
                    return (
                      <motion.div 
                        key={task.id} 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-lg p-4 border border-slate-200 hover:shadow-sm transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <h5 className="font-medium text-slate-800">{task.title}</h5>
                          <div className="flex items-center gap-2">
                            {priorityConfig && (
                              <Badge className={priorityConfig.color + ' text-xs'}>
                                {priorityConfig.label}
                              </Badge>
                            )}
                            <Badge className={statusConfig.color}>
                              {statusConfig.label}
                            </Badge>
                          </div>
                        </div>
                        {task.due && (
                          <div className="flex items-center gap-1 text-sm text-slate-600">
                            <Clock className="w-3 h-3" />
                            <span>Due: {task.due}</span>
                          </div>
                        )}
                      </motion.div>
                    );
                  })
                ) : (
                  // Meetings List
                  config.items.map((meeting) => (
                    <motion.div 
                      key={meeting.id} 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-lg p-4 border border-slate-200 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full flex items-center justify-center text-white font-medium shadow-sm">
                          {getInitials(meeting.title)}
                        </div>
                        <div className="flex-1">
                          <h5 className="font-medium text-slate-800 mb-1">{meeting.title}</h5>
                          <div className="flex items-center gap-4 text-sm text-slate-600">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>{meeting.date || new Date(meeting.start).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{meeting.time || new Date(meeting.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>
                        </div>
                        <Badge className="bg-indigo-100 text-indigo-700">
                          Scheduled
                        </Badge>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            ) : (
              // Empty State
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                  <IconComponent className="w-8 h-8 text-slate-400" />
                </div>
                <h4 className="font-medium text-slate-800 mb-2">No items found</h4>
                <p className="text-sm text-slate-500">
                  {config.type === 'tasks' 
                    ? `No ${kpiType === 'overdue-tasks' ? 'overdue' : 'completed'} tasks to display`
                    : 'No upcoming meetings scheduled'
                  }
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default KPIDetailsModal;
