import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Calendar,
  Clock,
  User,
  Users,
  MapPin,
  Link as LinkIcon,
  FileText,
  Loader2
} from 'lucide-react';
import { Button } from '../ui/button';
import { getMeetingById } from '../../services/meetingApi';

const CRMMeetingDetailsModal = ({ isOpen, onClose, meetingId, authFetch, meeting }) => {
  const [meetingDetails, setMeetingDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchMeetingDetails = useCallback(async () => {
    if (!meetingId || !authFetch) {
      setError('Missing meeting ID or authentication');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🔄 Fetching CRM meeting details for interaction ID:', meetingId);
      const data = await getMeetingById(meetingId, authFetch);

      console.log('✅ Meeting data received:', data);
      setMeetingDetails(data);
    } catch (err) {
      console.error('❌ Error fetching meeting details:', err);
      setError(err.message || 'Failed to load meeting details');
    } finally {
      setLoading(false);
    }
  }, [meetingId, authFetch]);

  useEffect(() => {
    if (isOpen) {
      // If meeting data is already provided, use it immediately
      if (meeting) {
        console.log('✅ Using pre-loaded meeting data:', meeting);
        setMeetingDetails(meeting);
        setLoading(false);
        setError(null);
      } else if (meetingId) {
        // Otherwise, fetch from API
        fetchMeetingDetails();
      }
    }
  }, [isOpen, meetingId, meeting, fetchMeetingDetails]);

  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return 'Not specified';
    try {
      const date = new Date(dateTimeString);
      return date.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      });
    } catch {
      return dateTimeString;
    }
  };

  const formatDate = (dateTimeString) => {
    if (!dateTimeString) return 'Not specified';
    try {
      const date = new Date(dateTimeString);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateTimeString;
    }
  };

  const formatTime = (dateTimeString) => {
    if (!dateTimeString) return 'Not specified';
    try {
      const date = new Date(dateTimeString);
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      });
    } catch {
      return dateTimeString;
    }
  };

  const calculateDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return 'Unknown';
    try {
      const start = new Date(startTime);
      const end = new Date(endTime);
      const durationMs = end - start;
      const durationMinutes = Math.floor(durationMs / 60000);
      
      if (durationMinutes < 60) {
        return `${durationMinutes} minutes`;
      } else {
        const hours = Math.floor(durationMinutes / 60);
        const minutes = durationMinutes % 60;
        return minutes > 0 ? `${hours}h ${minutes}m` : `${hours} hour${hours > 1 ? 's' : ''}`;
      }
    } catch {
      return 'Unknown';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Calendar className="w-6 h-6 text-blue-600" />
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
            <div className="p-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                  <span className="ml-3 text-gray-600">Loading meeting details...</span>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="text-center">
                    <p className="text-red-500 mb-4">{error}</p>
                    <Button onClick={fetchMeetingDetails} variant="outline">
                      Try Again
                    </Button>
                  </div>
                </div>
              ) : meetingDetails ? (
                <div className="space-y-6">
                  {/* Meeting Title */}
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">{meetingDetails.title}</h3>
                  </div>

                  {/* Meeting Information Grid */}
                  <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      Meeting Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Date */}
                      <div className="flex items-start gap-3">
                        <Calendar className="w-5 h-5 text-blue-500 mt-1" />
                        <div>
                          <p className="text-sm font-medium text-gray-500">Date</p>
                          <p className="text-base text-gray-900 mt-1">{formatDate(meetingDetails.start_time)}</p>
                        </div>
                      </div>

                      {/* Time */}
                      <div className="flex items-start gap-3">
                        <Clock className="w-5 h-5 text-green-500 mt-1" />
                        <div>
                          <p className="text-sm font-medium text-gray-500">Time</p>
                          <p className="text-base text-gray-900 mt-1">{formatTime(meetingDetails.start_time)}</p>
                        </div>
                      </div>

                      {/* Duration */}
                      <div className="flex items-start gap-3">
                        <Clock className="w-5 h-5 text-orange-500 mt-1" />
                        <div>
                          <p className="text-sm font-medium text-gray-500">Duration</p>
                          <p className="text-base text-gray-900 mt-1">
                            {calculateDuration(meetingDetails.start_time, meetingDetails.end_time)}
                          </p>
                        </div>
                      </div>

                      {/* Timezone */}
                      {meetingDetails.timezone && (
                        <div className="flex items-start gap-3">
                          <Clock className="w-5 h-5 text-purple-500 mt-1" />
                          <div>
                            <p className="text-sm font-medium text-gray-500">Timezone</p>
                            <p className="text-base text-gray-900 mt-1">{meetingDetails.timezone}</p>
                          </div>
                        </div>
                      )}

                      {/* Location */}
                      {meetingDetails.location && (
                        <div className="flex items-start gap-3">
                          <MapPin className="w-5 h-5 text-red-500 mt-1" />
                          <div>
                            <p className="text-sm font-medium text-gray-500">Location</p>
                            <p className="text-base text-gray-900 mt-1">{meetingDetails.location}</p>
                          </div>
                        </div>
                      )}

                      {/* Meeting Link */}
                      {meetingDetails.meeting_link && (
                        <div className="flex items-start gap-3">
                          <LinkIcon className="w-5 h-5 text-indigo-500 mt-1" />
                          <div>
                            <p className="text-sm font-medium text-gray-500">Meeting Link</p>
                            <a
                              href={meetingDetails.meeting_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-base text-blue-600 hover:text-blue-800 underline mt-1 break-all"
                            >
                              Join Meeting
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  {meetingDetails.description && (
                    <div className="bg-white rounded-lg p-6 border border-gray-200">
                      <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-600" />
                        Description
                      </h4>
                      <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {meetingDetails.description}
                      </p>
                    </div>
                  )}

                  {/* Attendees */}
                  {meetingDetails.attendees && meetingDetails.attendees.length > 0 && (
                    <div className="bg-white rounded-lg p-6 border border-gray-200">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-600" />
                        Attendees ({meetingDetails.attendees.length})
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {meetingDetails.attendees.map((attendee, index) => (
                          <div key={index} className="flex items-center gap-2 text-gray-700">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="text-sm">{attendee}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center py-12">
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

export default CRMMeetingDetailsModal;

