import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';
import { PieChartIcon } from 'lucide-react';
import { Card } from '../ui/card';
import { calculateConcentration, formatCurrency } from '../../utils/comparativeMetricsUtils';
import { useDateFilter } from '../../hooks/useDateFilter';
import { useSalesCenter } from '../../contexts/SalesCenterContext';

/**
 * ConcentrationPieCharts Component
 *
 * Displays customer and product revenue concentration using pie charts
 * Shows top N entities and calculates concentration percentage
 */
const ConcentrationPieCharts = ({ tableName, topN }) => {
  const [customerData, setCustomerData] = useState(null);
  const [productData, setProductData] = useState(null);
  const { dateFilter } = useDateFilter();
  const { comparativeData, comparativeLoading, comparativeError } = useSalesCenter();

  // Color palette for pie charts
  const COLORS = [
    '#031D4A', // Prelude Dark Blue
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#6B7280', // Gray (for Others)
  ];

  // Transform and filter data for concentration
  const transformDataForConcentration = (combinedData, categoryKey, dateFilter) => {
    if (!combinedData || !Array.isArray(combinedData)) {
      return [];
    }

    // Filter by date range if dateFilter exists
    let filteredData = combinedData;
    if (dateFilter) {
      filteredData = combinedData.filter(item => {
        const itemDate = new Date(item.date || item.week_start || item.period || item.timestamp);
        return !isNaN(itemDate) &&
               itemDate >= dateFilter.startDate &&
               itemDate <= dateFilter.endDate;
      });
    }

    // Aggregate by entity
    const aggregated = {};
    filteredData.forEach(item => {
      const entity = item[categoryKey] || 'Unknown';
      if (!aggregated[entity]) {
        aggregated[entity] = {
          revenue: 0,
          profit: 0,
          volume: 0
        };
      }
      aggregated[entity].revenue += item.total_revenue || item.revenue || 0;
      aggregated[entity].profit += item.total_profit || item.profit || 0;
      aggregated[entity].volume += item.unique_transactions || 0;
    });

    // Convert to array for concentration calculation
    const data = Object.entries(aggregated).map(([name, metrics]) => ({
      name,
      value: metrics.revenue, // Use revenue for concentration
      revenue: metrics.revenue,
      profit: metrics.profit,
      volume: metrics.volume
    }));

    // Sort by revenue
    return data.sort((a, b) => b.revenue - a.revenue);
  };

  // Transform context data when dependencies change
  useEffect(() => {
    if (!comparativeData) {
      setCustomerData(null);
      setProductData(null);
      return;
    }

    // Transform customer data
    const customers = transformDataForConcentration(
      comparativeData.Customers,
      'customer',
      dateFilter
    );
    const customerConcentration = calculateConcentration(customers, 'customer', topN);
    setCustomerData(customerConcentration);

    // Transform product data
    const products = transformDataForConcentration(
      comparativeData.Products,
      'product',
      dateFilter
    );
    const productConcentration = calculateConcentration(products, 'product', topN);
    setProductData(productConcentration);
  }, [comparativeData, topN, dateFilter]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-semibold text-gray-900">{data.name}</p>
          <p className="text-sm text-gray-600">{formatCurrency(data.value)}</p>
          <p className="text-sm text-gray-500">{data.percentage}%</p>
        </div>
      );
    }
    return null;
  };

  // Custom label renderer
  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percentage }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    // Only show percentage if it's greater than 5%
    if (parseFloat(percentage) < 5) return null;

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="text-xs font-semibold"
      >
        {`${percentage}%`}
      </text>
    );
  };

  // Loading state
  if (comparativeLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((idx) => (
          <Card key={idx} className="p-6">
            <div className="animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-64 bg-gray-100 rounded"></div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  // Error state
  if (comparativeError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-800">{comparativeError}</p>
      </div>
    );
  }

  // No data state
  if (!customerData && !productData) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <PieChartIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <p className="text-gray-600">No concentration data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pie Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Revenue Concentration */}
        <Card className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Customer Revenue Concentration</h3>
            {customerData?.concentration && (
              <p className="text-sm text-gray-600 mt-1">
                Top {customerData.concentration.topNCount}: {customerData.concentration.topNPercentage}% of revenue
                <span className="text-gray-400 ml-1">
                  ({customerData.concentration.totalEntities} total customers)
                </span>
              </p>
            )}
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={customerData?.pieData || []}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomLabel}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                animationDuration={800}
                animationBegin={0}
              >
                {(customerData?.pieData || []).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value) => (
                  <span className="text-xs text-gray-700">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Product Revenue Concentration */}
        <Card className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Product Revenue Concentration</h3>
            {productData?.concentration && (
              <p className="text-sm text-gray-600 mt-1">
                Top {productData.concentration.topNCount}: {productData.concentration.topNPercentage}% of revenue
                <span className="text-gray-400 ml-1">
                  ({productData.concentration.totalEntities} total products)
                </span>
              </p>
            )}
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={productData?.pieData || []}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomLabel}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                animationDuration={800}
                animationBegin={0}
              >
                {(productData?.pieData || []).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value) => (
                  <span className="text-xs text-gray-700">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
};

export default ConcentrationPieCharts;
