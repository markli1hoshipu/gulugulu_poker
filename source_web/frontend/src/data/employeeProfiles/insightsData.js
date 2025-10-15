// Department benchmarks and insights templates extracted from InsightsTab.jsx
// Contains calculation functions and template data for dynamic insights generation

export const departmentBenchmarks = {
  'Sales': 75,
  'Customer Success': 82,
  'Professional Services': 78,
  'Engineering': 82,
  'Marketing': 76,
  'Operations': 79
};

// Success pattern templates that dynamically reference employee data
export const successPatternTemplates = {
  experienceAdvantage: (employee) => {
    const experience = employee.experience || 2;
    let description = `With ${experience} years of experience, this employee shows`;
    
    if (experience >= 5) {
      description += ' exceptional leadership and mentoring capabilities';
    } else if (experience >= 3) {
      description += ' strong problem-solving skills and client relationship management';
    } else {
      description += ' rapid learning and adaptability in new situations';
    }
    
    return description;
  },

  strengthUtilization: (employee) => {
    const strengths = employee.strengths?.slice(0, 2).join(' and ') || 'communication and problem-solving';
    const department = employee.department || 'Sales';
    
    let contribution = '';
    switch (department) {
      case 'Sales':
        contribution = 'client acquisition and retention';
        break;
      case 'Engineering':
        contribution = 'technical innovation and team collaboration';
        break;
      case 'Customer Success':
        contribution = 'customer satisfaction and account expansion';
        break;
      case 'Professional Services':
        contribution = 'project delivery and client success';
        break;
      default:
        contribution = 'operational efficiency and team coordination';
    }
    
    return `Key strengths in ${strengths} directly contribute to ${contribution}`;
  },

  departmentAlignment: (employee) => {
    const department = employee.department || 'Sales';
    const specialties = employee.specialties?.slice(0, 2).join(' and ') || 'core competencies';
    
    return `Perfect fit for ${department} role - specialties in ${specialties} align with department objectives and contribute to overall team success`;
  }
};

// Growth recommendation templates
export const growthRecommendationTemplates = {
  leverageStrengths: (employee) => {
    const primaryStrength = employee.strengths?.[0] || 'communication';
    return `Continue developing ${primaryStrength} skills through advanced training and mentoring opportunities`;
  },

  addressChallenges: (employee) => {
    const department = employee.department || 'Sales';
    let recommendation = '';
    
    switch (department) {
      case 'Sales':
        recommendation = 'Focus on advanced negotiation techniques and strategic account management';
        break;
      case 'Customer Success':
        recommendation = 'Enhance data analysis skills for better customer health monitoring';
        break;
      case 'Professional Services':
        recommendation = 'Develop project management and stakeholder communication skills';
        break;
      case 'Engineering':
        recommendation = 'Strengthen technical leadership and architecture design capabilities';
        break;
      default:
        recommendation = 'Focus on leadership development and cross-functional collaboration';
    }
    
    return recommendation;
  },

  careerGrowth: (employee) => {
    const experience = employee.experience || 2;
    const department = employee.department || 'Sales';
    
    let growthPath = '';
    if (experience >= 5) {
      growthPath = `Consider leadership opportunities within ${department} or cross-functional management roles`;
    } else if (experience >= 3) {
      growthPath = `Explore senior-level responsibilities and mentoring junior team members`;
    } else {
      growthPath = `Focus on skill development and building expertise in ${department} fundamentals`;
    }
    
    return growthPath;
  }
};

// Performance calculation functions
export const performanceCalculations = {
  getDepartmentAverage: (department) => {
    return departmentBenchmarks[department] || 78;
  },

  getPerformanceRating: (score) => {
    if (score >= 85) return 'Excellent';
    if (score >= 70) return 'Good';
    return 'Needs Improvement';
  },

  getDealsWonRating: (dealsWon) => {
    if (dealsWon >= 5) return 'High Closer';
    if (dealsWon >= 2) return 'Moderate';
    return 'Growing';
  },

  getResponseTimeRating: (responseTime) => {
    if (responseTime?.includes('hour')) return 'Excellent';
    return 'Good';
  },

  getVsAverageScore: (employeeScore, departmentAverage) => {
    const difference = (employeeScore || 80) - departmentAverage;
    return {
      difference: Math.abs(difference),
      sign: difference >= 0 ? '+' : '-',
      isAbove: difference >= 0
    };
  }
};

// Specialization proficiency calculator
export const getSpecializationProficiency = (specialties, index) => {
  return 85 + (index * 5); // Progressive proficiency scores
};

// Default insights data for fallback
export const defaultInsightsData = {
  departmentAverage: 78,
  performanceInsights: {
    score: 80,
    rating: 'Good',
    dealsWon: 0,
    responseTime: '2 hours'
  },
  successPatterns: {
    experienceAdvantage: 'Shows rapid learning and adaptability in new situations',
    strengthUtilization: 'Key strengths in communication and problem-solving directly contribute to operational efficiency',
    departmentAlignment: 'Perfect fit for role - core competencies align with department objectives'
  },
  growthRecommendations: {
    leverageStrengths: 'Continue developing communication skills through advanced training',
    addressChallenges: 'Focus on leadership development and cross-functional collaboration',
    careerGrowth: 'Focus on skill development and building expertise in fundamentals'
  }
};

// Helper function to generate insights for an employee
export const generateInsights = (employee) => {
  const departmentAverage = performanceCalculations.getDepartmentAverage(employee.department);
  const performanceScore = employee.performance?.score || 80;
  
  return {
    departmentAverage,
    performanceInsights: {
      score: performanceScore,
      rating: performanceCalculations.getPerformanceRating(performanceScore),
      dealsWon: employee.performance?.dealsWon || 0,
      responseTime: employee.performance?.responseTime || '2 hours'
    },
    successPatterns: {
      experienceAdvantage: successPatternTemplates.experienceAdvantage(employee),
      strengthUtilization: successPatternTemplates.strengthUtilization(employee),
      departmentAlignment: successPatternTemplates.departmentAlignment(employee)
    },
    growthRecommendations: {
      leverageStrengths: growthRecommendationTemplates.leverageStrengths(employee),
      addressChallenges: growthRecommendationTemplates.addressChallenges(employee),
      careerGrowth: growthRecommendationTemplates.careerGrowth(employee)
    },
    vsAverage: performanceCalculations.getVsAverageScore(performanceScore, departmentAverage)
  };
}; 