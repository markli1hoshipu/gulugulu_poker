/**
 * Dashboard Data API - Service for fetching real business data for dashboard tasks and calendar
 */

// Updated to use Dashboard Service for DB Agent functionality
const API_BASE_URL = import.meta.env.VITE_DASHBOARD_API_URL || 'http://localhost:8004';

class DashboardDataApiError extends Error {
  constructor(message, status = null, response = null) {
    super(message);
    this.name = 'DashboardDataApiError';
    this.status = status;
    this.response = response;
  }
}

/**
 * Make HTTP request with error handling
 */
async function makeRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultOptions = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  };

  try {
    const response = await fetch(url, { ...defaultOptions, ...options });
    
    if (!response.ok) {
      throw new DashboardDataApiError(
        `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        response
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof DashboardDataApiError) {
      throw error;
    }
    throw new DashboardDataApiError(`Network error: ${error.message}`, null, error);
  }
}

/**
 * Get manually created and accepted tasks (no automatic generation)
 */
export async function getDashboardTasks() {
  try {
    console.log('📋 Fetching dashboard tasks from task service...');

    // Get tasks from the dashboard service
    const tasksResult = await makeRequest('/api/tasks/public?limit=50');

    if (!Array.isArray(tasksResult)) {
      throw new Error('Invalid task data received');
    }

    console.log(`📋 Retrieved ${tasksResult.length} tasks from task service`);

    return {
      success: true,
      tasks: tasksResult,
      count: tasksResult.length
    };
  } catch (error) {
    console.error('📋 Error fetching dashboard tasks:', error);
    return {
      success: false,
      error: error.message,
      tasks: []
    };
  }
}

// Legacy function removed - was using deprecated /api/db/query endpoints

/**
 * Get calendar events from business data
 */
export async function getDashboardEvents() {
  try {
    console.log('📅 Fetching dashboard events from task data...');

    // Get tasks from the dashboard service
    const tasksResult = await makeRequest('/api/tasks/public?limit=50');

    const events = [];

    // Convert tasks to calendar events
    if (tasksResult && Array.isArray(tasksResult)) {
      tasksResult.forEach(task => {
        // Create calendar event for task due dates
        if (task.due_date) {
          events.push({
            id: `task-${task.task_id}`,
            title: task.title || `Task ${task.task_id}`,
            start: task.due_date,
            type: 'task-due',
            category: 'task',
            description: task.description || `Task: ${task.title}`,
            metadata: {
              taskId: task.task_id,
              priority: task.priority,
              status: task.status,
              employeeId: task.employee_id
            }
          });
        }

        // Create calendar event for task creation dates
        if (task.created_at) {
          events.push({
            id: `task-created-${task.task_id}`,
            title: `Created: ${task.title || `Task ${task.task_id}`}`,
            start: task.created_at,
            type: 'task-created',
            category: 'task',
            description: `Task created: ${task.description || task.title}`,
            metadata: {
              taskId: task.task_id,
              priority: task.priority,
              status: task.status,
              employeeId: task.employee_id
            }
          });
        }
      });
    }

    console.log(`📅 Generated ${events.length} events from ${tasksResult?.length || 0} tasks`);
    return {
      success: true,
      events: events.slice(0, 50), // Limit to 50 most recent events
      total: events.length
    };

  } catch (error) {
    console.error('📅 Error fetching dashboard events:', error);
    return {
      success: false,
      error: error.message,
      events: []
    };
  }
}

/**
 * Helper functions
 */
function getTaskStatus(leadStatus) {
  switch (leadStatus) {
    case 'hot': return 'in-progress';
    case 'warm': return 'pending';
    case 'cold': return 'not-started';
    default: return 'pending';
  }
}

function getTaskPriority(score) {
  if (!score) return 'low';
  if (score >= 80) return 'high';
  if (score >= 60) return 'medium';
  return 'low';
}

/**
 * Get dashboard statistics
 */
export async function getDashboardStats() {
  try {
    const tasks = await getDashboardTasks();
    const events = await getDashboardEvents();
    
    if (!tasks.success || !events.success) {
      throw new Error('Failed to fetch dashboard data');
    }

    const taskStats = {
      total: tasks.tasks.length,
      pending: tasks.tasks.filter(t => t.status === 'pending').length,
      inProgress: tasks.tasks.filter(t => t.status === 'in-progress').length,
      completed: tasks.tasks.filter(t => t.status === 'completed').length,
      overdue: tasks.tasks.filter(t => new Date(t.due) < new Date()).length
    };

    const eventStats = {
      total: events.events.length,
      thisWeek: events.events.filter(e => {
        const eventDate = new Date(e.start);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return eventDate >= weekAgo;
      }).length
    };

    return {
      success: true,
      tasks: taskStats,
      events: eventStats
    };

  } catch (error) {
    console.error('📊 Error fetching dashboard stats:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get upcoming meetings/events for calendar widget
 */
export async function getUpcomingEvents(days = 7) {
  try {
    const events = await getDashboardEvents();

    if (!events.success) {
      throw new Error(events.error);
    }

    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const upcomingEvents = events.events
      .filter(event => {
        const eventDate = new Date(event.start);
        return eventDate >= now && eventDate <= futureDate;
      })
      .sort((a, b) => new Date(a.start) - new Date(b.start))
      .slice(0, 10); // Limit to 10 events

    return {
      success: true,
      events: upcomingEvents,
      total: upcomingEvents.length
    };

  } catch (error) {
    console.error('📅 Error fetching upcoming events:', error);
    return {
      success: false,
      error: error.message,
      events: []
    };
  }
}

export default {
  getDashboardTasks,
  getDashboardEvents,
  getDashboardStats,
  getUpcomingEvents
};
