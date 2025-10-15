import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Mail,
  Sparkles,
  Copy,
  Send,
  X,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Edit3
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Alert } from '../ui/alert';
import { useAuth } from '../../auth/hooks/useAuth';
import leadsApiService from '../../services/leadsApi';

const AIEmailGenerationModal = ({ lead, onClose, onEmailSent }) => {
  const { authFetch } = useAuth();
  const [customPrompt, setCustomPrompt] = useState('');
  const [generatedEmail, setGeneratedEmail] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [editedSubject, setEditedSubject] = useState('');
  const [editedBody, setEditedBody] = useState('');

  // No auth setup needed - leadsApiService handles tokens internally

  // Prompt suggestions for quick use
  const promptSuggestions = [
    "Write a professional cold outreach email introducing our services",
    "Follow up on our previous conversation about potential collaboration",
    "Request a meeting to discuss how we can help their business",
    "Introduce our latest product features that might benefit them",
    "Ask for a brief call to explore partnership opportunities"
  ];

  const generateEmail = async () => {
    try {
      setIsGenerating(true);
      setError('');
      setSuccess('');

      // Use the new CRM-style API
      const data = await leadsApiService.generateEmail(lead.id, customPrompt);

      setGeneratedEmail({
        subject: data.email.subject,
        body: data.email.body
      });
      setEditedSubject(data.email.subject);
      setEditedBody(data.email.body);
      setSuccess('Email generated successfully!');
    } catch (err) {
      console.error('Error generating email:', err);
      setError(err.message || 'Failed to generate email. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const sendEmail = async () => {
    if (!generatedEmail) return;

    try {
      setIsSending(true);
      setError('');

      const subject = editMode ? editedSubject : generatedEmail.subject;
      const body = editMode ? editedBody : generatedEmail.body;

      const data = await leadsApiService.sendEmail(
        lead.email,
        subject,
        body,
        lead.id
      );

      setSuccess(`Email sent successfully to ${lead.email}`);
      if (onEmailSent) {
        onEmailSent(data);
      }
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      console.error('Error sending email:', err);
      setError(err.message || 'Failed to send email. Please try again.');
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
    const to = lead.email;

    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(gmailUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Mail className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                AI Email Generator
                <Sparkles className="w-5 h-5 text-amber-500" />
              </h2>
              <p className="text-sm text-gray-600">
                Generate personalized email for {lead.company}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-6 max-h-[calc(90vh-100px)] overflow-y-auto">
          {/* Error/Success Messages */}
          {error && (
            <Alert className="mb-4 border-red-200 bg-red-50">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span className="text-red-700">{error}</span>
            </Alert>
          )}
          {success && (
            <Alert className="mb-4 border-green-200 bg-green-50">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-green-700">{success}</span>
            </Alert>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Lead Info & Email Generation */}
            <div className="space-y-6">
              {/* Lead Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Lead Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="font-medium">Company:</span>
                    <span>{lead.company}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Email:</span>
                    <span className="text-blue-600">{lead.email}</span>
                  </div>
                  {lead.location && (
                    <div className="flex justify-between">
                      <span className="font-medium">Location:</span>
                      <span>{lead.location}</span>
                    </div>
                  )}
                  {lead.industry && (
                    <div className="flex justify-between">
                      <span className="font-medium">Industry:</span>
                      <span>{lead.industry}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="font-medium">Status:</span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      lead.status === 'new' ? 'bg-blue-100 text-blue-800' :
                      lead.status === 'contacted' ? 'bg-yellow-100 text-yellow-800' :
                      lead.status === 'qualified' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {lead.status}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Email Generation */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Generate Email</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Custom Prompt */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      What type of email would you like to generate?
                    </label>
                    <textarea
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      placeholder="Example: Write a follow-up email about our product demo, mentioning how our solution can help reduce their operational costs..."
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      rows={3}
                    />
                  </div>

                  {/* Quick Suggestions */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quick suggestions:
                    </label>
                    <div className="space-y-2">
                      {promptSuggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => setCustomPrompt(suggestion)}
                          className="w-full text-left p-2 text-sm bg-gray-50 hover:bg-blue-50 border border-gray-200 rounded-md transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Generate Button */}
                  <Button
                    onClick={generateEmail}
                    disabled={isGenerating || !lead.email}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
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
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Generated Email */}
            <div className="space-y-6">
              {generatedEmail && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Generated Email</CardTitle>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditMode(!editMode)}
                        >
                          <Edit3 className="w-4 h-4 mr-1" />
                          {editMode ? 'Preview' : 'Edit'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(`Subject: ${generatedEmail.subject}\n\n${generatedEmail.body}`)}
                        >
                          <Copy className="w-4 h-4 mr-1" />
                          Copy
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {editMode ? (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Subject:
                          </label>
                          <input
                            type="text"
                            value={editedSubject}
                            onChange={(e) => setEditedSubject(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Body:
                          </label>
                          <textarea
                            value={editedBody}
                            onChange={(e) => setEditedBody(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            rows={12}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Subject:
                          </label>
                          <div className="p-2 bg-gray-50 rounded border">
                            {generatedEmail.subject}
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Body:
                          </label>
                          <div className="p-3 bg-gray-50 rounded border whitespace-pre-wrap font-mono text-sm">
                            {generatedEmail.body}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3 mt-6">
                      <Button
                        onClick={sendEmail}
                        disabled={isSending}
                        className="flex-1 bg-green-600 hover:bg-green-700"
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
                      <Button
                        onClick={openInGmail}
                        variant="outline"
                        className="flex-1"
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        Open in Gmail
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {!generatedEmail && (
                <Card>
                  <CardContent className="text-center py-12">
                    <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">
                      Generated email will appear here after you click "Generate Email"
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AIEmailGenerationModal;