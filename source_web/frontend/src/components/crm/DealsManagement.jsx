import React, { useState, useMemo } from 'react';
import { 
  DollarSign, 
  Plus, 
  Search, 
  Filter, 
  RefreshCw,
  TrendingUp,
  Calendar,
  User,
  Building,
  Edit2,
  Trash2,
  ChevronDown,
  Check,
  Clock,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import SearchBarWithColumns from './SearchBarWithColumns';
import FilterDropdown from './FilterDropdown';
import ColumnSelector from '../lead-gen/ColumnSelector';

const DealsManagement = () => {
  // Mock deals data - replace with actual API calls
  const [deals, setDeals] = useState([
    {
      id: 1,
      name: 'Enterprise Software License',
      company: 'TechCorp Inc.',
      value: 250000,
      stage: 'negotiation',
      probability: 75,
      closeDate: '2024-02-15',
      owner: 'Sarah Johnson',
      lastActivity: '2024-01-10',
      status: 'active'
    },
    {
      id: 2,
      name: 'Cloud Migration Project',
      company: 'Global Retail Co.',
      value: 180000,
      stage: 'proposal',
      probability: 60,
      closeDate: '2024-03-01',
      owner: 'Mike Chen',
      lastActivity: '2024-01-09',
      status: 'active'
    },
    {
      id: 3,
      name: 'Annual Support Contract',
      company: 'FinanceHub LLC',
      value: 95000,
      stage: 'qualification',
      probability: 30,
      closeDate: '2024-03-15',
      owner: 'Emily Davis',
      lastActivity: '2024-01-08',
      status: 'active'
    },
    {
      id: 4,
      name: 'Data Analytics Platform',
      company: 'Healthcare Plus',
      value: 320000,
      stage: 'closed-won',
      probability: 100,
      closeDate: '2024-01-05',
      owner: 'James Wilson',
      lastActivity: '2024-01-05',
      status: 'closed'
    },
    {
      id: 5,
      name: 'Security Audit Services',
      company: 'StartupXYZ',
      value: 45000,
      stage: 'closed-lost',
      probability: 0,
      closeDate: '2024-01-03',
      owner: 'Lisa Anderson',
      lastActivity: '2024-01-03',
      status: 'closed'
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [searchColumns, setSearchColumns] = useState({
    name: true,
    company: true,
    owner: true,
    stage: true
  });
  const [filterStage, setFilterStage] = useState('all');
  const [filters, setFilters] = useState({
    status: '',
    owner: '',
    valueRange: '',
    probabilityRange: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('value');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showAddDealModal, setShowAddDealModal] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState(null);

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState({
    name: true,
    company: true,
    value: true,
    stage: true,
    probability: true,
    closeDate: true,
    owner: true,
    lastActivity: true,
    actions: true
  });

  // Column definitions for the selector
  const columnDefinitions = [
    { id: 'name', label: 'Deal Name', icon: null, disabled: true }, // Always required
    { id: 'company', label: 'Company', icon: Building },
    { id: 'value', label: 'Value', icon: DollarSign },
    { id: 'stage', label: 'Stage', icon: null },
    { id: 'probability', label: 'Probability', icon: null },
    { id: 'closeDate', label: 'Close Date', icon: Calendar },
    { id: 'owner', label: 'Owner', icon: User },
    { id: 'lastActivity', label: 'Last Activity', icon: Clock },
    { id: 'actions', label: 'Actions', icon: null, disabled: true } // Always required
  ];

  // Handle column toggle
  const handleColumnToggle = (columnId, isVisible) => {
    setVisibleColumns(prev => ({
      ...prev,
      [columnId]: isVisible
    }));
  };

  // Deal stages configuration
  const dealStages = [
    { id: 'Opportunity', label: 'Opportunity', color: 'bg-blue-100 text-blue-800' },
    { id: 'Discovery', label: 'Discovery', color: 'bg-purple-100 text-purple-800' },
    { id: 'Negotiation', label: 'Negotiation', color: 'bg-orange-100 text-orange-800' },
    { id: 'Closed-Won', label: 'Closed Won', color: 'bg-green-100 text-green-800' },
    { id: 'Closed-Lost', label: 'Closed Lost', color: 'bg-red-100 text-red-800' }
  ];

  // Helper functions
  const getStageColor = (stage) => {
    const stageConfig = dealStages.find(s => s.id === stage);
    return stageConfig ? stageConfig.color : 'bg-gray-100 text-gray-800';
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const getProbabilityColor = (probability) => {
    if (probability >= 70) return 'text-green-600';
    if (probability >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Filter and sort deals with advanced column-based search
  const filteredDeals = useMemo(() => {
    let filtered = deals.filter(deal => {
      // Search filter with column selection
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const searchableFields = [];
        
        if (searchColumns.name) searchableFields.push(deal.name);
        if (searchColumns.company) searchableFields.push(deal.company);
        if (searchColumns.owner) searchableFields.push(deal.owner);
        if (searchColumns.stage) searchableFields.push(dealStages.find(s => s.id === deal.stage)?.label || deal.stage);
        
        if (!searchableFields.some(field => field?.toLowerCase().includes(searchLower))) {
          return false;
        }
      }
      
      // Stage filter
      const matchesStage = filterStage === 'all' || deal.stage === filterStage;
      
      // Additional filters
      if (filters.status && deal.status !== filters.status) return false;
      if (filters.owner && !deal.owner.toLowerCase().includes(filters.owner.toLowerCase())) return false;
      
      // Value range filter
      if (filters.valueRange) {
        const [min, max] = filters.valueRange.split('-').map(v => parseInt(v) || 0);
        if (max && (deal.value < min || deal.value > max)) return false;
        if (!max && deal.value < min) return false;
      }
      
      // Probability range filter
      if (filters.probabilityRange) {
        const [min, max] = filters.probabilityRange.split('-').map(v => parseInt(v) || 0);
        if (max && (deal.probability < min || deal.probability > max)) return false;
        if (!max && deal.probability < min) return false;
      }
      
      return matchesStage;
    });

    // Sort deals
    filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      if (sortBy === 'closeDate' || sortBy === 'lastActivity') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [deals, searchTerm, searchColumns, filterStage, filters, sortBy, sortOrder]);

  // Calculate pipeline metrics
  const pipelineMetrics = useMemo(() => {
    const activeDeals = deals.filter(d => d.status === 'active');
    const totalValue = activeDeals.reduce((sum, deal) => sum + deal.value, 0);
    const weightedValue = activeDeals.reduce((sum, deal) => sum + (deal.value * deal.probability / 100), 0);
    const avgDealSize = activeDeals.length > 0 ? totalValue / activeDeals.length : 0;
    const closedWonCount = deals.filter(d => d.stage === 'closed-won').length;
    const closedLostCount = deals.filter(d => d.stage === 'closed-lost').length;
    const winRate = (closedWonCount + closedLostCount) > 0 
      ? (closedWonCount / (closedWonCount + closedLostCount) * 100) 
      : 0;

    return {
      totalValue,
      weightedValue,
      avgDealSize,
      activeCount: activeDeals.length,
      winRate
    };
  }, [deals]);

  const handleDeleteDeal = (dealId, e) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this deal?')) {
      setDeals(deals.filter(d => d.id !== dealId));
    }
  };

  const handleEditDeal = (deal, e) => {
    e.stopPropagation();
    setSelectedDeal(deal);
    // Open edit modal - implement as needed
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header with Metrics */}
      <div className="bg-white border-b px-6 py-4">
        <div className="grid grid-cols-5 gap-4 mb-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Pipeline Value</p>
                  <p className="text-2xl font-bold">{formatCurrency(pipelineMetrics.totalValue)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Weighted Value</p>
                  <p className="text-2xl font-bold">{formatCurrency(pipelineMetrics.weightedValue)}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Active Deals</p>
                  <p className="text-2xl font-bold">{pipelineMetrics.activeCount}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Avg Deal Size</p>
                  <p className="text-2xl font-bold">{formatCurrency(pipelineMetrics.avgDealSize)}</p>
                </div>
                <Building className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Win Rate</p>
                  <p className="text-2xl font-bold">{pipelineMetrics.winRate.toFixed(1)}%</p>
                </div>
                <Check className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              onClick={() => setShowAddDealModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Deal
            </Button>

            {/* Search with Column Selection */}
            <SearchBarWithColumns
              value={searchTerm}
              onChange={setSearchTerm}
              onClear={() => setSearchTerm('')}
              searchColumns={searchColumns}
              onColumnChange={setSearchColumns}
              availableColumns={[
                { key: 'name', label: 'Deal Name', icon: '💼' },
                { key: 'company', label: 'Company', icon: '🏢' },
                { key: 'owner', label: 'Owner', icon: '👤' },
                { key: 'stage', label: 'Stage', icon: '📊' }
              ]}
              placeholder="Search deals..."
            />

            {/* Stage Filter */}
            <select
              value={filterStage}
              onChange={(e) => setFilterStage(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Stages</option>
              {dealStages.map(stage => (
                <option key={stage.id} value={stage.id}>{stage.label}</option>
              ))}
            </select>

            {/* Filter Toggle */}
            <Button
              variant="ghost"
              onClick={() => setShowFilters(!showFilters)}
              className={`${showFilters ? 'bg-blue-50 text-blue-600' : 'text-gray-600'}`}
            >
              <Filter className="w-4 h-4 mr-1" />
              Filters
            </Button>

            {/* Column Selector */}
            <ColumnSelector
              columns={columnDefinitions}
              visibleColumns={visibleColumns}
              onColumnToggle={handleColumnToggle}
            />

            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.reload()}
              className="text-gray-600"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-1 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="value">Deal Value</option>
              <option value="probability">Probability</option>
              <option value="closeDate">Close Date</option>
              <option value="lastActivity">Last Activity</option>
              <option value="name">Deal Name</option>
            </select>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="text-gray-600"
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Advanced Filters Panel */}
        {showFilters && (
          <div className="bg-gray-50 border-t px-6 py-4">
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({...filters, status: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Owner</label>
                <input
                  type="text"
                  placeholder="Filter by owner..."
                  value={filters.owner}
                  onChange={(e) => setFilters({...filters, owner: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deal Value Range</label>
                <select
                  value={filters.valueRange}
                  onChange={(e) => setFilters({...filters, valueRange: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Values</option>
                  <option value="0-50000">$0 - $50K</option>
                  <option value="50000-100000">$50K - $100K</option>
                  <option value="100000-250000">$100K - $250K</option>
                  <option value="250000">$250K+</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Probability Range</label>
                <select
                  value={filters.probabilityRange}
                  onChange={(e) => setFilters({...filters, probabilityRange: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Probabilities</option>
                  <option value="0-30">0% - 30%</option>
                  <option value="30-60">30% - 60%</option>
                  <option value="60-90">60% - 90%</option>
                  <option value="90-100">90% - 100%</option>
                </select>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilters({ status: '', owner: '', valueRange: '', probabilityRange: '' })}
                className="text-gray-600"
              >
                Clear Filters
              </Button>
              <span className="text-sm text-gray-500">
                Showing {filteredDeals.length} of {deals.length} deals
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Deals Table */}
      <div className="flex-1 overflow-auto p-6">
        <div className="bg-white rounded-lg shadow">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                {visibleColumns.name && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Deal Name
                  </th>
                )}
                {visibleColumns.company && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company
                  </th>
                )}
                {visibleColumns.value && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Value
                  </th>
                )}
                {visibleColumns.stage && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stage
                  </th>
                )}
                {visibleColumns.probability && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Probability
                  </th>
                )}
                {visibleColumns.closeDate && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Close Date
                  </th>
                )}
                {visibleColumns.owner && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Owner
                  </th>
                )}
                {visibleColumns.lastActivity && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Activity
                  </th>
                )}
                {visibleColumns.actions && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredDeals.map((deal) => (
                <tr 
                  key={deal.id}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => setSelectedDeal(deal)}
                >
                  {visibleColumns.name && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{deal.name}</div>
                    </td>
                  )}
                  {visibleColumns.company && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Building className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">{deal.company}</span>
                      </div>
                    </td>
                  )}
                  {visibleColumns.value && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">
                        {formatCurrency(deal.value)}
                      </div>
                    </td>
                  )}
                  {visibleColumns.stage && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStageColor(deal.stage)}`}>
                        {dealStages.find(s => s.id === deal.stage)?.label}
                      </span>
                    </td>
                  )}
                  {visibleColumns.probability && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className={`text-sm font-medium ${getProbabilityColor(deal.probability)}`}>
                          {deal.probability}%
                        </span>
                      </div>
                    </td>
                  )}
                  {visibleColumns.closeDate && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                        {new Date(deal.closeDate).toLocaleDateString()}
                      </div>
                    </td>
                  )}
                  {visibleColumns.owner && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">{deal.owner}</span>
                      </div>
                    </td>
                  )}
                  {visibleColumns.lastActivity && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <Clock className="w-4 h-4 text-gray-400 mr-2" />
                        {new Date(deal.lastActivity).toLocaleDateString()}
                      </div>
                    </td>
                  )}
                  {visibleColumns.actions && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleEditDeal(deal, e)}
                          className="text-gray-600 hover:text-blue-600"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleDeleteDeal(deal.id, e)}
                          className="text-gray-600 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {filteredDeals.length === 0 && (
            <div className="text-center py-12">
              <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No deals found</p>
              <p className="text-sm text-gray-400 mt-1">Try adjusting your search or filters</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DealsManagement;