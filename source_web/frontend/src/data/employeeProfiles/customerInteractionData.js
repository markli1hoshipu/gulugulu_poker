// Employee-specific customer interaction data extracted from CustomerInteractionTab.jsx
// Each employee has unique default leads and customers when their arrays are empty

export const customerInteractionData = {
  1: { // Sarah Johnson - Senior Sales Manager
    defaultLeads: [
      { id: 1, name: 'Fortune Tech Corp', lastContactDate: '2024-06-01', currentStage: 'Negotiation', progress: 75 },
      { id: 2, name: 'Global Solutions Inc', lastContactDate: '2024-05-28', currentStage: 'Proposal', progress: 60 },
      { id: 3, name: 'Enterprise Dynamics', lastContactDate: '2024-05-20', currentStage: 'Discovery', progress: 30 },
      { id: 4, name: 'Strategic Partners LLC', lastContactDate: '2024-05-15', currentStage: 'Closed', progress: 100 }
    ],
    defaultCustomers: [
      { id: 1, name: 'MegaCorp Industries', lastContactDate: '2024-06-02', currentStage: 'Expansion', progress: 85 },
      { id: 2, name: 'Innovation Holdings', lastContactDate: '2024-05-30', currentStage: 'Renewal', progress: 90 },
      { id: 3, name: 'TechVision Enterprises', lastContactDate: '2024-05-25', currentStage: 'Upsell', progress: 70 }
    ]
  },

  2: { // Michael Chen - Account Executive
    defaultLeads: [
      { id: 1, name: 'HealthTech Solutions', lastContactDate: '2024-06-01', currentStage: 'Technical Review', progress: 65 },
      { id: 2, name: 'MedData Analytics', lastContactDate: '2024-05-28', currentStage: 'Integration Planning', progress: 55 },
      { id: 3, name: 'Clinical Systems Inc', lastContactDate: '2024-05-20', currentStage: 'Closed', progress: 100 },
      { id: 4, name: 'Healthcare Partners', lastContactDate: '2024-05-15', currentStage: 'Contacted', progress: 20 }
    ],
    defaultCustomers: [
      { id: 1, name: 'Regional Medical Center', lastContactDate: '2024-06-02', currentStage: 'Support', progress: 95 },
      { id: 2, name: 'Digital Health Corp', lastContactDate: '2024-05-30', currentStage: 'Implementation', progress: 80 },
      { id: 3, name: 'Healthcare Analytics Co', lastContactDate: '2024-05-25', currentStage: 'Training', progress: 60 }
    ]
  },

  3: { // Emily Rodriguez - Business Development Rep
    defaultLeads: [
      { id: 1, name: 'StartUp Innovations', lastContactDate: '2024-06-01', currentStage: 'Qualification', progress: 40 },
      { id: 2, name: 'SMB Solutions Hub', lastContactDate: '2024-05-28', currentStage: 'Demo Scheduled', progress: 50 },
      { id: 3, name: 'Growth Partners LLC', lastContactDate: '2024-05-20', currentStage: 'Follow-up', progress: 35 },
      { id: 4, name: 'Digital Marketing Co', lastContactDate: '2024-05-15', currentStage: 'Closed', progress: 100 }
    ],
    defaultCustomers: [
      { id: 1, name: 'Small Business Central', lastContactDate: '2024-06-02', currentStage: 'Onboarding', progress: 70 },
      { id: 2, name: 'Local Services Group', lastContactDate: '2024-05-30', currentStage: 'Active', progress: 90 },
      { id: 3, name: 'Community Partners', lastContactDate: '2024-05-25', currentStage: 'Referral', progress: 45 }
    ]
  },

  4: { // David Kim - Customer Success Director
    defaultLeads: [
      { id: 1, name: 'Enterprise Global Corp', lastContactDate: '2024-06-01', currentStage: 'Executive Review', progress: 80 },
      { id: 2, name: 'Strategic Accounts Inc', lastContactDate: '2024-05-28', currentStage: 'Expansion Discussion', progress: 70 },
      { id: 3, name: 'Fortune Partners', lastContactDate: '2024-05-20', currentStage: 'Renewal Planning', progress: 85 },
      { id: 4, name: 'Global Success Ltd', lastContactDate: '2024-05-15', currentStage: 'Closed', progress: 100 }
    ],
    defaultCustomers: [
      { id: 1, name: 'Enterprise Solutions Co', lastContactDate: '2024-06-02', currentStage: 'Strategic Review', progress: 95 },
      { id: 2, name: 'Success Partners Inc', lastContactDate: '2024-05-30', currentStage: 'Expansion', progress: 88 },
      { id: 3, name: 'Corporate Excellence', lastContactDate: '2024-05-25', currentStage: 'Renewal', progress: 92 }
    ]
  },

  5: { // Jessica Adams - Technical Account Manager
    defaultLeads: [
      { id: 1, name: 'API Integration Corp', lastContactDate: '2024-06-01', currentStage: 'Technical Evaluation', progress: 60 },
      { id: 2, name: 'Cloud Solutions Inc', lastContactDate: '2024-05-28', currentStage: 'Architecture Review', progress: 55 },
      { id: 3, name: 'DevOps Partners', lastContactDate: '2024-05-20', currentStage: 'Implementation Planning', progress: 45 },
      { id: 4, name: 'Technical Systems Ltd', lastContactDate: '2024-05-15', currentStage: 'Closed', progress: 100 }
    ],
    defaultCustomers: [
      { id: 1, name: 'Integration Specialists', lastContactDate: '2024-06-02', currentStage: 'Technical Support', progress: 90 },
      { id: 2, name: 'Cloud Native Corp', lastContactDate: '2024-05-30', currentStage: 'Optimization', progress: 85 },
      { id: 3, name: 'API Development Co', lastContactDate: '2024-05-25', currentStage: 'Monitoring', progress: 95 }
    ]
  },

  6: { // Robert Taylor - Implementation Manager
    defaultLeads: [
      { id: 1, name: 'Implementation Partners', lastContactDate: '2024-06-01', currentStage: 'Scoping', progress: 50 },
      { id: 2, name: 'Process Optimization Inc', lastContactDate: '2024-05-28', currentStage: 'Planning', progress: 45 },
      { id: 3, name: 'Training Solutions Corp', lastContactDate: '2024-05-20', currentStage: 'Proposal Review', progress: 65 },
      { id: 4, name: 'Change Management Co', lastContactDate: '2024-05-15', currentStage: 'Closed', progress: 100 }
    ],
    defaultCustomers: [
      { id: 1, name: 'Enterprise Implementation', lastContactDate: '2024-06-02', currentStage: 'Go-Live', progress: 95 },
      { id: 2, name: 'Process Excellence Ltd', lastContactDate: '2024-05-30', currentStage: 'Training', progress: 80 },
      { id: 3, name: 'Transformation Partners', lastContactDate: '2024-05-25', currentStage: 'Optimization', progress: 88 }
    ]
  }
};

// Fallback data for employees without specific profiles
export const defaultCustomerInteractionData = {
  defaultLeads: [
    { id: 1, name: 'Acme Corp', lastContactDate: '2024-06-01', currentStage: 'Contacted', progress: 20 },
    { id: 2, name: 'Beta LLC', lastContactDate: '2024-05-28', currentStage: 'Negotiation', progress: 60 },
    { id: 3, name: 'Gamma Inc', lastContactDate: '2024-05-20', currentStage: 'Closed', progress: 100 }
  ],
  defaultCustomers: [
    { id: 1, name: 'Delta Partners', lastContactDate: '2024-06-02', currentStage: 'Warm', progress: 40 },
    { id: 2, name: 'Epsilon Ventures', lastContactDate: '2024-05-30', currentStage: 'Closed', progress: 100 }
  ]
};

// Helper function to get customer interaction data for an employee
export const getCustomerInteractionData = (employeeId) => {
  return customerInteractionData[employeeId] || defaultCustomerInteractionData;
}; 