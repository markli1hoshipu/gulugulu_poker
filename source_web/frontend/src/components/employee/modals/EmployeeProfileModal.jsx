import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Home,
  BarChart3,
  Users,
  Search,
  TrendingUp,
  Zap,
  Contact,
  MessageCircle,
  Brain,
  Calendar,
  Building2,
  Briefcase,
  Activity,
  CheckCircle,
  Target,
  Award,
  ArrowUp,
  Clock,
  Edit2,
  Save,
  AlertCircle,
  Plus,
  Trash2
} from 'lucide-react';
import { useEmployeeProfile } from '../context/EmployeeProfileContext';
import { Button } from '../../ui/button';
import TabErrorBoundary from '../components/TabErrorBoundary';
import BasicInfoTab from '../tabs/BasicInfoTab';
import PerformanceMetricsTab from '../tabs/PerformanceMetricsTab';
import CustomerInteractionTab from '../tabs/CustomerInteractionTab';
import InsightsTab from '../tabs/InsightsTab';
import MatchTab from '../tabs/MatchTab';
import { generateInsights, getSpecializationProficiency } from '../../../data/employeeProfiles/insightsData';

const EmployeeProfileModal = () => {
  const { selectedEmployee, setSelectedEmployee, refreshEmployeeData } = useEmployeeProfile();
  const [activeProfileTab, setActiveProfileTab] = useState('overview');
  const [reportGenerated, setReportGenerated] = useState(false);
  const [insights, setInsights] = useState(null);
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [contactFormData, setContactFormData] = useState({});
  const [isEditingLanguages, setIsEditingLanguages] = useState(false);
  const [languagesFormData, setLanguagesFormData] = useState([]);
  const [isEditingMBTI, setIsEditingMBTI] = useState(false);
  const [mbtiFormData, setMbtiFormData] = useState({});
  const [isEditingSkills, setIsEditingSkills] = useState(false);
  const [skillsFormData, setSkillsFormData] = useState({});
  const [isEditingExperience, setIsEditingExperience] = useState(false);
  const [experienceFormData, setExperienceFormData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Reset all edit states when selectedEmployee changes (switching between employees)
  useEffect(() => {
    if (selectedEmployee) {
      // Reset active tab to overview
      setActiveProfileTab('overview');
      
      // Reset all edit states
      setIsEditingContact(false);
      setIsEditingLanguages(false);
      setIsEditingMBTI(false);
      setIsEditingSkills(false);
      setIsEditingExperience(false);
      
      // Clear all form data
      setContactFormData({});
      setLanguagesFormData([]);
      setMbtiFormData({});
      setSkillsFormData({});
      setExperienceFormData([]);
      
      // Clear any error states
      setError(null);
      setIsLoading(false);
      
      // Reset report and insights state
      setReportGenerated(false);
      setInsights(null);
    }
  }, [selectedEmployee?.id]); // Only trigger when the employee ID changes

  // Handle closing with animation
  const handleClose = () => {
    // Reset active tab to overview for next profile opening
    setActiveProfileTab('overview');
    
    // Reset all edit states
    setIsEditingContact(false);
    setIsEditingLanguages(false);
    setIsEditingMBTI(false);
    setIsEditingSkills(false);
    setIsEditingExperience(false);
    
    // Clear all form data
    setContactFormData({});
    setLanguagesFormData([]);
    setMbtiFormData({});
    setSkillsFormData({});
    setExperienceFormData([]);
    
    // Clear any error states
    setError(null);
    setIsLoading(false);
    
    // Reset report and insights state
    setReportGenerated(false);
    setInsights(null);
    
    // Close the modal
    setSelectedEmployee(null);
  };

  // Handle generate report
  const handleGenerateReport = () => {
    const generatedInsights = generateInsights(selectedEmployee);
    setInsights(generatedInsights);
    setReportGenerated(true);
  };

  // Initialize form data when starting to edit
  const startEditingContact = () => {
    // Get location display - handle both string and object formats
    const locationDisplay = getLocationDisplay();
    const mainOfficeDisplay = selectedEmployee.location?.office || locationDisplay;

    setContactFormData({
      email: selectedEmployee.email || '',
      phone: selectedEmployee.phone || '',
      location: locationDisplay,
      mainOffice: mainOfficeDisplay,
      timezone: selectedEmployee.timezone || 'EST',
      department: selectedEmployee.department || ''
    });
    setIsEditingContact(true);
    setError(null);
  };

  // Cancel editing
  const cancelEditingContact = () => {
    setIsEditingContact(false);
    setContactFormData({});
    setError(null);
  };

  // Save contact information
  const saveContactInfo = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Format location as object if it's a string
      let locationData = contactFormData.location;
      if (typeof locationData === 'string') {
        locationData = { city: locationData };
      }

      const updateData = {
        ...selectedEmployee,
        email: contactFormData.email || null,
        phone: contactFormData.phone || null,
        location: locationData || {},
        timezone: contactFormData.timezone || 'EST',
        department: contactFormData.department || null,
        // Remove mainOffice as it's not in the Employee model
        // Store it in location object instead
        ...(contactFormData.mainOffice && {
          location: {
            ...locationData,
            office: contactFormData.mainOffice
          }
        })
      };

      const response = await fetch(`http://localhost:7001/api/employees/${selectedEmployee.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to update employee: ${response.statusText}. ${errorData.detail || ''}`);
      }

      const updatedEmployee = await response.json();

      // Update the selectedEmployee state immediately with new data
      setSelectedEmployee(updatedEmployee);

      // Also refresh the employee data in the context for other components
      if (refreshEmployeeData) {
        await refreshEmployeeData();
      }

      setIsEditingContact(false);
      setContactFormData({});

    } catch (error) {
      console.error('Error updating contact information:', error);
      setError('Failed to update contact information. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle form input changes
  const handleContactInputChange = (field, value) => {
    setContactFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Language Skills Management Functions
  const startEditingLanguages = () => {
    const currentLanguages = getLanguages();
    const formattedLanguages = currentLanguages.length > 0
      ? currentLanguages.map(lang => {
          const level = lang.level || 'Beginner';
          // Set percentage based on level, or use existing percentage if it matches the level
          let percentage;
          switch (level) {
            case 'Beginner':
              percentage = 25;
              break;
            case 'Intermediate':
              percentage = 50;
              break;
            case 'Fluent':
              percentage = 75;
              break;
            case 'Native':
              percentage = 100;
              break;
            default:
              percentage = lang.percentage || 50;
          }

          return {
            name: lang.name || '',
            level,
            percentage
          };
        })
      : [{ name: '', level: 'Beginner', percentage: 25 }];

    setLanguagesFormData(formattedLanguages);
    setIsEditingLanguages(true);
    setError(null);
  };

  const cancelEditingLanguages = () => {
    setIsEditingLanguages(false);
    setLanguagesFormData([]);
    setError(null);
  };

  const addNewLanguage = () => {
    setLanguagesFormData(prev => [
      ...prev,
      { name: '', level: 'Beginner', percentage: 25 }
    ]);
  };

  const removeLanguage = (index) => {
    setLanguagesFormData(prev => prev.filter((_, i) => i !== index));
  };

  // MBTI Type Data Mappings (based on existing employee data format)
  const getMBTIPersonalityData = (mbtiType) => {
    const mbtiData = {
      'INTJ': {
        nickname: 'The Architect',
        workingStyle: [
          'Strategic and analytical thinking',
          'Independent problem solver',
          'Systems-oriented approach',
          'Long-term planning focus'
        ],
        communicationPreferences: [
          'Precise and logical communication',
          'Values intellectual discussions',
          'Prefers written over verbal communication',
          'Appreciates detailed explanations'
        ],
        idealCollaboration: 'Thrives in environments where they can work independently on complex problems and contribute strategic insights to team projects.'
      },
      'INTP': {
        nickname: 'The Thinker',
        workingStyle: [
          'Enjoys theoretical and conceptual work',
          'Prefers flexible schedules and autonomy',
          'Excels at analysis and problem-solving',
          'Motivated by intellectual challenges'
        ],
        communicationPreferences: [
          'Appreciates logical and precise communication',
          'Prefers discussing ideas over small talk',
          'Values intellectual debate and exploration',
          'Needs time to process complex information'
        ],
        idealCollaboration: 'Thrives in intellectually stimulating environments with freedom to explore ideas. Works well with other analytical thinkers who respect independent thinking.'
      },
      'ENTJ': {
        nickname: 'The Commander',
        workingStyle: [
          'Natural leader who takes charge of projects',
          'Enjoys organizing systems and people',
          'Focuses on efficiency and results',
          'Thrives on challenges and competition'
        ],
        communicationPreferences: [
          'Direct, confident, and assertive communication',
          'Appreciates structured meetings and clear agendas',
          'Values quick decision-making and action',
          'Enjoys strategic discussions and planning'
        ],
        idealCollaboration: 'Excels in leadership roles with authority to make decisions. Works best with motivated team members who can execute plans efficiently.'
      },
      'ENTP': {
        nickname: 'The Debater',
        workingStyle: [
          'Enjoys brainstorming and generating new ideas',
          'Prefers variety and changing priorities',
          'Excels at seeing possibilities and connections',
          'Motivated by innovation and creativity'
        ],
        communicationPreferences: [
          'Enthusiastic and energetic communication style',
          'Enjoys debating ideas and exploring options',
          'Values creativity and out-of-the-box thinking',
          'Prefers dynamic and interactive discussions'
        ],
        idealCollaboration: 'Thrives in creative, fast-paced environments with opportunities to explore new ideas. Works well with diverse teams that encourage innovation.'
      },
      'INFJ': {
        nickname: 'The Advocate',
        workingStyle: [
          'Values meaningful work aligned with personal values',
          'Prefers quiet, focused work environment',
          'Excels at understanding people and motivations',
          'Focuses on long-term impact and vision'
        ],
        communicationPreferences: [
          'Thoughtful and empathetic communication style',
          'Prefers one-on-one or small group discussions',
          'Values deep, meaningful conversations',
          'Needs time to formulate thoughtful responses'
        ],
        idealCollaboration: 'Works best in supportive environments focused on helping others. Thrives with like-minded individuals who share similar values and vision.'
      },
      'INFP': {
        nickname: 'The Mediator',
        workingStyle: [
          'Motivated by personal values and authenticity',
          'Prefers flexible work arrangements',
          'Excels at creative and expressive work',
          'Values harmony and individual expression'
        ],
        communicationPreferences: [
          'Gentle and considerate communication style',
          'Values empathy and emotional connection',
          'Prefers supportive and encouraging feedback',
          'Appreciates recognition of individual contributions'
        ],
        idealCollaboration: 'Thrives in harmonious, values-driven environments. Works well with supportive colleagues who respect individual creativity and authenticity.'
      },
      'ENFJ': {
        nickname: 'The Protagonist',
        workingStyle: [
          'Focuses on developing and motivating others',
          'Enjoys collaborative and team-oriented work',
          'Excels at communication and relationship building',
          'Values personal growth and positive impact'
        ],
        communicationPreferences: [
          'Warm, encouraging, and inspiring communication',
          'Enjoys facilitating group discussions',
          'Values emotional connection and understanding',
          'Provides supportive and developmental feedback'
        ],
        idealCollaboration: 'Excels in team environments where they can mentor and inspire others. Works best with collaborative, growth-oriented colleagues.'
      },
      'ENFP': {
        nickname: 'The Campaigner',
        workingStyle: [
          'Enjoys variety and new challenges',
          'Thrives on inspiration and possibilities',
          'Excels at motivating and energizing others',
          'Values creativity and personal expression'
        ],
        communicationPreferences: [
          'Enthusiastic and expressive communication style',
          'Enjoys brainstorming and collaborative discussions',
          'Values emotional connection and authenticity',
          'Appreciates positive and encouraging interactions'
        ],
        idealCollaboration: 'Thrives in energetic, creative environments with opportunities for innovation. Works well with diverse, enthusiastic team members.'
      },
      'ISTJ': {
        nickname: 'The Logistician',
        workingStyle: [
          'Prefers structured and organized work environment',
          'Excels at detailed and systematic tasks',
          'Values reliability and consistency',
          'Focuses on proven methods and best practices'
        ],
        communicationPreferences: [
          'Clear, factual, and organized communication',
          'Prefers structured meetings with defined outcomes',
          'Values detailed information and documentation',
          'Appreciates direct and honest feedback'
        ],
        idealCollaboration: 'Works best in stable, well-organized environments with clear expectations. Thrives with dependable colleagues who value quality and accuracy.'
      },
      'ISFJ': {
        nickname: 'The Protector',
        workingStyle: [
          'Focuses on supporting and helping others',
          'Prefers stable and harmonious work environment',
          'Excels at detailed, service-oriented tasks',
          'Values tradition and established procedures'
        ],
        communicationPreferences: [
          'Considerate and supportive communication style',
          'Prefers face-to-face or personal interactions',
          'Values harmony and avoids conflict',
          'Appreciates recognition and appreciation'
        ],
        idealCollaboration: 'Thrives in supportive, people-focused environments. Works well with caring colleagues who value teamwork and mutual support.'
      },
      'ESTJ': {
        nickname: 'The Executive',
        workingStyle: [
          'Natural organizer who enjoys managing projects',
          'Prefers structured and efficient work processes',
          'Excels at coordination and implementation',
          'Values results and productivity'
        ],
        communicationPreferences: [
          'Direct, organized, and results-focused communication',
          'Enjoys leading meetings and making decisions',
          'Values clear expectations and accountability',
          'Appreciates efficient and timely communication'
        ],
        idealCollaboration: 'Excels in leadership roles with clear authority and structure. Works best with organized, goal-oriented team members.'
      },
      'ESFJ': {
        nickname: 'The Consul',
        workingStyle: [
          'Focuses on creating harmony and supporting others',
          'Enjoys collaborative and people-centered work',
          'Excels at organizing and coordinating team activities',
          'Values service and helping others succeed'
        ],
        communicationPreferences: [
          'Warm, friendly, and supportive communication',
          'Enjoys group discussions and team meetings',
          'Values personal connection and rapport',
          'Prefers encouraging and positive feedback'
        ],
        idealCollaboration: 'Thrives in people-focused, harmonious environments. Works best with collaborative colleagues who value relationship-building.'
      },
      'ISTP': {
        nickname: 'The Virtuoso',
        workingStyle: [
          'Prefers hands-on, practical work',
          'Enjoys troubleshooting and problem-solving',
          'Values independence and flexibility',
          'Excels at working with tools and systems'
        ],
        communicationPreferences: [
          'Direct and practical communication style',
          'Prefers minimal meetings and bureaucracy',
          'Values efficiency and getting to the point',
          'Appreciates technical and factual discussions'
        ],
        idealCollaboration: 'Works best independently with minimal supervision. Thrives with practical, results-oriented colleagues who respect autonomy.'
      },
      'ISFP': {
        nickname: 'The Adventurer',
        workingStyle: [
          'Values authentic and meaningful work',
          'Prefers flexible and adaptable work environment',
          'Excels at creative and artistic tasks',
          'Motivated by personal values and harmony'
        ],
        communicationPreferences: [
          'Gentle, considerate, and personal communication',
          'Prefers one-on-one interactions over group settings',
          'Values empathy and emotional understanding',
          'Appreciates patient and supportive feedback'
        ],
        idealCollaboration: 'Thrives in supportive, values-driven environments that encourage creativity. Works well with understanding colleagues who respect individual expression.'
      },
      'ESTP': {
        nickname: 'The Entrepreneur',
        workingStyle: [
          'Enjoys action-oriented and dynamic work',
          'Prefers immediate results and quick decisions',
          'Excels at adapting to changing situations',
          'Values practical and hands-on experience'
        ],
        communicationPreferences: [
          'Energetic, direct, and engaging communication',
          'Prefers face-to-face interactions and active discussions',
          'Values practical information and real-world examples',
          'Appreciates immediate and actionable feedback'
        ],
        idealCollaboration: 'Thrives in fast-paced, dynamic environments with immediate challenges. Works well with energetic colleagues who enjoy action and results.'
      },
      'ESFP': {
        nickname: 'The Entertainer',
        workingStyle: [
          'Enjoys people-centered and collaborative work',
          'Prefers variety and spontaneous activities',
          'Excels at motivating and energizing others',
          'Values fun and positive work environment'
        ],
        communicationPreferences: [
          'Enthusiastic, friendly, and expressive communication',
          'Enjoys group interactions and team activities',
          'Values emotional connection and personal relationships',
          'Appreciates positive recognition and celebration'
        ],
        idealCollaboration: 'Thrives in energetic, people-focused environments with opportunities for interaction. Works best with enthusiastic colleagues who enjoy collaboration.'
      }
    };

    return mbtiData[mbtiType] || null;
  };

  // Calculate MBTI type from percentages
  const calculateMBTIType = (percentages) => {
    if (!percentages) return '';
    
    const e_i = (percentages.extravert || 0) > 50 ? 'E' : 'I';
    const s_n = (percentages.sensing || 0) > 50 ? 'S' : 'N';
    const t_f = (percentages.thinking || 0) > 50 ? 'T' : 'F';
    const j_p = (percentages.judging || 0) > 50 ? 'J' : 'P';
    
    return e_i + s_n + t_f + j_p;
  };

  // MBTI Management Functions
  const startEditingMBTI = () => {
    const currentMBTI = getMbtiProfile();
    // Convert existing percentages to the new format (both sides)
    const percentages = {
      extravert: currentMBTI.percentages?.extravert || (100 - (currentMBTI.percentages?.introvert || 50)),
      sensing: currentMBTI.percentages?.sensing || (100 - (currentMBTI.percentages?.intuitive || 50)),
      thinking: currentMBTI.percentages?.thinking || 50,
      judging: currentMBTI.percentages?.judging || 50
    };
    
    const calculatedType = calculateMBTIType(percentages);
    const personalityData = getMBTIPersonalityData(calculatedType);
    
    setMbtiFormData({
      percentages: percentages,
      type: calculatedType,
      nickname: personalityData?.nickname || ''
    });
    setIsEditingMBTI(true);
    setError(null);
  };

  const cancelEditingMBTI = () => {
    setIsEditingMBTI(false);
    setMbtiFormData({});
    setError(null);
  };

  const handleMBTIChange = (field, value) => {
    if (field.startsWith('percentages.')) {
      const dimension = field.split('.')[1];
      const newPercentages = {
        ...mbtiFormData.percentages,
        [dimension]: parseInt(value)
      };
      
      // Auto-calculate type and nickname based on new percentages
      const calculatedType = calculateMBTIType(newPercentages);
      const personalityData = getMBTIPersonalityData(calculatedType);
      
      setMbtiFormData(prev => ({
        ...prev,
        percentages: newPercentages,
        type: calculatedType,
        nickname: personalityData?.nickname || ''
      }));
    }
  };

  const saveMBTI = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Get personality data based on MBTI type
      const personalityData = getMBTIPersonalityData(mbtiFormData.type);
      
      // Convert percentages back to original format (keeping both sides for compatibility)
      const savedPercentages = {
        extravert: mbtiFormData.percentages.extravert,
        introvert: 100 - mbtiFormData.percentages.extravert,
        sensing: mbtiFormData.percentages.sensing,
        intuitive: 100 - mbtiFormData.percentages.sensing,
        thinking: mbtiFormData.percentages.thinking,
        feeling: 100 - mbtiFormData.percentages.thinking,
        judging: mbtiFormData.percentages.judging,
        perceiving: 100 - mbtiFormData.percentages.judging
      };
      
      const updateData = {
        ...selectedEmployee,
        mbti_profile: {
          ...selectedEmployee.mbti_profile,
          type: mbtiFormData.type,
          nickname: mbtiFormData.nickname,
          percentages: savedPercentages,
          // Always sync personality details with MBTI type
          workingStyle: personalityData ? personalityData.workingStyle : [],
          communicationPreferences: personalityData ? personalityData.communicationPreferences : [],
          idealCollaboration: personalityData ? personalityData.idealCollaboration : ''
        }
      };

      const response = await fetch(`http://localhost:7001/api/employees/${selectedEmployee.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error(`Failed to update MBTI: ${response.statusText}`);
      }

      await response.json();
      
      // Refresh employee data from the server to get the latest state
      if (refreshEmployeeData) {
        await refreshEmployeeData();
      }
      
      setIsEditingMBTI(false);
      setMbtiFormData({});
    } catch (error) {
      console.error('Error updating MBTI:', error);
      setError('Failed to update MBTI personality. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Skills Management Functions
  const startEditingSkills = () => {
    const currentSkills = getSkills();
    setSkillsFormData({
      technical: [...(currentSkills.technical || [])],
      domain: [...(currentSkills.domain || [])],
      methodologies: [...(currentSkills.methodologies || [])],
      certifications: [...(currentSkills.certifications || [])]
    });
    setIsEditingSkills(true);
    setError(null);
  };

  const cancelEditingSkills = () => {
    setIsEditingSkills(false);
    setSkillsFormData({});
    setError(null);
  };

  const addSkill = (category) => {
    setSkillsFormData(prev => ({
      ...prev,
      [category]: [...(prev[category] || []), '']
    }));
  };

  const removeSkill = (category, index) => {
    setSkillsFormData(prev => ({
      ...prev,
      [category]: prev[category].filter((_, i) => i !== index)
    }));
  };

  const handleSkillChange = (category, index, value) => {
    setSkillsFormData(prev => ({
      ...prev,
      [category]: prev[category].map((skill, i) => i === index ? value : skill)
    }));
  };

  const saveSkills = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Filter out empty skills from all categories
      const cleanedSkills = {
        technical: (skillsFormData.technical || []).filter(skill => skill.trim() !== ''),
        domain: (skillsFormData.domain || []).filter(skill => skill.trim() !== ''),
        methodologies: (skillsFormData.methodologies || []).filter(skill => skill.trim() !== ''),
        certifications: (skillsFormData.certifications || []).filter(skill => skill.trim() !== '')
      };

      const updateData = {
        ...selectedEmployee,
        skills: cleanedSkills
      };

      const response = await fetch(`http://localhost:7001/api/employees/${selectedEmployee.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error(`Failed to update skills: ${response.statusText}`);
      }

      await response.json();
      
      // Refresh employee data from the server to get the latest state
      if (refreshEmployeeData) {
        await refreshEmployeeData();
      }
      
      setIsEditingSkills(false);
      setSkillsFormData({});
    } catch (error) {
      console.error('Error updating skills:', error);
      setError('Failed to update skills. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Experience Management Functions
  const startEditingExperience = () => {
    const currentExperiences = getExperiences();
    const formattedExperiences = currentExperiences.length > 0
      ? currentExperiences.map(exp => ({
          company: exp.company || '',
          role: exp.role || exp.position || '',
          period: exp.period || '',
          description: exp.description || ''
        }))
      : [];
    setExperienceFormData(formattedExperiences);
    setIsEditingExperience(true);
    setError(null);
  };

  const cancelEditingExperience = () => {
    setIsEditingExperience(false);
    setExperienceFormData([]);
    setError(null);
  };

  const addNewExperience = () => {
    setExperienceFormData(prev => [
      ...prev,
      { company: '', role: '', period: '', description: '' }
    ]);
  };

  const removeExperience = (index) => {
    setExperienceFormData(prev => prev.filter((_, i) => i !== index));
  };

  const handleExperienceChange = (index, field, value) => {
    setExperienceFormData(prev =>
      prev.map((exp, i) => i === index ? { ...exp, [field]: value } : exp)
    );
  };

  const saveExperience = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Filter out completely empty experience entries
      const validExperiences = experienceFormData.filter(exp => 
        exp.company.trim() !== '' || exp.role.trim() !== '' || exp.period.trim() !== '' || exp.description.trim() !== ''
      );

      const updateData = {
        ...selectedEmployee,
        experiences: validExperiences
      };

      const response = await fetch(`http://localhost:7001/api/employees/${selectedEmployee.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error(`Failed to update experience: ${response.statusText}`);
      }

      await response.json();
      
      // Refresh employee data from the server to get the latest state
      if (refreshEmployeeData) {
        await refreshEmployeeData();
      }
      
      setIsEditingExperience(false);
      setExperienceFormData([]);
    } catch (error) {
      console.error('Error updating experience:', error);
      setError('Failed to update work experience. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLanguageChange = (index, field, value) => {
    setLanguagesFormData(prev =>
      prev.map((lang, i) => {
        if (i === index) {
          const updatedLang = { ...lang, [field]: value };

          // Auto-adjust percentage based on level selection
          if (field === 'level') {
            switch (value) {
              case 'Beginner':
                updatedLang.percentage = 25;
                break;
              case 'Intermediate':
                updatedLang.percentage = 50;
                break;
              case 'Fluent':
                updatedLang.percentage = 75;
                break;
              case 'Native':
                updatedLang.percentage = 100;
                break;
              default:
                updatedLang.percentage = 50;
            }
          }

          return updatedLang;
        }
        return lang;
      })
    );
  };

  const saveLanguageSkills = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Filter out empty language entries
      const validLanguages = languagesFormData.filter(lang => lang.name.trim() !== '');

      const updateData = {
        ...selectedEmployee,
        languages: validLanguages
      };

      const response = await fetch(`http://localhost:7001/api/employees/${selectedEmployee.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to update language skills: ${response.statusText}. ${errorData.detail || ''}`);
      }

      const updatedEmployee = await response.json();

      // Update the selectedEmployee state immediately with new data
      setSelectedEmployee(updatedEmployee);

      // Also refresh the employee data in the context for other components
      if (refreshEmployeeData) {
        await refreshEmployeeData();
      }

      setIsEditingLanguages(false);
      setLanguagesFormData([]);

    } catch (error) {
      console.error('Error updating language skills:', error);
      setError('Failed to update language skills. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to safely render employee data
  const safeRender = (value, fallback = '') => {
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'object' && value && value.city) {
      // Handle location objects
      return `${value.city || ''}, ${value.state || ''}, ${value.country || ''}`.replace(/^,\s*|,\s*$/g, '').replace(/,\s*,/g, ',');
    }
    return fallback;
  };

  // Safe data extraction with fallbacks (matching original design)
  const getSkills = () => {
    try {
      if (selectedEmployee?.skills && typeof selectedEmployee.skills === 'object') {
        return selectedEmployee.skills;
      }
      // Fallback to empty structure if no skills data
      return {
        technical: [],
        domain: [],
        methodologies: [],
        certifications: []
      };
    } catch (error) {
      console.warn('Error parsing skills:', error);
      return {
        technical: [],
        domain: [],
        methodologies: [],
        certifications: []
      };
    }
  };

  const getLanguages = () => {
    try {
      if (selectedEmployee?.languages && Array.isArray(selectedEmployee.languages)) {
        return selectedEmployee.languages;
      }
      // Fallback to empty array if no languages data
      return [];
    } catch (error) {
      console.warn('Error parsing languages:', error);
      return [];
    }
  };

  const getExperiences = () => {
    try {
      if (selectedEmployee?.experiences && Array.isArray(selectedEmployee.experiences)) {
        return selectedEmployee.experiences;
      }
      // Fallback to empty array if no experiences data
      return [];
    } catch (error) {
      console.warn('Error parsing experiences:', error);
      return [];
    }
  };

  const getMbtiProfile = () => {
    try {
      if (selectedEmployee?.mbti_profile && typeof selectedEmployee.mbti_profile === 'object') {
        return selectedEmployee.mbti_profile;
      }
      // Fallback to empty structure if no MBTI data
      return {
        type: "",
        nickname: "",
        percentages: { extravert: 50, intuitive: 50, thinking: 50, judging: 50 },
        workingStyle: [],
        communicationPreferences: [],
        idealCollaboration: ""
      };
    } catch (error) {
      console.warn('Error parsing MBTI profile:', error);
      return {
        type: "",
        nickname: "",
        percentages: { extravert: 50, intuitive: 50, thinking: 50, judging: 50 },
        workingStyle: [],
        communicationPreferences: [],
        idealCollaboration: ""
      };
    }
  };

  const getLocationDisplay = () => {
    try {
      if (typeof selectedEmployee.location === 'object' && selectedEmployee.location?.city) {
        return selectedEmployee.location.city;
      }
      if (typeof selectedEmployee.location === 'string') {
        return selectedEmployee.location;
      }
      return 'Not specified';
    } catch (error) {
      console.warn('Error parsing location:', error);
      return 'Not specified';
    }
  };

  const skills = getSkills();
  const languages = getLanguages();
  const experiences = getExperiences();
  const mbtiProfile = getMbtiProfile();

  const renderTabContent = () => {
    switch (activeProfileTab) {
      case 'overview':
        return (
          <div className="bg-gray-50 min-h-[600px]">
            <div className="py-4 px-5">
              <div className="grid grid-cols-1 xl:grid-cols-10 gap-4">
                {/* Left Column - Main Content */}
                <div className="xl:col-span-7 space-y-4">
                  {/* Calendar Button */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6 py-4 px-6">
                    <Button className="bg-green-600 hover:bg-green-700 text-white">
                      <Calendar className="w-4 h-4 mr-2" />
                      View Calendar
                    </Button>
                  </div>
                  {/* Employee Intelligence & Analysis */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-bold text-black font-[Inter] flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-green-600" />
                        Employee Intelligence & Analysis
                      </h3>
                      <Button
                        variant="outline"
                        className="border-gray-300 text-gray-600 hover:bg-gray-50 gap-x-2"
                        onClick={handleGenerateReport}
                      >
                        <Brain className="w-4 h-4" />
                        {reportGenerated ? 'Regenerate Report' : 'Generate Report'}
                      </Button>
                    </div>
                    <div className={`h-96 ${reportGenerated && insights ? 'bg-gray-50' : 'bg-gray-50'} border ${reportGenerated && insights ? 'border-gray-400' : 'border-gray-200'} overflow-y-auto p-6`}>
                      {reportGenerated && insights ? (
                        <div className="space-y-4">
                          {/* Success Factors Analysis */}
                          <div className="bg-white rounded-lg border p-4 shadow-sm">
                            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                              <Brain className="w-4 h-4 text-purple-600" />
                              Success Factors Analysis
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Performance Insights */}
                              <div className="space-y-3">
                                <h5 className="font-medium text-gray-900 text-sm">Performance Insights</h5>
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                                    <div className="flex items-center gap-2">
                                      <TrendingUp className="w-3 h-3 text-green-600" />
                                      <span className="text-xs font-medium">Performance Score</span>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-sm font-bold text-green-700">
                                        {insights.performanceInsights.score}/100
                                      </div>
                                      <div className="text-xs text-green-600">
                                        {insights.performanceInsights.rating}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                                    <div className="flex items-center gap-2">
                                      <Target className="w-3 h-3 text-blue-600" />
                                      <span className="text-xs font-medium">Deals Won</span>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-sm font-bold text-blue-700">
                                        {insights.performanceInsights.dealsWon}
                                      </div>
                                      <div className="text-xs text-blue-600">
                                        {insights.performanceInsights.dealsWon >= 5 ? 'High Closer' :
                                         insights.performanceInsights.dealsWon >= 2 ? 'Moderate' : 'Growing'}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between p-2 bg-purple-50 rounded">
                                    <div className="flex items-center gap-2">
                                      <Clock className="w-3 h-3 text-purple-600" />
                                      <span className="text-xs font-medium">Response Time</span>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-sm font-bold text-purple-700">
                                        {insights.performanceInsights.responseTime}
                                      </div>
                                      <div className="text-xs text-purple-600">
                                        {insights.performanceInsights.responseTime?.includes('hour') ? 'Excellent' : 'Good'}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Specialization Analysis */}
                              <div className="space-y-3">
                                <h5 className="font-medium text-gray-900 text-sm">Specialization Strength</h5>
                                <div className="space-y-2">
                                  {selectedEmployee.specialties?.slice(0, 3).map((specialty, index) => (
                                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                      <div className="flex items-center gap-2">
                                        <Award className="w-3 h-3 text-gray-600" />
                                        <span className="text-xs font-medium">{specialty}</span>
                                      </div>
                                      <div className="text-right">
                                        <div className="text-xs font-bold text-gray-700">
                                          {getSpecializationProficiency(selectedEmployee.specialties, index)}%
                                        </div>
                                        <div className="text-xs text-gray-500">Proficiency</div>
                                      </div>
                                    </div>
                                  )) || (
                                    <div className="text-xs text-gray-500">No specialties defined</div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Department Benchmarking */}
                          <div className="bg-white rounded-lg border p-4 shadow-sm">
                            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                              <Activity className="w-4 h-4 text-blue-600" />
                              Department Benchmarking
                            </h4>
                            <div className="grid grid-cols-3 gap-2">
                              <div className="text-center p-3 bg-blue-50 rounded">
                                <div className="text-lg font-bold text-blue-700">
                                  {insights.performanceInsights.score}
                                </div>
                                <div className="text-xs text-blue-600">Your Score</div>
                              </div>
                              <div className="text-center p-3 bg-gray-50 rounded">
                                <div className="text-lg font-bold text-gray-700">
                                  {insights.departmentAverage}
                                </div>
                                <div className="text-xs text-gray-600">Dept Average</div>
                              </div>
                              <div className="text-center p-3 bg-green-50 rounded">
                                <div className="text-lg font-bold text-green-700">
                                  {insights.vsAverage.sign}{insights.vsAverage.difference}
                                </div>
                                <div className="text-xs text-green-600">vs Average</div>
                              </div>
                            </div>
                          </div>

                          {/* Success Patterns */}
                          <div className="bg-white rounded-lg border p-4 shadow-sm">
                            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                              <Zap className="w-4 h-4 text-yellow-600" />
                              Key Success Patterns
                            </h4>
                            <div className="space-y-3">
                              <div className="flex items-start gap-2 p-3 bg-yellow-50 rounded">
                                <CheckCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
                                <div>
                                  <h5 className="font-medium text-gray-900 text-sm">Experience Advantage</h5>
                                  <p className="text-xs text-gray-600">
                                    {insights.successPatterns.experienceAdvantage}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-start gap-2 p-3 bg-green-50 rounded">
                                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                                <div>
                                  <h5 className="font-medium text-gray-900 text-sm">Strength Utilization</h5>
                                  <p className="text-xs text-gray-600">
                                    {insights.successPatterns.strengthUtilization}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-start gap-2 p-3 bg-purple-50 rounded">
                                <CheckCircle className="w-4 h-4 text-purple-600 mt-0.5" />
                                <div>
                                  <h5 className="font-medium text-gray-900 text-sm">Department Alignment</h5>
                                  <p className="text-xs text-gray-600">
                                    {insights.successPatterns.departmentAlignment}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Recommendations */}
                          <div className="bg-white rounded-lg border p-4 shadow-sm">
                            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                              <Brain className="w-4 h-4 text-indigo-600" />
                              Growth Recommendations
                            </h4>
                            <div className="space-y-2">
                              <div className="flex items-start gap-2 p-3 bg-indigo-50 rounded">
                                <ArrowUp className="w-4 h-4 text-indigo-600 mt-0.5" />
                                <div>
                                  <h5 className="font-medium text-gray-900 text-sm">Leverage Strengths</h5>
                                  <p className="text-xs text-gray-600">
                                    {insights.growthRecommendations.leverageStrengths}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-start gap-2 p-3 bg-blue-50 rounded">
                                <Target className="w-4 h-4 text-blue-600 mt-0.5" />
                                <div>
                                  <h5 className="font-medium text-gray-900 text-sm">Address Challenges</h5>
                                  <p className="text-xs text-gray-600">
                                    {insights.growthRecommendations.addressChallenges}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-start gap-2 p-3 bg-green-50 rounded">
                                <Award className="w-4 h-4 text-green-600 mt-0.5" />
                                <div>
                                  <h5 className="font-medium text-gray-900 text-sm">Career Growth</h5>
                                  <p className="text-xs text-gray-600">
                                    {insights.growthRecommendations.careerGrowth}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <span className="text-gray-500">Click "Generate Report" to analyze employee performance</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Skills Section */}
                  <div className="bg-white border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-200">
                      <h3 className="text-lg font-bold text-black font-[Inter] flex items-center gap-2">
                        <Zap className="w-5 h-5 text-green-600" />
                        Skills
                      </h3>
                      {!isEditingSkills && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={startEditingSkills}
                          className="flex items-center gap-2 text-gray-600 hover:text-green-600 hover:bg-green-50"
                        >
                          <Edit2 className="w-4 h-4" />
                          Edit
                        </Button>
                      )}
                    </div>
                    <div className="p-6">
                      {isEditingSkills ? (
                        /* Edit Form */
                        <div className="space-y-6">
                          {/* Technical Skills */}
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-base font-medium text-gray-900">Technical Skills</h4>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => addSkill('technical')}
                                className="flex items-center gap-1 text-green-600 hover:text-green-700 hover:bg-green-50 text-sm"
                              >
                                <Plus className="w-3 h-3" />
                                Add
                              </Button>
                            </div>
                            <div className="space-y-2">
                              {(skillsFormData.technical || []).map((skill, index) => (
                                <div key={index} className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={skill}
                                    onChange={(e) => handleSkillChange('technical', index, e.target.value)}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                                    placeholder="Enter technical skill"
                                  />
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeSkill('technical', index)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 p-1"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              ))}
                              {(!skillsFormData.technical || skillsFormData.technical.length === 0) && (
                                <p className="text-gray-500 text-sm italic">No technical skills added yet</p>
                              )}
                            </div>
                          </div>

                          {/* Domain Expertise */}
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-base font-medium text-gray-900">Domain Expertise</h4>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => addSkill('domain')}
                                className="flex items-center gap-1 text-green-600 hover:text-green-700 hover:bg-green-50 text-sm"
                              >
                                <Plus className="w-3 h-3" />
                                Add
                              </Button>
                            </div>
                            <div className="space-y-2">
                              {(skillsFormData.domain || []).map((skill, index) => (
                                <div key={index} className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={skill}
                                    onChange={(e) => handleSkillChange('domain', index, e.target.value)}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                                    placeholder="Enter domain expertise"
                                  />
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeSkill('domain', index)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 p-1"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              ))}
                              {(!skillsFormData.domain || skillsFormData.domain.length === 0) && (
                                <p className="text-gray-500 text-sm italic">No domain expertise added yet</p>
                              )}
                            </div>
                          </div>

                          {/* Methodologies */}
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-base font-medium text-gray-900">Methodologies</h4>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => addSkill('methodologies')}
                                className="flex items-center gap-1 text-green-600 hover:text-green-700 hover:bg-green-50 text-sm"
                              >
                                <Plus className="w-3 h-3" />
                                Add
                              </Button>
                            </div>
                            <div className="space-y-2">
                              {(skillsFormData.methodologies || []).map((skill, index) => (
                                <div key={index} className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={skill}
                                    onChange={(e) => handleSkillChange('methodologies', index, e.target.value)}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                                    placeholder="Enter methodology"
                                  />
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeSkill('methodologies', index)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 p-1"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              ))}
                              {(!skillsFormData.methodologies || skillsFormData.methodologies.length === 0) && (
                                <p className="text-gray-500 text-sm italic">No methodologies added yet</p>
                              )}
                            </div>
                          </div>

                          {/* Certifications */}
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-base font-medium text-gray-900">Certifications</h4>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => addSkill('certifications')}
                                className="flex items-center gap-1 text-green-600 hover:text-green-700 hover:bg-green-50 text-sm"
                              >
                                <Plus className="w-3 h-3" />
                                Add
                              </Button>
                            </div>
                            <div className="space-y-2">
                              {(skillsFormData.certifications || []).map((skill, index) => (
                                <div key={index} className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={skill}
                                    onChange={(e) => handleSkillChange('certifications', index, e.target.value)}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                                    placeholder="Enter certification"
                                  />
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeSkill('certifications', index)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 p-1"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              ))}
                              {(!skillsFormData.certifications || skillsFormData.certifications.length === 0) && (
                                <p className="text-gray-500 text-sm italic">No certifications added yet</p>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-3 pt-4 border-t">
                            <Button
                              onClick={saveSkills}
                              disabled={isLoading}
                              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
                            >
                              <Save className="w-4 h-4" />
                              {isLoading ? 'Saving...' : 'Save Changes'}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={cancelEditingSkills}
                              disabled={isLoading}
                              className="flex items-center gap-2"
                            >
                              <X className="w-4 h-4" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        /* Display Mode */
                        <div className="space-y-6">
                          {/* Technical Skills */}
                          <div>
                            <h4 className="text-base font-medium text-gray-900 mb-3">Technical Skills</h4>
                            <div className="flex flex-wrap gap-2">
                              {skills.technical && skills.technical.length > 0 ? (
                                skills.technical.map((skill, idx) => (
                                  <span
                                    key={idx}
                                    className="px-3 py-1 bg-blue-50 text-blue-700 text-sm font-medium rounded-full"
                                  >
                                    {skill}
                                  </span>
                                ))
                              ) : (
                                <span className="text-gray-500 text-sm">No technical skills data available</span>
                              )}
                            </div>
                          </div>

                          {/* Domain Expertise */}
                          <div>
                            <h4 className="text-base font-medium text-gray-900 mb-3">Domain Expertise</h4>
                            <div className="flex flex-wrap gap-2">
                              {skills.domain && skills.domain.length > 0 ? (
                                skills.domain.map((skill, idx) => (
                                  <span
                                    key={idx}
                                    className="px-3 py-1 bg-green-50 text-green-700 text-sm font-medium rounded-full"
                                  >
                                    {skill}
                                  </span>
                                ))
                              ) : (
                                <span className="text-gray-500 text-sm">No domain expertise data available</span>
                              )}
                            </div>
                          </div>

                          {/* Methodologies */}
                          <div>
                            <h4 className="text-base font-medium text-gray-900 mb-3">Methodologies</h4>
                            <div className="flex flex-wrap gap-2">
                              {skills.methodologies && skills.methodologies.length > 0 ? (
                                skills.methodologies.map((skill, idx) => (
                                  <span
                                    key={idx}
                                    className="px-3 py-1 bg-purple-50 text-purple-700 text-sm font-medium rounded-full"
                                  >
                                    {skill}
                                  </span>
                                ))
                              ) : (
                                <span className="text-gray-500 text-sm">No methodologies data available</span>
                              )}
                            </div>
                          </div>

                          {/* Certifications */}
                          <div>
                            <h4 className="text-base font-medium text-gray-900 mb-3">Certifications</h4>
                            <div className="flex flex-wrap gap-2">
                              {skills.certifications && skills.certifications.length > 0 ? (
                                skills.certifications.map((skill, idx) => (
                                  <span
                                    key={idx}
                                    className="px-3 py-1 bg-yellow-50 text-yellow-700 text-sm font-medium rounded-full"
                                  >
                                    {skill}
                                  </span>
                                ))
                              ) : (
                                <span className="text-gray-500 text-sm">No certifications data available</span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Past Experience */}
                  <div className="bg-white border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-200">
                      <h3 className="text-lg font-bold text-black font-[Inter] flex items-center gap-2">
                        <Briefcase className="w-5 h-5 text-green-600" />
                        Past Experience
                      </h3>
                      {!isEditingExperience && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={startEditingExperience}
                          className="flex items-center gap-2 text-gray-600 hover:text-green-600 hover:bg-green-50"
                        >
                          <Edit2 className="w-4 h-4" />
                          Edit
                        </Button>
                      )}
                    </div>
                    <div className="p-6">
                      {isEditingExperience ? (
                        /* Edit Form */
                        <div className="space-y-6">
                          {/* Add Experience Button */}
                          <div className="flex justify-between items-center">
                            <h4 className="text-base font-medium text-gray-900">Work Experience</h4>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={addNewExperience}
                              className="flex items-center gap-1 text-green-600 hover:text-green-700 hover:bg-green-50 text-sm"
                            >
                              <Plus className="w-3 h-3" />
                              Add Experience
                            </Button>
                          </div>

                          {/* Experience Forms */}
                          <div className="space-y-6">
                            {experienceFormData.map((experience, index) => (
                              <div key={index} className="border border-gray-200 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-4">
                                  <span className="text-sm font-medium text-gray-700">Experience {index + 1}</span>
                                  {experienceFormData.length > 1 && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeExperience(index)}
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50 p-1"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {/* Company */}
                                  <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">
                                      Company
                                    </label>
                                    <input
                                      type="text"
                                      value={experience.company}
                                      onChange={(e) => handleExperienceChange(index, 'company', e.target.value)}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                                      placeholder="Enter company name"
                                    />
                                  </div>

                                  {/* Period */}
                                  <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">
                                      Period
                                    </label>
                                    <input
                                      type="text"
                                      value={experience.period}
                                      onChange={(e) => handleExperienceChange(index, 'period', e.target.value)}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                                      placeholder="e.g., 2020 - 2023"
                                    />
                                  </div>
                                </div>

                                {/* Role */}
                                <div className="mt-4">
                                  <label className="block text-sm font-medium text-gray-500 mb-1">
                                    Role/Position
                                  </label>
                                  <input
                                    type="text"
                                    value={experience.role}
                                    onChange={(e) => handleExperienceChange(index, 'role', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                                    placeholder="Enter job title/role"
                                  />
                                </div>

                                {/* Description */}
                                <div className="mt-4">
                                  <label className="block text-sm font-medium text-gray-500 mb-1">
                                    Description
                                  </label>
                                  <textarea
                                    value={experience.description}
                                    onChange={(e) => handleExperienceChange(index, 'description', e.target.value)}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                                    placeholder="Describe your role, responsibilities, and achievements"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>

                          {experienceFormData.length === 0 && (
                            <div className="text-center py-8">
                              <p className="text-gray-500 text-sm italic mb-4">No work experience added yet</p>
                              <Button
                                onClick={addNewExperience}
                                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
                              >
                                <Plus className="w-4 h-4" />
                                Add Your First Experience
                              </Button>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex items-center gap-3 pt-4 border-t">
                            <Button
                              onClick={saveExperience}
                              disabled={isLoading}
                              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
                            >
                              <Save className="w-4 h-4" />
                              {isLoading ? 'Saving...' : 'Save Changes'}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={cancelEditingExperience}
                              disabled={isLoading}
                              className="flex items-center gap-2"
                            >
                              <X className="w-4 h-4" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        /* Display Mode */
                        <div>
                          {experiences && experiences.length > 0 ? (
                            <div className="space-y-6">
                              {experiences.map((exp, index) => (
                                <div key={index} className="relative">
                                  <div className="flex items-start gap-4">
                                    <div className="w-4 h-4 bg-green-600 rounded-full border-4 border-green-100 mt-2 relative z-10"></div>
                                    <div className="flex-1">
                                      <div className="flex items-center justify-between mb-1">
                                        <h4 className="text-base font-semibold text-gray-900">{exp.company}</h4>
                                        <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">{exp.period}</span>
                                      </div>
                                      <p className="text-sm text-gray-600 mb-2">{exp.position || exp.role}</p>
                                      <p className="text-sm text-gray-600">{exp.description}</p>
                                    </div>
                                  </div>
                                  {index < experiences.length - 1 && (
                                    <div className="absolute left-2 top-6 bottom-0 w-0.5 bg-gray-200"></div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-8">
                              <span className="text-gray-500 text-sm">No work experience data available</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column - Sidebar */}
                <div className="xl:col-span-3 space-y-6">
                  {/* Contact Information */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Contact className="w-5 h-5 text-green-600" />
                        Contact Information
                      </h3>
                      {!isEditingContact && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={startEditingContact}
                          className="flex items-center gap-2 text-gray-600 hover:text-green-600 hover:bg-green-50"
                        >
                          <Edit2 className="w-4 h-4" />
                          Edit
                        </Button>
                      )}
                    </div>

                    {/* Error Message */}
                    {error && (
                      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center gap-2 text-red-800 text-sm">
                          <AlertCircle className="w-4 h-4" />
                          {error}
                        </div>
                      </div>
                    )}

                    {isEditingContact ? (
                      /* Edit Form */
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-500 mb-1">Email</label>
                          <input
                            type="email"
                            value={contactFormData.email || ''}
                            onChange={(e) => handleContactInputChange('email', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                            placeholder="Enter email address"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500 mb-1">Phone</label>
                          <input
                            type="tel"
                            value={contactFormData.phone || ''}
                            onChange={(e) => handleContactInputChange('phone', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                            placeholder="Enter phone number"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500 mb-1">Location</label>
                          <input
                            type="text"
                            value={contactFormData.location || ''}
                            onChange={(e) => handleContactInputChange('location', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                            placeholder="Enter current location"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500 mb-1">Main Office</label>
                          <input
                            type="text"
                            value={contactFormData.mainOffice || ''}
                            onChange={(e) => handleContactInputChange('mainOffice', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                            placeholder="Enter main office location"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500 mb-1">Timezone</label>
                          <select
                            value={contactFormData.timezone || 'EST'}
                            onChange={(e) => handleContactInputChange('timezone', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                          >
                            <option value="EST">Eastern (EST)</option>
                            <option value="CST">Central (CST)</option>
                            <option value="MST">Mountain (MST)</option>
                            <option value="PST">Pacific (PST)</option>
                            <option value="GMT">GMT</option>
                            <option value="CET">Central European (CET)</option>
                            <option value="JST">Japan (JST)</option>
                            <option value="AEST">Australian Eastern (AEST)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500 mb-1">Department</label>
                          <input
                            type="text"
                            value={contactFormData.department || ''}
                            onChange={(e) => handleContactInputChange('department', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                            placeholder="Enter department"
                          />
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-3 pt-2">
                          <Button
                            onClick={saveContactInfo}
                            disabled={isLoading}
                            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
                          >
                            <Save className="w-4 h-4" />
                            {isLoading ? 'Saving...' : 'Save Changes'}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={cancelEditingContact}
                            disabled={isLoading}
                            className="flex items-center gap-2"
                          >
                            <X className="w-4 h-4" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      /* Display Mode */
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium text-gray-500">Email</label>
                          <p className="text-base text-gray-900">{selectedEmployee.email || 'Email not provided'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Phone</label>
                          <p className="text-base text-gray-900">{selectedEmployee.phone || 'Phone not provided'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Location</label>
                          <p className="text-base text-gray-900">{getLocationDisplay()}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Main Office</label>
                          <p className="text-sm text-gray-900">{selectedEmployee.location?.office || getLocationDisplay()}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Timezone</label>
                          <p className="text-sm text-gray-900">{selectedEmployee.timezone || 'EST'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Department</label>
                          <p className="text-sm text-gray-900">{selectedEmployee.department || 'Not specified'}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Language Skills */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <MessageCircle className="w-5 h-5 text-green-600" />
                        Language Skills
                      </h3>
                      {!isEditingLanguages && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={startEditingLanguages}
                          className="flex items-center gap-2 text-gray-600 hover:text-green-600 hover:bg-green-50"
                        >
                          <Edit2 className="w-4 h-4" />
                          Edit
                        </Button>
                      )}
                    </div>

                    {isEditingLanguages ? (
                      /* Edit Form */
                      <div className="space-y-4">
                        {languagesFormData.map((language, index) => (
                          <div key={index} className="p-4 border border-gray-200 rounded-lg">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-sm font-medium text-gray-700">Language {index + 1}</h4>
                              {languagesFormData.length > 1 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeLanguage(index)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 p-1"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>

                            <div className="space-y-3">
                              {/* Language Name */}
                              <div>
                                <label className="block text-sm font-medium text-gray-500 mb-1">
                                  Language Name
                                </label>
                                <input
                                  type="text"
                                  value={language.name}
                                  onChange={(e) => handleLanguageChange(index, 'name', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                                  placeholder="e.g., English, Spanish, Mandarin"
                                />
                              </div>

                              {/* Proficiency Level */}
                              <div>
                                <label className="block text-sm font-medium text-gray-500 mb-1">
                                  Proficiency Level
                                </label>
                                <select
                                  value={language.level}
                                  onChange={(e) => handleLanguageChange(index, 'level', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                                >
                                  <option value="Beginner">Beginner</option>
                                  <option value="Intermediate">Intermediate</option>
                                  <option value="Fluent">Fluent</option>
                                  <option value="Native">Native</option>
                                </select>
                              </div>

                              {/* Proficiency Preview */}
                              <div>
                                <label className="block text-sm font-medium text-gray-500 mb-1">
                                  Proficiency Level: {language.percentage}%
                                </label>
                                <div className="flex items-center gap-6">
                                  <div className="w-52 bg-gray-200 rounded-full h-2 flex-shrink-0">
                                    <div
                                      className="bg-green-500 h-2 rounded-full transition-all duration-300"
                                      style={{ width: `${language.percentage}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-sm font-semibold text-gray-900">
                                    {language.level}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}

                        {/* Add New Language Button */}
                        <Button
                          variant="outline"
                          onClick={addNewLanguage}
                          className="w-full flex items-center gap-2 border-dashed border-gray-300 text-gray-600 hover:bg-gray-50"
                        >
                          <Plus className="w-4 h-4" />
                          Add Another Language
                        </Button>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-3 pt-2">
                          <Button
                            onClick={saveLanguageSkills}
                            disabled={isLoading}
                            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
                          >
                            <Save className="w-4 h-4" />
                            {isLoading ? 'Saving...' : 'Save Changes'}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={cancelEditingLanguages}
                            disabled={isLoading}
                            className="flex items-center gap-2"
                          >
                            <X className="w-4 h-4" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      /* Display Mode */
                      <div className="space-y-4">
                        {languages && languages.length > 0 ? (
                          languages.map((lang, index) => (
                            <div key={index}>
                              <label className="text-sm font-medium text-gray-500">{lang.name}</label>
                              <div className="flex items-center gap-6 mt-1">
                                <div className="w-52 bg-gray-200 rounded-full h-2 flex-shrink-0">
                                  <div
                                    className="bg-green-500 h-2 rounded-full"
                                    style={{ width: `${lang.percentage}%` }}
                                  ></div>
                                </div>
                                <span className="text-sm font-semibold text-gray-900">{lang.level}</span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-4">
                            <span className="text-gray-500 text-sm">No language skills data available</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* MBTI Personality */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Brain className="w-5 h-5 text-green-600" />
                        MBTI Personality
                      </h3>
                      {!isEditingMBTI && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={startEditingMBTI}
                          className="flex items-center gap-2 text-gray-600 hover:text-green-600 hover:bg-green-50"
                        >
                          <Edit2 className="w-4 h-4" />
                          Edit
                        </Button>
                      )}
                    </div>

                    {isEditingMBTI ? (
                      /* Edit Form - Sliders Only */
                      <div className="space-y-6">
                        {/* Auto-calculated Type and Nickname Display */}
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                          <div className="text-2xl font-black text-gray-900 mb-1">
                            {mbtiFormData.type || 'XXXX'}
                          </div>
                          <p className="text-base text-gray-600">
                            "{mbtiFormData.nickname || 'Adjust sliders to see personality type'}"
                          </p>
                        </div>

                        {/* Personality Dimension Sliders */}
                        <div className="space-y-6">
                          {/* Extravert ↔ Introvert */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-700">Introvert</span>
                              <span className="text-sm font-medium text-gray-700">Extravert</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-gray-500 w-8">I</span>
                              <input
                                type="range"
                                min="0"
                                max="100"
                                value={mbtiFormData.percentages?.extravert || 50}
                                onChange={(e) => handleMBTIChange('percentages.extravert', e.target.value)}
                                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                              />
                              <span className="text-xs text-gray-500 w-8">E</span>
                            </div>
                            <div className="text-center mt-1">
                              <span className="text-xs text-gray-600">
                                {mbtiFormData.percentages?.extravert > 50 ? 'Extravert' : 'Introvert'} ({mbtiFormData.percentages?.extravert || 50}%)
                              </span>
                            </div>
                          </div>

                          {/* Sensing ↔ Intuitive */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-700">Sensing</span>
                              <span className="text-sm font-medium text-gray-700">Intuitive</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-gray-500 w-8">S</span>
                              <input
                                type="range"
                                min="0"
                                max="100"
                                value={100 - (mbtiFormData.percentages?.sensing || 50)}
                                onChange={(e) => handleMBTIChange('percentages.sensing', 100 - parseInt(e.target.value))}
                                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                              />
                              <span className="text-xs text-gray-500 w-8">N</span>
                            </div>
                            <div className="text-center mt-1">
                              <span className="text-xs text-gray-600">
                                {mbtiFormData.percentages?.sensing > 50 ? 'Sensing' : 'Intuitive'} ({mbtiFormData.percentages?.sensing > 50 ? mbtiFormData.percentages?.sensing : (100 - mbtiFormData.percentages?.sensing) || 50}%)
                              </span>
                            </div>
                          </div>

                          {/* Feeling ↔ Thinking */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-700">Feeling</span>
                              <span className="text-sm font-medium text-gray-700">Thinking</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-gray-500 w-8">F</span>
                              <input
                                type="range"
                                min="0"
                                max="100"
                                value={mbtiFormData.percentages?.thinking || 50}
                                onChange={(e) => handleMBTIChange('percentages.thinking', e.target.value)}
                                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                              />
                              <span className="text-xs text-gray-500 w-8">T</span>
                            </div>
                            <div className="text-center mt-1">
                              <span className="text-xs text-gray-600">
                                {mbtiFormData.percentages?.thinking > 50 ? 'Thinking' : 'Feeling'} ({mbtiFormData.percentages?.thinking || 50}%)
                              </span>
                            </div>
                          </div>

                          {/* Perceiving ↔ Judging */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-700">Perceiving</span>
                              <span className="text-sm font-medium text-gray-700">Judging</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-gray-500 w-8">P</span>
                              <input
                                type="range"
                                min="0"
                                max="100"
                                value={mbtiFormData.percentages?.judging || 50}
                                onChange={(e) => handleMBTIChange('percentages.judging', e.target.value)}
                                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                              />
                              <span className="text-xs text-gray-500 w-8">J</span>
                            </div>
                            <div className="text-center mt-1">
                              <span className="text-xs text-gray-600">
                                {mbtiFormData.percentages?.judging > 50 ? 'Judging' : 'Perceiving'} ({mbtiFormData.percentages?.judging || 50}%)
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Auto-sync Preview */}
                        {mbtiFormData.type && getMBTIPersonalityData(mbtiFormData.type) && (
                          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="text-sm text-blue-800 font-medium mb-2">
                              🔄 Personality details will be automatically updated for {mbtiFormData.type}:
                            </div>
                            <div className="text-sm text-blue-700 space-y-1">
                              <div>• <strong>Working Style:</strong> {getMBTIPersonalityData(mbtiFormData.type).workingStyle.length} characteristics</div>
                              <div>• <strong>Communication Preferences:</strong> {getMBTIPersonalityData(mbtiFormData.type).communicationPreferences.length} preferences</div>
                              <div>• <strong>Ideal Collaboration:</strong> Detailed description</div>
                            </div>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex items-center gap-3 pt-2">
                          <Button
                            onClick={saveMBTI}
                            disabled={isLoading}
                            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
                          >
                            <Save className="w-4 h-4" />
                            {isLoading ? 'Saving...' : 'Save Changes'}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={cancelEditingMBTI}
                            disabled={isLoading}
                            className="flex items-center gap-2"
                          >
                            <X className="w-4 h-4" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : mbtiProfile.type ? (
                      <>
                        {/* Display Mode - MBTI Type */}
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                          <div className="text-center">
                            <h4 className="text-2xl font-black text-gray-900 mb-1">{mbtiProfile.type}</h4>
                            <p className="text-base text-gray-600">"{mbtiProfile.nickname}"</p>
                          </div>
                          <div className="grid grid-cols-2 gap-4 mt-4">
                            <div>
                              <label className="text-sm font-medium text-gray-500">Introvert</label>
                              <p className="text-base text-gray-900">{mbtiProfile.percentages.introvert || mbtiProfile.percentages.extravert}%</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-500">Intuitive</label>
                              <p className="text-base text-gray-900">{mbtiProfile.percentages.intuitive}%</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-500">Thinking</label>
                              <p className="text-base text-gray-900">{mbtiProfile.percentages.thinking}%</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-500">Judging</label>
                              <p className="text-sm text-gray-900">{mbtiProfile.percentages.judging}%</p>
                            </div>
                          </div>
                        </div>

                        {/* Personality Details */}
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium text-gray-500 mb-2 block">Working Style</label>
                            <div className="text-sm text-gray-600 leading-relaxed">
                              {mbtiProfile.workingStyle && mbtiProfile.workingStyle.length > 0 ? (
                                mbtiProfile.workingStyle.map((item, index) => (
                                  <div key={index}>{item}</div>
                                ))
                              ) : (
                                <span className="text-gray-500">No working style data available</span>
                              )}
                            </div>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-500 mb-2 block">Communication Preferences</label>
                            <div className="text-sm text-gray-600 leading-relaxed">
                              {mbtiProfile.communicationPreferences && mbtiProfile.communicationPreferences.length > 0 ? (
                                mbtiProfile.communicationPreferences.map((item, index) => (
                                  <div key={index}>{item}</div>
                                ))
                              ) : (
                                <span className="text-gray-500">No communication preferences data available</span>
                              )}
                            </div>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-500 mb-2 block">Ideal Collaboration Environment</label>
                            <div className="text-sm text-gray-600 leading-relaxed">
                              {mbtiProfile.idealCollaboration || <span className="text-gray-500">No collaboration data available</span>}
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <span className="text-gray-500 text-sm">No MBTI personality data available</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'performance-metrics':
        return (
          <TabErrorBoundary tabName="Performance Metrics">
            <PerformanceMetricsTab />
          </TabErrorBoundary>
        );
      case 'customers-leads':
        return (
          <TabErrorBoundary tabName="Customer Interaction">
            <CustomerInteractionTab />
          </TabErrorBoundary>
        );
      case 'match':
        return (
          <TabErrorBoundary tabName="Match">
            <MatchTab />
          </TabErrorBoundary>
        );
      case 'insights':
        return (
          <TabErrorBoundary tabName="Insights">
            <InsightsTab />
          </TabErrorBoundary>
        );
      default:
        return (
          <TabErrorBoundary tabName="Basic Info">
            <BasicInfoTab />
          </TabErrorBoundary>
        );
    }
  };

  return (
    <AnimatePresence mode="wait">
      {selectedEmployee && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/50 z-50 flex justify-center pt-8 px-8"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="w-full bg-white rounded-lg shadow-2xl relative h-full flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
        {/* Header - Fixed */}
        <div className="flex items-center justify-between pt-5 pb-3 px-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 leading-none self-center -mb-1">{selectedEmployee.name || 'Unknown Employee'}</h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-400 hover:text-gray-600"
            onClick={handleClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Navigation Tabs - Fixed */}
        <div className="border-b border-gray-200 flex-shrink-0 px-6">
          <div className="flex">
            <Button
              variant="ghost"
              onClick={() => setActiveProfileTab('overview')}
              className={`flex items-center gap-2 p-4 text-sm font-medium border-b-2 rounded-none ${
                activeProfileTab === 'overview'
                  ? 'border-green-600 text-green-600 hover:text-green-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Home className="w-4 h-4" />
              Overview
            </Button>
            <Button
              variant="ghost"
              onClick={() => setActiveProfileTab('performance-metrics')}
              className={`flex items-center gap-2 p-4 text-sm font-medium border-b-2 rounded-none ${
                activeProfileTab === 'performance-metrics'
                  ? 'border-green-600 text-green-600 hover:text-green-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Performance Metrics
            </Button>
            <Button
              variant="ghost"
              onClick={() => setActiveProfileTab('customers-leads')}
              className={`flex items-center gap-2 p-4 text-sm font-medium border-b-2 rounded-none ${
                activeProfileTab === 'customers-leads'
                  ? 'border-green-600 text-green-600 hover:text-green-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Users className="w-4 h-4" />
              Customers & Leads
            </Button>
            <Button
              variant="ghost"
              onClick={() => setActiveProfileTab('match')}
              className={`flex items-center gap-2 p-4 text-sm font-medium border-b-2 rounded-none ${
                activeProfileTab === 'match'
                  ? 'border-green-600 text-green-600 hover:text-green-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Search className="w-4 h-4" />
              Match
            </Button>
            <Button
              variant="ghost"
              onClick={() => setActiveProfileTab('insights')}
              className={`flex items-center gap-2 p-4 text-sm font-medium border-b-2 rounded-none ${
                activeProfileTab === 'insights'
                  ? 'border-green-600 text-green-600 hover:text-green-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Brain className="w-4 h-4" />
              Insights
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          {renderTabContent()}
        </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default EmployeeProfileModal;