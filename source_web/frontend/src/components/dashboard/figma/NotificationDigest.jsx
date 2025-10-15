import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Bell, Clock, User, Calendar, Mail, AlertCircle, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const NotificationDigest = () => {
  const notifications = [
    {
      id: 1,
      type: 'meeting',
      icon: Calendar,
      title: 'Upcoming meeting in 15 minutes',
      description: 'Q4 Strategy Review with Product Team',
      time: '15 min',
      priority: 'high',
      read: false
    },
    {
      id: 2,
      type: 'task',
      icon: CheckCircle,
      title: 'Task completed by Sarah Chen',
      description: 'Customer feedback analysis report submitted',
      time: '1 hour ago',
      priority: 'medium',
      read: false
    },
    {
      id: 3,
      type: 'email',
      icon: Mail,
      title: 'New client inquiry',
      description: 'Enterprise customer interested in premium features',
      time: '2 hours ago',
      priority: 'high',
      read: true
    },
    {
      id: 4,
      type: 'alert',
      icon: AlertCircle,
      title: 'System maintenance scheduled',
      description: 'Planned downtime tonight from 2-4 AM EST',
      time: '3 hours ago',
      priority: 'low',
      read: true
    },
    {
      id: 5,
      type: 'user',
      icon: User,
      title: 'New team member joined',
      description: 'Alex Rodriguez added to Marketing team',
      time: '1 day ago',
      priority: 'low',
      read: true
    }
  ];

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'medium':
        return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'low':
        return 'text-slate-600 bg-slate-50 border-slate-200';
      default:
        return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <Card className="hover:shadow-md transition-shadow shadow-[0px_20px_92px_0px_rgba(0,0,0,0.03)]">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notification Digest
            </CardTitle>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                {unreadCount}
              </span>
            )}
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-3">
            {notifications.map((notification) => {
              const IconComponent = notification.icon;
              const priorityClasses = getPriorityColor(notification.priority);
              
              return (
                <motion.div
                  key={notification.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-colors hover:bg-slate-50/50 ${
                    notification.read ? 'opacity-70' : 'bg-white'
                  }`}
                  whileHover={{ scale: 1.005 }}
                >
                  <div className={`w-8 h-8 rounded-full border flex items-center justify-center ${priorityClasses}`}>
                    <IconComponent className="w-4 h-4" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h5 className={`font-medium text-sm ${notification.read ? 'text-slate-600' : 'text-slate-800'}`}>
                        {notification.title}
                      </h5>
                      <div className="flex items-center gap-2">
                        {!notification.read && (
                          <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                        )}
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {notification.time}
                        </span>
                      </div>
                    </div>
                    <p className={`text-sm mt-1 ${notification.read ? 'text-slate-500' : 'text-slate-600'}`}>
                      {notification.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-200">
            <button className="w-full text-center text-sm text-indigo-600 hover:text-indigo-700 font-medium transition-colors">
              View All Notifications
            </button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default NotificationDigest;
