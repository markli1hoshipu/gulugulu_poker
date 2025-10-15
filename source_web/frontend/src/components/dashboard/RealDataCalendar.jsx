import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Clock,
  RefreshCw,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Target,
  Users,
  Building2,
  Activity
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { getUpcomingEvents, getDashboardEvents } from '../../services/dashboardDataApi';
import { useAuth } from '../../auth/hooks/useAuth';
import DayDetailsModal from './figma/DayDetailsModal';

// Calendar utility functions
const fmtDate = (d) => d.toISOString().slice(0, 10);
const isSameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const today = startOfDay(new Date());

const getMonthMatrix = (anchor) => {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  const weeks = [];
  for (let w = 0; w < 6; w++) {
    const row = [];
    for (let d = 0; d < 7; d++) {
      const cell = new Date(start);
      cell.setDate(start.getDate() + w * 7 + d);
      row.push(cell);
    }
    weeks.push(row);
  }
  return weeks;
};

const Badge = ({ children, color = 'slate' }) => {
  const map = {
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
    amber: 'bg-amber-100 text-amber-700 border-amber-200',
    indigo: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${map[color]}`}>{children}</span>
  );
};

const RealDataCalendar = () => {
  const { idToken, isAuthenticated } = useAuth();
  const [events, setEvents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDate, setModalDate] = useState(null);
  const [modalEvents, setModalEvents] = useState([]);

  const matrix = useMemo(() => getMonthMatrix(currentDate), [currentDate]);
  const thisMonth = currentDate.getMonth();

  // Convert events and tasks to calendar format
  const eventsByDay = useMemo(() => {
    const map = new Map();

    // Add events
    for (const ev of events) {
      const date = new Date(ev.start).toISOString().slice(0, 10);
      const list = map.get(date) ?? [];
      list.push({
        id: `event-${ev.id}`,
        title: ev.title,
        date: date,
        type: 'event',
        itemType: 'event',
        data: ev
      });
      map.set(date, list);
    }

    // Add tasks with due dates
    for (const task of tasks) {
      if (task.due) {
        const date = new Date(task.due).toISOString().slice(0, 10);
        const list = map.get(date) ?? [];
        list.push({
          id: `task-${task.id}`,
          title: task.title,
          date: date,
          type: 'task',
          itemType: 'task',
          status: task.status,
          priority: task.priority,
          isOverdue: task.isOverdue,
          data: task
        });
        map.set(date, list);
      }
    }

    return map;
  }, [events, tasks]);

  useEffect(() => {
    loadData();
  }, []);

  const loadTasks = async () => {
    if (!isAuthenticated || !idToken) {
      return;
    }

    try {
      const response = await fetch('http://localhost:8004/api/tasks', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        }
      });

      if (response.ok) {
        const tasksData = await response.json();
        const transformedTasks = tasksData.map(task => ({
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
      }
    } catch (err) {
      console.error('Error loading tasks:', err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [upcomingResult, allEventsResult] = await Promise.all([
        getUpcomingEvents(7),
        getDashboardEvents(),
        loadTasks()
      ]);

      if (upcomingResult.success) {
        setUpcomingEvents(upcomingResult.events);
      }

      if (allEventsResult.success) {
        setEvents(allEventsResult.events);
      }

      if (!upcomingResult.success && !allEventsResult.success) {
        throw new Error('Failed to load calendar data');
      }

    } catch (err) {
      console.error('Error loading calendar data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (item) => {
    if (item.itemType === 'task') {
      switch (item.priority) {
        case 'high':
        case 'urgent':
          return <AlertCircle className="w-3 h-3 text-red-500" />;
        case 'medium':
          return <Clock className="w-3 h-3 text-yellow-500" />;
        case 'low':
          return <Clock className="w-3 h-3 text-green-500" />;
        default:
          return <Clock className="w-3 h-3 text-gray-500" />;
      }
    } else {
      // Event icons
      switch (item.type) {
        case 'lead-activity': return <Target className="w-4 h-4 text-blue-500" />;
        case 'customer-interaction': return <Users className="w-4 h-4 text-green-500" />;
        default: return <Activity className="w-4 h-4 text-gray-500" />;
      }
    }
  };

  const getEventColor = (item) => {
    if (item.itemType === 'task') {
      if (item.isOverdue) return 'bg-red-100 border-red-200 text-red-800';
      switch (item.status) {
        case 'completed': return 'bg-green-100 border-green-200 text-green-800';
        case 'in-progress': return 'bg-blue-100 border-blue-200 text-blue-800';
        case 'not-started': return 'bg-gray-100 border-gray-200 text-gray-800';
        default: return 'bg-gray-100 border-gray-200 text-gray-800';
      }
    } else {
      // Event colors
      switch (item.type) {
        case 'lead-activity': return 'bg-blue-100 border-blue-200 text-blue-800';
        case 'customer-interaction': return 'bg-green-100 border-green-200 text-green-800';
        default: return 'bg-gray-100 border-gray-200 text-gray-800';
      }
    }
  };

  const formatEventTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatEventDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    }
  };


  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + direction);
      return newDate;
    });
  };

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    const dayEvents = eventsByDay.get(fmtDate(date)) || [];
    if (dayEvents.length > 0) {
      setModalDate(date);
      setModalEvents(dayEvents);
      setModalOpen(true);
    }
  };

  if (loading) {
    return (
      <motion.div className="font-sans" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <Card className="h-[500px] flex flex-col bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 text-gray-400 animate-spin mr-2" />
              <span className="text-gray-500">Loading calendar...</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div className="font-sans" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <Card className="h-[500px] flex flex-col bg-white">
          <CardContent className="p-6">
            <div className="text-center py-8">
              <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
              <p className="text-red-600 mb-4">Failed to load calendar</p>
              <button
                onClick={loadData}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div className="font-sans" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <Card className="h-[450px] flex flex-col bg-white">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between mb-4">
            <CardTitle className="text-base font-semibold">
              Calendar
            </CardTitle>
            <div className="flex items-center gap-2">
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-lg font-semibold">
              {currentDate.toLocaleString('en-US', { month: 'long' })} {currentDate.getFullYear()}
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={() => navigateMonth(-1)} className="w-8 h-8 p-0 hover:bg-slate-100">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigateMonth(1)} className="w-8 h-8 p-0 hover:bg-slate-100">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-6 pb-6 flex-1 flex flex-col overflow-hidden">
          {/* Week headers */}
          <div className="grid grid-cols-7 gap-x-1 mb-2">
            {['SUN','MON','TUE','WED','THU','FRI','SAT'].map((d) => (
              <div key={d} className="text-center text-xs font-medium text-slate-500 p-2">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="space-y-1">
            {matrix.map((week, weekIndex) => (
              <div key={weekIndex} className="grid grid-cols-7 gap-x-1">
                {week.map((d, dayIndex) => {
                  const key = d ? fmtDate(d) : `empty-${weekIndex}-${dayIndex}`;
                  const dayEvents = d ? eventsByDay.get(fmtDate(d)) || [] : [];
                  const inactive = d ? d.getMonth() !== thisMonth : true;
                  const isToday = d ? isSameDay(d, today) : false;
                  const isSel = d && selectedDate ? isSameDay(d, selectedDate) : false;
                  const hasEvents = dayEvents.length > 0;

                  return (
                    <div key={key} className="h-9 flex items-center justify-center relative">
                      {d && (
                        <motion.button
                          onClick={() => handleDateSelect(d)}
                          className={[
                            'w-9 h-9 rounded-lg flex items-center justify-center text-sm font-medium transition-colors relative border',
                            isSel ? 'bg-slate-600 text-white hover:bg-slate-700 border-slate-600' : 'border-transparent',
                            isToday && !isSel ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : '',
                            inactive ? 'text-slate-300 opacity-40 hover:opacity-60' : 'text-slate-700 hover:bg-slate-100 hover:border-slate-200',
                          ].join(' ')}
                          whileHover={{ scale: 1.05 }}
                        >
                          {d.getDate()}
                          {hasEvents && (
                            <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 flex gap-0.5">
                              {dayEvents.slice(0, 3).map((item, index) => {
                                let dotColor = 'bg-gray-500';
                                if (item.itemType === 'task') {
                                  if (item.isOverdue) dotColor = 'bg-red-500';
                                  else if (item.status === 'completed') dotColor = 'bg-green-500';
                                  else if (item.status === 'in-progress') dotColor = 'bg-blue-500';
                                  else dotColor = 'bg-yellow-500';
                                } else {
                                  dotColor = 'bg-indigo-500';
                                }

                                return (
                                  <div key={index} className={`w-1.5 h-1.5 rounded-full ${
                                    isSel ? 'bg-white' : dotColor
                                  }`}></div>
                                );
                              })}
                            </div>
                          )}
                        </motion.button>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <DayDetailsModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        date={modalDate}
        events={modalEvents}
      />
    </motion.div>
  );
};

export default RealDataCalendar;
