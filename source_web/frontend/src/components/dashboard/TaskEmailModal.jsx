import React, { useState, useEffect } from 'react';
import { X, Mail, Send, Copy, ExternalLink, Sparkles, RotateCcw, Loader2, User, Building } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import emailAIService from '../../services/emailAIService';

const TaskEmailModal = ({ isOpen, onClose, task, onSend }) => {
  const [emailData, setEmailData] = useState({
    to: '',
    subject: '',
    body: '',
    customerName: ''
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [aiGenerated, setAiGenerated] = useState(false);
  const [error, setError] = useState(null);

  // Initialize email data when task changes
  useEffect(() => {
    if (task && isOpen) {
      const customerName = task.metadata?.customer_name || 'Customer';
      const customerEmail = task.metadata?.customer_email || 
        `contact@${customerName.toLowerCase().replace(/\s+/g, '')}.com`;
      
      setEmailData({
        to: customerEmail,
        subject: generateSubjectFromTask(task),
        body: generateBodyFromTask(task),
        customerName: customerName
      });
      setAiGenerated(false);
      setError(null);
    }
  }, [task, isOpen]);

  const generateSubjectFromTask = (task) => {
    const customerName = task.metadata?.customer_name || 'Customer';
    const taskType = task.metadata?.task_type;
    const emailType = task.metadata?.email_type;

    if (emailType) {
      switch (emailType) {
        case 'check-in':
          return `Checking in - ${customerName}`;
        case 'renewal':
          return `Contract Renewal Discussion - ${customerName}`;
        case 'upsell':
          return `Growth Opportunities for ${customerName}`;
        case 'support':
          return `Support Follow-up - ${customerName}`;
        case 'onboarding':
          return `Welcome to the team, ${customerName}!`;
        default:
          return `Following up - ${customerName}`;
      }
    }

    // Fallback based on task title
    return task.title || `Following up - ${customerName}`;
  };

  const generateBodyFromTask = (task) => {
    const customerName = task.metadata?.customer_name || 'Customer';
    
    return `Hi ${customerName},

${task.description || 'I wanted to follow up with you regarding our recent conversation.'}

Best regards,
[Your Name]`;
  };

  const handleGenerateAI = async () => {
    if (!emailAIService.isAvailable()) {
      setError('AI email generation is not available. Please check your API configuration.');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // Create a suggestion object from the task
      const suggestion = {
        customer_name: task.metadata?.customer_name || 'Customer',
        customer_email: emailData.to,
        type: task.metadata?.email_type || 'follow-up',
        message: task.description,
        priority: task.priority,
        context: `Task: ${task.title}`
      };

      const customerData = {
        industry: task.metadata?.industry,
        status: task.metadata?.status,
        last_interaction: task.metadata?.last_interaction
      };

      const result = await emailAIService.generateEmailContent(suggestion, customerData);

      if (result.success) {
        setEmailData(prev => ({
          ...prev,
          subject: result.subject || prev.subject,
          body: result.body || prev.body
        }));
        setAiGenerated(true);
      } else {
        setError(result.error || 'Failed to generate AI content');
      }
    } catch (err) {
      console.error('AI generation error:', err);
      setError('Failed to generate AI content. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSend = async () => {
    setIsSending(true);
    setError(null);

    try {
      // Validate email data
      if (!emailData.to || !emailData.subject || !emailData.body) {
        throw new Error('Please fill in all required fields');
      }

      // Call the onSend callback with email data
      if (onSend) {
        await onSend({
          ...emailData,
          taskId: task.id,
          taskTitle: task.title
        });
      }

      // Close modal on successful send
      onClose();
    } catch (err) {
      console.error('Send error:', err);
      setError(err.message || 'Failed to send email');
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyToClipboard = async () => {
    try {
      const emailContent = `To: ${emailData.to}\nSubject: ${emailData.subject}\n\n${emailData.body}`;
      await navigator.clipboard.writeText(emailContent);
      // You could add a toast notification here
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const handleOpenInGmail = () => {
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(emailData.to)}&subject=${encodeURIComponent(emailData.subject)}&body=${encodeURIComponent(emailData.body)}`;
    window.open(gmailUrl, '_blank');
  };

  if (!isOpen || !task) return null;

  const isEmailTask = task.metadata?.task_type === 'email' || 
                     task.metadata?.communication_method === 'email' ||
                     task.title?.toLowerCase().includes('email');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Mail className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Edit Email Task</h2>
              <p className="text-sm text-gray-500">{task.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[calc(90vh-200px)] overflow-y-auto">
          {/* Task Info */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Building className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-900">Task Details</span>
            </div>
            <p className="text-blue-800 text-sm">{task.description}</p>
            {task.metadata?.customer_name && (
              <div className="flex items-center space-x-2 mt-2">
                <User className="h-4 w-4 text-blue-600" />
                <span className="text-blue-800 text-sm">Customer: {task.metadata.customer_name}</span>
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Email Form */}
          <div className="space-y-4">
            {/* To Field */}
            <div>
              <Label htmlFor="to">To</Label>
              <Input
                id="to"
                type="email"
                value={emailData.to}
                onChange={(e) => setEmailData(prev => ({ ...prev, to: e.target.value }))}
                placeholder="customer@example.com"
                className="mt-1"
              />
            </div>

            {/* Subject Field */}
            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={emailData.subject}
                onChange={(e) => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="Email subject"
                className="mt-1"
              />
            </div>

            {/* Body Field */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="body">Message</Label>
                {aiGenerated && (
                  <Badge variant="secondary" className="text-xs">
                    <Sparkles className="h-3 w-3 mr-1" />
                    AI Generated
                  </Badge>
                )}
              </div>
              <Textarea
                id="body"
                value={emailData.body}
                onChange={(e) => setEmailData(prev => ({ ...prev, body: e.target.value }))}
                placeholder="Email content"
                rows={8}
                className="mt-1"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateAI}
                disabled={isGenerating}
                className="text-purple-600 border-purple-200 hover:bg-purple-50"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                {isGenerating ? 'Generating...' : 'AI Generate'}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyToClipboard}
                className="text-gray-600 border-gray-200 hover:bg-gray-50"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenInGmail}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in Gmail
              </Button>
            </div>

            <div className="flex items-center space-x-3">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handleSend}
                disabled={isSending || !emailData.to || !emailData.subject || !emailData.body}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                {isSending ? 'Sending...' : 'Send Email'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskEmailModal;
