import React, { useEffect, useState } from 'react';
import { Lightbulb, Calendar, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import TimeframeSelector from './TimeframeSelector';
import ExecutiveSummarySection from './ExecutiveSummarySection';
import ActionCardsGrid from './ActionCardsGrid';
import { useSalesCenter } from '../../contexts/SalesCenterContext';
import { Card } from '../ui/card';
import { Button } from '../ui/button';

const BusinessInsightsPage = () => {
  const {
    insights,
    insightsLoading,
    insightsError,
    selectedTable,
    selectedTimeframe,
    setSelectedTimeframe,
    getPreGeneratedInsightsData
  } = useSalesCenter();

  const [isTimeframeDropdownOpen, setIsTimeframeDropdownOpen] = useState(false);

  // Load insights when table or timeframe changes
  useEffect(() => {
    if (selectedTable && !insightsLoading) {
      getPreGeneratedInsightsData(selectedTable, selectedTimeframe);
    }
  }, [selectedTable, selectedTimeframe]);

  // Timeframe selector dropdown button
  const TimeframeSelectorButton = () => (
    <div className="relative">
      <Button
        onClick={() => setIsTimeframeDropdownOpen(!isTimeframeDropdownOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
      >
        <Calendar className="w-4 h-4" />
        <span>
          {selectedTimeframe === 'daily' && 'Daily Insights'}
          {selectedTimeframe === 'weekly' && 'Weekly Insights'}
          {selectedTimeframe === 'monthly' && 'Monthly Insights'}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isTimeframeDropdownOpen ? 'rotate-180' : ''}`} />
      </Button>

      <AnimatePresence>
        {isTimeframeDropdownOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsTimeframeDropdownOpen(false)}
              aria-hidden="true"
            />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="absolute top-full left-0 mt-2 z-20"
            >
              <div className="bg-white rounded-lg shadow-lg border border-gray-200">
                <TimeframeSelector
                  selectedTimeframe={selectedTimeframe}
                  onTimeframeChange={setSelectedTimeframe}
                  onClose={() => setIsTimeframeDropdownOpen(false)}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );

  // No table selected state
  if (!selectedTable) {
    return (
      <Card className="p-12 text-center border-gray-200 bg-gradient-to-br from-purple-50 to-blue-50">
        <Lightbulb className="w-16 h-16 text-purple-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Select a Data Source
        </h3>
        <p className="text-gray-600">
          Choose a data table to generate AI-powered business insights and analytics.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header with Timeframe Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Business Insights</h2>
        <TimeframeSelectorButton />
      </div>

      {/* Loading State */}
      {insightsLoading && (
        <div className="space-y-8 animate-pulse">
          <div className="h-32 bg-muted rounded-lg" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-64 bg-muted rounded-lg" />
            ))}
          </div>
        </div>
      )}

      {/* Error State */}
      {insightsError && !insightsLoading && (
        <Card className="p-6 border-red-200 bg-red-50">
          <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Insights</h3>
          <p className="text-red-700">{insightsError}</p>
          <Button
            onClick={() => getPreGeneratedInsightsData(selectedTable, selectedTimeframe)}
            className="mt-4 bg-red-600 hover:bg-red-700 text-white"
          >
            Retry
          </Button>
        </Card>
      )}

      {/* Insights Display */}
      {insights && !insightsLoading && !insightsError && (
        <>
          {/* Part 1: Executive Summary */}
          {insights.part_1_summary?.overview && (
            <ExecutiveSummarySection overview={insights.part_1_summary.overview} />
          )}

          {/* Part 2: Action Cards Grid */}
          {insights.part_2_actions && (
            <ActionCardsGrid actionsData={insights.part_2_actions} />
          )}
        </>
      )}
    </div>
  );
};

export default React.memo(BusinessInsightsPage);