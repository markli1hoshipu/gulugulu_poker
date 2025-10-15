import React, { useState, useEffect } from 'react';
import { 
    User, Mail, Phone, MapPin, Clock, Users, Star, FileText, 
    Briefcase, Edit3, Trash2, Plus, RefreshCw, Award 
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import employeeApiService, { EmployeeApiError } from '../../services/employeeApi';

const BasicInformationTab = ({ employee, setEmployee }) => {
    // Individual section edit states
    const [contactEditMode, setContactEditMode] = useState(false);
    const [strengthsEditMode, setStrengthsEditMode] = useState(false);
    const [skillsEditMode, setSkillsEditMode] = useState(false);
    const [languagesEditMode, setLanguagesEditMode] = useState(false);
    const [experienceEditMode, setExperienceEditMode] = useState(false);
    const [mbtiEditMode, setMbtiEditMode] = useState(false);
    
    // Individual section temp data
    const [contactTempData, setContactTempData] = useState(null);
    const [strengthsTempData, setStrengthsTempData] = useState(null);
    const [skillsTempData, setSkillsTempData] = useState(null);
    const [languagesTempData, setLanguagesTempData] = useState(null);
    const [experienceTempData, setExperienceTempData] = useState(null);
    const [mbtiTempData, setMbtiTempData] = useState(null);
    
    // Individual section saving states
    const [contactSaving, setContactSaving] = useState(false);
    const [strengthsSaving, setStrengthsSaving] = useState(false);
    const [skillsSaving, setSkillsSaving] = useState(false);
    const [languagesSaving, setLanguagesSaving] = useState(false);
    const [experienceSaving, setExperienceSaving] = useState(false);
    const [mbtiSaving, setMbtiSaving] = useState(false);
    
    // Individual section error states
    const [contactError, setContactError] = useState(null);
    const [strengthsError, setStrengthsError] = useState(null);
    const [skillsError, setSkillsError] = useState(null);
    const [languagesError, setLanguagesError] = useState(null);
    const [experienceError, setExperienceError] = useState(null);
    const [mbtiError, setMbtiError] = useState(null);
    
    // Individual section success states
    const [contactSuccess, setContactSuccess] = useState(false);
    const [strengthsSuccess, setStrengthsSuccess] = useState(false);
    const [skillsSuccess, setSkillsSuccess] = useState(false);
    const [languagesSuccess, setLanguagesSuccess] = useState(false);
    const [experienceSuccess, setExperienceSuccess] = useState(false);
    const [mbtiSuccess, setMbtiSuccess] = useState(false);
    
    // Individual section warning states
    const [experienceWarnings, setExperienceWarnings] = useState([]);
    
    // Form states for adding new items
    const [newStrength, setNewStrength] = useState('');
    const [newSkill, setNewSkill] = useState('');
    const [skillCategory, setSkillCategory] = useState('technical');
    const [newLanguage, setNewLanguage] = useState({ name: '', level: 'Beginner', percentage: 50 });
    const [newExperience, setNewExperience] = useState({ company: '', role: '', period: '', description: '' });

    // Auto-hide success messages after 3 seconds
    useEffect(() => {
        if (contactSuccess) {
            const timer = setTimeout(() => setContactSuccess(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [contactSuccess]);

    useEffect(() => {
        if (strengthsSuccess) {
            const timer = setTimeout(() => setStrengthsSuccess(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [strengthsSuccess]);

    useEffect(() => {
        if (skillsSuccess) {
            const timer = setTimeout(() => setSkillsSuccess(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [skillsSuccess]);

    useEffect(() => {
        if (languagesSuccess) {
            const timer = setTimeout(() => setLanguagesSuccess(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [languagesSuccess]);

    useEffect(() => {
        if (experienceSuccess) {
            const timer = setTimeout(() => setExperienceSuccess(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [experienceSuccess]);

    useEffect(() => {
        if (mbtiSuccess) {
            const timer = setTimeout(() => setMbtiSuccess(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [mbtiSuccess]);

    // Auto-hide error messages after 5 seconds
    useEffect(() => {
        if (contactError) {
            const timer = setTimeout(() => setContactError(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [contactError]);

    useEffect(() => {
        if (strengthsError) {
            const timer = setTimeout(() => setStrengthsError(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [strengthsError]);

    useEffect(() => {
        if (skillsError) {
            const timer = setTimeout(() => setSkillsError(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [skillsError]);

    useEffect(() => {
        if (languagesError) {
            const timer = setTimeout(() => setLanguagesError(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [languagesError]);

    useEffect(() => {
        if (experienceError) {
            const timer = setTimeout(() => setExperienceError(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [experienceError]);

    useEffect(() => {
        if (mbtiError) {
            const timer = setTimeout(() => setMbtiError(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [mbtiError]);

    // Auto-hide warning messages after 8 seconds (longer than success/error messages)
    useEffect(() => {
        if (experienceWarnings.length > 0) {
            const timer = setTimeout(() => setExperienceWarnings([]), 8000);
            return () => clearTimeout(timer);
        }
    }, [experienceWarnings]);

    if (!employee) {
        return (
            <div className="p-6">
                <div className="bg-white rounded-lg border border-yellow-200 p-6 shadow-sm">
                    <div className="flex items-center gap-3">
                        <User className="w-5 h-5 text-yellow-600" />
                        <p className="text-gray-600">No employee data available.</p>
                    </div>
                </div>
            </div>
        );
    }

    // Safe data extraction with fallbacks

    const getSkills = () => {
        try {
            if (employee?.skills && typeof employee.skills === 'object') {
                return employee.skills;
            }
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
            if (employee?.languages && Array.isArray(employee.languages)) {
                return employee.languages;
            }
            return [];
        } catch (error) {
            console.warn('Error parsing languages:', error);
            return [];
        }
    };

    const getExperiences = () => {
        try {
            if (employee?.experiences && Array.isArray(employee.experiences)) {
                return employee.experiences;
            }
            return [];
        } catch (error) {
            console.warn('Error parsing experiences:', error);
            return [];
        }
    };

    const getMbtiProfile = () => {
        try {
            if (employee?.mbti_profile && typeof employee.mbti_profile === 'object') {
                return employee.mbti_profile;
            }
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
            if (typeof employee.location === 'object' && employee.location) {
                const { city, state, country } = employee.location;
                const parts = [];
                if (city) parts.push(city);
                if (state) parts.push(state);
                if (country) parts.push(country);
                return parts.length > 0 ? parts.join(', ') : 'Not specified';
            }
            if (typeof employee.location === 'string') {
                return employee.location;
            }
            return 'Not specified';
        } catch (error) {
            console.warn('Error parsing location:', error);
            return 'Not specified';
        }
    };

    const skills = skillsEditMode ? (skillsTempData || getSkills()) : getSkills();
    const languages = languagesEditMode ? (languagesTempData || getLanguages()) : getLanguages();
    const experiences = experienceEditMode ? (experienceTempData || getExperiences()) : getExperiences();
    const mbtiProfile = mbtiEditMode ? (mbtiTempData || getMbtiProfile()) : getMbtiProfile();
    const strengths = strengthsEditMode ? (strengthsTempData || employee.strengths || []) : (employee.strengths || []);

    // Message display components
    const SuccessMessage = ({ message, show }) => {
        if (!show) return null;
        return (
            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                <div className="flex items-center">
                    <div className="w-4 h-4 text-green-400 mr-2">✓</div>
                    <p className="text-sm text-green-700">{message}</p>
                </div>
            </div>
        );
    };

    const ErrorMessage = ({ message, show }) => {
        if (!show || !message) return null;
        return (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-center">
                    <div className="w-4 h-4 text-red-400 mr-2">⚠</div>
                    <p className="text-sm text-red-700">{message}</p>
                </div>
            </div>
        );
    };

    const WarningMessage = ({ warnings, show }) => {
        if (!show || !warnings || warnings.length === 0) return null;
        return (
            <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <div className="flex items-start">
                    <div className="w-4 h-4 text-yellow-500 mr-2 mt-0.5">⚠</div>
                    <div className="flex-1">
                        <p className="text-sm font-medium text-yellow-800 mb-1">Validation Warnings:</p>
                        <ul className="text-sm text-yellow-700 space-y-1">
                            {warnings.map((warning, index) => (
                                <li key={index} className="flex items-start">
                                    <span className="w-1 h-1 bg-yellow-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                                    {warning}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        );
    };

    // Client-side validation functions
    const validatePhone = (phone) => {
        if (!phone) return true; // Phone is optional
        const phoneRegex = /^[+]?[1-9][\d]{0,15}$/;
        return phoneRegex.test(phone.replace(/[\s\-()]/g, ''));
    };

    const _validateEmail = (email) => {
        if (!email) return true; // Email validation handled by employee object
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    // Contact section edit handler
    const handleContactEditToggle = async () => {
        if (contactEditMode) {
            // Save changes
            try {
                setContactSaving(true);
                setContactError(null);
                setContactSuccess(false);
                console.log('BasicInfoTab: Starting contact save operation');
                
                // Validate contact data
                if (contactTempData?.phone && !validatePhone(contactTempData.phone)) {
                    throw new Error('Please enter a valid phone number');
                }

                // Validate location data (city is required)
                if (!contactTempData?.location?.city || !contactTempData.location.city.trim()) {
                    throw new Error('City is required for location');
                }

                // Prepare location object ensuring proper format
                const locationData = {
                    city: contactTempData.location.city.trim(),
                    state: contactTempData.location.state?.trim() || '',
                    country: contactTempData.location.country?.trim() || ''
                };

                // Update employee with contact data
                const updatedEmployee = {
                    ...employee,
                    phone: contactTempData?.phone || employee.phone,
                    timezone: contactTempData?.timezone || employee.timezone,
                    department: contactTempData?.department || employee.department,
                    role: contactTempData?.role || employee.role,
                    location: locationData,
                };

                // Call API to save to database
                await employeeApiService.updateEmployee(employee.id, updatedEmployee);
                
                // Update local state on successful API call
                setEmployee(updatedEmployee);
                setContactTempData(null);
                setContactSuccess(true);
                console.log('BasicInfoTab: Contact changes saved successfully to database');
                
            } catch (error) {
                console.error('BasicInfoTab: Error saving contact changes:', error);
                let errorMessage = 'Failed to save contact information. Please try again.';
                
                if (error instanceof EmployeeApiError) {
                    errorMessage = error.message;
                } else if (error.message) {
                    errorMessage = error.message;
                }
                
                setContactError(errorMessage);
                // Keep tempData and stay in edit mode on error
                return;
            } finally {
                setContactSaving(false);
            }
        } else {
            // Enter edit mode
            setContactError(null);
            setContactSuccess(false);
            setContactTempData({
                phone: employee.phone || '',
                timezone: employee.timezone || 'EST',
                department: employee.department || '',
                role: employee.role || '',
                location: (() => {
                    if (typeof employee.location === 'string') {
                        // Convert legacy string to object format
                        return { city: employee.location, state: '', country: '' };
                    } else if (typeof employee.location === 'object' && employee.location) {
                        // Use existing object, ensure all fields exist
                        return {
                            city: employee.location.city || '',
                            state: employee.location.state || '',
                            country: employee.location.country || ''
                        };
                    }
                    // Default empty location object
                    return { city: '', state: '', country: '' };
                })(),
            });
        }
        setContactEditMode(!contactEditMode);
    };

    // Strengths section edit handler
    const handleStrengthsEditToggle = async () => {
        if (strengthsEditMode) {
            try {
                setStrengthsSaving(true);
                setStrengthsError(null);
                setStrengthsSuccess(false);
                console.log('BasicInfoTab: Starting strengths save operation');

                // Validate strengths data
                const strengths = strengthsTempData || employee.strengths || [];
                if (!Array.isArray(strengths)) {
                    throw new Error('Strengths must be a valid list');
                }

                // Filter out empty strings and ensure unique values
                const validStrengths = [...new Set(strengths.filter(s => s && s.trim()))];

                const updatedEmployee = {
                    ...employee,
                    strengths: validStrengths,
                };

                // Call API to save to database
                await employeeApiService.updateEmployee(employee.id, updatedEmployee);
                
                // Update local state on successful API call
                setEmployee(updatedEmployee);
                setStrengthsTempData(null);
                setStrengthsSuccess(true);
                console.log('BasicInfoTab: Strengths saved successfully to database');

            } catch (error) {
                console.error('BasicInfoTab: Error saving strengths changes:', error);
                let errorMessage = 'Failed to save strengths. Please try again.';
                
                if (error instanceof EmployeeApiError) {
                    errorMessage = error.message;
                } else if (error.message) {
                    errorMessage = error.message;
                }
                
                setStrengthsError(errorMessage);
                // Keep tempData and stay in edit mode on error
                return;
            } finally {
                setStrengthsSaving(false);
            }
        } else {
            // Enter edit mode
            setStrengthsError(null);
            setStrengthsSuccess(false);
            setStrengthsTempData([...(employee.strengths || [])]);
        }
        setStrengthsEditMode(!strengthsEditMode);
    };

    // Skills section edit handler
    const handleSkillsEditToggle = async () => {
        if (skillsEditMode) {
            try {
                setSkillsSaving(true);
                setSkillsError(null);
                setSkillsSuccess(false);
                console.log('BasicInfoTab: Starting skills save operation');

                // Validate skills data
                const skills = skillsTempData || employee.skills || {};
                if (typeof skills !== 'object') {
                    throw new Error('Skills must be a valid object');
                }

                // Ensure all skill categories exist and are arrays
                const validSkills = {
                    technical: Array.isArray(skills.technical) ? skills.technical.filter(s => s && s.trim()) : [],
                    domain: Array.isArray(skills.domain) ? skills.domain.filter(s => s && s.trim()) : [],
                    methodologies: Array.isArray(skills.methodologies) ? skills.methodologies.filter(s => s && s.trim()) : [],
                    certifications: Array.isArray(skills.certifications) ? skills.certifications.filter(s => s && s.trim()) : []
                };

                const updatedEmployee = {
                    ...employee,
                    skills: validSkills,
                };

                // Call API to save to database
                await employeeApiService.updateEmployee(employee.id, updatedEmployee);
                
                // Update local state on successful API call
                setEmployee(updatedEmployee);
                setSkillsTempData(null);
                setSkillsSuccess(true);
                console.log('BasicInfoTab: Skills saved successfully to database');

            } catch (error) {
                console.error('BasicInfoTab: Error saving skills changes:', error);
                let errorMessage = 'Failed to save skills. Please try again.';
                
                if (error instanceof EmployeeApiError) {
                    errorMessage = error.message;
                } else if (error.message) {
                    errorMessage = error.message;
                }
                
                setSkillsError(errorMessage);
                // Keep tempData and stay in edit mode on error
                return;
            } finally {
                setSkillsSaving(false);
            }
        } else {
            // Enter edit mode
            setSkillsError(null);
            setSkillsSuccess(false);
            setSkillsTempData({ ...getSkills() });
        }
        setSkillsEditMode(!skillsEditMode);
    };

    // Languages section edit handler
    const handleLanguagesEditToggle = async () => {
        if (languagesEditMode) {
            try {
                setLanguagesSaving(true);
                setLanguagesError(null);
                setLanguagesSuccess(false);
                console.log('BasicInfoTab: Starting languages save operation');

                // Validate languages data
                const languages = languagesTempData || employee.languages || [];
                if (!Array.isArray(languages)) {
                    throw new Error('Languages must be a valid list');
                }

                // Validate each language object has required properties
                const validLanguages = languages.filter(lang => {
                    if (!lang || typeof lang !== 'object') return false;
                    if (!lang.name || typeof lang.name !== 'string' || !lang.name.trim()) return false;
                    if (!lang.level || typeof lang.level !== 'string') return false;
                    if (typeof lang.percentage !== 'number' || lang.percentage < 0 || lang.percentage > 100) return false;
                    return true;
                });

                const updatedEmployee = {
                    ...employee,
                    languages: validLanguages,
                };

                // Call API to save to database
                await employeeApiService.updateEmployee(employee.id, updatedEmployee);
                
                // Update local state on successful API call
                setEmployee(updatedEmployee);
                setLanguagesTempData(null);
                setLanguagesSuccess(true);
                console.log('BasicInfoTab: Languages saved successfully to database');

            } catch (error) {
                console.error('BasicInfoTab: Error saving languages changes:', error);
                let errorMessage = 'Failed to save languages. Please try again.';
                
                if (error instanceof EmployeeApiError) {
                    errorMessage = error.message;
                } else if (error.message) {
                    errorMessage = error.message;
                }
                
                setLanguagesError(errorMessage);
                // Keep tempData and stay in edit mode on error
                return;
            } finally {
                setLanguagesSaving(false);
            }
        } else {
            // Enter edit mode
            setLanguagesError(null);
            setLanguagesSuccess(false);
            setLanguagesTempData([...getLanguages()]);
        }
        setLanguagesEditMode(!languagesEditMode);
    };

    // Experience section edit handler
    const handleExperienceEditToggle = async () => {
        if (experienceEditMode) {
            try {
                setExperienceSaving(true);
                setExperienceError(null);
                setExperienceSuccess(false);
                console.log('BasicInfoTab: Starting experience save operation');

                // Validate experience data
                const experiences = experienceTempData || employee.experiences || [];
                if (!Array.isArray(experiences)) {
                    throw new Error('Experience must be a valid list');
                }

                // Validate each experience and collect validation issues
                const validationIssues = [];
                const processedExperiences = experiences.map((exp, index) => {
                    const issues = [];
                    
                    if (!exp || typeof exp !== 'object') {
                        issues.push('Invalid experience format');
                        return null;
                    }
                    
                    // Check for required fields
                    if (!exp.company || typeof exp.company !== 'string' || !exp.company.trim()) {
                        issues.push(`Experience ${index + 1}: Company name is required`);
                    }
                    if (!exp.role || typeof exp.role !== 'string' || !exp.role.trim()) {
                        issues.push(`Experience ${index + 1}: Role/Position is required`);
                    }
                    
                    // Validate optional fields if provided
                    if (exp.period && typeof exp.period !== 'string') {
                        issues.push(`Experience ${index + 1}: Period must be text`);
                    }
                    if (exp.description && typeof exp.description !== 'string') {
                        issues.push(`Experience ${index + 1}: Description must be text`);
                    }
                    
                    if (issues.length > 0) {
                        validationIssues.push(...issues);
                        return null; // Mark as invalid
                    }
                    
                    // Clean the experience data
                    return {
                        company: exp.company.trim(),
                        role: exp.role.trim(),
                        period: exp.period ? exp.period.trim() : '',
                        description: exp.description ? exp.description.trim() : ''
                    };
                }).filter(exp => exp !== null); // Remove invalid experiences

                // If there are validation issues, show warning but allow save if user has at least one valid experience
                if (validationIssues.length > 0) {
                    console.warn('Experience validation issues:', validationIssues);
                    
                    // Store warnings to display to user
                    setExperienceWarnings(validationIssues);
                    
                    // Still proceed with valid experiences, but show warning
                    if (processedExperiences.length === 0 && experiences.length > 0) {
                        throw new Error('All experiences have validation errors. Please fix the required fields (Company and Role) before saving.');
                    }
                } else {
                    // Clear warnings if no issues
                    setExperienceWarnings([]);
                }

                const updatedEmployee = {
                    ...employee,
                    experiences: processedExperiences,
                };

                // Call API to save to database
                await employeeApiService.updateEmployee(employee.id, updatedEmployee);
                
                // Update local state on successful API call
                setEmployee(updatedEmployee);
                setExperienceTempData(null);
                setExperienceSuccess(true);
                console.log('BasicInfoTab: Experience saved successfully to database');

            } catch (error) {
                console.error('BasicInfoTab: Error saving experience changes:', error);
                let errorMessage = 'Failed to save experience. Please try again.';
                
                if (error instanceof EmployeeApiError) {
                    errorMessage = error.message;
                } else if (error.message) {
                    errorMessage = error.message;
                }
                
                setExperienceError(errorMessage);
                // Keep tempData and stay in edit mode on error
                return;
            } finally {
                setExperienceSaving(false);
            }
        } else {
            // Enter edit mode
            setExperienceError(null);
            setExperienceSuccess(false);
            setExperienceWarnings([]);
            setExperienceTempData([...getExperiences()]);
        }
        setExperienceEditMode(!experienceEditMode);
    };

    // MBTI section edit handler
    const handleMbtiEditToggle = async () => {
        if (mbtiEditMode) {
            try {
                setMbtiSaving(true);
                setMbtiError(null);
                setMbtiSuccess(false);
                console.log('BasicInfoTab: Starting MBTI save operation');

                // Validate MBTI data
                const mbtiData = mbtiTempData || employee.mbti_profile || {};
                
                // Ensure percentages are valid numbers between 0-100
                if (mbtiData.percentages) {
                    const validPercentages = {};
                    const requiredKeys = ['extravert', 'intuitive', 'thinking', 'judging'];
                    
                    for (const key of requiredKeys) {
                        const value = mbtiData.percentages[key];
                        if (typeof value === 'number' && value >= 0 && value <= 100) {
                            validPercentages[key] = value;
                        } else {
                            validPercentages[key] = 50; // Default to 50% if invalid
                        }
                    }
                    mbtiData.percentages = validPercentages;
                }

                // Ensure arrays for working style and communication preferences
                if (mbtiData.workingStyle && !Array.isArray(mbtiData.workingStyle)) {
                    mbtiData.workingStyle = [];
                }
                if (mbtiData.communicationPreferences && !Array.isArray(mbtiData.communicationPreferences)) {
                    mbtiData.communicationPreferences = [];
                }

                // Ensure strings for type, nickname, and idealCollaboration
                if (mbtiData.type && typeof mbtiData.type !== 'string') {
                    mbtiData.type = '';
                }
                if (mbtiData.nickname && typeof mbtiData.nickname !== 'string') {
                    mbtiData.nickname = '';
                }
                if (mbtiData.idealCollaboration && typeof mbtiData.idealCollaboration !== 'string') {
                    mbtiData.idealCollaboration = '';
                }

                const updatedEmployee = {
                    ...employee,
                    mbti_profile: mbtiData,
                };

                // Call API to save to database
                await employeeApiService.updateEmployee(employee.id, updatedEmployee);
                
                // Update local state on successful API call
                setEmployee(updatedEmployee);
                setMbtiTempData(null);
                setMbtiSuccess(true);
                console.log('BasicInfoTab: MBTI saved successfully to database');

            } catch (error) {
                console.error('BasicInfoTab: Error saving MBTI changes:', error);
                let errorMessage = 'Failed to save MBTI profile. Please try again.';
                
                if (error instanceof EmployeeApiError) {
                    errorMessage = error.message;
                } else if (error.message) {
                    errorMessage = error.message;
                }
                
                setMbtiError(errorMessage);
                // Keep tempData and stay in edit mode on error
                return;
            } finally {
                setMbtiSaving(false);
            }
        } else {
            // Enter edit mode
            setMbtiError(null);
            setMbtiSuccess(false);
            setMbtiTempData({ 
                ...getMbtiProfile(),
                percentages: getMbtiProfile().percentages || { extravert: 50, intuitive: 50, thinking: 50, judging: 50 }
            });
        }
        setMbtiEditMode(!mbtiEditMode);
    };

    // Helper functions for editing - section specific
    const updateContactTempData = (field, value) => {
        setContactTempData(prev => {
            if (field.includes('.')) {
                const [parent, child] = field.split('.');
                return {
                    ...prev,
                    [parent]: {
                        ...prev[parent],
                        [child]: value
                    }
                };
            }
            return { ...prev, [field]: value };
        });
    };

    // Strengths functions
    const addStrength = () => {
        if (newStrength.trim() && !strengths.includes(newStrength.trim())) {
            const updatedStrengths = [...strengths, newStrength.trim()];
            setStrengthsTempData(updatedStrengths);
            setNewStrength('');
        }
    };

    const removeStrength = (index) => {
        const updatedStrengths = strengths.filter((_, idx) => idx !== index);
        setStrengthsTempData(updatedStrengths);
    };

    // Skills functions
    const skillCategories = [
        { key: 'technical', label: 'Technical Skills', color: 'blue' },
        { key: 'domain', label: 'Domain Expertise', color: 'green' },
        { key: 'methodologies', label: 'Methodologies', color: 'purple' },
        { key: 'certifications', label: 'Certifications', color: 'yellow' }
    ];

    const addSkill = () => {
        if (!newSkill.trim()) return;
        
        const updatedSkills = {
            ...skills,
            [skillCategory]: [...(skills[skillCategory] || []), newSkill.trim()]
        };
        setSkillsTempData(updatedSkills);
        setNewSkill('');
    };

    const removeSkill = (category, index) => {
        const updatedSkills = {
            ...skills,
            [category]: skills[category].filter((_, idx) => idx !== index)
        };
        setSkillsTempData(updatedSkills);
    };

    // Language functions
    const addLanguage = () => {
        if (newLanguage.name.trim()) {
            const updatedLanguages = [...languages, { ...newLanguage }];
            setLanguagesTempData(updatedLanguages);
            setNewLanguage({ name: '', level: 'Beginner', percentage: 50 });
        }
    };

    const removeLanguage = (index) => {
        const updatedLanguages = languages.filter((_, idx) => idx !== index);
        setLanguagesTempData(updatedLanguages);
    };

    const updateLanguage = (index, field, value) => {
        const updatedLanguages = [...languages];
        updatedLanguages[index] = { ...updatedLanguages[index], [field]: value };
        setLanguagesTempData(updatedLanguages);
    };

    // Experience functions
    const addExperience = () => {
        if (newExperience.company.trim() && newExperience.role.trim()) {
            const updatedExperiences = [...experiences, { ...newExperience }];
            setExperienceTempData(updatedExperiences);
            setNewExperience({ company: '', role: '', period: '', description: '' });
        }
    };

    const removeExperience = (index) => {
        const updatedExperiences = experiences.filter((_, idx) => idx !== index);
        setExperienceTempData(updatedExperiences);
    };

    const updateExperience = (index, field, value) => {
        const updatedExperiences = [...experiences];
        updatedExperiences[index] = { ...updatedExperiences[index], [field]: value };
        setExperienceTempData(updatedExperiences);
    };

    // MBTI functions
    const updateMbtiProfile = (field, value) => {
        const updatedMbti = { ...mbtiProfile };
        if (field.includes('.')) {
            const [parent, child] = field.split('.');
            updatedMbti[parent] = { ...updatedMbti[parent], [child]: value };
        } else {
            updatedMbti[field] = value;
        }
        setMbtiTempData(updatedMbti);
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Basic Information</h2>
            </div>

            {/* Contact Information */}
            <div className="bg-white rounded-lg border p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <Mail className="w-5 h-5 text-purple-600" />
                        Contact Information
                    </h3>
                    <div className="flex items-center gap-2">
                        {contactEditMode && (
                            <Button
                                onClick={() => {
                                    setContactEditMode(false);
                                    setContactTempData(null);
                                }}
                                variant="ghost"
                                size="sm"
                                className="flex items-center gap-2"
                            >
                                Cancel
                            </Button>
                        )}
                        <Button
                            onClick={handleContactEditToggle}
                            disabled={contactSaving}
                            variant={contactEditMode ? "primary" : "outline"}
                            size="sm"
                            className="flex items-center gap-2"
                        >
                            {contactSaving ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                                <Edit3 className="w-4 h-4" />
                            )}
                            {contactSaving ? 'Saving...' : contactEditMode ? 'Save' : 'Edit'}
                        </Button>
                    </div>
                </div>
                {contactEditMode ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <div className="flex items-center gap-2">
                                    <Mail className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm text-gray-600">{employee.email || 'Email not provided'}</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                <div className="flex items-center gap-2">
                                    <Phone className="w-4 h-4 text-gray-400" />
                                    <div className="flex-1">
                                        <Input
                                            type="tel"
                                            value={contactTempData?.phone || ''}
                                            onChange={(e) => updateContactTempData('phone', e.target.value)}
                                            placeholder="Phone number"
                                            className={`w-full ${!validatePhone(contactTempData?.phone) ? 'border-red-500' : ''}`}
                                        />
                                        {contactTempData?.phone && !validatePhone(contactTempData.phone) && (
                                            <p className="text-xs text-red-500 mt-1">Please enter a valid phone number</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                <div className="flex items-center gap-2">
                                    <Briefcase className="w-4 h-4 text-gray-400" />
                                    <Input
                                        type="text"
                                        value={contactTempData?.role || ''}
                                        onChange={(e) => updateContactTempData('role', e.target.value)}
                                        placeholder="Job title or role"
                                        className="flex-1"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-gray-400" />
                                        <Input
                                            type="text"
                                            value={contactTempData?.location?.city || ''}
                                            onChange={(e) => updateContactTempData('location.city', e.target.value)}
                                            placeholder="City (required)"
                                            className={`flex-1 ${!contactTempData?.location?.city?.trim() ? 'border-red-300 focus:border-red-500' : ''}`}
                                        />
                                    </div>
                                    {contactEditMode && !contactTempData?.location?.city?.trim() && (
                                        <div className="text-xs text-red-600 ml-6 mt-1">
                                            City is required
                                        </div>
                                    )}
                                    <div className="grid grid-cols-2 gap-2 ml-6">
                                        <Input
                                            type="text"
                                            value={contactTempData?.location?.state || ''}
                                            onChange={(e) => updateContactTempData('location.state', e.target.value)}
                                            placeholder="State/Province"
                                            className="w-full"
                                        />
                                        <Input
                                            type="text"
                                            value={contactTempData?.location?.country || ''}
                                            onChange={(e) => updateContactTempData('location.country', e.target.value)}
                                            placeholder="Country"
                                            className="w-full"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-gray-400" />
                                    <select
                                        value={contactTempData?.timezone || 'EST'}
                                        onChange={(e) => updateContactTempData('timezone', e.target.value)}
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    >
                                        <option value="EST">EST</option>
                                        <option value="PST">PST</option>
                                        <option value="MST">MST</option>
                                        <option value="CST">CST</option>
                                        <option value="UTC">UTC</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                                <div className="flex items-center gap-2">
                                    <Users className="w-4 h-4 text-gray-400" />
                                    <Input
                                        type="text"
                                        value={contactTempData?.department || ''}
                                        onChange={(e) => updateContactTempData('department', e.target.value)}
                                        placeholder="Department or team"
                                        className="flex-1"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3 text-sm">
                        <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-gray-400" />
                            <span>{employee.email || 'Email not provided'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-gray-400" />
                            <span>{employee.phone || "+1 (555) 123-4567"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Briefcase className="w-4 h-4 text-gray-400" />
                            <span>Role: {employee.role || 'Not specified'}</span>
                        </div>
                    </div>
                    <div className="space-y-3 text-sm">
                        <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            <span>Location: {getLocationDisplay()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span>Timezone: {employee.timezone || "EST"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-gray-400" />
                            <span>Department: {employee.department || 'Not specified'}</span>
                        </div>
                    </div>
                </div>
                )}
                <SuccessMessage message="Contact information saved successfully!" show={contactSuccess} />
                <ErrorMessage message={contactError} show={!!contactError} />
            </div>

            {/* Strengths */}
            <div className="bg-white rounded-lg border p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <Star className="w-5 h-5 text-purple-600" />
                        Strengths
                    </h3>
                    <div className="flex items-center gap-2">
                        {strengthsEditMode && (
                            <Button
                                onClick={() => {
                                    setStrengthsEditMode(false);
                                    setStrengthsTempData(null);
                                }}
                                variant="ghost"
                                size="sm"
                                className="flex items-center gap-2"
                            >
                                Cancel
                            </Button>
                        )}
                        <Button
                            onClick={handleStrengthsEditToggle}
                            disabled={strengthsSaving}
                            variant={strengthsEditMode ? "primary" : "outline"}
                            size="sm"
                            className="flex items-center gap-2"
                        >
                            {strengthsSaving ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                                <Edit3 className="w-4 h-4" />
                            )}
                            {strengthsSaving ? 'Saving...' : strengthsEditMode ? 'Save' : 'Edit'}
                        </Button>
                    </div>
                </div>
                
                {strengthsEditMode && (
                    <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-3">Add Strength</h4>
                        <div className="flex gap-2">
                            <Input
                                type="text"
                                value={newStrength}
                                onChange={(e) => setNewStrength(e.target.value)}
                                placeholder="Enter a strength"
                                className="flex-1"
                                onKeyPress={(e) => e.key === 'Enter' && addStrength()}
                            />
                            <Button onClick={addStrength} className="flex items-center gap-2">
                                <Plus className="w-4 h-4" />
                                Add
                            </Button>
                        </div>
                    </div>
                )}

                <div className="flex flex-wrap gap-2">
                    {strengths.length > 0 ? (
                        strengths.map((strength, idx) => (
                            <div key={idx} className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium flex items-center gap-2">
                                <span>{strength}</span>
                                {strengthsEditMode && (
                                    <button
                                        onClick={() => removeStrength(idx)}
                                        className="hover:text-red-600 transition-colors"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        ))
                    ) : (
                        <span className="text-gray-500 text-sm">
                            {strengthsEditMode ? 'No strengths added yet. Use the form above to add your first strength.' : 'No strengths data available'}
                        </span>
                    )}
                </div>
                <SuccessMessage message="Strengths saved successfully!" show={strengthsSuccess} />
                <ErrorMessage message={strengthsError} show={!!strengthsError} />
            </div>

            {/* Skills Management */}
            <div className="bg-white rounded-lg border p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <Award className="w-5 h-5 text-purple-600" />
                        Skills Management
                    </h3>
                    <div className="flex items-center gap-2">
                        {skillsEditMode && (
                            <Button
                                onClick={() => {
                                    setSkillsEditMode(false);
                                    setSkillsTempData(null);
                                }}
                                variant="ghost"
                                size="sm"
                                className="flex items-center gap-2"
                            >
                                Cancel
                            </Button>
                        )}
                        <Button
                            onClick={handleSkillsEditToggle}
                            disabled={skillsSaving}
                            variant={skillsEditMode ? "primary" : "outline"}
                            size="sm"
                            className="flex items-center gap-2"
                        >
                            {skillsSaving ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                                <Edit3 className="w-4 h-4" />
                            )}
                            {skillsSaving ? 'Saving...' : skillsEditMode ? 'Save' : 'Edit'}
                        </Button>
                    </div>
                </div>

                {skillsEditMode && (
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-3">Add New Skill</h4>
                        <div className="flex gap-2">
                            <select
                                value={skillCategory}
                                onChange={(e) => setSkillCategory(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            >
                                {skillCategories.map(cat => (
                                    <option key={cat.key} value={cat.key}>{cat.label}</option>
                                ))}
                            </select>
                            <Input
                                type="text"
                                value={newSkill}
                                onChange={(e) => setNewSkill(e.target.value)}
                                placeholder="Enter skill name"
                                className="flex-1"
                                onKeyPress={(e) => e.key === 'Enter' && addSkill()}
                            />
                            <Button onClick={addSkill} className="flex items-center gap-2">
                                <Plus className="w-4 h-4" />
                                Add
                            </Button>
                        </div>
                    </div>
                )}

                <div className="space-y-6">
                    {skillCategories.map(category => (
                        <div key={category.key}>
                            <h4 className="text-sm font-medium text-gray-700 mb-3">{category.label}</h4>
                            <div className="flex flex-wrap gap-2">
                                {(skills[category.key] || []).map((skill, idx) => (
                                    <div key={idx} className={`px-3 py-1 bg-${category.color}-100 text-${category.color}-700 rounded-full text-xs font-medium flex items-center gap-2`}>
                                        <span>{skill}</span>
                                        {skillsEditMode && (
                                            <button
                                                onClick={() => removeSkill(category.key, idx)}
                                                className="hover:text-red-600 transition-colors"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                {(skills[category.key] || []).length === 0 && (
                                    <span className="text-gray-500 text-sm">No {category.label.toLowerCase()} added yet</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
                <SuccessMessage message="Skills saved successfully!" show={skillsSuccess} />
                <ErrorMessage message={skillsError} show={!!skillsError} />
            </div>

            {/* Languages */}
            <div className="bg-white rounded-lg border p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-purple-600" />
                        Languages
                    </h3>
                    <div className="flex items-center gap-2">
                        {languagesEditMode && (
                            <Button
                                onClick={() => {
                                    setLanguagesEditMode(false);
                                    setLanguagesTempData(null);
                                }}
                                variant="ghost"
                                size="sm"
                                className="flex items-center gap-2"
                            >
                                Cancel
                            </Button>
                        )}
                        <Button
                            onClick={handleLanguagesEditToggle}
                            disabled={languagesSaving}
                            variant={languagesEditMode ? "primary" : "outline"}
                            size="sm"
                            className="flex items-center gap-2"
                        >
                            {languagesSaving ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                                <Edit3 className="w-4 h-4" />
                            )}
                            {languagesSaving ? 'Saving...' : languagesEditMode ? 'Save' : 'Edit'}
                        </Button>
                    </div>
                </div>

                {languagesEditMode && (
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-3">Add Language</h4>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <Input
                                type="text"
                                value={newLanguage.name}
                                onChange={(e) => setNewLanguage({ ...newLanguage, name: e.target.value })}
                                placeholder="Language name"
                            />
                            <select
                                value={newLanguage.level}
                                onChange={(e) => setNewLanguage({ ...newLanguage, level: e.target.value })}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            >
                                <option value="Beginner">Beginner</option>
                                <option value="Intermediate">Intermediate</option>
                                <option value="Advanced">Advanced</option>
                                <option value="Native">Native</option>
                            </select>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-600">Proficiency:</span>
                                <input
                                    type="range"
                                    min="1"
                                    max="100"
                                    value={newLanguage.percentage}
                                    onChange={(e) => setNewLanguage({ ...newLanguage, percentage: parseInt(e.target.value) })}
                                    className="flex-1"
                                />
                                <span className="text-sm font-medium w-8">{newLanguage.percentage}%</span>
                            </div>
                            <Button onClick={addLanguage} className="flex items-center gap-2">
                                <Plus className="w-4 h-4" />
                                Add
                            </Button>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {languages.length > 0 ? (
                        languages.map((language, index) => (
                            <div key={index} className="border rounded-lg p-4">
                                {languagesEditMode ? (
                                    <div className="space-y-3">
                                        <Input
                                            type="text"
                                            value={language.name}
                                            onChange={(e) => updateLanguage(index, 'name', e.target.value)}
                                            placeholder="Language name"
                                        />
                                        <select
                                            value={language.level}
                                            onChange={(e) => updateLanguage(index, 'level', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                        >
                                            <option value="Beginner">Beginner</option>
                                            <option value="Intermediate">Intermediate</option>
                                            <option value="Advanced">Advanced</option>
                                            <option value="Native">Native</option>
                                        </select>
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-gray-600">Proficiency</span>
                                                <span className="text-sm font-medium">{language.percentage || 50}%</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="1"
                                                max="100"
                                                value={language.percentage || 50}
                                                onChange={(e) => updateLanguage(index, 'percentage', parseInt(e.target.value))}
                                                className="w-full"
                                            />
                                        </div>
                                        <div className="flex justify-end">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => removeLanguage(index)}
                                                className="text-red-600 hover:text-red-700"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                                Remove
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">{language.name || 'Unknown Language'}</span>
                                    <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">
                                        {language.level || 'Unknown'}
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-1.5">
                                    <div
                                        className="bg-gradient-to-r from-green-500 to-blue-500 h-1.5 rounded-full"
                                        style={{ width: `${language.percentage || 50}%` }}
                                    ></div>
                                </div>
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="col-span-3 text-center text-gray-500 text-sm py-8">
                            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p>{languagesEditMode ? 'No languages added yet. Use the form above to add your first language.' : 'No languages data available'}</p>
                        </div>
                    )}
                </div>
                <SuccessMessage message="Languages saved successfully!" show={languagesSuccess} />
                <ErrorMessage message={languagesError} show={!!languagesError} />
            </div>

            {/* Past Experience */}
            <div className="bg-white rounded-lg border p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <Briefcase className="w-5 h-5 text-purple-600" />
                        Past Experience
                    </h3>
                    <div className="flex items-center gap-2">
                        {experienceEditMode && (
                            <Button
                                onClick={() => {
                                    setExperienceEditMode(false);
                                    setExperienceTempData(null);
                                }}
                                variant="ghost"
                                size="sm"
                                className="flex items-center gap-2"
                            >
                                Cancel
                            </Button>
                        )}
                        <Button
                            onClick={handleExperienceEditToggle}
                            disabled={experienceSaving}
                            variant={experienceEditMode ? "primary" : "outline"}
                            size="sm"
                            className="flex items-center gap-2"
                        >
                            {experienceSaving ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                                <Edit3 className="w-4 h-4" />
                            )}
                            {experienceSaving ? 'Saving...' : experienceEditMode ? 'Save' : 'Edit'}
                        </Button>
                    </div>
                </div>

                {experienceEditMode && (
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-3">Add Experience</h4>
                        <div className="space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <Input
                                    type="text"
                                    value={newExperience.company}
                                    onChange={(e) => setNewExperience({ ...newExperience, company: e.target.value })}
                                    placeholder="Company name"
                                />
                                <Input
                                    type="text"
                                    value={newExperience.role}
                                    onChange={(e) => setNewExperience({ ...newExperience, role: e.target.value })}
                                    placeholder="Job title"
                                />
                            </div>
                            <Input
                                type="text"
                                value={newExperience.period}
                                onChange={(e) => setNewExperience({ ...newExperience, period: e.target.value })}
                                placeholder="Period (e.g., 2020-2022)"
                            />
                            <textarea
                                value={newExperience.description}
                                onChange={(e) => setNewExperience({ ...newExperience, description: e.target.value })}
                                placeholder="Job description and achievements..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                rows={3}
                            />
                            <div className="flex justify-end">
                                <Button onClick={addExperience} className="flex items-center gap-2">
                                    <Plus className="w-4 h-4" />
                                    Add Experience
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="space-y-6">
                    {experiences.length > 0 ? (
                        experiences.map((experience, index) => (
                            <div key={index} className="relative pl-8 pb-6 border-l-2 border-gray-200 last:border-0 last:pb-0">
                                <div className="absolute left-[-8px] top-0 w-4 h-4 bg-purple-100 border-2 border-purple-500 rounded-full"></div>
                                
                                {experienceEditMode ? (
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <Input
                                                type="text"
                                                value={experience.company}
                                                onChange={(e) => updateExperience(index, 'company', e.target.value)}
                                                placeholder="Company name"
                                            />
                                            <Input
                                                type="text"
                                                value={experience.role}
                                                onChange={(e) => updateExperience(index, 'role', e.target.value)}
                                                placeholder="Job title"
                                            />
                                        </div>
                                        <Input
                                            type="text"
                                            value={experience.period}
                                            onChange={(e) => updateExperience(index, 'period', e.target.value)}
                                            placeholder="Period (e.g., 2020-2022)"
                                        />
                                        <textarea
                                            value={experience.description}
                                            onChange={(e) => updateExperience(index, 'description', e.target.value)}
                                            placeholder="Job description and achievements..."
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                            rows={4}
                                        />
                                        <div className="flex justify-end">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => removeExperience(index)}
                                                className="text-red-600 hover:text-red-700"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                                Remove Experience
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                <div className="space-y-1">
                                    <h4 className="font-medium text-gray-900">{experience.company || 'Unknown Company'}</h4>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-700">{experience.role || 'Unknown Role'}</span>
                                        <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">
                                            {experience.period || 'Unknown Period'}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-500">{experience.description || 'No description available'}</p>
                                </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="text-center text-gray-500 text-sm py-8">
                            <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p>{experienceEditMode ? 'No experience added yet. Use the form above to add your first job experience.' : 'No past experience data available'}</p>
                        </div>
                    )}
                </div>
                <SuccessMessage message="Experience saved successfully!" show={experienceSuccess} />
                <ErrorMessage message={experienceError} show={!!experienceError} />
                <WarningMessage warnings={experienceWarnings} show={experienceWarnings.length > 0} />
            </div>

            {/* MBTI Personality */}
            <div className="bg-white rounded-lg border p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <Star className="w-5 h-5 text-purple-600" />
                        MBTI Personality
                    </h3>
                    <div className="flex items-center gap-2">
                        {mbtiEditMode && (
                            <Button
                                onClick={() => {
                                    setMbtiEditMode(false);
                                    setMbtiTempData(null);
                                }}
                                variant="ghost"
                                size="sm"
                                className="flex items-center gap-2"
                            >
                                Cancel
                            </Button>
                        )}
                        <Button
                            onClick={handleMbtiEditToggle}
                            disabled={mbtiSaving}
                            variant={mbtiEditMode ? "primary" : "outline"}
                            size="sm"
                            className="flex items-center gap-2"
                        >
                            {mbtiSaving ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                                <Edit3 className="w-4 h-4" />
                            )}
                            {mbtiSaving ? 'Saving...' : mbtiEditMode ? 'Save' : 'Edit'}
                        </Button>
                    </div>
                </div>

                {mbtiEditMode ? (
                    <div className="space-y-6">
                        {/* Type and Basic Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">MBTI Type</label>
                                <select
                                    value={mbtiProfile.type || ''}
                                    onChange={(e) => updateMbtiProfile('type', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                >
                                    <option value="">Select Type</option>
                                    {['INTJ', 'INTP', 'ENTJ', 'ENTP', 'INFJ', 'INFP', 'ENFJ', 'ENFP', 
                                      'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ', 'ISTP', 'ISFP', 'ESTP', 'ESFP'].map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Nickname</label>
                                <Input
                                    type="text"
                                    value={mbtiProfile.nickname || ''}
                                    onChange={(e) => updateMbtiProfile('nickname', e.target.value)}
                                    placeholder="e.g., The Architect"
                                />
                            </div>
                        </div>

                        {/* Percentages */}
                        <div>
                            <h4 className="font-medium text-gray-900 mb-3">Personality Percentages</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-600 mb-2">Extravert vs Introvert</label>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-gray-500">I</span>
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            value={mbtiProfile.percentages?.extravert || 50}
                                            onChange={(e) => updateMbtiProfile('percentages.extravert', parseInt(e.target.value))}
                                            className="flex-1"
                                        />
                                        <span className="text-xs text-gray-500">E</span>
                                        <span className="text-sm font-medium w-8">{mbtiProfile.percentages?.extravert || 50}%</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-600 mb-2">Sensing vs Intuitive</label>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-gray-500">S</span>
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            value={mbtiProfile.percentages?.intuitive || 50}
                                            onChange={(e) => updateMbtiProfile('percentages.intuitive', parseInt(e.target.value))}
                                            className="flex-1"
                                        />
                                        <span className="text-xs text-gray-500">N</span>
                                        <span className="text-sm font-medium w-8">{mbtiProfile.percentages?.intuitive || 50}%</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-600 mb-2">Feeling vs Thinking</label>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-gray-500">F</span>
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            value={mbtiProfile.percentages?.thinking || 50}
                                            onChange={(e) => updateMbtiProfile('percentages.thinking', parseInt(e.target.value))}
                                            className="flex-1"
                                        />
                                        <span className="text-xs text-gray-500">T</span>
                                        <span className="text-sm font-medium w-8">{mbtiProfile.percentages?.thinking || 50}%</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-600 mb-2">Perceiving vs Judging</label>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-gray-500">P</span>
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            value={mbtiProfile.percentages?.judging || 50}
                                            onChange={(e) => updateMbtiProfile('percentages.judging', parseInt(e.target.value))}
                                            className="flex-1"
                                        />
                                        <span className="text-xs text-gray-500">J</span>
                                        <span className="text-sm font-medium w-8">{mbtiProfile.percentages?.judging || 50}%</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Working Style and Communication */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Working Style</label>
                                <textarea
                                    value={mbtiProfile.workingStyle?.join(', ') || ''}
                                    onChange={(e) => updateMbtiProfile('workingStyle', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                                    placeholder="e.g., collaborative, analytical, detail-oriented"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    rows={3}
                                />
                                <p className="text-xs text-gray-500 mt-1">Separate multiple styles with commas</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Communication Preferences</label>
                                <textarea
                                    value={mbtiProfile.communicationPreferences?.join(', ') || ''}
                                    onChange={(e) => updateMbtiProfile('communicationPreferences', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                                    placeholder="e.g., face-to-face, written, brainstorming"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    rows={3}
                                />
                                <p className="text-xs text-gray-500 mt-1">Separate multiple preferences with commas</p>
                            </div>
                        </div>

                        {/* Ideal Collaboration */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Ideal Collaboration Environment</label>
                            <textarea
                                value={mbtiProfile.idealCollaboration || ''}
                                onChange={(e) => updateMbtiProfile('idealCollaboration', e.target.value)}
                                placeholder="Describe your ideal work environment and collaboration style..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                rows={3}
                            />
                        </div>
                    </div>
                ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col items-center justify-center p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
                        <div className="text-4xl font-bold text-purple-700 mb-2">
                            {mbtiProfile.type || "N/A"}
                        </div>
                        <p className="text-sm text-center text-gray-600">
                            "{mbtiProfile.nickname || "No nickname available"}"
                        </p>
                        {mbtiProfile.percentages && (
                            <div className="mt-3 grid grid-cols-2 gap-2 w-full">
                                <div className="text-center">
                                    <div className="text-xs text-gray-500">{mbtiProfile.type?.includes('E') ? 'Extravert' : 'Introvert'}</div>
                                    <div className="font-medium">{mbtiProfile.type?.includes('E') ? mbtiProfile.percentages.extravert : mbtiProfile.percentages.introvert || 50}%</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-xs text-gray-500">{mbtiProfile.type?.includes('N') ? 'Intuitive' : 'Sensing'}</div>
                                    <div className="font-medium">{mbtiProfile.type?.includes('N') ? mbtiProfile.percentages.intuitive : mbtiProfile.percentages.sensing || 50}%</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-xs text-gray-500">{mbtiProfile.type?.includes('T') ? 'Thinking' : 'Feeling'}</div>
                                    <div className="font-medium">{mbtiProfile.type?.includes('T') ? mbtiProfile.percentages.thinking : mbtiProfile.percentages.feeling || 50}%</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-xs text-gray-500">{mbtiProfile.type?.includes('J') ? 'Judging' : 'Perceiving'}</div>
                                    <div className="font-medium">{mbtiProfile.type?.includes('J') ? mbtiProfile.percentages.judging : mbtiProfile.percentages.perceiving || 50}%</div>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="space-y-3">
                        <div>
                            <h4 className="font-medium text-gray-900">Working Style</h4>
                            {mbtiProfile.workingStyle && mbtiProfile.workingStyle.length > 0 ? (
                                <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                                    {mbtiProfile.workingStyle.map((style, idx) => (
                                        <li key={idx}>{style}</li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-gray-500">No working style data available</p>
                            )}
                        </div>
                        <div>
                            <h4 className="font-medium text-gray-900 mt-3">Communication Preferences</h4>
                            {mbtiProfile.communicationPreferences && mbtiProfile.communicationPreferences.length > 0 ? (
                                <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                                    {mbtiProfile.communicationPreferences.map((pref, idx) => (
                                        <li key={idx}>{pref}</li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-gray-500">No communication preferences data available</p>
                            )}
                        </div>
                        <div>
                            <h4 className="font-medium text-gray-900 mt-3">Ideal Collaboration Environment</h4>
                            <p className="text-sm text-gray-600">
                                {mbtiProfile.idealCollaboration || "No ideal collaboration data available"}
                            </p>
                        </div>
                    </div>
                </div>
                )}
                <SuccessMessage message="MBTI profile saved successfully!" show={mbtiSuccess} />
                <ErrorMessage message={mbtiError} show={!!mbtiError} />
            </div>
        </div>
    );
};

export default BasicInformationTab;