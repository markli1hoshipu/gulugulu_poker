// Employee-specific performance data extracted from PerformanceMetricsTab.jsx
// Each employee has unique projects, revenue contributions, milestones, and peer evaluations

export const performanceData = {
  1: { // Sarah Johnson - Senior Sales Manager
    projects: [
      { id: 1, name: 'Enterprise CRM Migration', year: 2024, revenue: 450000, status: 'Completed', description: 'Led migration of Fortune 500 client to new CRM system.' },
      { id: 2, name: 'Strategic Account Expansion', year: 2023, revenue: 320000, status: 'Completed', description: 'Expanded key accounts resulting in 3x revenue growth.' },
      { id: 3, name: 'Sales Process Optimization', year: 2023, revenue: 280000, status: 'Completed', description: 'Streamlined sales processes increasing team efficiency by 40%.' },
      { id: 4, name: 'Executive Relationship Program', year: 2022, revenue: 195000, status: 'Completed', description: 'Developed C-level relationships driving strategic partnerships.' },
      { id: 5, name: 'Market Penetration Initiative', year: 2022, revenue: 240000, status: 'Completed', description: 'Entered new vertical markets with customized solutions.' }
    ],
    totalRevenue: 1485000,
    totalProjects: 12,
    topProjects: [
      { name: 'Enterprise CRM Migration', revenue: 450000 },
      { name: 'Strategic Account Expansion', revenue: 320000 },
      { name: 'Sales Process Optimization', revenue: 280000 },
      { name: 'Market Penetration Initiative', revenue: 240000 },
      { name: 'Executive Relationship Program', revenue: 195000 }
    ],
    milestones: [
      { label: 'Promoted to Senior Sales Manager', year: 2023, icon: 'TrendingUp', iconColor: 'text-blue-500' },
      { label: 'Sales Leader of the Year', year: 2024, icon: 'Star', iconColor: 'text-yellow-500' },
      { label: 'Customer Excellence Award', year: 2022, icon: 'Award', iconColor: 'text-purple-500' },
      { label: 'Strategic Partnership Recognition', year: 2021, icon: 'Target', iconColor: 'text-green-500' }
    ],
    peerEvaluations: {
      averageScore: 4.8,
      totalReviews: 15,
      feedback: [
        "Exceptional leader who consistently delivers results above expectations.",
        "Outstanding at building client relationships and driving strategic growth.",
        "Mentors team members effectively while maintaining high performance standards."
      ]
    }
  },

  2: { // Michael Chen - Account Executive
    projects: [
      { id: 1, name: 'HealthTech API Integration', year: 2024, revenue: 350000, status: 'Completed', description: 'Complex API integration for healthcare client systems.' },
      { id: 2, name: 'Technical Solution Architecture', year: 2023, revenue: 220000, status: 'Completed', description: 'Designed scalable architecture for enterprise client.' },
      { id: 3, name: 'Cloud Migration Project', year: 2023, revenue: 180000, status: 'Completed', description: 'Led technical migration to cloud infrastructure.' },
      { id: 4, name: 'Security Compliance Initiative', year: 2022, revenue: 95000, status: 'Completed', description: 'Implemented security protocols meeting healthcare compliance.' },
      { id: 5, name: 'Performance Optimization', year: 2022, revenue: 120000, status: 'Completed', description: 'Optimized system performance for high-volume client.' }
    ],
    totalRevenue: 965000,
    totalProjects: 8,
    topProjects: [
      { name: 'HealthTech API Integration', revenue: 350000 },
      { name: 'Technical Solution Architecture', revenue: 220000 },
      { name: 'Cloud Migration Project', revenue: 180000 },
      { name: 'Performance Optimization', revenue: 120000 },
      { name: 'Security Compliance Initiative', revenue: 95000 }
    ],
    milestones: [
      { label: 'Technical Excellence Award', year: 2024, icon: 'Star', iconColor: 'text-yellow-500' },
      { label: 'Healthcare Solutions Certified', year: 2023, icon: 'FileText', iconColor: 'text-blue-600' },
      { label: 'Top Technical Account Executive', year: 2022, icon: 'TrendingUp', iconColor: 'text-purple-500' },
      { label: 'Client Innovation Recognition', year: 2021, icon: 'Award', iconColor: 'text-green-500' }
    ],
    peerEvaluations: {
      averageScore: 4.7,
      totalReviews: 12,
      feedback: [
        "Exceptional technical knowledge that bridges the gap between sales and engineering.",
        "Always delivers high-quality solutions that exceed client expectations.",
        "Great problem-solver who can handle complex technical challenges."
      ]
    }
  },

  3: { // Emily Rodriguez - Business Development Rep
    projects: [
      { id: 1, name: 'SMB Lead Generation Campaign', year: 2024, revenue: 280000, status: 'Completed', description: 'Generated 500+ qualified leads for SMB segment.' },
      { id: 2, name: 'Social Selling Initiative', year: 2023, revenue: 180000, status: 'Completed', description: 'Pioneered social selling approach increasing conversion rates.' },
      { id: 3, name: 'Lead Qualification Process', year: 2023, revenue: 150000, status: 'Completed', description: 'Optimized lead qualification improving sales efficiency.' },
      { id: 4, name: 'Outbound Prospecting Program', year: 2022, revenue: 120000, status: 'Completed', description: 'Developed systematic outbound prospecting methodology.' },
      { id: 5, name: 'Partnership Channel Development', year: 2022, revenue: 95000, status: 'Completed', description: 'Established referral partnerships driving new business.' }
    ],
    totalRevenue: 825000,
    totalProjects: 9,
    topProjects: [
      { name: 'SMB Lead Generation Campaign', revenue: 280000 },
      { name: 'Social Selling Initiative', revenue: 180000 },
      { name: 'Lead Qualification Process', revenue: 150000 },
      { name: 'Outbound Prospecting Program', revenue: 120000 },
      { name: 'Partnership Channel Development', revenue: 95000 }
    ],
    milestones: [
      { label: 'Lead Generation Excellence Award', year: 2024, icon: 'Star', iconColor: 'text-yellow-500' },
      { label: 'Social Selling Certification', year: 2023, icon: 'FileText', iconColor: 'text-blue-600' },
      { label: 'Rising Star Award', year: 2022, icon: 'TrendingUp', iconColor: 'text-purple-500' },
      { label: 'Team Collaboration Recognition', year: 2021, icon: 'Award', iconColor: 'text-green-500' }
    ],
    peerEvaluations: {
      averageScore: 4.6,
      totalReviews: 10,
      feedback: [
        "Incredible energy and enthusiasm that motivates the entire team.",
        "Excellent at building relationships and nurturing leads effectively.",
        "Creative problem-solver who brings fresh perspectives to challenges."
      ]
    }
  },

  4: { // David Kim - Customer Success Director
    projects: [
      { id: 1, name: 'Enterprise Customer Success Program', year: 2024, revenue: 520000, status: 'Completed', description: 'Developed comprehensive success program for enterprise clients.' },
      { id: 2, name: 'Customer Retention Initiative', year: 2023, revenue: 380000, status: 'Completed', description: 'Achieved 98% customer retention rate through proactive engagement.' },
      { id: 3, name: 'Account Expansion Strategy', year: 2023, revenue: 290000, status: 'Completed', description: 'Drove 150% net revenue retention across key accounts.' },
      { id: 4, name: 'Executive Engagement Program', year: 2022, revenue: 220000, status: 'Completed', description: 'Established C-level relationships driving strategic partnerships.' },
      { id: 5, name: 'Customer Health Monitoring', year: 2022, revenue: 180000, status: 'Completed', description: 'Implemented predictive analytics for customer success.' }
    ],
    totalRevenue: 1590000,
    totalProjects: 11,
    topProjects: [
      { name: 'Enterprise Customer Success Program', revenue: 520000 },
      { name: 'Customer Retention Initiative', revenue: 380000 },
      { name: 'Account Expansion Strategy', revenue: 290000 },
      { name: 'Executive Engagement Program', revenue: 220000 },
      { name: 'Customer Health Monitoring', revenue: 180000 }
    ],
    milestones: [
      { label: 'Customer Success Director of the Year', year: 2024, icon: 'Star', iconColor: 'text-yellow-500' },
      { label: 'Customer Excellence Leadership Award', year: 2023, icon: 'Award', iconColor: 'text-purple-500' },
      { label: 'Strategic Account Management Certified', year: 2022, icon: 'FileText', iconColor: 'text-blue-600' },
      { label: 'Retention Rate Achievement', year: 2021, icon: 'Target', iconColor: 'text-green-500' }
    ],
    peerEvaluations: {
      averageScore: 4.9,
      totalReviews: 18,
      feedback: [
        "Outstanding leader who truly understands customer needs and drives success.",
        "Exceptional at building long-term relationships and expanding accounts.",
        "Strategic thinker who consistently delivers results above expectations."
      ]
    }
  },

  5: { // Jessica Adams - Technical Account Manager
    projects: [
      { id: 1, name: 'API Integration Platform', year: 2024, revenue: 380000, status: 'Completed', description: 'Built comprehensive API integration platform for enterprise client.' },
      { id: 2, name: 'Technical Implementation Guide', year: 2023, revenue: 250000, status: 'Completed', description: 'Created detailed implementation guides reducing onboarding time.' },
      { id: 3, name: 'Customer Training Program', year: 2023, revenue: 190000, status: 'Completed', description: 'Developed technical training program for customer success.' },
      { id: 4, name: 'Performance Monitoring System', year: 2022, revenue: 140000, status: 'Completed', description: 'Implemented monitoring system for proactive issue resolution.' },
      { id: 5, name: 'Technical Documentation Hub', year: 2022, revenue: 110000, status: 'Completed', description: 'Created comprehensive technical documentation portal.' }
    ],
    totalRevenue: 1070000,
    totalProjects: 9,
    topProjects: [
      { name: 'API Integration Platform', revenue: 380000 },
      { name: 'Technical Implementation Guide', revenue: 250000 },
      { name: 'Customer Training Program', revenue: 190000 },
      { name: 'Performance Monitoring System', revenue: 140000 },
      { name: 'Technical Documentation Hub', revenue: 110000 }
    ],
    milestones: [
      { label: 'Technical Account Manager Excellence', year: 2024, icon: 'Star', iconColor: 'text-yellow-500' },
      { label: 'Customer Training Innovation Award', year: 2023, icon: 'Award', iconColor: 'text-purple-500' },
      { label: 'Technical Documentation Recognition', year: 2022, icon: 'FileText', iconColor: 'text-blue-600' },
      { label: 'Integration Solutions Expert', year: 2021, icon: 'Target', iconColor: 'text-green-500' }
    ],
    peerEvaluations: {
      averageScore: 4.8,
      totalReviews: 14,
      feedback: [
        "Exceptional technical expertise combined with excellent customer communication.",
        "Always goes above and beyond to ensure customer technical success.",
        "Reliable and thorough in all technical implementations and support."
      ]
    }
  },

  6: { // Robert Taylor - Implementation Manager
    projects: [
      { id: 1, name: 'Enterprise Implementation Program', year: 2024, revenue: 420000, status: 'Completed', description: 'Led complex enterprise software implementation across multiple departments.' },
      { id: 2, name: 'Process Optimization Initiative', year: 2023, revenue: 300000, status: 'Completed', description: 'Optimized implementation processes reducing time-to-value by 40%.' },
      { id: 3, name: 'Training & Development Program', year: 2023, revenue: 230000, status: 'Completed', description: 'Developed comprehensive training program for client teams.' },
      { id: 4, name: 'Change Management Strategy', year: 2022, revenue: 180000, status: 'Completed', description: 'Implemented change management framework for smooth transitions.' },
      { id: 5, name: 'Customer Onboarding Excellence', year: 2022, revenue: 150000, status: 'Completed', description: 'Achieved 95% implementation success rate through systematic approach.' }
    ],
    totalRevenue: 1280000,
    totalProjects: 10,
    topProjects: [
      { name: 'Enterprise Implementation Program', revenue: 420000 },
      { name: 'Process Optimization Initiative', revenue: 300000 },
      { name: 'Training & Development Program', revenue: 230000 },
      { name: 'Change Management Strategy', revenue: 180000 },
      { name: 'Customer Onboarding Excellence', revenue: 150000 }
    ],
    milestones: [
      { label: 'Implementation Excellence Award', year: 2024, icon: 'Star', iconColor: 'text-yellow-500' },
      { label: 'Process Optimization Recognition', year: 2023, icon: 'TrendingUp', iconColor: 'text-purple-500' },
      { label: 'Project Management Certified', year: 2022, icon: 'FileText', iconColor: 'text-blue-600' },
      { label: 'Customer Success Champion', year: 2021, icon: 'Award', iconColor: 'text-green-500' }
    ],
    peerEvaluations: {
      averageScore: 4.7,
      totalReviews: 13,
      feedback: [
        "Outstanding project management skills with exceptional attention to detail.",
        "Consistently delivers projects on time and within budget.",
        "Great at managing complex implementations and stakeholder expectations."
      ]
    }
  }
};

// Fallback data for employees without specific profiles
export const defaultPerformanceData = {
  projects: [
    { id: 1, name: 'E-Commerce Platform Revamp', year: 2024, revenue: 350000, status: 'Completed', description: 'Led frontend overhaul for major client.' },
    { id: 2, name: 'FinTech Mobile App', year: 2023, revenue: 220000, status: 'Completed', description: 'Developed secure mobile banking features.' },
    { id: 3, name: 'Data Analytics Dashboard', year: 2023, revenue: 180000, status: 'Completed', description: 'Built real-time analytics for enterprise.' },
    { id: 4, name: 'UX Research Initiative', year: 2022, revenue: 95000, status: 'Completed', description: 'Improved user flows for SaaS product.' },
    { id: 5, name: 'Cloud Migration Project', year: 2022, revenue: 120000, status: 'Completed', description: 'Migrated legacy systems to AWS.' }
  ],
  totalRevenue: 965000,
  totalProjects: 7,
  topProjects: [
    { name: 'E-Commerce Platform Revamp', revenue: 350000 },
    { name: 'FinTech Mobile App', revenue: 220000 },
    { name: 'Data Analytics Dashboard', revenue: 180000 },
    { name: 'Cloud Migration Project', revenue: 120000 },
    { name: 'UX Research Initiative', revenue: 95000 }
  ],
  milestones: [
    { label: 'Promoted to Senior Engineer', year: 2023, icon: 'TrendingUp', iconColor: 'text-blue-500' },
    { label: 'Completed Leadership Training', year: 2022, icon: 'Target', iconColor: 'text-purple-500' },
    { label: 'Employee of the Month', year: 2024, icon: 'Star', iconColor: 'text-yellow-500' },
    { label: 'AWS Certified', year: 2021, icon: 'FileText', iconColor: 'text-yellow-600' }
  ],
  peerEvaluations: {
    averageScore: 4.7,
    totalReviews: 12,
    feedback: [
      "Always delivers high-quality work on time.",
      "Great team player and communicator.",
      "Proactive in solving problems."
    ]
  }
};

// Helper function to get performance data for an employee
export const getPerformanceData = (employeeId) => {
  return performanceData[employeeId] || defaultPerformanceData;
}; 