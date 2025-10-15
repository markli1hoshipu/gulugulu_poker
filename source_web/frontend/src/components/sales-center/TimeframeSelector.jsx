import React from 'react';
import { Calendar, Clock, BarChart3, Lock } from 'lucide-react';

const TimeframeSelector = ({ selectedTimeframe, onTimeframeChange, onClose }) => {
  const timeframes = [
    {
      id: 'daily',
      label: 'Daily Analysis',
      description: 'Real-time business insights',
      icon: Clock,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      disabled: false
    },
    {
      id: 'weekly',
      label: 'Weekly Trends',
      description: 'Coming Soon',
      icon: Calendar,
      color: 'text-gray-400',
      bg: 'bg-gray-50',
      disabled: true
    },
    {
      id: 'monthly',
      label: 'Monthly Overview',
      description: 'Coming Soon',
      icon: BarChart3,
      color: 'text-gray-400',
      bg: 'bg-gray-50',
      disabled: true
    }
  ];

  const handleSelect = (timeframe) => {
    if (timeframe.disabled) return;
    onTimeframeChange(timeframe.id);
    onClose?.();
  };

  return (
    <div className="p-2 w-64">
      <div className="mb-3">
        <h3 className="text-sm font-medium text-gray-900 mb-1">Analysis Timeframe</h3>
        <p className="text-xs text-gray-600">Select the time range for insights generation</p>
      </div>

      <div className="space-y-1">
        {timeframes.map((timeframe) => {
          const Icon = timeframe.icon;
          const isSelected = selectedTimeframe === timeframe.id;
          const isDisabled = timeframe.disabled;

          return (
            <button
              key={timeframe.id}
              onClick={() => handleSelect(timeframe)}
              disabled={isDisabled}
              className={`w-full flex items-start gap-3 p-3 text-left rounded-lg border transition-colors ${
                isDisabled
                  ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                  : isSelected
                  ? 'border-blue-300 bg-blue-50 ring-2 ring-blue-100'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                isDisabled
                  ? 'bg-gray-100'
                  : isSelected
                  ? 'bg-blue-100'
                  : timeframe.bg
              }`}>
                {isDisabled ? (
                  <Lock className="w-4 h-4 text-gray-400" />
                ) : (
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-blue-600' : timeframe.color}`} />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className={`text-sm font-medium ${
                    isDisabled
                      ? 'text-gray-500'
                      : isSelected
                      ? 'text-blue-900'
                      : 'text-gray-900'
                  }`}>
                    {timeframe.label}
                  </p>
                  {isSelected && !isDisabled && (
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  )}
                </div>
                <p className={`text-xs ${
                  isDisabled
                    ? 'text-gray-400'
                    : isSelected
                    ? 'text-blue-700'
                    : 'text-gray-600'
                }`}>
                  {timeframe.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TimeframeSelector;