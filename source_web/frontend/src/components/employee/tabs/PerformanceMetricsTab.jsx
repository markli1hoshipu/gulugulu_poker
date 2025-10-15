import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Star,
  Award,
  Users,
  User,
  Target,
  FileText,
  Loader2,
  Edit2,
  Save,
  X,
  Plus,
  Trash2
} from 'lucide-react';
import { useEmployeeProfile } from '../context/EmployeeProfileContext';
import { Button } from '../../ui/button';
import GoalSettingSection from '../sections/GoalSettingSection';
import employeeApiService from '../../../services/employeeApi';

const PerformanceMetricsTab = () => {
  const { selectedEmployee, refreshEmployeeData } = useEmployeeProfile();

  // State for performance data
  const [performanceData, setPerformanceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Tab-specific state
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedProjectYear, setSelectedProjectYear] = useState('');
  const [projectSearchTerm, setProjectSearchTerm] = useState('');
  const [employeeGoals, setEmployeeGoals] = useState([]);
  
  // Projects edit state
  const [isEditingProjects, setIsEditingProjects] = useState(false);
  const [projectsFormData, setProjectsFormData] = useState([]);

  // Self-assessments edit state
  const [isEditingSelfAssessment, setIsEditingSelfAssessment] = useState(false);
  const [selfAssessmentFormData, setSelfAssessmentFormData] = useState({
    date: '',
    highlights: []
  });

  // Milestones edit state
  const [isEditingMilestones, setIsEditingMilestones] = useState(false);
  const [milestonesFormData, setMilestonesFormData] = useState([]);

  // Fetch performance data when selected employee changes
  useEffect(() => {
    const fetchPerformanceData = async () => {
      if (!selectedEmployee?.id) return;

      setLoading(true);
      setError(null);

      try {
        const [data, goals] = await Promise.all([
          employeeApiService.getEmployeePerformance(selectedEmployee.id),
          employeeApiService.getEmployeeGoals(selectedEmployee.id).catch(() => [])
        ]);
        setPerformanceData(data);
        setEmployeeGoals(goals || []);
      } catch (err) {
        console.error('Error fetching employee performance:', err);
        setError('Failed to load performance data');
      } finally {
        setLoading(false);
      }
    };

    fetchPerformanceData();
  }, [selectedEmployee?.id]);

  // Projects edit functions
  const startEditingProjects = () => {
    const currentProjects = performanceData?.projects || [];
    const formattedProjects = currentProjects.map(project => ({
      id: project.id || Date.now() + Math.random(),
      name: project.name || '',
      description: project.description || '',
      year: project.year || new Date().getFullYear(),
      status: project.status || 'In Progress',
      revenue: project.revenue || 0
    }));
    setProjectsFormData(formattedProjects);
    setIsEditingProjects(true);
  };

  const cancelEditingProjects = () => {
    setIsEditingProjects(false);
    setProjectsFormData([]);
  };

  const addNewProject = () => {
    const newProject = {
      id: Date.now() + Math.random(),
      name: '',
      description: '',
      year: new Date().getFullYear(),
      status: 'In Progress',
      revenue: 0
    };
    setProjectsFormData([...projectsFormData, newProject]);
  };

  const removeProject = (index) => {
    setProjectsFormData(projectsFormData.filter((_, i) => i !== index));
  };

  const handleProjectChange = (index, field, value) => {
    setProjectsFormData(prev => prev.map((project, i) => 
      i === index ? { ...project, [field]: value } : project
    ));
  };

  const saveProjects = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Filter out completely empty projects
      const validProjects = projectsFormData.filter(project => 
        project.name.trim() !== '' || project.description.trim() !== ''
      );

      // Update the performance data with new projects
      const updateData = {
        ...performanceData,
        projects: validProjects,
        employee_id: selectedEmployee.id
      };

      const response = await fetch(`http://localhost:7001/api/employees/${selectedEmployee.id}/performance`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error(`Failed to update projects: ${response.statusText}`);
      }

      // Refresh employee data to update all components
      await refreshEmployeeData();
      
      // Also refresh local performance data
      const updatedPerformance = await employeeApiService.getEmployeePerformance(selectedEmployee.id);
      setPerformanceData(updatedPerformance);
      
      // Exit edit mode
      setIsEditingProjects(false);
      setProjectsFormData([]);
    } catch (err) {
      console.error('Error updating projects:', err);
      setError('Failed to update projects. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Self-assessment edit functions
  const startEditingSelfAssessment = () => {
    const currentAssessment = performanceData?.self_assessments || {};
    setSelfAssessmentFormData({
      date: currentAssessment.date || new Date().toISOString().split('T')[0],
      highlights: Array.isArray(currentAssessment.highlights) ? [...currentAssessment.highlights] : []
    });
    setIsEditingSelfAssessment(true);
  };

  const cancelEditingSelfAssessment = () => {
    setIsEditingSelfAssessment(false);
    setSelfAssessmentFormData({
      date: '',
      highlights: []
    });
  };

  const addNewHighlight = () => {
    setSelfAssessmentFormData(prev => ({
      ...prev,
      highlights: [...prev.highlights, '']
    }));
  };

  const removeHighlight = (index) => {
    setSelfAssessmentFormData(prev => ({
      ...prev,
      highlights: prev.highlights.filter((_, i) => i !== index)
    }));
  };

  const handleHighlightChange = (index, value) => {
    setSelfAssessmentFormData(prev => ({
      ...prev,
      highlights: prev.highlights.map((highlight, i) => i === index ? value : highlight)
    }));
  };

  const saveSelfAssessment = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Filter out empty highlights
      const validHighlights = selfAssessmentFormData.highlights.filter(highlight => 
        highlight.trim() !== ''
      );
      
      // Update the performance data with new self-assessment
      const updateData = {
        ...performanceData,
        self_assessments: {
          date: selfAssessmentFormData.date,
          highlights: validHighlights
        },
        employee_id: selectedEmployee.id
      };

      const response = await fetch(`http://localhost:7001/api/employees/${selectedEmployee.id}/performance`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error(`Failed to update self-assessment: ${response.statusText}`);
      }

      // Refresh employee data to update all components
      await refreshEmployeeData();
      
      // Also refresh local performance data
      const updatedPerformance = await employeeApiService.getEmployeePerformance(selectedEmployee.id);
      setPerformanceData(updatedPerformance);
      
      // Exit edit mode
      setIsEditingSelfAssessment(false);
      setSelfAssessmentFormData({
        date: '',
        highlights: []
      });
    } catch (err) {
      console.error('Error updating self-assessment:', err);
      setError('Failed to update self-assessment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Milestones edit functions
  const startEditingMilestones = () => {
    const currentMilestones = performanceData?.milestones || [];
    const formattedMilestones = currentMilestones.map(milestone => ({
      id: milestone.id || Date.now() + Math.random(),
      label: milestone.label || '',
      year: milestone.year || new Date().getFullYear(),
      icon: 'Star', // Use Star icon for all milestones as requested
      iconColor: 'text-yellow-600'
    }));
    setMilestonesFormData(formattedMilestones);
    setIsEditingMilestones(true);
  };

  const cancelEditingMilestones = () => {
    setIsEditingMilestones(false);
    setMilestonesFormData([]);
  };

  const addNewMilestone = () => {
    const newMilestone = {
      id: Date.now() + Math.random(),
      label: '',
      year: new Date().getFullYear(),
      icon: 'Star', // Use Star icon for all milestones
      iconColor: 'text-yellow-600'
    };
    setMilestonesFormData([...milestonesFormData, newMilestone]);
  };

  const removeMilestone = (index) => {
    setMilestonesFormData(prev => prev.filter((_, i) => i !== index));
  };

  const handleMilestoneChange = (index, field, value) => {
    setMilestonesFormData(prev => prev.map((milestone, i) => 
      i === index ? { ...milestone, [field]: value } : milestone
    ));
  };

  const saveMilestones = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Filter out completely empty milestones
      const validMilestones = milestonesFormData.filter(milestone => 
        milestone.label.trim() !== ''
      );
      
      // Update the performance data with new milestones
      const updateData = {
        ...performanceData,
        milestones: validMilestones,
        employee_id: selectedEmployee.id
      };

      const response = await fetch(`http://localhost:7001/api/employees/${selectedEmployee.id}/performance`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error(`Failed to update milestones: ${response.statusText}`);
      }

      // Refresh employee data to update all components
      await refreshEmployeeData();
      
      // Also refresh local performance data
      const updatedPerformance = await employeeApiService.getEmployeePerformance(selectedEmployee.id);
      setPerformanceData(updatedPerformance);
      
      // Exit edit mode
      setIsEditingMilestones(false);
      setMilestonesFormData([]);
    } catch (err) {
      console.error('Error updating milestones:', err);
      setError('Failed to update milestones. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Don't render if no employee or performance data
  if (!selectedEmployee) {
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
        {/* Goal Setting Skeleton */}
        <div className="bg-white rounded-lg border p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-gray-200 rounded-full animate-pulse" />
              <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="h-9 w-40 bg-gray-200 rounded-lg animate-pulse" />
          </div>
          {[...Array(2)].map((_, i) => (
            <div key={i} className={`py-3 ${i === 0 ? 'border-b' : ''}`}>
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="h-4 w-64 bg-gray-200 rounded animate-pulse mb-2" />
                  <div className="h-3 w-40 bg-gray-100 rounded animate-pulse mb-2" />
                  <div className="w-full bg-gray-200 rounded h-1.5">
                    <div className="h-1.5 bg-gray-300 rounded animate-pulse" style={{ width: '60%' }} />
                  </div>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <div className="h-9 w-36 bg-gray-200 rounded-lg animate-pulse" />
                  <div className="h-9 w-20 bg-gray-200 rounded-lg animate-pulse" />
                  <div className="h-9 w-24 bg-gray-200 rounded-lg animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Past Projects Skeleton */}
        <div className="bg-white rounded-lg border p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-5 h-5 bg-gray-200 rounded-full animate-pulse" />
            <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 border rounded">
                <div>
                  <div className="h-4 w-48 bg-gray-200 rounded animate-pulse mb-1" />
                  <div className="h-3 w-32 bg-gray-100 rounded animate-pulse" />
                </div>
                <div className="h-6 w-16 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        {/* Milestones Skeleton */}
        <div className="bg-white rounded-lg border p-5 shadow-sm">
          <div className="h-5 w-40 bg-gray-200 rounded animate-pulse mb-4" />
          <div className="flex flex-wrap gap-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-7 w-32 bg-gray-200 rounded-full animate-pulse" />
            ))}
          </div>
        </div>

        {/* Peer Evaluations Skeleton */}
        <div className="bg-white rounded-lg border p-5 shadow-sm">
          <div className="h-5 w-44 bg-gray-200 rounded animate-pulse mb-4" />
          <div className="flex items-center gap-8 mb-2">
            <div className="h-7 w-12 bg-gray-200 rounded animate-pulse" />
            <div className="h-6 w-10 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="h-4 w-28 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-3 w-64 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        </div>

        {/* Self-Assessments Skeleton */}
        <div className="bg-white rounded-lg border p-5 shadow-sm">
          <div className="h-5 w-40 bg-gray-200 rounded animate-pulse mb-4" />
          <div className="h-3 w-48 bg-gray-100 rounded animate-pulse mb-3" />
          <div className="h-4 w-28 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-3 w-64 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !performanceData) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg border p-5 shadow-sm">
          <p className="text-gray-500">{error || 'No performance data available for this employee.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-[600px]">
      <div className="py-4 px-5">
        <div className="grid grid-cols-1 xl:grid-cols-10 gap-4">
          {/* Left Column - Main Content */}
          <div className="xl:col-span-7 space-y-4">
            {/* Goal Setting Section */}
            <div className="bg-white border border-gray-200 rounded-lg">
              <GoalSettingSection
                employeeId={selectedEmployee.id}
                goals={employeeGoals}
                setGoals={setEmployeeGoals}
                skipInitialLoad
                renderHeader={(onEditClick, onAddGoal) => (
                  <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-200">
                    <h3 className="text-lg font-bold text-black font-[Inter] flex items-center gap-2">
                      <Target className="w-5 h-5 text-green-600" />
                      Goal Setting
                    </h3>
                    <div className="flex items-center gap-2">
                      {onEditClick && (
                        <button
                          onClick={onEditClick}
                          className="flex items-center gap-2 px-3 py-1 text-sm text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                          Edit
                        </button>
                      )}
                      <Button
                        size="xs"
                        onClick={onAddGoal}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs bg-indigo-950 text-white hover:bg-indigo-950/90"
                      >
                        <Plus className="w-3 h-3" />
                        Add Goal
                      </Button>
                    </div>
                  </div>
                )}
              />
            </div>

            {/* Past Projects */}
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-200">
                <h3 className="text-lg font-bold text-black font-[Inter] flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  Past Projects
                </h3>
                {!isEditingProjects && (
                  <button
                    onClick={startEditingProjects}
                    className="flex items-center gap-2 px-3 py-1 text-sm text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                )}
              </div>
              <div className="p-6">
                {isEditingProjects ? (
                  /* Edit Form */
                  <div className="space-y-6">
                    {/* Add Project Button */}
                    <div className="flex justify-between items-center">
                      <h4 className="text-base font-medium text-gray-900">Projects</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={addNewProject}
                        className="flex items-center gap-1 text-green-600 hover:text-green-700 hover:bg-green-50 text-sm"
                      >
                        <Plus className="w-3 h-3" />
                        Add
                      </Button>
                    </div>

                    {/* Projects Form */}
                    <div className="space-y-4">
                      {projectsFormData.map((project, index) => (
                        <div key={index} className="border rounded-lg p-4 bg-gray-50">
                          <div className="flex items-center justify-between mb-3">
                            <h5 className="text-sm font-medium text-gray-700">Project #{index + 1}</h5>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeProject(index)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Project Name *
                              </label>
                              <input
                                type="text"
                                value={project.name}
                                onChange={(e) => handleProjectChange(index, 'name', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                                placeholder="Enter project name"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Year
                              </label>
                              <input
                                type="number"
                                value={project.year}
                                onChange={(e) => handleProjectChange(index, 'year', parseInt(e.target.value) || new Date().getFullYear())}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                                min="2000"
                                max="2030"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Description
                              </label>
                              <textarea
                                value={project.description}
                                onChange={(e) => handleProjectChange(index, 'description', e.target.value)}
                                rows={2}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                                placeholder="Enter project description"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Status
                              </label>
                              <select
                                value={project.status}
                                onChange={(e) => handleProjectChange(index, 'status', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                              >
                                <option value="In Progress">In Progress</option>
                                <option value="Completed">Completed</option>
                                <option value="On Hold">On Hold</option>
                                <option value="Cancelled">Cancelled</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Revenue ($)
                              </label>
                              <input
                                type="number"
                                value={project.revenue}
                                onChange={(e) => handleProjectChange(index, 'revenue', parseFloat(e.target.value) || 0)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                                min="0"
                                step="1000"
                                placeholder="0"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                      {projectsFormData.length === 0 && (
                        <p className="text-gray-500 text-sm italic text-center py-4">No projects added yet. Click "Add" to create your first project.</p>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3 pt-4 border-t">
                      <Button
                        onClick={saveProjects}
                        disabled={loading}
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
                      >
                        <Save className="w-4 h-4" />
                        {loading ? 'Saving...' : 'Save Changes'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={cancelEditingProjects}
                        disabled={loading}
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
                    {(() => {
                      // Project data
                      const projects = performanceData.projects || [];

                      // Extract unique years and sort descending
                      const years = Array.from(new Set(projects.map(p => p.year))).sort((a, b) => b - a);

                      // Set default to "All" if not set
                      if (!selectedProjectYear) {
                        setSelectedProjectYear('all');
                      }

                      // Filter projects by year and search term
                      const filtered = projects.filter(p =>
                        (selectedProjectYear === 'all' || p.year.toString() === selectedProjectYear) &&
                        (!projectSearchTerm ||
                          p.name.toLowerCase().includes(projectSearchTerm.toLowerCase()) ||
                          p.description.toLowerCase().includes(projectSearchTerm.toLowerCase())
                        )
                      );

                      return (
                        <>
                          {projects.length > 0 && (
                            <div className="flex items-center gap-3 mb-4">
                              <select
                                className="border rounded px-2 py-1 text-sm"
                                value={selectedProjectYear}
                                onChange={e => setSelectedProjectYear(e.target.value)}
                              >
                                <option value="all">All</option>
                                {years.map(y => (
                                  <option key={y} value={y}>{y}</option>
                                ))}
                              </select>
                              <input
                                type="text"
                                placeholder="Search projects..."
                                className="border rounded px-3 py-1 text-sm flex-1"
                                value={projectSearchTerm}
                                onChange={e => setProjectSearchTerm(e.target.value)}
                              />
                            </div>
                          )}
                          {filtered.length > 0 ? (
                            <div className="space-y-3">
                              {filtered.map((project, idx) => (
                                <div key={idx} className="border rounded-lg p-3 hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedProject(project)}>
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <h4 className="font-medium text-gray-900">{project.name}</h4>
                                      <p className="text-sm text-gray-600">{project.description}</p>
                                      <div className="flex items-center gap-4 mt-1">
                                        <span className="text-xs text-gray-500">{project.year} • {project.status}</span>
                                        <span className="text-xs text-green-600">${project.revenue?.toLocaleString()}</span>
                                      </div>
                                    </div>
                                    <button className="text-blue-600 text-sm hover:underline">View</button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-8 text-gray-500">
                              {projects.length === 0 ? 'No projects added yet. Click "Edit" to add your first project!' : (projectSearchTerm ? 'No projects match your search.' : 'No projects found.')}
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </>
                )}
              </div>
            </div>

            {/* Peer Evaluations */}
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-200">
                <h3 className="text-lg font-bold text-black font-[Inter] flex items-center gap-2">
                  <Users className="w-5 h-5 text-green-600" />
                  Peer Evaluations
                </h3>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-8 mb-2">
                  <div className="flex flex-col items-center">
                    <span className="text-2xl font-bold text-green-700">{performanceData.peer_evaluations?.averageScore || 'N/A'}</span>
                    <span className="text-xs text-gray-500">Avg Score</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-lg font-bold text-purple-700">{performanceData.peer_evaluations?.totalReviews || 'N/A'}</span>
                    <span className="text-xs text-gray-500">Reviews</span>
                  </div>
                </div>
                <div className="text-sm font-medium text-gray-800 mb-2">Top Feedback</div>
                <ul className="space-y-1 text-sm text-gray-600">
                  {(performanceData.peer_evaluations?.feedback || []).length > 0 ? (
                    performanceData.peer_evaluations.feedback.map((feedback, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-green-600 mt-0.5">•</span>
                        <span>"{feedback}"</span>
                      </li>
                    ))
                  ) : (
                    <li className="flex items-start gap-2">
                      <span className="text-gray-400 mt-0.5">•</span>
                      <span className="text-gray-500">No feedback available yet</span>
                    </li>
                  )}
                </ul>
              </div>
            </div>

            {/* Self-Assessments */}
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-200">
                <h3 className="text-lg font-bold text-black font-[Inter] flex items-center gap-2">
                  <User className="w-5 h-5 text-green-600" />
                  Self-Assessments
                </h3>
                {!isEditingSelfAssessment && (
                  <button
                    onClick={startEditingSelfAssessment}
                    className="flex items-center gap-2 px-3 py-1 text-sm text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                )}
              </div>
              <div className="p-6">
                {isEditingSelfAssessment ? (
                  /* Edit Form */
                  <div className="space-y-6">
                    {/* Assessment Date */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Assessment Date
                      </label>
                      <input
                        type="date"
                        value={selfAssessmentFormData.date}
                        onChange={(e) => setSelfAssessmentFormData(prev => ({ ...prev, date: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                      />
                    </div>

                    {/* Highlights */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="block text-sm font-medium text-gray-700">
                          Highlights & Strengths
                        </label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={addNewHighlight}
                          className="flex items-center gap-1 text-green-600 hover:text-green-700 hover:bg-green-50 text-sm"
                        >
                          <Plus className="w-3 h-3" />
                          Add
                        </Button>
                      </div>
                      <div className="space-y-3">
                        {selfAssessmentFormData.highlights.map((highlight, index) => (
                          <div key={index} className="flex items-start gap-3">
                            <div className="flex-1">
                              <textarea
                                value={highlight}
                                onChange={(e) => handleHighlightChange(index, e.target.value)}
                                placeholder="Describe a key strength or achievement..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                                rows={2}
                              />
                            </div>
                            <Button
                              type="button"
                              size="xs"
                              variant="outline"
                              onClick={() => removeHighlight(index)}
                              className="mt-1 text-red-600 hover:bg-red-50 border-red-300"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                        {selfAssessmentFormData.highlights.length === 0 && (
                          <p className="text-gray-500 text-sm italic text-center py-4">No highlights added yet. Click "Add" to create your first highlight.</p>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3 pt-4 border-t">
                      <Button
                        onClick={saveSelfAssessment}
                        disabled={loading}
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
                      >
                        <Save className="w-4 h-4" />
                        {loading ? 'Saving...' : 'Save Changes'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={cancelEditingSelfAssessment}
                        disabled={loading}
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
                    <div className="text-sm text-gray-500 mb-3">Most Recent: {performanceData.self_assessments?.date || 'No assessment date available'}</div>
                    <div className="text-sm font-medium text-gray-800 mb-2">Highlights</div>
                    <ul className="space-y-1 text-sm text-gray-600">
                      {(performanceData.self_assessments?.highlights || []).length > 0 ?
                        performanceData.self_assessments.highlights.map((highlight, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-green-600 mt-0.5">•</span>
                            <span>Strength: "{highlight}"</span>
                          </li>
                        )) : (
                          <li className="flex items-start gap-2">
                            <span className="text-gray-400 mt-0.5">•</span>
                            <span className="text-gray-500">No self-assessment data available yet</span>
                          </li>
                        )
                      }
                    </ul>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="col-span-3 space-y-4">
            {/* Performance Overview */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                Performance Overview
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Total Revenue</label>
                  <p className="text-2xl font-bold text-blue-700">${performanceData.total_revenue?.toLocaleString() || '0'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Total Projects</label>
                  <p className="text-2xl font-bold text-purple-700">{(performanceData.projects || []).length}</p>
                </div>
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-500 mb-3">Projects</h4>
                  <div className="space-y-2">
                    {(performanceData.top_projects || []).map((proj, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm">
                        <span className="text-gray-900 font-medium">{proj.name}</span>
                        <span className="text-gray-600">${proj.revenue?.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Milestones Achieved */}
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Award className="w-5 h-5 text-green-600" />
                  Milestones Achieved
                </h3>
                {!isEditingMilestones && (
                  <button
                    onClick={startEditingMilestones}
                    className="flex items-center gap-2 px-3 py-1 text-sm text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                )}
              </div>
              <div className="p-6">
                {isEditingMilestones ? (
                  /* Edit Form */
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h4 className="text-base font-medium text-gray-900">Milestones</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={addNewMilestone}
                        className="flex items-center gap-1 text-green-600 hover:text-green-700 hover:bg-green-50 text-sm"
                      >
                        <Plus className="w-3 h-3" />
                        Add
                      </Button>
                    </div>

                    {/* Milestones Form */}
                    <div className="space-y-4">
                      {milestonesFormData.map((milestone, index) => (
                        <div key={milestone.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                              <Star className="w-3 h-3 text-yellow-600" />
                            </div>
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Milestone Achievement
                                </label>
                                <input
                                  type="text"
                                  value={milestone.label}
                                  onChange={(e) => handleMilestoneChange(index, 'label', e.target.value)}
                                  placeholder="e.g., Technical Excellence Award"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Year
                                </label>
                                <input
                                  type="number"
                                  value={milestone.year}
                                  onChange={(e) => handleMilestoneChange(index, 'year', parseInt(e.target.value) || new Date().getFullYear())}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                                  min="2000"
                                  max="2030"
                                />
                              </div>
                            </div>
                            <Button
                              type="button"
                              size="xs"
                              variant="outline"
                              onClick={() => removeMilestone(index)}
                              className="text-red-600 hover:bg-red-50 border-red-300 mt-6"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      {milestonesFormData.length === 0 && (
                        <p className="text-gray-500 text-sm italic text-center py-4">No milestones added yet. Click "Add" to create your first milestone.</p>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3 pt-4 border-t">
                      <Button
                        onClick={saveMilestones}
                        disabled={loading}
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
                      >
                        <Save className="w-4 h-4" />
                        {loading ? 'Saving...' : 'Save Changes'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={cancelEditingMilestones}
                        disabled={loading}
                        className="flex items-center gap-2"
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* Display Mode */
                  <div className="space-y-3">
                    {(performanceData.milestones || []).map((milestone, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center">
                          <Star className="w-3 h-3 text-yellow-600" />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">{milestone?.label}</div>
                          <div className="text-xs text-gray-500">({milestone?.year})</div>
                        </div>
                      </div>
                    ))}
                    {(performanceData.milestones || []).length === 0 && (
                      <div className="text-center py-4">
                        <span className="text-gray-500 text-sm">No milestones recorded yet.</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceMetricsTab;