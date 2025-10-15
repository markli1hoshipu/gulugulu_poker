import React from 'react';
import { X, Trophy, Award, TrendingUp, Heart, User, Calendar, Star, DollarSign } from 'lucide-react';
import { Button } from '../../ui/button';

const HighlightDetailModal = ({ 
  isOpen, 
  onClose, 
  highlightType, 
  employee 
}) => {
  if (!isOpen || !employee) return null;

  const getHighlightContent = () => {
    switch (highlightType) {
      case 'revenue':
        return {
          title: 'Highest Revenue Contributor',
          icon: <Trophy className="w-8 h-8 text-yellow-500" />,
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          content: (
            <div className="space-y-4">
              <div className="bg-white rounded-lg p-4 border">
                <h4 className="font-semibold text-gray-900 mb-2">Revenue Performance</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-500">Total Revenue</span>
                    <p className="text-2xl font-bold text-yellow-600">
                      ${(employee.performance?.total_revenue || 0).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Projects</span>
                    <p className="text-2xl font-bold text-gray-900">
                      {employee.performance?.total_projects || 0}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 border">
                <h4 className="font-semibold text-gray-900 mb-2">Recent Achievements</h4>
                <ul className="space-y-2">
                  {employee.performance?.top_projects?.slice(0, 3).map((project, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-green-500" />
                      <span className="text-sm">{project.name}: ${project.revenue?.toLocaleString() || 0}</span>
                    </li>
                  )) || (
                    <li className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-green-500" />
                      <span className="text-sm">No recent projects available</span>
                    </li>
                  )}
                </ul>
              </div>
            </div>
          )
        };
      
      case 'experience':
        return {
          title: 'Most Experienced Team Member',
          icon: <Award className="w-8 h-8 text-blue-500" />,
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          content: (
            <div className="space-y-4">
              <div className="bg-white rounded-lg p-4 border">
                <h4 className="font-semibold text-gray-900 mb-2">Experience Overview</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-500">Years of Experience</span>
                    <p className="text-2xl font-bold text-blue-600">
                      {employee.working_year || employee.experience || 0} years
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Specializations</span>
                    <p className="text-2xl font-bold text-gray-900">
                      {employee.specialties?.length || 0}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 border">
                <h4 className="font-semibold text-gray-900 mb-2">Key Expertise</h4>
                <div className="flex flex-wrap gap-2">
                  {(employee.specialties || []).map((skill, index) => (
                    <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                      {skill}
                    </span>
                  ))}
                  {(employee.specialties || []).length === 0 && (
                    <span className="text-sm text-gray-500">No specialties listed</span>
                  )}
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 border">
                <h4 className="font-semibold text-gray-900 mb-2">Career Highlights</h4>
                <ul className="space-y-2">
                  {employee.performance?.milestones?.map((milestone, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-500" />
                      <span className="text-sm">{milestone.label} ({milestone.year})</span>
                    </li>
                  )) || (
                    <>
                      <li className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-blue-500" />
                        <span className="text-sm">Joined company in {employee.hire_date ? new Date(employee.hire_date).getFullYear() : 'N/A'}</span>
                      </li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          )
        };
      
      case 'performance':
        return {
          title: 'Top Recent Performance',
          icon: <TrendingUp className="w-8 h-8 text-green-500" />,
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          content: (
            <div className="space-y-4">
              <div className="bg-white rounded-lg p-4 border">
                <h4 className="font-semibold text-gray-900 mb-2">Performance Metrics</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-500">Overall Score</span>
                    <p className="text-2xl font-bold text-green-600">
                      {employee.performance?.performance_score || 0}%
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Completion Rate</span>
                    <p className="text-2xl font-bold text-gray-900">
                      {employee.completion_rate || 0}%
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 border">
                <h4 className="font-semibold text-gray-900 mb-2">Recent Performance</h4>
                <div className="space-y-3">
                  {employee.performance?.self_assessments?.strengths?.length > 0 ? (
                    employee.performance.self_assessments.strengths.map((strength, idx) => (
                      <div key={idx} className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">{strength}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div className="bg-green-500 h-2 rounded-full" style={{ width: '92%' }}></div>
                          </div>
                          <span className="text-sm font-medium">92%</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Project Quality</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div className="bg-green-500 h-2 rounded-full" style={{ width: '92%' }}></div>
                          </div>
                          <span className="text-sm font-medium">92%</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Team Collaboration</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div className="bg-green-500 h-2 rounded-full" style={{ width: '88%' }}></div>
                          </div>
                          <span className="text-sm font-medium">88%</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )
        };
      
      case 'feedback':
        return {
          title: 'Best Feedback Rating',
          icon: <Heart className="w-8 h-8 text-purple-500" />,
          bgColor: 'bg-purple-50',
          borderColor: 'border-purple-200',
          content: (
            <div className="space-y-4">
              <div className="bg-white rounded-lg p-4 border">
                <h4 className="font-semibold text-gray-900 mb-2">Feedback Summary</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-500">Average Rating</span>
                    <p className="text-2xl font-bold text-purple-600">
                      {(employee.feedback_rating || employee.performance?.peer_evaluations?.averageScore || 0).toFixed(1)} ⭐
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Reviews</span>
                    <p className="text-2xl font-bold text-gray-900">
                      {employee.feedback_count || employee.performance?.peer_evaluations?.totalReviews || 0}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 border">
                <h4 className="font-semibold text-gray-900 mb-2">Recent Feedback</h4>
                <div className="space-y-3">
                  {employee.feedback_comment ? (
                    <div className="border-l-4 border-purple-500 pl-4">
                      <p className="text-sm text-gray-700 italic">"{employee.feedback_comment}"</p>
                      <p className="text-xs text-gray-500 mt-1">- Customer</p>
                    </div>
                  ) : employee.performance?.peer_evaluations?.feedback?.length > 0 ? (
                    employee.performance.peer_evaluations.feedback.map((feedback, idx) => (
                      <div key={idx} className={`border-l-4 border-${idx % 3 === 0 ? 'purple' : idx % 3 === 1 ? 'blue' : 'green'}-500 pl-4`}>
                        <p className="text-sm text-gray-700 italic">"{feedback}"</p>
                        <p className="text-xs text-gray-500 mt-1">- Colleague, {idx + 1} {idx === 0 ? 'week' : 'weeks'} ago</p>
                      </div>
                    ))
                  ) : (
                    <div className="border-l-4 border-purple-500 pl-4">
                      <p className="text-sm text-gray-700 italic">
                        "No feedback available yet."
                      </p>
                      <p className="text-xs text-gray-500 mt-1">- System</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        };
      
      default:
        return null;
    }
  };

  const highlightContent = getHighlightContent();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className={`p-6 border-b ${highlightContent.bgColor} ${highlightContent.borderColor}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
                {highlightContent.icon}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{highlightContent.title}</h2>
                <p className="text-gray-600">Detailed information for {employee.name}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </Button>
          </div>
        </div>

        {/* Employee Info */}
        <div className="p-6 border-b bg-gray-50">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-purple-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">{employee.name}</h3>
              <p className="text-gray-600">{employee.role}</p>
              <p className="text-sm text-purple-600 font-medium">{employee.department}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-300px)]">
          {highlightContent.content}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Last updated: {new Date().toLocaleDateString()}
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={onClose}
              >
                Close
              </Button>
              <Button
                className="bg-purple-600 hover:bg-purple-700"
                onClick={() => {
                  // In a real app, this would open the full employee profile
                  console.log('View full profile for:', employee.name);
                }}
              >
                View Full Profile
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HighlightDetailModal; 