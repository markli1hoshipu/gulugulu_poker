import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, MessageSquare, X, Calendar, Clock } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import { Button } from '../ui/button';
import { motion, AnimatePresence } from 'framer-motion';

const getMockResponse = (message) => {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('hi') || lowerMessage.includes('hello')) {
    return `Hello! 👋 I'm your AI scheduling assistant. I can help you with:

📅 **Meeting Scheduling:**
• Schedule meetings with specific people and times
• Find available time slots in your calendar  
• Send meeting invitations
• Set up recurring meetings

⏰ **Calendar Management:**
• Check your availability
• Block time for focused work
• Manage meeting conflicts
• Set reminders

📋 **Project Planning:**
• Coordinate team schedules
• Plan project milestones
• Schedule regular check-ins

What would you like me to help you schedule today?`;
  }
  
  if (lowerMessage.includes('schedule') || lowerMessage.includes('meeting')) {
    return `I'd be happy to help you schedule a meeting! 📅

To get started, I'll need a few details:

**Meeting Details:**
1. **Who** should attend? (email addresses or names)
2. **When** would you prefer? (date and time)
3. **How long** should the meeting be?
4. **What's** the purpose/agenda?

**Example:**
"Schedule a 1-hour team standup with john@company.com and sarah@company.com for tomorrow at 10 AM"

Please provide these details and I'll help you create the perfect meeting!`;
  }
  
  if (lowerMessage.includes('available') || lowerMessage.includes('free')) {
    return `I can help you check availability! 📊

**To check your availability:**
1. Specify the time range you're interested in
2. Let me know if you want to check for conflicts
3. I can suggest optimal meeting times

**Example requests:**
• "Am I free tomorrow afternoon?"
• "When is my next available 2-hour block?"
• "Check my availability for this week"

What time period would you like me to check?`;
  }
  
  return `I understand you want help with: "${message}"

I'm your AI scheduling assistant! Here's what I can suggest:

**Next Steps:**
1. Let me know the specific details:
   • Who should attend?
   • When would you prefer to meet?
   • How long should the meeting be?
   • Any specific topics to cover?

2. I can help you:
   • Find the best time for everyone
   • Draft meeting invitations
   • Set up calendar events
   • Send follow-up reminders

Would you like me to help you plan this step by step?`;
};

const SchedulingAgentChat = ({ isOpen, onToggle, onEventCreated }) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [inputText]);

  // Initial welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: 'welcome',
        text: "👋 Hi! I'm your scheduling assistant. I can help you:\n\n• Schedule meetings and events\n• Check calendar availability\n• Send meeting invitations\n• Manage your calendar\n\nWhat would you like me to help you with today?",
        from: 'agent',
        timestamp: new Date()
      }]);
    }
  }, [messages.length]);

  const sendMessage = async () => {
    const trimmedMessage = inputText.trim();
    if (!trimmedMessage || isLoading) return;

    const userMessage = {
      id: Date.now().toString(),
      text: trimmedMessage,
      from: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    setError(null);

    try {
      let agentMessage;
      
      try {
        // Try to call the backend API first for REAL actions
        console.log('Calling scheduling agent API for actual scheduling actions...');
        const response = await fetch(`${import.meta.env.VITE_BACKEND_API_URL}/api/scheduling-agent`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: trimmedMessage,
            context: 'calendar'
          })
        });

        if (!response.ok) {
          throw new Error(`Backend not available (status: ${response.status})`);
        }

        const data = await response.json();

        if (data.error) {
          throw new Error(data.error);
        }

        agentMessage = {
          id: (Date.now() + 1).toString(),
          text: data.response,
          from: 'agent',
          timestamp: new Date()
        };
        
        console.log('✅ Got response from scheduling agent backend:', data.response);
        
      } catch (apiError) {
        console.warn('Backend API not available, using instructional response:', apiError.message);
        
        // If backend fails, provide clear instructions instead of fake actions
        const instructionalResponse = `⚠️ **Backend not available** - I cannot perform real actions right now.

**Your request**: "${trimmedMessage}"

**What I would normally do:**
1. 📧 **Send actual emails** to all attendees
2. 📅 **Create calendar event** with meeting details  
3. 🔗 **Generate Zoom meeting** link automatically

**Status**: The real scheduling agent backend is not responding. Please ensure the backend is running and try again.`;

        agentMessage = {
          id: (Date.now() + 1).toString(),
          text: instructionalResponse,
          from: 'agent',
          timestamp: new Date()
        };
      }

      setMessages(prev => [...prev, agentMessage]);

      // Check if the response indicates an event was created
      if (agentMessage.text && (agentMessage.text.includes('calendar event') || agentMessage.text.includes('meeting scheduled') || agentMessage.text.includes('email sent'))) {
        // Trigger calendar refresh if an event was created
        console.log('🔄 Triggering calendar refresh...');
        if (onEventCreated) {
          onEventCreated();
        }
      }

    } catch (error) {
      console.error('Error in chat system:', error);
      setError(error.message);
      
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        text: `❌ Sorry, I encountered an error. The scheduling agent backend may not be available. Please check that all services are running.`,
        from: 'agent',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleQuickAction = (action) => {
    setInputText(action);
  };

  const quickActions = [
    "Schedule a meeting for tomorrow at 2pm",
    "Check my availability this week",
    "Schedule a team standup every Monday at 9am",
    "Find a 1-hour slot next week for client meeting"
  ];

  if (!isOpen) {
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="fixed bottom-6 right-6 z-50"
      >
        <Button
          onClick={onToggle}
          className="bg-purple-600 hover:bg-purple-700 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-200"
          title="Open Scheduling Assistant"
        >
          <MessageSquare className="w-6 h-6" />
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className="fixed bottom-6 right-6 z-50 w-96 h-[600px] bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-purple-600 text-white rounded-t-lg">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Scheduling Assistant</h3>
            <p className="text-xs text-purple-100">AI-powered calendar helper</p>
          </div>
        </div>
        <Button
          onClick={onToggle}
          variant="ghost"
          size="sm"
          className="text-white hover:bg-white/10 p-1"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${message.from === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                message.from === 'user' ? 'bg-blue-500' : 'bg-purple-500'
              }`}>
                {message.from === 'user' ? (
                  <User className="w-4 h-4 text-white" />
                ) : (
                  <Bot className="w-4 h-4 text-white" />
                )}
              </div>

              {/* Message Content */}
              <div className={`max-w-[70%] ${message.from === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                <div className={`px-3 py-2 rounded-lg text-sm ${
                  message.from === 'user' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  <ReactMarkdown
                    rehypePlugins={[rehypeSanitize]}
                    components={{
                      p: ({ children }) => <p className="mb-0 last:mb-0">{children}</p>,
                      a: ({ children, href }) => (
                        <a 
                          href={href} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className={message.from === 'user' ? 'text-blue-200 underline' : 'text-purple-600 underline'}
                        >
                          {children}
                        </a>
                      ),
                      code: ({ children }) => (
                        <code className={`px-1 py-0.5 rounded text-xs ${
                          message.from === 'user' ? 'bg-blue-600' : 'bg-gray-200'
                        }`}>
                          {children}
                        </code>
                      ),
                    }}
                  >
                    {message.text}
                  </ReactMarkdown>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </motion.div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3"
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-gray-100 px-3 py-2 rounded-lg">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin text-purple-600" />
                  <span className="text-sm text-gray-600">Thinking...</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      {messages.length <= 1 && (
        <div className="p-4 border-t bg-gray-50">
          <p className="text-xs text-gray-500 mb-2">Quick actions:</p>
          <div className="grid grid-cols-1 gap-1">
            {quickActions.slice(0, 2).map((action, index) => (
              <button
                key={index}
                onClick={() => handleQuickAction(action)}
                className="text-left text-xs p-2 bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors"
              >
                {action}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me to schedule something..."
            disabled={isLoading}
            className="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 min-h-[40px] max-h-[80px]"
            rows={1}
          />
          <Button
            onClick={sendMessage}
            disabled={!inputText.trim() || isLoading}
            size="sm"
            className="rounded-lg bg-purple-500 hover:bg-purple-600 text-white px-3 h-[40px]"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-2 text-center">
          Press Enter to send • Shift + Enter for new line
        </p>
      </div>
    </motion.div>
  );
};

export default SchedulingAgentChat; 