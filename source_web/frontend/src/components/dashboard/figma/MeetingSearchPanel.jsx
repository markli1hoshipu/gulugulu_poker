import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Search, Clock, Users, Calendar, Play, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const MeetingSearchPanel = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const recentMeetingSummaries = [
    {
      id: 1,
      title: 'Q4 Strategy Review',
      date: 'Today',
      time: '2:00 PM',
      duration: '45 mins',
      attendees: 8,
      summary: 'We conducted a comprehensive review of Q4 performance and strategic initiatives. Revenue targets were exceeded by 12%, primarily driven by increased enterprise customer acquisition. The team discussed upcoming product launches and marketing strategies for the next quarter.',
      hasRecording: true
    },
    {
      id: 2,
      title: 'Customer Feedback Session',
      date: 'Yesterday',
      time: '10:30 AM',
      duration: '60 mins',
      attendees: 12,
      summary: 'Gathered valuable insights from key customers about product features and user experience. Identified three priority areas for improvement in the next release cycle.',
      hasRecording: true
    },
    {
      id: 3,
      title: 'Product Roadmap Planning',
      date: 'Dec 8',
      time: '3:15 PM',
      duration: '90 mins',
      attendees: 6,
      summary: 'Outlined the product development timeline for Q1 2024. Prioritized feature requests and allocated resources for upcoming sprints.',
      hasRecording: false
    }
  ];

  const filteredSummaries = recentMeetingSummaries.filter(meeting =>
    meeting.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    meeting.date.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <Card className="hover:shadow-md transition-shadow shadow-[0px_20px_92px_0px_rgba(0,0,0,0.03)]">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-slate-800">Meeting Agent</CardTitle>
          
          {/* Search Bar */}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search meetings by name, date, or time..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
            />
          </div>

          {/* Quick Book Button */}
          <button className="mt-3 w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
            <Calendar className="w-4 h-4" />
            Quick Book
          </button>
        </CardHeader>

        <CardContent>
          <div className="mb-4">
            <h4 className="font-medium text-slate-800 mb-3">Recent Meeting Summaries</h4>
          </div>

          <div className="space-y-4">
            {filteredSummaries.map((meeting) => (
              <motion.div
                key={meeting.id}
                className="border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-colors"
                whileHover={{ scale: 1.005 }}
              >
                <div className="flex items-start justify-between mb-3">
                  <h5 className="font-semibold text-slate-800">{meeting.title}</h5>
                  {meeting.hasRecording && (
                    <div className="flex items-center gap-1 text-indigo-600 text-xs">
                      <Play className="w-3 h-3" />
                      Recording
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {meeting.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {meeting.time}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {meeting.duration}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {meeting.attendees} attendees
                  </span>
                </div>

                <p className="text-sm text-slate-600 mb-3 line-clamp-3">
                  {meeting.summary}
                </p>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    Click to view full summary and recording
                  </span>
                  <button className="flex items-center gap-1 text-indigo-600 hover:text-indigo-700 text-sm font-medium transition-colors">
                    View Details
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>

          {filteredSummaries.length === 0 && searchQuery && (
            <div className="text-center py-8">
              <div className="w-12 h-12 mx-auto mb-3 bg-slate-100 rounded-full flex items-center justify-center">
                <Search className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-sm text-slate-500">No meetings found matching "{searchQuery}"</p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default MeetingSearchPanel;
