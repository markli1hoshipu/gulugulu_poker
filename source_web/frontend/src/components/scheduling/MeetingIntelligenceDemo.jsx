import React, { useState } from 'react';

import { 
  Brain, 
  Target, 
  TrendingUp, 
  Users, 
  Clock, 
  Calendar,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  BarChart3,
  Zap,
  Award
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';

const MeetingIntelligenceDemo = () => {
  const [activeDemo, setActiveDemo] = useState('overview');

  const demoData = {
    overview: {
      title: "AI-Powered Meeting Intelligence",
      subtitle: "Predict outcomes, optimize performance, and maximize meeting effectiveness",
      features: [
        {
          icon: Target,
          title: "Success Prediction",
          description: "AI analyzes participant behavior, agenda quality, and historical data to predict meeting success rates up to 95% accuracy",
          color: "text-green-600 bg-green-50"
        },
        {
          icon: Users,
          title: "Participant Analysis",
          description: "Deep insights into attendee engagement patterns, influence mapping, and collaboration effectiveness",
          color: "text-blue-600 bg-blue-50"
        },
        {
          icon: TrendingUp,
          title: "Outcome Forecasting",
          description: "Predict decision-making probability, action item generation, and follow-up requirements",
          color: "text-purple-600 bg-purple-50"
        },
        {
          icon: Lightbulb,
          title: "Smart Recommendations",
          description: "Personalized suggestions for optimal meeting times, duration, and participant selection",
          color: "text-yellow-600 bg-yellow-50"
        }
      ]
    },
    predictions: {
      title: "Meeting Outcome Predictions",
      metrics: [
        { label: "Success Probability", value: "87%", color: "text-green-600", icon: Target },
        { label: "Engagement Score", value: "92%", color: "text-blue-600", icon: Zap },
        { label: "Decision Likelihood", value: "78%", color: "text-purple-600", icon: CheckCircle },
        { label: "Action Items Expected", value: "3-4", color: "text-orange-600", icon: BarChart3 }
      ],
      insights: [
        "Peak engagement expected in first 20 minutes",
        "Decision window optimal between 25-35 minute mark",
        "High-influence participants aligned on key objectives",
        "Follow-up meeting probability: 25%"
      ]
    },
    analytics: {
      title: "Historical Performance Analytics",
      stats: [
        { metric: "Average Success Rate", value: "83%", trend: "+12%" },
        { metric: "Optimal Meeting Duration", value: "42 min", trend: "-8 min" },
        { metric: "Best Performing Day", value: "Tuesday", trend: "Consistent" },
        { metric: "Peak Engagement Time", value: "10:30 AM", trend: "+2 hours" }
      ],
      patterns: [
        "Meetings with pre-shared agendas show 85% higher success rates",
        "Teams of 4-6 participants achieve optimal collaboration",
        "Decision-making effectiveness drops after 60 minutes",
        "Tuesday mornings show 23% higher engagement scores"
      ]
    }
  };

  const demos = [
    { id: 'overview', label: 'Overview', icon: Brain },
    { id: 'predictions', label: 'Predictions', icon: Target },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 }
  ];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-3"
        >
          <div className="p-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            Predictive Meeting Intelligence
          </h1>
        </motion.div>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Transform your meetings with AI-powered insights that predict outcomes, 
          analyze participant behavior, and optimize for maximum effectiveness.
        </p>
      </div>

      {/* Demo Navigation */}
      <div className="flex items-center justify-center">
        <div className="flex bg-gray-100 p-1 rounded-lg">
          {demos.map((demo) => {
            const Icon = demo.icon;
            return (
              <button
                key={demo.id}
                onClick={() => setActiveDemo(demo.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeDemo === demo.id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                {demo.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Demo Content */}
      <motion.div
        key={activeDemo}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        {activeDemo === 'overview' && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {demoData.overview.title}
              </h2>
              <p className="text-gray-600">
                {demoData.overview.subtitle}
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {demoData.overview.features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="h-full">
                    <CardContent className="p-6">
                      <div className={`p-3 rounded-full w-fit mb-4 ${feature.color}`}>
                        <feature.icon className="w-6 h-6" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                      <p className="text-gray-600 text-sm">{feature.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {activeDemo === 'predictions' && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {demoData.predictions.title}
              </h2>
              <p className="text-gray-600">Real-time predictions for your upcoming meeting</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {demoData.predictions.metrics.map((metric, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card>
                    <CardContent className="p-4 text-center">
                      <metric.icon className={`w-6 h-6 mx-auto mb-2 ${metric.color}`} />
                      <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                      <p className="text-xs text-gray-600">{metric.label}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-yellow-600" />
                  AI Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {demoData.predictions.insights.map((insight, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{insight}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeDemo === 'analytics' && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {demoData.analytics.title}
              </h2>
              <p className="text-gray-600">Insights from your meeting history and patterns</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {demoData.analytics.stats.map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-center">
                        <p className="text-sm font-medium text-gray-600 mb-1">{stat.metric}</p>
                        <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                        <p className="text-xs text-green-600 font-medium">{stat.trend}</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-purple-600" />
                  Key Patterns Discovered
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {demoData.analytics.patterns.map((pattern, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <TrendingUp className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{pattern}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </motion.div>

      {/* CTA Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="text-center space-y-4 pt-8 border-t"
      >
        <h3 className="text-xl font-semibold text-gray-900">
          Ready to transform your meetings?
        </h3>
        <p className="text-gray-600">
          Connect your calendar to start getting AI-powered meeting insights
        </p>
        <div className="flex items-center justify-center gap-4">
          <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
            Get Started
          </Button>
          <Button variant="outline">
            Learn More
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default MeetingIntelligenceDemo; 