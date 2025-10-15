import React, { useState, useEffect } from 'react';
import { X, MessageCircle, Clock, Users, TrendingUp, Heart, Lightbulb, Filter, Search } from 'lucide-react';
import { 
  generateCommunicationTips, 
  getCommunicationTipCategories, 
  filterTipsByCategory, 
  filterTipsByPriority,
  sortTipsByPriority,
  getPriorityColor,
  getCategoryIcon 
} from '../../services/communicationTipsApi';

const CommunicationTipsModal = ({ isOpen, onClose, user, customerId = null, context = "" }) => {
  const [tips, setTips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [metadata, setMetadata] = useState(null);

  const categories = getCommunicationTipCategories();

  useEffect(() => {
    if (isOpen && user?.email) {
      generateTips();
    }
  }, [isOpen, user?.email, customerId, context]);

  const generateTips = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await generateCommunicationTips(user.email, customerId, context);
      
      if (result.success) {
        setTips(sortTipsByPriority(result.tips));
        setMetadata(result.metadata);
      } else {
        setError(result.error || 'Failed to generate communication tips');
      }
    } catch (err) {
      setError('An error occurred while generating tips');
      console.error('Communication tips error:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredTips = tips
    .filter(tip => filterTipsByCategory([tip], selectedCategory).length > 0)
    .filter(tip => filterTipsByPriority([tip], selectedPriority).length > 0)
    .filter(tip => 
      searchTerm === '' || 
      tip.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tip.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <MessageCircle className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Communication Tips</h2>
              <p className="text-sm text-gray-500">
                AI-generated tips for client interactions
                {metadata && ` • ${metadata.customersAnalyzed} customers analyzed`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Search */}
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search tips..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.icon} {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority Filter */}
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Priorities</option>
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>

            {/* Refresh Button */}
            <button
              onClick={generateTips}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Generating...' : 'Refresh Tips'}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Generating communication tips...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="text-red-600 mb-2">⚠️ Error</div>
              <p className="text-gray-600">{error}</p>
              <button
                onClick={generateTips}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : filteredTips.length === 0 ? (
            <div className="text-center py-12">
              <Lightbulb className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                {tips.length === 0 ? 'No communication tips available' : 'No tips match your filters'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTips.map((tip) => (
                <TipCard key={tip.id} tip={tip} />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Showing {filteredTips.length} of {tips.length} tips
              {metadata && (
                <span className="ml-2">
                  • Generated {new Date(metadata.generatedAt).toLocaleString()}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const TipCard = ({ tip }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-lg">{getCategoryIcon(tip.category)}</span>
            <h3 className="font-semibold text-gray-900">{tip.title}</h3>
            <span className={`px-2 py-1 text-xs rounded-full border ${getPriorityColor(tip.priority)}`}>
              {tip.priority}
            </span>
          </div>
          
          <p className="text-gray-600 mb-3">{tip.description}</p>
          
          {expanded && (
            <div className="space-y-3 mt-4 pt-4 border-t border-gray-100">
              {tip.bestTime && (
                <div>
                  <span className="font-medium text-gray-700">Best Time:</span>
                  <span className="ml-2 text-gray-600">{tip.bestTime}</span>
                </div>
              )}
              
              {tip.expectedOutcome && (
                <div>
                  <span className="font-medium text-gray-700">Expected Outcome:</span>
                  <span className="ml-2 text-gray-600">{tip.expectedOutcome}</span>
                </div>
              )}
              
              {tip.example && (
                <div>
                  <span className="font-medium text-gray-700">Example:</span>
                  <div className="mt-1 p-3 bg-blue-50 rounded-lg text-gray-700 italic">
                    "{tip.example}"
                  </div>
                </div>
              )}
              
              {tip.applicableCustomers && tip.applicableCustomers.length > 0 && (
                <div>
                  <span className="font-medium text-gray-700">Applicable to:</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {tip.applicableCustomers.map((customer, index) => (
                      <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                        {customer}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        <button
          onClick={() => setExpanded(!expanded)}
          className="ml-4 text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          {expanded ? 'Show Less' : 'Show More'}
        </button>
      </div>
    </div>
  );
};

export default CommunicationTipsModal;
