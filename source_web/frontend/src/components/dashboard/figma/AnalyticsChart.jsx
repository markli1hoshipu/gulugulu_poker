import { TrendingUp, BarChart3, PieChart } from "lucide-react";
import { motion } from 'framer-motion';

const AnalyticsChart = () => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 12 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.35 }}
      className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6 h-96 hover:shadow-md transition-shadow shadow-[0px_20px_92px_0px_rgba(0,0,0,0.03)]"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-800">Analytics Overview</h3>
        <div className="flex items-center gap-2">
          <button className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
            <BarChart3 className="w-4 h-4" />
          </button>
          <button className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
            <PieChart className="w-4 h-4" />
          </button>
          <button className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
            <TrendingUp className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="w-16 h-16 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center shadow-sm"
        >
          <TrendingUp className="w-8 h-8 text-indigo-600" />
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.4 }}
        >
          <h4 className="text-lg font-semibold text-slate-800 mb-2">Revenue Analytics</h4>
          <p className="text-slate-500 max-w-sm text-sm leading-relaxed">
            Interactive charts and graphs showing revenue trends, customer acquisition, and business metrics would be displayed here.
          </p>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          className="flex items-center gap-6 mt-6"
        >
          <div className="text-center">
            <div className="text-2xl font-bold text-indigo-600 mb-1">↗ 12%</div>
            <div className="text-xs text-slate-500 font-medium">Growth</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-600 mb-1">↑ 8.5%</div>
            <div className="text-xs text-slate-500 font-medium">Conversion</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600 mb-1">↑ 24%</div>
            <div className="text-xs text-slate-500 font-medium">Retention</div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default AnalyticsChart;
