import React, { useState, useCallback, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

import {
  Zap,
  Upload,
  FileText,
  X,
  Download,
  CheckCircle,
  Building,
  Star,
  MapPin,
  Mail,
  Phone,
  Globe,
  BarChart3,
  TrendingUp,
  Clock,
  RefreshCw,
  Activity,
  Users,
  ArrowLeftRight
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import UnifiedWorkflowManager from './UnifiedWorkflowManager';
import AIPromptInput from './AIPromptInput';
import PreviewLeadsTable from './PreviewLeadsTable';
import EnrichmentHistory from './EnrichmentHistory';
import leadsApiService from '../../services/leadsApi';
import { useLeadContext } from '../../contexts/LeadContext';

const GeneratingNewLeads = () => {
  const { loadLeads } = useLeadContext();
  // CSV Upload state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Workflow Results State
  const [workflowResults, setWorkflowResults] = useState(null);
  const [workflowProgress, setWorkflowProgress] = useState(0);
  const [isWorkflowExecuting, setIsWorkflowExecuting] = useState(false);
  const [workflowCurrentStage, setWorkflowCurrentStage] = useState('');
  const [workflowStats, setWorkflowStats] = useState({
    companiesFound: 0,
    leadsCreated: 0,
    qualifiedLeads: 0,
    averageScore: 0
  });

  // Selected leads state for manual saving
  const [selectedLeads, setSelectedLeads] = useState(new Set());
  const [isSavingLeads, setIsSavingLeads] = useState(false);

  // Two-stage workflow state
  const [workflowStage, setWorkflowStage] = useState('input'); // 'input' | 'preview' | 'enriched'
  const [previewLeads, setPreviewLeads] = useState([]);
  const [selectedForEnrichment, setSelectedForEnrichment] = useState(new Set());
  const [isEnriching, setIsEnriching] = useState(false);

  // View toggle state - 'preview' or 'workflow'
  const [activeView, setActiveView] = useState('preview');

  // Enrichment history refresh trigger
  const [enrichmentHistoryRefresh, setEnrichmentHistoryRefresh] = useState(0);

  // Load cached results on component mount (page refresh detection handled at App level)
  React.useEffect(() => {
    // Restore cache from sessionStorage
    const cachedResults = sessionStorage.getItem('lead_gen_workflow_results');
    if (cachedResults) {
      try {
        const parsed = JSON.parse(cachedResults);
        // Only load cached results if there are actual leads
        if (parsed?.final_leads && parsed.final_leads.length > 0) {
          setWorkflowResults(parsed);
          console.log('Loaded cached workflow results:', parsed);
        } else {
          console.log('Cached results empty, clearing cache');
          sessionStorage.removeItem('lead_gen_workflow_results');
        }
      } catch (error) {
        console.error('Error loading cached results:', error);
        sessionStorage.removeItem('lead_gen_workflow_results');
      }
    }

    // Load cached preview results (even if empty)
    const cachedPreview = sessionStorage.getItem('lead_gen_preview_results');
    if (cachedPreview) {
      try {
        const parsed = JSON.parse(cachedPreview);
        if (Array.isArray(parsed)) {
          setPreviewLeads(parsed);
          setWorkflowStage('preview');
          console.log('Loaded cached preview results:', parsed.length > 0 ? parsed : '(empty results)');
        }
      } catch (error) {
        console.error('Error loading cached preview results:', error);
        sessionStorage.removeItem('lead_gen_preview_results');
      }
    }

    // Load cached active view
    const cachedActiveView = sessionStorage.getItem('lead_gen_active_view');
    if (cachedActiveView && (cachedActiveView === 'preview' || cachedActiveView === 'workflow')) {
      setActiveView(cachedActiveView);
      console.log('Loaded cached active view:', cachedActiveView);
    }

    // Note: Cache persists when navigating between tabs, clears on page refresh
  }, []);

  // Cache workflow results whenever they change (sessionStorage - clears on refresh)
  React.useEffect(() => {
    if (workflowResults?.final_leads && workflowResults.final_leads.length > 0) {
      sessionStorage.setItem('lead_gen_workflow_results', JSON.stringify(workflowResults));
      console.log('Cached workflow results to sessionStorage');
    } else if (workflowResults === null) {
      // Clear cache when results are explicitly cleared
      sessionStorage.removeItem('lead_gen_workflow_results');
      console.log('Cleared workflow results cache');
    }
  }, [workflowResults]);

  // Cache preview results whenever they change (even if empty) (sessionStorage - clears on refresh)
  React.useEffect(() => {
    console.log('📊 Cache effect triggered - workflowStage:', workflowStage, 'previewLeads.length:', previewLeads.length);

    if (workflowStage === 'preview') {
      // Cache preview results regardless of whether empty or not
      sessionStorage.setItem('lead_gen_preview_results', JSON.stringify(previewLeads));
      console.log('✅ Cached preview results to sessionStorage:', previewLeads.length > 0 ? `${previewLeads.length} leads` : 'empty results');
    } else if (workflowStage === 'input') {
      // Clear cache when returning to input stage
      sessionStorage.removeItem('lead_gen_preview_results');
      console.log('🗑️ Cleared preview results cache (workflowStage is input)');
    }
  }, [previewLeads, workflowStage]);

  // Cache active view whenever it changes (sessionStorage - clears on refresh)
  React.useEffect(() => {
    sessionStorage.setItem('lead_gen_active_view', activeView);
    console.log('Cached active view to sessionStorage:', activeView);
  }, [activeView]);

  // Clear selections when new results come in
  React.useEffect(() => {
    setSelectedLeads(new Set());
  }, [workflowResults]);

  // Handle sample CSV download
  const handleDownloadSampleCSV = useCallback(async () => {
    try {

      toast.loading('Downloading sample CSV...', { id: 'sample-csv' });

      await leadsApiService.getSampleCsv();

      toast.dismiss('sample-csv');
      toast.success('Sample CSV template downloaded successfully!');

    } catch (error) {
      console.error('Sample CSV download failed:', error);
      toast.dismiss('sample-csv');
      toast.error('Failed to download sample CSV. Please try again.');
    }
  }, []);

  // Handle CSV file upload
  const handleFileUpload = useCallback(async (file) => {
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

      // Upload the CSV file
      const response = await leadsApiService.uploadDataToTable(file, 'leads');

      clearInterval(progressInterval);
      setUploadProgress(100);

      setTimeout(() => {
        if (response.leads_created > 0) {
          toast.success(
            `Successfully uploaded ${response.leads_created} leads${
              response.leads_failed > 0 ? ` (${response.leads_failed} failed)` : ''
            }`
          );

          // Show errors if any
          if (response.sync_errors && response.sync_errors.length > 0) {
            const errorSummary = response.sync_errors.slice(0, 2).join('; ');
            toast.warning(
              `Some rows had issues: ${errorSummary}${response.sync_errors.length > 2 ? '...' : ''}`,
              { duration: 6000 }
            );
          }
        } else {
          toast.error(
            `Failed to upload any leads. ${
              response.sync_errors && response.sync_errors.length > 0
                ? response.sync_errors[0]
                : 'Please check your CSV format.'
            }`
          );
        }

        setIsUploadModalOpen(false);
        setUploadProgress(0);

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
  }, []);

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

  const onFileSelect = useCallback((e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  }, [handleFileUpload]);

  // Handle lead selection
  const handleLeadSelection = useCallback((leadIndex, isSelected) => {
    setSelectedLeads(prev => {
      const newSet = new Set(prev);
      if (isSelected) {
        newSet.add(leadIndex);
      } else {
        newSet.delete(leadIndex);
      }
      return newSet;
    });
  }, []);

  // Handle select all toggle
  const handleSelectAll = useCallback((isSelected) => {
    if (!workflowResults?.final_leads) return;

    setSelectedLeads(prev => {
      if (isSelected) {
        return new Set(Array.from({ length: workflowResults.final_leads.length }, (_, i) => i));
      } else {
        return new Set();
      }
    });
  }, [workflowResults?.final_leads]);

  // Handle saving selected leads to database
  const handleSaveSelectedLeads = useCallback(async () => {
    console.log('🔵 Save button clicked', {
      hasWorkflowResults: !!workflowResults?.final_leads,
      selectedCount: selectedLeads.size,
      leadsAvailable: workflowResults?.final_leads?.length
    });

    if (!workflowResults?.final_leads || selectedLeads.size === 0) {
      console.log('❌ Early exit: No workflow results or no leads selected');
      toast.error('Please select leads to save');
      return;
    }

    setIsSavingLeads(true);
    console.log('💾 Starting to save leads...');
    try {
      const leadsToSave = Array.from(selectedLeads).map(index => workflowResults.final_leads[index]);
      console.log('📋 Leads to save:', leadsToSave.length);

      // Use the existing upload API to save leads
      let savedCount = 0;
      let failedCount = 0;
      const savedLeadIds = []; // Track successfully saved lead IDs for AI generation

      for (const lead of leadsToSave) {
        try {
          console.log(`💾 Saving lead: ${lead.company_name}`);

          // Split contact name into first and last name
          const contactName = lead.contact_name || '';
          const nameParts = contactName.trim().split(/\s+/);
          const firstName = nameParts[0] || 'Unknown';
          const lastName = nameParts.slice(1).join(' ') || '';

          // Convert lead to the format expected by the backend
          const leadData = {
            company: lead.company_name,
            location: lead.location || '',
            industry: lead.industry || '',
            email: lead.contact_email || '',
            phone: lead.contact_phone || '',
            website: lead.website || '',
            notes: `AI-generated lead from Apollo.io (Contact: ${lead.contact_name || 'Unknown'}) - Score: ${lead.final_score}`,
            source: 'api_import',
            status: 'cold',
            // Include personnel data
            personnel: contactName ? [{
              first_name: firstName,
              last_name: lastName,
              company_name: lead.company_name,
              email: lead.contact_email || null,
              phone: lead.contact_phone || null,
              position: lead.contact_title || null,
              linkedin_url: lead.contact_linkedin || null
            }] : []
          };

          console.log('📤 Sending lead data:', leadData);

          // Try to create the lead
          try {
            const result = await leadsApiService.createLead(leadData);
            console.log('✅ Lead saved successfully:', result);
            savedCount++;
            // Track lead ID for AI generation
            if (result && result.lead_id) {
              savedLeadIds.push(result.lead_id);
            }
          } catch (createError) {
            // If duplicate error, find existing lead and add personnel
            if (createError.message?.includes('duplicate') || createError.message?.includes('already exists')) {
              try {
                const existingLeads = await leadsApiService.findLeadsByCompany(lead.company_name);

                if (existingLeads && existingLeads.length > 0 && contactName) {
                  const existingLead = existingLeads[0];

                  // Create personnel record for the existing lead
                  const personnelData = {
                    first_name: firstName,
                    last_name: lastName,
                    company_name: lead.company_name,
                    email: lead.contact_email || null,
                    phone: lead.contact_phone || null,
                    position: lead.contact_title || null,
                    linkedin_url: lead.contact_linkedin || null,
                    lead_id: existingLead.lead_id,
                    source: 'api_import'
                  };

                  await leadsApiService.createPersonnel(personnelData);
                  savedCount++;
                  // Track existing lead ID for AI generation
                  savedLeadIds.push(existingLead.lead_id);
                  console.log('✅ Added personnel to existing lead:', lead.company_name);
                } else {
                  failedCount++;
                }
              } catch (personnelError) {
                if (personnelError.message?.includes('duplicate') || personnelError.message?.includes('unique_person_company')) {
                  // Personnel already exists, still count as success
                  savedCount++;
                  console.log('ℹ️ Personnel already exists for:', lead.company_name);
                } else {
                  console.error(`❌ Failed to add personnel for ${lead.company_name}:`, personnelError);
                  failedCount++;
                }
              }
            } else {
              throw createError;
            }
          }
        } catch (error) {
          console.error(`❌ Failed to save lead ${lead.company_name}:`, error);
          failedCount++;
        }
      }

      // Generate AI analysis for all successfully saved leads (in background)
      // Only generate if analysis doesn't already exist
      if (savedLeadIds.length > 0) {
        console.log(`🤖 Checking AI analysis for ${savedLeadIds.length} saved leads...`);
        // Process AI analysis generation sequentially
        (async () => {
          for (const leadId of savedLeadIds) {
            try {
              // Check if analysis already exists
              const cachedAnalysis = await leadsApiService.getCachedAISuggestions(leadId);
              if (cachedAnalysis && cachedAnalysis.suggestions) {
                console.log(`ℹ️ AI analysis already exists for lead ${leadId}, skipping generation`);
              } else {
                // Generate new analysis only if it doesn't exist
                await leadsApiService.regenerateAISuggestions(leadId);
                console.log(`✅ AI analysis generated for lead ${leadId}`);
              }
            } catch (err) {
              console.error(`⚠️ Failed to process AI analysis for lead ${leadId}:`, err);
            }
          }
        })();
      }

      console.log(`📊 Save complete: ${savedCount} saved, ${failedCount} failed`);

      if (savedCount > 0) {
        toast.success(`Successfully saved ${savedCount} lead${savedCount > 1 ? 's' : ''} to database${failedCount > 0 ? ` (${failedCount} failed)` : ''}`);
        setSelectedLeads(new Set()); // Clear selection after successful save

        // Refresh lead data to show newly saved leads in the table
        await loadLeads(true);
        console.log('✅ Lead cache refreshed after saving');

        // Refresh enrichment history to show updated checkbox states
        setEnrichmentHistoryRefresh(prev => prev + 1);
      } else {
        toast.error('Failed to save any leads to database');
      }

    } catch (error) {
      console.error('Error saving leads:', error);
      toast.error('Failed to save leads to database');
    } finally {
      setIsSavingLeads(false);
    }
  }, [workflowResults?.final_leads, selectedLeads, loadLeads]);

  // ===== TWO-STAGE WORKFLOW HANDLERS =====

  const handlePreviewLeads = useCallback(async (parsedIntent) => {
    try {
      setIsWorkflowExecuting(true);
      setWorkflowCurrentStage('Searching for companies...');
      setWorkflowProgress(30);
      // Don't set to 'input' here - it clears the preview cache
      // The stage will be set to 'preview' when results arrive

      console.log('🔍 Starting preview search:', parsedIntent);

      const response = await leadsApiService.previewLeads({
        industry: parsedIntent.industry,
        location: parsedIntent.location,
        maxResults: parsedIntent.max_results || 50,
        companySize: parsedIntent.company_size,
        keywords: parsedIntent.keywords
      });

      console.log('✅ Preview results received:', response);

      setWorkflowProgress(100);
      // Google Maps returns 'companies', Apollo returns 'leads' - handle both
      setPreviewLeads(response.companies || response.leads || []);
      setWorkflowStage('preview');
      setSelectedForEnrichment(new Set());
      setIsWorkflowExecuting(false);
      setActiveView('preview'); // Switch to preview view

      toast.success(`Found ${response.total_found} new companies`);

    } catch (error) {
      console.error('❌ Preview failed:', error);
      toast.error(error.message || 'Preview search failed');
      setIsWorkflowExecuting(false);
      setWorkflowStage('input');
    }
  }, []);

  const handleEnrichSelected = useCallback(async () => {
    if (selectedForEnrichment.size === 0) {
      toast.error('Please select companies to enrich');
      return;
    }

    try {
      setIsEnriching(true);
      toast.loading('Enriching email contacts...', { id: 'enrich' });

      console.log('💼 Enriching companies:', Array.from(selectedForEnrichment));

      // Get full company data for selected companies (needed for Google Maps → Apollo lookup)
      const selectedCompanies = previewLeads.filter(lead =>
        selectedForEnrichment.has(lead.apollo_company_id)
      );

      const response = await leadsApiService.enrichLeads({
        companyIds: Array.from(selectedForEnrichment),
        companies: selectedCompanies  // Send full company data for hybrid lookup
      });

      console.log('✅ Enrichment results:', response);

      toast.dismiss('enrich');

      // Show appropriate message based on success/failure counts
      if (response.failed_count > 0) {
        toast.success(`Enriched ${response.total_enriched} companies. ${response.failed_count} failed (no Apollo match).`);
      } else {
        toast.success(`Enriched ${response.total_enriched} companies with email contacts`);
      }

      // Merge enriched leads with ONLY the selected preview leads
      const enrichedMap = new Map(
        response.leads.map(lead => [lead.apollo_company_id, lead])
      );

      // Build workflow results: include both successful and failed enrichments
      const allProcessedLeads = selectedCompanies.map(preview => {
        const enriched = enrichedMap.get(preview.apollo_company_id);

        if (enriched) {
          // Successfully enriched with contact data
          return {
            ...preview,
            ...enriched,
            // Normalize field names to match table expectations
            contact: enriched.contact_name || 'N/A',
            emails: enriched.contact_email ? [enriched.contact_email] : [],
            websites: enriched.website ? [enriched.website] : (preview.website ? [preview.website] : []),
            final_score: enriched.final_score || 50,
            is_enriched: true,
            enrichment_status: 'success'
          };
        } else {
          // Failed enrichment (no Apollo match) - still show in workflow results
          return {
            ...preview,
            contact: 'No contact found',
            emails: [],
            websites: preview.website ? [preview.website] : [],
            final_score: 0,
            is_enriched: false,
            enrichment_status: 'failed'
          };
        }
      });

      console.log('🔀 All processed leads (successful + failed):', allProcessedLeads);

      // Remove ALL selected companies from preview (both successful and failed)
      const selectedIds = new Set(selectedCompanies.map(c => c.apollo_company_id));
      const remainingPreviewLeads = previewLeads.filter(
        preview => !selectedIds.has(preview.apollo_company_id)
      );
      setPreviewLeads(remainingPreviewLeads);
      console.log(`📋 Removed ${selectedCompanies.length} companies from preview (${response.total_enriched} successful, ${response.failed_count} failed)`);

      // Clear selection since those companies are now processed
      setSelectedForEnrichment(new Set());

      // Convert to workflow results format with all processed leads (successful + failed)
      setWorkflowResults({
        final_leads: allProcessedLeads,
        workflow_id: Date.now().toString(),
        total_leads: allProcessedLeads.length
      });

      // Keep workflowStage as 'preview' to allow toggling back to preview results
      // setWorkflowStage('enriched'); // Removed to keep preview results accessible
      setIsEnriching(false);
      setActiveView('workflow'); // Switch to workflow view

      // Refresh enrichment history
      setEnrichmentHistoryRefresh(prev => prev + 1);

    } catch (error) {
      console.error('❌ Enrichment failed:', error);
      toast.dismiss('enrich');
      toast.error(error.message || 'Enrichment failed');
      setIsEnriching(false);
    }
  }, [selectedForEnrichment, previewLeads]);

  return (
    <div className="h-full flex flex-col">

      {/* Main Content - Three Column Layout with Gray Divider */}
      <div className="flex-1 overflow-y-auto p-4 bg-white">
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-0 h-full">
          {/* Left Column - 3/10 width */}
          <div className="lg:col-span-3 space-y-4 pr-4 pb-4 border-r border-gray-200">
            {/* AI-Powered Lead Generation */}
            <AIPromptInput
              onPreviewLeads={handlePreviewLeads}
              onProgressUpdate={setWorkflowProgress}
              onExecutionStatusUpdate={setIsWorkflowExecuting}
              onStageUpdate={setWorkflowCurrentStage}
            />
          </div>

          {/* Gray Divider */}
          {/* <div className="hidden lg:block lg:col-span-1 relative">
            <div className="absolute inset-y-0 left-1/2 w-px bg-gray-200"></div>
          </div> */}

          {/* Right Column - Results/Data (6/10 width) */}
          <div className="lg:col-span-7 space-y-4 pl-4">
            {/* Workflow Progress */}
            {isWorkflowExecuting && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
                    <h3 className="text-lg font-semibold text-gray-900">Workflow Execution</h3>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-medium">Progress</span>
                        <span className="font-semibold text-blue-600">{Math.round(workflowProgress)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                          style={{ width: `${Math.max(0, Math.min(100, workflowProgress))}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      Current stage: <span className="font-medium text-gray-900">{workflowCurrentStage}</span>
                    </div>
                    {(workflowStats.companiesFound > 0 || workflowStats.leadsCreated > 0) && (
                      <div className="grid grid-cols-2 gap-4 pt-4">
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <Building className="w-6 h-6 mx-auto mb-1 text-blue-600" />
                          <div className="text-xl font-bold text-blue-600">{workflowStats.companiesFound}</div>
                          <div className="text-xs text-gray-600">Companies Found</div>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <TrendingUp className="w-6 h-6 mx-auto mb-1 text-green-600" />
                          <div className="text-xl font-bold text-green-600">{workflowStats.leadsCreated}</div>
                          <div className="text-xs text-gray-600">Leads Created</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Preview Leads Table - Stage 1 */}
            {!isWorkflowExecuting && workflowStage === 'preview' && activeView === 'preview' && (
              <div className="relative">
                {/* Toggle Button */}
                {workflowResults && (
                  <button
                    onClick={() => setActiveView('workflow')}
                    className="absolute top-6 right-8 z-10 px-2 py-1.5 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <ArrowLeftRight className="w-4 h-4" />
                  </button>
                )}
                <PreviewLeadsTable
                  leads={previewLeads}
                  selectedForEnrichment={selectedForEnrichment}
                  onSelectionChange={setSelectedForEnrichment}
                  onEnrichSelected={handleEnrichSelected}
                  isEnriching={isEnriching}
                />
              </div>
            )}

            {/* Workflow Results - After Enrichment */}
            {!isWorkflowExecuting && workflowResults && activeView === 'workflow' && (
              <div className="bg-gray-50 rounded-xl border border-gray-200 shadow-sm relative">
                {/* Toggle Button - Show if preview stage exists (even with 0 results) */}
                {workflowStage === 'preview' && (
                  <button
                    onClick={() => setActiveView('preview')}
                    className="absolute top-6 right-8 z-10 px-2 py-1.5 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <ArrowLeftRight className="w-4 h-4" />
                  </button>
                )}
                <div className="px-8 py-6">
                  {/* Header */}
                  <div className="mb-6">
                    <h3 className="text-3xl font-black text-gray-900 mb-2">Workflow Results</h3>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-gray-600" />
                      <span className="text-sm text-gray-600 font-medium">
                        Generated {workflowResults.statistics?.qualified_leads || workflowResults.final_leads?.length || 0} qualified leads
                      </span>
                    </div>
                  </div>

                  {/* New Leads Table */}
                  {workflowResults.final_leads && workflowResults.final_leads.length > 0 && (
                    <div className="mb-6">
                      {/* Action Bar - Above Table - Full Width */}
                      <div className="flex items-center justify-between bg-white border border-gray-200 rounded-t-lg px-4 py-3">
                        <div className="text-sm text-gray-600">
                          {selectedLeads.size > 0 ? `${selectedLeads.size} lead${selectedLeads.size > 1 ? 's' : ''} selected` : 'Select leads to save'}
                        </div>
                        <Button
                          onClick={handleSaveSelectedLeads}
                          disabled={selectedLeads.size === 0 || isSavingLeads}
                          className="bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-400"
                        >
                          {isSavingLeads ? (
                            <>
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            'Save to Database'
                          )}
                        </Button>
                      </div>

                      {/* Table */}
                      <div className="bg-white border-l border-r border-b border-gray-200 rounded-b-lg">
                      {/* Scrollable Table Container */}
                      <div className="overflow-x-auto overflow-y-auto max-h-96">
                        {/* Table using proper CSS table layout for perfect alignment */}
                        <table className="w-full table-fixed min-w-max">
                          {/* Table Header - Sticky */}
                          <thead className="bg-gray-50 sticky top-0 z-10">
                            <tr className="border-b border-gray-200">
                              <th className="w-12 px-3 py-3 text-left">
                                <Checkbox
                                  checked={selectedLeads.size === workflowResults.final_leads.length && workflowResults.final_leads.length > 0}
                                  onCheckedChange={handleSelectAll}
                                  aria-label="Select all leads"
                                />
                              </th>
                              <th className="w-48 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company Name</th>
                              <th className="w-20 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fit</th>
                              <th className="w-32 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                              <th className="w-48 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                              <th className="w-24 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Industry</th>
                              <th className="w-32 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                              <th className="w-48 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Website</th>
                              <th className="w-32 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scraped At</th>
                            </tr>
                          </thead>

                          {/* Table Body */}
                          <tbody>
                            {workflowResults.final_leads.map((lead, index) => {
                              return (
                              <tr key={index} className="border-b last:border-b-0 hover:bg-gray-50">
                                <td className="w-12 px-3 py-3">
                                  <Checkbox
                                    checked={selectedLeads.has(index)}
                                    onCheckedChange={(checked) => handleLeadSelection(index, checked)}
                                    aria-label={`Select ${lead.company_name}`}
                                  />
                                </td>
                                <td className="w-48 px-3 py-3 text-sm font-medium text-gray-900 truncate" title={lead.company_name}>
                                  {lead.company_name}
                                </td>
                                <td className="w-20 px-3 py-3 text-sm">
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    lead.final_score >= 80 ? 'bg-green-100 text-green-800' :
                                    lead.final_score >= 60 ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                  }`}>
                                    {lead.final_score >= 80 ? 'Best' : lead.final_score >= 60 ? 'Good' : 'Poor'}
                                  </span>
                                </td>
                                <td className="w-32 px-3 py-3 text-sm text-blue-700 truncate" title={lead.contact || 'N/A'}>
                                  {lead.contact || 'N/A'}
                                </td>
                                <td className="w-48 px-3 py-3 text-sm text-blue-600 truncate" title={lead.emails?.length > 0 ? lead.emails[0] : 'N/A'}>
                                  <span
                                    className={lead.emails?.length > 0 ? "cursor-pointer hover:text-blue-800" : ""}
                                    onClick={(e) => {
                                      if (lead.emails?.length > 0) {
                                        e.stopPropagation();
                                        navigator.clipboard.writeText(lead.emails[0]);
                                        // Brief visual feedback
                                        const span = e.target;
                                        const originalText = span.textContent;
                                        span.textContent = 'Copied!';
                                        setTimeout(() => span.textContent = originalText, 1000);
                                      }
                                    }}
                                  >
                                    {lead.emails?.length > 0 ? lead.emails[0] : 'N/A'}
                                  </span>
                                </td>
                                <td className="w-24 px-3 py-3 text-sm text-purple-600 truncate" title={lead.industry}>
                                  {lead.industry || 'N/A'}
                                </td>
                                <td className="w-32 px-3 py-3 text-sm text-gray-600 truncate" title={lead.location}>
                                  {lead.location || 'N/A'}
                                </td>
                                <td className="w-48 px-3 py-3 text-sm truncate">
                                  {lead.websites?.length > 0 ? (
                                    <a
                                      href={lead.websites[0].startsWith('http') ? lead.websites[0] : `https://${lead.websites[0]}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:text-blue-800 underline"
                                      title={lead.websites[0]}
                                    >
                                      {lead.websites[0]}
                                    </a>
                                  ) : (
                                    <span className="text-gray-400">N/A</span>
                                  )}
                                </td>
                                <td className="w-32 px-3 py-3 text-xs text-gray-500">
                                  {lead.scraped_at ? new Date(lead.scraped_at).toLocaleDateString() : 'N/A'}
                                </td>
                              </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Empty State - Only show when no results exist */}
            {!workflowResults && !isWorkflowExecuting && !previewLeads.length && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="p-12 text-center">
                  <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Results Yet</h3>
                  <p className="text-gray-600">
                    Start a workflow to see results and analytics here
                  </p>
                </div>
              </div>
            )}

            {/* Enrichment History - Always show below results (or empty state) */}
            <EnrichmentHistory refreshTrigger={enrichmentHistoryRefresh} />
          </div>
        </div>
      </div>

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
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 border-b">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Upload className="text-blue-600" />
                    Upload Manual Leads
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsUploadModalOpen(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Import your existing lead data from a CSV file.
                </p>
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
                  <p className="text-sm text-gray-500 mb-2">or</p>
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Browse Files
                  </Button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={onFileSelect}
                    accept=".csv"
                    className="hidden"
                  />
                </div>

                {isUploading && (
                  <div className="mt-4">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-center text-sm text-gray-600 mt-2">
                      {uploadProgress}% uploaded
                    </p>
                  </div>
                )}

                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-800 mb-2">CSV Format Requirements:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• <strong>Required columns:</strong> name, company, location</li>
                    <li>• <strong>Optional columns:</strong> position, industry, email, phone, website</li>
                    <li>• <strong>File format:</strong> CSV (.csv)</li>
                    <li>• <strong>Encoding:</strong> UTF-8</li>
                  </ul>
                  <div className="mt-3 flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadSampleCSV}
                      className="text-blue-600 border-blue-300 hover:bg-blue-50"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download Sample CSV
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GeneratingNewLeads;