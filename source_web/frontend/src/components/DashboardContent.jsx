import React from 'react';
import { CalendarIntegration } from './calendar';
import LeadGenerationHub from './lead-gen/LeadGenerationHub';
import TeamManagement from './employee/pages/TeamManagement';
import SalesCenter from './sales-center/SalesCenter';
import CRMWrapper from './crm/CRMWrapper';
import UsageAnalytics from './analytics/UsageAnalytics';
import UserOnboardingPage from './invitations/UserOnboardingPage';

import Dashboard from './dashboard/NewDashboard';
import FunLoadingScreen from './FunLoadingScreen';

import { useUserRole } from '../hooks/useUserRole';

const DashboardContent = ({ currentView, wsConnection, className = "" }) => {
    const { hasPermission, userRole, isAuthenticated, isLoading } = useUserRole();

    const renderContent = () => {
        // Show loading state while authentication and roles are being determined
        if (isLoading || isAuthenticated === null) {
            return null; // Return null and let the parent handle loading
        }

        // If user is not authenticated after loading is complete
        if (!isAuthenticated) {
            return (
                <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold text-gray-600 mb-2">Access Denied</h2>
                        <p className="text-gray-500">Please log in to access this content.</p>
                    </div>
                </div>
            );
        }

        // Check if user has permission for the current view (only after loading is complete)
        if (!hasPermission(currentView)) {
            return (
                <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold text-gray-600 mb-2">Access Restricted</h2>
                        <p className="text-gray-500 mb-1">
                            You don't have permission to access the "{currentView}" section.
                        </p>
                        <p className="text-sm text-gray-400">
                            Current role: <span className="font-medium">{userRole}</span>
                        </p>
                    </div>
                </div>
            );
        }

        switch (currentView) {
            case 'dashboard':
                return <Dashboard wsConnection={wsConnection} />;
            case 'calendar':
                return <CalendarIntegration />;
//                 return <GoogleCalendar wsConnection={wsConnection} />;
            case 'leads':
                return <LeadGenerationHub key="leads" wsConnection={wsConnection} />;
            case 'employees':
                return <TeamManagement wsConnection={wsConnection} />;
            case 'sales-center':
                return <SalesCenter wsConnection={wsConnection} />;
            case 'crm':
                return <CRMWrapper wsConnection={wsConnection} />;
            case 'usage-analytics':
                return <UsageAnalytics wsConnection={wsConnection} />;
            case 'user-onboarding':
                return <UserOnboardingPage wsConnection={wsConnection} />;
            default:
                return <Dashboard wsConnection={wsConnection} />;
//                 return <GoogleCalendar wsConnection={wsConnection} />;
        }
    };

    return (
        <div className={`h-full main-content overflow-hidden ${className}`}>
            {renderContent()}
        </div>
    );
};

export default DashboardContent; 
