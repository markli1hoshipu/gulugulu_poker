import React, { useState, useEffect, useCallback } from 'react';
import { X, Play, Download, Users, Clock, Calendar, User, FileText, Video, Volume2 } from 'lucide-react';
import { Button } from '../../ui/button';
import { motion, AnimatePresence } from 'framer-motion';

// In-memory cache for meeting details
const meetingCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

// Helper function to clear expired cache entries
const clearExpiredCache = () => {
  const now = Date.now();
  for (const [key, value] of meetingCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      meetingCache.delete(key);
    }
  }
};

// Helper function to clear all cache entries
const clearAllCache = () => {
  meetingCache.clear();
  console.log('🗑️ All meeting cache cleared');
};

// Expose cache clearing function globally
if (typeof window !== 'undefined') {
  window.clearMeetingCache = clearAllCache;
}

const MeetingDetailsModal = ({ isOpen, onClose, meetingId, meeting }) => {
  const [meetingDetails, setMeetingDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('summary');

  const getMeetingAgentUrl = () => {
    return process.env.NODE_ENV === 'production'
      ? 'https://meeting-agent-prelude-platform-uc.a.run.app'
      : 'http://localhost:8004';
  };

  const fetchMeetingDetails = useCallback(async (forceRefresh = false) => {
    if (!meetingId) {
      // Use existing meeting data if no meetingId provided (backward compatibility)
      if (meeting) {
        setMeetingDetails({
          id: meeting.id,
          title: meeting.meetingTitle || meeting.title,
          date: meeting.date,
          duration: meeting.duration || meeting.durationMin,
          host: meeting.host || 'Unknown',
          participants: meeting.attendees || [],
          summary: meeting.summary || 'No summary available',
          recordings: [],
          transcript: { available: false, content: 'No transcript available' }
        });
      }
      return;
    }

    // Clear expired cache entries
    clearExpiredCache();

    // Check cache first (unless forced refresh)
    if (!forceRefresh) {
      const cached = meetingCache.get(meetingId);
      if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
        console.log('📦 Using cached meeting data for:', meetingId);
        setMeetingDetails(cached.data);
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🔄 Fetching fresh meeting data for:', meetingId);
      const response = await fetch(`${getMeetingAgentUrl()}/meetings/${meetingId}/details`);

      if (response.ok) {
        const data = await response.json();
        const meetingData = data.meeting;

        // Cache the result
        meetingCache.set(meetingId, {
          data: meetingData,
          timestamp: Date.now()
        });

        setMeetingDetails(meetingData);
        console.log('✅ Meeting data cached for:', meetingId);
      } else {
        setError('Failed to load meeting details');
      }
    } catch (err) {
      console.error('Error fetching meeting details:', err);
      setError('Failed to load meeting details');
    } finally {
      setLoading(false);
    }
  }, [meetingId, meeting]);

  useEffect(() => {
    if (isOpen) {
      fetchMeetingDetails();
    }
  }, [isOpen, meetingId, fetchMeetingDetails]);

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const formatFileSize = (fileSize) => {
    if (!fileSize) return 'Unknown size';
    if (typeof fileSize === 'string' && fileSize.includes('MB')) return fileSize;
    const mb = fileSize / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/50 z-50 flex justify-center pt-8 px-8"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="w-full bg-white rounded-t-lg shadow-2xl relative h-full flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
            <h2 className="text-xl font-semibold text-gray-900">
              {loading ? 'Loading...' : meetingDetails?.title || 'Meeting Details'}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex flex-col flex-1 overflow-hidden">
            {loading ? (
              <>
                {/* Skeleton for Tabs */}
                <div className="flex border-b border-gray-200">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="px-6 py-3 flex items-center gap-2">
                      <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
                      <div className="w-20 h-4 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                  ))}
                </div>

                {/* Skeleton for Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="space-y-6">
                    {/* Title skeleton */}
                    <div className="space-y-2">
                      <div className="w-3/4 h-8 bg-gray-200 rounded animate-pulse"></div>
                    </div>

                    {/* Meeting Information Card skeleton */}
                    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                      <div className="px-6 py-4 border-b border-gray-200">
                        <div className="w-48 h-6 bg-gray-200 rounded animate-pulse"></div>
                      </div>
                      <div className="px-6 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="flex items-center gap-3">
                              <div className="w-5 h-5 bg-gray-200 rounded animate-pulse"></div>
                              <div className="flex-1">
                                <div className="w-16 h-3 bg-gray-200 rounded animate-pulse mb-1"></div>
                                <div className="w-24 h-4 bg-gray-200 rounded animate-pulse"></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Summary sections skeleton */}
                    <div className="space-y-4">
                      {[1, 2, 3].map((section) => (
                        <div key={section} className="bg-white border border-gray-200 rounded-lg shadow-sm">
                          <div className="px-6 py-4 border-b border-gray-200">
                            <div className="w-32 h-6 bg-gray-200 rounded animate-pulse"></div>
                          </div>
                          <div className="px-6 py-4 space-y-3">
                            {[1, 2, 3].map((item) => (
                              <div key={item} className="flex items-start gap-3">
                                <div className="w-2 h-2 bg-gray-200 rounded-full animate-pulse mt-2"></div>
                                <div className="flex-1 space-y-1">
                                  <div className="w-full h-4 bg-gray-200 rounded animate-pulse"></div>
                                  <div className="w-3/4 h-4 bg-gray-200 rounded animate-pulse"></div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Additional content skeleton */}
                    <div className="space-y-3">
                      {[1, 2, 3, 4].map((line) => (
                        <div key={line} className="h-4 bg-gray-200 rounded animate-pulse" style={{ width: `${Math.random() * 40 + 60}%` }}></div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            ) : error ? (
              <div className="flex items-center justify-center p-12">
                <div className="text-center">
                  <p className="text-red-500 mb-4">{error}</p>
                  <Button onClick={fetchMeetingDetails} variant="outline">
                    Try Again
                  </Button>
                </div>
              </div>
            ) : meetingDetails ? (
              <>
                {/* Tabs */}
                <div className="flex border-b border-gray-200">
                  <button
                    onClick={() => setActiveTab('summary')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'summary'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <FileText className="w-4 h-4 inline-block mr-2" />
                    Overview
                  </button>
                  <button
                    onClick={() => setActiveTab('recordings')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'recordings'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Video className="w-4 h-4 inline-block mr-2" />
                    Recordings ({meetingDetails.recordings?.length || 0})
                  </button>
                  <button
                    onClick={() => setActiveTab('transcript')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'transcript'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Volume2 className="w-4 h-4 inline-block mr-2" />
                    Transcript
                  </button>
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  {activeTab === 'summary' && (
                    <div className="space-y-6">
                      {/* Render structured overview if available, otherwise fallback to plain text */}
                      {typeof meetingDetails.summary === 'object' && meetingDetails.summary.type === 'structured_overview' ? (
                        <>
                          {/* Meeting Title */}
                          <div>
                            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                              🎯 {meetingDetails.summary.title}
                            </h2>
                          </div>

                          {/* Meeting Information Card */}
                          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                            <div className="px-6 py-4 border-b border-gray-200">
                              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                📋 Meeting Information
                              </h3>
                            </div>
                            <div className="px-6 py-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex items-center gap-3">
                                  <Calendar className="w-5 h-5 text-blue-500" />
                                  <div>
                                    <div className="text-sm text-gray-500">Date</div>
                                    <div className="font-medium">{meetingDetails.summary.meeting_info.date}</div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <Clock className="w-5 h-5 text-green-500" />
                                  <div>
                                    <div className="text-sm text-gray-500">Time</div>
                                    <div className="font-medium">{meetingDetails.summary.meeting_info.time}</div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <Clock className="w-5 h-5 text-orange-500" />
                                  <div>
                                    <div className="text-sm text-gray-500">Duration</div>
                                    <div className="font-medium">{meetingDetails.summary.meeting_info.duration}</div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <User className="w-5 h-5 text-purple-500" />
                                  <div>
                                    <div className="text-sm text-gray-500">Host</div>
                                    <div className="font-medium">{meetingDetails.summary.meeting_info.host}</div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <Users className="w-5 h-5 text-indigo-500" />
                                  <div>
                                    <div className="text-sm text-gray-500">Participants</div>
                                    <div className="font-medium">
                                      {meetingDetails.summary.meeting_info.participants || 
                                       meetingDetails.summary.meeting_info.attendees || 
                                       (Array.isArray(meetingDetails.participants) 
                                         ? `${meetingDetails.participants.length}` 
                                         : meetingDetails.attendees || 'Unknown')}
                                    </div>
                                  </div>
                                </div>
                                {meetingDetails.summary.meeting_info.meeting_id && (
                                  <div className="flex items-center gap-3">
                                    <FileText className="w-5 h-5 text-gray-500" />
                                    <div>
                                      <div className="text-sm text-gray-500">Meeting ID</div>
                                      <div className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                                        {meetingDetails.summary.meeting_info.meeting_id}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Meeting Status */}
                          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                              <h3 className="text-lg font-semibold text-green-800 flex items-center gap-2">
                                📊 Meeting Status
                              </h3>
                            </div>
                            <div className="mt-2">
                              <div className="text-green-700 font-medium">
                                ✅ {meetingDetails.summary.status.status_text}
                              </div>
                            </div>
                          </div>

                        </>
                      ) : (
                        /* Fallback for plain text summary */
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-3">Meeting Overview</h3>
                          <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                            <div className="text-gray-700 leading-relaxed whitespace-pre-line">
                              {typeof meetingDetails.summary === 'string' ? meetingDetails.summary : JSON.stringify(meetingDetails.summary, null, 2)}
                            </div>
                          </div>
                        </div>
                      )}

                      {Array.isArray(meetingDetails.participants) && meetingDetails.participants.length > 0 && (
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-3">Participants</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {meetingDetails.participants.map((participant, index) => (
                              <div key={index} className="flex items-center gap-2 text-sm text-gray-600">
                                <User className="w-4 h-4" />
                                <span>{participant.name || participant.email || `Participant ${index + 1}`}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'recordings' && (
                    <div className="space-y-4">
                      {meetingDetails.recordings && meetingDetails.recordings.length > 0 ? (
                        meetingDetails.recordings.map((recording, index) => (
                          <div key={recording.id || index} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-900 mb-2">
                                  {recording.recording_type?.replace(/_/g, ' ').toUpperCase() || 'Recording'}
                                </h4>
                                <div className="space-y-1 text-sm text-gray-600">
                                  <p>Size: {formatFileSize(recording.file_size)}</p>
                                  {recording.recording_start && (
                                    <p>Duration: {formatDate(recording.recording_start)} - {formatDate(recording.recording_end)}</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-2 ml-4">
                                {recording.play_url && (
                                  <Button
                                    size="sm"
                                    onClick={() => window.open(recording.play_url, '_blank')}
                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                  >
                                    <Play className="w-4 h-4 mr-2 text-white" />
                                    Play
                                  </Button>
                                )}
                                {recording.download_url && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => window.open(recording.download_url, '_blank')}
                                    className="border border-gray-300 hover:bg-gray-100"
                                  >
                                    <Download className="w-4 h-4 mr-2" />
                                    Download
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <Video className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                          <p className="text-gray-500">No recordings available for this meeting</p>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'transcript' && (
                    <div className="space-y-4">
                      {meetingDetails.transcript?.available ? (
                        <div>
                          <div className="mb-4">
                            <h3 className="font-semibold text-gray-900">Meeting Transcript</h3>
                            <p className="text-sm text-gray-500 mt-1">
                              Full transcript of the meeting conversation
                            </p>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-4 max-h-[500px] overflow-y-auto">
                            <div className="prose prose-sm max-w-none">
                              <div className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed">
                                {meetingDetails.transcript.content}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Volume2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                          <p className="text-gray-500">No transcript available for this meeting</p>
                          <p className="text-xs text-gray-400 mt-2">
                            Transcripts are only available if recording was enabled with transcription
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center p-12">
                <p className="text-gray-500">No meeting details available</p>
              </div>
            )}
          </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MeetingDetailsModal;
