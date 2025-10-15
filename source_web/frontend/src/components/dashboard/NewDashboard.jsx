
import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../auth/hooks/useAuth';




// Step 6: Add new components

import AIAgentsPanel from './figma/AIAgentsPanel';

// Step 7: DB Agent Components removed


// Step 8: Add Real Data Components
import RealDataTaskList from './RealDataTaskList';
import RealDataCalendar from './RealDataCalendar';
import TaskStatsCards from './TaskStatsCards';
import UpcomingMeetings from './UpcomingMeetings';





// ---------- Dashboard (JS/JSX) ----------
const NewDashboard = () => {
  // Get current user
  const { user } = useAuth();

  // State for managing calendar refresh
  const [calendarRefreshTrigger, setCalendarRefreshTrigger] = React.useState(0);





  // Removed unused selectedTasks and selectedMeetings

  // Function to refresh calendar when tasks are updated
  const handleTasksUpdated = React.useCallback(() => {
    setCalendarRefreshTrigger(prev => prev + 1);
  }, []);

  // Get user's first name or fallback to "User"
  const getUserName = () => {
    if (user?.name) {
      // Extract first name from full name
      return user.name.split(' ')[0];
    }
    return 'User';
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="px-6 py-4 bg-white"
        role="banner"
      >
        <div className="flex items-center justify-between gap-6">
          <div className="min-w-0 flex-1">
            <motion.h1
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.3 }}
              className="text-2xl font-bold text-gray-900"
            >
              Welcome {getUserName()}!
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.3 }}
              className="text-sm text-gray-500 mt-1"
            >
              Here's what's happening with your work today.
            </motion.p>
          </div>

          {/* DB Agent Status removed */}
        </div>
      </motion.header>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex-1 py-4 px-5 space-y-4 bg-gray-50 overflow-auto"
      >

      {/* Task Statistics Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className=""
      >
        <TaskStatsCards />
      </motion.div>

      {/* Main Grid with Figma Components */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="grid grid-cols-1 lg:grid-cols-10 gap-4"
      >
        {/* Left content - Real Data Tasks */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.6 }}
          className="lg:col-span-7 space-y-8"
        >
          <RealDataTaskList onTasksUpdated={handleTasksUpdated} />
        </motion.div>

        {/* Right sidebar - Real Data Calendar and Upcoming Meetings */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.7 }}
          className="lg:col-span-3 space-y-4"
        >
          <RealDataCalendar refreshTrigger={calendarRefreshTrigger} />
          <UpcomingMeetings />
        </motion.div>
      </motion.div>



      {/* AI Agents Panel - Full Width */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.9 }}
        className="mt-8"
      >
        <AIAgentsPanel />
      </motion.div>

      {/* DB Agent Query Panel removed */}





      {/* Bottom padding to ensure content is fully visible */}
      <div className="h-8"></div>
      </motion.div>
    </div>
  );
};

export default NewDashboard;
