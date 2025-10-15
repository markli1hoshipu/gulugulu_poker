import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

import { 
  Users, 
  Mail, 
  Phone, 
  MapPin, 
  Building, 
  Star, 
  Search,
  Send,
  Calendar,
  User,
  DollarSign,
  TrendingUp,
  Clock,
  Eye,
  Download,
  RefreshCw,
  MessageSquare,
  History,
  CheckCircle,
  XCircle,
  Upload,
  X,
  Loader2,
  Globe,
  Database,
  Edit
} from 'lucide-react';

import UnifiedHeader from '../common/header/UnifiedHeader';
import UnifiedToolbar from '../common/toolbar/UnifiedToolbar';
import LeadEmailComposer from './LeadEmailComposer';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import leadsApiService from '../../services/leadsApi';

const EnhancedLeadGeneration = () => {
  // State management
  const [leads, setLeads] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [leadStats, setLeadStats] = useState({ total: 0, qualified: 0, hot: 0, avgScore: 0 });
  const [showEmailComposer, setShowEmailComposer] = useState(false);
  const [emailLead, setEmailLead] = useState(null);
  
  // Scraping state
  const [scrapingForm, setScrapingForm] = useState({
    location: '',
    industry: '',
    keywords: '',
    maxResults: 10
  });
  const [isScrapingModalOpen, setIsScrapingModalOpen] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  
  // CSV Upload state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const scrollContainerRef = useRef(null);



  // Load leads from API
  const loadLeads = useCallback(async (showErrors = false) => {
    setLoading(true);
    try {
      const response = await leadsApiService.getLeads(1, 100);
      setLeads(response.leads || []);
      
      // Calculate stats
      const total = response.leads?.length || 0;
      const qualified = response.leads?.filter(l => l.status === 'qualified').length || 0;
      const hot = response.leads?.filter(l => l.status === 'hot').length || 0;
      const avgScore = total > 0 ? Math.round(response.leads.reduce((sum, l) => sum + (l.score || 0), 0) / total) : 0;
      
      setLeadStats({ total, qualified, hot, avgScore });
    } catch (error) {
      console.error('Error loading leads:', error);
      // Only show error toast if explicitly requested (after successful operations)
      if (showErrors) {
        toast.error('Failed to reload leads');
      }
      // Set empty state for demo - this is normal on first load
      setLeads([]);
      setLeadStats({ total: 0, qualified: 0, hot: 0, avgScore: 0 });
    } finally {
      setLoading(false);
    }
  }, []);

  // Don't auto-load leads on mount since the Lead API starts with empty state
  // Users need to scrape or upload to get leads
  useEffect(() => {
    // Just set initial empty state
    setLeads([]);
    setLeadStats({ total: 0, qualified: 0, hot: 0, avgScore: 0 });
    setLoading(false);
  }, []);

  // Handle web scraping
  const handleScrapeLeads = async () => {
    if (!scrapingForm.location || !scrapingForm.industry) {
      toast.error('Please enter both location and industry');
      return;
    }

    setIsScraping(true);
    try {
      const keywords = scrapingForm.keywords ? scrapingForm.keywords.split(',').map(k => k.trim()) : [];
      
      // Try the demo endpoint first for easier testing
      let response;
      try {
        response = await leadsApiService.scrapeLeadsDemo(
        scrapingForm.location,
        scrapingForm.industry,
        keywords,
        scrapingForm.maxResults
      );
      } catch (demoError) {
        console.warn('Demo endpoint failed, trying authenticated endpoint:', demoError);
        response = await leadsApiService.scrapeLeads(
          scrapingForm.location,
          scrapingForm.industry,
          keywords,
          scrapingForm.maxResults
        );
      }

      if (response.status === 'success') {
        toast.success(`Successfully scraped ${response.total_found} leads`);
        setIsScrapingModalOpen(false);
        setScrapingForm({ location: '', industry: '', keywords: '', maxResults: 10 });
        loadLeads(true); // Reload leads to show new data
      } else {
        toast.error(response.message || 'Scraping failed');
      }
    } catch (error) {
      console.error('Scraping error:', error);
      toast.error('Failed to scrape leads');
    } finally {
      setIsScraping(false);
    }
  };

  // Handle CSV upload
  const handleFileUpload = async (file) => {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      // Use demo endpoint for easier testing
      const response = await leadsApiService.uploadCsvDemo(file);
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      setTimeout(() => {
        if (response.total_successful > 0) {
          toast.success(`Successfully uploaded ${response.total_successful} leads${response.total_failed > 0 ? ` (${response.total_failed} failed)` : ''}`);
          
          // Show errors if any
          if (response.errors && response.errors.length > 0) {
            console.warn('Upload errors:', response.errors);
            const errorSummary = response.errors.slice(0, 3).join('; ');
            toast.warning(`Some rows had issues: ${errorSummary}${response.errors.length > 3 ? '...' : ''}`);
          }
        } else {
          toast.error(`Failed to upload any leads. ${response.errors && response.errors.length > 0 ? response.errors[0] : 'Please check your CSV format.'}`);
        }
        
        setIsUploadModalOpen(false);
        setUploadProgress(0);
        loadLeads(true); // Reload leads to show new data
      }, 500);

    } catch (error) {
      console.error('Upload error:', error);
      
      // Show specific error message
      let errorMessage = 'Failed to upload CSV file';
      if (error.message.includes('Name is required') || error.message.includes('Company is required') || error.message.includes('Location is required')) {
        errorMessage = 'CSV must contain "name", "company", and "location" columns';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  // Download sample CSV
  const downloadSampleCsv = async () => {
    try {
      const response = await leadsApiService.getSampleCsv();
      const csvContent = response.csv_content;
      
      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sample_leads.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success('Sample CSV downloaded');
    } catch (error) {
      console.error('Error downloading sample CSV:', error);
      toast.error('Failed to download sample CSV');
    }
  };

  // Drag and drop handlers
  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  }, [handleFileUpload]);

  const onFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const getStatusColor = useCallback((status) => {
    const colors = {
      hot: 'bg-red-100 text-red-800',
      warm: 'bg-yellow-100 text-yellow-800',
      cold: 'bg-blue-100 text-blue-800',
      qualified: 'bg-green-100 text-green-800',
      contacted: 'bg-purple-100 text-purple-800'
    };
    return colors[status?.toLowerCase()] || 'bg-gray-100 text-gray-800';
  }, []);

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const matchesStatus = filterStatus === 'all' || lead.status?.toLowerCase() === filterStatus;
      const matchesSearch = (lead.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (lead.company || '').toLowerCase().includes(searchTerm.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [leads, filterStatus, searchTerm]);

  const formatDate = useCallback((dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    if (isNaN(date)) return 'Invalid Date';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }, []);

  const getStatusIcon = useCallback((status) => {
    const icons = {
      sent: <Send className="w-4 h-4 text-blue-500" />,
      opened: <Eye className="w-4 h-4 text-green-500" />,
      replied: <MessageSquare className="w-4 h-4 text-purple-500" />,
      completed: <CheckCircle className="w-4 h-4 text-green-500" />,
      scheduled: <Calendar className="w-4 h-4 text-blue-500" />,
      cancelled: <XCircle className="w-4 h-4 text-red-500" />
    };
    return icons[status] || <Clock className="w-4 h-4 text-gray-500" />;
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedLead(null);
  }, []);

  const handleSendEmail = useCallback((lead) => {
    setEmailLead(lead);
    setShowEmailComposer(true);
  }, []);

  const handleEmailSent = useCallback(async (emailData) => {
    console.log('Email sent response:', emailData); // Debug log
    toast.success('Email sent successfully!');
    setShowEmailComposer(false);

    // Update the specific lead's status based on backend response
    if (emailLead && emailLead.id && emailData.status_changed === true && emailData.new_status) {
      try {
        console.log(`🔄 Updating lead status: ${emailLead.id} -> ${emailData.new_status}`);

        // Use the same API call as the working dropdown
        await leadsApiService.updateLeadStatus(emailLead.id, emailData.new_status);

        // Update local state immediately after successful API call
        setLeads(prevLeads => {
          const updatedLeads = prevLeads.map(lead =>
            lead.id === emailLead.id
              ? { ...lead, status: emailData.new_status }
              : lead
          );
          console.log('✅ Lead status updated in UI:', updatedLeads.find(l => l.id === emailLead.id));
          return updatedLeads;
        });

        toast.success(`Lead status updated to ${emailData.new_status}`);
      } catch (error) {
        console.error('❌ Failed to update lead status:', error);
        toast.error('Email sent, but failed to update lead status');
      }
    }

    setEmailLead(null);
  }, [emailLead]);

  const renderEmptyState = () => (
    <div className="text-center py-20 bg-gray-50 rounded-lg">
      <Database className="w-16 h-16 mx-auto text-gray-300 mb-4" />
      <h3 className="text-xl font-semibold text-gray-800">Your Lead Database is Empty</h3>
      <p className="text-gray-500 mt-2 mb-6 max-w-md mx-auto">
        Start by scraping for new leads from the web or uploading your existing leads via a CSV file.
      </p>
      <div className="flex justify-center gap-4">
        <Button onClick={() => setIsScrapingModalOpen(true)}>
          <Globe className="w-4 h-4 mr-2" />
          Scrape New Leads
        </Button>
        <Button variant="outline" onClick={() => setIsUploadModalOpen(true)}>
          <Upload className="w-4 h-4 mr-2" />
          Upload CSV
        </Button>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      {/* Unified Header */}
      <UnifiedHeader
        title="Lead Generation"
        themeColor="blue"
        showConnection={false}
      />


      {/* Unified Toolbar */}
      <div className="bg-white">
        <UnifiedToolbar
          config={{
            primaryAction: {
              primaryLabel: 'Add Lead',
              onPrimaryAction: () => console.log('Add Lead clicked'),
              actionIcons: [
                {
                  icon: Upload,
                  label: 'Upload CSV',
                  tooltip: 'Upload leads from CSV file',
                  onClick: () => setIsUploadModalOpen(true),
                  disabled: isUploading
                },
                {
                  icon: Globe,
                  label: 'Scrape Leads',
                  tooltip: isScraping ? 'Scraping in progress...' : 'Scrape leads from web sources',
                  onClick: () => setIsScrapingModalOpen(true),
                  disabled: isScraping,
                  loading: isScraping
                },
                {
                  icon: RefreshCw,
                  label: 'Refresh Data',
                  tooltip: loading ? 'Loading...' : 'Refresh lead data',
                  onClick: () => loadLeads(true),
                  disabled: loading,
                  loading: loading
                }
              ]
            },
            search: {
              placeholder: 'Search leads...',
              value: searchTerm,
              onChange: setSearchTerm,
              onClear: () => setSearchTerm('')
            },
            filters: [
              {
                id: 'status-filter',
                icon: 'filter',
                label: 'Filter',
                title: 'Filter Leads',
                hasActiveFilters: filterStatus !== 'all',
                content: ({ onClose }) => (
                  <div className="space-y-6">
                    {/* Status Filter Section */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Filter by Status</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <label className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-gray-50">
                          <input
                            type="radio"
                            name="status-filter"
                            value="all"
                            checked={filterStatus === 'all'}
                            onChange={() => setFilterStatus('all')}
                            className="text-blue-600"
                          />
                          <span className="text-sm text-gray-700 font-medium">All Statuses</span>
                        </label>
                        {[
                          { value: 'hot', label: 'Hot' },
                          { value: 'warm', label: 'Warm' },
                          { value: 'cold', label: 'Cold' },
                          { value: 'qualified', label: 'Qualified' },
                          { value: 'contacted', label: 'Contacted' }
                        ].map((option) => (
                          <label key={option.value} className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-gray-50">
                            <input
                              type="radio"
                              name="status-filter"
                              value={option.value}
                              checked={filterStatus === option.value}
                              onChange={() => setFilterStatus(option.value)}
                              className="text-blue-600"
                            />
                            <span className="text-sm text-gray-700">{option.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    
                    {/* Lead Source Section */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Lead Source</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <label className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-gray-50">
                          <input
                            type="radio"
                            name="source-filter"
                            value="all"
                            checked={true}
                            onChange={() => {}}
                            className="text-blue-600"
                          />
                          <span className="text-sm text-gray-700 font-medium">All Sources</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-gray-50">
                          <input
                            type="radio"
                            name="source-filter"
                            value="scraped"
                            checked={false}
                            onChange={() => {}}
                            className="text-blue-600"
                          />
                          <span className="text-sm text-gray-700">Web Scraped</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-gray-50">
                          <input
                            type="radio"
                            name="source-filter"
                            value="uploaded"
                            checked={false}
                            onChange={() => {}}
                            className="text-blue-600"
                          />
                          <span className="text-sm text-gray-700">CSV Upload</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-gray-50">
                          <input
                            type="radio"
                            name="source-filter"
                            value="manual"
                            checked={false}
                            onChange={() => {}}
                            className="text-blue-600"
                          />
                          <span className="text-sm text-gray-700">Manual Entry</span>
                        </label>
                      </div>
                    </div>
                    
                    {/* Reset Button */}
                    <div className="pt-3 border-t border-gray-200 flex justify-between items-center">
                      <div className="text-xs text-gray-500">
                        {filteredLeads.length} lead{filteredLeads.length !== 1 ? 's' : ''} found
                      </div>
                      <button
                        onClick={() => {
                          setFilterStatus('all');
                          onClose();
                        }}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Reset filters
                      </button>
                    </div>
                  </div>
                )
              }
            ],
            themeColor: 'blue'
          }}
        />

        {/* Results Summary */}
        <div className="px-4 py-2 bg-gray-50 border-t">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>{filteredLeads.length} lead{filteredLeads.length !== 1 ? 's' : ''} found</span>
            {searchTerm && (
              <div className="flex items-center gap-1">
                <span>•</span>
                <span>Searching: "{searchTerm}"</span>
              </div>
            )}
            {filterStatus !== 'all' && (
              <div className="flex items-center gap-1">
                <span>•</span>
                <span>Status: {filterStatus}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 bg-gray-50/50">
        {leads.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <AnimatePresence>
                {filteredLeads.map(lead => (
                  <motion.div
                    key={lead.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    onClick={() => setSelectedLead(lead)}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-lg hover:border-blue-300 cursor-pointer transition-all duration-300"
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-base font-bold text-gray-900">{lead.name}</h3>
                          <p className="text-sm text-gray-500 flex items-center gap-1">
                            <Building className="w-3 h-3" />
                            {lead.company}
                          </p>
                        </div>
                        <div className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(lead.status)}`}>
                          {lead.status}
                        </div>
                      </div>
                      <div className="mt-3 text-sm space-y-1">
                        <p className="flex items-center gap-2 text-gray-700">
                          <Mail className="w-3.5 h-3.5 text-gray-400" />
                          <span>{lead.email}</span>
                        </p>
                        <p className="flex items-center gap-2 text-gray-700">
                          <Phone className="w-3.5 h-3.5 text-gray-400" />
                          <span>{lead.phone}</span>
                        </p>
                        <p className="flex items-center gap-2 text-gray-700">
                          <MapPin className="w-3.5 h-3.5 text-gray-400" />
                          <span>{lead.location}</span>
                        </p>
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex items-center">
                          <Star className="w-4 h-4 text-yellow-400 mr-1" />
                          <span className="text-sm font-medium">{lead.score}</span>
                        </div>
                        <div className="text-xs text-gray-400">
                          Last activity: {formatDate(lead.last_activity)}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </>
        ) : (
          renderEmptyState()
        )}
      </div>

      {/* Scraping Modal */}
      <AnimatePresence>
        {isScrapingModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center"
            onClick={() => setIsScrapingModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 border-b">
                <h2 className="text-xl font-bold flex items-center gap-2"><Globe className="text-blue-600"/>Web Scraping for Leads</h2>
                <p className="text-sm text-gray-500 mt-1">Find new prospects from the web.</p>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Location (City or State)</label>
                  <input
                    type="text"
                    placeholder="e.g., San Francisco"
                    value={scrapingForm.location}
                    onChange={e => setScrapingForm({...scrapingForm, location: e.target.value})}
                    className="w-full mt-1 p-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Industry</label>
                  <input
                    type="text"
                    placeholder="e.g., Software"
                    value={scrapingForm.industry}
                    onChange={e => setScrapingForm({...scrapingForm, industry: e.target.value})}
                    className="w-full mt-1 p-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Keywords (comma-separated)</label>
                  <input
                    type="text"
                    placeholder="e.g., B2B, SaaS"
                    value={scrapingForm.keywords}
                    onChange={e => setScrapingForm({...scrapingForm, keywords: e.target.value})}
                    className="w-full mt-1 p-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Max Results</label>
                  <input
                    type="number"
                    value={scrapingForm.maxResults}
                    onChange={e => setScrapingForm({...scrapingForm, maxResults: parseInt(e.target.value) || 10})}
                    className="w-full mt-1 p-2 border rounded-md"
                  />
                </div>
              </div>
              <div className="p-4 bg-gray-50 border-t flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsScrapingModalOpen(false)}>Cancel</Button>
                <Button onClick={handleScrapeLeads} disabled={isScraping}>
                  {isScraping ? <Loader2 className="animate-spin w-4 h-4 mr-2"/> : <Search className="w-4 h-4 mr-2"/>}
                  {isScraping ? 'Scraping...' : 'Start Scraping'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CSV Upload Modal */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center"
            onClick={() => setIsUploadModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 border-b">
                <h2 className="text-xl font-bold flex items-center gap-2"><Upload className="text-blue-600"/>Upload Leads from CSV</h2>
                <p className="text-sm text-gray-500 mt-1">Import your existing lead data.</p>
              </div>
              <div className="p-6">
                <div
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
                    dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="font-semibold text-gray-700">Drop your CSV file here</p>
                  <p className="text-sm text-gray-500">or</p>
                  <Button variant="link" onClick={() => fileInputRef.current.click()}>browse files</Button>
                  <input type="file" ref={fileInputRef} onChange={onFileSelect} accept=".csv" className="hidden"/>
                </div>
                {isUploading && (
                  <div className="mt-4">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
                    </div>
                    <p className="text-center text-sm text-gray-600 mt-2">{uploadProgress}% uploaded</p>
                  </div>
                )}
                <div className="mt-4 text-center">
                  <Button variant="link" size="sm" onClick={downloadSampleCsv}>
                    <Download className="w-3 h-3 mr-1"/>
                    Download sample CSV
                  </Button>
                </div>
              </div>
              <div className="p-4 bg-gray-50 border-t flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsUploadModalOpen(false)}>Close</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lead Detail Modal */}
      <AnimatePresence>
        {selectedLead && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center"
            onClick={handleCloseModal}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 50 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">{selectedLead.name}</h2>
                      <p className="text-gray-600">{selectedLead.company}</p>
                    </div>
                    <Button 
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={() => handleSendEmail(selectedLead)}
                    >
                      <Send className="w-4 h-4 mr-2"/>Send Email
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(selectedLead.status)}`}>
                      {selectedLead.status}
                    </div>
                    <div className="flex items-center gap-1 bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full">
                      <Star className="w-4 h-4 text-yellow-500" />
                      <span className="font-semibold">{selectedLead.score}</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={handleCloseModal}>
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex-1 flex overflow-hidden">
                <div className="w-1/3 border-r border-gray-200 p-6 overflow-y-auto">
                  <h3 className="text-lg font-semibold mb-4">Lead Details</h3>
                  <div className="space-y-4 text-sm">
                    <div>
                      <p className="font-medium text-gray-800 flex items-center gap-2"><User className="w-4 h-4 text-gray-500"/>Contact</p>
                      <p className="text-gray-600">{selectedLead.email}</p>
                      <p className="text-gray-600">{selectedLead.phone}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-800 flex items-center gap-2"><MapPin className="w-4 h-4 text-gray-500"/>Location</p>
                      <p className="text-gray-600">{selectedLead.location}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-800 flex items-center gap-2"><DollarSign className="w-4 h-4 text-gray-500"/>Deal Value</p>
                      <p className="text-gray-600">${(selectedLead.deal_value || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-800 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-gray-500"/>Source</p>
                      <p className="text-gray-600">{selectedLead.source}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-800 flex items-center gap-2"><Clock className="w-4 h-4 text-gray-500"/>Last Activity</p>
                      <p className="text-gray-600">{formatDate(selectedLead.last_activity)}</p>
                    </div>
                  </div>
                  <div className="mt-6 flex flex-col gap-2">
                    <Button variant="outline"><Calendar className="w-4 h-4 mr-2"/>Schedule Meeting</Button>
                    <Button variant="outline"><Edit className="w-4 h-4 mr-2"/>Edit Lead</Button>
                  </div>
                </div>
                <div className="w-2/3 p-6 overflow-y-auto">
                  <h3 className="text-lg font-semibold mb-4">Interaction History (Coming Soon)</h3>
                  <div className="text-center text-gray-500 py-10">
                    <History className="w-12 h-12 mx-auto mb-2"/>
                    <p>Full interaction history will be displayed here.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Email Composer Modal */}
      {showEmailComposer && emailLead && (
        <LeadEmailComposer
          lead={emailLead}
          onClose={() => {
            setShowEmailComposer(false);
            setEmailLead(null);
          }}
          onEmailSent={handleEmailSent}
        />
      )}
    </div>
  );
};

export default EnhancedLeadGeneration; 