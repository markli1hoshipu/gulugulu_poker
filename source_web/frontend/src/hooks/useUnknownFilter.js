import { useState, useCallback } from 'react';

const STORAGE_KEY = 'sales_center_show_unknown';

/**
 * Custom hook for managing unknown entity filter with session storage
 * Default: Hide unknown entities (showUnknown: false)
 */
export const useUnknownFilter = () => {
  // Initialize from sessionStorage or default to false (hide unknown)
  const [showUnknown, setShowUnknownState] = useState(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      return saved === 'true';
    } catch (error) {
      console.warn('Failed to restore unknown filter setting:', error);
      return false;
    }
  });

  // Update state and save to sessionStorage
  const setShowUnknown = useCallback((show) => {
    sessionStorage.setItem(STORAGE_KEY, String(show));
    setShowUnknownState(show);
  }, []);

  // Get label for toolbar
  const getFilterLabel = useCallback(() => {
    return showUnknown ? 'Unknown: Shown' : 'Unknown: Hidden';
  }, [showUnknown]);

  return {
    showUnknown,
    setShowUnknown,
    getFilterLabel,
  };
};
