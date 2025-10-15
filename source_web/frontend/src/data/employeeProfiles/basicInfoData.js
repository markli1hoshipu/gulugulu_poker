// Employee-specific basic info data extracted from BasicInfoTab.jsx
// Each employee has unique skills, languages, experience, and MBTI personality data

export const basicInfoData = {
  1: { // Sarah Johnson - Senior Sales Manager
    skills: {
      technical: ["Salesforce", "HubSpot", "Excel", "PowerBI", "Tableau"],
      domain: ["Enterprise Sales", "SaaS", "Client Relations", "Account Management"],
      methodologies: ["Consultative Selling", "SPIN Selling", "Challenger Sale", "Solution Selling"],
      certifications: ["Salesforce Certified", "HubSpot Certified", "Google Analytics"]
    },
    languages: [
      { name: 'English', level: 'Native', percentage: 100 },
      { name: 'Spanish', level: 'Advanced', percentage: 85 },
      { name: 'French', level: 'Intermediate', percentage: 60 },
      { name: 'German', level: 'Basic', percentage: 25 }
    ],
    pastExperience: [
      {
        company: 'TechCorp Solutions',
        role: 'Senior Sales Manager',
        period: '2019-2022',
        description: 'Led enterprise sales team, achieved 120% of annual targets consistently.'
      },
      {
        company: 'SaaS Innovations Inc',
        role: 'Account Executive',
        period: '2016-2019',
        description: 'Managed key accounts, specialized in SaaS solutions for Fortune 500 companies.'
      },
      {
        company: 'StartUp Dynamics',
        role: 'Sales Representative',
        period: '2014-2016',
        description: 'Built sales processes from ground up, focused on SMB market penetration.'
      }
    ],
    mbti: {
      type: "ENTJ",
      nickname: "The Commander",
      percentages: {
        extravert: 78,
        intuitive: 85,
        thinking: 82,
        judging: 75
      },
      workingStyle: [
        "Natural leader with strategic vision",
        "Results-oriented with high performance standards",
        "Thrives in competitive environments",
        "Excellent at building and managing teams"
      ],
      communicationPreferences: [
        "Direct and assertive communication style",
        "Appreciates efficiency and getting to the point",
        "Comfortable with public speaking and presentations",
        "Values data-driven discussions"
      ],
      idealCollaboration: "Excels in leadership roles where they can drive strategy and motivate teams. Prefers environments with clear goals and metrics for success."
    }
  },

  2: { // Michael Chen - Account Executive
    skills: {
      technical: ["React", "TypeScript", "Node.js", "AWS", "GraphQL"],
      domain: ["Technical Sales", "Healthcare", "API Integration", "SaaS"],
      methodologies: ["Agile", "Scrum", "Technical Discovery", "Solution Architecture"],
      certifications: ["AWS Certified Developer", "Salesforce Technical Architect", "Google Cloud Professional"]
    },
    languages: [
      { name: 'English', level: 'Native', percentage: 100 },
      { name: 'Mandarin', level: 'Native', percentage: 100 },
      { name: 'Spanish', level: 'Intermediate', percentage: 65 },
      { name: 'Japanese', level: 'Basic', percentage: 30 }
    ],
    pastExperience: [
      {
        company: 'HealthTech Solutions',
        role: 'Technical Account Executive',
        period: '2020-2023',
        description: 'Specialized in healthcare technology solutions, technical sales to CTO/engineering teams.'
      },
      {
        company: 'API Gateway Corp',
        role: 'Solutions Engineer',
        period: '2018-2020',
        description: 'Bridge between technical and sales teams, focused on API integration solutions.'
      },
      {
        company: 'Cloud Systems Inc',
        role: 'Technical Sales Rep',
        period: '2016-2018',
        description: 'Entry-level technical sales role, learned to translate technical concepts to business value.'
      }
    ],
    mbti: {
      type: "INTJ",
      nickname: "The Architect",
      percentages: {
        introvert: 65,
        intuitive: 82,
        thinking: 75,
        judging: 70
      },
      workingStyle: [
        "Strategic thinker with long-term vision",
        "Analytical problem-solver who values efficiency",
        "Independent worker who thrives on complex challenges",
        "Detail-oriented with high standards"
      ],
      communicationPreferences: [
        "Direct and concise communication",
        "Prefers facts and logical arguments over emotions",
        "Appreciates intellectual discussions",
        "Values technical accuracy and precision"
      ],
      idealCollaboration: "Works best in environments that allow for focused work with minimal interruptions. Appreciates autonomy and being trusted to deliver results without micromanagement."
    }
  },

  3: { // Emily Rodriguez - Business Development Rep
    skills: {
      technical: ["HubSpot", "LinkedIn Sales Navigator", "Outreach.io", "ZoomInfo", "Salesforce"],
      domain: ["Lead Qualification", "Cold Outreach", "SMB Sales", "Social Selling"],
      methodologies: ["BANT Qualification", "MEDDIC", "Prospecting", "Lead Nurturing"],
      certifications: ["HubSpot Inbound Sales", "LinkedIn Sales Navigator", "Outreach Certified"]
    },
    languages: [
      { name: 'English', level: 'Native', percentage: 100 },
      { name: 'Spanish', level: 'Native', percentage: 100 },
      { name: 'Portuguese', level: 'Intermediate', percentage: 70 },
      { name: 'French', level: 'Beginner', percentage: 35 }
    ],
    pastExperience: [
      {
        company: 'Growth Marketing Inc',
        role: 'Business Development Rep',
        period: '2021-2023',
        description: 'Focused on lead generation and qualification for SMB market segment.'
      },
      {
        company: 'SaaS Startup Hub',
        role: 'Sales Development Rep',
        period: '2019-2021',
        description: 'Cold outreach and lead qualification for early-stage SaaS companies.'
      },
      {
        company: 'Digital Marketing Agency',
        role: 'Marketing Coordinator',
        period: '2018-2019',
        description: 'Transitioned from marketing to sales, learned lead generation fundamentals.'
      }
    ],
    mbti: {
      type: "ENFP",
      nickname: "The Campaigner",
      percentages: {
        extravert: 82,
        intuitive: 78,
        feeling: 70,
        perceiving: 75
      },
      workingStyle: [
        "Enthusiastic and creative problem solver",
        "People-focused with strong interpersonal skills",
        "Adaptable and flexible in approach",
        "Motivated by meaningful connections and impact"
      ],
      communicationPreferences: [
        "Warm and engaging communication style",
        "Enjoys building rapport and relationships",
        "Values emotional intelligence in interactions",
        "Appreciates collaborative brainstorming"
      ],
      idealCollaboration: "Thrives in collaborative environments with regular team interaction. Values creativity, flexibility, and opportunities to build meaningful relationships with clients and colleagues."
    }
  },

  4: { // David Kim - Customer Success Director
    skills: {
      technical: ["Salesforce", "Gainsight", "ChurnZero", "Tableau", "SQL"],
      domain: ["Strategic Accounts", "Executive Relations", "Customer Retention", "Expansion"],
      methodologies: ["Customer Success Management", "Account Planning", "Executive Engagement", "Value Realization"],
      certifications: ["Gainsight Certified", "Customer Success Manager Certified", "Salesforce Advanced Administrator"]
    },
    languages: [
      { name: 'English', level: 'Native', percentage: 100 },
      { name: 'Korean', level: 'Native', percentage: 100 },
      { name: 'Japanese', level: 'Advanced', percentage: 80 },
      { name: 'Mandarin', level: 'Intermediate', percentage: 55 }
    ],
    pastExperience: [
      {
        company: 'Enterprise SaaS Corp',
        role: 'Senior Customer Success Manager',
        period: '2018-2022',
        description: 'Managed strategic enterprise accounts, achieved 98% renewal rate and 150% net revenue retention.'
      },
      {
        company: 'Customer Success Solutions',
        role: 'Customer Success Manager',
        period: '2015-2018',
        description: 'Built customer success processes, specialized in onboarding and expansion strategies.'
      },
      {
        company: 'Tech Consulting Group',
        role: 'Account Manager',
        period: '2013-2015',
        description: 'Managed client relationships for consulting projects, learned customer success fundamentals.'
      }
    ],
    mbti: {
      type: "ENFJ",
      nickname: "The Protagonist",
      percentages: {
        extravert: 75,
        intuitive: 85,
        feeling: 80,
        judging: 78
      },
      workingStyle: [
        "Natural mentor and coach focused on others' success",
        "Strategic thinker with people-first approach",
        "Excellent at building long-term relationships",
        "Motivated by helping others achieve their goals"
      ],
      communicationPreferences: [
        "Empathetic and supportive communication style",
        "Skilled at reading people and situations",
        "Values transparency and trust building",
        "Excels at executive-level conversations"
      ],
      idealCollaboration: "Thrives in roles where they can mentor and support others. Prefers collaborative environments with opportunities to build deep, meaningful professional relationships."
    }
  },

  5: { // Jessica Adams - Technical Account Manager
    skills: {
      technical: ["Python", "JavaScript", "REST APIs", "GraphQL", "Docker", "Kubernetes"],
      domain: ["Integration", "APIs", "Technical Support", "Solution Architecture"],
      methodologies: ["Technical Implementation", "API Design", "Troubleshooting", "Customer Training"],
      certifications: ["AWS Solutions Architect", "Microsoft Azure Fundamentals", "Kubernetes Certified"]
    },
    languages: [
      { name: 'English', level: 'Native', percentage: 100 },
      { name: 'German', level: 'Advanced', percentage: 85 },
      { name: 'French', level: 'Intermediate', percentage: 60 },
      { name: 'Spanish', level: 'Basic', percentage: 40 }
    ],
    pastExperience: [
      {
        company: 'API Solutions Inc',
        role: 'Technical Account Manager',
        period: '2019-2023',
        description: 'Managed technical relationships with enterprise clients, specialized in API integrations.'
      },
      {
        company: 'Cloud Integration Corp',
        role: 'Solutions Engineer',
        period: '2017-2019',
        description: 'Provided technical pre-sales support and post-sales implementation guidance.'
      },
      {
        company: 'Software Development Agency',
        role: 'Full Stack Developer',
        period: '2015-2017',
        description: 'Built custom software solutions before transitioning to customer-facing technical roles.'
      }
    ],
    mbti: {
      type: "ISTJ",
      nickname: "The Logistician",
      percentages: {
        introvert: 68,
        sensing: 75,
        thinking: 82,
        judging: 85
      },
      workingStyle: [
        "Systematic and methodical approach to problem-solving",
        "Highly reliable and detail-oriented",
        "Prefers established processes and procedures",
        "Excellent at managing complex technical projects"
      ],
      communicationPreferences: [
        "Clear, structured, and fact-based communication",
        "Values thorough documentation and preparation",
        "Prefers written communication for complex topics",
        "Appreciates organized meetings with clear agendas"
      ],
      idealCollaboration: "Works best in structured environments with clear expectations and processes. Values consistency and prefers working with established systems and methodologies."
    }
  },

  6: { // Robert Taylor - Implementation Manager
    skills: {
      technical: ["Project Management", "Jira", "Confluence", "Slack", "Microsoft Project"],
      domain: ["Onboarding", "Training", "Migration", "Process Optimization"],
      methodologies: ["Agile Project Management", "Waterfall", "Change Management", "Training Development"],
      certifications: ["PMP Certified", "Scrum Master", "Change Management Certified"]
    },
    languages: [
      { name: 'English', level: 'Native', percentage: 100 },
      { name: 'Spanish', level: 'Advanced', percentage: 80 },
      { name: 'French', level: 'Intermediate', percentage: 65 },
      { name: 'Italian', level: 'Basic', percentage: 35 }
    ],
    pastExperience: [
      {
        company: 'Implementation Services Corp',
        role: 'Senior Implementation Manager',
        period: '2018-2023',
        description: 'Led complex software implementations for enterprise clients, managed cross-functional teams.'
      },
      {
        company: 'Consulting Solutions Inc',
        role: 'Project Manager',
        period: '2015-2018',
        description: 'Managed client projects from initiation to completion, specialized in process improvement.'
      },
      {
        company: 'Training & Development Co',
        role: 'Training Coordinator',
        period: '2013-2015',
        description: 'Developed and delivered training programs, learned customer onboarding fundamentals.'
      }
    ],
    mbti: {
      type: "ESTJ",
      nickname: "The Executive",
      percentages: {
        extravert: 72,
        sensing: 78,
        thinking: 75,
        judging: 88
      },
      workingStyle: [
        "Natural organizer and project leader",
        "Results-focused with strong execution skills",
        "Excellent at managing timelines and resources",
        "Values efficiency and systematic approaches"
      ],
      communicationPreferences: [
        "Direct and action-oriented communication",
        "Prefers structured meetings with clear outcomes",
        "Values regular status updates and check-ins",
        "Appreciates detailed project documentation"
      ],
      idealCollaboration: "Excels in leadership roles with clear authority and responsibility. Prefers organized environments with established processes and measurable outcomes."
    }
  }
};

// Fallback data for employees without specific profiles
export const defaultBasicInfo = {
  skills: {
    technical: ["React", "TypeScript", "Node.js", "AWS", "GraphQL"],
    domain: ["E-commerce", "FinTech", "Data Analytics", "UX Research"],
    methodologies: ["Agile", "Scrum", "Design Thinking", "Lean UX"],
    certifications: ["AWS Certified Developer", "Scrum Master", "Google Analytics"]
  },
  languages: [
    { name: 'English', level: 'Native', percentage: 100 },
    { name: 'Spanish', level: 'Intermediate', percentage: 65 },
    { name: 'French', level: 'Beginner', percentage: 30 },
    { name: 'Mandarin', level: 'Basic', percentage: 15 }
  ],
  pastExperience: [
    {
      company: 'Previous Tech Inc',
      role: 'Senior Developer',
      period: '2018-2021',
      description: 'Led development team for cloud-based solutions.'
    },
    {
      company: 'StartUp Solutions',
      role: 'Developer',
      period: '2015-2018',
      description: 'Full-stack development for e-commerce platforms.'
    },
    {
      company: 'Tech Academy',
      role: 'Junior Developer',
      period: '2013-2015',
      description: 'Worked on internal tools and client websites.'
    }
  ],
  mbti: {
    type: "INTJ",
    nickname: "The Architect",
    percentages: {
      introvert: 65,
      intuitive: 82,
      thinking: 75,
      judging: 70
    },
    workingStyle: [
      "Strategic thinker with long-term vision",
      "Analytical problem-solver who values efficiency",
      "Independent worker who thrives on complex challenges",
      "Detail-oriented with high standards"
    ],
    communicationPreferences: [
      "Direct and concise communication",
      "Prefers facts and logical arguments over emotions",
      "Appreciates intellectual discussions"
    ],
    idealCollaboration: "Works best in environments that allow for focused work with minimal interruptions. Appreciates autonomy and being trusted to deliver results without micromanagement."
  }
};

// Helper function to get basic info data for an employee
export const getBasicInfoData = (employeeId) => {
  return basicInfoData[employeeId] || defaultBasicInfo;
}; 