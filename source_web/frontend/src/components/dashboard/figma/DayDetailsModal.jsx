import React from 'react';
import { Calendar, Clock, CheckSquare, Users, X } from 'lucide-react';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { motion, AnimatePresence } from 'framer-motion';

const DayDetailsModal = ({ isOpen, onClose, date, events }) => {
  if (!isOpen || !date) return null;

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const tasks = events.filter(event => event.itemType === 'task');
  const calendarEvents = events.filter(event => event.itemType === 'event');

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
          className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-semibold text-slate-800">{formatDate(date)}</h2>
              </div>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-100">
              <div className="flex items-center gap-2 mb-2">
                <CheckSquare className="w-4 h-4 text-indigo-600" />
                <span className="text-sm font-medium text-indigo-900">Tasks</span>
              </div>
              <div className="text-2xl font-semibold text-indigo-600">{tasks.length}</div>
            </div>
            
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-900">Events</span>
              </div>
              <div className="text-2xl font-semibold text-purple-600">{calendarEvents.length}</div>
            </div>
          </div>

          {/* Tasks Section */}
          {tasks.length > 0 && (
            <div>
              <h4 className="font-medium text-slate-800 mb-3 flex items-center gap-2">
                <CheckSquare className="w-4 h-4" />
                Tasks ({tasks.length})
              </h4>
              <div className="space-y-3">
                {tasks.map((task, index) => {
                  const statusConfig = getStatusConfig(task.status);
                  return (
                    <div key={index} className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                      <div className="flex items-start justify-between mb-2">
                        <h5 className="font-medium text-slate-800">{task.title}</h5>
                        <div className="flex items-center gap-2">
                          {task.priority && (
                            <Badge className={`text-xs ${
                              task.priority === 'high' || task.priority === 'urgent'
                                ? 'bg-red-100 text-red-700 border-red-200'
                                : task.priority === 'medium'
                                ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
                                : 'bg-green-100 text-green-700 border-green-200'
                            }`}>
                              {task.priority}
                            </Badge>
                          )}
                          <Badge className={statusConfig.color}>
                            {statusConfig.label}
                          </Badge>
                        </div>
                      </div>
                      {task.data?.description && (
                        <p className="text-sm text-slate-600 mb-2">{task.data.description}</p>
                      )}
                      {task.data?.source && (
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <span>Source: {task.data.source}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Events Section */}
          {calendarEvents.length > 0 && (
            <div>
              <h4 className="font-medium text-slate-800 mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Events ({calendarEvents.length})
              </h4>
              <div className="space-y-3">
                {calendarEvents.map((event, index) => (
                  <div key={index} className="bg-indigo-50/50 rounded-lg p-3 border border-indigo-100">
                    <div className="flex items-start justify-between mb-2">
                      <h5 className="font-medium text-slate-800">{event.title}</h5>
                      <Badge className="bg-indigo-100 text-indigo-700">
                        Event
                      </Badge>
                    </div>
                    {event.data?.start && (
                      <div className="flex items-center gap-1 text-sm text-slate-600">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(event.data.start).toLocaleTimeString()}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {events.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                <Calendar className="w-8 h-8 text-slate-400" />
              </div>
              <h4 className="font-medium text-slate-800 mb-2">No events scheduled</h4>
              <p className="text-sm text-slate-500">This day is free for new tasks or meetings</p>
            </div>
          )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default DayDetailsModal;
