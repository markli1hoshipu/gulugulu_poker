import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

import { 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Users, 
  Target, 
  Brain, 
  BarChart3,
  Lightbulb,
  ArrowRight,
  Calendar,
  MessageSquare,
  Star,
  AlertCircle,
  Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';

const MeetingInsights = ({ selectedEvent }) => {
  const [insights, setInsights] = useState({});
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('predictions');
  
  // Mock data for demonstration (in production, this would come from AI analysis)
  const generateMockInsights = useCallback((event) => {
    const now = new Date();
    const eventStart = new Date(event.start?.dateTime || event.start?.date);
    const isUpcoming = eventStart > now;
    
    return {
      id: event.id,
      title: event.summary,
      successProbability: Math.floor(Math.random() * 30) + 70, // 70-100%
      engagementLevel: Math.floor(Math.random() * 40) + 60, // 60-100%
      durationPrediction: {
        estimated: Math.floor(Math.random() * 30) + 30, // 30-60 minutes
        confidence: Math.floor(Math.random() * 20) + 80, // 80-100%
      },
      outcomeForecasting: {
        decisionMaking: Math.floor(Math.random() * 30) + 60,
        actionItems: Math.floor(Math.random() * 5) + 2,
        followUpNeeded: Math.random() > 0.3,
        riskFactors: generateRiskFactors(),
      },
      participantAnalysis: generateParticipantAnalysis(event),
      recommendations: generateRecommendations(isUpcoming),
      keyInsights: generateKeyInsights(),
      historicalContext: generateHistoricalContext(),
    };
  }, []);

  const generateRiskFactors = () => {
    const risks = [
      'Multiple high-priority participants',
      'Agenda not shared 24h in advance',
      'Back-to-back meetings for key attendees',
      'No clear meeting objectives defined',
      'Previous similar meetings ran over time',
      'Conflicting stakeholder interests identified'
    ];
    return risks.slice(0, Math.floor(Math.random() * 3) + 1);
  };

  const generateParticipantAnalysis = (event) => {
    const attendees = event.attendees || [];
    const mockPatterns = [
      { type: 'High Engagement', percentage: 75, trend: 'up' },
      { type: 'Decision Makers', percentage: 60, trend: 'stable' },
      { type: 'Technical Contributors', percentage: 40, trend: 'up' },
      { type: 'Stakeholders', percentage: 85, trend: 'down' },
    ];
    
    return {
      totalAttendees: attendees.length || Math.floor(Math.random() * 8) + 3,
      engagementPatterns: mockPatterns,
      influenceMap: generateInfluenceMap(),
      collaborationHistory: generateCollaborationHistory(),
    };
  };

  const generateInfluenceMap = () => [
    { name: 'Alex Johnson', influence: 95, role: 'Decision Maker' },
    { name: 'Sarah Chen', influence: 78, role: 'Technical Lead' },
    { name: 'Mike Rodriguez', influence: 62, role: 'Stakeholder' },
    { name: 'Emma Davis', influence: 45, role: 'Contributor' },
  ];

  const generateCollaborationHistory = () => ({
    previousMeetings: Math.floor(Math.random() * 15) + 5,
    successRate: Math.floor(Math.random() * 20) + 75,
    avgDecisionTime: `${Math.floor(Math.random() * 5) + 2} days`,
  });

  const generateRecommendations = (isUpcoming) => {
    const upcomingRecs = [
      'Send agenda 24h before meeting',
      'Prepare decision framework',
      'Identify key discussion points',
      'Set clear time boundaries',
      'Prepare backup plans for key decisions'
    ];
    
    const generalRecs = [
      'Schedule follow-up within 48h',
      'Document key decisions',
      'Assign clear action items',
      'Set next review checkpoint',
      'Share meeting summary with stakeholders'
    ];
    
    return isUpcoming ? upcomingRecs : generalRecs;
  };

  const generateKeyInsights = () => [
    'Peak engagement expected in first 15 minutes',
    'Decision window optimal between 20-35 minutes',
    'Technical discussions may require extended time',
    'Stakeholder alignment needed on budget items',
    'Historical pattern suggests 2-3 follow-up actions'
  ];

  const generateHistoricalContext = () => ({
    similarMeetings: Math.floor(Math.random() * 10) + 5,
    avgSuccessRate: Math.floor(Math.random() * 25) + 70,
    commonOutcomes: [
      'Budget approval decisions',
      'Timeline adjustments',
      'Resource allocation changes',
      'Stakeholder sign-offs'
    ],
    patterns: [
      'Meetings with pre-shared agendas have 85% higher success rates',
      'Optimal meeting length is 45 minutes for this meeting type',
      'Decision-making effectiveness drops after 1 hour'
    ]
  });

  useEffect(() => {
    if (selectedEvent && !insights[selectedEvent.id]) {
      setLoading(true);
      // Simulate AI processing delay
      setTimeout(() => {
        setInsights(prev => ({
          ...prev,
          [selectedEvent.id]: generateMockInsights(selectedEvent)
        }));
        setLoading(false);
      }, 1500);
    }
  }, [selectedEvent, insights]);

  const currentInsight = selectedEvent ? insights[selectedEvent.id] : null;

  const tabs = [
    { id: 'predictions', label: 'Predictions', icon: Brain },
    { id: 'outcomes', label: 'Outcomes', icon: Target },
    { id: 'participants', label: 'Participants', icon: Users },
    { id: 'recommendations', label: 'Recommendations', icon: Lightbulb }
  ];

  const getSuccessColor = (percentage) => {
    if (percentage >= 80) return 'text-green-600 bg-green-50';
    if (percentage >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down': return <TrendingUp className="w-4 h-4 text-red-500 rotate-180" />;
      default: return <div className="w-4 h-4 bg-gray-400 rounded-full" />;
    }
  };

  if (!selectedEvent) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Meeting Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Select a meeting to view AI insights</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5" />
          Meeting Intelligence
        </CardTitle>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full mx-auto mb-4"></div>
              <p className="text-sm text-gray-600">Analyzing meeting data...</p>
            </div>
          </div>
        ) : currentInsight ? (
          <div className="space-y-6">
            {/* Meeting Header */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg">
              <h3 className="font-semibold text-lg mb-2">{currentInsight.title}</h3>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Target className="w-4 h-4 text-green-600" />
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSuccessColor(currentInsight.successProbability)}`}>
                    {currentInsight.successProbability}% Success Probability
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Zap className="w-4 h-4 text-yellow-600" />
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSuccessColor(currentInsight.engagementLevel)}`}>
                    {currentInsight.engagementLevel}% Engagement Expected
                  </span>
                </div>
              </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'predictions' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-5 h-5 text-blue-600" />
                      <h4 className="font-semibold">Duration Prediction</h4>
                    </div>
                    <p className="text-2xl font-bold text-blue-600">{currentInsight.durationPrediction.estimated} min</p>
                    <p className="text-sm text-gray-600">{currentInsight.durationPrediction.confidence}% confidence</p>
                  </div>
                  
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="w-5 h-5 text-purple-600" />
                      <h4 className="font-semibold">Expected Action Items</h4>
                    </div>
                    <p className="text-2xl font-bold text-purple-600">{currentInsight.outcomeForecasting.actionItems}</p>
                    <p className="text-sm text-gray-600">Based on meeting type</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-yellow-600" />
                    Key Insights
                  </h4>
                  <div className="space-y-2">
                    {currentInsight.keyInsights.map((insight, index) => (
                      <div key={index} className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-1 flex-shrink-0" />
                        <span className="text-sm">{insight}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'outcomes' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="w-5 h-5 text-green-600" />
                    <h4 className="font-semibold">Decision Making Forecast</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full transition-all duration-1000"
                        style={{ width: `${currentInsight.outcomeForecasting.decisionMaking}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">{currentInsight.outcomeForecasting.decisionMaking}%</span>
                  </div>
                </div>

                {currentInsight.outcomeForecasting.riskFactors.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      Risk Factors
                    </h4>
                    <div className="space-y-2">
                      {currentInsight.outcomeForecasting.riskFactors.map((risk, index) => (
                        <div key={index} className="flex items-start gap-2 p-2 bg-red-50 rounded-lg">
                          <AlertCircle className="w-4 h-4 text-red-600 mt-1 flex-shrink-0" />
                          <span className="text-sm">{risk}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                    Historical Context
                  </h4>
                  <div className="bg-blue-50 p-4 rounded-lg space-y-2">
                    <p className="text-sm"><strong>Similar Meetings:</strong> {currentInsight.historicalContext.similarMeetings}</p>
                    <p className="text-sm"><strong>Average Success Rate:</strong> {currentInsight.historicalContext.avgSuccessRate}%</p>
                    <div className="mt-3">
                      <p className="text-sm font-medium mb-2">Patterns:</p>
                      {currentInsight.historicalContext.patterns.map((pattern, index) => (
                        <p key={index} className="text-xs text-gray-600 ml-2">• {pattern}</p>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'participants' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    Participant Analysis ({currentInsight.participantAnalysis.totalAttendees} attendees)
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    {currentInsight.participantAnalysis.engagementPatterns.map((pattern, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-white rounded-lg">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{pattern.type}</span>
                          {getTrendIcon(pattern.trend)}
                        </div>
                        <span className="text-sm font-bold">{pattern.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-600" />
                    Influence Map
                  </h4>
                  <div className="space-y-2">
                    {currentInsight.participantAnalysis.influenceMap.map((person, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">{person.name.split(' ').map(n => n[0]).join('')}</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{person.name}</p>
                          <p className="text-xs text-gray-600">{person.role}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-yellow-500 h-2 rounded-full"
                              style={{ width: `${person.influence}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium">{person.influence}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Collaboration History</h4>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-lg font-bold text-purple-600">{currentInsight.participantAnalysis.collaborationHistory.previousMeetings}</p>
                      <p className="text-xs text-gray-600">Previous Meetings</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-purple-600">{currentInsight.participantAnalysis.collaborationHistory.successRate}%</p>
                      <p className="text-xs text-gray-600">Success Rate</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-purple-600">{currentInsight.participantAnalysis.collaborationHistory.avgDecisionTime}</p>
                      <p className="text-xs text-gray-600">Avg Decision Time</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'recommendations' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-yellow-600" />
                    AI Recommendations
                  </h4>
                  <div className="space-y-2">
                    {currentInsight.recommendations.map((rec, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                        <ArrowRight className="w-4 h-4 text-yellow-600 mt-1 flex-shrink-0" />
                        <span className="text-sm">{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2 text-green-800">Success Optimization</h4>
                  <p className="text-sm text-green-700 mb-3">
                    Following these recommendations could increase your meeting success rate by up to 25%.
                  </p>
                  <Button className="w-full bg-green-600 hover:bg-green-700">
                    Apply Recommendations
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};

export default MeetingInsights; 