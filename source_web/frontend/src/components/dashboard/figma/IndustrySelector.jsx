import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Checkbox } from '../../ui/checkbox';
import { Factory, Loader2, RefreshCw, CheckCircle2, Circle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getUserIndustries } from '../../../services/newsApi';

const IndustrySelector = ({ userEmail, onIndustriesChange, selectedIndustries = [] }) => {
  const [industries, setIndustries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isFallback, setIsFallback] = useState(false);

  // Fetch user industries
  const fetchIndustries = async () => {
    if (!userEmail) {
      setError('User email not provided');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await getUserIndustries(userEmail);

      if (response.success) {
        setIndustries(response.industries);
        setIsFallback(false);
      } else {
        // Use fallback industries
        setIndustries(response.industries);
        setIsFallback(true);
        setError('Using default industry list');
      }
    } catch (err) {
      setError(err.message);
      // Set fallback industries
      setIndustries([
        'Technology', 'Finance', 'Healthcare', 'Manufacturing', 'Retail',
        'Real Estate', 'Education', 'Energy', 'Automotive', 'Media'
      ]);
      setIsFallback(true);
    } finally {
      setLoading(false);
    }
  };

  // Load industries on mount
  useEffect(() => {
    fetchIndustries();
  }, [userEmail]);

  // Handle industry selection
  const handleIndustryToggle = (industry) => {
    const newSelected = selectedIndustries.includes(industry)
      ? selectedIndustries.filter(i => i !== industry)
      : [...selectedIndustries, industry];
    
    onIndustriesChange(newSelected);
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedIndustries.length === industries.length) {
      onIndustriesChange([]);
    } else {
      onIndustriesChange([...industries]);
    }
  };

  // Handle clear all
  const handleClearAll = () => {
    onIndustriesChange([]);
  };

  return (
    <Card className="border-0 shadow-sm bg-gradient-to-r from-blue-50 to-indigo-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Factory className="w-5 h-5 text-blue-600" />
            <CardTitle className="text-base font-semibold text-gray-800">Select Industries</CardTitle>
            {isFallback && (
              <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                Default List
              </Badge>
            )}
          </div>
          <Button
            onClick={fetchIndustries}
            disabled={loading}
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
          >
            {loading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <RefreshCw className="w-3 h-3" />
            )}
          </Button>
        </div>

        {error && (
          <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2 mt-2">
            ⚠️ {error}
          </div>
        )}
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <span className="ml-2 text-sm text-gray-600">Loading industries...</span>
          </div>
        ) : (
          <>
            {/* Control buttons */}
            <div className="flex items-center gap-2 mb-3">
              <Button
                onClick={handleSelectAll}
                variant="outline"
                size="sm"
                className="text-xs h-7 px-3"
              >
                {selectedIndustries.length === industries.length ? 'Deselect All' : 'Select All'}
              </Button>
              <Button
                onClick={handleClearAll}
                variant="outline"
                size="sm"
                className="text-xs h-7 px-3"
                disabled={selectedIndustries.length === 0}
              >
                Clear
              </Button>
              <div className="text-xs text-gray-500 ml-auto">
                {selectedIndustries.length} of {industries.length} selected
              </div>
            </div>

            {/* Industry grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              <AnimatePresence>
                {industries.map((industry, index) => {
                  const isSelected = selectedIndustries.includes(industry);

                  return (
                    <motion.div
                      key={industry}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: index * 0.02 }}
                    >
                      <div
                        className={`
                          relative p-2.5 rounded-md border cursor-pointer transition-all duration-150 hover:scale-[1.02]
                          ${isSelected
                            ? 'border-blue-400 bg-blue-100 shadow-sm ring-1 ring-blue-200'
                            : 'border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50'
                          }
                        `}
                        onClick={() => handleIndustryToggle(industry)}
                      >
                        <div className="flex items-center gap-2">
                          {isSelected ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                          ) : (
                            <Circle className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          )}
                          <span className={`text-xs font-medium truncate ${
                            isSelected ? 'text-blue-800' : 'text-gray-700'
                          }`}>
                            {industry}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {industries.length === 0 && !loading && (
              <div className="text-center py-6 text-gray-500">
                <Factory className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No industries available</p>
                <Button
                  onClick={fetchIndustries}
                  variant="outline"
                  size="sm"
                  className="mt-2 h-7 text-xs"
                >
                  Reload
                </Button>
              </div>
            )}

            {/* Selected industries summary */}
            {selectedIndustries.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="text-xs text-gray-600 mb-2">Selected industries:</div>
                <div className="flex flex-wrap gap-1">
                  {selectedIndustries.map((industry) => (
                    <Badge
                      key={industry}
                      variant="secondary"
                      className="text-xs cursor-pointer hover:bg-red-100 transition-colors"
                      onClick={() => handleIndustryToggle(industry)}
                    >
                      {industry} ×
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default IndustrySelector;
