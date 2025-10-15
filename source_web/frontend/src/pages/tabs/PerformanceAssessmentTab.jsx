import React, { useState, useEffect } from 'react';
import { 
    TrendingUp, User, FileText, Target, Star, Edit3, Award, Save, RefreshCw, X
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import employeeApiService from '../../services/employeeApi';

const PerformanceAssessmentTab = ({ employee, performanceData, setPerformanceData }) => {
    const [selectedMetric, setSelectedMetric] = useState('overview');
    const [showSelfAssessment, setShowSelfAssessment] = useState(false);
    
    // Self-assessment form state
    const [strengths, setStrengths] = useState('');
    const [growthAreas, setGrowthAreas] = useState('');
    const [goals, setGoals] = useState('');
    const [saving, setSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');
    
    // Customer feedback state
    const [customerFeedback, setCustomerFeedback] = useState([]);
    const [loadingCustomerFeedback, setLoadingCustomerFeedback] = useState(false);
    const [customerFeedbackError, setCustomerFeedbackError] = useState('');

    // Initialize form fields from performanceData
    useEffect(() => {
        if (performanceData && performanceData.self_assessments) {
            const selfAssessments = performanceData.self_assessments;
            setStrengths(arrayToString(selfAssessments.strengths || []));
            setGrowthAreas(arrayToString(selfAssessments.growthAreas || []));
            setGoals(arrayToString(selfAssessments.goals || []));
        }
    }, [performanceData]);

    // Load customer feedback when employee changes
    useEffect(() => {
        const loadCustomerFeedback = async () => {
            if (!employee || !employee.id) {
                return;
            }

            setLoadingCustomerFeedback(true);
            setCustomerFeedbackError('');

            try {
                const feedback = await employeeApiService.getEmployeeFeedback(employee.id);
                setCustomerFeedback(feedback || []);
            } catch (error) {
                console.error('Error loading customer feedback:', error);
                setCustomerFeedbackError('Failed to load customer feedback');
                setCustomerFeedback([]);
            } finally {
                setLoadingCustomerFeedback(false);
            }
        };

        loadCustomerFeedback();
    }, [employee]);

    const calculateGoalsCompletion = (goals) => {
        if (!goals || goals.length === 0) return 0;
        
        // Filter out cancelled goals (only count active goals)
        const activeGoals = goals.filter(goal => goal.status !== 'cancelled');
        if (activeGoals.length === 0) return 0;
        
        // Count completed goals - either status is 'completed' or progress is 100
        const completedGoals = activeGoals.filter(goal => 
            goal.status === 'completed' || goal.progress === 100
        );
        
        // Calculate percentage
        return Math.round((completedGoals.length / activeGoals.length) * 100);
    };

    if (!employee) {
        return (
            <div className="p-6">
                <div className="bg-white rounded-lg border border-yellow-200 p-6 shadow-sm">
                    <div className="flex items-center gap-3">
                        <TrendingUp className="w-5 h-5 text-yellow-600" />
                        <p className="text-gray-600">No employee data available.</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!performanceData) {
        return (
            <div className="p-6">
                <div className="bg-white rounded-lg border border-yellow-200 p-6 shadow-sm">
                    <div className="flex items-center gap-3">
                        <TrendingUp className="w-5 h-5 text-yellow-600" />
                        <p className="text-gray-600">No performance data available.</p>
                    </div>
                </div>
            </div>
        );
    }

    const peerEvaluations = performanceData.peer_evaluations || { averageScore: 0, totalReviews: 0, feedback: [] };
    const selfAssessments = performanceData.self_assessments || { lastUpdated: '', strengths: [], growthAreas: [], goals: [] };
    const performanceScore = performanceData.performance_score || 0;
    const totalRevenue = performanceData.total_revenue || 0;
    const totalProjects = (performanceData.projects || []).length;
    const goalsCompletion = calculateGoalsCompletion(performanceData.employee_goal || []);

    // Helper functions
    const stringToArray = (str) => {
        return str.split('\n').map(item => item.trim()).filter(item => item.length > 0);
    };

    const arrayToString = (arr) => {
        return Array.isArray(arr) ? arr.join('\n') : '';
    };

    const getCurrentTimestamp = () => {
        return new Date().toISOString();
    };

    // Handle self-assessment save
    const handleSelfAssessmentSave = async () => {
        if (!employee || !employee.id) {
            setSaveMessage('Error: No employee data available');
            return;
        }

        setSaving(true);
        setSaveMessage('');

        try {
            // Convert textarea strings to arrays
            const strengthsArray = stringToArray(strengths);
            const growthAreasArray = stringToArray(growthAreas);
            const goalsArray = stringToArray(goals);

            // Create updated self_assessments object
            const updatedSelfAssessments = {
                lastUpdated: getCurrentTimestamp(),
                strengths: strengthsArray,
                growthAreas: growthAreasArray,
                goals: goalsArray
            };

            // Create updated performance data
            const updatedPerformanceData = {
                ...performanceData,
                self_assessments: updatedSelfAssessments
            };

            // Save to database
            await employeeApiService.updateEmployeePerformance(employee.id, updatedPerformanceData);

            // Update local state
            setPerformanceData(updatedPerformanceData);

            // Show success message and close form
            setSaveMessage('Self-assessment saved successfully!');
            setTimeout(() => {
                setShowSelfAssessment(false);
                setSaveMessage('');
            }, 2000);

        } catch (error) {
            console.error('Error saving self-assessment:', error);
            setSaveMessage('Error saving self-assessment. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const getScoreColor = (score) => {
        if (score >= 90) return 'green';
        if (score >= 80) return 'blue';
        if (score >= 70) return 'yellow';
        return 'red';
    };

    const getScoreLabel = (score) => {
        if (score >= 90) return 'Excellent';
        if (score >= 80) return 'Good';
        if (score >= 70) return 'Satisfactory';
        return 'Needs Improvement';
    };

    const metrics = [
        { key: 'overview', label: 'Overview', icon: TrendingUp },
        { key: 'peer', label: 'Peer Reviews', icon: User },
        { key: 'self', label: 'Self Assessment', icon: FileText },
        { key: 'customer', label: 'Customer Feedback', icon: Star }
    ];

    return (
        <div className="p-6 space-y-6">
            {/* Performance Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg border p-4 shadow-sm">
                    <div className="flex items-center gap-2">
                        <TrendingUp className={`w-5 h-5 text-${getScoreColor(performanceScore)}-600`} />
                        <h3 className="font-medium text-gray-900">Overall Score</h3>
                    </div>
                    <div className="mt-2">
                        <p className={`text-2xl font-bold text-${getScoreColor(performanceScore)}-600`}>{performanceScore}/100</p>
                        <p className={`text-sm text-${getScoreColor(performanceScore)}-600`}>{getScoreLabel(performanceScore)}</p>
                    </div>
                </div>
                
                <div className="bg-white rounded-lg border p-4 shadow-sm">
                    <div className="flex items-center gap-2">
                        <User className="w-5 h-5 text-blue-600" />
                        <h3 className="font-medium text-gray-900">Peer Rating</h3>
                    </div>
                    <div className="mt-2">
                        <p className="text-2xl font-bold text-blue-600">{peerEvaluations.averageScore || 0}/5</p>
                        <p className="text-sm text-gray-600">{peerEvaluations.totalReviews || 0} reviews</p>
                    </div>
                </div>
                
                <div className="bg-white rounded-lg border p-4 shadow-sm">
                    <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-green-600" />
                        <h3 className="font-medium text-gray-900">Revenue Impact</h3>
                    </div>
                    <div className="mt-2">
                        <p className="text-2xl font-bold text-green-600">${totalRevenue.toLocaleString()}</p>
                        <p className="text-sm text-gray-600">{totalProjects} projects</p>
                    </div>
                </div>
                
                <div className="bg-white rounded-lg border p-4 shadow-sm">
                    <div className="flex items-center gap-2">
                        <Target className="w-5 h-5 text-purple-600" />
                        <h3 className="font-medium text-gray-900">Goals Met</h3>
                    </div>
                    <div className="mt-2">
                        <p className="text-2xl font-bold text-purple-600">{goalsCompletion}%</p>
                        <p className="text-sm text-gray-600">This quarter</p>
                    </div>
                </div>
            </div>

            {/* Metric Navigation */}
            <div className="bg-white rounded-lg border shadow-sm">
                <div className="border-b">
                    <nav className="flex space-x-8 px-6">
                        {metrics.map((metric) => {
                            const Icon = metric.icon;
                            return (
                                <button
                                    key={metric.key}
                                    onClick={() => setSelectedMetric(metric.key)}
                                    className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                                        selectedMetric === metric.key
                                            ? 'border-purple-500 text-purple-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                                >
                                    <Icon className="h-4 w-4 mr-2" />
                                    {metric.label}
                                </button>
                            );
                        })}
                    </nav>
                </div>

                <div className="p-6">
                    {selectedMetric === 'overview' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Overview</h3>
                                
                                {/* Performance Chart */}
                                <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6">
                                    <h4 className="font-medium text-gray-900 mb-4">Performance Trend</h4>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-600">Communication</span>
                                            <div className="flex items-center gap-2">
                                                <div className="w-32 bg-gray-200 rounded-full h-2">
                                                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: '85%' }}></div>
                                                </div>
                                                <span className="text-sm font-medium text-blue-600">85%</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-600">Technical Skills</span>
                                            <div className="flex items-center gap-2">
                                                <div className="w-32 bg-gray-200 rounded-full h-2">
                                                    <div className="bg-green-600 h-2 rounded-full" style={{ width: '92%' }}></div>
                                                </div>
                                                <span className="text-sm font-medium text-green-600">92%</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-600">Project Management</span>
                                            <div className="flex items-center gap-2">
                                                <div className="w-32 bg-gray-200 rounded-full h-2">
                                                    <div className="bg-yellow-600 h-2 rounded-full" style={{ width: '78%' }}></div>
                                                </div>
                                                <span className="text-sm font-medium text-yellow-600">78%</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-600">Leadership</span>
                                            <div className="flex items-center gap-2">
                                                <div className="w-32 bg-gray-200 rounded-full h-2">
                                                    <div className="bg-purple-600 h-2 rounded-full" style={{ width: '80%' }}></div>
                                                </div>
                                                <span className="text-sm font-medium text-purple-600">80%</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                </div>
            )}

                    {selectedMetric === 'peer' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-gray-900">Peer Evaluations</h3>
                                <div className="flex items-center gap-2">
                                    <Star className="w-5 h-5 text-yellow-500" />
                                    <span className="font-medium">{peerEvaluations.averageScore || 0}/5 Average</span>
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                {peerEvaluations.feedback && peerEvaluations.feedback.length > 0 ? (
                                    peerEvaluations.feedback.map((feedback, index) => (
                                        <div key={index} className="border rounded-lg p-4">
                                            <div className="flex items-start gap-3">
                                                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                                                    <User className="w-4 h-4 text-gray-600" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="font-medium text-gray-900">Anonymous</span>
                                                        <span className="text-xs text-gray-500">Peer Review</span>
                                                    </div>
                                                    <p className="text-sm text-gray-700 leading-relaxed">"{feedback}"</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center text-gray-500 py-8">
                                        <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                        <p>No peer evaluations available</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {selectedMetric === 'self' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-gray-900">Self Assessment</h3>
                                <Button 
                                    onClick={() => setShowSelfAssessment(!showSelfAssessment)}
                                    className="flex items-center gap-2"
                                >
                                    <Edit3 className="w-4 h-4" />
                                    Update Assessment
                                </Button>
                            </div>
                            
                            {showSelfAssessment && (
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <h4 className="font-medium text-gray-900 mb-3">Update Your Self Assessment</h4>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Key Strengths</label>
                                            <textarea
                                                value={strengths}
                                                onChange={(e) => setStrengths(e.target.value)}
                                                placeholder="List your key strengths and achievements (one per line)..."
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                                rows={3}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Areas for Growth</label>
                                            <textarea
                                                value={growthAreas}
                                                onChange={(e) => setGrowthAreas(e.target.value)}
                                                placeholder="Identify areas where you'd like to improve (one per line)..."
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                                rows={3}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Goals</label>
                                            <textarea
                                                value={goals}
                                                onChange={(e) => setGoals(e.target.value)}
                                                placeholder="List your personal goals (one per line)..."
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                                rows={3}
                                            />
                                        </div>
                                        {saveMessage && (
                                            <div className={`text-sm p-2 rounded ${saveMessage.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                                {saveMessage}
                                            </div>
                                        )}
                                        <div className="flex gap-3 pt-2">
                                            <Button 
                                                onClick={handleSelfAssessmentSave}
                                                disabled={saving}
                                                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-medium px-6 py-2.5 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {saving ? (
                                                    <>
                                                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                                        Saving Assessment...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Save className="w-4 h-4 mr-2" />
                                                        Save Assessment
                                                    </>
                                                )}
                                            </Button>
                                            <Button 
                                                variant="outline" 
                                                onClick={() => setShowSelfAssessment(false)}
                                                className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 font-medium px-6 py-2.5 rounded-lg transition-all duration-200"
                                            >
                                                <X className="w-4 h-4 mr-2" />
                                                Cancel
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="border rounded-lg p-4">
                                    <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                                        <Award className="w-4 h-4 text-green-600" />
                                        Strengths
                                    </h4>
                                    {selfAssessments.strengths && selfAssessments.strengths.length > 0 ? (
                                        <ul className="space-y-2">
                                            {selfAssessments.strengths.map((strength, index) => (
                                                <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                                                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2"></div>
                                                    {strength}
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-sm text-gray-500">No strengths recorded</p>
                                    )}
                                </div>
                                
                                <div className="border rounded-lg p-4">
                                    <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                                        <Target className="w-4 h-4 text-blue-600" />
                                        Growth Areas
                                    </h4>
                                    {selfAssessments.growthAreas && selfAssessments.growthAreas.length > 0 ? (
                                        <ul className="space-y-2">
                                            {selfAssessments.growthAreas.map((area, index) => (
                                                <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                                                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2"></div>
                                                    {area}
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-sm text-gray-500">No growth areas identified</p>
                                    )}
                                </div>
                            </div>
                            
                            {selfAssessments.lastUpdated && (
                                <p className="text-xs text-gray-500">
                                    Last updated: {selfAssessments.lastUpdated}
                                </p>
                            )}
                        </div>
                    )}

                    {selectedMetric === 'customer' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-gray-900">Customer Feedback</h3>
                                {customerFeedback.length > 0 && (
                                    <div className="flex items-center gap-2">
                                        <Star className="w-5 h-5 text-yellow-500" />
                                        <span className="font-medium">
                                            {customerFeedback.length > 0 
                                                ? (customerFeedback.reduce((sum, feedback) => sum + feedback.rating, 0) / customerFeedback.length).toFixed(1)
                                                : 0
                                            }/5 Average ({customerFeedback.length} reviews)
                                        </span>
                                    </div>
                                )}
                            </div>
                            
                            {loadingCustomerFeedback ? (
                                <div className="text-center text-gray-500 py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-3"></div>
                                    <p>Loading customer feedback...</p>
                                </div>
                            ) : customerFeedbackError ? (
                                <div className="text-center text-red-500 py-8">
                                    <p>{customerFeedbackError}</p>
                                </div>
                            ) : customerFeedback.length > 0 ? (
                                <div className="space-y-4">
                                    {customerFeedback.map((feedback) => (
                                        <div key={feedback.id} className="border rounded-lg p-4">
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex items-start gap-3">
                                                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                                        <User className="w-4 h-4 text-blue-600" />
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-gray-900">
                                                            {feedback.customer_name || 'Customer'}
                                                        </div>
                                                        <div className="text-sm text-gray-600">
                                                            {feedback.company}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    {[...Array(5)].map((_, i) => (
                                                        <Star 
                                                            key={i} 
                                                            className={`w-4 h-4 ${i < feedback.rating ? 'text-yellow-500 fill-current' : 'text-gray-300'}`} 
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                            {feedback.comment && (
                                                <p className="text-sm text-gray-700 leading-relaxed mb-2">"{feedback.comment}"</p>
                                            )}
                                            <span className="text-xs text-gray-400">
                                                {feedback.created_at ? new Date(feedback.created_at).toLocaleDateString() : 'Recent'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center text-gray-500 py-8">
                                    <Star className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                    <p>No customer feedback available</p>
                                    <p className="text-sm mt-1">Customer feedback will appear here once submitted</p>
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default PerformanceAssessmentTab;