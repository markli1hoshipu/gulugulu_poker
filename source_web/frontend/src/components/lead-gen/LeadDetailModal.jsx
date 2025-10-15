import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building,
  Mail,
  User,
  X,
  TrendingUp,
  Users,
  Loader2,
  AlertCircle,
  CheckCircle,
  Brain
} from 'lucide-react';
import { Button } from '../ui/button';
import LeadEmailComposer from './LeadEmailComposer';
import LeadEmailTimeline from './LeadEmailTimeline';
import leadsApiService from '../../services/leadsApi';

const LeadDetailModal = ({
  isOpen,
  onClose,
  selectedLead,
  modalActiveTab,
  setModalActiveTab,
  aiSuggestions,
  isLoadingAiSuggestions,
  aiSuggestionsError,
  loadCachedAiSuggestions,
  regenerateAiSuggestions,
  handleAddToCRM,
  handleEmailSent
}) => {
  const [isCheckingReplies, setIsCheckingReplies] = useState(false);

  // Auto-load cached AI analysis when modal opens
  useEffect(() => {
    if (isOpen && selectedLead?.id && loadCachedAiSuggestions) {
      loadCachedAiSuggestions(selectedLead.id);
    }
  }, [isOpen, selectedLead?.id, loadCachedAiSuggestions]);

  const handleCheckReplies = async () => {
    if (!selectedLead?.lead_id && !selectedLead?.id) return;

    const leadId = selectedLead.lead_id || selectedLead.id;
    setIsCheckingReplies(true);

    try {
      const result = await leadsApiService.checkReplies(leadId, 7);

      if (result.status_changed && result.new_status && handleEmailSent) {
        const emailData = {
          status_changed: true,
          new_status: result.new_status,
          sent_to: selectedLead.email,
          positive_replies_count: result.positive_replies_count
        };
        await handleEmailSent(emailData);
      }
    } catch (error) {
      console.error('Error checking replies:', error);
    } finally {
      setIsCheckingReplies(false);
    }
  };

  if (!isOpen || !selectedLead) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex justify-center pt-8 px-8"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.9, y: 20, opacity: 0 }}
          className="w-full bg-white rounded-lg shadow-2xl relative h-full flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Header - Fixed */}
          <div className="flex items-center justify-between pt-5 pb-3 px-6 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Building className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 leading-none self-center -mb-1">{selectedLead.company}</h1>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
            >
              <X className="w-5 h-5 text-gray-500" />
            </Button>
          </div>

          {/* Navigation Tabs - Fixed */}
          <div className="border-b border-gray-200 flex-shrink-0 px-6">
            <div className="flex">
              <Button
                variant="ghost"
                onClick={() => setModalActiveTab('information')}
                className={`flex items-center gap-2 p-4 text-sm font-medium border-b-2 rounded-none ${
                  modalActiveTab === 'information'
                    ? "border-blue-600 text-blue-600 hover:text-blue-700"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <User className="w-4 h-4" />
                Overview
              </Button>
              <Button
                variant="ghost"
                onClick={() => setModalActiveTab('email')}
                className={`flex items-center gap-2 p-4 text-sm font-medium border-b-2 rounded-none ${
                  modalActiveTab === 'email'
                    ? "border-blue-600 text-blue-600 hover:text-blue-700"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <Mail className="w-4 h-4" />
                Send Email
              </Button>
            </div>
          </div>

          {/* Content Area - Scrollable */}
          <div className="flex-1 overflow-y-auto py-4 px-5 bg-gray-50">
            {/* Information Tab */}
            {modalActiveTab === 'information' && (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-10 gap-4">
                  {/* Left Column */}
                  <div className="lg:col-span-7 lg:order-1 space-y-4">
                    {/* Email Timeline */}
                    <LeadEmailTimeline
                      selectedLead={selectedLead}
                      onAddToCRM={() => handleAddToCRM(selectedLead)}
                      onCheckReplies={handleCheckReplies}
                      isCheckingReplies={isCheckingReplies}
                    />

                    {/* Company Intelligence & Analysis */}
                    <div className="bg-white rounded-lg border border-gray-200 flex flex-col" style={{ height: 'calc(1000px + 1rem - 500px - 1rem)' }}>
                      <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0">
                        <h3 className="text-lg font-bold text-black font-[Inter] flex items-center gap-2">
                          <Brain className="w-5 h-5 text-blue-600" />
                          Company Intelligence & Analysis by AI
                        </h3>
                        <Button
                          variant="outline"
                          className="border-gray-300 text-gray-600 hover:bg-gray-50 gap-x-2"
                          onClick={() => regenerateAiSuggestions(selectedLead?.id)}
                          disabled={isLoadingAiSuggestions}
                        >
                          {isLoadingAiSuggestions ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Regenerating...
                            </>
                          ) : (
                            <>
                              <Brain className="w-4 h-4" />
                              Generate Report
                            </>
                          )}
                        </Button>
                      </div>
                      <div className="flex-1 bg-gray-50 border-t border-gray-200 overflow-y-auto">
                        {isLoadingAiSuggestions && (
                          <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
                              <p className="text-gray-600">AI is analyzing this lead...</p>
                              <p className="text-sm text-gray-500 mt-1">This may take a few moments</p>
                            </div>
                          </div>
                        )}

                        {aiSuggestionsError && (
                          <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                              <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
                              <p className="text-red-700 font-medium">Failed to generate AI suggestions</p>
                              <p className="text-sm text-red-600 mt-1">{aiSuggestionsError}</p>
                            </div>
                          </div>
                        )}

                        {!isLoadingAiSuggestions && !aiSuggestionsError && !aiSuggestions && (
                          <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                              <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                              <h4 className="text-lg font-medium text-gray-600 mb-2">No Analysis Available</h4>
                              <p className="text-sm text-gray-500">Click "Regenerate Report" to generate company intelligence</p>
                            </div>
                          </div>
                        )}

                        {aiSuggestions && !isLoadingAiSuggestions && (
                          <div className="bg-white p-8">
                            {/* AI Insights - CRM-style numbered list */}
                            {aiSuggestions.insights && aiSuggestions.insights.length > 0 && (
                              <div className="space-y-4 mb-6">
                                {aiSuggestions.insights.map((insight, index) => (
                                  <div key={index} className="flex gap-3">
                                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-semibold mt-0.5">
                                      {index + 1}
                                    </div>
                                    <p className="text-sm text-gray-700 leading-relaxed flex-1">{insight}</p>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Metadata footer */}
                            <div className="flex items-center gap-2 text-sm text-gray-600 pt-4 border-t border-gray-200">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              Generated on {new Date(aiSuggestions.generated_at).toLocaleString()}
                              <span className="ml-2 px-2 py-1 bg-blue-600 text-white rounded-full text-xs font-medium">
                                Prelude AI
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Unified Information Box */}
                  <div className="lg:col-span-3 lg:order-2">
                    <div className="bg-white rounded-lg border border-gray-200 p-6 flex flex-col" style={{ height: 'calc(1000px + 1rem)' }}>
                      <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2 flex-shrink-0">
                        <Building className="w-4 h-4 text-blue-600" />
                        Lead Information
                      </h3>
                      <div className="space-y-4 flex-1 overflow-y-auto">
                        {/* Basic Information */}
                        <div>
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-medium text-gray-600 block mb-1">Company</label>
                              <p className="text-gray-900">{selectedLead.company}</p>
                            </div>
                            {selectedLead.contact_name && (
                              <div>
                                <label className="text-sm font-medium text-gray-600 block mb-1">Contact Name</label>
                                <p className="text-gray-900">{selectedLead.contact_name}</p>
                              </div>
                            )}
                            {selectedLead.industry && (
                              <div>
                                <label className="text-sm font-medium text-gray-600 block mb-1">Industry</label>
                                <p className="text-gray-900">{selectedLead.industry}</p>
                              </div>
                            )}
                            <div>
                              <label className="text-sm font-medium text-gray-600 block mb-1">Source</label>
                              <p className="text-gray-900">{selectedLead.source || 'Web Scraping'}</p>
                            </div>

                            {/* Contact Information */}
                            {selectedLead.email && (
                              <div>
                                <label className="text-sm font-medium text-gray-600 block mb-1">Email</label>
                                <p className="text-gray-900">{selectedLead.email}</p>
                              </div>
                            )}
                            {selectedLead.phone && (
                              <div>
                                <label className="text-sm font-medium text-gray-600 block mb-1">Phone</label>
                                <p className="text-gray-900">{selectedLead.phone}</p>
                              </div>
                            )}
                            {(selectedLead.address || selectedLead.location) && (
                              <div>
                                <label className="text-sm font-medium text-gray-600 block mb-1">Location</label>
                                <p className="text-gray-900">{selectedLead.address || selectedLead.location}</p>
                              </div>
                            )}
                            {selectedLead.website && (
                              <div>
                                <label className="text-sm font-medium text-gray-600 block mb-1">Website</label>
                                <a
                                  href={(() => {
                                    let url = selectedLead.website;
                                    if (url.startsWith('https//')) {
                                      url = url.replace('https//', 'https://');
                                    } else if (url.startsWith('http//')) {
                                      url = url.replace('http//', 'http://');
                                    } else if (!url.startsWith('http')) {
                                      url = `https://${url}`;
                                    }
                                    return url;
                                  })()}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 hover:underline"
                                >
                                  {selectedLead.website}
                                </a>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Personnel */}
                        {selectedLead.personnel && selectedLead.personnel.length > 0 && (
                          <div className="pt-4 border-t border-gray-200">
                            <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
                              <Users className="w-4 h-4 text-blue-600" />
                              Personnel ({selectedLead.personnel.length})
                            </h4>
                            <div className="space-y-4">
                              {selectedLead.personnel.slice(0, 10).map((person, index) => (
                                <div key={index}>
                                  <label className="text-sm font-medium text-gray-600 block mb-1">
                                    {person.full_name || person.name || 'Unknown'}
                                  </label>
                                  <p className="text-gray-900">{person.position || 'N/A'}</p>
                                  {person.email && (
                                    <p className="text-gray-900 text-sm">{person.email}</p>
                                  )}
                                  {person.phone && (
                                    <p className="text-gray-600 text-sm">{person.phone}</p>
                                  )}
                                  {person.linkedin_url && (
                                    <a
                                      href={person.linkedin_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:text-blue-800 hover:underline text-sm"
                                    >
                                      LinkedIn Profile
                                    </a>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Email Tab */}
            {modalActiveTab === 'email' && (
              <div className="p-6 h-full">
                {selectedLead && (
                  <LeadEmailComposer
                    lead={selectedLead}
                    onClose={() => setModalActiveTab('information')}
                    onEmailSent={(emailData) => {
                      handleEmailSent(emailData);
                      setModalActiveTab('information');
                    }}
                    embedded={true}
                  />
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default LeadDetailModal;