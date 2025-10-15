import React, { useState, useEffect } from 'react';
import {
  Mail,
  Phone,
  MapPin,
  Building,
  Clock,
  Briefcase,
  Zap,
  MessageSquare,
  Brain,
  AlertCircle,
  Edit2,
  Save,
  X
} from 'lucide-react';
import { useEmployeeProfile } from '../context/EmployeeProfileContext';

const BasicInfoTab = () => {
  const { selectedEmployee, refreshEmployeeData } = useEmployeeProfile();
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [contactFormData, setContactFormData] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Reset edit state when selectedEmployee changes
  useEffect(() => {
    if (selectedEmployee) {
      setIsEditingContact(false);
      setContactFormData({});
      setError(null);
      setIsLoading(false);
    }
  }, [selectedEmployee?.id]);

  // Initialize form data when starting to edit
  const startEditing = () => {
    setContactFormData({
      email: selectedEmployee.email || '',
      phone: selectedEmployee.phone || '',
      location: getLocationDisplay(),
      mainOffice: selectedEmployee.mainOffice || getLocationDisplay(),
      timezone: selectedEmployee.timezone || 'EST',
      department: selectedEmployee.department || ''
    });
    setIsEditingContact(true);
    setError(null);
  };

  // Cancel editing
  const cancelEditing = () => {
    setIsEditingContact(false);
    setContactFormData({});
    setError(null);
  };

  // Save contact information
  const saveContactInfo = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const updateData = {
        ...selectedEmployee,
        email: contactFormData.email,
        phone: contactFormData.phone,
        location: contactFormData.location,
        mainOffice: contactFormData.mainOffice,
        timezone: contactFormData.timezone,
        department: contactFormData.department
      };

      const response = await fetch(`http://localhost:7001/api/employees/${selectedEmployee.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error(`Failed to update employee: ${response.statusText}`);
      }

      await response.json();
      
      // Update the employee data in the context immediately
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
  const handleInputChange = (field, value) => {
    setContactFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Early return with error message if no employee data
  if (!selectedEmployee) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg border border-yellow-200 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            <p className="text-gray-600">No employee data available.</p>
          </div>
        </div>
      </div>
    );
  }

  // Safe data extraction with fallbacks
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

  return (
    <div className="space-y-6">
      {/* Contact Information */}
      <div className="bg-white rounded-lg border p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Mail className="w-5 h-5 text-purple-600" />
            Contact Information
          </h3>
          {!isEditingContact && (
            <button
              onClick={startEditing}
              className="flex items-center gap-2 px-3 py-1 text-sm text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left Column */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={contactFormData.email || ''}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                    placeholder="Enter email address"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={contactFormData.phone || ''}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                    placeholder="Enter phone number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Main Office
                  </label>
                  <input
                    type="text"
                    value={contactFormData.mainOffice || ''}
                    onChange={(e) => handleInputChange('mainOffice', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                    placeholder="Enter main office location"
                  />
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={contactFormData.location || ''}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                    placeholder="Enter current location"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Timezone
                  </label>
                  <select
                    value={contactFormData.timezone || 'EST'}
                    onChange={(e) => handleInputChange('timezone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={contactFormData.department || ''}
                    onChange={(e) => handleInputChange('department', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                    placeholder="Enter department"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={saveContactInfo}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
              >
                <Save className="w-4 h-4" />
                {isLoading ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={cancelEditing}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 text-sm font-medium transition-colors"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </div>
        ) : (
          /* Display Mode */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400" />
                <span>{selectedEmployee.email || 'Email not provided'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-400" />
                <span>{selectedEmployee.phone || "+1 (555) 123-4567"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-gray-400" />
                <span>Main Office: {selectedEmployee.mainOffice || getLocationDisplay()}</span>
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span>Location: {getLocationDisplay()}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span>Timezone: {selectedEmployee.timezone || "EST"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-gray-400" />
                <span>Department: {selectedEmployee.department || 'Not specified'}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Skills */}
      <div className="bg-white rounded-lg border p-5 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-purple-600" />
          Skills
        </h3>
        <div className="space-y-4">
          {/* Technical Skills */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Technical Skills</h4>
            <div className="flex flex-wrap gap-2">
              {skills.technical && skills.technical.length > 0 ? (
                skills.technical.map((skill, idx) => (
                  <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
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
            <h4 className="text-sm font-medium text-gray-700 mb-2">Domain Expertise</h4>
            <div className="flex flex-wrap gap-2">
              {skills.domain && skills.domain.length > 0 ? (
                skills.domain.map((skill, idx) => (
                  <span key={idx} className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
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
            <h4 className="text-sm font-medium text-gray-700 mb-2">Methodologies</h4>
            <div className="flex flex-wrap gap-2">
              {skills.methodologies && skills.methodologies.length > 0 ? (
                skills.methodologies.map((methodology, idx) => (
                  <span key={idx} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                    {methodology}
                  </span>
                ))
              ) : (
                <span className="text-gray-500 text-sm">No methodologies data available</span>
              )}
            </div>
          </div>

          {/* Certifications */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Certifications</h4>
            <div className="flex flex-wrap gap-2">
              {skills.certifications && skills.certifications.length > 0 ? (
                skills.certifications.map((cert, idx) => (
                  <span key={idx} className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                    {cert}
                  </span>
                ))
              ) : (
                <span className="text-gray-500 text-sm">No certifications data available</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Languages */}
      <div className="bg-white rounded-lg border p-5 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-purple-600" />
          Languages
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {languages.length > 0 ? (
            languages.map((language, index) => (
              <div key={index} className="space-y-1">
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
            ))
          ) : (
            <div className="col-span-4 text-center text-gray-500 text-sm py-4">
              No languages data available
            </div>
          )}
        </div>
      </div>

      {/* Past Experience */}
      <div className="bg-white rounded-lg border p-5 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-purple-600" />
          Past Experience
        </h3>
        <div className="space-y-6">
          {experiences.length > 0 ? (
            experiences.map((experience, index) => (
              <div key={index} className="relative pl-8 pb-6 border-l-2 border-gray-200 last:border-0 last:pb-0">
                <div className="absolute left-[-8px] top-0 w-4 h-4 bg-purple-100 border-2 border-purple-500 rounded-full"></div>
                <div className="space-y-1">
                  {/* Company first */}
                  <h4 className="font-medium text-gray-900">{experience.company || 'Unknown Company'}</h4>
                  {/* Role + Period second */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{experience.role || 'Unknown Role'}</span>
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">
                      {experience.period || 'Unknown Period'}
                    </span>
                  </div>
                  {/* Description third */}
                  <p className="text-sm text-gray-500">{experience.description || 'No description available'}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-gray-500 text-sm py-4">
              No past experience data available
            </div>
          )}
        </div>
      </div>

      {/* MBTI */}
      <div className="bg-white rounded-lg border p-5 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-600" />
          MBTI Personality
        </h3>
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
      </div>
    </div>
  );
};

export default BasicInfoTab;