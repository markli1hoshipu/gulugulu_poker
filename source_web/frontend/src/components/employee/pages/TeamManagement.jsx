import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { UserCheck, Users, UserSearch } from 'lucide-react';
import UnifiedHeader from '../../common/header/UnifiedHeader';
import { EmployeeProfileProvider } from '../context/EmployeeProfileContext';
import { EmployeeDataProvider, useEmployeeData } from '../../../contexts/EmployeeDataContext';
import EmployeeProfileModal from '../modals/EmployeeProfileModal';
import LeadCustomerDetailModal from '../modals/LeadCustomerDetailModal';
import AddLeadModal from '../modals/AddLeadModal';
import AddCustomerModal from '../modals/AddCustomerModal';
import EmployeeManagementTab from '../tabs/EmployeeManagementTab';
import CustomerMatchingTab from '../tabs/CustomerMatchingTab';

// Inner component that uses the context
const TeamManagementInner = ({ wsConnection }) => {
  const { refreshData } = useEmployeeData();
  const [activeMainTab, setActiveMainTab] = useState('employee-management');

  const mainTabs = [
    {
      id: 'employee-management',
      label: 'Employee Management',
      icon: Users,
      description: 'Manage employees, track performance, and view team analytics'
    },
    {
      id: 'customer-matching',
      label: 'Customer Matching',
      icon: UserSearch,
      description: 'AI-powered customer-employee matching and assignments'
    }
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <UnifiedHeader
        title="Team Management"
        description="Manage employees, track performance, and optimize team assignments"
        icon={UserCheck}
        themeColor="green"
        tabs={mainTabs.map(tab => ({
          id: tab.id,
          label: tab.label,
          icon: tab.icon,
          isActive: activeMainTab === tab.id,
          onClick: () => setActiveMainTab(tab.id)
        }))}
      />

      {/* Tab Content and Modals wrapped in EmployeeProfileProvider */}
      <EmployeeProfileProvider onEmployeeRefresh={refreshData}>
        <div className="flex-1 overflow-hidden">
          {activeMainTab === 'employee-management' && (
            <motion.div
              key="employee-management"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <EmployeeManagementTab />
            </motion.div>
          )}

          {activeMainTab === 'customer-matching' && (
            <motion.div
              key="customer-matching"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <CustomerMatchingTab />
            </motion.div>
          )}
        </div>

        {/* Modals */}
        <EmployeeProfileModal />
        <LeadCustomerDetailModal />
        <AddLeadModal />
        <AddCustomerModal />
      </EmployeeProfileProvider>
    </div>
  );
};

// Main component with context providers
const TeamManagement = ({ wsConnection }) => {
  return (
    <EmployeeDataProvider>
      <TeamManagementInner wsConnection={wsConnection} />
    </EmployeeDataProvider>
  );
};

export default TeamManagement;