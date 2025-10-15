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
  LogOut
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { useAuth } from '../../auth/hooks/useAuth';
import { useCRM } from '../../contexts/CRMContext';
import { useGoogleApi } from '../../hooks/useGoogleApi';

const GmailSync = () => {
  const { authFetch, user } = useAuth();
  const { CRM_API_BASE_URL } = useCRM();
  const { areScriptsLoaded } = useGoogleApi();
  
  // State
  const [syncStatus, setSyncStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [syncProgress, setSyncProgress] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [googleEmail, setGoogleEmail] = useState(null);
  
  // Sync settings
  const [syncSettings, setSyncSettings] = useState({
    includeBody: true,  // Changed to true to include email body by default
    includeSent: true,
    includeReceived: true
  });

  // Google OAuth configuration
  const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const SCOPES = 'https://www.googleapis.com/auth/gmail.readonly';

  // Check Google connection status on mount and when localStorage changes
  useEffect(() => {
    const checkGoogleConnection = () => {
      const token = localStorage.getItem('google_calendar_access_token');
      const email = localStorage.getItem('google_calendar_user_email');
      if (token && token !== 'undefined') {
        setIsGoogleConnected(true);
        setGoogleEmail(email && email !== 'undefined' ? email : null);
      } else {
        setIsGoogleConnected(false);
        setGoogleEmail(null);
      }
    };
    
    // Check immediately
    checkGoogleConnection();
    
    // Listen for storage changes (in case calendar login happens in another tab)
    window.addEventListener('storage', checkGoogleConnection);
    
    return () => {
      window.removeEventListener('storage', checkGoogleConnection);
    };
  }, []);

  // Load sync status on mount
  useEffect(() => {
    loadSyncStatus();
  }, []);

  const loadSyncStatus = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Use regular fetch to avoid auth issues
      const idToken = localStorage.getItem('id_token');
      if (!idToken) {
        console.log('No auth token available');
        return;
      }
      
      const response = await fetch(`${CRM_API_BASE_URL}/api/crm/gmail/status`, {
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSyncStatus(data);
      } else if (response.status === 404) {
        // Gmail sync endpoints not available yet - server may need restart
        console.log('Gmail sync endpoints not available. Server may need restart to register new routes.');
        setError(null); // Don't show error for 404, just show no sync status
      } else {
        console.log('Failed to load sync status:', response.status);
      }
    } catch (err) {
      console.error('Error loading sync status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = useCallback(() => {
    if (!areScriptsLoaded || !window.google) {
      setError('Google API not loaded. Please refresh the page.');
      return;
    }

    try {
      // Use Google Identity Services OAuth2 flow specifically for Gmail
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (response) => {
          if (response.access_token) {
            // Save the token
            localStorage.setItem('google_calendar_access_token', response.access_token);
            setIsGoogleConnected(true);
            
            // Get user info
            fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${response.access_token}`)
              .then(res => res.json())
              .then(userInfo => {
                localStorage.setItem('google_calendar_user_email', userInfo.email);
                setGoogleEmail(userInfo.email);
                // Clear any existing error
                setError(null);
                // Trigger initial sync after successful connection
                syncEmails();
              })
              .catch(error => {
                console.error('Error getting user info:', error);
                setIsGoogleConnected(true); // Still connected even if we couldn't get user info
              });
          } else {
            setError('Failed to get access token. Please try again.');
          }
        },
        error_callback: (error) => {
          console.error('OAuth2 error:', error);
          setError('Failed to connect to Gmail. Please allow popups and try again.');
        }
      });
      
      tokenClient.requestAccessToken();
    } catch (error) {
      console.error('Error starting Gmail connection:', error);
      setError('Failed to start Gmail connection. Please try again.');
    }
  }, [areScriptsLoaded, CLIENT_ID, SCOPES]);

  const handleGoogleSignout = useCallback(() => {
    try {
      const accessToken = localStorage.getItem('google_calendar_access_token');
      
      // Revoke the access token if possible
      if (accessToken && window.google?.accounts?.oauth2?.revoke) {
        window.google.accounts.oauth2.revoke(accessToken);
      }
      
      // Clear Gmail-related tokens and state
      localStorage.removeItem('google_calendar_access_token');
      localStorage.removeItem('google_calendar_user_email');
      
      // Update state
      setIsGoogleConnected(false);
      setGoogleEmail(null);
      setError(null);
      setSyncStatus(null);
      
      // Reset sync settings to defaults
      setSyncSettings({
        includeBody: true,
        includeSent: true,
        includeReceived: true
      });
    } catch (error) {
      console.error('Error signing out:', error);
      // Still clear the state even if revocation fails
      localStorage.removeItem('google_calendar_access_token');
      localStorage.removeItem('google_calendar_user_email');
      setIsGoogleConnected(false);
      setGoogleEmail(null);
    }
  }, []);

  const syncEmails = async () => {
    setSyncing(true);
    setError(null);
    setSyncProgress({ status: 'Starting sync...', percentage: 0 });
    
    try {
      // Gmail sync requires Google Calendar to be connected first
      // The calendar integration provides the necessary Gmail access
      const accessToken = localStorage.getItem('google_calendar_access_token');
      
      if (!accessToken) {
        throw new Error('Please go to Calendar & Scheduling tab to connect to Gmail.');
      }
      
      // Use regular fetch instead of authFetch to avoid automatic logout on 401
      const idToken = localStorage.getItem('id_token');
      if (!idToken) {
        throw new Error('Not authenticated. Please log in again.');
      }
      
      const response = await fetch(`${CRM_API_BASE_URL}/api/crm/gmail/sync`, {
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
        setSyncStatus({
          last_sync_timestamp: data.last_sync_timestamp,
          total_emails_synced: data.total_emails_synced
        });
        setSyncProgress({
          status: data.message,
          percentage: 100,
          complete: true
        });
      } else {
        if (response.status === 404) {
          setError('Gmail sync endpoints not found. Please restart the CRM service.');
        } else if (response.status === 401) {
          // Check if it's an auth issue or endpoint issue
          const idToken = localStorage.getItem('id_token');
          if (!idToken) {
            setError('Not authenticated. Please log in again.');
          } else {
            setError('Authentication failed. The Gmail sync feature may not be properly configured.');
          }
        } else if (response.status === 500) {
          setError('Server error. Please check CRM service logs for details.');
        } else {
          try {
            const data = await response.json();
            setError(data.detail || 'Failed to sync emails');
          } catch {
            setError('Failed to sync emails');
          }
        }
      }
    } catch (err) {
      setError(err.message || 'Error syncing emails');
      console.error('Error syncing emails:', err);
    } finally {
      setSyncing(false);
      // Clear progress after 3 seconds
      setTimeout(() => setSyncProgress(null), 3000);
    }
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

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Email Integration
          </CardTitle>
          <div className="flex items-center gap-2">
            {isGoogleConnected && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGoogleSignout}
                className="text-gray-500 hover:text-gray-700"
                title="Sign out of Gmail"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            )}
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
            {/* Status Display */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Gmail Account</span>
                <span className="text-sm font-medium flex items-center gap-2">
                  {isGoogleConnected ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      {googleEmail && googleEmail !== 'undefined' ? googleEmail : (user?.email || 'Connected')}
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-yellow-500" />
                      Not connected
                    </>
                  )}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Last Sync</span>
                <span className="text-sm font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  {formatDate(syncStatus?.last_sync_timestamp)}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Emails Synced</span>
                <span className="text-sm font-medium">
                  {syncStatus?.total_emails_synced || 0}
                </span>
              </div>
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
                    Include email body (subject only if unchecked)
                  </label>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Sync Progress */}
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
                      {syncProgress.status}
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

            {/* Sync Button or Connect Button */}
            {isGoogleConnected ? (
              <Button
                onClick={syncEmails}
                disabled={syncing || (!syncSettings.includeSent && !syncSettings.includeReceived)}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white"
              >
                {syncing ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Syncing Emails...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Load New Emails
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={handleGoogleLogin}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                disabled={!areScriptsLoaded}
              >
                <LogIn className="w-4 h-4 mr-2" />
                Connect to Gmail
              </Button>
            )}

            {/* Info Text */}
            <p className="text-xs text-gray-500 text-center">
              {isGoogleConnected ? (
                <>
                  This will load new emails with your customers since the last sync.
                  {!syncStatus?.last_sync_timestamp && ' First sync will load emails from the last 90 days.'}
                </>
              ) : (
                'Click "Connect to Gmail" to start syncing emails with your customers.'
              )}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default GmailSync;