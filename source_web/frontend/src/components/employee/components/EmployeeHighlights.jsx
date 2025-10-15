import React from 'react';
import { motion as Motion } from 'framer-motion';
import {
  Award,
  TrendingUp,
  Heart,
  Trophy,
  ChevronRight
} from 'lucide-react';
import { calculateHighlightsFromRealData } from '../../../services/employeeDataUtils';

const EmployeeHighlights = ({
  employees,
  isCollapsed,
  onHighlightClick
}) => {
  // Calculate highlights from employee data using real data
  const highlights = calculateHighlightsFromRealData(employees);

  const highlightItems = [
    {
      id: 'revenue',
      title: 'Highest Revenue',
      icon: <Trophy className="w-4 h-4 text-yellow-500" />,
      employee: highlights.highestRevenue,
      value: highlights.highestRevenue ? `$${highlights.highestRevenue.revenue.toLocaleString()}` : 'N/A',
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-600',
      hoverColor: 'hover:bg-yellow-100'
    },
    {
      id: 'experience',
      title: 'Most Experienced',
      icon: <Award className="w-4 h-4 text-blue-500" />,
      employee: highlights.mostExperienced,
      value: highlights.mostExperienced ? `${highlights.mostExperienced.working_year || highlights.mostExperienced.experience || 0} years` : 'N/A',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      hoverColor: 'hover:bg-blue-100'
    },
    {
      id: 'performance',
      title: 'Top Recent Performance',
      icon: <TrendingUp className="w-4 h-4 text-green-500" />,
      employee: highlights.topPerformance,
      value: highlights.topPerformance ? `${highlights.topPerformance.score}%` : 'N/A',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
      hoverColor: 'hover:bg-green-100'
    },
    {
      id: 'feedback',
      title: 'Customer Best Feedback',
      icon: <Heart className="w-4 h-4 text-purple-500" />,
      employee: highlights.bestFeedback,
      value: highlights.bestFeedback ? `${highlights.bestFeedback.rating.toFixed(1)} ⭐` : 'N/A',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
      hoverColor: 'hover:bg-purple-100'
    }
  ];

  return (
    <Motion.div
      initial={false}
      animate={{
        height: isCollapsed ? 0 : 'auto',
        opacity: isCollapsed ? 0 : 1
      }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="overflow-hidden"
    >
      <div className="flex flex-wrap gap-2 justify-start">
        {highlightItems.map((item, index) => (
          <Motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`${item.bgColor} ${item.hoverColor} rounded-lg px-3 py-2 w-60 cursor-pointer transition-all duration-200 border border-transparent hover:border-gray-200 hover:shadow-md group`}
            onClick={() => item.employee && onHighlightClick(item.id, item.employee)}
          >
            <div className="flex items-start justify-between mb-1">
              <div className="flex items-center gap-2">
                {item.icon}
                <span className={`text-sm leading-tight font-medium ${item.textColor}`}>
                  {item.title}
                </span>
              </div>
              <ChevronRight className={`w-3 h-3 ${item.textColor} opacity-0 group-hover:opacity-100 transition-opacity`} />
            </div>

            {item.employee ? (
              <div className="space-y-0.5">
                <div className="font-bold text-base leading-tight text-gray-900">
                  {item.value}
                </div>
                <div className="text-sm leading-tight text-gray-600">
                  {item.employee.name}
                </div>
              </div>
            ) : (
              <div className="space-y-0.5">
                <div className="font-bold text-base leading-tight text-gray-400">
                  {item.value}
                </div>
                <div className="text-xs leading-tight text-gray-400">
                  No data available
                </div>
              </div>
            )}
          </Motion.div>
        ))}
      </div>
    </Motion.div>
  );
};

export default EmployeeHighlights;