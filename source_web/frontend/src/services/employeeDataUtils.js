/**
 * Utility functions for processing employee data from API
 * Replaces mock data generators with real data processing
 */

/**
 * Calculate employee highlights from real data
 * @param {Array} employees - Array of employees with performance data
 * @returns {Object} Highlight data for highest revenue, most experienced, top performance, and best feedback
 */
export const calculateHighlightsFromRealData = (employees) => {
  if (!employees || employees.length === 0) {
    return {
      highestRevenue: null,
      mostExperienced: null,
      topPerformance: null,
      bestFeedback: null
    };
  }

  // Highest Revenue (real data)
  const highestRevenue = employees.reduce((max, emp) => {
    const empRevenue = emp.performance?.total_revenue || 0;
    const maxRevenue = max.performance?.total_revenue || 0;
    return empRevenue > maxRevenue ? emp : max;
  }, employees[0]);

  // Most Experienced (real data)
  const mostExperienced = employees.reduce((max, emp) => {
    // Use working_year first, fall back to experience for backward compatibility
    const empExperience = emp.working_year || emp.experience || 0;
    const maxExperience = max.working_year || max.experience || 0;
    return empExperience > maxExperience ? emp : max;
  }, employees[0]);

  // Top Performance (real data)
  const topPerformance = employees.reduce((max, emp) => {
    // Access performance_score directly from employee object (set by enrichEmployeeData)
    const empScore = emp.performance_score || 80;
    const maxScore = max.performance_score || 80;
    return empScore > maxScore ? emp : max;
  }, employees[0]);

  // Best Feedback (real data if available)
  const bestFeedback = employees.reduce((max, emp) => {
    const empRating = emp.feedback_rating || emp.performance?.peer_evaluations?.averageScore || 0;
    const maxRating = max.feedback_rating || max.performance?.peer_evaluations?.averageScore || 0;
    return empRating > maxRating ? emp : max;
  }, employees[0]);

  return {
    highestRevenue: {
      ...highestRevenue,
      revenue: highestRevenue.performance?.total_revenue || 0
    },
    mostExperienced,
    topPerformance: {
      ...topPerformance,
      score: topPerformance.performance_score || 80
    },
    bestFeedback: {
      ...bestFeedback,
      rating: bestFeedback.feedback_rating || bestFeedback.performance?.peer_evaluations?.averageScore || 0,
      snippet: bestFeedback.feedback_comment || bestFeedback.performance?.peer_evaluations?.feedback?.[0] || "No feedback available"
    }
  };
};

/**
 * Generate card data from real employee data
 * @param {Object} employee - Employee object with performance data
 * @param {string} mode - Display mode (revenue, experience, performance, feedback)
 * @returns {Object} Card data for the specified mode
 */
export const generateCardDataFromRealData = (employee, mode) => {
  switch (mode) {
    case 'revenue':
      return {
        title: 'Revenue Contribution',
        value: `$${(employee.performance?.total_revenue || 0).toLocaleString()}`,
        subtitle: 'Total Revenue',
        icon: 'DollarSign',
        bgColor: 'bg-green-50'
      };
    case 'experience': {
      // Use working_year first, fall back to experience for backward compatibility
      const yearsOfExperience = employee.working_year || employee.experience || 0;
      return {
        title: 'Experience',
        value: `${yearsOfExperience} years`,
        subtitle: 'Professional Experience',
        icon: 'Award',
        bgColor: 'bg-blue-50'
      };
    }
    case 'performance': {
      // Access performance_score directly from employee object (set by enrichEmployeeData)
      const performanceScore = employee.performance_score || 80;
      return {
        title: 'Performance Score',
        value: `${performanceScore}%`,
        subtitle: 'Recent Performance',
        icon: 'TrendingUp',
        bgColor: 'bg-purple-50'
      };
    }
    case 'feedback': {
      const rating = employee.feedback_rating || employee.performance?.peer_evaluations?.averageScore || 0;
      return {
        title: 'Feedback Rating',
        value: `${rating.toFixed(1)} ⭐`,
        subtitle: 'Average Rating',
        icon: 'Heart',
        bgColor: 'bg-pink-50'
      };
    }
    default:
      return generateCardDataFromRealData(employee, 'revenue');
  }
};

/**
 * Get sorting value for an employee based on display mode
 * @param {Object} employee - Employee object with performance data
 * @param {string} mode - Display mode (revenue, experience, performance, feedback)
 * @returns {number} Value for sorting
 */
export const getEmployeeSortValue = (employee, mode) => {
  switch (mode) {
    case 'revenue':
      return employee.performance?.total_revenue || 0;
    case 'experience':
      // Use working_year first, fall back to experience for backward compatibility
      return employee.working_year || employee.experience || 0;
    case 'performance':
      // Access performance_score directly from employee object (set by enrichEmployeeData)
      return employee.performance_score || 80;
    case 'feedback':
      return employee.feedback_rating || employee.performance?.peer_evaluations?.averageScore || 0;
    default:
      return employee.performance?.total_revenue || 0;
  }
}; 