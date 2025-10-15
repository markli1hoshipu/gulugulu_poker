import { useState, useMemo } from "react";
import { Calendar, Clock, Search, Filter, X } from "lucide-react";
import { Badge } from "../../ui/badge";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import { Select, SelectContent, SelectItem } from "../../ui/select";
import { motion, AnimatePresence } from 'framer-motion';
import MeetingDetailsModal from './MeetingDetailsModal';

const AllMeetingsModal = ({ isOpen, onClose, meetings, meetingType }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [daysFilter, setDaysFilter] = useState('all');
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [showMeetingDetails, setShowMeetingDetails] = useState(false);

  const handleMeetingClick = (meeting) => {
    setSelectedMeeting(meeting);
    setShowMeetingDetails(true);
  };

  const getTypeConfig = () => {
    switch (meetingType) {
      case 'upcoming':
        return {
          title: 'All Upcoming Meetings',
          containerBg: 'bg-indigo-50/80',
          avatarGradient: 'bg-gradient-to-r from-indigo-400 to-purple-500',
          badgeStyle: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-100',
          badgeText: 'Upcoming',
          borderColor: 'border-indigo-100 hover:border-indigo-200',
          emptyMessage: 'No upcoming meetings scheduled',
          filterOptions: [
            { value: 'all', label: 'All Time' },
            { value: '1', label: 'Next 1 Day' },
            { value: '3', label: 'Next 3 Days' },
            { value: '7', label: 'Next 7 Days' },
            { value: '14', label: 'Next 14 Days' },
            { value: '30', label: 'Next 30 Days' }
          ]
        };
      case 'recent':
        return {
          title: 'All Recent Meetings',
          containerBg: 'bg-slate-50/80',
          avatarGradient: 'bg-gradient-to-r from-slate-400 to-slate-600',
          badgeStyle: 'border-slate-300 text-slate-600',
          badgeText: 'Completed',
          borderColor: 'border-slate-100 hover:border-slate-200',
          emptyMessage: 'No recent meetings found',
          filterOptions: [
            { value: 'all', label: 'All Time' },
            { value: '1', label: 'Past 1 Day' },
            { value: '3', label: 'Past 3 Days' },
            { value: '7', label: 'Past 7 Days' },
            { value: '14', label: 'Past 14 Days' },
            { value: '30', label: 'Past 30 Days' }
          ]
        };
    }
  };

  const config = getTypeConfig();

  // Helper function to parse relative dates
  const parseRelativeDate = (dateStr) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const lowerDate = dateStr.toLowerCase();
    
    if (lowerDate.includes('today')) {
      return 0;
    } else if (lowerDate.includes('yesterday')) {
      return -1;
    } else if (lowerDate.includes('tomorrow')) {
      return 1;
    } else if (lowerDate.includes('days ago')) {
      const match = lowerDate.match(/(\d+)\s+days?\s+ago/);
      if (match) {
        return -parseInt(match[1]);
      }
    } else if (lowerDate.includes('next monday')) {
      return 1; // Simplified for demo
    } else if (lowerDate.includes('next tuesday')) {
      return 2; // Simplified for demo
    } else if (lowerDate.includes('friday')) {
      return 2; // Simplified for demo - assuming Friday is 2 days away
    }
    
    return 0; // Default to today
  };

  // Filter meetings based on search query and days filter
  const filteredMeetings = useMemo(() => {
    let filtered = meetings;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(meeting => 
        meeting.title.toLowerCase().includes(query) ||
        (meeting.date && meeting.date.toLowerCase().includes(query)) ||
        (meeting.time && meeting.time.toLowerCase().includes(query))
      );
    }

    // Apply days filter
    if (daysFilter !== 'all') {
      const filterDays = parseInt(daysFilter);
      filtered = filtered.filter(meeting => {
        const meetingDays = parseRelativeDate(meeting.date || '');
        
        if (meetingType === 'upcoming') {
          return meetingDays >= 0 && meetingDays <= filterDays;
        } else {
          return meetingDays <= 0 && meetingDays >= -filterDays;
        }
      });
    }

    return filtered;
  }, [meetings, searchQuery, daysFilter, meetingType]);

  const handleReset = () => {
    setSearchQuery('');
    setDaysFilter('all');
  };

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-semibold text-slate-800">{config.title}</h2>
              </div>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Search and Filter Controls */}
          <div className="p-6 space-y-4 border-b border-slate-200">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search Input */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Search meetings by name, date, or time..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-slate-50 border-slate-200"
                />
              </div>
              
              {/* Days Filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-500" />
                <Select value={daysFilter} onValueChange={setDaysFilter} className="w-40" size="sm">
                  <SelectContent>
                    {config.filterOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Active Filters Display */}
            {(searchQuery.trim() || daysFilter !== 'all') && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-slate-600">Active filters:</span>
                {searchQuery.trim() && (
                  <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                    Search: "{searchQuery}"
                  </Badge>
                )}
                {daysFilter !== 'all' && (
                  <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                    {config.filterOptions.find(opt => opt.value === daysFilter)?.label}
                  </Badge>
                )}
                <button
                  onClick={handleReset}
                  className="text-sm text-indigo-600 hover:text-indigo-700 ml-2"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {filteredMeetings.length > 0 ? (
              <>
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="bg-slate-100 text-slate-700 border-slate-200">
                    {filteredMeetings.length} of {meetings.length} {filteredMeetings.length === 1 ? 'meeting' : 'meetings'}
                  </Badge>
                </div>
                
                <div className="space-y-3">
                  {filteredMeetings.map((meeting) => (
                    <div 
                      key={meeting.id} 
                      className={`${config.containerBg} rounded-lg p-4 flex items-center gap-4 border ${config.borderColor} transition-all cursor-pointer hover:shadow-sm`}
                      onClick={() => handleMeetingClick(meeting)}
                    >
                      <div className={`w-12 h-12 ${config.avatarGradient} rounded-full flex items-center justify-center text-white font-medium shadow-sm`}>
                        {getInitials(meeting.title)}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-slate-800 mb-1">{meeting.title}</h4>
                        <div className="flex items-center gap-4 text-sm text-slate-600">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>{meeting.date || new Date(meeting.start).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>{meeting.time || new Date(meeting.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          {meeting.durationMin && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              <span>{meeting.durationMin} min</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <Badge 
                        className={meetingType === 'upcoming' ? config.badgeStyle : ''}
                        variant={meetingType === 'recent' ? 'outline' : undefined}
                      >
                        {config.badgeText}
                      </Badge>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                  {searchQuery.trim() || daysFilter !== 'all' ? (
                    <Search className="w-8 h-8 text-slate-400" />
                  ) : (
                    <Calendar className="w-8 h-8 text-slate-400" />
                  )}
                </div>
                <h4 className="font-medium text-slate-800 mb-2">
                  {searchQuery.trim() || daysFilter !== 'all' ? 'No matching meetings' : 'No meetings found'}
                </h4>
                <p className="text-sm text-slate-500">
                  {searchQuery.trim() || daysFilter !== 'all' 
                    ? 'Try adjusting your search or filter criteria' 
                    : config.emptyMessage
                  }
                </p>
                {(searchQuery.trim() || daysFilter !== 'all') && (
                  <button
                    onClick={handleReset}
                    className="mt-3 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}
          </div>
        </motion.div>

        {/* Meeting Details Modal */}
        <MeetingDetailsModal
          isOpen={showMeetingDetails}
          onClose={() => setShowMeetingDetails(false)}
          meeting={selectedMeeting}
        />
      </motion.div>
    </AnimatePresence>
  );
};

export default AllMeetingsModal;
