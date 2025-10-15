// Mock data structure: employees as keys, leads as values
export const mockEmployees = {
  1: {
    id: 1,
    name: 'Sarah Johnson',
    role: 'Senior Sales Manager',
    department: 'Sales',
    email: 'sarah.johnson@company.com',
    phone: '+1 (555) 123-4567',
    avatar: 'SJ',
    specialties: ['Enterprise Sales', 'SaaS', 'Client Relations'],
    performance: { score: 95, dealsWon: 23, responseTime: '2 hours' },
    location: 'New York, NY',
    experience: 8,
    timezone: 'EST',
    availability: 'available',
    currentProjects: 4,
    completionRate: 96,
    strengths: ['Strong technical skills', 'Excellent communication', 'Leadership experience'],
    recentAchievements: ['Led successful project delivery', 'Exceeded quarterly targets']
  },
  2: {
    id: 2,
    name: 'Michael Chen',
    role: 'Account Executive',
    department: 'Sales',
    email: 'michael.chen@company.com',
    phone: '+1 (555) 234-5678',
    avatar: 'MC',
    specialties: ['Technical Sales', 'Healthcare', 'Renewals'],
    performance: { score: 88, dealsWon: 18, responseTime: '1.5 hours' },
    location: 'San Francisco, CA',
    experience: 5,
    timezone: 'PST',
    availability: 'busy',
    currentProjects: 3,
    completionRate: 89,
    strengths: ['Technical expertise', 'Problem-solving abilities', 'Client-facing expertise'],
    recentAchievements: ['Received client commendation', 'Implemented process improvements']
  },
  3: {
    id: 3,
    name: 'Emily Rodriguez',
    role: 'Business Development Rep',
    department: 'Sales',
    email: 'emily.rodriguez@company.com',
    phone: '+1 (555) 345-6789',
    avatar: 'ER',
    specialties: ['Lead Qualification', 'Cold Outreach', 'SMB'],
    performance: { score: 92, dealsWon: 15, responseTime: '3 hours' },
    location: 'Austin, TX',
    experience: 3,
    timezone: 'CST',
    availability: 'partially-available',
    currentProjects: 2,
    completionRate: 94,
    strengths: ['Communication', 'Lead qualification', 'Relationship building'],
    recentAchievements: ['Mentored junior team members', 'Exceeded lead generation targets']
  },
  4: {
    id: 4,
    name: 'David Kim',
    role: 'Customer Success Director',
    department: 'Customer Success',
    email: 'david.kim@company.com',
    phone: '+1 (555) 456-7890',
    avatar: 'DK',
    specialties: ['Strategic Accounts', 'Executive Relations', 'Customer Retention'],
    performance: { score: 97, dealsWon: 28, responseTime: '1 hour' },
    location: 'New York, NY',
    experience: 10,
    timezone: 'EST',
    availability: 'available',
    currentProjects: 5,
    completionRate: 98,
    strengths: ['Strategic thinking', 'Executive communication', 'Customer advocacy'],
    recentAchievements: ['Achieved 98% customer retention', 'Led enterprise expansion program']
  },
  5: {
    id: 5,
    name: 'Jessica Adams',
    role: 'Technical Account Manager',
    department: 'Customer Success',
    email: 'jessica.adams@company.com',
    phone: '+1 (555) 567-8901',
    avatar: 'JA',
    specialties: ['Integration', 'APIs', 'Technical Support'],
    performance: { score: 91, dealsWon: 20, responseTime: '2.5 hours' },
    location: 'San Francisco, CA',
    experience: 6,
    timezone: 'PST',
    availability: 'busy',
    currentProjects: 4,
    completionRate: 93,
    strengths: ['Technical expertise', 'Problem resolution', 'Customer training'],
    recentAchievements: ['Reduced technical escalations by 40%', 'Launched customer training program']
  },
  6: {
    id: 6,
    name: 'Robert Taylor',
    role: 'Implementation Manager',
    department: 'Professional Services',
    email: 'robert.taylor@company.com',
    phone: '+1 (555) 678-9012',
    avatar: 'RT',
    specialties: ['Onboarding', 'Training', 'Migration'],
    performance: { score: 89, dealsWon: 16, responseTime: '4 hours' },
    location: 'Austin, TX',
    experience: 7,
    timezone: 'CST',
    availability: 'available',
    currentProjects: 3,
    completionRate: 91,
    strengths: ['Project management', 'Customer onboarding', 'Process optimization'],
    recentAchievements: ['Improved onboarding time by 30%', 'Achieved 95% implementation success rate']
  }
};

// Generate interaction history for a lead
const generateInteractionHistory = (leadId, employeeId) => {
  const employee = mockEmployees[employeeId];
  const emailTypes = ['Initial Outreach', 'Follow-up', 'Proposal', 'Demo Invitation', 'Contract Discussion'];
  const callTypes = ['Discovery Call', 'Demo', 'Negotiation', 'Check-in', 'Technical Discussion'];
  const meetingTypes = ['Product Demo', 'Strategy Session', 'Contract Review', 'Onboarding', 'Quarterly Review'];
  
  const generateEmails = () => {
    return Array.from({ length: Math.floor(Math.random() * 8) + 3 }, (_, i) => {
      const daysAgo = Math.floor(Math.random() * 30) + 1;
      const status = Math.random() > 0.3 ? 'sent' : Math.random() > 0.5 ? 'opened' : 'replied';
      
      return {
        id: `email-${leadId}-${i}`,
        type: emailTypes[Math.floor(Math.random() * emailTypes.length)],
        employee: employee,
        date: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
        status: status,
        subject: `${emailTypes[Math.floor(Math.random() * emailTypes.length)]} - ${employee.name}`,
        preview: 'Hi there! I wanted to follow up on our previous conversation about your company\'s needs...',
        openRate: Math.floor(Math.random() * 100),
        responseTime: status === 'replied' ? `${Math.floor(Math.random() * 24) + 1} hours` : null
      };
    });
  };

  const generateCalls = () => {
    return Array.from({ length: Math.floor(Math.random() * 6) + 2 }, (_, i) => {
      const daysAgo = Math.floor(Math.random() * 45) + 1;
      const duration = Math.floor(Math.random() * 45) + 15;
      const outcome = ['Connected', 'Voicemail', 'No Answer', 'Scheduled Follow-up'][Math.floor(Math.random() * 4)];
      
      return {
        id: `call-${leadId}-${i}`,
        type: callTypes[Math.floor(Math.random() * callTypes.length)],
        employee: employee,
        date: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
        duration: duration,
        outcome: outcome,
        notes: outcome === 'Connected' ? 'Great conversation about their current challenges. They\'re interested in a demo next week.' : 
               outcome === 'Voicemail' ? 'Left detailed voicemail about our solution benefits.' :
               outcome === 'Scheduled Follow-up' ? 'Agreed to call back next Tuesday at 2 PM.' :
               'No answer, will try again tomorrow.',
        nextAction: outcome === 'Scheduled Follow-up' ? 'Follow-up call scheduled' : 
                   outcome === 'Connected' ? 'Send demo invitation' : 'Retry call'
      };
    });
  };

  const generateMeetings = () => {
    return Array.from({ length: Math.floor(Math.random() * 4) + 1 }, (_, i) => {
      const daysAgo = Math.floor(Math.random() * 60) + 1;
      const duration = [30, 45, 60, 90][Math.floor(Math.random() * 4)];
      const status = Math.random() > 0.2 ? 'completed' : Math.random() > 0.5 ? 'scheduled' : 'cancelled';
      
      return {
        id: `meeting-${leadId}-${i}`,
        type: meetingTypes[Math.floor(Math.random() * meetingTypes.length)],
        employee: employee,
        date: status === 'scheduled' ? new Date(Date.now() + Math.random() * 14 * 24 * 60 * 60 * 1000) :
              new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
        duration: duration,
        status: status,
        attendees: Math.floor(Math.random() * 4) + 2,
        location: Math.random() > 0.5 ? 'Video Call' : 'Office Conference Room',
        agenda: status === 'completed' ? 'Discussed implementation timeline and pricing options.' :
               status === 'scheduled' ? 'Product demonstration and Q&A session.' :
               'Meeting cancelled due to scheduling conflict.',
        outcome: status === 'completed' ? ['Very Positive', 'Positive', 'Neutral', 'Needs Follow-up'][Math.floor(Math.random() * 4)] : null,
        nextSteps: status === 'completed' ? 'Send proposal by end of week' : 
                  status === 'scheduled' ? 'Prepare demo environment' : 'Reschedule meeting'
      };
    });
  };

  return {
    emails: generateEmails().sort((a, b) => b.date - a.date),
    calls: generateCalls().sort((a, b) => b.date - a.date),
    meetings: generateMeetings().sort((a, b) => b.date - a.date)
  };
};

// Employee-Lead mapping with leads as values
export const employeeLeadsMap = {
  1: [ // Sarah Johnson's leads (Senior Sales Manager) - 11 leads
    {
      id: 1,
      name: 'David Kim',
      company: 'TechStart Solutions',
      position: 'CEO',
      email: 'david.kim@techstartsolutions.com',
      phone: '+1 (555) 789-1234',
      location: 'New York, NY',
      industry: 'SaaS',
      companySize: '51-200 employees',
      revenue: '$5M-50M',
      status: 'hot',
      score: 92,
      lastContact: 2,
      notes: 'Interested in enterprise solution, budget confirmed',
      tags: ['enterprise', 'hot prospect'],
      assignedEmployeeId: 1,
      interactionHistory: generateInteractionHistory(1, 1)
    },
    {
      id: 2,
      name: 'Jessica Adams',
      company: 'Digital Innovators',
      position: 'CTO',
      email: 'jessica.adams@digitalinnovators.com',
      phone: '+1 (555) 890-2345',
      location: 'Boston, MA',
      industry: 'E-commerce',
      companySize: '201-500 employees',
      revenue: '$50M+',
      status: 'qualified',
      score: 88,
      lastContact: 5,
      notes: 'Decision maker, looking for Q1 implementation',
      tags: ['enterprise', 'demo scheduled'],
      assignedEmployeeId: 1,
      interactionHistory: generateInteractionHistory(2, 1)
    },
    {
      id: 3,
      name: 'Robert Taylor',
      company: 'CloudFlow Systems',
      position: 'VP Sales',
      email: 'robert.taylor@cloudflowsystems.com',
      phone: '+1 (555) 901-3456',
      location: 'San Francisco, CA',
      industry: 'Healthcare',
      companySize: '500+ employees',
      revenue: '$50M+',
      status: 'warm',
      score: 85,
      lastContact: 8,
      notes: 'Currently evaluating competitors, price sensitive',
      tags: ['enterprise'],
      assignedEmployeeId: 1,
      interactionHistory: generateInteractionHistory(3, 1)
    },
    {
      id: 4,
      name: 'Amanda Wilson',
      company: 'DataSync Corp',
      position: 'Marketing Director',
      email: 'amanda.wilson@datasynccorp.com',
      phone: '+1 (555) 012-4567',
      location: 'Austin, TX',
      industry: 'Finance',
      companySize: '1-50 employees',
      revenue: '$1M-5M',
      status: 'contacted',
      score: 78,
      lastContact: 12,
      notes: 'Technical requirements discussion needed',
      tags: ['hot prospect'],
      assignedEmployeeId: 1,
      interactionHistory: generateInteractionHistory(4, 1)
    },
    {
      id: 13,
      name: 'Kevin Zhang',
      company: 'Velocity Dynamics',
      position: 'COO',
      email: 'kevin.zhang@velocitydynamics.com',
      phone: '+1 (555) 321-9876',
      location: 'Seattle, WA',
      industry: 'SaaS',
      companySize: '201-500 employees',
      revenue: '$50M+',
      status: 'hot',
      score: 94,
      lastContact: 1,
      notes: 'Urgent need for scalable solution, ready to move fast',
      tags: ['enterprise', 'hot prospect', 'urgent'],
      assignedEmployeeId: 1,
      interactionHistory: generateInteractionHistory(13, 1)
    },
    {
      id: 14,
      name: 'Patricia Moore',
      company: 'Apex Technologies',
      position: 'VP Engineering',
      email: 'patricia.moore@apextechnologies.com',
      phone: '+1 (555) 654-3210',
      location: 'Denver, CO',
      industry: 'Healthcare',
      companySize: '500+ employees',
      revenue: '$50M+',
      status: 'qualified',
      score: 89,
      lastContact: 4,
      notes: 'Strong technical team, evaluating integration capabilities',
      tags: ['enterprise', 'technical'],
      assignedEmployeeId: 1,
      interactionHistory: generateInteractionHistory(14, 1)
    },
    {
      id: 30,
      name: 'Alexander Brooks',
      company: 'Summit Enterprises',
      position: 'CEO',
      email: 'alexander.brooks@summitenterprises.com',
      phone: '+1 (555) 100-2000',
      location: 'Chicago, IL',
      industry: 'SaaS',
      companySize: '500+ employees',
      revenue: '$50M+',
      status: 'hot',
      score: 95,
      lastContact: 1,
      notes: 'Board-level decision, looking for strategic partnership',
      tags: ['enterprise', 'strategic', 'board-level'],
      assignedEmployeeId: 1,
      interactionHistory: generateInteractionHistory(30, 1)
    },
    {
      id: 31,
      name: 'Victoria Chen',
      company: 'NextWave Solutions',
      position: 'President',
      email: 'victoria.chen@nextwavesolutions.com',
      phone: '+1 (555) 200-3000',
      location: 'San Francisco, CA',
      industry: 'Finance',
      companySize: '201-500 employees',
      revenue: '$50M+',
      status: 'qualified',
      score: 90,
      lastContact: 3,
      notes: 'Fintech company, regulatory compliance critical',
      tags: ['fintech', 'compliance', 'qualified'],
      assignedEmployeeId: 1,
      interactionHistory: generateInteractionHistory(31, 1)
    },
    {
      id: 32,
      name: 'Marcus Johnson',
      company: 'Pinnacle Group',
      position: 'VP Operations',
      email: 'marcus.johnson@pinnaclegroup.com',
      phone: '+1 (555) 300-4000',
      location: 'Atlanta, GA',
      industry: 'Manufacturing',
      companySize: '500+ employees',
      revenue: '$50M+',
      status: 'warm',
      score: 86,
      lastContact: 6,
      notes: 'Digital transformation initiative, multi-year project',
      tags: ['manufacturing', 'transformation', 'multi-year'],
      assignedEmployeeId: 1,
      interactionHistory: generateInteractionHistory(32, 1)
    },
    {
      id: 33,
      name: 'Samantha Lee',
      company: 'Innovation Labs',
      position: 'Chief Strategy Officer',
      email: 'samantha.lee@innovationlabs.com',
      phone: '+1 (555) 400-5000',
      location: 'Boston, MA',
      industry: 'Healthcare',
      companySize: '201-500 employees',
      revenue: '$50M+',
      status: 'contacted',
      score: 82,
      lastContact: 9,
      notes: 'Healthcare innovation focus, pilot program interest',
      tags: ['healthcare', 'innovation', 'pilot'],
      assignedEmployeeId: 1,
      interactionHistory: generateInteractionHistory(33, 1)
    },
    {
      id: 34,
      name: 'Jonathan Wright',
      company: 'Global Dynamics',
      position: 'Managing Director',
      email: 'jonathan.wright@globaldynamics.com',
      phone: '+1 (555) 500-6000',
      location: 'New York, NY',
      industry: 'E-commerce',
      companySize: '500+ employees',
      revenue: '$50M+',
      status: 'cold',
      score: 75,
      lastContact: 21,
      notes: 'Large enterprise, complex procurement process',
      tags: ['enterprise', 'complex-process'],
      assignedEmployeeId: 1,
      interactionHistory: generateInteractionHistory(34, 1)
    }
  ],
  2: [ // Michael Chen's leads (Account Executive) - 10 leads
    {
      id: 5,
      name: 'Chris Martinez',
      company: 'AI Ventures',
      position: 'CEO',
      email: 'chris.martinez@aiventures.com',
      phone: '+1 (555) 123-5678',
      location: 'San Francisco, CA',
      industry: 'SaaS',
      companySize: '51-200 employees',
      revenue: '$5M-50M',
      status: 'hot',
      score: 90,
      lastContact: 1,
      notes: 'Very interested in AI integration features',
      tags: ['enterprise', 'hot prospect', 'demo scheduled'],
      assignedEmployeeId: 2,
      interactionHistory: generateInteractionHistory(5, 2)
    },
    {
      id: 6,
      name: 'Lisa Brown',
      company: 'NextGen Software',
      position: 'CTO',
      email: 'lisa.brown@nextgensoftware.com',
      phone: '+1 (555) 234-6789',
      location: 'Boston, MA',
      industry: 'Healthcare',
      companySize: '201-500 employees',
      revenue: '$50M+',
      status: 'qualified',
      score: 87,
      lastContact: 3,
      notes: 'Healthcare compliance requirements are critical',
      tags: ['enterprise'],
      assignedEmployeeId: 2,
      interactionHistory: generateInteractionHistory(6, 2)
    },
    {
      id: 7,
      name: 'Daniel Davis',
      company: 'Quantum Analytics',
      position: 'VP Sales',
      email: 'daniel.davis@quantumanalytics.com',
      phone: '+1 (555) 345-7890',
      location: 'New York, NY',
      industry: 'Finance',
      companySize: '500+ employees',
      revenue: '$50M+',
      status: 'cold',
      score: 72,
      lastContact: 20,
      notes: 'Need to understand their current analytics stack',
      tags: ['enterprise'],
      assignedEmployeeId: 2,
      interactionHistory: generateInteractionHistory(7, 2)
    },
    {
      id: 15,
      name: 'Thomas Anderson',
      company: 'Matrix Solutions',
      position: 'IT Director',
      email: 'thomas.anderson@matrixsolutions.com',
      phone: '+1 (555) 987-6543',
      location: 'Chicago, IL',
      industry: 'Manufacturing',
      companySize: '201-500 employees',
      revenue: '$50M+',
      status: 'warm',
      score: 83,
      lastContact: 6,
      notes: 'Looking to modernize legacy systems, budget approved',
      tags: ['enterprise', 'modernization'],
      assignedEmployeeId: 2,
      interactionHistory: generateInteractionHistory(15, 2)
    },
    {
      id: 16,
      name: 'Michelle Roberts',
      company: 'Stellar Enterprises',
      position: 'CEO',
      email: 'michelle.roberts@stellarenterprises.com',
      phone: '+1 (555) 456-7891',
      location: 'Miami, FL',
      industry: 'E-commerce',
      companySize: '51-200 employees',
      revenue: '$5M-50M',
      status: 'contacted',
      score: 76,
      lastContact: 9,
      notes: 'Growing rapidly, needs scalable infrastructure',
      tags: ['growth', 'scalability'],
      assignedEmployeeId: 2,
      interactionHistory: generateInteractionHistory(16, 2)
    },
    {
      id: 35,
      name: 'Catherine Miller',
      company: 'Fusion Technologies',
      position: 'VP Product',
      email: 'catherine.miller@fusiontech.com',
      phone: '+1 (555) 600-7000',
      location: 'Austin, TX',
      industry: 'SaaS',
      companySize: '51-200 employees',
      revenue: '$5M-50M',
      status: 'qualified',
      score: 88,
      lastContact: 4,
      notes: 'Product-led growth company, integration requirements',
      tags: ['product-led', 'integration'],
      assignedEmployeeId: 2,
      interactionHistory: generateInteractionHistory(35, 2)
    },
    {
      id: 36,
      name: 'Richard Thompson',
      company: 'Meridian Systems',
      position: 'CTO',
      email: 'richard.thompson@meridiansystems.com',
      phone: '+1 (555) 700-8000',
      location: 'Seattle, WA',
      industry: 'Healthcare',
      companySize: '201-500 employees',
      revenue: '$50M+',
      status: 'warm',
      score: 84,
      lastContact: 7,
      notes: 'Healthcare data platform, HIPAA compliance essential',
      tags: ['healthcare', 'HIPAA', 'data-platform'],
      assignedEmployeeId: 2,
      interactionHistory: generateInteractionHistory(36, 2)
    },
    {
      id: 37,
      name: 'Elena Rodriguez',
      company: 'Catalyst Ventures',
      position: 'Founder',
      email: 'elena.rodriguez@catalystventures.com',
      phone: '+1 (555) 800-9000',
      location: 'Los Angeles, CA',
      industry: 'Finance',
      companySize: '1-50 employees',
      revenue: '$1M-5M',
      status: 'hot',
      score: 91,
      lastContact: 2,
      notes: 'Fintech startup, rapid growth trajectory',
      tags: ['fintech', 'startup', 'rapid-growth'],
      assignedEmployeeId: 2,
      interactionHistory: generateInteractionHistory(37, 2)
    },
    {
      id: 38,
      name: 'Benjamin Clark',
      company: 'Horizon Industries',
      position: 'Operations Director',
      email: 'benjamin.clark@horizonindustries.com',
      phone: '+1 (555) 900-1000',
      location: 'Phoenix, AZ',
      industry: 'Manufacturing',
      companySize: '201-500 employees',
      revenue: '$50M+',
      status: 'contacted',
      score: 79,
      lastContact: 11,
      notes: 'Manufacturing optimization project, ROI-focused',
      tags: ['manufacturing', 'optimization', 'ROI'],
      assignedEmployeeId: 2,
      interactionHistory: generateInteractionHistory(38, 2)
    },
    {
      id: 39,
      name: 'Natalie Green',
      company: 'Vertex Solutions',
      position: 'VP Strategy',
      email: 'natalie.green@vertexsolutions.com',
      phone: '+1 (555) 101-2000',
      location: 'Dallas, TX',
      industry: 'E-commerce',
      companySize: '51-200 employees',
      revenue: '$5M-50M',
      status: 'cold',
      score: 74,
      lastContact: 18,
      notes: 'E-commerce platform expansion, timing uncertain',
      tags: ['e-commerce', 'expansion'],
      assignedEmployeeId: 2,
      interactionHistory: generateInteractionHistory(39, 2)
    }
  ],
  3: [ // Emily Rodriguez's leads (Business Development Rep) - 12 leads
    {
      id: 8,
      name: 'Nicole Miller',
      company: 'SmartFlow Inc',
      position: 'Marketing Director',
      email: 'nicole.miller@smartflowinc.com',
      phone: '+1 (555) 456-8901',
      location: 'Austin, TX',
      industry: 'E-commerce',
      companySize: '1-50 employees',
      revenue: '$1M-5M',
      status: 'warm',
      score: 82,
      lastContact: 6,
      notes: 'Small team but growing fast, budget discussions ongoing',
      tags: ['hot prospect'],
      assignedEmployeeId: 3,
      interactionHistory: generateInteractionHistory(8, 3)
    },
    {
      id: 9,
      name: 'James Garcia',
      company: 'InnovateLabs',
      position: 'CEO',
      email: 'james.garcia@innovatelabs.com',
      phone: '+1 (555) 567-9012',
      location: 'San Francisco, CA',
      industry: 'SaaS',
      companySize: '51-200 employees',
      revenue: '$5M-50M',
      status: 'contacted',
      score: 79,
      lastContact: 10,
      notes: 'Startup with innovative approach, potential for growth',
      tags: ['demo scheduled'],
      assignedEmployeeId: 3,
      interactionHistory: generateInteractionHistory(9, 3)
    },
    {
      id: 10,
      name: 'Sarah Thompson',
      company: 'FutureWorks LLC',
      position: 'CTO',
      email: 'sarah.thompson@futureworksllc.com',
      phone: '+1 (555) 678-0123',
      location: 'Boston, MA',
      industry: 'Healthcare',
      companySize: '201-500 employees',
      revenue: '$50M+',
      status: 'qualified',
      score: 86,
      lastContact: 4,
      notes: 'Strong technical team, looking for scalable solutions',
      tags: ['enterprise'],
      assignedEmployeeId: 3,
      interactionHistory: generateInteractionHistory(10, 3)
    },
    {
      id: 11,
      name: 'Mark Johnson',
      company: 'Digital Dynamics',
      position: 'VP Sales',
      email: 'mark.johnson@digitaldynamics.com',
      phone: '+1 (555) 789-1234',
      location: 'New York, NY',
      industry: 'Finance',
      companySize: '500+ employees',
      revenue: '$50M+',
      status: 'cold',
      score: 75,
      lastContact: 15,
      notes: 'Large enterprise, complex decision-making process',
      tags: ['enterprise'],
      assignedEmployeeId: 3,
      interactionHistory: generateInteractionHistory(11, 3)
    },
    {
      id: 12,
      name: 'Rachel Wilson',
      company: 'ProTech Solutions',
      position: 'Marketing Director',
      email: 'rachel.wilson@protechsolutions.com',
      phone: '+1 (555) 890-2345',
      location: 'Austin, TX',
      industry: 'E-commerce',
      companySize: '1-50 employees',
      revenue: '$1M-5M',
      status: 'warm',
      score: 81,
      lastContact: 7,
      notes: 'Growing e-commerce platform, interested in automation',
      tags: ['hot prospect'],
      assignedEmployeeId: 3,
      interactionHistory: generateInteractionHistory(12, 3)
    },
    {
      id: 17,
      name: 'Brian Foster',
      company: 'Pinnacle Systems',
      position: 'Operations Manager',
      email: 'brian.foster@pinnaclesystems.com',
      phone: '+1 (555) 234-5678',
      location: 'Portland, OR',
      industry: 'Manufacturing',
      companySize: '51-200 employees',
      revenue: '$5M-50M',
      status: 'contacted',
      score: 77,
      lastContact: 11,
      notes: 'Interested in process optimization, needs ROI analysis',
      tags: ['manufacturing', 'ROI-focused'],
      assignedEmployeeId: 3,
      interactionHistory: generateInteractionHistory(17, 3)
    },
    {
      id: 18,
      name: 'Angela Martinez',
      company: 'Bright Future Tech',
      position: 'Founder',
      email: 'angela.martinez@brightfuturetech.com',
      phone: '+1 (555) 345-6789',
      location: 'San Diego, CA',
      industry: 'Education',
      companySize: '1-50 employees',
      revenue: '$1M-5M',
      status: 'warm',
      score: 84,
      lastContact: 5,
      notes: 'EdTech startup, passionate about innovation',
      tags: ['startup', 'education'],
      assignedEmployeeId: 3,
      interactionHistory: generateInteractionHistory(18, 3)
    },
    {
      id: 40,
      name: 'Tyler Adams',
      company: 'Rapid Growth Co',
      position: 'CEO',
      email: 'tyler.adams@rapidgrowth.com',
      phone: '+1 (555) 111-3000',
      location: 'Denver, CO',
      industry: 'SaaS',
      companySize: '1-50 employees',
      revenue: '$1M-5M',
      status: 'hot',
      score: 89,
      lastContact: 2,
      notes: 'Fast-growing SaaS startup, immediate need',
      tags: ['startup', 'fast-growth', 'immediate-need'],
      assignedEmployeeId: 3,
      interactionHistory: generateInteractionHistory(40, 3)
    },
    {
      id: 41,
      name: 'Melissa Wong',
      company: 'TechFlow Dynamics',
      position: 'VP Marketing',
      email: 'melissa.wong@techflowdynamics.com',
      phone: '+1 (555) 222-4000',
      location: 'San Jose, CA',
      industry: 'Healthcare',
      companySize: '51-200 employees',
      revenue: '$5M-50M',
      status: 'qualified',
      score: 85,
      lastContact: 5,
      notes: 'Healthcare tech company, marketing automation focus',
      tags: ['healthcare', 'marketing-automation'],
      assignedEmployeeId: 3,
      interactionHistory: generateInteractionHistory(41, 3)
    },
    {
      id: 42,
      name: 'David Park',
      company: 'Streamline Solutions',
      position: 'Operations Director',
      email: 'david.park@streamlinesolutions.com',
      phone: '+1 (555) 333-5000',
      location: 'Nashville, TN',
      industry: 'Finance',
      companySize: '51-200 employees',
      revenue: '$5M-50M',
      status: 'warm',
      score: 80,
      lastContact: 8,
      notes: 'Financial services, process streamlining initiative',
      tags: ['financial-services', 'process-improvement'],
      assignedEmployeeId: 3,
      interactionHistory: generateInteractionHistory(42, 3)
    },
    {
      id: 43,
      name: 'Jennifer Kim',
      company: 'Agile Enterprises',
      position: 'Product Manager',
      email: 'jennifer.kim@agileenterprises.com',
      phone: '+1 (555) 444-6000',
      location: 'Portland, OR',
      industry: 'E-commerce',
      companySize: '1-50 employees',
      revenue: '$1M-5M',
      status: 'contacted',
      score: 78,
      lastContact: 12,
      notes: 'Agile methodology focus, product development tools',
      tags: ['agile', 'product-development'],
      assignedEmployeeId: 3,
      interactionHistory: generateInteractionHistory(43, 3)
    },
    {
      id: 44,
      name: 'Michael Torres',
      company: 'Innovation Hub',
      position: 'Director',
      email: 'michael.torres@innovationhub.com',
      phone: '+1 (555) 555-7000',
      location: 'Tampa, FL',
      industry: 'Manufacturing',
      companySize: '51-200 employees',
      revenue: '$5M-50M',
      status: 'cold',
      score: 73,
      lastContact: 19,
      notes: 'Manufacturing innovation center, pilot program interest',
      tags: ['manufacturing', 'innovation', 'pilot'],
      assignedEmployeeId: 3,
      interactionHistory: generateInteractionHistory(44, 3)
    }
  ],
  4: [ // David Kim's leads (Customer Success Director) - 9 leads
    {
      id: 19,
      name: 'Steven Clark',
      company: 'Enterprise Solutions Group',
      position: 'CEO',
      email: 'steven.clark@enterprisesolutions.com',
      phone: '+1 (555) 111-2222',
      location: 'Atlanta, GA',
      industry: 'SaaS',
      companySize: '500+ employees',
      revenue: '$50M+',
      status: 'hot',
      score: 96,
      lastContact: 1,
      notes: 'Strategic partnership opportunity, C-level engagement',
      tags: ['enterprise', 'strategic', 'partnership'],
      assignedEmployeeId: 4,
      interactionHistory: generateInteractionHistory(19, 4)
    },
    {
      id: 20,
      name: 'Jennifer Lee',
      company: 'Global Tech Innovations',
      position: 'VP Strategy',
      email: 'jennifer.lee@globaltechinnovations.com',
      phone: '+1 (555) 222-3333',
      location: 'San Francisco, CA',
      industry: 'Healthcare',
      companySize: '500+ employees',
      revenue: '$50M+',
      status: 'qualified',
      score: 91,
      lastContact: 3,
      notes: 'Multi-year contract potential, complex requirements',
      tags: ['enterprise', 'multi-year', 'complex'],
      assignedEmployeeId: 4,
      interactionHistory: generateInteractionHistory(20, 4)
    },
    {
      id: 21,
      name: 'Robert Chen',
      company: 'Titan Industries',
      position: 'Chief Innovation Officer',
      email: 'robert.chen@titanindustries.com',
      phone: '+1 (555) 333-4444',
      location: 'New York, NY',
      industry: 'Finance',
      companySize: '500+ employees',
      revenue: '$50M+',
      status: 'warm',
      score: 87,
      lastContact: 7,
      notes: 'Innovation-focused, looking for cutting-edge solutions',
      tags: ['enterprise', 'innovation'],
      assignedEmployeeId: 4,
      interactionHistory: generateInteractionHistory(21, 4)
    },
    {
      id: 22,
      name: 'Maria Rodriguez',
      company: 'Visionary Corp',
      position: 'President',
      email: 'maria.rodriguez@visionarycorp.com',
      phone: '+1 (555) 444-5555',
      location: 'Los Angeles, CA',
      industry: 'E-commerce',
      companySize: '201-500 employees',
      revenue: '$50M+',
      status: 'contacted',
      score: 82,
      lastContact: 8,
      notes: 'Expansion plans in progress, timing is key',
      tags: ['expansion', 'timing-sensitive'],
      assignedEmployeeId: 4,
      interactionHistory: generateInteractionHistory(22, 4)
    },
    {
      id: 45,
      name: 'William Harrison',
      company: 'Strategic Ventures',
      position: 'Chairman',
      email: 'william.harrison@strategicventures.com',
      phone: '+1 (555) 666-8000',
      location: 'Boston, MA',
      industry: 'SaaS',
      companySize: '500+ employees',
      revenue: '$50M+',
      status: 'hot',
      score: 97,
      lastContact: 1,
      notes: 'Board-level strategic initiative, enterprise transformation',
      tags: ['enterprise', 'board-level', 'transformation'],
      assignedEmployeeId: 4,
      interactionHistory: generateInteractionHistory(45, 4)
    },
    {
      id: 46,
      name: 'Amanda Foster',
      company: 'Pinnacle Healthcare',
      position: 'Chief Executive Officer',
      email: 'amanda.foster@pinnaclehealthcare.com',
      phone: '+1 (555) 777-9000',
      location: 'Houston, TX',
      industry: 'Healthcare',
      companySize: '500+ employees',
      revenue: '$50M+',
      status: 'qualified',
      score: 93,
      lastContact: 2,
      notes: 'Healthcare system modernization, patient data focus',
      tags: ['healthcare', 'modernization', 'patient-data'],
      assignedEmployeeId: 4,
      interactionHistory: generateInteractionHistory(46, 4)
    },
    {
      id: 47,
      name: 'Charles Mitchell',
      company: 'Global Financial Group',
      position: 'Managing Director',
      email: 'charles.mitchell@globalfinancial.com',
      phone: '+1 (555) 888-1000',
      location: 'New York, NY',
      industry: 'Finance',
      companySize: '500+ employees',
      revenue: '$50M+',
      status: 'warm',
      score: 88,
      lastContact: 5,
      notes: 'Financial services transformation, regulatory focus',
      tags: ['financial-services', 'regulatory', 'transformation'],
      assignedEmployeeId: 4,
      interactionHistory: generateInteractionHistory(47, 4)
    },
    {
      id: 48,
      name: 'Lisa Chang',
      company: 'Mega Commerce Inc',
      position: 'Chief Strategy Officer',
      email: 'lisa.chang@megacommerce.com',
      phone: '+1 (555) 999-2000',
      location: 'Seattle, WA',
      industry: 'E-commerce',
      companySize: '500+ employees',
      revenue: '$50M+',
      status: 'contacted',
      score: 84,
      lastContact: 6,
      notes: 'E-commerce platform scaling, international expansion',
      tags: ['e-commerce', 'scaling', 'international'],
      assignedEmployeeId: 4,
      interactionHistory: generateInteractionHistory(48, 4)
    },
    {
      id: 49,
      name: 'Gregory Stone',
      company: 'Industrial Solutions Corp',
      position: 'President',
      email: 'gregory.stone@industrialsolutions.com',
      phone: '+1 (555) 101-3000',
      location: 'Detroit, MI',
      industry: 'Manufacturing',
      companySize: '500+ employees',
      revenue: '$50M+',
      status: 'cold',
      score: 76,
      lastContact: 16,
      notes: 'Industrial IoT initiative, long sales cycle expected',
      tags: ['manufacturing', 'IoT', 'long-cycle'],
      assignedEmployeeId: 4,
      interactionHistory: generateInteractionHistory(49, 4)
    }
  ],
  5: [ // Jessica Adams's leads (Technical Account Manager) - 9 leads
    {
      id: 23,
      name: 'Andrew Thompson',
      company: 'TechBridge Solutions',
      position: 'CTO',
      email: 'andrew.thompson@techbridgesolutions.com',
      phone: '+1 (555) 555-6666',
      location: 'Boston, MA',
      industry: 'SaaS',
      companySize: '51-200 employees',
      revenue: '$5M-50M',
      status: 'qualified',
      score: 88,
      lastContact: 4,
      notes: 'Technical integration requirements, API-focused',
      tags: ['technical', 'API', 'integration'],
      assignedEmployeeId: 5,
      interactionHistory: generateInteractionHistory(23, 5)
    },
    {
      id: 24,
      name: 'Linda Wang',
      company: 'DataFlow Technologies',
      position: 'VP Engineering',
      email: 'linda.wang@dataflowtechnologies.com',
      phone: '+1 (555) 666-7777',
      location: 'Seattle, WA',
      industry: 'Healthcare',
      companySize: '201-500 employees',
      revenue: '$50M+',
      status: 'warm',
      score: 85,
      lastContact: 6,
      notes: 'Data security and compliance are top priorities',
      tags: ['healthcare', 'compliance', 'security'],
      assignedEmployeeId: 5,
      interactionHistory: generateInteractionHistory(24, 5)
    },
    {
      id: 25,
      name: 'Carlos Mendez',
      company: 'Innovative Systems Inc',
      position: 'IT Director',
      email: 'carlos.mendez@innovativesystems.com',
      phone: '+1 (555) 777-8888',
      location: 'Phoenix, AZ',
      industry: 'Manufacturing',
      companySize: '51-200 employees',
      revenue: '$5M-50M',
      status: 'contacted',
      score: 79,
      lastContact: 9,
      notes: 'Legacy system modernization project',
      tags: ['modernization', 'legacy-systems'],
      assignedEmployeeId: 5,
      interactionHistory: generateInteractionHistory(25, 5)
    },
    {
      id: 26,
      name: 'Rebecca Davis',
      company: 'Smart Solutions Group',
      position: 'Technical Lead',
      email: 'rebecca.davis@smartsolutionsgroup.com',
      phone: '+1 (555) 888-9999',
      location: 'Dallas, TX',
      industry: 'Finance',
      companySize: '201-500 employees',
      revenue: '$50M+',
      status: 'cold',
      score: 73,
      lastContact: 18,
      notes: 'Technical evaluation in progress, slow decision process',
      tags: ['technical', 'slow-process'],
      assignedEmployeeId: 5,
      interactionHistory: generateInteractionHistory(26, 5)
    },
    {
      id: 50,
      name: 'Kevin Liu',
      company: 'DevOps Solutions',
      position: 'Chief Technology Officer',
      email: 'kevin.liu@devopssolutions.com',
      phone: '+1 (555) 202-4000',
      location: 'San Francisco, CA',
      industry: 'SaaS',
      companySize: '51-200 employees',
      revenue: '$5M-50M',
      status: 'qualified',
      score: 90,
      lastContact: 3,
      notes: 'DevOps automation focus, CI/CD pipeline requirements',
      tags: ['devops', 'automation', 'CI/CD'],
      assignedEmployeeId: 5,
      interactionHistory: generateInteractionHistory(50, 5)
    },
    {
      id: 51,
      name: 'Sarah Martinez',
      company: 'HealthTech Innovations',
      position: 'VP Engineering',
      email: 'sarah.martinez@healthtechinnovations.com',
      phone: '+1 (555) 303-5000',
      location: 'Austin, TX',
      industry: 'Healthcare',
      companySize: '201-500 employees',
      revenue: '$50M+',
      status: 'hot',
      score: 92,
      lastContact: 1,
      notes: 'Healthcare data integration, FHIR compliance needed',
      tags: ['healthcare', 'data-integration', 'FHIR'],
      assignedEmployeeId: 5,
      interactionHistory: generateInteractionHistory(51, 5)
    },
    {
      id: 52,
      name: 'James Wilson',
      company: 'Manufacturing Tech Co',
      position: 'IT Manager',
      email: 'james.wilson@manufacturingtech.com',
      phone: '+1 (555) 404-6000',
      location: 'Cleveland, OH',
      industry: 'Manufacturing',
      companySize: '51-200 employees',
      revenue: '$5M-50M',
      status: 'warm',
      score: 81,
      lastContact: 7,
      notes: 'Manufacturing execution system integration',
      tags: ['manufacturing', 'MES', 'integration'],
      assignedEmployeeId: 5,
      interactionHistory: generateInteractionHistory(52, 5)
    },
    {
      id: 53,
      name: 'Diana Chen',
      company: 'FinTech Dynamics',
      position: 'Lead Developer',
      email: 'diana.chen@fintechdynamics.com',
      phone: '+1 (555) 505-7000',
      location: 'New York, NY',
      industry: 'Finance',
      companySize: '201-500 employees',
      revenue: '$50M+',
      status: 'contacted',
      score: 77,
      lastContact: 10,
      notes: 'Financial API integration, real-time data processing',
      tags: ['fintech', 'API', 'real-time'],
      assignedEmployeeId: 5,
      interactionHistory: generateInteractionHistory(53, 5)
    },
    {
      id: 54,
      name: 'Robert Kim',
      company: 'E-commerce Platform Inc',
      position: 'Senior Architect',
      email: 'robert.kim@ecommerceplatform.com',
      phone: '+1 (555) 606-8000',
      location: 'Los Angeles, CA',
      industry: 'E-commerce',
      companySize: '201-500 employees',
      revenue: '$50M+',
      status: 'cold',
      score: 74,
      lastContact: 17,
      notes: 'E-commerce platform architecture, scalability concerns',
      tags: ['e-commerce', 'architecture', 'scalability'],
      assignedEmployeeId: 5,
      interactionHistory: generateInteractionHistory(54, 5)
    }
  ],
  6: [ // Robert Taylor's leads (Implementation Manager) - 8 leads
    {
      id: 27,
      name: 'Gregory Wilson',
      company: 'Premier Business Solutions',
      position: 'Operations Director',
      email: 'gregory.wilson@premierbusiness.com',
      phone: '+1 (555) 999-0000',
      location: 'Nashville, TN',
      industry: 'SaaS',
      companySize: '51-200 employees',
      revenue: '$5M-50M',
      status: 'warm',
      score: 86,
      lastContact: 5,
      notes: 'Implementation timeline is critical, Q1 go-live target',
      tags: ['implementation', 'timeline-critical'],
      assignedEmployeeId: 6,
      interactionHistory: generateInteractionHistory(27, 6)
    },
    {
      id: 28,
      name: 'Diana Foster',
      company: 'Excellence Enterprises',
      position: 'Project Manager',
      email: 'diana.foster@excellenceenterprises.com',
      phone: '+1 (555) 000-1111',
      location: 'Salt Lake City, UT',
      industry: 'Education',
      companySize: '201-500 employees',
      revenue: '$50M+',
      status: 'qualified',
      score: 89,
      lastContact: 3,
      notes: 'Large-scale rollout planned, training requirements',
      tags: ['education', 'large-scale', 'training'],
      assignedEmployeeId: 6,
      interactionHistory: generateInteractionHistory(28, 6)
    },
    {
      id: 29,
      name: 'Paul Anderson',
      company: 'Strategic Growth Partners',
      position: 'Managing Partner',
      email: 'paul.anderson@strategicgrowth.com',
      phone: '+1 (555) 111-2222',
      location: 'Minneapolis, MN',
      industry: 'Finance',
      companySize: '51-200 employees',
      revenue: '$5M-50M',
      status: 'contacted',
      score: 80,
      lastContact: 10,
      notes: 'Multiple office locations, phased implementation approach',
      tags: ['multi-location', 'phased-implementation'],
      assignedEmployeeId: 6,
      interactionHistory: generateInteractionHistory(29, 6)
    },
    {
      id: 55,
      name: 'Michelle Taylor',
      company: 'Learning Solutions Corp',
      position: 'Implementation Director',
      email: 'michelle.taylor@learningsolutions.com',
      phone: '+1 (555) 707-9000',
      location: 'Orlando, FL',
      industry: 'Education',
      companySize: '51-200 employees',
      revenue: '$5M-50M',
      status: 'qualified',
      score: 87,
      lastContact: 4,
      notes: 'Educational platform deployment, teacher training focus',
      tags: ['education', 'deployment', 'teacher-training'],
      assignedEmployeeId: 6,
      interactionHistory: generateInteractionHistory(55, 6)
    },
    {
      id: 56,
      name: 'Anthony Garcia',
      company: 'Healthcare Systems Inc',
      position: 'Project Director',
      email: 'anthony.garcia@healthcaresystems.com',
      phone: '+1 (555) 808-1000',
      location: 'Phoenix, AZ',
      industry: 'Healthcare',
      companySize: '201-500 employees',
      revenue: '$50M+',
      status: 'warm',
      score: 83,
      lastContact: 6,
      notes: 'Healthcare system implementation, staff training critical',
      tags: ['healthcare', 'system-implementation', 'staff-training'],
      assignedEmployeeId: 6,
      interactionHistory: generateInteractionHistory(56, 6)
    },
    {
      id: 57,
      name: 'Karen White',
      company: 'Financial Services Group',
      position: 'Operations Manager',
      email: 'karen.white@financialservicesgroup.com',
      phone: '+1 (555) 909-2000',
      location: 'Charlotte, NC',
      industry: 'Finance',
      companySize: '201-500 employees',
      revenue: '$50M+',
      status: 'contacted',
      score: 78,
      lastContact: 11,
      notes: 'Financial services implementation, compliance training needed',
      tags: ['financial-services', 'compliance-training'],
      assignedEmployeeId: 6,
      interactionHistory: generateInteractionHistory(57, 6)
    },
    {
      id: 58,
      name: 'Steven Brown',
      company: 'Manufacturing Excellence',
      position: 'Plant Manager',
      email: 'steven.brown@manufacturingexcellence.com',
      phone: '+1 (555) 010-3000',
      location: 'Milwaukee, WI',
      industry: 'Manufacturing',
      companySize: '51-200 employees',
      revenue: '$5M-50M',
      status: 'cold',
      score: 75,
      lastContact: 14,
      notes: 'Manufacturing floor implementation, worker training essential',
      tags: ['manufacturing', 'floor-implementation', 'worker-training'],
      assignedEmployeeId: 6,
      interactionHistory: generateInteractionHistory(58, 6)
    },
    {
      id: 59,
      name: 'Patricia Johnson',
      company: 'Retail Solutions Network',
      position: 'Deployment Manager',
      email: 'patricia.johnson@retailsolutions.com',
      phone: '+1 (555) 121-4000',
      location: 'Las Vegas, NV',
      industry: 'E-commerce',
      companySize: '51-200 employees',
      revenue: '$5M-50M',
      status: 'warm',
      score: 82,
      lastContact: 8,
      notes: 'Retail network deployment, multi-store rollout planned',
      tags: ['retail', 'multi-store', 'rollout'],
      assignedEmployeeId: 6,
      interactionHistory: generateInteractionHistory(59, 6)
    }
  ]
};

// Employee-Customer mapping for CRM
export const employeeCustomersMap = {
  4: [ // David Kim's customers (Customer Success Director)
    {
      id: 1,
      company: 'Acme Corporation',
      primaryContact: 'John Smith',
      title: 'CEO',
      email: 'john.smith@acmecorporation.com',
      phone: '+1 (555) 111-2222',
      industry: 'SaaS',
      tier: 'Enterprise',
      status: 'active',
      healthScore: 92,
      contractValue: 450000,
      monthlyValue: 37500,
      renewalDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000), // 120 days from now
      lastInteraction: 3,
      totalInteractions: 87,
      supportTickets: 2,
      productUsage: 94,
      expansionPotential: 200000,
      assignedEmployeeId: 4,
      churnRisk: 'low',
      satisfactionScore: 5,
      onboardingComplete: true,
      tags: ['enterprise', 'high-value', 'strategic'],
      recentActivities: [
        { type: 'meeting', date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), description: 'Quarterly business review completed' },
        { type: 'expansion', date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), description: 'Expressed interest in additional features' }
      ],
      predictiveInsights: {
        renewalProbability: 95,
        expansionProbability: 78,
        churnPrediction: 5,
        optimalContactTime: 'Morning',
        preferredChannel: 'Video Call'
      }
    },
    {
      id: 2,
      company: 'TechFlow Solutions',
      primaryContact: 'Maria Williams',
      title: 'CTO',
      email: 'maria.williams@techflowsolutions.com',
      phone: '+1 (555) 222-3333',
      industry: 'Healthcare',
      tier: 'Professional',
      status: 'expansion-opportunity',
      healthScore: 88,
      contractValue: 280000,
      monthlyValue: 23333,
      renewalDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
      lastInteraction: 7,
      totalInteractions: 65,
      supportTickets: 1,
      productUsage: 89,
      expansionPotential: 150000,
      assignedEmployeeId: 4,
      churnRisk: 'low',
      satisfactionScore: 4,
      onboardingComplete: true,
      tags: ['high-value', 'expansion-ready'],
      recentActivities: [
        { type: 'support', date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), description: 'Support ticket resolved' },
        { type: 'meeting', date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), description: 'Product roadmap discussion' }
      ],
      predictiveInsights: {
        renewalProbability: 92,
        expansionProbability: 85,
        churnPrediction: 8,
        optimalContactTime: 'Afternoon',
        preferredChannel: 'Email'
      }
    },
    {
      id: 3,
      company: 'DataSync Industries',
      primaryContact: 'Alex Brown',
      title: 'VP Technology',
      email: 'alex.brown@datasyncindustries.com',
      phone: '+1 (555) 333-4444',
      industry: 'Finance',
      tier: 'Enterprise',
      status: 'renewal-pending',
      healthScore: 75,
      contractValue: 380000,
      monthlyValue: 31667,
      renewalDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
      lastInteraction: 12,
      totalInteractions: 52,
      supportTickets: 5,
      productUsage: 76,
      expansionPotential: 100000,
      assignedEmployeeId: 4,
      churnRisk: 'medium',
      satisfactionScore: 3,
      onboardingComplete: true,
      tags: ['enterprise', 'technical'],
      recentActivities: [
        { type: 'support', date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), description: 'Multiple support tickets opened' },
        { type: 'meeting', date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), description: 'Renewal discussion scheduled' }
      ],
      predictiveInsights: {
        renewalProbability: 72,
        expansionProbability: 45,
        churnPrediction: 28,
        optimalContactTime: 'Morning',
        preferredChannel: 'Phone'
      }
    }
  ],
  5: [ // Jessica Adams's customers (Technical Account Manager)
    {
      id: 4,
      company: 'CloudScale Systems',
      primaryContact: 'James Davis',
      title: 'IT Director',
      email: 'james.davis@cloudscalesystems.com',
      phone: '+1 (555) 444-5555',
      industry: 'E-commerce',
      tier: 'Professional',
      status: 'active',
      healthScore: 85,
      contractValue: 195000,
      monthlyValue: 16250,
      renewalDate: new Date(Date.now() + 200 * 24 * 60 * 60 * 1000),
      lastInteraction: 5,
      totalInteractions: 43,
      supportTickets: 3,
      productUsage: 82,
      expansionPotential: 80000,
      assignedEmployeeId: 5,
      churnRisk: 'low',
      satisfactionScore: 4,
      onboardingComplete: true,
      tags: ['technical', 'expansion-ready'],
      recentActivities: [
        { type: 'support', date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), description: 'Technical integration support' },
        { type: 'meeting', date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), description: 'API implementation review' }
      ],
      predictiveInsights: {
        renewalProbability: 88,
        expansionProbability: 65,
        churnPrediction: 12,
        optimalContactTime: 'Afternoon',
        preferredChannel: 'Email'
      }
    },
    {
      id: 5,
      company: 'NextGen Software',
      primaryContact: 'Lisa Johnson',
      title: 'Operations Manager',
      email: 'lisa.johnson@nextgensoftware.com',
      phone: '+1 (555) 555-6666',
      industry: 'Manufacturing',
      tier: 'Standard',
      status: 'at-risk',
      healthScore: 45,
      contractValue: 120000,
      monthlyValue: 10000,
      renewalDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      lastInteraction: 25,
      totalInteractions: 28,
      supportTickets: 8,
      productUsage: 58,
      expansionPotential: 40000,
      assignedEmployeeId: 5,
      churnRisk: 'high',
      satisfactionScore: 2,
      onboardingComplete: false,
      tags: ['at-risk', 'technical'],
      recentActivities: [
        { type: 'support', date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), description: 'Escalated technical issues' },
        { type: 'meeting', date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), description: 'Emergency support call' }
      ],
      predictiveInsights: {
        renewalProbability: 35,
        expansionProbability: 15,
        churnPrediction: 65,
        optimalContactTime: 'Morning',
        preferredChannel: 'Phone'
      }
    }
  ],
  6: [ // Robert Taylor's customers (Implementation Manager)
    {
      id: 6,
      company: 'SmartBridge Inc',
      primaryContact: 'Michael Wilson',
      title: 'CEO',
      email: 'michael.wilson@smartbridgeinc.com',
      phone: '+1 (555) 666-7777',
      industry: 'Education',
      tier: 'Professional',
      status: 'active',
      healthScore: 91,
      contractValue: 165000,
      monthlyValue: 13750,
      renewalDate: new Date(Date.now() + 150 * 24 * 60 * 60 * 1000),
      lastInteraction: 8,
      totalInteractions: 38,
      supportTickets: 1,
      productUsage: 88,
      expansionPotential: 75000,
      assignedEmployeeId: 6,
      churnRisk: 'low',
      satisfactionScore: 5,
      onboardingComplete: true,
      tags: ['high-value', 'strategic'],
      recentActivities: [
        { type: 'meeting', date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), description: 'Implementation milestone review' },
        { type: 'expansion', date: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000), description: 'Discussed additional modules' }
      ],
      predictiveInsights: {
        renewalProbability: 94,
        expansionProbability: 72,
        churnPrediction: 6,
        optimalContactTime: 'Morning',
        preferredChannel: 'Video Call'
      }
    },
    {
      id: 7,
      company: 'FutureWorks LLC',
      primaryContact: 'Sarah Miller',
      title: 'CTO',
      email: 'sarah.miller@futureworksllc.com',
      phone: '+1 (555) 777-8888',
      industry: 'SaaS',
      tier: 'Standard',
      status: 'active',
      healthScore: 78,
      contractValue: 95000,
      monthlyValue: 7917,
      renewalDate: new Date(Date.now() + 220 * 24 * 60 * 60 * 1000),
      lastInteraction: 14,
      totalInteractions: 31,
      supportTickets: 2,
      productUsage: 73,
      expansionPotential: 50000,
      assignedEmployeeId: 6,
      churnRisk: 'medium',
      satisfactionScore: 4,
      onboardingComplete: true,
      tags: ['technical'],
      recentActivities: [
        { type: 'support', date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), description: 'Configuration assistance' },
        { type: 'meeting', date: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000), description: 'Quarterly check-in' }
      ],
      predictiveInsights: {
        renewalProbability: 78,
        expansionProbability: 55,
        churnPrediction: 22,
        optimalContactTime: 'Afternoon',
        preferredChannel: 'Email'
      }
    },
    {
      id: 8,
      company: 'Digital Dynamics',
      primaryContact: 'Robert Garcia',
      title: 'VP Technology',
      email: 'robert.garcia@digitaldynamics.com',
      phone: '+1 (555) 888-9999',
      industry: 'Finance',
      tier: 'Enterprise',
      status: 'churned',
      healthScore: 25,
      contractValue: 320000,
      monthlyValue: 26667,
      renewalDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      lastInteraction: 45,
      totalInteractions: 22,
      supportTickets: 12,
      productUsage: 35,
      expansionPotential: 0,
      assignedEmployeeId: 6,
      churnRisk: 'high',
      satisfactionScore: 1,
      onboardingComplete: false,
      tags: ['churned', 'enterprise'],
      recentActivities: [
        { type: 'support', date: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000), description: 'Contract termination notice' },
        { type: 'meeting', date: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000), description: 'Exit interview conducted' }
      ],
      predictiveInsights: {
        renewalProbability: 5,
        expansionProbability: 0,
        churnPrediction: 95,
        optimalContactTime: 'Morning',
        preferredChannel: 'Email'
      }
    }
  ]
};

// Helper functions
export const getAllLeads = () => {
  return Object.values(employeeLeadsMap).flat();
};

export const getLeadsByEmployeeId = (employeeId) => {
  return employeeLeadsMap[employeeId] || [];
};

export const getAllCustomers = () => [
  {
    id: '101',
    company: 'TechCorp Solutions',
    email: 'contact@techcorp.com',
    phone: '+1 (555) 123-4567',
    primaryContact: 'John Smith',
    title: 'CTO',
    status: 'active',
    healthScore: 85,
    churnRisk: 'low',
    contractValue: 150000,
    arr: 150000,
    renewalDate: '2024-12-31',
    lastContactDate: '2024-03-15',
    nextFollowUp: '2024-04-01',
    assignedEmployeeId: '1',
    productUsage: 78,
    funnelStage: 'qualified',
    timeline: [
      {
        type: 'meeting',
        title: 'Quarterly Review',
        description: 'Discussed Q1 performance and future plans',
        date: '2024-03-15'
      },
      {
        type: 'note',
        title: 'Feature Request',
        description: 'Client requested API integration capabilities',
        date: '2024-03-10'
      },
      {
        type: 'alert',
        title: 'Usage Spike',
        description: 'Unusual increase in API calls',
        date: '2024-03-05'
      }
    ],
    notes: [
      {
        content: 'Client expressed interest in enterprise package',
        date: '2024-03-15',
        author: 'Sarah Johnson'
      },
      {
        content: 'Technical requirements document received',
        date: '2024-03-10',
        author: 'Mike Chen'
      }
    ],
    predictiveInsights: {
      renewalProbability: 90,
      expansionProbability: 75
    }
  },
  {
    id: '2',
    company: 'InnovatePro Inc',
    email: 'sales@innovatepro.com',
    phone: '+1 (555) 987-6543',
    primaryContact: 'Emily Brown',
    title: 'CEO',
    status: 'at-risk',
    healthScore: 45,
    churnRisk: 'high',
    contractValue: 75000,
    arr: 75000,
    renewalDate: '2024-09-30',
    lastContactDate: '2024-03-10',
    nextFollowUp: '2024-03-25',
    assignedEmployeeId: '2',
    productUsage: 32,
    funnelStage: 'proposal',
    timeline: [
      {
        type: 'alert',
        title: 'Decreased Usage',
        description: 'Product usage dropped by 20%',
        date: '2024-03-10'
      },
      {
        type: 'meeting',
        title: 'Emergency Check-in',
        description: 'Addressed concerns about platform stability',
        date: '2024-03-08'
      }
    ],
    notes: [
      {
        content: 'Customer reported issues with new feature',
        date: '2024-03-10',
        author: 'Alex Wong'
      }
    ],
    predictiveInsights: {
      renewalProbability: 35,
      expansionProbability: 20
    }
  },
  {
    id: '3',
    company: 'DataFlow Analytics',
    email: 'hello@dataflow.io',
    phone: '+1 (555) 246-8135',
    primaryContact: 'Michael Chen',
    title: 'VP of Engineering',
    status: 'active',
    healthScore: 72,
    churnRisk: 'low',
    contractValue: 95000,
    arr: 95000,
    renewalDate: '2024-11-15',
    lastContactDate: '2024-03-18',
    nextFollowUp: '2024-04-10',
    assignedEmployeeId: '3',
    productUsage: 68,
    funnelStage: 'customer',
    timeline: [
      {
        type: 'meeting',
        title: 'Product Demo',
        description: 'Showcased new analytics dashboard features',
        date: '2024-03-18'
      },
      {
        type: 'note',
        title: 'Integration Complete',
        description: 'Successfully integrated with their existing data pipeline',
        date: '2024-03-12'
      }
    ],
    notes: [
      {
        content: 'Very satisfied with performance improvements',
        date: '2024-03-18',
        author: 'Lisa Wang'
      }
    ],
    predictiveInsights: {
      renewalProbability: 85,
      expansionProbability: 60
    }
  },
  {
    id: '4',
    company: 'CloudScale Systems',
    email: 'partnerships@cloudscale.com',
    phone: '+1 (555) 369-2580',
    primaryContact: 'Emily Rodriguez',
    title: 'Product Manager',
    status: 'renewal-pending',
    healthScore: 67,
    churnRisk: 'medium',
    contractValue: 120000,
    arr: 120000,
    renewalDate: '2024-04-30',
    lastContactDate: '2024-03-20',
    nextFollowUp: '2024-03-27',
    assignedEmployeeId: '1',
    productUsage: 52,
    funnelStage: 'negotiation',
          timeline: [
        {
          type: 'meeting',
          title: 'Renewal Discussion',
          description: 'Discussed contract renewal terms and potential expansion',
          date: '2024-03-20'
        },
        {
          type: 'note',
          title: 'Pricing Negotiation',
          description: 'Customer requesting volume discount for renewal',
          date: '2024-03-18'
        }
      ],
      notes: [
        {
          content: 'Renewal negotiation in progress, price sensitive but satisfied with service',
          date: '2024-03-20',
          author: 'John Smith'
        }
      ],
      predictiveInsights: {
        renewalProbability: 75,
        expansionProbability: 60
      }
  },
  {
    id: '5',
    company: 'FinTech Innovations',
    email: 'business@fintech-innovations.com',
    phone: '+1 (555) 147-9632',
    primaryContact: 'David Park',
    title: 'Director of Technology',
    status: 'active',
    healthScore: 91,
    churnRisk: 'low',
    contractValue: 200000,
    arr: 200000,
    renewalDate: '2025-01-31',
    lastContactDate: '2024-03-22',
    nextFollowUp: '2024-04-15',
    assignedEmployeeId: '2',
    productUsage: 89,
    funnelStage: 'customer',
    timeline: [
      {
        type: 'meeting',
        title: 'Expansion Discussion',
        description: 'Exploring additional modules for fraud detection',
        date: '2024-03-22'
      },
      {
        type: 'note',
        title: 'Performance Metrics',
        description: 'Achieved 99.9% uptime this quarter',
        date: '2024-03-20'
      }
    ],
    notes: [
      {
        content: 'Excellent partnership, looking to expand into new markets',
        date: '2024-03-22',
        author: 'Sarah Johnson'
      }
    ],
    predictiveInsights: {
      renewalProbability: 95,
      expansionProbability: 85
    }
  },
  {
    id: '6',
    company: 'HealthTech Solutions',
    email: 'contact@healthtech-solutions.org',
    phone: '+1 (555) 753-9514',
    primaryContact: 'Lisa Wang',
    title: 'COO',
    status: 'renewal-pending',
    healthScore: 61,
    churnRisk: 'medium',
    contractValue: 85000,
    arr: 85000,
    renewalDate: '2024-05-15',
    lastContactDate: '2024-03-19',
    nextFollowUp: '2024-03-29',
    assignedEmployeeId: '3',
    productUsage: 48,
    funnelStage: 'negotiation',
          timeline: [
        {
          type: 'meeting',
          title: 'Renewal Planning',
          description: 'Reviewed contract performance and renewal terms',
          date: '2024-03-19'
        },
        {
          type: 'note',
          title: 'Compliance Updates',
          description: 'Discussed new healthcare compliance features in next version',
          date: '2024-03-17'
        }
      ],
      notes: [
        {
          content: 'Satisfied with compliance features, considering renewal with expanded license',
          date: '2024-03-19',
          author: 'Mike Chen'
        }
      ],
      predictiveInsights: {
        renewalProbability: 70,
        expansionProbability: 65
      }
  },
  {
    id: '7',
    company: 'Advanced Manufacturing Corp',
    email: 'procurement@advancedmfg.com',
    phone: '+1 (555) 852-7410',
    primaryContact: 'Robert Taylor',
    title: 'IT Director',
    status: 'active',
    healthScore: 58,
    churnRisk: 'medium',
    contractValue: 65000,
    arr: 65000,
    renewalDate: '2024-08-30',
    lastContactDate: '2024-03-14',
    nextFollowUp: '2024-04-05',
    assignedEmployeeId: '1',
    productUsage: 45,
    funnelStage: 'customer',
    timeline: [
      {
        type: 'alert',
        title: 'Support Ticket',
        description: 'Reported issues with data synchronization',
        date: '2024-03-14'
      },
      {
        type: 'meeting',
        title: 'Technical Support',
        description: 'Resolved integration issues with ERP system',
        date: '2024-03-12'
      }
    ],
    notes: [
      {
        content: 'Some technical challenges but willing to work through them',
        date: '2024-03-14',
        author: 'Alex Wong'
      }
    ],
    predictiveInsights: {
      renewalProbability: 65,
      expansionProbability: 40
    }
  },
  {
    id: '8',
    company: 'Digital Marketing Pro',
    email: 'hello@digitalmarketingpro.com',
    phone: '+1 (555) 963-7412',
    primaryContact: 'Jessica Adams',
    title: 'Marketing Director',
    status: 'active',
    healthScore: 83,
    churnRisk: 'low',
    contractValue: 55000,
    arr: 55000,
    renewalDate: '2024-10-15',
    lastContactDate: '2024-03-21',
    nextFollowUp: '2024-04-12',
    assignedEmployeeId: '2',
    productUsage: 77,
    funnelStage: 'customer',
    timeline: [
      {
        type: 'meeting',
        title: 'Campaign Review',
        description: 'Analyzed Q1 marketing campaign performance',
        date: '2024-03-21'
      },
      {
        type: 'note',
        title: 'ROI Improvement',
        description: 'Achieved 40% improvement in campaign ROI',
        date: '2024-03-18'
      }
    ],
    notes: [
      {
        content: 'Excellent results with new features, very happy customer',
        date: '2024-03-21',
        author: 'Sarah Johnson'
      }
    ],
    predictiveInsights: {
      renewalProbability: 88,
      expansionProbability: 65
    }
  },
  {
    id: '9',
    company: 'Global Logistics Inc',
    email: 'tech@globallogistics.com',
    phone: '+1 (555) 174-8520',
    primaryContact: 'Mark Thompson',
    title: 'Operations Manager',
    status: 'at-risk',
    healthScore: 41,
    churnRisk: 'high',
    contractValue: 110000,
    arr: 110000,
    renewalDate: '2024-07-30',
    lastContactDate: '2024-03-16',
    nextFollowUp: '2024-03-30',
    assignedEmployeeId: '3',
    productUsage: 28,
    funnelStage: 'customer',
    timeline: [
      {
        type: 'alert',
        title: 'Usage Decline',
        description: 'Significant drop in platform usage over past month',
        date: '2024-03-16'
      },
      {
        type: 'meeting',
        title: 'Retention Call',
        description: 'Discussed concerns about platform complexity',
        date: '2024-03-16'
      }
    ],
    notes: [
      {
        content: 'Customer frustrated with recent UI changes, needs support',
        date: '2024-03-16',
        author: 'Lisa Wang'
      }
    ],
    predictiveInsights: {
      renewalProbability: 30,
      expansionProbability: 15
    }
  },
  {
    id: '10',
    company: 'Startup Accelerator Hub',
    email: 'partnerships@startupaccel.io',
    phone: '+1 (555) 428-9631',
    primaryContact: 'Amanda Foster',
    title: 'Program Director',
    status: 'active',
    healthScore: 76,
    churnRisk: 'low',
    contractValue: 45000,
    arr: 45000,
    renewalDate: '2024-12-01',
    lastContactDate: '2024-03-23',
    nextFollowUp: '2024-04-08',
    assignedEmployeeId: '1',
    productUsage: 71,
    funnelStage: 'customer',
    timeline: [
      {
        type: 'meeting',
        title: 'Program Integration',
        description: 'Integrated platform with startup onboarding process',
        date: '2024-03-23'
      },
      {
        type: 'note',
        title: 'Batch Processing',
        description: 'Successfully onboarded 15 new startups this month',
        date: '2024-03-20'
      }
    ],
    notes: [
      {
        content: 'Great partner for startup ecosystem, consistent usage',
        date: '2024-03-23',
        author: 'Mike Chen'
      }
    ],
    predictiveInsights: {
      renewalProbability: 82,
      expansionProbability: 55
    }
  }
];

export const getCustomersByEmployeeId = (employeeId) => {
  return employeeCustomersMap[employeeId] || [];
};

export const getEmployeeById = (employeeId) => {
  return mockEmployees[employeeId];
};

export const getAllEmployees = () => {
  return Object.values(mockEmployees);
}; 