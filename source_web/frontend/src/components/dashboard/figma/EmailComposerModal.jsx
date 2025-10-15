import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Textarea } from '../../ui/textarea';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Send, X, Mail, User, Building, Clock, Loader2, Sparkles, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import emailAIService from '../../../services/emailAIService';

const EmailComposerModal = ({ 
  isOpen, 
  onClose, 
  suggestion, 
  onSend 
}) => {
  const [emailData, setEmailData] = useState({
    to: suggestion?.customer_email || '',
    subject: '',
    body: suggestion?.template || '',
    customerName: suggestion?.customer_name || ''
  });
  const [isSending, setIsSending] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiGenerated, setAiGenerated] = useState(false);

  // Generate email subject based on suggestion type
  const generateSubject = () => {
    const customerName = emailData.customerName;
    switch (suggestion?.type) {
      case 'email':
        return `Following up on your ${customerName} account`;
      case 'call':
        return `Scheduling a call - ${customerName}`;
      case 'linkedin':
        return `Great connecting with you, ${customerName}!`;
      default:
        return `Reaching out - ${customerName}`;
    }
  };

  // Initialize email data when suggestion changes
  useState(() => {
    if (suggestion) {
      const initialData = {
        to: suggestion.customer_email || `contact@${suggestion.customer_name?.toLowerCase().replace(/\s+/g, '')}.com`,
        subject: generateSubject(),
        body: suggestion.template || '',
        customerName: suggestion.customer_name || ''
      };

      setEmailData(initialData);
      setAiGenerated(false);

      // Auto-generate AI content if available and no template exists
      if (emailAIService.isAvailable() && !suggestion.template) {
        setTimeout(() => {
          generateAIContent();
        }, 500); // Small delay to let modal open
      }
    }
  }, [suggestion]);

  const handleSend = async () => {
    setIsSending(true);
    try {
      // Simulate email sending
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (onSend) {
        onSend(emailData);
      }
      
      // Close modal after successful send
      onClose();
    } catch (error) {
      console.error('Failed to send email:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleInputChange = (field, value) => {
    setEmailData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Generate AI email content
  const generateAIContent = async () => {
    setIsGenerating(true);
    try {
      console.log('🤖 Generating AI email content...');

      const result = await emailAIService.generateEmailContent(suggestion, {
        customer_name: suggestion.customer_name,
        type: suggestion.type,
        priority: suggestion.priority,
        reason: suggestion.reason
      });

      if (result.success && result.data) {
        const aiContent = result.data;
        setEmailData(prev => ({
          ...prev,
          subject: aiContent.subject || prev.subject,
          body: aiContent.full_email || aiContent.body || prev.body
        }));
        setAiGenerated(true);
        console.log('✅ AI email content generated successfully');
      } else {
        console.warn('⚠️ AI generation failed, using fallback');
        // Use fallback content
        const fallbackContent = result.data;
        setEmailData(prev => ({
          ...prev,
          subject: fallbackContent.subject || prev.subject,
          body: fallbackContent.full_email || prev.body
        }));
      }
    } catch (error) {
      console.error('❌ Error generating AI content:', error);
      // Keep existing content on error
    } finally {
      setIsGenerating(false);
    }
  };

  // Regenerate AI content
  const regenerateAIContent = async () => {
    await generateAIContent();
  };

  if (!suggestion) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-600" />
            Compose Email
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Suggestion Context */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-blue-50 rounded-lg p-4 border border-blue-200"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Badge className={`text-xs ${
                  suggestion.priority === 'high' ? 'bg-red-100 text-red-800' :
                  suggestion.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {suggestion.type}
                </Badge>
                <span className="text-sm font-medium text-slate-700">{suggestion.customer_name}</span>
              </div>
              <div className="text-xs text-green-600 font-semibold">
                {suggestion.estimated_response_rate}
              </div>
            </div>
            <p className="text-sm text-slate-700 mb-2">{suggestion.suggestion}</p>
            <p className="text-xs text-slate-600">{suggestion.reason}</p>
            <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Best time: {suggestion.best_time}
              </span>
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                Priority: {suggestion.priority}
              </span>
            </div>
          </motion.div>

          {/* Email Form */}
          <div className="space-y-4">
            {/* To Field */}
            <div>
              <Label htmlFor="email-to" className="text-sm font-medium text-slate-700">
                To
              </Label>
              <Input
                id="email-to"
                type="email"
                value={emailData.to}
                onChange={(e) => handleInputChange('to', e.target.value)}
                placeholder="customer@company.com"
                className="mt-1"
              />
            </div>

            {/* Subject Field */}
            <div>
              <Label htmlFor="email-subject" className="text-sm font-medium text-slate-700">
                Subject
              </Label>
              <Input
                id="email-subject"
                value={emailData.subject}
                onChange={(e) => handleInputChange('subject', e.target.value)}
                placeholder="Email subject"
                className="mt-1"
              />
            </div>

            {/* Body Field */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="email-body" className="text-sm font-medium text-slate-700">
                  Message
                </Label>
                <div className="flex items-center gap-2">
                  {aiGenerated && (
                    <Button
                      type="button"
                      onClick={regenerateAIContent}
                      disabled={isGenerating}
                      variant="outline"
                      size="sm"
                      className="px-2 py-1 h-7"
                    >
                      {isGenerating ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <RotateCcw className="w-3 h-3" />
                      )}
                    </Button>
                  )}
                  <Button
                    type="button"
                    onClick={generateAIContent}
                    disabled={isGenerating}
                    variant="outline"
                    size="sm"
                    className="px-2 py-1 h-7"
                  >
                    {isGenerating ? (
                      <Loader2 className="w-3 h-3 animate-spin mr-1" />
                    ) : (
                      <Sparkles className="w-3 h-3 mr-1" />
                    )}
                    {isGenerating ? 'Generating...' : 'AI Generate'}
                  </Button>
                </div>
              </div>
              <Textarea
                id="email-body"
                value={emailData.body}
                onChange={(e) => handleInputChange('body', e.target.value)}
                placeholder="Write your email message here or click 'AI Generate' for AI-powered content..."
                rows={8}
                className="mt-1 resize-none"
              />
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-slate-500">
                  {aiGenerated ?
                    '✨ AI-generated content - you can edit and customize as needed.' :
                    'You can write manually or use AI to generate personalized content.'
                  }
                </p>
                {emailAIService.isAvailable() ? (
                  <span className="text-xs text-green-600">🤖 AI Available</span>
                ) : (
                  <span className="text-xs text-orange-600">⚠️ AI Unavailable</span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Building className="w-3 h-3" />
              <span>This email will be sent from your connected email account</span>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isSending}
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={handleSend}
                disabled={isSending || !emailData.to || !emailData.subject || !emailData.body}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                {isSending ? 'Sending...' : 'Send Email'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EmailComposerModal;
