import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, ExternalLink, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';

const UpcomingMeetings = () => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 12 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.35 }}
    >
      <Card className="h-[300px] flex flex-col bg-white">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-600" />
              Upcoming Meetings
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-slate-600 hover:text-slate-700 hover:bg-slate-50 text-sm"
              disabled // Not implemented yet
            >
              <ExternalLink className="w-4 h-4 mr-1" />
              View All
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col items-center justify-center px-6 pb-6">
          {/* No Data State */}
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-6 h-6 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-800 mb-2">
              No upcoming meetings
            </h3>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default UpcomingMeetings;