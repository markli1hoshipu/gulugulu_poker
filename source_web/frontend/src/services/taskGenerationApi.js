const API_BASE_URL = import.meta.env.VITE_DASHBOARD_API_URL || 'http://localhost:8004';

class TaskGenerationApiError extends Error {
  constructor(message, status = null, response = null) {
    super(message);
    this.name = 'TaskGenerationApiError';
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

  const config = { ...defaultOptions, ...options };

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      const errorText = await response.text();
      throw new TaskGenerationApiError(
        `HTTP ${response.status}: ${errorText}`,
        response.status,
        response
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (error instanceof TaskGenerationApiError) {
      throw error;
    }

    console.error('Task Generation API request failed:', error);
    throw new TaskGenerationApiError(
      `Network error: ${error.message}`,
      null,
      null
    );
  }
}

/**
 * Helper functions for task generation
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
 * Generate tasks from client data using CRM AI agent
 */
export async function generateTasksFromClients(employeeEmail = null, sourceType = 'both') {
  try {
    console.log(`🎯 Generating tasks from client data using AI (source: ${sourceType})...`);

    // Get user email from auth context if not provided
    if (!employeeEmail) {
      // This should be passed from the component that has access to auth context
      throw new Error('Employee email is required. Please pass user email from auth context.');
    }

    const response = await makeRequest('/api/db-agent/task-feedback-clients', {
      method: 'POST',
      body: JSON.stringify({
        action: 'generate',
        employee_email: employeeEmail,
        source_type: sourceType // 'crm', 'leads', or 'both'
      })
    });

    if (response.success && response.tasks) {
      console.log(`🎯 Generated ${response.tasks.length} tasks from client data`);

      // Transform tasks to match expected format
      const suggestedTasks = response.tasks.map(task => ({
        id: `suggested-client-${task.id}`,
        title: task.title,
        description: task.description,
        type: task.metadata?.task_type === 'email' ? 'email-task' : 'client-task',
        status: 'pending',
        priority: task.priority,
        due: task.due_date,
        assignedTo: 'You',
        source: 'Client Data (AI)',
        estimatedHours: task.estimated_hours,
        goalAlignment: task.goal_alignment,
        metadata: {
          originalId: task.id,
          originalType: 'client',
          sessionId: response.session_id,
          employeeId: response.employee_id,
          goalAlignment: task.goal_alignment,
          // Include all task metadata for email functionality
          customer_name: task.metadata?.customer_name,
          customer_email: task.metadata?.customer_email,
          task_type: task.metadata?.task_type,
          email_type: task.metadata?.email_type,
          communication_method: task.metadata?.communication_method,
          // Keep original metadata for reference
          originalMetadata: task.metadata
        }
      }));

      return {
        success: true,
        tasks: suggestedTasks,
        total: suggestedTasks.length,
        sessionData: {
          sessionId: response.session_id,
          employeeId: response.employee_id,
          generatedAt: response.generated_at
        }
      };
    } else {
      throw new Error(response.error || 'Failed to generate tasks from client data');
    }

  } catch (error) {
    console.error('🎯 Error generating tasks from client data:', error);
    return {
      success: false,
      error: error.message,
      tasks: []
    };
  }
}



/**
 * Generate tasks from meetings
 */
export async function generateTasksFromMeetings() {
  try {
    console.log('📅 Generating tasks from meetings...');

    // TODO: Implement real meeting data integration
    // In a real scenario, you would:
    // 1. Query meeting data from calendar/meeting systems (Google Calendar, Outlook, etc.)
    // 2. Use AI to extract action items from meeting notes/transcripts
    // 3. Generate follow-up tasks based on meeting outcomes

    const suggestedTasks = [];

    // For now, return empty array until real meeting integration is implemented
    console.log('📅 Meeting integration not yet implemented - no tasks generated');

    return {
      success: true,
      tasks: suggestedTasks,
      total: suggestedTasks.length
    };

  } catch (error) {
    console.error('📅 Error generating tasks from meetings:', error);
    return {
      success: false,
      error: error.message,
      tasks: []
    };
  }
}

/**
 * Generate tasks from goals
 */
export async function generateTasksFromGoals(employeeEmail = null) {
  try {
    console.log('🎯 Generating tasks from goals...');

    // Get user email from auth context if not provided
    if (!employeeEmail) {
      // This should be passed from the component that has access to auth context
      throw new Error('Employee email is required. Please pass user email from auth context.');
    }

    const response = await makeRequest('/api/db-agent/task-feedback', {
      method: 'POST',
      body: JSON.stringify({
        action: 'generate',
        employee_email: employeeEmail
      })
    });

    if (response.success && response.tasks) {
      console.log(`🎯 Generated ${response.tasks.length} tasks from goals`);

      // Transform tasks to match expected format
      const suggestedTasks = response.tasks.map(task => ({
        id: `suggested-goal-${task.id}`,
        title: task.title,
        description: task.description,
        type: 'goal-task',
        status: 'pending',
        priority: task.priority,
        due: task.due_date,
        assignedTo: 'You',
        source: 'Goals',
        estimatedHours: task.estimated_hours,
        goalAlignment: task.goal_alignment,
        metadata: {
          originalId: task.id,
          originalType: 'goal',
          sessionId: response.session_id,
          employeeId: response.employee_id,
          goalAlignment: task.goal_alignment
        }
      }));

      return {
        success: true,
        tasks: suggestedTasks,
        total: suggestedTasks.length,
        sessionData: {
          sessionId: response.session_id,
          employeeId: response.employee_id,
          goalsUsed: response.goals_used
        }
      };
    } else {
      throw new Error(response.error || 'Failed to generate tasks from goals');
    }

  } catch (error) {
    console.error('🎯 Error generating tasks from goals:', error);
    return {
      success: false,
      error: error.message,
      tasks: []
    };
  }
}

/**
 * Refine tasks based on user feedback
 */
export async function refineTasksFromFeedback(feedback, currentTasks, sessionData, employeeEmail = null) {
  try {
    console.log('🔄 Refining tasks based on feedback...');

    if (!feedback || !feedback.trim()) {
      throw new Error('Feedback is required for task refinement');
    }

    if (!sessionData || !sessionData.sessionId) {
      throw new Error('Session data is required for task refinement');
    }

    // Get user email from auth context if not provided
    if (!employeeEmail) {
      throw new Error('Employee email is required for task refinement.');
    }

    // Transform current tasks back to backend format
    const backendTasks = currentTasks.map(task => ({
      id: task.metadata?.originalId || task.id,
      title: task.title,
      description: task.description,
      priority: task.priority,
      due_date: task.due,
      estimated_hours: task.estimatedHours || 2,
      goal_alignment: task.goalAlignment || task.metadata?.goalAlignment || '',
      dependencies: []
    }));

    const response = await makeRequest('/api/db-agent/task-feedback', {
      method: 'POST',
      body: JSON.stringify({
        action: 'refine',
        employee_email: employeeEmail,
        feedback: feedback,
        current_tasks: backendTasks,
        session_data: sessionData
      })
    });

    if (response.success && response.tasks) {
      console.log(`🔄 Refined ${response.tasks.length} tasks based on feedback`);

      // Transform refined tasks to match expected format
      const refinedTasks = response.tasks.map(task => ({
        id: `refined-goal-${task.id}`,
        title: task.title,
        description: task.description,
        type: 'goal-task',
        status: 'pending',
        priority: task.priority,
        due: task.due_date,
        assignedTo: 'You',
        source: 'Goals (Refined)',
        estimatedHours: task.estimated_hours,
        goalAlignment: task.goal_alignment,
        metadata: {
          originalId: task.id,
          originalType: 'goal',
          sessionId: response.session_id,
          employeeId: response.employee_id,
          goalAlignment: task.goal_alignment,
          feedbackApplied: response.feedback_applied
        }
      }));

      return {
        success: true,
        tasks: refinedTasks,
        total: refinedTasks.length,
        sessionData: {
          sessionId: response.session_id,
          employeeId: response.employee_id,
          feedbackApplied: response.feedback_applied
        }
      };
    } else {
      throw new Error(response.error || 'Failed to refine tasks based on feedback');
    }

  } catch (error) {
    console.error('🔄 Error refining tasks:', error);
    return {
      success: false,
      error: error.message,
      tasks: []
    };
  }
}

/**
 * Refine client tasks based on user feedback
 */
export async function refineClientTasksFromFeedback(currentTasks, feedback, sessionData, employeeEmail = null) {
  try {
    console.log('🔄 Refining client tasks based on feedback...');

    if (!feedback || feedback.trim() === '') {
      throw new Error('Feedback is required for task refinement');
    }

    if (!sessionData || !sessionData.sessionId) {
      throw new Error('Session data is required for task refinement');
    }

    // Get user email from auth context if not provided
    if (!employeeEmail) {
      throw new Error('Employee email is required for task refinement.');
    }

    // Transform current tasks back to backend format
    const backendTasks = currentTasks.map(task => ({
      id: task.metadata?.originalId || task.id,
      title: task.title,
      description: task.description,
      priority: task.priority,
      due_date: task.due,
      estimated_hours: task.estimatedHours || 2,
      client_alignment: task.clientAlignment || task.metadata?.clientAlignment || '',
      customer_id: task.metadata?.customer_id,
      lead_id: task.metadata?.lead_id,
      dependencies: []
    }));

    const response = await makeRequest('/api/db-agent/task-feedback-clients', {
      method: 'POST',
      body: JSON.stringify({
        action: 'refine',
        employee_email: employeeEmail,
        feedback: feedback,
        current_tasks: backendTasks,
        session_data: sessionData
      })
    });

    if (response.success && response.tasks) {
      console.log(`🔄 Refined ${response.tasks.length} client tasks based on feedback`);

      // Transform refined tasks to match expected format
      const refinedTasks = response.tasks.map(task => ({
        id: `refined-client-${task.id}`,
        title: task.title,
        description: task.description,
        type: 'client-task',
        status: 'pending',
        priority: task.priority,
        due: task.due_date,
        assignedTo: 'You',
        source: 'Clients (Refined)',
        estimatedHours: task.estimated_hours,
        clientAlignment: task.client_alignment,
        metadata: {
          originalId: task.id,
          originalType: 'client',
          customer_id: task.customer_id,
          lead_id: task.lead_id,
          refinedFromFeedback: true
        }
      }));

      return {
        success: true,
        tasks: refinedTasks,
        total: refinedTasks.length,
        sessionData: {
          sessionId: response.session_id,
          employeeId: response.employee_id,
          feedbackApplied: response.feedback_applied
        }
      };
    } else {
      throw new Error(response.error || 'Failed to refine client tasks based on feedback');
    }

  } catch (error) {
    console.error('🔄 Error refining client tasks:', error);
    return {
      success: false,
      error: error.message,
      tasks: []
    };
  }
}

/**
 * Save modified tasks to backend for persistence and learning
 */
export async function saveModifiedTasks(modifiedTasks, sessionData, employeeEmail = null) {
  try {
    console.log('💾 Saving modified tasks to backend...');

    if (!employeeEmail) {
      throw new Error('Employee email is required for saving modified tasks.');
    }

    const response = await makeRequest('/api/db-agent/save-modified-tasks', {
      method: 'POST',
      body: JSON.stringify({
        employee_email: employeeEmail,
        modified_tasks: modifiedTasks,
        session_data: sessionData || {}
      })
    });

    if (response.success) {
      console.log(`💾 Successfully saved ${response.tasks_saved} modified tasks`);
      return {
        success: true,
        message: response.message,
        tasks_saved: response.tasks_saved,
        saved_at: response.saved_at
      };
    } else {
      throw new Error(response.error || 'Failed to save modified tasks');
    }

  } catch (error) {
    console.error('💾 Error saving modified tasks:', error);
    return {
      success: false,
      error: error.message,
      tasks: []
    };
  }
}
/**
 * Transform a goal-generated task to match the dashboard API's TaskCreate model
 */
export function transformGoalTaskForAPI(task) {
  // Validate and transform priority
  const validPriorities = ['low', 'medium', 'high', 'urgent'];
  let priority = task.priority?.toLowerCase() || 'medium';
  if (!validPriorities.includes(priority)) {
    priority = 'medium'; // Default fallback
  }

  // Validate and transform status
  const validStatuses = ['not-started', 'in-progress', 'completed', 'on-hold', 'overdue'];
  let status = task.status === 'pending' ? 'not-started' : task.status;
  if (!validStatuses.includes(status)) {
    status = 'not-started'; // Default fallback
  }

  // Handle due date - ensure it's not in the past and properly formatted
  let due_date = null;
  if (task.due) {
    const taskDate = new Date(task.due);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day for comparison

    if (taskDate >= today) {
      // Ensure due_date is always a string in YYYY-MM-DD format
      due_date = taskDate.toISOString().split('T')[0];
    } else {
      // If date is in the past, set to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      due_date = tomorrow.toISOString().split('T')[0];
    }
  }

  // Extract source_id safely
  let source_id = null;
  if (task.metadata?.originalId) {
    source_id = String(task.metadata.originalId);
  } else if (task.id) {
    source_id = task.id.replace('suggested-goal-', '');
  }

  // Ensure all fields are properly serializable
  const transformedTask = {
    title: String(task.title?.trim() || 'Untitled Task'),
    description: task.description?.trim() ? String(task.description.trim()) : null,
    priority: String(priority),
    status: String(status),
    due_date: due_date, // Already a string or null
    source: 'Goal',
    source_id: source_id ? String(source_id) : null
  };

  // Log the transformed task for debugging
  console.log('Transformed goal task:', transformedTask);

  return transformedTask;
}

/**
 * Transform a client-generated task to match the dashboard API's TaskCreate model
 */
export function transformClientTaskForAPI(task) {
  // Validate and transform priority
  const validPriorities = ['low', 'medium', 'high', 'urgent'];
  let priority = task.priority?.toLowerCase() || 'medium';
  if (!validPriorities.includes(priority)) {
    priority = 'medium'; // Default fallback
  }

  // Validate and transform status
  const validStatuses = ['not-started', 'in-progress', 'completed', 'on-hold'];
  let status = task.status === 'pending' ? 'not-started' : task.status;
  if (!validStatuses.includes(status)) {
    status = 'not-started'; // Default fallback
  }

  // Handle due date - ensure it's not in the past and properly formatted
  let due_date = null;
  if (task.due) {
    const taskDate = new Date(task.due);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day for comparison

    if (taskDate >= today) {
      // Ensure due_date is always a string in YYYY-MM-DD format
      due_date = taskDate.toISOString().split('T')[0];
    } else {
      // If date is in the past, set to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      due_date = tomorrow.toISOString().split('T')[0];
    }
  }

  // Extract source_id safely - prioritize customer_id or lead_id from metadata
  let source_id = null;
  if (task.metadata?.customer_id) {
    source_id = String(task.metadata.customer_id);
  } else if (task.metadata?.lead_id) {
    source_id = String(task.metadata.lead_id);
  } else if (task.metadata?.originalId) {
    source_id = String(task.metadata.originalId);
  } else if (task.id) {
    source_id = task.id.replace('suggested-client-', '').replace('client_task_', '');
  }

  // Ensure all fields are properly serializable
  const transformedTask = {
    title: String(task.title?.trim() || 'Untitled Task'),
    description: task.description?.trim() ? String(task.description.trim()) : null,
    priority: String(priority),
    status: String(status),
    due_date: due_date, // Already a string or null
    source: 'Client',
    source_id: source_id ? String(source_id) : null
  };

  // Log the transformed task for debugging
  console.log('Transformed client task:', transformedTask);

  return transformedTask;
}

/**
 * Save multiple tasks to the dashboard database
 */
export async function saveTasksToDatabase(tasks, authToken) {
  const results = [];
  const errors = [];

  for (const task of tasks) {
    try {
      const transformedTask = transformGoalTaskForAPI(task);
      console.log('Sending goal task to API:', transformedTask);

      const response = await fetch('http://localhost:8004/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(transformedTask)
      });

      if (!response.ok) {
        let errorMessage = `Failed to create task: ${task.title}`;
        try {
          const errorData = await response.json();
          console.error('API Error Response:', errorData);
          errorMessage = errorData.detail || JSON.stringify(errorData) || errorMessage;
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const savedTask = await response.json();
      results.push({
        originalTask: task,
        savedTask: savedTask,
        success: true
      });

    } catch (error) {
      console.error(`Error saving task "${task.title}":`, error);
      errors.push({
        originalTask: task,
        error: error.message,
        success: false
      });
    }
  }

  return {
    success: errors.length === 0,
    results: results,
    errors: errors,
    totalTasks: tasks.length,
    successCount: results.length,
    errorCount: errors.length
  };
}

/**
 * Save multiple client tasks to the dashboard database
 */
export async function saveClientTasksToDatabase(tasks, authToken) {
  const results = [];
  const errors = [];

  for (const task of tasks) {
    try {
      const transformedTask = transformClientTaskForAPI(task);
      console.log('Sending client task to API:', transformedTask);

      const response = await fetch('http://localhost:8004/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(transformedTask)
      });

      if (!response.ok) {
        let errorMessage = `Failed to create task: ${task.title}`;
        try {
          const errorData = await response.json();
          console.error('API Error Response:', errorData);
          errorMessage = errorData.detail || JSON.stringify(errorData) || errorMessage;
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const savedTask = await response.json();
      results.push({
        originalTask: task,
        savedTask: savedTask,
        success: true
      });

    } catch (error) {
      console.error(`Error saving client task "${task.title}":`, error);
      errors.push({
        originalTask: task,
        error: error.message,
        success: false
      });
    }
  }

  return {
    success: errors.length === 0,
    results: results,
    errors: errors,
    totalTasks: tasks.length,
    successCount: results.length,
    errorCount: errors.length
  };
}

/**
 * Update a full task via dashboard API
 */
export async function updateTask(taskId, taskData, authToken) {
  try {
    const response = await fetch(`http://localhost:8004/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(taskData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Failed to update task`);
    }

    const updatedTask = await response.json();
    return {
      success: true,
      task: updatedTask
    };

  } catch (error) {
    console.error(`Error updating task ${taskId}:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Update task status via dashboard API
 */
export async function updateTaskStatus(taskId, newStatus, authToken) {
  try {
    const response = await fetch(`http://localhost:8004/api/tasks/${taskId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        status: newStatus
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Failed to update task status`);
    }

    const updatedTask = await response.json();
    return {
      success: true,
      task: updatedTask
    };

  } catch (error) {
    console.error(`Error updating task ${taskId} status:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Update multiple tasks status (bulk update)
 */
export async function updateMultipleTasksStatus(taskIds, newStatus, authToken) {
  const results = [];
  const errors = [];

  for (const taskId of taskIds) {
    const result = await updateTaskStatus(taskId, newStatus, authToken);
    if (result.success) {
      results.push(result.task);
    } else {
      errors.push({ taskId, error: result.error });
    }
  }

  return {
    success: errors.length === 0,
    results: results,
    errors: errors,
    totalTasks: taskIds.length,
    successCount: results.length,
    errorCount: errors.length
  };
}

/**
 * Delete a single task via dashboard API
 */
export async function deleteTask(taskId, authToken) {
  try {
    const response = await fetch(`http://localhost:8004/api/tasks/${taskId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Failed to delete task`);
    }

    return {
      success: true,
      taskId: taskId
    };

  } catch (error) {
    console.error(`Error deleting task ${taskId}:`, error);
    return {
      success: false,
      taskId: taskId,
      error: error.message
    };
  }
}

/**
 * Delete multiple tasks (bulk delete)
 */
export async function deleteMultipleTasks(taskIds, authToken) {
  const results = [];
  const errors = [];

  for (const taskId of taskIds) {
    const result = await deleteTask(taskId, authToken);
    if (result.success) {
      results.push(result.taskId);
    } else {
      errors.push({ taskId, error: result.error });
    }
  }

  return {
    success: errors.length === 0,
    results: results,
    errors: errors,
    totalTasks: taskIds.length,
    successCount: results.length,
    errorCount: errors.length
  };
}

export function convertSuggestedTasksToActual(suggestedTasks) {
  return suggestedTasks.map(task => ({
    ...task,
    id: task.metadata?.originalType === 'lead'
      ? `lead-${task.metadata.leadId}`
      : task.metadata?.originalType === 'interaction'
      ? `interaction-${task.metadata.interactionId}`
      : task.metadata?.originalType === 'goal'
      ? `goal-${task.metadata.originalId || task.id}`
      : `manual-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString(),
    // Remove the suggested- prefix and metadata if not needed
    metadata: {
      ...task.metadata,
      generatedFrom: task.source,
      acceptedAt: new Date().toISOString()
    }
  }));
}