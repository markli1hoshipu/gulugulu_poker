import React, { useState, useMemo } from 'react';
import { Star, Loader2, AlertCircle, Plus, Award, Target, TrendingUp, FileText } from 'lucide-react';
import { Button } from '../../ui/button';
import employeeApiService from '../../../services/employeeApi';
import DeleteConfirmationModal from '../shared/DeleteConfirmationModal';

const ICON_OPTIONS = [
  { name: 'Star', component: Star, color: 'text-yellow-600' },
  { name: 'Award', component: Award, color: 'text-green-600' },
  { name: 'Target', component: Target, color: 'text-blue-600' },
  { name: 'TrendingUp', component: TrendingUp, color: 'text-purple-600' },
  { name: 'FileText', component: FileText, color: 'text-indigo-600' }
];

function MilestoneManagementSection({ employeeId, milestones, setMilestones, performanceData, setPerformanceData }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editMilestone, setEditMilestone] = useState(null);
  const [form, setForm] = useState({ label: '', year: new Date().getFullYear(), icon: 'Star', iconColor: 'text-yellow-600', date: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [milestoneToDelete, setMilestoneToDelete] = useState(null);
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedQuarter, setSelectedQuarter] = useState('all');

  // Generate next available ID for new milestones
  const getNextMilestoneId = () => {
    if (!milestones || milestones.length === 0) return 1;
    return Math.max(...milestones.map(m => m.id || 0)) + 1;
  };

  // Utility functions for quarter operations
  const getQuarterFromDate = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const month = date.getMonth();
    return Math.floor(month / 3) + 1;
  };

  const formatQuarter = (quarter, year) => `Q${quarter} ${year}`;

  // Get available years from milestones
  const availableYears = useMemo(() => {
    const years = new Set();
    milestones?.forEach(milestone => {
      if (milestone.date) {
        const year = new Date(milestone.date).getFullYear();
        years.add(year);
      } else if (milestone.year) {
        years.add(milestone.year);
      }
    });
    return Array.from(years).sort((a, b) => b - a); // Sort newest first
  }, [milestones]);

  // Filter and group milestones by quarter
  const groupedMilestones = useMemo(() => {
    if (!milestones || milestones.length === 0) return {};

    let filtered = milestones.filter(milestone => {
      if (!milestone.date) return false;

      const date = new Date(milestone.date);
      const year = date.getFullYear();
      const quarter = getQuarterFromDate(milestone.date);

      const yearMatch = selectedYear === 'all' || year === parseInt(selectedYear);
      const quarterMatch = selectedQuarter === 'all' || quarter === parseInt(selectedQuarter);

      return yearMatch && quarterMatch;
    });

    // Group by year and quarter
    const grouped = {};
    filtered.forEach(milestone => {
      const date = new Date(milestone.date);
      const year = date.getFullYear();
      const quarter = getQuarterFromDate(milestone.date);
      const key = `${year}-Q${quarter}`;

      if (!grouped[key]) {
        grouped[key] = {
          year,
          quarter,
          milestones: []
        };
      }
      grouped[key].milestones.push(milestone);
    });

    // Sort groups by year and quarter (newest first)
    const sortedKeys = Object.keys(grouped).sort((a, b) => {
      const [yearA, quarterA] = a.split('-Q');
      const [yearB, quarterB] = b.split('-Q');
      if (parseInt(yearA) !== parseInt(yearB)) {
        return parseInt(yearB) - parseInt(yearA);
      }
      return parseInt(quarterB) - parseInt(quarterA);
    });

    const sortedGrouped = {};
    sortedKeys.forEach(key => {
      sortedGrouped[key] = grouped[key];
    });

    return sortedGrouped;
  }, [milestones, selectedYear, selectedQuarter]);

  // Handlers
  const handleAdd = () => {
    setForm({ label: '', year: new Date().getFullYear(), icon: 'Star', iconColor: 'text-yellow-600', date: '', description: '' });
    setShowAdd(true);
    setEditMilestone(null);
  };

  const handleEdit = milestone => {
    setForm({ ...milestone });
    setEditMilestone(milestone);
    setShowAdd(true);
  };

  const handleDeleteClick = (id) => {
    const milestone = milestones.find(m => m.id === id);
    setMilestoneToDelete(milestone);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!milestoneToDelete) return;

    setSaving(true);
    setError(null);

    try {
      await employeeApiService.deleteMilestone(employeeId, milestoneToDelete.id);
      const updatedMilestones = milestones.filter(m => m.id !== milestoneToDelete.id);
      setMilestones(updatedMilestones);
      
      // Update performance data if provided
      if (setPerformanceData && performanceData) {
        const updatedData = {
          ...performanceData,
          milestones: updatedMilestones
        };
        setPerformanceData(updatedData);
      }
      
      setShowDeleteModal(false);
      setMilestoneToDelete(null);
    } catch (err) {
      console.error('Error deleting milestone:', err);
      setError('Failed to delete milestone. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setMilestoneToDelete(null);
  };

  const handleFormChange = e => {
    const { name, value } = e.target;
    if (name === 'icon') {
      const selectedIcon = ICON_OPTIONS.find(option => option.name === value);
      setForm(f => ({ 
        ...f, 
        icon: value,
        iconColor: selectedIcon ? selectedIcon.color : 'text-yellow-600'
      }));
    } else {
      setForm(f => ({ 
        ...f, 
        [name]: name === 'year' ? Number(value) : value 
      }));
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!form.label.trim()) return;

    setSaving(true);
    setError(null);

    try {
      if (editMilestone) {
        // Update existing milestone
        const updatedMilestone = { ...editMilestone, ...form };
        await employeeApiService.updateMilestone(employeeId, editMilestone.id, updatedMilestone);
        const updatedMilestones = milestones.map(m => m.id === editMilestone.id ? updatedMilestone : m);
        setMilestones(updatedMilestones);
        
        // Update performance data if provided
        if (setPerformanceData && performanceData) {
          const updatedData = {
            ...performanceData,
            milestones: updatedMilestones
          };
          setPerformanceData(updatedData);
        }
      } else {
        // Add new milestone
        const newMilestone = {
          ...form,
          id: getNextMilestoneId()
        };
        const updatedMilestones = [...milestones, newMilestone];
        await employeeApiService.addMilestone(employeeId, newMilestone);
        setMilestones(updatedMilestones);
        
        // Update performance data if provided
        if (setPerformanceData && performanceData) {
          const updatedData = {
            ...performanceData,
            milestones: updatedMilestones
          };
          setPerformanceData(updatedData);
        }
      }

      setShowAdd(false);
      setEditMilestone(null);
      setForm({ label: '', year: new Date().getFullYear(), icon: 'Star', iconColor: 'text-yellow-600', date: '', description: '' });
    } catch (err) {
      console.error('Error saving milestone:', err);
      setError('Failed to save milestone. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border p-5 shadow-sm mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-600" />
          Milestone Management
        </h3>
        <Button
          size="sm"
          className="bg-yellow-600 hover:bg-yellow-700 w-40"
          onClick={handleAdd}
          disabled={saving}
        >
          <Plus className="w-4 h-4 mr-1" />
          Add New Milestone
        </Button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <span className="text-red-700 text-sm">{error}</span>
        </div>
      )}

      {/* Filter Controls */}
      <div className="mb-4 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Year</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm"
          >
            <option value="all">All Years</option>
            {availableYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Quarter</label>
          <select
            value={selectedQuarter}
            onChange={(e) => setSelectedQuarter(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm"
          >
            <option value="all">All Quarters</option>
            <option value="1">Q1 (Jan-Mar)</option>
            <option value="2">Q2 (Apr-Jun)</option>
            <option value="3">Q3 (Jul-Sep)</option>
            <option value="4">Q4 (Oct-Dec)</option>
          </select>
        </div>
      </div>

      {(!milestones || milestones.length === 0) ? (
        <div className="text-gray-500 text-sm">No milestones yet. Add a new milestone to get started!</div>
      ) : Object.keys(groupedMilestones).length === 0 ? (
        <div className="text-gray-500 text-sm">No milestones match your filter criteria.</div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedMilestones).map(([key, group]) => (
            <div key={key} className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-600" />
                {formatQuarter(group.quarter, group.year)}
                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full ml-2">
                  {group.milestones.length} milestone{group.milestones.length !== 1 ? 's' : ''}
                </span>
              </h4>
              <ul className="divide-y divide-gray-200">
                {group.milestones.map(milestone => {
                  const IconComponent = ICON_OPTIONS.find(option => option.name === milestone.icon)?.component || Star;
                  return (
                    <li key={milestone.id} className="py-3 flex flex-col md:flex-row md:items-center md:justify-between group bg-white rounded-lg px-3 mb-2 shadow-sm">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <IconComponent className={`w-4 h-4 ${milestone.iconColor}`} />
                          <span className="font-medium text-gray-900">{milestone.label}</span>
                          {milestone.date && (
                            <span className="text-xs text-gray-500 ml-2">{milestone.date}</span>
                          )}
                        </div>
                        {milestone.description && <div className="text-xs text-gray-600 mt-1">{milestone.description}</div>}
                      </div>
                      <div className="flex items-center gap-2 mt-2 md:mt-0 md:ml-4">
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => handleEdit(milestone)}
                          disabled={saving}
                        >
                          Edit
                        </Button>
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => handleDeleteClick(milestone.id)}
                          disabled={saving}
                        >
                          Delete
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Milestone Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleFormSubmit} className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 flex flex-col gap-4 border">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-yellow-700">{editMilestone ? 'Edit Milestone' : 'Add New Milestone'}</h2>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-600 text-2xl"
                onClick={() => { setShowAdd(false); setEditMilestone(null); }}
                disabled={saving}
              >
                ×
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span className="text-red-700 text-sm">{error}</span>
              </div>
            )}

            <label className="text-sm font-medium text-gray-700">
              Milestone Title
              <input
                type="text"
                name="label"
                className="mt-1 border rounded px-3 py-2 w-full"
                value={form.label}
                onChange={handleFormChange}
                required
                disabled={saving}
              />
            </label>
            <label className="text-sm font-medium text-gray-700">
              Description
              <textarea
                name="description"
                className="mt-1 border rounded px-3 py-2 w-full"
                value={form.description}
                onChange={handleFormChange}
                disabled={saving}
                rows={2}
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm font-medium text-gray-700">
                Year
                <input
                  type="number"
                  name="year"
                  min="2020"
                  max="2030"
                  className="mt-1 border rounded px-3 py-2 w-full"
                  value={form.year}
                  onChange={handleFormChange}
                  required
                  disabled={saving}
                />
              </label>
              <label className="text-sm font-medium text-gray-700">
                Date
                <input
                  type="date"
                  name="date"
                  className="mt-1 border rounded px-3 py-2 w-full"
                  value={form.date}
                  onChange={handleFormChange}
                  disabled={saving}
                />
              </label>
            </div>
            <label className="text-sm font-medium text-gray-700">
              Icon
              <select
                name="icon"
                className="mt-1 border rounded px-3 py-2 w-full"
                value={form.icon}
                onChange={handleFormChange}
                disabled={saving}
              >
                {ICON_OPTIONS.map(option => (
                  <option key={option.name} value={option.name}>
                    {option.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex gap-2 mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => { setShowAdd(false); setEditMilestone(null); }}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-yellow-600 hover:bg-yellow-700 text-white"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  editMilestone ? 'Save Changes' : 'Add Milestone'
                )}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Milestone"
        message={`Are you sure you want to delete the milestone "${milestoneToDelete?.label}"? This action cannot be undone.`}
        loading={saving}
        itemType="Milestone"
      />
    </div>
  );
}

export default MilestoneManagementSection;