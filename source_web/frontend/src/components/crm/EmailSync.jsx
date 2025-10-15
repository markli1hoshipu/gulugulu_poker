import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  Inbox,
  Send,
  Settings,
  X,
  FileText,
  LogIn,
  LogOut,
  Building2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { useAuth } from '../../auth/hooks/useAuth';
import { useCRM } from '../../contexts/CRMContext';

const EmailSync = () => {
  const { authProvider } = useAuth();
  const { CRM_API_BASE_URL } = useCRM();
  
  // State
  const [syncStatus, setSyncStatus] = useState({
    gmail: null,
    outlook: null
  });
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState({
    gmail: false,
    outlook: false
  });
  const [teamSyncing, setTeamSyncing] = useState({
    gmail: false,
    outlook: false
  });
  const [error, setError] = useState(null);
  const [syncProgress, setSyncProgress] = useState(null);
  const [teamSyncProgress, setTeamSyncProgress] = useState(null);
  const [teamSyncJobId, setTeamSyncJobId] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  
  // Removed manager authorization - individual mode only
  
  // Connection state
  const [googleConnected, setGoogleConnected] = useState(false);
  const [outlookConnected, setOutlookConnected] = useState(false);
  const [googleEmail, setGoogleEmail] = useState(null);
  const [outlookEmail, setOutlookEmail] = useState(null);
  
  // Sync settings
  const [syncSettings, setSyncSettings] = useState({
    includeBody: true,
    includeSent: true,
    includeReceived: true
  });

  // Check connection status based on app login tokens
  useEffect(() => {
    const checkConnections = () => {
      // Check Google connection from app login
      const googleToken = localStorage.getItem('google_access_token');
      const googleEmailStored = localStorage.getItem('google_user_email');
      
      console.log('EmailSync Debug:', {
        googleToken: googleToken ? `${googleToken.substring(0, 20)}...` : null,
        googleEmail: googleEmailStored,
        microsoftToken: localStorage.getItem('microsoft_access_token') ? `${localStorage.getItem('microsoft_access_token').substring(0, 20)}...` : null,
        microsoftEmail: localStorage.getItem('microsoft_user_email'),
        authProvider
      });
      
      if (googleToken && googleToken !== 'undefined' && googleToken !== 'null') {
        setGoogleConnected(true);
        setGoogleEmail(googleEmailStored && googleEmailStored !== 'undefined' && googleEmailStored !== 'null' ? googleEmailStored : null);
      } else {
        setGoogleConnected(false);
        setGoogleEmail(null);
      }
      
      // Check Microsoft connection from app login
      const microsoftToken = localStorage.getItem('microsoft_access_token');
      const microsoftEmailStored = localStorage.getItem('microsoft_user_email');
      if (microsoftToken && microsoftToken !== 'undefined' && microsoftToken !== 'null') {
        setOutlookConnected(true);
        setOutlookEmail(microsoftEmailStored && microsoftEmailStored !== 'undefined' && microsoftEmailStored !== 'null' ? microsoftEmailStored : null);
      } else {
        setOutlookConnected(false);
        setOutlookEmail(null);
      }
      
      // Provider-specific logic is now handled by authProvider directly
    };
    
    // Check immediately
    checkConnections();
    
    // Listen for storage changes
    window.addEventListener('storage', checkConnections);
    
    return () => {
      window.removeEventListener('storage', checkConnections);
    };
  }, [authProvider]);

  // Load sync status on mount
  useEffect(() => {
    loadSyncStatus();
  }, []);

  const loadSyncStatus = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const idToken = localStorage.getItem('id_token');
      if (!idToken) {
        console.log('No auth token available');
        return;
      }
      
      // Load Gmail status
      try {
        const gmailResponse = await fetch(`${CRM_API_BASE_URL}/api/crm/gmail/status`, {
          headers: {
            'Authorization': `Bearer ${idToken}`
          }
        });
        
        if (gmailResponse.ok) {
          const data = await gmailResponse.json();
          setSyncStatus(prev => ({ ...prev, gmail: data }));
        }
      } catch (err) {
        console.log('Gmail sync endpoints not available');
      }
      
      // Load Outlook status
      try {
        const outlookResponse = await fetch(`${CRM_API_BASE_URL}/api/crm/outlook/status`, {
          headers: {
            'Authorization': `Bearer ${idToken}`
          }
        });
        
        if (outlookResponse.ok) {
          const data = await outlookResponse.json();
          setSyncStatus(prev => ({ ...prev, outlook: data }));
        }
      } catch (err) {
        console.log('Outlook sync endpoints not available');
      }
      
    } catch (err) {
      console.error('Error loading sync status:', err);
    } finally {
      setLoading(false);
    }
  };


  const syncEmails = async (provider) => {
    setSyncing(prev => ({ ...prev, [provider]: true }));
    setError(null);
    setSyncProgress({ status: 'Starting sync...', percentage: 0 });
    
    try {
      const providerKey = provider === 'gmail' ? 'google' : 'microsoft';
      const accessToken = localStorage.getItem(`${providerKey}_access_token`);
      const userEmail = provider === 'gmail' ? googleEmail : outlookEmail;
      
      console.log(`Syncing ${provider}:`, {
        providerKey,
        hasToken: !!accessToken,
        tokenPreview: accessToken ? `${accessToken.substring(0, 20)}...` : null,
        userEmail,
        authProvider
      });
      
      if (!accessToken || accessToken === 'undefined' || accessToken === 'null') {
        throw new Error(`Please log in with ${provider === 'gmail' ? 'Google' : 'Microsoft'} to enable ${provider} sync.`);
      }
      
      if (!userEmail) {
        throw new Error('Email address not available. Please log in again.');
      }
      
      // Extra validation: Check if we're using the right provider based on actual login
      if (authProvider && authProvider !== providerKey) {
        throw new Error(`You logged in with ${authProvider === 'google' ? 'Google' : 'Microsoft'}, but are trying to sync ${provider}. Please use the correct email provider.`);
      }
      
      const idToken = localStorage.getItem('id_token');
      if (!idToken) {
        throw new Error('Not authenticated. Please log in again.');
      }
      
      const endpoint = provider === 'gmail' ? 'gmail/sync' : 'outlook/sync';
      const response = await fetch(`${CRM_API_BASE_URL}/api/crm/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          access_token: accessToken,
          user_email: userEmail,  // Pass email explicitly
          include_body: syncSettings.includeBody,
          include_sent: syncSettings.includeSent,
          include_received: syncSettings.includeReceived
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setSyncStatus(prev => ({
          ...prev,
          [provider]: {
            last_sync_timestamp: data.last_sync_timestamp,
            total_emails_synced: data.total_emails_synced
          }
        }));
        setSyncProgress({
          status: data.message,
          percentage: 100,
          complete: true
        });
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to sync ${provider} emails`);
      }
    } catch (err) {
      setError(err.message || `Error syncing ${provider} emails`);
      console.error(`Error syncing ${provider} emails:`, err);
    } finally {
      setSyncing(prev => ({ ...prev, [provider]: false }));
      // Clear progress after 3 seconds
      setTimeout(() => setSyncProgress(null), 3000);
    }
  };

  const syncTeamEmails = async (provider) => {
    if (!canSyncTeam) {
      setError('You do not have permission to sync team emails');
      return;
    }

    setTeamSyncing(prev => ({ ...prev, [provider]: true }));
    setError(null);
    setTeamSyncProgress({ status: 'Starting team sync...', percentage: 0 });
    
    try {
      const providerKey = provider === 'gmail' ? 'google' : 'microsoft';
      const accessToken = localStorage.getItem(`${providerKey}_access_token`);
      
      if (!accessToken || accessToken === 'undefined' || accessToken === 'null') {
        throw new Error(`Please log in with ${provider === 'gmail' ? 'Google' : 'Microsoft'} to enable ${provider} team sync.`);
      }
      
      const idToken = localStorage.getItem('id_token');
      if (!idToken) {
        throw new Error('Not authenticated. Please log in again.');
      }
      
      const endpoint = provider === 'gmail' ? 'gmail/sync-team' : 'outlook/sync-team';
      const response = await fetch(`${CRM_API_BASE_URL}/api/crm/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          access_token: accessToken,
          include_body: syncSettings.includeBody,
          include_sent: syncSettings.includeSent,
          include_received: syncSettings.includeReceived
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        const jobId = data.sync_job_id;
        
        setTeamSyncJobId(jobId);
        setTeamSyncProgress({
          status: data.message || 'Team sync started...',
          percentage: 10,
          jobId: jobId,
          employeeCount: data.employee_count || accessibleEmployees.length
        });
        
        // Start monitoring team sync progress
        monitorTeamSyncProgress(provider, jobId);
        
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to start ${provider} team sync`);
      }
    } catch (err) {
      setError(err.message || `Error starting ${provider} team sync`);
      console.error(`Error starting ${provider} team sync:`, err);
      setTeamSyncing(prev => ({ ...prev, [provider]: false }));
      // Clear progress after 3 seconds on error
      setTimeout(() => setTeamSyncProgress(null), 3000);
    }
  };

  const monitorTeamSyncProgress = async (provider, jobId) => {
    const pollInterval = 2000; // Poll every 2 seconds
    const maxPolls = 150; // Max 5 minutes (150 * 2 seconds)
    let pollCount = 0;
    
    const poll = async () => {
      try {
        const idToken = localStorage.getItem('id_token');
        if (!idToken) {
          throw new Error('Authentication token not available');
        }
        
        const endpoint = provider === 'gmail' ? 'gmail/team-status' : 'outlook/team-status';
        const response = await fetch(`${CRM_API_BASE_URL}/api/crm/${endpoint}/${jobId}`, {
          headers: {
            'Authorization': `Bearer ${idToken}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          
          setTeamSyncProgress(prev => ({
            ...prev,
            status: data.status || 'Processing...',
            percentage: Math.min(data.progress_percentage || prev?.percentage || 10, 100),
            processedEmployees: data.processed_employees || 0,
            totalEmployees: data.total_employees || prev?.employeeCount || accessibleEmployees.length,
            currentEmployee: data.current_employee,
            emailsSynced: data.total_emails_synced || 0
          }));
          
          // Check if sync is complete
          if (data.status === 'completed' || data.progress_percentage >= 100) {
            setTeamSyncing(prev => ({ ...prev, [provider]: false }));
            setTeamSyncProgress(prev => ({
              ...prev,
              status: `Team sync completed! Synced ${data.total_emails_synced || 0} emails across ${data.total_employees || accessibleEmployees.length} employees.`,
              percentage: 100,
              complete: true
            }));
            
            // Refresh sync status to show updated totals
            loadSyncStatus();
            
            // Clear progress after 5 seconds
            setTimeout(() => {
              setTeamSyncProgress(null);
              setTeamSyncJobId(null);
            }, 5000);
            return;
          }
          
          // Check if sync failed
          if (data.status === 'failed' || data.status === 'error') {
            throw new Error(data.error_message || 'Team sync failed');
          }
          
          // Continue polling if still in progress
          if (pollCount < maxPolls && (teamSyncing.gmail || teamSyncing.outlook)) {
            pollCount++;
            setTimeout(poll, pollInterval);
          } else if (pollCount >= maxPolls) {
            throw new Error('Team sync monitoring timed out');
          }
          
        } else {
          throw new Error(`Failed to get sync status: ${response.status}`);
        }
        
      } catch (err) {
        console.error('Error monitoring team sync progress:', err);
        setError(err.message || 'Error monitoring team sync progress');
        setTeamSyncing(prev => ({ ...prev, [provider]: false }));
        // Clear progress after 3 seconds on error
        setTimeout(() => {
          setTeamSyncProgress(null);
          setTeamSyncJobId(null);
        }, 3000);
      }
    };
    
    // Start polling
    setTimeout(poll, pollInterval);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString();
  };

  // Check if current auth provider is properly connected
  const isConnected = authProvider && (
    (authProvider === 'google' && googleConnected) ||
    (authProvider === 'microsoft' && outlookConnected)
  );

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Email Integration
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              className="text-gray-500 hover:text-gray-700"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-purple-600" />
          </div>
        ) : (
          <>
            {/* Email Account Status - Show only current provider */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Email Account</span>
                <span className="text-sm font-medium flex items-center gap-2">
                  {authProvider && ((authProvider === 'google' && googleConnected) || (authProvider === 'microsoft' && outlookConnected)) ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      {authProvider === 'google' ? (googleEmail || 'Connected') : (outlookEmail || 'Connected')}
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-yellow-500" />
                      {authProvider ? `${authProvider === 'google' ? 'Gmail' : 'Outlook'} not connected` : 'Not connected'}
                    </>
                  )}
                </span>
              </div>

              {/* Manager Status */}
              {authorizationLoading ? (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Account Type</span>
                  <span className="text-sm font-medium flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
                    Checking permissions...
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Account Type</span>
                  <span className="text-sm font-medium flex items-center gap-2">
                    {isManager ? (
                      <>
                        <Building2 className="w-4 h-4 text-blue-500" />
                        Manager ({accessibleEmployees.length} employees)
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4 text-gray-500" />
                        Employee
                      </>
                    )}
                  </span>
                </div>
              )}
              
              {authProvider && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Last Sync</span>
                    <span className="text-sm font-medium flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      {formatDate(authProvider === 'google' ? syncStatus.gmail?.last_sync_timestamp : syncStatus.outlook?.last_sync_timestamp)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Total Emails Synced</span>
                    <span className="text-sm font-medium">
                      {(authProvider === 'google' ? syncStatus.gmail?.total_emails_synced : syncStatus.outlook?.total_emails_synced) || 0}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Settings Panel */}
            <AnimatePresence>
              {showSettings && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-blue-50 rounded-lg p-4 space-y-3"
                >
                  <h4 className="font-medium text-sm text-gray-700 mb-2">Sync Settings</h4>
                  
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={syncSettings.includeSent}
                      onChange={(e) => setSyncSettings({
                        ...syncSettings,
                        includeSent: e.target.checked
                      })}
                      className="rounded text-purple-600"
                    />
                    <Send className="w-4 h-4 text-gray-500" />
                    Include sent emails
                  </label>
                  
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={syncSettings.includeReceived}
                      onChange={(e) => setSyncSettings({
                        ...syncSettings,
                        includeReceived: e.target.checked
                      })}
                      className="rounded text-purple-600"
                    />
                    <Inbox className="w-4 h-4 text-gray-500" />
                    Include received emails
                  </label>
                  
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={syncSettings.includeBody}
                      onChange={(e) => setSyncSettings({
                        ...syncSettings,
                        includeBody: e.target.checked
                      })}
                      className="rounded text-purple-600"
                    />
                    <FileText className="w-4 h-4 text-gray-500" />
                    Include email body
                  </label>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Individual Sync Progress */}
            <AnimatePresence>
              {syncProgress && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`rounded-lg p-4 ${
                    syncProgress.complete ? 'bg-green-50' : 'bg-blue-50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {syncProgress.complete ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
                    )}
                    <span className={`text-sm font-medium ${
                      syncProgress.complete ? 'text-green-700' : 'text-blue-700'
                    }`}>
                      Individual Sync: {syncProgress.status}
                    </span>
                  </div>
                  {!syncProgress.complete && (
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <motion.div
                        className="bg-blue-600 h-2 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${syncProgress.percentage}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Team Sync Progress */}
            <AnimatePresence>
              {teamSyncProgress && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`rounded-lg p-4 ${
                    teamSyncProgress.complete ? 'bg-green-50' : 'bg-purple-50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {teamSyncProgress.complete ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <Building2 className="w-4 h-4 text-purple-600" />
                    )}
                    <span className={`text-sm font-medium ${
                      teamSyncProgress.complete ? 'text-green-700' : 'text-purple-700'
                    }`}>
                      Team Sync: {teamSyncProgress.status}
                    </span>
                  </div>
                  
                  {/* Progress Bar */}
                  {!teamSyncProgress.complete && (
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <motion.div
                        className="bg-purple-600 h-2 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${teamSyncProgress.percentage}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  )}
                  
                  {/* Detailed Progress Info */}
                  {(teamSyncProgress.processedEmployees !== undefined || teamSyncProgress.currentEmployee) && (
                    <div className="mt-2 space-y-1 text-xs text-gray-600">
                      {teamSyncProgress.processedEmployees !== undefined && teamSyncProgress.totalEmployees && (
                        <div className="flex justify-between">
                          <span>Employees:</span>
                          <span>{teamSyncProgress.processedEmployees}/{teamSyncProgress.totalEmployees}</span>
                        </div>
                      )}
                      {teamSyncProgress.currentEmployee && (
                        <div className="flex justify-between">
                          <span>Current:</span>
                          <span className="truncate ml-2">{teamSyncProgress.currentEmployee}</span>
                        </div>
                      )}
                      {teamSyncProgress.emailsSynced !== undefined && (
                        <div className="flex justify-between">
                          <span>Emails synced:</span>
                          <span>{teamSyncProgress.emailsSynced}</span>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 text-red-700 p-3 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">{error}</span>
                <button
                  onClick={() => setError(null)}
                  className="ml-auto text-red-500 hover:text-red-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Load Emails Button - Individual Mode */}
            {isConnected && authProvider ? (
              <div className="space-y-3">
                <Button
                  onClick={() => syncEmails(authProvider === 'google' ? 'gmail' : 'outlook')}
                  disabled={syncing.gmail || syncing.outlook || (!syncSettings.includeSent && !syncSettings.includeReceived)}
                  className={`w-full text-white ${authProvider === 'google' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  {(syncing.gmail || syncing.outlook) ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Loading Emails...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      Load Emails
                    </>
                  )}
                </Button>
              </div>
            ) : isConnected ? (
              <div className="text-center py-4">
                <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    Cannot determine email provider. Please log out and log in again.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    Please log in with Google or Microsoft to enable email sync.
                  </p>
                </div>
                <Button
                  onClick={() => window.location.href = '/login'}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Go to Login
                </Button>
              </div>
            )}

            {/* Info Text */}
            <p className="text-xs text-gray-500 text-center">
              {isConnected ? (
                <>
                  This will load new emails with your customers since the last sync.
                  {!(authProvider === 'google' ? syncStatus.gmail?.last_sync_timestamp : syncStatus.outlook?.last_sync_timestamp) && ' First sync will load emails from the last 30 days.'}
                </>
              ) : (
                'Email sync uses your login credentials to access your email account securely.'
              )}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default EmailSync;