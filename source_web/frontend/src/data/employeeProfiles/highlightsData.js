// Mock data for employee highlights
export const generateMockHighlightData = (employees) => {
  if (!employees || employees.length === 0) {
    return {
      highestRevenue: null,
      mostExperienced: null,
      topPerformance: null,
      bestFeedback: null
    };
  }

  // Highest Revenue (mock data - in real app would come from performance data)
  const highestRevenue = employees.reduce((max, emp) => {
    const empRevenue = emp.performance?.revenue || Math.floor(Math.random() * 500000) + 100000;
    const maxRevenue = max.performance?.revenue || Math.floor(Math.random() * 500000) + 100000;
    return empRevenue > maxRevenue ? emp : max;
  }, employees[0]);

  // Most Experienced
  const mostExperienced = employees.reduce((max, emp) => {
    return (emp.experience || 0) > (max.experience || 0) ? emp : max;
  }, employees[0]);

  // Top Recent Performance (mock score)
  const topPerformance = employees.reduce((max, emp) => {
    const empScore = emp.performance?.score || Math.floor(Math.random() * 30) + 70;
    const maxScore = max.performance?.score || Math.floor(Math.random() * 30) + 70;
    return empScore > maxScore ? emp : max;
  }, employees[0]);

  // Best Feedback (mock data)
  const bestFeedback = employees.reduce((max, emp) => {
    const empRating = emp.feedback?.rating || Math.floor(Math.random() * 1.5) + 3.5;
    const maxRating = max.feedback?.rating || Math.floor(Math.random() * 1.5) + 3.5;
    return empRating > maxRating ? emp : max;
  }, employees[0]);

  return {
    highestRevenue: {
      ...highestRevenue,
      revenue: highestRevenue.performance?.revenue || Math.floor(Math.random() * 500000) + 100000
    },
    mostExperienced,
    topPerformance: {
      ...topPerformance,
      score: topPerformance.performance?.score || Math.floor(Math.random() * 30) + 70
    },
    bestFeedback: {
      ...bestFeedback,
      rating: bestFeedback.feedback?.rating || Math.floor(Math.random() * 1.5) + 3.5,
      snippet: bestFeedback.feedback?.snippet || "Exceptional performance and great team collaboration"
    }
  };
};

// Mock data for employee card information
export const generateMockCardData = (employee, mode) => {
  switch (mode) {
    case 'revenue':
      return {
        title: 'Revenue Contribution',
        value: `$${(employee.performance?.revenue || Math.floor(Math.random() * 500000) + 100000).toLocaleString()}`,
        subtitle: 'Total Revenue',
        icon: 'DollarSign',
        bgColor: 'bg-green-50'
      };
    case 'experience':
      return {
        title: 'Experience',
        value: `${employee.experience || Math.floor(Math.random() * 15) + 2} years`,
        subtitle: 'Professional Experience',
        icon: 'Award',
        bgColor: 'bg-blue-50'
      };
    case 'performance':
      return {
        title: 'Performance Score',
        value: `${employee.performance?.score || Math.floor(Math.random() * 30) + 70}%`,
        subtitle: 'Recent Performance',
        icon: 'TrendingUp',
        bgColor: 'bg-purple-50'
      };
    case 'feedback':
      return {
        title: 'Feedback Rating',
        value: `${(employee.feedback?.rating || Math.random() * 1.5 + 3.5).toFixed(1)} ⭐`,
        subtitle: 'Average Rating',
        icon: 'Heart',
        bgColor: 'bg-pink-50'
      };
    default:
      return generateMockCardData(employee, 'revenue');
  }
};

// Mock customer matching data
export const generateMockCustomerMatches = (employees) => {
  return employees.slice(0, 5).map(emp => ({
    employee: emp,
    score: Math.floor(Math.random() * 40) + 60,
    reasons: [
      `Expertise in relevant industry`,
      `Experience with similar company size`,
      `Strong track record in similar projects`
    ]
  }));
}; 