import React, { useState } from 'react';
import {
  Circle,
  Clock,
  CheckCircle2,
  AlertCircle,
  Pause,
  ChevronDown,
  Loader2
} from 'lucide-react';
import { Button } from '../ui/button';
import { motion, AnimatePresence } from 'framer-motion';

const statusConfig = {
  'not-started': {
    icon: Circle,
    color: 'text-slate-400',
    bgColor: 'bg-slate-50 border-slate-200',
    label: 'Not Started',
    hoverColor: 'hover:bg-slate-100'
  },
  'in-progress': {
    icon: Clock,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50 border-indigo-200',
    label: 'In Progress',
    hoverColor: 'hover:bg-indigo-100'
  },
  'completed': {
    icon: CheckCircle2,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 border-emerald-200',
    label: 'Completed',
    hoverColor: 'hover:bg-emerald-100'
  },
  'overdue': {
    icon: AlertCircle,
    color: 'text-rose-600',
    bgColor: 'bg-rose-50 border-rose-200',
    label: 'Overdue',
    hoverColor: 'hover:bg-rose-100'
  }
};

const TaskStatusSelector = ({ 
  currentStatus, 
  taskId, 
  onStatusChange, 
  disabled = false,
  size = 'default',
  showLabel = false,
  variant = 'dropdown' // 'dropdown' | 'buttons' | 'simple'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const currentStatusInfo = statusConfig[currentStatus] || statusConfig['not-started'];
  const CurrentIcon = currentStatusInfo.icon;

  const handleStatusChange = async (newStatus) => {
    if (newStatus === currentStatus || disabled || isUpdating) return;

    setIsUpdating(true);
    try {
      await onStatusChange(taskId, newStatus);
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to update task status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  // Simple variant - just shows current status
  if (variant === 'simple') {
    return (
      <div className={`flex items-center gap-2 px-2 py-1 rounded-md border ${currentStatusInfo.bgColor}`}>
        <CurrentIcon className={`w-4 h-4 ${currentStatusInfo.color}`} />
        {showLabel && (
          <span className={`text-sm font-medium ${currentStatusInfo.color}`}>
            {currentStatusInfo.label}
          </span>
        )}
      </div>
    );
  }

  // Button variant - shows all statuses as buttons
  if (variant === 'buttons') {
    return (
      <div className="flex gap-1">
        {Object.entries(statusConfig).map(([status, config]) => {
          if (status === 'overdue') return null; // Skip overdue as it's computed
          const Icon = config.icon;
          const isActive = status === currentStatus;
          
          return (
            <Button
              key={status}
              variant="ghost"
              size="sm"
              onClick={() => handleStatusChange(status)}
              disabled={disabled || isUpdating}
              className={`
                w-8 h-8 p-0 rounded-full border-2 transition-all
                ${isActive 
                  ? `${config.bgColor} ${config.color} border-current` 
                  : `border-slate-200 text-slate-400 hover:border-slate-300 ${config.hoverColor}`
                }
              `}
              title={config.label}
            >
              {isUpdating && isActive ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Icon className="w-3 h-3" />
              )}
            </Button>
          );
        })}
      </div>
    );
  }

  // Dropdown variant (default)
  return (
    <div className="relative">
      <Button
        variant="ghost"
        size={size === 'sm' ? 'sm' : 'default'}
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || isUpdating}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-md border transition-all
          ${currentStatusInfo.bgColor} ${currentStatusInfo.color} ${currentStatusInfo.hoverColor}
          ${isOpen ? 'ring-2 ring-blue-500 ring-opacity-20' : ''}
        `}
      >
        {isUpdating ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <CurrentIcon className="w-4 h-4" />
        )}
        {showLabel && (
          <span className="text-sm font-medium">
            {currentStatusInfo.label}
          </span>
        )}
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setIsOpen(false)}
            />
            
            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20"
            >
              {Object.entries(statusConfig).map(([status, config]) => {
                if (status === 'overdue') return null; // Skip overdue as it's computed
                const Icon = config.icon;
                const isActive = status === currentStatus;
                
                return (
                  <button
                    key={status}
                    onClick={() => handleStatusChange(status)}
                    disabled={isActive}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2 text-left transition-colors
                      ${isActive 
                        ? 'bg-slate-50 text-slate-400 cursor-not-allowed' 
                        : `hover:bg-slate-50 ${config.color}`
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{config.label}</span>
                    {isActive && (
                      <span className="ml-auto text-xs text-slate-400">Current</span>
                    )}
                  </button>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TaskStatusSelector;
