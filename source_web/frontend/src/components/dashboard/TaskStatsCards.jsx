import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock, AlertCircle, List, RefreshCw, MoreHorizontal } from 'lucide-react';
import { useAuth } from '../../auth/hooks/useAuth';

const TaskStatsCards = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { idToken, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated && idToken) {
      loadStats();
    }
  }, [isAuthenticated, idToken]);

  const loadStats = async () => {
    setLoading(true);
    setError(null);

    if (!isAuthenticated || !idToken) {
      setError('Please log in to view task statistics');
      setLoading(false);
      return;
    }

    try {
      // Try authenticated endpoint first, fallback to public for testing
      let url = 'http://localhost:8004/api/tasks/summary';
      let headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      };

      let response = await fetch(url, { headers });

      // If authentication fails, try public endpoint
      if (!response.ok && response.status === 403) {
        console.log('Authentication failed, trying public endpoint...');
        url = 'http://localhost:8004/api/tasks/summary/public';
        headers = { 'Content-Type': 'application/json' };
        response = await fetch(url, { headers });
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error Response:', response.status, errorData);
        
        // Handle validation errors more specifically
        let errorMessage = 'Failed to load task statistics';
        if (errorData.detail) {
          if (Array.isArray(errorData.detail)) {
            errorMessage += ': ' + errorData.detail.map(err => `${err.loc?.join('.')} - ${err.msg}`).join(', ');
          } else {
            errorMessage += ': ' + errorData.detail;
          }
        }
        
        throw new Error(errorMessage);
      }

      const summary = await response.json();
      console.log('Task summary response:', summary);
      
      // Transform the summary data to match expected format
      const transformedStats = {
        completed: summary.completed || 0,
        pending: summary.not_started || 0, // Map not_started to pending
        inProgress: summary.in_progress || 0,
        overdue: summary.overdue || 0
      };
      
      setStats(transformedStats);
    } catch (err) {
      console.error('Error loading task stats:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const cardConfigs = [
    {
      title: 'Completed Tasks',
      value: stats?.completed || 0,
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
    },
    {
      title: 'Not Started',
      value: stats?.pending || 0,
      icon: Clock,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
    },
    {
      title: 'In Progress',
      value: stats?.inProgress || 0,
      icon: RefreshCw,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
    },
    {
      title: 'Overdue',
      value: stats?.overdue || 0,
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
    },
  ];

  if (loading && !stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 animate-pulse">
            <div className="flex items-center justify-between mb-4">
              <div className="h-4 bg-gray-200 rounded w-20"></div>
              <div className="h-4 w-6 bg-gray-200 rounded"></div>
            </div>
            <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-12"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="col-span-full bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <p className="text-red-600 text-sm">Failed to load task statistics</p>
          <button
            onClick={loadStats}
            className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cardConfigs.map((config, index) => {
        const Icon = config.icon;
        return (
          <motion.div
            key={config.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-medium text-slate-600">{config.title}</h4>
              <div className="w-6 h-4 bg-white rounded flex items-center justify-center transition-colors">
                <MoreHorizontal className="w-3 h-3 text-slate-600" />
              </div>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900">
                {config.value}
              </span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default TaskStatsCards;