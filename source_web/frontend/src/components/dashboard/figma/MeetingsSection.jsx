import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge as ShadBadge } from '../../ui/badge';
import { Clock, MapPin, Users, ChevronDown, ChevronUp, Video, Calendar, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AllMeetingsModal from './AllMeetingsModal';

const MeetingsSection = ({ title = 'Meetings', meetings = [], variant = 'upcoming' }) => {
  const [expanded, setExpanded] = useState(false);
  const [showAllMeetings, setShowAllMeetings] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const { top, rest } = useMemo(() => {
    const sorted = [...meetings].sort((a, b) => new Date(a.start) - new Date(b.start));
    return { top: sorted.slice(0, 3), rest: sorted.slice(3) };
  }, [meetings]);

  const getVariantStyles = () => {
    switch (variant) {
      case 'recent':
        return {
          containerBg: 'bg-slate-50/80',
          avatarGradient: 'bg-gradient-to-r from-slate-400 to-slate-600',
          linkColor: 'text-slate-600 hover:text-slate-700'
        };
      case 'upcoming':
      default:
        return {
          containerBg: 'bg-indigo-50/80',
          avatarGradient: 'bg-gradient-to-r from-indigo-400 to-purple-500',
          linkColor: 'text-indigo-600 hover:text-indigo-700'
        };
    }
  };

  const styles = getVariantStyles();

  // Generate avatar colors based on meeting ID
  const getAvatarColor = (id) => {
    const colors = [
      'bg-indigo-500', 'bg-purple-500', 'bg-pink-500', 'bg-red-500',
      'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-blue-500'
    ];
    return colors[id % colors.length];
  };

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <Card className="hover:shadow-md transition-shadow shadow-[0px_20px_92px_0px_rgba(0,0,0,0.03)]">
        <CardHeader className="pb-4">
          <div className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold text-slate-800">{title}</CardTitle>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-1 h-6 w-6 bg-white border border-gray-200 rounded-full shadow-sm hover:shadow-md transition-all"
              >
                {isCollapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
              </button>

              {!isCollapsed && (
                <>
                  {rest.length > 0 && (
                    <button className={`text-sm ${styles.linkColor} flex items-center gap-1 font-medium transition-colors`} onClick={() => setExpanded((v) => !v)}>
                      View {expanded ? 'Less' : 'All'} {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  )}
                  {meetings.length > 3 && (
                    <button
                      className={`text-sm ${styles.linkColor} flex items-center gap-1 font-medium transition-colors`}
                      onClick={() => setShowAllMeetings(true)}
                    >
                      View All
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Collapsed View */}
          {isCollapsed && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{meetings.length} meetings</span>
              <div className="flex items-center gap-2">
                {meetings.length > 0 && (
                  <span className="text-blue-600">
                    Next: {meetings[0]?.title || 'No upcoming meetings'}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Expanded View */}
          {!isCollapsed && (
          <AnimatePresence mode="popLayout">
            <div className="space-y-3">
              {(expanded ? [...top, ...rest] : top).map((m) => (
                <motion.div
                  key={m.id}
                  className={`flex items-center gap-3 p-4 rounded-lg ${styles.containerBg} border border-transparent hover:border-slate-200/50 transition-all cursor-pointer hover:shadow-sm`}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  whileHover={{ scale: 1.005 }}
                >
                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-full ${styles.avatarGradient} flex items-center justify-center text-white text-sm font-medium shadow-sm`}>
                    {getInitials(m.title)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm text-slate-800 truncate">{m.title}</h4>
                      <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                        {m.type === 'video' && <Video className="w-3 h-3 text-indigo-500" />}
                        <span className="text-xs px-2 py-1 rounded-full font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                          Scheduled
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(m.start).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>

                      {m.attendees && m.attendees.length > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {m.attendees.length} attendees
                        </span>
                      )}

                      {m.location && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {m.location}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}

              {top.length === 0 && (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="w-12 h-12 mx-auto mb-3 bg-slate-100 rounded-full flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-slate-400" />
                    </div>
                    <p className="text-sm text-slate-500">No meetings scheduled</p>
                  </div>
                </div>
              )}
            </div>
          </AnimatePresence>
          )}
        </CardContent>
      </Card>

      {/* All Meetings Modal */}
      <AllMeetingsModal
        isOpen={showAllMeetings}
        onClose={() => setShowAllMeetings(false)}
        meetings={meetings}
        meetingType={variant}
      />
    </motion.div>
  );
};

export default MeetingsSection;
