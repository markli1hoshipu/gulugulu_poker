import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import UnifiedHeader from '../common/header/UnifiedHeader';
import { useAuth } from '../../auth/hooks/useAuth';
import { invitationsApi } from '../../services/invitationsApi';
import PlatformTutorial from '../tutorial/PlatformTutorial';
import TutorialSelector from '../tutorial/TutorialSelector';
import {
  Users,
  UserPlus,
  Mail,
  Building2,
  Shield,
  Database,
  AlertCircle,
  Loader2,
  RefreshCw,
  UserCog,
  GraduationCap,
  CheckCircle,
  XCircle,
  BookOpen,
  PlayCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

const UserOnboardingPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('team-organization');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [invitations, setInvitations] = useState([]);
  const [userNotFound, setUserNotFound] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    role: 'viewer',
    level: 1
  });
  const [submitting, setSubmitting] = useState(false);

  // Onboarding state
  const [checklistLoading, setChecklistLoading] = useState(false);
  const [tableChecklist, setTableChecklist] = useState(null);

  // Tutorial state
  const [tutorialSelectorOpen, setTutorialSelectorOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [selectedTutorial, setSelectedTutorial] = useState('dashboard');

  // Role options with descriptions
  const roleOptions = [
    { value: 'admin', label: 'Admin', description: 'Full system access', minLevel: 7 },
    { value: 'manager', label: 'Manager', description: 'Team and data management', minLevel: 5 },
    { value: 'user', label: 'User', description: 'Standard access', minLevel: 3 },
    { value: 'viewer', label: 'Viewer', description: 'Read-only access', minLevel: 1 }
  ];

  // Level options (1-10)
  const levelOptions = Array.from({ length: 10 }, (_, i) => i + 1);

  // Tab configuration
  const tabs = [
    { id: 'team-organization', label: 'Team Organization', icon: Users },
    { id: 'personal-onboarding', label: 'Personal Onboarding', icon: GraduationCap }
  ];

  // Fetch current user's invitations on mount
  useEffect(() => {
    fetchUserInvitations();
  }, [user]);

  // Fetch table checklist when Personal Onboarding tab is active
  useEffect(() => {
    if (activeTab === 'personal-onboarding') {
      fetchTableChecklist();
    }
  }, [activeTab]);

  const fetchUserInvitations = async () => {
    if (!user?.email) return;

    setLoading(true);
    setUserNotFound(false);

    try {
      const data = await invitationsApi.getUserInvitations(user.email);
      const invitations = data.invitations || [];

      if (invitations && invitations.length > 0) {
        setInvitations(invitations);
        setUserNotFound(false);
      } else {
        setInvitations([]);
        setUserNotFound(true);
      }
    } catch (error) {
      console.error('Error fetching invitations:', error);
      setUserNotFound(true);
      toast.error('Failed to fetch invitation data');
    } finally {
      setLoading(false);
    }
  };

  const fetchTableChecklist = async () => {
    setChecklistLoading(true);

    try {
      const data = await invitationsApi.getTableChecklist();
      setTableChecklist(data);
    } catch (error) {
      console.error('Error fetching table checklist:', error);
      toast.error('Failed to load database table checklist');
    } finally {
      setChecklistLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchUserInvitations();
    setRefreshing(false);
    toast.success('Invitations refreshed');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'level' ? parseInt(value) : value
    }));
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateEmail(formData.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (formData.email === user?.email) {
      toast.error('You cannot invite yourself');
      return;
    }

    const existingInvitation = invitations.find(inv => inv.email === formData.email);
    if (existingInvitation) {
      toast.error('This email has already been invited');
      return;
    }

    setSubmitting(true);

    try {
      const currentUserInvitation = invitations.find(inv => inv.email === user?.email) || {};

      const invitationData = {
        email: formData.email,
        company: currentUserInvitation.company || user?.company || 'prelude',
        role: formData.role,
        database_name: currentUserInvitation.database_name || 'postgres',
        level: formData.level
      };

      const result = await invitationsApi.createInvitation(invitationData);

      if (result.success) {
        toast.success(`Successfully invited ${formData.email}`);
        setFormData({ email: '', role: 'viewer', level: 1 });
        await fetchUserInvitations();
      } else {
        toast.error(result.message || 'Failed to create invitation');
      }
    } catch (error) {
      console.error('Error creating invitation:', error);
      toast.error(error.message || 'Failed to send invitation');
    } finally {
      setSubmitting(false);
    }
  };

  const currentUserInfo = invitations.find(inv => inv.email === user?.email) || {};

  // Tutorial handlers
  const handleOpenTutorialSelector = () => {
    setTutorialSelectorOpen(true);
  };

  const handleSelectTutorial = (tutorialType) => {
    setSelectedTutorial(tutorialType);
    setTutorialOpen(true);
    toast.success(`${tutorialType} tutorial started! Follow the spotlight to continue.`);
  };

  const handleTutorialNavigate = (viewId) => {
    // For now, we're on the User Onboarding page
    // In a full implementation, this would navigate to different dashboard views
    // Since we're in a separate page, we'll just show a message
    console.log(`Tutorial requesting navigation to: ${viewId}`);
    // You could implement actual navigation here if needed
  };

  const renderTeamOrganization = () => (
    <div className="space-y-6">
      {/* Current User Info Card */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-teal-600" />
            <h3 className="text-lg font-semibold text-gray-900">Your Account Information</h3>
          </div>
        </div>
        <div className="px-6 py-5">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : userNotFound ? (
            <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-yellow-800">
                  Your account information was not found in the database.
                </p>
                <p className="text-xs text-yellow-600 mt-1">
                  Please contact your administrator to be added to the system.
                </p>
              </div>
            </div>
          ) : currentUserInfo.email ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Email</p>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <p className="text-sm font-medium text-gray-900">{currentUserInfo.email}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Company</p>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-gray-400" />
                  <p className="text-sm font-medium text-gray-900">{currentUserInfo.company}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Role</p>
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-gray-400" />
                  <p className="text-sm font-medium text-gray-900">{currentUserInfo.role}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Access Level</p>
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-gray-400" />
                  <p className="text-sm font-medium text-gray-900">Level {currentUserInfo.level}</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Loading your account information...</p>
          )}
        </div>
      </div>

      {/* Invitation Form Card */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-teal-600" />
            <h3 className="text-lg font-semibold text-gray-900">Invite New Team Member</h3>
          </div>
        </div>
        <div className="px-6 py-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="colleague@company.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  disabled={submitting || userNotFound}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                  Role *
                </label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  disabled={submitting || userNotFound}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  {roleOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {roleOptions.find(r => r.value === formData.role)?.description}
                </p>
              </div>

              <div>
                <label htmlFor="level" className="block text-sm font-medium text-gray-700 mb-1">
                  Access Level (1-10) *
                </label>
                <select
                  id="level"
                  name="level"
                  value={formData.level}
                  onChange={handleInputChange}
                  disabled={submitting || userNotFound}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  {levelOptions.map(level => (
                    <option key={level} value={level}>
                      Level {level}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Higher levels have more permissions
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                The new member will join <strong className="text-gray-900">{currentUserInfo.company || 'your company'}</strong> with access to <strong className="text-gray-900">{currentUserInfo.database_name || 'the database'}</strong>
              </p>
              <button
                type="submit"
                disabled={submitting || userNotFound}
                className="inline-flex items-center justify-center px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Invite Member
                  </>
                )}
              </button>
            </div>

            {userNotFound && (
              <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-800">
                  You must be registered in the system to send invitations.
                </p>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Team Members List Card */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-teal-600" />
              <h3 className="text-lg font-semibold text-gray-900">Team Members ({invitations.length})</h3>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
        <div className="px-6 py-5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : invitations.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="pb-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="pb-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                    <th className="pb-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="pb-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Level</th>
                    <th className="pb-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Database</th>
                    <th className="pb-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invitations.map((invitation, index) => (
                    <tr key={invitation.id || index} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-900">{invitation.email}</span>
                          {invitation.email === user?.email && (
                            <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded font-medium">You</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 text-sm text-gray-700">{invitation.company}</td>
                      <td className="py-3">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          invitation.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                          invitation.role === 'manager' ? 'bg-blue-100 text-blue-700' :
                          invitation.role === 'user' ? 'bg-green-100 text-green-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {invitation.role}
                        </span>
                      </td>
                      <td className="py-3 text-sm font-medium text-gray-900">{invitation.level}</td>
                      <td className="py-3 text-sm text-gray-700">{invitation.database_name}</td>
                      <td className="py-3 text-sm text-gray-500">
                        {invitation.created_at ?
                          new Date(invitation.created_at).toLocaleDateString() :
                          'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-600 font-medium">No team members found</p>
              <p className="text-sm text-gray-500 mt-1">Start by inviting your first team member above</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderPersonalOnboarding = () => (
    <div className="space-y-6">
      {/* Platform Tutorial Card */}
      <div className="bg-gradient-to-r from-teal-500 to-cyan-500 rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4 flex-1">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <BookOpen className="h-8 w-8 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-2">
                  New to Prelude Platform?
                </h3>
                <p className="text-white/90 text-sm mb-3">
                  Take interactive tutorials to learn specific features! Choose from Dashboard & Navigation, Lead Generation, CRM, Sales Center, or User Onboarding tutorials.
                </p>
                <div className="flex flex-wrap items-center gap-2 text-xs text-white/80">
                  <span className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    5 tutorial modules
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Spotlight guidance
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Interactive learning
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={handleOpenTutorialSelector}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white hover:bg-gray-50 text-teal-600 font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl hover:scale-105 flex-shrink-0"
            >
              <PlayCircle className="h-5 w-5" />
              Choose Tutorial
            </button>
          </div>
        </div>
      </div>

      {/* Database Setup Progress Card */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-teal-600" />
              <h3 className="text-lg font-semibold text-gray-900">Database Setup Progress</h3>
            </div>
            <button
              onClick={fetchTableChecklist}
              disabled={checklistLoading}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`h-4 w-4 ${checklistLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        <div className="px-6 py-5">
          {checklistLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              <span className="ml-3 text-gray-600">Loading table checklist...</span>
            </div>
          ) : tableChecklist ? (
            <div className="space-y-6">
              {/* Progress Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-lg border border-teal-100">
                  <p className="text-xs font-medium text-teal-600 mb-1">Total Tables</p>
                  <p className="text-2xl font-bold text-teal-900">{tableChecklist.total_tables}</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-100">
                  <p className="text-xs font-medium text-green-600 mb-1">Existing Tables</p>
                  <p className="text-2xl font-bold text-green-900">{tableChecklist.existing_tables}</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-red-50 to-rose-50 rounded-lg border border-red-100">
                  <p className="text-xs font-medium text-red-600 mb-1">Missing Tables</p>
                  <p className="text-2xl font-bold text-red-900">{tableChecklist.missing_tables}</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                  <p className="text-xs font-medium text-blue-600 mb-1">Completion</p>
                  <p className="text-2xl font-bold text-blue-900">{tableChecklist.completion_percentage}%</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-700">Database Initialization</span>
                  <span className="text-gray-600">{tableChecklist.existing_tables} of {tableChecklist.total_tables} tables</span>
                </div>
                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 transition-all duration-500"
                    style={{ width: `${tableChecklist.completion_percentage}%` }}
                  />
                </div>
              </div>

              {/* Table Checklist */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Table Status Checklist</h4>
                <div className="max-h-[500px] overflow-y-auto border border-gray-200 rounded-lg">
                  <div className="divide-y divide-gray-100">
                    {tableChecklist.checklist.map((table, index) => (
                      <div
                        key={table.table_name}
                        className={`px-4 py-3 hover:bg-gray-50 transition-colors ${
                          table.exists ? 'bg-white' : 'bg-red-50/30'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-0.5">
                            {table.exists ? (
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-600" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <code className={`text-sm font-mono font-medium ${
                                table.exists ? 'text-gray-900' : 'text-red-900'
                              }`}>
                                {table.table_name}
                              </code>
                              {table.exists ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                                  Ready
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                                  Missing
                                </span>
                              )}
                            </div>
                            <p className={`text-xs mt-1 ${
                              table.exists ? 'text-gray-600' : 'text-red-600'
                            }`}>
                              {table.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Completion Message */}
              {tableChecklist.completion_percentage === 100 ? (
                <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-green-900">
                      Database Setup Complete!
                    </p>
                    <p className="text-xs text-green-700 mt-1">
                      All required tables have been initialized successfully.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-yellow-900">
                      Database Setup In Progress
                    </p>
                    <p className="text-xs text-yellow-700 mt-1">
                      {tableChecklist.missing_tables} table{tableChecklist.missing_tables !== 1 ? 's' : ''} still need to be created. Please contact your administrator if this persists.
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <Database className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-600 font-medium">No checklist data available</p>
              <p className="text-sm text-gray-500 mt-1">Click refresh to load the database status</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'team-organization':
        return renderTeamOrganization();
      case 'personal-onboarding':
        return renderPersonalOnboarding();
      default:
        return renderTeamOrganization();
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header with Tabs */}
      <UnifiedHeader
        title="User Onboarding"
        themeColor="teal"
        tabs={tabs.map(tab => ({
          id: tab.id,
          label: tab.label,
          icon: tab.icon,
          isActive: activeTab === tab.id,
          onClick: () => setActiveTab(tab.id)
        }))}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full p-6 overflow-y-auto bg-gray-50">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {renderTabContent()}
          </motion.div>
        </div>
      </div>

      {/* Tutorial Selector */}
      <TutorialSelector
        isOpen={tutorialSelectorOpen}
        onClose={() => setTutorialSelectorOpen(false)}
        onSelectTutorial={handleSelectTutorial}
      />

      {/* Platform Tutorial */}
      <PlatformTutorial
        isOpen={tutorialOpen}
        onClose={() => setTutorialOpen(false)}
        tutorialType={selectedTutorial}
        onNavigate={handleTutorialNavigate}
      />
    </div>
  );
};

export default UserOnboardingPage;
