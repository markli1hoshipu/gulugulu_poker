import React, { useState, useEffect } from 'react';
import { Target, Loader2, AlertCircle, Edit2, Save, X, Plus, Trash2 } from 'lucide-react';
import { Button } from '../../ui/button';
import employeeApiService from '../../../services/employeeApi';
import DeleteConfirmationModal from '../shared/DeleteConfirmationModal';

function GoalSettingSection({ employeeId, goals, setGoals, skipInitialLoad = false, renderHeader }) {
  // Edit mode state
  const [isEditingGoals, setIsEditingGoals] = useState(false);
  const [goalsFormData, setGoalsFormData] = useState([]);
  
  // Legacy states for backward compatibility  
  const [showAdd, setShowAdd] = useState(false);
  const [editGoal, setEditGoal] = useState(null);
  const [form, setForm] = useState({ title: '', details: '', targetDate: '', progress: 0 });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [goalToDelete, setGoalToDelete] = useState(null);

  // Load goals from API when component mounts or employeeId changes (unless parent preloads)
  useEffect(() => {
    if (skipInitialLoad || !employeeId) return;

    const loadGoals = async () => {
      setLoading(true);
      setError(null);
      try {
        const apiGoals = await employeeApiService.getEmployeeGoals(employeeId);
        setGoals(apiGoals || []);
      } catch (err) {
        console.error('Error loading goals:', err);
        setError('Failed to load goals. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadGoals();
  }, [employeeId, setGoals, skipInitialLoad]);

  // Generate next available ID for new goals
  const getNextGoalId = () => {
    if (!goals || goals.length === 0) return 1;
    return Math.max(...goals.map(g => g.id || 0)) + 1;
  };

  // Add goal state for in-place functionality
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [newGoalForm, setNewGoalForm] = useState({ title: '', details: '', targetDate: '', status: 'in progress', progress: 0 });

  // New inline edit functions
  const startEditingGoals = () => {
    const currentGoals = goals || [];
    const formattedGoals = currentGoals.map(goal => ({
      id: goal.id,
      title: goal.title || '',
      details: goal.details || '',
      targetDate: goal.targetDate || '',
      progress: goal.progress || 0,
      status: goal.status || 'in progress'
    }));
    setGoalsFormData(formattedGoals);
    setIsEditingGoals(true);
    setError(null);
  };

  const cancelEditingGoals = () => {
    setIsEditingGoals(false);
    setGoalsFormData([]);
    setError(null);
  };

  const addNewGoal = () => {
    const newGoal = {
      id: Date.now(), // Temporary ID
      title: '',
      details: '',
      targetDate: '',
      progress: 0,
      status: 'in progress'
    };
    setGoalsFormData([...goalsFormData, newGoal]);
  };

  const removeGoal = (index) => {
    setGoalsFormData(goalsFormData.filter((_, i) => i !== index));
  };

  const handleGoalChange = (index, field, value) => {
    setGoalsFormData(prev => prev.map((goal, i) => 
      i === index ? { ...goal, [field]: value } : goal
    ));
  };

  const saveGoals = async () => {
    setSaving(true);
    setError(null);
    
    try {
      // Filter out completely empty goals
      const validGoals = goalsFormData.filter(goal => 
        goal.title.trim() !== '' || goal.details.trim() !== ''
      );

      // Save all goals to the API
      const savedGoals = await employeeApiService.saveEmployeeGoals(employeeId, validGoals);
      
      // Update parent state
      setGoals(savedGoals);
      
      // Exit edit mode
      setIsEditingGoals(false);
      setGoalsFormData([]);
    } catch (err) {
      console.error('Error updating goals:', err);
      setError('Failed to update goals. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Handlers
  const handleAdd = () => {
    setForm({ title: '', details: '', targetDate: '', progress: 0 });
    setShowAdd(true);
    setEditGoal(null);
  };

  const handleEdit = goal => {
    setForm({ ...goal });
    setEditGoal(goal);
    setShowAdd(true);
  };

  const handleDeleteClick = (id) => {
    const goal = goals.find(g => g.id === id);
    setGoalToDelete(goal);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!goalToDelete) return;

    setSaving(true);
    setError(null);

    try {
      await employeeApiService.deleteEmployeeGoal(employeeId, goalToDelete.id);
      setGoals(goals.filter(g => g.id !== goalToDelete.id));
      setShowDeleteModal(false);
      setGoalToDelete(null);
    } catch (err) {
      console.error('Error deleting goal:', err);
      setError('Failed to delete goal. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setGoalToDelete(null);
  };

  const handleComplete = async (id) => {
    const goal = goals.find(g => g.id === id);
    if (!goal) return;

    const updatedGoal = {
      ...goal,
      status: goal.status === 'completed' ? 'in progress' : 'completed',
      progress: goal.status === 'completed' ? goal.progress : 100
    };

    setSaving(true);
    setError(null);

    try {
      await employeeApiService.updateEmployeeGoal(employeeId, id, updatedGoal);
      setGoals(goals.map(g => g.id === id ? updatedGoal : g));
    } catch (err) {
      console.error('Error updating goal:', err);
      setError('Failed to update goal. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // In-place add goal functions
  const startAddingGoal = () => {
    setNewGoalForm({ title: '', details: '', targetDate: '', status: 'in progress', progress: 0 });
    setIsAddingGoal(true);
  };

  const cancelAddingGoal = () => {
    setIsAddingGoal(false);
    setNewGoalForm({ title: '', details: '', targetDate: '', status: 'in progress', progress: 0 });
  };

  const handleNewGoalChange = (field, value) => {
    setNewGoalForm(prev => ({ ...prev, [field]: value }));
  };

  const saveNewGoal = async () => {
    if (!newGoalForm.title.trim()) return;

    setSaving(true);
    setError(null);

    try {
      const newGoal = {
        id: getNextGoalId(),
        title: newGoalForm.title.trim(),
        details: newGoalForm.details.trim(),
        targetDate: newGoalForm.targetDate,
        status: newGoalForm.status,
        progress: newGoalForm.progress
      };

      // Use saveEmployeeGoals with the updated goals array
      const updatedGoals = [...goals, newGoal];
      await employeeApiService.saveEmployeeGoals(employeeId, updatedGoals);
      setGoals(updatedGoals);
      setIsAddingGoal(false);
      setNewGoalForm({ title: '', details: '', targetDate: '', status: 'in progress', progress: 0 });
    } catch (err) {
      console.error('Error adding goal:', err);
      setError('Failed to add goal. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleFormChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: name === 'progress' ? Number(value) : value }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;

    setSaving(true);
    setError(null);

    try {
      if (editGoal) {
        // Update existing goal
        const updatedGoal = { ...editGoal, ...form };
        await employeeApiService.updateEmployeeGoal(employeeId, editGoal.id, updatedGoal);
        setGoals(goals.map(g => g.id === editGoal.id ? updatedGoal : g));
      } else {
        // Add new goal
        const newGoal = {
          ...form,
          id: getNextGoalId(),
          status: 'in progress'
        };
        const updatedGoals = [...goals, newGoal];
        await employeeApiService.saveEmployeeGoals(employeeId, updatedGoals);
        setGoals(updatedGoals);
      }

      setShowAdd(false);
      setEditGoal(null);
      setForm({ title: '', details: '', targetDate: '', progress: 0 });
    } catch (err) {
      console.error('Error saving goal:', err);
      setError('Failed to save goal. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border p-5 shadow-sm mb-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-indigo-600 animate-spin mr-2" />
          <span className="text-gray-600">Loading goals...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      {renderHeader && renderHeader(isEditingGoals ? null : startEditingGoals, startAddingGoal)}
      <div className="p-6">

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <span className="text-red-700 text-sm">{error}</span>
        </div>
      )}

      {isEditingGoals ? (
        /* Edit Form */
        <div className="space-y-6">
          {/* Add Goal Button */}
          <div className="flex justify-between items-center">
            <h4 className="text-base font-medium text-gray-900">Goals</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={addNewGoal}
              className="flex items-center gap-1 text-green-600 hover:text-green-700 hover:bg-green-50 text-sm"
            >
              <Plus className="w-3 h-3" />
              Add
            </Button>
          </div>

          {/* Goals Form */}
          <div className="space-y-4">
            {goalsFormData.map((goal, index) => (
              <div key={index} className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="text-sm font-medium text-gray-700">Goal #{index + 1}</h5>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeGoal(index)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Title *
                    </label>
                    <input
                      type="text"
                      value={goal.title}
                      onChange={(e) => handleGoalChange(index, 'title', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                      placeholder="Enter goal title"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Target Date
                    </label>
                    <input
                      type="date"
                      value={goal.targetDate}
                      onChange={(e) => handleGoalChange(index, 'targetDate', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Details
                    </label>
                    <textarea
                      value={goal.details}
                      onChange={(e) => handleGoalChange(index, 'details', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                      placeholder="Enter goal details"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Progress ({goal.progress}%)
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={goal.progress}
                      onChange={(e) => handleGoalChange(index, 'progress', parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={goal.status}
                      onChange={(e) => handleGoalChange(index, 'status', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                    >
                      <option value="in progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
            {goalsFormData.length === 0 && (
              <p className="text-gray-500 text-sm italic text-center py-4">No goals added yet. Click "Add" to create your first goal.</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-4 border-t">
            <Button
              onClick={saveGoals}
              disabled={saving}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button
              variant="outline"
              onClick={cancelEditingGoals}
              disabled={saving}
              className="flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        /* Display Mode */
        <>
          {(!goals || goals.length === 0) && !isAddingGoal ? (
            <div className="text-gray-500 text-sm">No goals set yet. Click "Add Goal" to create your first goal!</div>
          ) : (
            <ul className="divide-y">
              {goals.map(goal => (
                <li key={goal.id} className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="font-medium text-gray-900">{goal.title}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${goal.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {goal.status === 'completed' ? 'Completed' : 'In Progress'}
                      </span>
                      {goal.targetDate && <span className="text-xs text-gray-500">Due: {goal.targetDate}</span>}
                    </div>
                    <Button
                      size="xs"
                      onClick={() => handleComplete(goal.id)}
                      disabled={saving}
                      className={`ml-3 text-xs px-2 py-1 ${
                        goal.status === 'completed' 
                          ? 'bg-yellow-600 hover:bg-yellow-700 text-white' 
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      }`}
                    >
                      {goal.status === 'completed' ? 'Mark Incomplete' : 'Mark Complete'}
                    </Button>
                  </div>
                  {goal.details && <div className="text-sm text-gray-600 mt-1">{goal.details}</div>}
                  {typeof goal.progress === 'number' && (
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                      <div className="bg-gradient-to-r from-indigo-500 to-green-500 h-1.5 rounded-full" style={{ width: `${goal.progress}%` }}></div>
                    </div>
                  )}
                </li>
              ))}
              
              {/* In-place Add Goal Form */}
              {isAddingGoal && (
                <li className="py-3 border-t-2 border-green-200">
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="text-sm font-medium text-gray-700">Add New Goal</h5>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={cancelAddingGoal}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 p-1"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Title *
                        </label>
                        <input
                          type="text"
                          value={newGoalForm.title}
                          onChange={(e) => handleNewGoalChange('title', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                          placeholder="Enter goal title"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Target Date
                        </label>
                        <input
                          type="date"
                          value={newGoalForm.targetDate}
                          onChange={(e) => handleNewGoalChange('targetDate', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Details
                        </label>
                        <textarea
                          value={newGoalForm.details}
                          onChange={(e) => handleNewGoalChange('details', e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                          placeholder="Enter goal details"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Progress ({newGoalForm.progress}%)
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={newGoalForm.progress}
                          onChange={(e) => handleNewGoalChange('progress', parseInt(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Status
                        </label>
                        <select
                          value={newGoalForm.status}
                          onChange={(e) => handleNewGoalChange('status', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                        >
                          <option value="in progress">In Progress</option>
                          <option value="completed">Completed</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-end gap-3 pt-4 mt-4 border-t">
                      <Button
                        variant="outline"
                        onClick={cancelAddingGoal}
                        disabled={saving}
                        className="flex items-center gap-2"
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </Button>
                      <Button
                        onClick={saveNewGoal}
                        disabled={saving || !newGoalForm.title.trim()}
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
                      >
                        <Save className="w-4 h-4" />
                        {saving ? 'Adding...' : 'Add Goal'}
                      </Button>
                    </div>
                  </div>
                </li>
              )}
            </ul>
          )}
        </>
      )}
      </div>

      {/* Legacy modal - kept for backward compatibility but hidden in new edit mode */}
      {showAdd && !isEditingGoals && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleFormSubmit} className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 flex flex-col gap-4 border">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-indigo-700">{editGoal ? 'Edit Goal' : 'Add New Goal'}</h2>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-600 text-2xl"
                onClick={() => { setShowAdd(false); setEditGoal(null); }}
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
              Title
              <input
                type="text"
                name="title"
                className="mt-1 border rounded px-3 py-2 w-full"
                value={form.title}
                onChange={handleFormChange}
                required
                disabled={saving}
              />
            </label>
            <label className="text-sm font-medium text-gray-700">
              Details
              <textarea
                name="details"
                className="mt-1 border rounded px-3 py-2 w-full"
                value={form.details}
                onChange={handleFormChange}
                disabled={saving}
              />
            </label>
            <label className="text-sm font-medium text-gray-700">
              Target Date
              <input
                type="date"
                name="targetDate"
                className="mt-1 border rounded px-3 py-2 w-full"
                value={form.targetDate}
                onChange={handleFormChange}
                disabled={saving}
              />
            </label>
            <label className="text-sm font-medium text-gray-700">
              Progress (%)
              <input
                type="number"
                name="progress"
                min="0"
                max="100"
                className="mt-1 border rounded px-3 py-2 w-full"
                value={form.progress}
                onChange={handleFormChange}
                disabled={saving}
              />
            </label>
            <div className="flex gap-2 mt-4">
              <Button
                type="button"
                variant="outline"
                className="border border-gray-300"
                onClick={() => { setShowAdd(false); setEditGoal(null); }}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="px-4 py-0 bg-indigo-950 text-white hover:bg-indigo-950/90"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  editGoal ? 'Save Changes' : 'Add Goal'
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
        title="Delete Goal"
        message={`Are you sure you want to delete the goal "${goalToDelete?.title}"? This action cannot be undone.`}
        loading={saving}
        itemType="Goal"
      />
    </>
  );
}

export default GoalSettingSection;