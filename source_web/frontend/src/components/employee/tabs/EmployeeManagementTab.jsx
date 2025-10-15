import React, { useState, useEffect } from 'react';
import {
  Calendar,
  User,
  Clock,
  RefreshCw,
  Award,
  UserCheck,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Coffee,
  Plane,
  DollarSign,
  Heart,
  Trash2,
  BarChart3,
  FileText
} from 'lucide-react';
import { Card, CardContent } from '../../ui/card';
import { Button } from '../../ui/button';
import { generateCardDataFromRealData, getEmployeeSortValue } from '../../../services/employeeDataUtils';
import ConfirmDialog from '../../ui/ConfirmDialog';
import toast from 'react-hot-toast';
import employeeApiService from '../../../services/employeeApi';
import { useEmployeeProfile } from '../context/EmployeeProfileContext';
import { useEmployeeData } from '../../../contexts/EmployeeDataContext';
import UnifiedToolbar from '../../common/toolbar/UnifiedToolbar';
import AddEmployeeModal from '../modals/AddEmployeeModal';
// import analyticsApiService from '../../../services/analyticsApiService';

const EmployeeManagementTab = () => {
  // Use the new employee data context
  const {
    filteredEmployees,
    loading,
    error,
    filters,
    updateFilters,
    refreshData,
    addEmployeeToState,
    rollbackEmployeeAdd,
    removeEmployeeFromState
  } = useEmployeeData();

  // Local UI state
  const [selectedEmployees] = useState([]);

  // Add Employee state
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [addEmployeeLoading, setAddEmployeeLoading] = useState(false);

  // Delete confirmation state
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Delete success state
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
  const [deletedEmployeeName, setDeletedEmployeeName] = useState('');

  // Create success state
  const [showCreateSuccess, setShowCreateSuccess] = useState(false);
  const [createdEmployeeName, setCreatedEmployeeName] = useState('');

  // Use the existing employee profile context
  const { handleViewProfile } = useEmployeeProfile();

  // Track analytics for Employee Management module visit
  // useEffect(() => {
  //   analyticsApiService.trackModuleVisit('Employee Management', ['view_employees', 'manage_team']);
    
  //   return () => {
  //     analyticsApiService.updateModuleTimeSpent('Employee Management');
  //   };
  // }, []);

  // Card display modes
  const cardDisplayModes = [
    { id: 'revenue', name: 'Revenue', icon: DollarSign },
    { id: 'experience', name: 'Experience', icon: Award },
    { id: 'performance', name: 'Performance', icon: TrendingUp },
    { id: 'feedback', name: 'Feedback', icon: Heart }
  ];

  const [cardDisplayMode, setCardDisplayMode] = useState('revenue');

  // Update filters when local search/filter state changes
  const handleFilterChange = (filterType, value) => {
    updateFilters({ [filterType]: value });
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

  // Get employee card data based on display mode using real data
  const getEmployeeCardData = (employee, mode) => {
    const cardData = generateCardDataFromRealData(employee, mode);

    // Convert icon string to component
    const iconComponents = {
      DollarSign: <DollarSign className="w-4 h-4 text-green-500" />,
      Award: <Award className="w-4 h-4 text-blue-500" />,
      TrendingUp: <TrendingUp className="w-4 h-4 text-purple-500" />,
      Heart: <Heart className="w-4 h-4 text-pink-500" />
    };

    return {
      ...cardData,
      icon: iconComponents[cardData.icon] || iconComponents.DollarSign
    };
  };

  // Helper function to merge employee data from EmployeeFullData structure
  const enrichEmployeeData = (empData) => {
    // Handle both EmployeeFullData structure and direct employee objects
    const baseEmployee = empData.employee || empData;
    const employee = { ...baseEmployee };

    // Merge performance data if available
    if (empData.performance) {
      employee.performance = empData.performance;
    }

    // Merge feedback data and convert to expected format
    if (empData.feedback_summary) {
      employee.feedback_rating = empData.feedback_summary.average_rating || 0;
      employee.feedback_comment = empData.feedback_summary.recent_comment || '';
      employee.feedback_count = empData.feedback_summary.total_feedback || 0;
    }

    // Add customer and lead counts for additional context
    employee.customer_count = empData.customer_count || 0;
    employee.lead_count = empData.lead_count || 0;

    // Ensure specialties exists (computed from skills)
    if (!employee.specialties && employee.skills) {
      const specialties = [];
      if (employee.skills.domain) {
        specialties.push(...employee.skills.domain.slice(0, 3));
      }
      if (specialties.length < 3 && employee.skills.technical) {
        specialties.push(...employee.skills.technical.slice(0, 3 - specialties.length));
      }
      employee.specialties = specialties;
    } else if (!employee.specialties) {
      employee.specialties = [];
    }

    // Ensure other computed properties exist
    if (!employee.current_projects) employee.current_projects = 0;
    if (!employee.completion_rate) employee.completion_rate = 85;
    if (!employee.recent_achievements) employee.recent_achievements = [];

    // Set performance_score with proper fallback priority
    if (empData.performance?.performance_score !== undefined && empData.performance?.performance_score !== null) {
      employee.performance_score = empData.performance.performance_score;
    } else if (employee.performance?.peer_evaluations?.averageScore) {
      employee.performance_score = Math.round(employee.performance.peer_evaluations.averageScore * 20);
    } else {
      employee.performance_score = 80;
    }

    if (!employee.deals_won) employee.deals_won = 0;
    if (!employee.response_time) employee.response_time = "2 hours";

    return employee;
  };

  // Sort employees by the current card display mode using real data
  const sortedEmployees = filteredEmployees
    .map(empData => enrichEmployeeData(empData))
    .sort((a, b) => {
      const aValue = getEmployeeSortValue(a, cardDisplayMode);
      const bValue = getEmployeeSortValue(b, cardDisplayMode);
      return bValue - aValue; // Descending order
    });

  // Add Employee Handler
  const handleAddEmployee = async (employeeData) => {
    let optimisticEmployeeId = null;

    try {
      setAddEmployeeLoading(true);
      const newEmployee = await employeeApiService.createEmployee(employeeData);
      optimisticEmployeeId = newEmployee.id;

      // Add the new employee to state immediately (optimistic update)
      addEmployeeToState(newEmployee);

      // Store created employee name for success modal
      setCreatedEmployeeName(newEmployee.name || 'New Employee');

      // Close the modal
      setShowAddEmployeeModal(false);

      // Show success modal
      setShowCreateSuccess(true);

      console.log('Employee created successfully:', newEmployee);
    } catch (error) {
      console.error('Failed to create employee:', error);

      // Rollback optimistic update if we added the employee to state
      if (optimisticEmployeeId) {
        rollbackEmployeeAdd(optimisticEmployeeId);
      }

      // Re-throw to let the modal handle the error display
      throw error;
    } finally {
      setAddEmployeeLoading(false);
    }
  };

  // Delete Employee Handlers
  const handleDeleteClick = (employee) => {
    setEmployeeToDelete(employee);
    setShowDeleteConfirmation(true);
  };

  const handleDeleteConfirm = async () => {
    if (!employeeToDelete) return;

    try {
      setIsDeleting(true);

      // Call API to delete employee
      await employeeApiService.deleteEmployee(employeeToDelete.id);

      // Remove from state
      removeEmployeeFromState(employeeToDelete.id);

      // Store deleted employee name for success modal
      setDeletedEmployeeName(employeeToDelete.name);

      // Close delete confirmation dialog and reset state
      setShowDeleteConfirmation(false);
      setEmployeeToDelete(null);

      // Show success modal
      setShowDeleteSuccess(true);

    } catch (error) {
      console.error('Failed to delete employee:', error);
      toast.error(`❌ Failed to delete employee: ${error.message}`, {
        duration: 6000
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirmation(false);
    setEmployeeToDelete(null);
  };

  const handleDeleteSuccessClose = () => {
    setShowDeleteSuccess(false);
    setDeletedEmployeeName('');
  };

  const handleCreateSuccessClose = () => {
    setShowCreateSuccess(false);
    setCreatedEmployeeName('');
  };

  if (loading) {
    return (
      <div className="p-3">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="h-64 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-3">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-red-700">
              <AlertCircle className="w-6 h-6" />
              <div>
                <h3 className="font-semibold">Connection Error</h3>
                <p className="text-sm mt-1">{error}</p>
                <Button
                  onClick={() => refreshData()}
                  className="mt-3 bg-red-600 hover:bg-red-700"
                  size="sm"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Unified Toolbar */}
      <div className="p-2 border-b">
        <UnifiedToolbar
          config={{
            primaryAction: {
              primaryLabel: 'Add Employee',
              onPrimaryAction: () => setShowAddEmployeeModal(true),
              actionIcons: [
                {
                  icon: BarChart3,
                  label: 'Performance Review',
                  tooltip: 'View team performance analytics',
                  onClick: () => console.log('Performance Review clicked'),
                  disabled: false
                },
                {
                  icon: FileText,
                  label: 'Export Data',
                  tooltip: 'Export employee data to CSV',
                  onClick: () => console.log('Export Data clicked'),
                  disabled: false
                }
              ],
              disabled: addEmployeeLoading,
              loading: addEmployeeLoading
            },
            search: {
              placeholder: 'Search employees, roles, skills...',
              value: filters.search,
              onChange: (value) => handleFilterChange('search', value),
              onClear: () => handleFilterChange('search', '')
            },
            filters: [
              {
                id: 'employee-filters',
                icon: 'filter',
                label: 'Filters',
                title: 'Filter & Sort Employees',
                hasActiveFilters: cardDisplayMode !== 'revenue' || filters.department !== 'all' || filters.availability !== 'all',
                content: ({ onClose }) => (
                  <div className="space-y-6">
                    {/* View By Section */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-3">View By</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {cardDisplayModes.map((mode) => (
                          <label key={mode.id} className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-gray-50">
                            <input
                              type="radio"
                              name="view-by-filter"
                              value={mode.id}
                              checked={cardDisplayMode === mode.id}
                              onChange={() => setCardDisplayMode(mode.id)}
                              className="text-green-600"
                            />
                            <mode.icon className="w-4 h-4 text-gray-500" />
                            <span className="text-sm text-gray-700">{mode.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Department Filter Section */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Filter by Department</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <label className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-gray-50">
                          <input
                            type="radio"
                            name="department-filter"
                            value="all"
                            checked={filters.department === 'all'}
                            onChange={() => handleFilterChange('department', 'all')}
                            className="text-green-600"
                          />
                          <span className="text-sm text-gray-700 font-medium">All Departments</span>
                        </label>
                        {Array.from(new Set(sortedEmployees.map(e => e.department))).map(dept => (
                          <label key={dept} className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-gray-50">
                            <input
                              type="radio"
                              name="department-filter"
                              value={dept}
                              checked={filters.department === dept}
                              onChange={() => handleFilterChange('department', dept)}
                              className="text-green-600"
                            />
                            <span className="text-sm text-gray-700">{dept}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Availability Filter Section */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Filter by Availability</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <label className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-gray-50">
                          <input
                            type="radio"
                            name="availability-filter"
                            value="all"
                            checked={filters.availability === 'all'}
                            onChange={() => handleFilterChange('availability', 'all')}
                            className="text-green-600"
                          />
                          <span className="text-sm text-gray-700 font-medium">All Availability</span>
                        </label>
                        {[
                          { value: 'available', label: 'Available' },
                          { value: 'partially-available', label: 'Partially Available' },
                          { value: 'busy', label: 'Busy' },
                          { value: 'on-leave', label: 'On Leave' }
                        ].map((option) => (
                          <label key={option.value} className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-gray-50">
                            <input
                              type="radio"
                              name="availability-filter"
                              value={option.value}
                              checked={filters.availability === option.value}
                              onChange={() => handleFilterChange('availability', option.value)}
                              className="text-green-600"
                            />
                            <span className="text-sm text-gray-700">{option.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Reset Button */}
                    <div className="pt-3 border-t border-gray-200 flex justify-between items-center">
                      <div className="text-xs text-gray-500">
                        {sortedEmployees.length} employee{sortedEmployees.length !== 1 ? 's' : ''} found
                      </div>
                      <button
                        onClick={() => {
                          setCardDisplayMode('revenue');
                          handleFilterChange('department', 'all');
                          handleFilterChange('availability', 'all');
                          onClose();
                        }}
                        className="text-sm text-green-600 hover:text-green-800 font-medium"
                      >
                        Reset filters
                      </button>
                    </div>
                  </div>
                )
              }
            ],
            themeColor: 'green'
          }}
        />
      </div>

      {/* Filter Summary */}
      <div className="px-4 py-2 bg-gray-50 border-t">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>{sortedEmployees.length} employee{sortedEmployees.length !== 1 ? 's' : ''} found</span>
          {filters.search && (
            <div className="flex items-center gap-1">
              <span>•</span>
              <span>Searching: "{filters.search}"</span>
            </div>
          )}
          {filters.department !== 'all' && (
            <div className="flex items-center gap-1">
              <span>•</span>
              <span>Department: {filters.department}</span>
            </div>
          )}
          {filters.availability !== 'all' && (
            <div className="flex items-center gap-1">
              <span>•</span>
              <span>Status: {filters.availability.replace('-', ' ')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Employee Table */}
      <div className="flex-1 overflow-auto p-2">
        <div className="bg-white rounded-lg shadow-sm border">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Availability
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {cardDisplayModes.find(mode => mode.id === cardDisplayMode)?.name || 'Metric'}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Skills
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedEmployees.map((employee) => {
                const cardData = getEmployeeCardData(employee, cardDisplayMode);

                return (
                  <tr 
                    key={employee.id} 
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => handleViewProfile(employee)}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-green-600" />
                        </div>
                        <div className="ml-3">
                          <div className="text-left group">
                            <div className="text-sm font-medium text-gray-900">
                              {employee.name || 'Unknown Employee'}
                            </div>
                            <div className="text-sm text-gray-500">{employee.role || 'No Role'}</div>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm text-green-600 font-medium">{employee.department || 'No Department'}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getAvailabilityColor(employee.availability)}`}>
                        {getAvailabilityIcon(employee.availability)}
                        <span>{(employee.availability || 'available').replace('-', ' ')}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {cardData.icon}
                        <div>
                          <div className="text-sm font-bold text-gray-900">{cardData.value}</div>
                          <div className="text-xs text-gray-500">{cardData.subtitle}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {(() => {
                          // Get skills from the skills object
                          let skillsList = [];

                          if (employee.skills && typeof employee.skills === 'object') {
                            // Combine all skills from different categories
                            const { technical = [], domain = [], methodologies = [], certifications = [] } = employee.skills;
                            skillsList = [...technical, ...domain, ...methodologies, ...certifications];
                          }

                          if (skillsList.length > 0) {
                            return (
                              <>
                                {skillsList.slice(0, 3).map((skill, index) => (
                                  <span key={`${skill}-${index}`} className="inline-flex bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs">
                                    {skill}
                                  </span>
                                ))}
                                {skillsList.length > 3 && (
                                  <span className="text-xs text-gray-500">+{skillsList.length - 3}</span>
                                )}
                              </>
                            );
                          } else {
                            return <span className="text-xs text-gray-400">No skills listed</span>;
                          }
                        })()}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(employee);
                        }}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition-colors"
                        title={`Delete ${employee.name || 'Employee'}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Employees Summary */}
      {selectedEmployees.length > 0 && (
        <div className="border-t bg-gray-50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              {selectedEmployees.length} employee{selectedEmployees.length > 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline">
                <Calendar className="w-4 h-4 mr-2" />
                Schedule Meeting
              </Button>
              <Button size="sm" className="bg-green-600 hover:bg-green-700">
                <Plane className="w-4 h-4 mr-2" />
                Plan Travel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <AddEmployeeModal
        isOpen={showAddEmployeeModal}
        onClose={() => setShowAddEmployeeModal(false)}
        onSubmit={handleAddEmployee}
        loading={addEmployeeLoading}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirmation}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Employee"
        message={`Are you sure you want to delete ${employeeToDelete?.name || 'this employee'}?`}
        details={employeeToDelete ? `Department: ${employeeToDelete.department} | Role: ${employeeToDelete.role}` : ''}
        confirmText="Delete Employee"
        cancelText="Cancel"
        type="danger"
        isLoading={isDeleting}
      />

      {/* Delete Success Modal */}
      {showDeleteSuccess && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b bg-green-50 border-green-200">
              <div className="flex items-center gap-3">
                <div className="text-green-600">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Employee Deleted Successfully
                </h3>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-4">
              <p className="text-gray-700 mb-4 leading-relaxed">
                <span className="font-medium">{deletedEmployeeName}</span> has been successfully removed from the system.
              </p>

              <div className="bg-gray-50 rounded-md p-3 border">
                <p className="text-sm text-gray-600">
                  The employee and all associated data have been permanently deleted from both employee and performance records.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 bg-gray-50 border-t flex justify-end">
              <Button
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={handleDeleteSuccessClose}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create Success Modal */}
      {showCreateSuccess && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b bg-green-50 border-green-200">
              <div className="flex items-center gap-3">
                <div className="text-green-600">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Employee Created Successfully
                </h3>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-4">
              <p className="text-gray-700 mb-4 leading-relaxed">
                <span className="font-medium">{createdEmployeeName}</span> has been successfully added to the system.
              </p>

              <div className="bg-gray-50 rounded-md p-3 border">
                <p className="text-sm text-gray-600">
                  The new employee has been created with default performance metrics and is now visible in the employee list.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 bg-gray-50 border-t flex justify-end">
              <Button
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={handleCreateSuccessClose}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeManagementTab;