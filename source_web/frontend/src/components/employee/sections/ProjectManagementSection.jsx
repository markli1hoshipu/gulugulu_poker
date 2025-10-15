import React, { useState, useMemo, useEffect } from 'react';
import { Briefcase, Loader2, AlertCircle, Plus, Search, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../../ui/button';
import employeeApiService from '../../../services/employeeApi';
import DeleteConfirmationModal from '../shared/DeleteConfirmationModal';

function ProjectManagementSection({ employeeId, projects, setProjects, performanceData, setPerformanceData }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editProject, setEditProject] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', year: new Date().getFullYear(), revenue: 0, status: 'active', deadline: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState(null);
  const [showProjectDetail, setShowProjectDetail] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Calculate total revenue from projects array
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
      console.error('Error calculating total revenue in ProjectManagementSection:', error);
      return 0;
    }
  };

  // Generate next available ID for new projects
  const getNextProjectId = () => {
    if (!projects || projects.length === 0) return 1;
    return Math.max(...projects.map(p => p.id || 0)) + 1;
  };

  // Filter projects based on search term
  const filteredProjects = useMemo(() => {
    if (!searchTerm.trim()) return projects || [];
    
    const searchLower = searchTerm.toLowerCase();
    return (projects || []).filter(project => 
      project.name.toLowerCase().includes(searchLower) ||
      project.year.toString().includes(searchTerm)
    );
  }, [projects, searchTerm]);

  // Reset expanded state when filteredProjects changes
  useEffect(() => {
    setIsExpanded(false);
  }, [filteredProjects.length, searchTerm]);

  // Calculate displayed projects based on expand state
  const displayedProjects = useMemo(() => {
    if (filteredProjects.length <= 3) return filteredProjects;
    return isExpanded ? filteredProjects : filteredProjects.slice(0, 3);
  }, [filteredProjects, isExpanded]);

  // Calculate if expand button should be shown
  const shouldShowExpandButton = filteredProjects.length > 3;
  const remainingCount = filteredProjects.length - 3;

  // Handlers
  const handleAdd = () => {
    setForm({ name: '', description: '', year: new Date().getFullYear(), revenue: 0, status: 'active', deadline: '' });
    setShowAdd(true);
    setEditProject(null);
  };

  const handleEdit = project => {
    setForm({ ...project });
    setEditProject(project);
    setShowAdd(true);
  };

  const handleDeleteClick = (id) => {
    const project = projects.find(p => p.id === id);
    setProjectToDelete(project);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!projectToDelete) return;

    setSaving(true);
    setError(null);

    try {
      await employeeApiService.deleteProject(employeeId, projectToDelete.id);
      const updatedProjects = projects.filter(p => p.id !== projectToDelete.id);
      setProjects(updatedProjects);
      
      // Update performance data if provided
      if (setPerformanceData && performanceData) {
        const calculatedTotalRevenue = calculateTotalRevenue(updatedProjects);
        const updatedData = {
          ...performanceData,
          projects: updatedProjects,
          total_revenue: calculatedTotalRevenue
        };
        setPerformanceData(updatedData);
      }
      
      setShowDeleteModal(false);
      setProjectToDelete(null);
    } catch (err) {
      console.error('Error deleting project:', err);
      setError('Failed to delete project. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setProjectToDelete(null);
  };

  const handleProjectClick = (project) => {
    setSelectedProject(project);
    setShowProjectDetail(true);
  };

  const handleCloseProjectDetail = () => {
    setShowProjectDetail(false);
    setSelectedProject(null);
  };

  const handleFormChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ 
      ...f, 
      [name]: name === 'revenue' || name === 'year' ? Number(value) : value 
    }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    setSaving(true);
    setError(null);

    try {
      if (editProject) {
        // Update existing project
        const updatedProject = { ...editProject, ...form };
        await employeeApiService.updateProject(employeeId, editProject.id, updatedProject);
        const updatedProjects = projects.map(p => p.id === editProject.id ? updatedProject : p);
        setProjects(updatedProjects);
        
        // Update performance data if provided
        if (setPerformanceData && performanceData) {
          try {
            const calculatedTotalRevenue = calculateTotalRevenue(updatedProjects);
            const updatedData = {
              ...performanceData,
              projects: updatedProjects,
              total_revenue: calculatedTotalRevenue
            };
            setPerformanceData(updatedData);
          } catch (error) {
            console.error('Error updating performance data with revenue:', error);
            // Still update projects even if revenue calculation fails
            const updatedData = {
              ...performanceData,
              projects: updatedProjects
            };
            setPerformanceData(updatedData);
          }
        }
      } else {
        // Add new project
        const newProject = {
          ...form,
          id: getNextProjectId()
        };
        const updatedProjects = [...projects, newProject];
        await employeeApiService.addProject(employeeId, newProject);
        setProjects(updatedProjects);
        
        // Update performance data if provided
        if (setPerformanceData && performanceData) {
          try {
            const calculatedTotalRevenue = calculateTotalRevenue(updatedProjects);
            const updatedData = {
              ...performanceData,
              projects: updatedProjects,
              total_revenue: calculatedTotalRevenue
            };
            setPerformanceData(updatedData);
          } catch (error) {
            console.error('Error updating performance data with revenue:', error);
            // Still update projects even if revenue calculation fails
            const updatedData = {
              ...performanceData,
              projects: updatedProjects
            };
            setPerformanceData(updatedData);
          }
        }
      }

      setShowAdd(false);
      setEditProject(null);
      setForm({ name: '', description: '', year: new Date().getFullYear(), revenue: 0, status: 'active', deadline: '' });
    } catch (err) {
      console.error('Error saving project:', err);
      setError('Failed to save project. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border p-5 shadow-sm mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-purple-600" />
          Project Management
        </h3>
        <Button
          size="sm"
          className="bg-purple-600 hover:bg-purple-700 w-40"
          onClick={handleAdd}
          disabled={saving}
        >
          <Plus className="w-4 h-4 mr-1" />
          Add New Project
        </Button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <span className="text-red-700 text-sm">{error}</span>
        </div>
      )}

      {/* Search Input */}
      <div className="mb-4 relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search projects by name or year..."
          className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
          </button>
        )}
      </div>

      {(!projects || projects.length === 0) ? (
        <div className="text-gray-500 text-sm">No projects yet. Add a new project to get started!</div>
      ) : filteredProjects.length === 0 ? (
        <div className="text-gray-500 text-sm">No projects match your search criteria.</div>
      ) : (
        <ul className="divide-y">
          {displayedProjects.map(project => (
            <li key={project.id} className="py-3 flex flex-col md:flex-row md:items-center md:justify-between group">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleProjectClick(project)}
                    className="font-medium text-gray-900 hover:text-purple-600 cursor-pointer underline-offset-2 hover:underline"
                  >
                    {project.name}
                  </button>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ml-2 ${
                    project.status === 'completed' ? 'bg-green-100 text-green-700' : 
                    project.status === 'active' ? 'bg-blue-100 text-blue-700' : 
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {project.status}
                  </span>
                  <span className="text-xs text-gray-500 ml-2">{project.year}</span>
                  <span className="text-xs text-green-600 ml-2">${project.revenue?.toLocaleString() || 0}</span>
                </div>
                {project.deadline && <div className="text-xs text-gray-500 mt-1">Deadline: {project.deadline}</div>}
              </div>
              <div className="flex items-center gap-2 mt-2 md:mt-0 md:ml-4">
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => handleEdit(project)}
                  disabled={saving}
                >
                  Edit
                </Button>
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => handleDeleteClick(project.id)}
                  disabled={saving}
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Expand/Collapse Button */}
      {shouldShowExpandButton && (
        <div className="flex justify-center mt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
          >
            {isExpanded ? (
              <>
                <span className="mr-2">Show less</span>
                <ChevronUp className="w-4 h-4" />
              </>
            ) : (
              <>
                <span className="mr-2">Show {remainingCount} more project{remainingCount !== 1 ? 's' : ''}</span>
                <ChevronDown className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>
      )}

      {/* Add/Edit Project Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleFormSubmit} className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 flex flex-col gap-4 border">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-purple-700">{editProject ? 'Edit Project' : 'Add New Project'}</h2>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-600 text-2xl"
                onClick={() => { setShowAdd(false); setEditProject(null); }}
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
              Project Name
              <input
                type="text"
                name="name"
                className="mt-1 border rounded px-3 py-2 w-full"
                value={form.name}
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
                rows={3}
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
                Revenue ($)
                <input
                  type="number"
                  name="revenue"
                  min="0"
                  step="0.01"
                  className="mt-1 border rounded px-3 py-2 w-full"
                  value={form.revenue}
                  onChange={handleFormChange}
                  required
                  disabled={saving}
                />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm font-medium text-gray-700">
                Status
                <select
                  name="status"
                  className="mt-1 border rounded px-3 py-2 w-full"
                  value={form.status}
                  onChange={handleFormChange}
                  disabled={saving}
                >
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="on_hold">On Hold</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </label>
              <label className="text-sm font-medium text-gray-700">
                Deadline
                <input
                  type="date"
                  name="deadline"
                  className="mt-1 border rounded px-3 py-2 w-full"
                  value={form.deadline}
                  onChange={handleFormChange}
                  disabled={saving}
                />
              </label>
            </div>
            <div className="flex gap-2 mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => { setShowAdd(false); setEditProject(null); }}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-purple-600 hover:bg-purple-700 text-white"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  editProject ? 'Save Changes' : 'Add Project'
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
        title="Delete Project"
        message={`Are you sure you want to delete the project "${projectToDelete?.name}"? This action cannot be undone.`}
        loading={saving}
        itemType="Project"
      />

      {/* Project Detail Modal */}
      {showProjectDetail && selectedProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-purple-700">Project Details</h2>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-600 text-2xl"
                onClick={handleCloseProjectDetail}
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Name</label>
                <p className="mt-1 text-sm text-gray-900">{selectedProject.name}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Description</label>
                <p className="mt-1 text-sm text-gray-900">{selectedProject.description || 'No description available'}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Year</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedProject.year}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Revenue</label>
                  <p className="mt-1 text-sm text-green-600 font-medium">${selectedProject.revenue?.toLocaleString() || 0}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <p className="mt-1">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      selectedProject.status === 'completed' ? 'bg-green-100 text-green-700' : 
                      selectedProject.status === 'active' ? 'bg-blue-100 text-blue-700' : 
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {selectedProject.status}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Deadline</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedProject.deadline || 'No deadline set'}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseProjectDetail}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProjectManagementSection;