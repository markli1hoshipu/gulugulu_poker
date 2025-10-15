/**
 * Employee API Service
 * Provides methods to interact with the employee management backend
 */

const EMPLOYEE_API_BASE_URL = import.meta.env.VITE_EMPLOYEE_API_URL || 'http://localhost:7001';

class EmployeeApiError extends Error {
  constructor(message, status = null, data = null) {
    super(message);
    this.name = 'EmployeeApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Handle API responses and errors consistently
 * @param {Response} response - Fetch response object
 * @returns {Promise<any>} Parsed response data
 */
async function handleApiResponse(response) {
  const contentType = response.headers.get('content-type');
  let data;

  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    // Handle FastAPI validation errors (422)
    if (response.status === 422 && data.detail) {
      // FastAPI returns validation errors as an array in the detail field
      const errorMessages = data.detail.map(err => {
        const field = err.loc[err.loc.length - 1];
        return `${field}: ${err.msg}`;
      }).join(', ');
      throw new EmployeeApiError(
        errorMessages || 'Validation error',
        response.status,
        data
      );
    }
    
    throw new EmployeeApiError(
      data.detail || data.message || `HTTP ${response.status}`,
      response.status,
      data
    );
  }

  return data;
}

/**
 * Parse JSON field safely with fallback
 * @param {any} field - Field that might be JSON string or object
 * @param {any} defaultValue - Default value if parsing fails
 * @returns {any} Parsed value or default
 */
function parseJsonField(field, defaultValue) {
  if (field === null || field === undefined || field === '') {
    return defaultValue;
  }

  if (typeof field === 'string') {
    try {
      return JSON.parse(field);
    } catch (error) {
      console.warn('Failed to parse JSON field:', field, error);
      return defaultValue;
    }
  }

  return field;
}

/**
 * Transform API employee data to frontend format
 * @param {Object} apiEmployee - Employee data from API
 * @returns {Object} Transformed employee data
 */
function transformEmployeeData(apiEmployee) {
  return {
    ...apiEmployee,
    // Provide safe defaults for potentially null fields
    name: apiEmployee.name || "Unknown",
    role: apiEmployee.role || "No Role",
    department: apiEmployee.department || "No Department", 
    email: apiEmployee.email || "",
    hire_date: apiEmployee.hire_date || null,
    availability: apiEmployee.availability || "available",
    // Transform flat performance fields to nested object
    performance: {
      score: apiEmployee.performance_score || 80,
      dealsWon: apiEmployee.deals_won || 0,
      responseTime: apiEmployee.response_time || '2 hours'
    },
    // Ensure arrays are properly handled
    specialties: apiEmployee.specialties || [],
    strengths: apiEmployee.strengths || [],
    recent_achievements: apiEmployee.recent_achievements || [],
    // Map snake_case to camelCase for frontend consistency
    currentProjects: apiEmployee.current_projects || 0,
    completionRate: apiEmployee.completion_rate || 85,
    recentAchievements: apiEmployee.recent_achievements || [],
    // Add experience as an alias for working_year for backward compatibility
    experience: apiEmployee.working_year || 0,
    // Handle JSON fields - ensure they're properly parsed if they come as strings
    skills: parseJsonField(apiEmployee.skills, { technical: [], domain: [], methodologies: [], certifications: [] }),
    languages: parseJsonField(apiEmployee.languages, []),
    experiences: parseJsonField(apiEmployee.experiences, []),
    mbti_profile: parseJsonField(apiEmployee.mbti_profile, {
      type: "",
      nickname: "",
      percentages: { extravert: 50, intuitive: 50, thinking: 50, judging: 50 },
      workingStyle: [],
      communicationPreferences: [],
      idealCollaboration: ""
    }),
    location: parseJsonField(apiEmployee.location, {})
  };
}

/**
 * Transform frontend employee data to API format
 * @param {Object} frontendEmployee - Employee data from frontend
 * @returns {Object} Transformed employee data for API
 */
function transformEmployeeForApi(frontendEmployee) {
  const apiEmployee = { ...frontendEmployee };

  // Transform nested performance object to flat fields
  if (frontendEmployee.performance) {
    apiEmployee.performance_score = frontendEmployee.performance.score;
    apiEmployee.deals_won = frontendEmployee.performance.dealsWon;
    apiEmployee.response_time = frontendEmployee.performance.responseTime;
    delete apiEmployee.performance;
  }

  // Map camelCase to snake_case for API
  if (frontendEmployee.currentProjects !== undefined) {
    apiEmployee.current_projects = frontendEmployee.currentProjects;
    delete apiEmployee.currentProjects;
  }

  if (frontendEmployee.completionRate !== undefined) {
    apiEmployee.completion_rate = frontendEmployee.completionRate;
    delete apiEmployee.completionRate;
  }

  if (frontendEmployee.recentAchievements !== undefined) {
    apiEmployee.recent_achievements = frontendEmployee.recentAchievements;
    delete apiEmployee.recentAchievements;
  }

  // Fix field name mismatches for employee creation
  if (frontendEmployee.start_date) {
    apiEmployee.hire_date = frontendEmployee.start_date;
    delete apiEmployee.start_date;
  }

  if (frontendEmployee.job_title && !apiEmployee.role) {
    apiEmployee.role = frontendEmployee.job_title;
  }
  delete apiEmployee.job_title;

  // Add email if missing (use a default pattern if not provided)
  if (!apiEmployee.email && apiEmployee.name) {
    // Generate a default email from name
    const emailName = apiEmployee.name.toLowerCase().replace(/\s+/g, '.');
    apiEmployee.email = `${emailName}@company.com`;
  }

  // Ensure location is an object (backend expects Dict)
  if (!apiEmployee.location) {
    apiEmployee.location = {};
  }

  // Transform employee_id to id for backend
  if (apiEmployee.employee_id) {
    apiEmployee.id = parseInt(apiEmployee.employee_id, 10);
    delete apiEmployee.employee_id;
  }
  
  // Remove fields that backend doesn't expect
  delete apiEmployee.manager;
  delete apiEmployee.manager_notes;

  // Ensure working_year instead of experience
  if (apiEmployee.experience !== undefined && apiEmployee.working_year === undefined) {
    apiEmployee.working_year = apiEmployee.experience;
  }
  delete apiEmployee.experience;

  return apiEmployee;
}

class EmployeeApiService {
  constructor() {
    this.baseUrl = EMPLOYEE_API_BASE_URL;
  }

  /**
   * Get all employees with optional filtering
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} List of employees
   */
  async getAllEmployees(filters = {}) {
    const params = new URLSearchParams();

    if (filters.department) params.append('department', filters.department);
    if (filters.search) params.append('search', filters.search);
    if (filters.working_year !== undefined) params.append('working_year', filters.working_year);
    // Backward compatibility for experience parameter
    else if (filters.experience !== undefined) params.append('working_year', filters.experience);
    if (filters.timezone) params.append('timezone', filters.timezone);
    if (filters.performance_score !== undefined) params.append('performance_score', filters.performance_score);
    if (filters.include_feedback) params.append('include_feedback', filters.include_feedback);

    const queryString = params.toString();
    const url = `${EMPLOYEE_API_BASE_URL}/api/employees${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const employees = await handleApiResponse(response);
    return employees.map(transformEmployeeData);
  }

  /**
   * Get all employees with their performance data
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} List of employees with performance data
   */
  async getAllEmployeesWithPerformance(filters = {}) {
    try {
      // Get all employees
      const employees = await this.getAllEmployees(filters);
      
      // Get performance data for each employee
      const employeesWithPerformance = await Promise.all(
        employees.map(async (employee) => {
          try {
            const performance = await this.getEmployeePerformance(employee.id);
            return {
              ...employee,
              performance
            };
          } catch (error) {
            console.error(`Failed to fetch performance for employee ${employee.id}:`, error);
            // Return employee with default performance data
            return {
              ...employee,
              performance: {
                total_revenue: 0,
                total_projects: 0,
                performance_score: 0,
                peer_evaluations: {
                  averageScore: 0,
                  totalReviews: 0,
                  feedback: []
                },
                self_assessments: {
                  lastUpdated: "",
                  strengths: [],
                  growthAreas: [],
                  goals: []
                }
              }
            };
          }
        })
      );
      
      return employeesWithPerformance;
    } catch (error) {
      console.error('Failed to fetch employees with performance:', error);
      throw error;
    }
  }

  /**
   * Get employee by ID
   * @param {number} id - Employee ID
   * @returns {Promise<Object>} Employee data
   */
  async getEmployeeById(id) {
    const response = await fetch(`${EMPLOYEE_API_BASE_URL}/api/employees/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const employee = await handleApiResponse(response);
    return transformEmployeeData(employee);
  }

  /**
   * Get employee by email
   * @param {string} email - Employee email
   * @returns {Promise<Object>} Employee data
   */
  async getEmployeeByEmail(email) {
    console.log('EmployeeApi: getEmployeeByEmail called with email:', email);
    console.log('EmployeeApi: Base URL:', EMPLOYEE_API_BASE_URL);
    
    // Use query parameter instead of path parameter to avoid URL encoding issues with @ symbol
    const url = `${EMPLOYEE_API_BASE_URL}/api/employees/by-email?email=${encodeURIComponent(email)}`;
    console.log('EmployeeApi: Making request to URL:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('EmployeeApi: Response status:', response.status, response.statusText);
    console.log('EmployeeApi: Response ok:', response.ok);
    
    const employee = await handleApiResponse(response);
    console.log('EmployeeApi: Raw employee data from API:', employee);
    
    const transformedEmployee = transformEmployeeData(employee);
    console.log('EmployeeApi: Transformed employee data:', transformedEmployee);
    
    return transformedEmployee;
  }

  /**
   * Get employee performance data by ID
   * @param {number} id - Employee ID
   * @returns {Promise<Object>} Employee performance data
   */
  async getEmployeePerformance(id) {
    console.log('EmployeeApi: getEmployeePerformance called with ID:', id);
    
    const url = `${EMPLOYEE_API_BASE_URL}/api/employees/${id}/performance`;
    console.log('EmployeeApi: Making performance request to URL:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('EmployeeApi: Performance response status:', response.status, response.statusText);
    
    const performance = await handleApiResponse(response);
    console.log('EmployeeApi: Raw performance data from API:', performance);

    // Ensure all JSON fields are properly parsed
    const transformedPerformance = {
      ...performance,
      projects: parseJsonField(performance.projects, []),
      top_projects: parseJsonField(performance.top_projects, []),
      milestones: parseJsonField(performance.milestones, []),
      peer_evaluations: parseJsonField(performance.peer_evaluations, {
        averageScore: 4.5,
        totalReviews: 0,
        feedback: []
      }),
      self_assessments: parseJsonField(performance.self_assessments, {
        lastUpdated: "",
        strengths: [],
        growthAreas: [],
        goals: []
      }),
      employee_goal: parseJsonField(performance.employee_goal, []),
      // Ensure performance_score is available with fallback
      performance_score: performance.performance_score || 80
    };
    
    console.log('EmployeeApi: Transformed performance data:', transformedPerformance);
    return transformedPerformance;
  }

  /**
   * Update employee performance data
   * @param {number} id - Employee ID
   * @param {Object} performanceData - Performance data to update
   * @returns {Promise<Object>} Updated performance data
   */
  async updateEmployeePerformance(id, performanceData) {
    const response = await fetch(`${EMPLOYEE_API_BASE_URL}/api/employees/${id}/performance`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(performanceData),
    });

    const performance = await handleApiResponse(response);
    return performance;
  }

  /**
   * Get customers by employee ID
   * @param {number} id - Employee ID
   * @returns {Promise<Array>} List of customers
   */
  async getCustomersByEmployee(id) {
    const response = await fetch(`${EMPLOYEE_API_BASE_URL}/api/customers/by-employee/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const customers = await handleApiResponse(response);
    return customers;
  }

  /**
   * Get leads by employee ID
   * @param {number} id - Employee ID
   * @returns {Promise<Array>} List of leads
   */
  async getLeadsByEmployee(id) {
    const response = await fetch(`${EMPLOYEE_API_BASE_URL}/api/customers/leads/by-employee/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const leads = await handleApiResponse(response);
    return leads;
  }

  /**
   * Create a new employee
   * @param {Object} employee - Employee data
   * @returns {Promise<Object>} Created employee data
   */
  async createEmployee(employee) {
    const apiEmployee = transformEmployeeForApi(employee);

    const response = await fetch(`${EMPLOYEE_API_BASE_URL}/api/employees/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(apiEmployee),
    });

    const createdEmployee = await handleApiResponse(response);
    return transformEmployeeData(createdEmployee);
  }

  /**
   * Update an existing employee
   * @param {number} id - Employee ID
   * @param {Object} employee - Updated employee data
   * @returns {Promise<Object>} Updated employee data
   */
  async updateEmployee(id, employee) {
    const apiEmployee = transformEmployeeForApi(employee);

    const response = await fetch(`${EMPLOYEE_API_BASE_URL}/api/employees/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(apiEmployee),
    });

    const updatedEmployee = await handleApiResponse(response);
    return transformEmployeeData(updatedEmployee);
  }

  /**
   * Delete an employee
   * @param {number} id - Employee ID
   * @returns {Promise<Object>} Deletion result
   */
  async deleteEmployee(id) {
    const response = await fetch(`${EMPLOYEE_API_BASE_URL}/api/employees/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return handleApiResponse(response);
  }

  /**
   * Get list of departments
   * @returns {Promise<Array>} List of departments
   */
  async getDepartments() {
    const response = await fetch(`${EMPLOYEE_API_BASE_URL}/api/employees/departments`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await handleApiResponse(response);
    return result.departments || [];
  }

  /**
   * Get list of timezones
   * @returns {Promise<Array>} List of timezones
   */
  async getTimezones() {
    const response = await fetch(`${EMPLOYEE_API_BASE_URL}/api/employees/timezones`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await handleApiResponse(response);
    return result.timezones || [];
  }

  /**
   * Get employee metrics summary
   * @returns {Promise<Object>} Metrics summary
   */
  async getMetricsSummary() {
    const response = await fetch(`${EMPLOYEE_API_BASE_URL}/api/employees/metrics/summary`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return handleApiResponse(response);
  }

  /**
   * Get employee goals
   * @param {number} employeeId - Employee ID
   * @returns {Promise<Array>} Employee goals
   */
  async getEmployeeGoals(employeeId) {
    const response = await fetch(`${EMPLOYEE_API_BASE_URL}/api/employees/${employeeId}/goals`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await handleApiResponse(response);
    return result.goals || [];
  }

  /**
   * Save employee goals
   * @param {number} employeeId - Employee ID
   * @param {Array} goals - Goals array
   * @returns {Promise<Array>} Saved goals
   */
  async saveEmployeeGoals(employeeId, goals) {
    const response = await fetch(`${EMPLOYEE_API_BASE_URL}/api/employees/${employeeId}/goals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ goals }),
    });

    const result = await handleApiResponse(response);
    return result.goals || [];
  }

  /**
   * Update a specific employee goal
   * @param {number} employeeId - Employee ID
   * @param {number} goalId - Goal ID
   * @param {Object} goalData - Updated goal data
   * @returns {Promise<Object>} Updated goal
   */
  async updateEmployeeGoal(employeeId, goalId, goalData) {
    const response = await fetch(`${EMPLOYEE_API_BASE_URL}/api/employees/${employeeId}/goals/${goalId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(goalData),
    });

    const result = await handleApiResponse(response);
    return result.goal;
  }

  /**
   * Delete a specific employee goal
   * @param {number} employeeId - Employee ID
   * @param {number} goalId - Goal ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteEmployeeGoal(employeeId, goalId) {
    const response = await fetch(`${EMPLOYEE_API_BASE_URL}/api/employees/${employeeId}/goals/${goalId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await handleApiResponse(response);
    return result.deleted || false;
  }


  /**
   * Check API health
   * @returns {Promise<Object>} Health status
   */
  async checkHealth() {
    const response = await fetch(`${EMPLOYEE_API_BASE_URL}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return handleApiResponse(response);
  }

  // Customer Feedback Methods

  /**
   * Get all employees with customer feedback data included
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} List of employees with feedback data
   */
  async getAllEmployeesWithFeedback(filters = {}) {
    return this.getAllEmployees({ ...filters, include_feedback: true });
  }

  /**
   * Get all employees with both performance and customer feedback data
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} List of employees with complete performance and feedback data
   */
  async getAllEmployeesWithPerformanceAndFeedback(filters = {}) {
    try {
      // 1. Get employees with performance data
      const employeesWithPerformance = await this.getAllEmployeesWithPerformance(filters);
      
      // 2. Enhance with feedback data
      const enhancedEmployees = await Promise.all(
        employeesWithPerformance.map(async (employee) => {
          try {
            // Call the feedback summary API directly to handle 404s properly
            const response = await fetch(`${EMPLOYEE_API_BASE_URL}/api/employees/${employee.id}/feedback/summary`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
            });

            let feedbackSummary = null;
            if (response.ok) {
              feedbackSummary = await response.json();
            } else if (response.status === 404) {
              // No feedback found - this is expected for many employees
              feedbackSummary = null;
            } else {
              // Other errors should be logged
              console.warn(`Failed to fetch feedback for employee ${employee.id}: ${response.status} ${response.statusText}`);
              feedbackSummary = null;
            }

            return {
              ...employee,
              feedback_rating: feedbackSummary?.average_rating || null,
              feedback_comment: feedbackSummary?.recent_comment || null,
              feedback_count: feedbackSummary?.total_feedback || 0
            };
          } catch (error) {
            console.warn(`Network error fetching feedback for employee ${employee.id}:`, error);
            // Return employee without feedback data if network fails
            return {
              ...employee,
              feedback_rating: null,
              feedback_comment: null,
              feedback_count: 0
            };
          }
        })
      );
      
      return enhancedEmployees;
    } catch (error) {
      console.error('Failed to fetch employees with performance and feedback:', error);
      throw error;
    }
  }

  /**
   * Get customer feedback for a specific employee
   * @param {number} employeeId - Employee ID
   * @returns {Promise<Array>} List of customer feedback
   */
  async getEmployeeFeedback(employeeId) {
    const response = await fetch(`${EMPLOYEE_API_BASE_URL}/api/employees/${employeeId}/feedback`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return handleApiResponse(response);
  }

  /**
   * Get customer feedback summary for a specific employee
   * @param {number} employeeId - Employee ID
   * @returns {Promise<Object>} Feedback summary data
   */
  async getEmployeeFeedbackSummary(employeeId) {
    const response = await fetch(`${EMPLOYEE_API_BASE_URL}/api/employees/${employeeId}/feedback/summary`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return handleApiResponse(response);
  }

  /**
   * Get all customer feedback across all employees
   * @returns {Promise<Array>} List of all customer feedback
   */
  async getAllCustomerFeedback() {
    const response = await fetch(`${EMPLOYEE_API_BASE_URL}/api/employees/feedback/all`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return handleApiResponse(response);
  }



  /**
   * Create new customer feedback
   * @param {Object} feedback - Feedback data
   * @returns {Promise<Object>} Created feedback
   */
  async createCustomerFeedback(feedback) {
    const response = await fetch(`${EMPLOYEE_API_BASE_URL}/api/employees/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(feedback),
    });

    return handleApiResponse(response);
  }

  // Project Management Methods

  /**
   * Calculate total revenue from projects array
   * @param {Array} projects - Array of project objects
   * @returns {number} Total revenue from all projects
   */
  _calculateTotalRevenue(projects) {
    try {
      if (!projects || !Array.isArray(projects)) {
        return 0;
      }
      
      return projects.reduce((total, project) => {
        if (project && typeof project.revenue === 'number' && project.revenue >= 0) {
          return total + project.revenue;
        }
        return total;
      }, 0);
    } catch (error) {
      console.error('Error calculating total revenue:', error);
      return 0;
    }
  }

  /**
   * Add a new project to employee performance data
   * @param {number} employeeId - Employee ID
   * @param {Object} projectData - Project data
   * @returns {Promise<Object>} Updated performance data
   */
  async addProject(employeeId, projectData) {
    // Get current performance data
    const performanceData = await this.getEmployeePerformance(employeeId);
    
    // Add new project to projects array
    const updatedProjects = [...(performanceData.projects || []), projectData];
    
    // Calculate new total revenue with error handling
    let calculatedTotalRevenue;
    try {
      calculatedTotalRevenue = this._calculateTotalRevenue(updatedProjects);
    } catch (error) {
      console.warn('Failed to calculate total revenue, using existing value:', error);
      calculatedTotalRevenue = performanceData.total_revenue || 0;
    }
    
    const updatedPerformanceData = {
      ...performanceData,
      projects: updatedProjects,
      total_revenue: calculatedTotalRevenue
    };

    // Update performance data
    return await this.updateEmployeePerformance(employeeId, updatedPerformanceData);
  }

  /**
   * Update an existing project in employee performance data
   * @param {number} employeeId - Employee ID
   * @param {number} projectId - Project ID
   * @param {Object} projectData - Updated project data
   * @returns {Promise<Object>} Updated performance data
   */
  async updateProject(employeeId, projectId, projectData) {
    // Get current performance data
    const performanceData = await this.getEmployeePerformance(employeeId);
    
    // Update the specific project
    const updatedProjects = (performanceData.projects || []).map(project => 
      project.id === projectId ? { ...project, ...projectData } : project
    );
    
    // Calculate new total revenue with error handling
    let calculatedTotalRevenue;
    try {
      calculatedTotalRevenue = this._calculateTotalRevenue(updatedProjects);
    } catch (error) {
      console.warn('Failed to calculate total revenue, using existing value:', error);
      calculatedTotalRevenue = performanceData.total_revenue || 0;
    }
    
    const updatedPerformanceData = {
      ...performanceData,
      projects: updatedProjects,
      total_revenue: calculatedTotalRevenue
    };

    // Update performance data
    return await this.updateEmployeePerformance(employeeId, updatedPerformanceData);
  }

  /**
   * Delete a project from employee performance data
   * @param {number} employeeId - Employee ID
   * @param {number} projectId - Project ID
   * @returns {Promise<Object>} Updated performance data
   */
  async deleteProject(employeeId, projectId) {
    // Get current performance data
    const performanceData = await this.getEmployeePerformance(employeeId);
    
    // Remove the project
    const updatedProjects = (performanceData.projects || []).filter(project => project.id !== projectId);
    
    // Calculate new total revenue with error handling
    let calculatedTotalRevenue;
    try {
      calculatedTotalRevenue = this._calculateTotalRevenue(updatedProjects);
    } catch (error) {
      console.warn('Failed to calculate total revenue, using existing value:', error);
      calculatedTotalRevenue = performanceData.total_revenue || 0;
    }
    
    const updatedPerformanceData = {
      ...performanceData,
      projects: updatedProjects,
      total_revenue: calculatedTotalRevenue
    };

    // Update performance data
    return await this.updateEmployeePerformance(employeeId, updatedPerformanceData);
  }

  // Milestone Management Methods

  /**
   * Add a new milestone to employee performance data
   * @param {number} employeeId - Employee ID
   * @param {Object} milestoneData - Milestone data
   * @returns {Promise<Object>} Updated performance data
   */
  async addMilestone(employeeId, milestoneData) {
    // Get current performance data
    const performanceData = await this.getEmployeePerformance(employeeId);
    
    // Add new milestone to milestones array
    const updatedMilestones = [...(performanceData.milestones || []), milestoneData];
    const updatedPerformanceData = {
      ...performanceData,
      milestones: updatedMilestones
    };

    // Update performance data
    return await this.updateEmployeePerformance(employeeId, updatedPerformanceData);
  }

  /**
   * Update an existing milestone in employee performance data
   * @param {number} employeeId - Employee ID
   * @param {number} milestoneId - Milestone ID
   * @param {Object} milestoneData - Updated milestone data
   * @returns {Promise<Object>} Updated performance data
   */
  async updateMilestone(employeeId, milestoneId, milestoneData) {
    // Get current performance data
    const performanceData = await this.getEmployeePerformance(employeeId);
    
    // Update the specific milestone
    const updatedMilestones = (performanceData.milestones || []).map(milestone => 
      milestone.id === milestoneId ? { ...milestone, ...milestoneData } : milestone
    );
    const updatedPerformanceData = {
      ...performanceData,
      milestones: updatedMilestones
    };

    // Update performance data
    return await this.updateEmployeePerformance(employeeId, updatedPerformanceData);
  }

  /**
   * Delete a milestone from employee performance data
   * @param {number} employeeId - Employee ID
   * @param {number} milestoneId - Milestone ID
   * @returns {Promise<Object>} Updated performance data
   */
  async deleteMilestone(employeeId, milestoneId) {
    // Get current performance data
    const performanceData = await this.getEmployeePerformance(employeeId);
    
    // Remove the milestone
    const updatedMilestones = (performanceData.milestones || []).filter(milestone => milestone.id !== milestoneId);
    const updatedPerformanceData = {
      ...performanceData,
      milestones: updatedMilestones
    };

    // Update performance data
    return await this.updateEmployeePerformance(employeeId, updatedPerformanceData);
  }
}

// Create and export service instance
const employeeApiService = new EmployeeApiService();

export default employeeApiService;

// Export error class for error handling
export { EmployeeApiError };