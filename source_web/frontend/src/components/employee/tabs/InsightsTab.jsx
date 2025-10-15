import React from 'react';
import {
  Brain,
  Activity,
  Zap,
  CheckCircle,
  TrendingUp,
  Target,
  Award,
  ArrowUp,
  Clock
} from 'lucide-react';
import { useEmployeeProfile } from '../context/EmployeeProfileContext';
import { generateInsights, getSpecializationProficiency } from '../../../data/employeeProfiles/insightsData';

const InsightsTab = () => {
  const { selectedEmployee } = useEmployeeProfile();
  const insights = generateInsights(selectedEmployee);

  return (
    <div className="space-y-6">
      {/* Success Factors Analysis */}
      <div className="bg-white rounded-lg border p-6 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-600" />
          Success Factors Analysis
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Performance Insights */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Performance Insights</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium">Performance Score</span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-green-700">
                    {insights.performanceInsights.score}/100
                  </div>
                  <div className="text-xs text-green-600">
                    {insights.performanceInsights.rating}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium">Deals Won</span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-blue-700">
                    {insights.performanceInsights.dealsWon}
                  </div>
                  <div className="text-xs text-blue-600">
                    {insights.performanceInsights.dealsWon >= 5 ? 'High Closer' :
                     insights.performanceInsights.dealsWon >= 2 ? 'Moderate' : 'Growing'}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-medium">Response Time</span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-purple-700">
                    {insights.performanceInsights.responseTime}
                  </div>
                  <div className="text-xs text-purple-600">
                    {insights.performanceInsights.responseTime?.includes('hour') ? 'Excellent' : 'Good'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Specialization Analysis */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Specialization Strength</h4>
            <div className="space-y-3">
              {selectedEmployee.specialties?.slice(0, 3).map((specialty, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium">{specialty}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-gray-700">
                      {getSpecializationProficiency(selectedEmployee.specialties, index)}%
                    </div>
                    <div className="text-xs text-gray-500">Proficiency</div>
                  </div>
                </div>
              )) || (
                <div className="text-sm text-gray-500">No specialties defined</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Department Benchmarking */}
      <div className="bg-white rounded-lg border p-6 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-600" />
          Department Benchmarking
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-700">
              {insights.performanceInsights.score}
            </div>
            <div className="text-sm text-blue-600">Your Score</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-700">
              {insights.departmentAverage}
            </div>
            <div className="text-sm text-gray-600">Dept Average</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-700">
              {insights.vsAverage.sign}{insights.vsAverage.difference}
            </div>
            <div className="text-sm text-green-600">vs Average</div>
          </div>
        </div>
      </div>

      {/* Success Patterns */}
      <div className="bg-white rounded-lg border p-6 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-600" />
          Key Success Patterns
        </h3>
        <div className="space-y-4">
          {/* Experience Factor */}
          <div className="flex items-start gap-3 p-4 bg-yellow-50 rounded-lg">
            <CheckCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-gray-900">Experience Advantage</h4>
              <p className="text-sm text-gray-600">
                {insights.successPatterns.experienceAdvantage}
              </p>
            </div>
          </div>

          {/* Strength Utilization */}
          <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-gray-900">Strength Utilization</h4>
              <p className="text-sm text-gray-600">
                {insights.successPatterns.strengthUtilization}
              </p>
            </div>
          </div>

          {/* Department Fit */}
          <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg">
            <CheckCircle className="w-5 h-5 text-purple-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-gray-900">Department Alignment</h4>
              <p className="text-sm text-gray-600">
                {insights.successPatterns.departmentAlignment}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-white rounded-lg border p-6 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Brain className="w-5 h-5 text-indigo-600" />
          Growth Recommendations
        </h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-4 bg-indigo-50 rounded-lg">
            <ArrowUp className="w-5 h-5 text-indigo-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-gray-900">Leverage Strengths</h4>
              <p className="text-sm text-gray-600">
                {insights.growthRecommendations.leverageStrengths}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
            <Target className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-gray-900">Address Challenges</h4>
              <p className="text-sm text-gray-600">
                {insights.growthRecommendations.addressChallenges}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
            <Award className="w-5 h-5 text-green-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-gray-900">Career Growth</h4>
              <p className="text-sm text-gray-600">
                {insights.growthRecommendations.careerGrowth}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InsightsTab; 