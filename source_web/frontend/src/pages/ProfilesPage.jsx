import React, { useState, useEffect } from 'react';
import { motion as _motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
    User, ArrowLeft, RefreshCw
} from 'lucide-react';
import { useAuth } from '../auth/hooks/useAuth';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import Navigation from '../components/Navigation';
import AnimatedBackground from '../components/AnimatedBackground';
import employeeApiService, { EmployeeApiError } from '../services/employeeApi';

// Import tab components
import BasicInformationTab from './tabs/BasicInformationTab';
import ProjectsGoalsTab from './tabs/ProjectsGoalsTab';
import PerformanceAssessmentTab from './tabs/PerformanceAssessmentTab';

const ProfilesPage = () => {
    console.log('ProfilesPage: Component initializing');
    const { user } = useAuth();
    console.log('ProfilesPage: User from auth:', user);
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('basic');
    const [loading, setLoading] = useState(true);
    const [employee, setEmployee] = useState(null);
    const [performanceData, setPerformanceData] = useState(null);

    // Tab configuration
    const tabs = [
        { id: 'basic', label: 'Basic Information', icon: User },
        { id: 'projects', label: 'Projects & Goals', icon: User },
        { id: 'performance', label: 'Performance & Assessment', icon: User }
    ];

    // Load employee data on component mount
    useEffect(() => {
        console.log('ProfilesPage: useEffect triggered, user?.email:', user?.email);
        const loadEmployeeData = async () => {
            if (!user?.email) {
                console.log('ProfilesPage: No user email available, skipping data load');
                return;
            }

            try {
                console.log('ProfilesPage: Starting to load employee data for email:', user.email);
                setLoading(true);
                
                // Get employee by email
                console.log('ProfilesPage: Calling getEmployeeByEmail with:', user.email);
                const employeeData = await employeeApiService.getEmployeeByEmail(user.email);
                console.log('ProfilesPage: Employee data received:', employeeData);
                setEmployee(employeeData);

                // Get performance data
                try {
                    console.log('ProfilesPage: Loading performance data for employee ID:', employeeData.id);
                    const performance = await employeeApiService.getEmployeePerformance(employeeData.id);
                    console.log('ProfilesPage: Performance data received:', performance);
                    setPerformanceData(performance);
                } catch (error) {
                    console.warn('ProfilesPage: Performance data not available:', error);
                    // Continue without performance data
                }

            } catch (error) {
                console.error('ProfilesPage: Error loading employee data:', error);
                console.error('ProfilesPage: Error details:', error.message, error.status);
                // Handle case where user is not found in employee database
            } finally {
                console.log('ProfilesPage: Finished loading data, setting loading to false');
                setLoading(false);
            }
        };

        loadEmployeeData();
    }, [user?.email]);



    const renderTabContent = () => {
        console.log('ProfilesPage: renderTabContent called - loading:', loading, 'employee:', employee, 'activeTab:', activeTab);
        
        if (loading) {
            console.log('ProfilesPage: Rendering loading state');
            return (
                <div className="flex items-center justify-center py-12">
                    <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
                    <span className="ml-2 text-gray-600">Loading profile data...</span>
                </div>
            );
        }

        if (!employee) {
            console.log('ProfilesPage: No employee data, rendering not found message');
            return (
                <div className="text-center py-12">
                    <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Employee Profile Not Found</h3>
                    <p className="text-gray-600 mb-4">
                        Your email ({user?.email}) is not associated with an employee record.
                    </p>
                    <Button onClick={() => navigate('/dashboard')}>
                        Return to Dashboard
                    </Button>
                </div>
            );
        }

        console.log('ProfilesPage: Rendering tab content for tab:', activeTab);
        switch (activeTab) {
            case 'basic':
                console.log('ProfilesPage: Rendering BasicInformationTab');
                return <BasicInformationTab employee={employee} setEmployee={setEmployee} />;
            case 'projects':
                console.log('ProfilesPage: Rendering ProjectsGoalsTab');
                return <ProjectsGoalsTab employee={employee} performanceData={performanceData} setPerformanceData={setPerformanceData} />;
            case 'performance':
                console.log('ProfilesPage: Rendering PerformanceAssessmentTab');
                return <PerformanceAssessmentTab employee={employee} performanceData={performanceData} setPerformanceData={setPerformanceData} />;
            default:
                console.log('ProfilesPage: Unknown tab, returning null');
                return null;
        }
    };



    return (
        <div>
            <Navigation />
            <AnimatedBackground 
                gradientFrom="blue-50" 
                gradientVia="purple-50" 
                gradientTo="pink-50"
            >
                <div className="pt-20 pb-12">
                    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Header */}
                    <_motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="mb-8"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <button
                                    onClick={() => navigate('/dashboard')}
                                    className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
                                >
                                    <ArrowLeft className="h-4 w-4 mr-2" />
                                    Back to Dashboard
                                </button>
                                <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
                                <p className="text-gray-600 mt-2">
                                    Manage your personal information and professional development
                                </p>
                            </div>
                            

                        </div>
                    </_motion.div>

                    {/* Tab Navigation */}
                    <_motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className="mb-8"
                    >
                        <div className="border-b border-gray-200">
                            <nav className="-mb-px flex space-x-8">
                                {tabs.map((tab) => {
                                    const Icon = tab.icon;
                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                                                activeTab === tab.id
                                                    ? 'border-blue-500 text-blue-600'
                                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                            }`}
                                        >
                                            <Icon className="h-4 w-4 mr-2" />
                                            {tab.label}
                                        </button>
                                    );
                                })}
                            </nav>
                        </div>
                    </_motion.div>

                    {/* Tab Content */}
                    <_motion.div
                        key={activeTab}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4 }}
                        className="bg-white rounded-lg shadow-sm"
                    >
                        {renderTabContent()}
                    </_motion.div>
                    </div>
                </div>
            </AnimatedBackground>
        </div>
    );
};

export default ProfilesPage;