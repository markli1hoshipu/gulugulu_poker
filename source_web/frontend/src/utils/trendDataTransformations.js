/**
 * Utility functions for transforming trend chart data
 * Handles weekly to monthly aggregation and cumulative calculations
 */

/**
 * Fill missing weeks with zero values to ensure consistent data
 * @param {Array} data - Array of {date, value} objects
 * @returns {Array} Data with missing weeks filled with 0 values
 */
export function fillMissingWeeks(data) {
  if (!data || data.length === 0) return [];

  // Sort data by date
  const sorted = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));

  const filled = [];
  const startDate = new Date(sorted[0].date);
  const endDate = new Date(sorted[sorted.length - 1].date);

  // Create a map for quick lookup
  const dataMap = new Map(sorted.map(item => [
    new Date(item.date).toISOString().split('T')[0],
    item.value
  ]));

  // Iterate week by week
  let currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split('T')[0];
    filled.push({
      date: dateStr,
      value: dataMap.get(dateStr) || 0
    });

    // Move to next week
    currentDate.setDate(currentDate.getDate() + 7);
  }

  return filled;
}

/**
 * Aggregate weekly data into monthly data
 * @param {Array} weeklyData - Array of {date, value} objects
 * @returns {Array} Monthly aggregated data
 */
export function aggregateByMonth(weeklyData) {
  if (!weeklyData || weeklyData.length === 0) return [];

  const monthlyMap = new Map();

  weeklyData.forEach(item => {
    const date = new Date(item.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!monthlyMap.has(monthKey)) {
      monthlyMap.set(monthKey, {
        date: `${monthKey}-01`,
        value: 0,
        count: 0
      });
    }

    const monthData = monthlyMap.get(monthKey);
    monthData.value += parseFloat(item.value) || 0;
    monthData.count += 1;
  });

  // Convert map to array and sort by date
  return Array.from(monthlyMap.values())
    .map(item => ({
      date: item.date,
      value: item.value
    }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

/**
 * Calculate percentage change from previous period
 * @param {Array} data - Array of {date, value} objects
 * @returns {Array} Data with percentage change values added
 */
function calculatePercentageChange(data) {
  if (!data || data.length === 0) return [];

  return data.map((item, index) => {
    let percentageChange = 0;

    if (index > 0) {
      const current = parseFloat(item.value) || 0;
      const previous = parseFloat(data[index - 1].value) || 0;

      if (previous !== 0) {
        percentageChange = ((current - previous) / previous) * 100;
        // Clamp between -100% and +150%
        percentageChange = Math.max(-100, Math.min(150, percentageChange));
      }
    }

    return {
      ...item,
      actualValue: item.value,
      cumulativeValue: percentageChange
    };
  });
}

/**
 * Transform trend data for combined chart display
 * @param {Array} rawData - Raw data from API
 * @param {string} viewMode - 'weekly' or 'monthly'
 * @returns {Array} Transformed data ready for ComposedChart
 */
export function transformTrendData(rawData, viewMode = 'weekly') {
  if (!rawData || rawData.length === 0) return [];

  // Fill missing weeks first
  const filledData = fillMissingWeeks(rawData);

  // Aggregate to monthly if needed
  const aggregatedData = viewMode === 'monthly'
    ? aggregateByMonth(filledData)
    : filledData;

  // Calculate percentage changes
  const dataWithCumulative = calculatePercentageChange(aggregatedData);

  // Format dates for display
  return dataWithCumulative.map(item => ({
    ...item,
    displayDate: formatDateForDisplay(item.date, viewMode)
  }));
}

/**
 * Format date for display based on view mode
 * @param {string} dateStr - Date string
 * @param {string} viewMode - 'weekly' or 'monthly'
 * @returns {string} Formatted date string
 */
function formatDateForDisplay(dateStr, viewMode) {
  const date = new Date(dateStr);

  if (viewMode === 'monthly') {
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}

/**
 * Get appropriate Y-axis scale for dual axes
 * @param {Array} data - Data with actualValue and cumulativeValue
 * @returns {Object} Scale configuration for left and right Y-axes
 */
export function getYAxisScales(data) {
  if (!data || data.length === 0) {
    return {
      leftAxis: { domain: [0, 100] },
      rightAxis: { domain: [-100, 150] }
    };
  }

  const actualValues = data.map(d => d.actualValue || 0);
  const actualMax = Math.max(...actualValues);

  // Add some padding to the max values for left axis
  const actualDomain = [0, Math.ceil(actualMax * 1.1)];

  // Fixed domain for percentage change: -100% to +150%
  const percentageDomain = [-100, 150];

  return {
    leftAxis: { domain: actualDomain },
    rightAxis: { domain: percentageDomain }
  };
}