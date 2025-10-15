import React, { createContext, useContext, useState } from 'react';
import { CheckCircle, AlertCircle, Clock, Coffee } from 'lucide-react';
import { DEFAULT_NEGOTIATION_STEPS } from '../constants';
import employeeApiService from '../../../services/employeeApi';
import { getCustomerInteractionData } from '../../../data/employeeProfiles/customerInteractionData';

const EmployeeProfileContext = createContext();

export const useEmployeeProfile = () => {
  const context = useContext(EmployeeProfileContext);
  if (!context) {
    throw new Error('useEmployeeProfile must be used within an EmployeeProfileProvider');
  }
  return context;
};

export const EmployeeProfileProvider = ({ children, onEmployeeRefresh }) => {
  // Core employee state
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeLeads, setEmployeeLeads] = useState([]);
  const [employeeCustomers, setEmployeeCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Modal states
  const [showAddLead, setShowAddLead] = useState(false);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  
  // Form states
  const [newLead, setNewLead] = useState({ name: '', lastContactDate: '', currentStage: 'Contacted', progress: 0 });
  const [newCustomer, setNewCustomer] = useState({ name: '', lastContactDate: '', currentStage: 'Warm', progress: 0 });
  const [newEmployee, setNewEmployee] = useState({ 
    name: '', 
    employee_id: '', 
    start_date: '', 
    department: '', 
    job_title: '', 
    manager: '',
    manager_notes: '',
    // Default values for other fields
    availability: 'available',
    experience: 0,
    completionRate: 85,
    specialties: []
  });
  
  // Negotiation steps state
  const [leadNegotiationSteps, setLeadNegotiationSteps] = useState({});
  const [customerNegotiationSteps, setCustomerNegotiationSteps] = useState({});
  const [expandedNegotiation, setExpandedNegotiation] = useState(null);

  // Utility functions
  const getNegotiationSteps = (entry, setEntrySteps, entryStepsMap) => {
    if (!entryStepsMap[entry.id]) {
      setEntrySteps(prev => ({ ...prev, [entry.id]: DEFAULT_NEGOTIATION_STEPS.map(s => ({ ...s })) }));
      return DEFAULT_NEGOTIATION_STEPS.map(s => ({ ...s }));
    }
    return entryStepsMap[entry.id];
  };

  const initializeNegotiationSteps = (entry, setEntrySteps, entryStepsMap) => {
    if (!entryStepsMap[entry.id]) {
      setEntrySteps(prev => ({ ...prev, [entry.id]: DEFAULT_NEGOTIATION_STEPS.map(s => ({ ...s })) }));
    }
  };
  
  // 安全版本的 getNegotiationSteps，不在渲染过程中更新状态
  const getSafeNegotiationSteps = (entry, entryStepsMap) => {
    if (!entryStepsMap[entry.id]) {
      return DEFAULT_NEGOTIATION_STEPS.map(s => ({ ...s }));
    }
    return entryStepsMap[entry.id];
  };

  const getCompanyInfo = (entry) => {
    return {
      email: entry.email || 'info@' + (entry.name || 'company').replace(/\s+/g, '').toLowerCase() + '.com',
      phone: entry.phone || '+1 (555) 123-4567',
      location: entry.location || 'New York, NY',
      dealValue: entry.dealValue || '$50,000',
      notes: entry.notes || 'Key client in the fintech sector. Interested in long-term partnership.'
    };
  };

  const getAvailabilityColor = (availability) => {
    const colors = {
      available: 'bg-green-100 text-green-800',
      busy: 'bg-red-100 text-red-800',
      'partially-available': 'bg-yellow-100 text-yellow-800',
      'on-leave': 'bg-gray-100 text-gray-800'
    };
    return colors[availability] || 'bg-gray-100 text-gray-800';
  };

  const getAvailabilityIcon = (availability) => {
    const icons = {
      available: <CheckCircle className="w-4 h-4" />,
      busy: <AlertCircle className="w-4 h-4" />,
      'partially-available': <Clock className="w-4 h-4" />,
      'on-leave': <Coffee className="w-4 h-4" />
    };
    return icons[availability] || <Clock className="w-4 h-4" />;
  };

  const getStatusColor = (status) => {
    const colors = {
      hot: 'bg-red-100 text-red-800',
      warm: 'bg-yellow-100 text-yellow-800',
      cold: 'bg-blue-100 text-blue-800',
      qualified: 'bg-green-100 text-green-800',
      contacted: 'bg-purple-100 text-purple-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const todayStr = () => new Date().toISOString().slice(0, 10);

  const handleAddLead = (e) => {
    e.preventDefault();
    if (!newLead.name.trim()) return;
    setEmployeeLeads(prev => [
      ...prev,
      {
        id: Date.now(),
        name: newLead.name,
        lastContactDate: newLead.lastContactDate || todayStr(),
        currentStage: newLead.currentStage,
        progress: newLead.progress || 0
      }
    ]);
    setShowAddLead(false);
    setNewLead({ name: '', lastContactDate: '', currentStage: 'Contacted', progress: 0 });
  };

  const handleAddCustomer = (e) => {
    e.preventDefault();
    if (!newCustomer.name.trim()) return;
    setEmployeeCustomers(prev => [
      ...prev,
      {
        id: Date.now(),
        name: newCustomer.name,
        lastContactDate: newCustomer.lastContactDate || todayStr(),
        currentStage: newCustomer.currentStage,
        progress: newCustomer.progress || 0
      }
    ]);
    setShowAddCustomer(false);
    setNewCustomer({ name: '', lastContactDate: '', currentStage: 'Warm', progress: 0 });
  };

  const handleAddEmployee = async () => {
    try {
      setLoading(true);
      
      // Format the employee data for API
      const employeeData = {
        ...newEmployee,
        // Add any additional transformations needed for API
        role: newEmployee.job_title, // Map job_title to role for API consistency
        specialties: newEmployee.specialties || []
      };
      
      // Call API to create employee
      const createdEmployee = await employeeApiService.createEmployee(employeeData);
      
      // Reset form and close modal
      setShowAddEmployee(false);
      setNewEmployee({ 
        name: '', 
        employee_id: '', 
        start_date: '', 
        department: '', 
        job_title: '', 
        manager: '',
        manager_notes: '',
        availability: 'available',
        experience: 0,
        completionRate: 85,
        specialties: []
      });
      
      // Refresh employees list if needed
      // This would typically be handled by the parent component
      
      return createdEmployee;
    } catch (err) {
      console.error('Failed to create employee:', err);
      setError('Failed to create employee. Please try again.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleViewProfile = async (employee) => {
    setSelectedEmployee(employee);
    setLoading(true);
    setError(null);
    
    try {
      // 尝试从数据库获取客户和潜在客户数据
      const [customers, leads] = await Promise.all([
        employeeApiService.getCustomersByEmployee(employee.id),
        employeeApiService.getLeadsByEmployee(employee.id)
      ]);
      
      // 将数据库返回的客户数据转换为前端需要的格式
      const formattedCustomers = customers.map(customer => ({
        id: customer.id,
        name: customer.customer_name,
        lastContactDate: customer.last_purchase_date ? new Date(customer.last_purchase_date).toISOString().slice(0, 10) : todayStr(),
        currentStage: 'Active', // 默认状态
        progress: 75 // 默认进度
      }));
      
      // 将数据库返回的潜在客户数据转换为前端需要的格式
      const formattedLeads = leads.map(lead => ({
        id: lead.id,
        name: lead.customer_name,
        lastContactDate: lead.last_purchase_date ? new Date(lead.last_purchase_date).toISOString().slice(0, 10) : todayStr(),
        currentStage: 'Contacted', // 默认状态
        progress: 30 // 默认进度
      }));
      
      // Use actual data from API, even if empty
      setEmployeeCustomers(formattedCustomers);
      setEmployeeLeads(formattedLeads);
    } catch (err) {
      console.error('Error fetching customer data:', err);
      setError('Failed to load customer data');
      
      // Set empty arrays instead of mock data
      setEmployeeCustomers([]);
      setEmployeeLeads([]);
    } finally {
      setLoading(false);
    }
  };

  const refreshEmployeeData = async () => {
    if (selectedEmployee) {
      try {
        // Get updated employee data from API
        const updatedEmployee = await employeeApiService.getEmployeeById(selectedEmployee.id);
        setSelectedEmployee(updatedEmployee);
        
        // Call the parent refresh callback if provided
        if (onEmployeeRefresh) {
          await onEmployeeRefresh();
        }
      } catch (err) {
        console.error('Failed to refresh employee data:', err);
        setError('Failed to refresh employee data');
      }
    }
  };

  const value = {
    // State
    selectedEmployee,
    setSelectedEmployee,
    employeeLeads,
    setEmployeeLeads,
    employeeCustomers,
    setEmployeeCustomers,
    showAddLead,
    setShowAddLead,
    showAddCustomer,
    setShowAddCustomer,
    showAddEmployee,
    setShowAddEmployee,
    selectedEntry,
    setSelectedEntry,
    newLead,
    setNewLead,
    newCustomer,
    setNewCustomer,
    newEmployee,
    setNewEmployee,
    leadNegotiationSteps,
    setLeadNegotiationSteps,
    customerNegotiationSteps,
    setCustomerNegotiationSteps,
    expandedNegotiation,
    setExpandedNegotiation,
    loading,
    error,
    
    // Utility functions
    getNegotiationSteps,
    initializeNegotiationSteps,
    getSafeNegotiationSteps,
    getCompanyInfo,
    getAvailabilityColor,
    getAvailabilityIcon,
    getStatusColor,
    todayStr,
    handleAddLead,
    handleAddCustomer,
    handleAddEmployee,
    handleViewProfile,
    refreshEmployeeData
  };

  return (
    <EmployeeProfileContext.Provider value={value}>
      {children}
    </EmployeeProfileContext.Provider>
  );
};

export default EmployeeProfileContext; 