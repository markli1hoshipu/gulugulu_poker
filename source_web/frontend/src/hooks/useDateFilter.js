import { useState, useCallback } from 'react';
import { subMonths, subYears, startOfDay, endOfDay } from 'date-fns';

const STORAGE_KEY = 'sales_trends_date_filter';

/**
 * Custom hook for managing date range filter with session storage
 * Persists filter across table changes (Option A)
 */
export const useDateFilter = () => {
  // Initialize from sessionStorage or default to null (All Time)
  const [dateFilter, setDateFilterState] = useState(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          startDate: new Date(parsed.startDate),
          endDate: new Date(parsed.endDate),
          label: parsed.label || 'Custom Range'
        };
      }
    } catch (error) {
      console.warn('Failed to restore date filter from sessionStorage:', error);
    }
    return null; // Default to "All Time" (no filter)
  });

  // Update filter and save to sessionStorage
  const setDateFilter = useCallback((filter) => {
    if (filter === null) {
      // Clear filter
      sessionStorage.removeItem(STORAGE_KEY);
      setDateFilterState(null);
    } else {
      // Save filter
      const filterToSave = {
        startDate: filter.startDate.toISOString(),
        endDate: filter.endDate.toISOString(),
        label: filter.label
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(filterToSave));
      setDateFilterState(filter);
    }
  }, []);

  // Clear filter (set to All Time)
  const clearFilter = useCallback(() => {
    setDateFilter(null);
  }, [setDateFilter]);

  // Set preset ranges
  const setPreset = useCallback((preset) => {
    const now = endOfDay(new Date());
    let start;
    let label;

    switch (preset) {
      case 'last_3_months':
        start = startOfDay(subMonths(now, 3));
        label = 'Last 3 Months';
        break;
      case 'last_6_months':
        start = startOfDay(subMonths(now, 6));
        label = 'Last 6 Months';
        break;
      case 'last_year':
        start = startOfDay(subYears(now, 1));
        label = 'Last Year';
        break;
      case 'all_time':
        clearFilter();
        return;
      default:
        return;
    }

    setDateFilter({
      startDate: start,
      endDate: now,
      label
    });
  }, [setDateFilter, clearFilter]);

  // Check if filter is active
  const isFilterActive = dateFilter !== null;

  // Get filter summary text
  const getFilterSummary = useCallback(() => {
    if (!dateFilter) return 'All Time';
    return dateFilter.label || 'Custom Range';
  }, [dateFilter]);

  return {
    dateFilter,
    setDateFilter,
    clearFilter,
    setPreset,
    isFilterActive,
    getFilterSummary
  };
};
