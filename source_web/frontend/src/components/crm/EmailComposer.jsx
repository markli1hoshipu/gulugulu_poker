import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Mail,
  Send,
  Sparkles,
  User,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertCircle,
  X,
  Copy,
  Edit3,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Alert } from '../ui/alert';
import { useAuth } from '../../auth/hooks/useAuth';

const EmailComposer = ({ customer, onClose, onEmailSent }) => {
  const { authFetch } = useAuth();
  const CRM_API_BASE_URL = import.meta.env.VITE_CRM_API_URL || 'http://localhost:8003';
  const [emailType, setEmailType] = useState('followup');
  const [customMessage, setCustomMessage] = useState('');
  const [generatedEmail, setGeneratedEmail] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [templates, setTemplates] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [editedSubject, setEditedSubject] = useState('');
  const [editedBody, setEditedBody] = useState('');

  useEffect(() => {
    fetchEmailTemplates();
  }, []);

  const fetchEmailTemplates = async () => {
    try {
      const response = await authFetch(`${CRM_API_BASE_URL}/api/crm/email-templates`);
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (err) {
      console.error('Error fetching templates:', err);
    }
  };

  const generateEmail = async () => {
    try {
      setIsGenerating(true);
      setError('');

      const response = await authFetch(`${CRM_API_BASE_URL}/api/crm/generate-custom-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer_id: customer.id,
          email_type: emailType,
          custom_message: customMessage,
          recipient_email: customer.email,
          recipient_name: customer.primaryContact || customer.company
        })
      });

      const data = await response.json();
      if (response.ok) {
        setGeneratedEmail(data.email_data);
        setEditedSubject(data.email_data.subject);
        setEditedBody(data.email_data.body);
      } else {
        setError('Failed to generate email');
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Error connecting to server');
    } finally {
      setIsGenerating(false);
    }
  };

  const sendEmail = async () => {
    console.log('🚀🚀🚀 SEND EMAIL FUNCTION CALLED 🚀🚀🚀');
    console.log('=== SEND EMAIL CLICKED ===');
    console.log('generatedEmail:', generatedEmail);

    if (!generatedEmail) {
      console.error('No generated email - cannot send');
      setError('No email to send. Please generate an email first.');
      return;
    }

    try {
      setIsSending(true);
      setError('');

      // Get access token if available
      const authProvider = localStorage.getItem('auth_provider');
      const accessToken = authProvider === 'google'
        ? localStorage.getItem('google_access_token')
        : null;

      const emailData = editMode ? {
        to_email: generatedEmail.to,
        subject: editedSubject,
        body: editedBody,
        customer_id: customer.id,
        provider: authProvider === 'google' ? 'gmail' : null,
        access_token: accessToken
      } : {
        to_email: generatedEmail.to,
        subject: generatedEmail.subject,
        body: generatedEmail.body,
        customer_id: customer.id,
        provider: authProvider === 'google' ? 'gmail' : null,
        access_token: accessToken
      };

      console.log('Sending email with data:', {
        to_email: emailData.to_email,
        subject: emailData.subject,
        customer_id: emailData.customer_id,
        provider: emailData.provider,
        has_access_token: !!emailData.access_token
      });

      const response = await authFetch(`${CRM_API_BASE_URL}/api/crm/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData)
      });

      console.log('Send email response status:', response.status);
      const data = await response.json();
      console.log('Send email response data:', data);

      if (response.ok) {
        setSuccess(`Email sent successfully to ${data.sent_to}`);
        if (onEmailSent) {
          onEmailSent(data);
        }
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        console.error('Send email failed:', data);
        setError(data.detail || 'Failed to send email');
      }
    } catch (err) {
      console.error('Error sending email:', err);
      setError(`Error sending email: ${err.message}`);
    } finally {
      setIsSending(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setSuccess('Copied to clipboard!');
    setTimeout(() => setSuccess(''), 2000);
  };

  const openInGmail = () => {
    if (!generatedEmail) return;

    const subject = editMode ? editedSubject : generatedEmail.subject;
    const body = editMode ? editedBody : generatedEmail.body;
    const to = generatedEmail.to;

    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(gmailUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <Mail className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Email Composer</h2>
              <p className="text-sm text-gray-600">
                Compose email for {customer.company} ({customer.primaryContact})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex flex-col lg:flex-row max-h-[calc(90vh-80px)]">
          {/* Left Panel - Email Generation */}
          <div className="lg:w-1/3 p-6 border-r border-gray-200">
            <div className="space-y-6">
              {/* Email Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Email Type
                </label>
                <div className="space-y-2">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => setEmailType(template.id)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        emailType === template.id
                          ? 'border-purple-500 bg-purple-50 text-purple-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium">{template.name}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {template.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Message (Optional)
                </label>
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Add any custom message or specific details..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                  rows={4}
                />
              </div>

              {/* Generate Button */}
              <Button
                onClick={generateEmail}
                disabled={isGenerating}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Email
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Right Panel - Email Preview */}
          <div className="lg:w-2/3 flex flex-col">
            <div className="p-6 flex-1 overflow-y-auto">
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </Alert>
              )}

              {success && (
                <Alert className="mb-4 border-green-200 bg-green-50">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-green-800">{success}</span>
                </Alert>
              )}

              {generatedEmail ? (
                <div className="space-y-4">
                  {/* Email Actions */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Email Preview</h3>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditMode(!editMode)}
                      >
                        <Edit3 className="w-4 h-4 mr-1" />
                        {editMode ? 'View' : 'Edit'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(editMode ? editedBody : generatedEmail.body)}
                      >
                        <Copy className="w-4 h-4 mr-1" />
                        Copy
                      </Button>
                    </div>
                  </div>

                  {/* Email Content */}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <User className="w-4 h-4" />
                          <span>To: {generatedEmail.to}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <MessageSquare className="w-4 h-4" />
                          <span>Type: {generatedEmail.type}</span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {editMode ? (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Subject
                            </label>
                            <input
                              type="text"
                              value={editedSubject}
                              onChange={(e) => setEditedSubject(e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Body
                            </label>
                            <textarea
                              value={editedBody}
                              onChange={(e) => setEditedBody(e.target.value)}
                              className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                              rows={12}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div>
                            <div className="text-sm font-medium text-gray-700 mb-1">Subject:</div>
                            <div className="font-semibold">{generatedEmail.subject}</div>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-700 mb-2">Message:</div>
                            <div className="bg-gray-50 p-4 rounded-lg">
                              <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
                                {generatedEmail.body}
                              </pre>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Mail className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Generate Your Email
                  </h3>
                  <p className="text-gray-600">
                    Select an email type and click "Generate Email" to create a personalized message.
                  </p>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            {generatedEmail && (
              <div className="p-6 border-t bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      onClick={openInGmail}
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Open in Gmail
                    </Button>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      onClick={onClose}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('🔴🔴🔴 SEND BUTTON CLICKED 🔴🔴🔴');
                        console.log('BUTTON CLICKED - calling sendEmail');
                        sendEmail();
                      }}
                      disabled={isSending}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {isSending ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Send Email
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default EmailComposer;