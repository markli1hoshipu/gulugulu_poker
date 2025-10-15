import React, { useState, useEffect } from 'react';
import { 
    Target, TrendingUp, Award, Star 
} from 'lucide-react';
import employeeApiService from '../../services/employeeApi';
import GoalSettingSection from '../../components/employee/sections/GoalSettingSection';
import ProjectManagementSection from '../../components/employee/sections/ProjectManagementSection';
import MilestoneManagementSection from '../../components/employee/sections/MilestoneManagementSection';

const ProjectsGoalsTab = ({ employee, performanceData: _initialPerformanceData, setPerformanceData: setInitialPerformanceData }) => {
    
    // State for performance data
    const [performanceData, setPerformanceData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Calculate total revenue from projects array as fallback
    const calculateTotalRevenue = (projectsList) => {
        try {
            if (!projectsList || !Array.isArray(projectsList)) {
                return 0;
            }
            
            return projectsList.reduce((total, project) => {
                if (project && typeof project.revenue === 'number' && project.revenue >= 0) {
                    return total + project.revenue;
                }
                return total;
            }, 0);
        } catch (error) {
            console.error('Error calculating total revenue in ProjectsGoalsTab:', error);
            return 0;
        }
    };
    
    // UI state
    const [_selectedProject, _setSelectedProject] = useState(null);
    
    // Goals state for GoalSettingSection
    const [employeeGoals, setEmployeeGoals] = useState([]);
    
    // Projects and milestones state
    const [projects, setProjects] = useState([]);
    const [milestones, setMilestones] = useState([]);

    // Fetch performance data when employee changes
    useEffect(() => {
        const fetchPerformanceData = async () => {
            if (!employee?.id) {
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);

            try {
                const data = await employeeApiService.getEmployeePerformance(employee.id);
                setPerformanceData(data);
                
                // Set individual arrays for management sections
                setProjects(data.projects || []);
                setMilestones(data.milestones || []);
                
                // Update parent component's performance data as well
                if (setInitialPerformanceData) {
                    setInitialPerformanceData(data);
                }
            } catch (err) {
                console.error('Error fetching employee performance:', err);
                setError('Failed to load performance data');
            } finally {
                setLoading(false);
            }
        };

        fetchPerformanceData();
    }, [employee?.id, setInitialPerformanceData]);

    // Don't render if no employee selected
    if (!employee) {
        return (
            <div className="space-y-6">
                <div className="bg-white rounded-lg border p-5 shadow-sm">
                    <p className="text-gray-500">No employee selected.</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="bg-white rounded-lg border p-5 shadow-sm">
                    <p className="text-gray-500">Loading performance data...</p>
                </div>
            </div>
        );
    }

    if (!performanceData) {
        return (
            <div className="space-y-6">
                <div className="bg-white rounded-lg border p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                        <Target className="w-5 h-5 text-yellow-600" />
                        <p className="text-gray-600">No performance data available.</p>
                    </div>
                </div>
            </div>
        );
    }

    // Update parent performance data when local state changes
    const updateParentPerformanceData = (updatedData) => {
        setPerformanceData(updatedData);
        if (setInitialPerformanceData) {
            setInitialPerformanceData(updatedData);
        }
    };



    return (
        <div className="space-y-6">
            {/* Error Display */}
            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
                    {error}
                    <button
                        className="absolute top-0 bottom-0 right-0 px-4 py-3"
                        onClick={() => setError(null)}
                    >
                        <span className="sr-only">Dismiss</span>
                        ×
                    </button>
                </div>
            )}

            {/* Performance Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg border p-4 shadow-sm">
                    <div className="flex items-center gap-2">
                        <Target className="w-5 h-5 text-blue-600" />
                        <h3 className="font-medium text-gray-900">Active Projects</h3>
                    </div>
                    <p className="text-2xl font-bold text-blue-600 mt-2">{projects.length}</p>
                </div>
                <div className="bg-white rounded-lg border p-4 shadow-sm">
                    <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-green-600" />
                        <h3 className="font-medium text-gray-900">Total Revenue</h3>
                    </div>
                    <p className="text-2xl font-bold text-green-600 mt-2">
                        ${(performanceData?.total_revenue || calculateTotalRevenue(projects)).toLocaleString()}
                    </p>
                </div>
                <div className="bg-white rounded-lg border p-4 shadow-sm">
                    <div className="flex items-center gap-2">
                        <Award className="w-5 h-5 text-purple-600" />
                        <h3 className="font-medium text-gray-900">Goals</h3>
                    </div>
                    <p className="text-2xl font-bold text-purple-600 mt-2">{employeeGoals.length}</p>
                </div>
                <div className="bg-white rounded-lg border p-4 shadow-sm">
                    <div className="flex items-center gap-2">
                        <Star className="w-5 h-5 text-yellow-600" />
                        <h3 className="font-medium text-gray-900">Milestones</h3>
                    </div>
                    <p className="text-2xl font-bold text-yellow-600 mt-2">{milestones.length}</p>
                </div>
            </div>

            {/* Goals Management */}
            <GoalSettingSection
                employeeId={employee?.id}
                goals={employeeGoals}
                setGoals={setEmployeeGoals}
            />

            {/* Projects Management */}
            <ProjectManagementSection
                employeeId={employee?.id}
                projects={projects}
                setProjects={setProjects}
                performanceData={performanceData}
                setPerformanceData={updateParentPerformanceData}
            />



            {/* Milestones Management */}
            <MilestoneManagementSection
                employeeId={employee?.id}
                milestones={milestones}
                setMilestones={setMilestones}
                performanceData={performanceData}
                setPerformanceData={updateParentPerformanceData}
            />


        </div>
    );
};

export default ProjectsGoalsTab;