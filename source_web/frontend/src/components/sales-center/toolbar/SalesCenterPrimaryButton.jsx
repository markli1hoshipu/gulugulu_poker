import React from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { Button } from '../../ui/button';

// Theme color - Sales Center uses purple theme
const themeColors = {
  purple: {
    primary: 'bg-purple-600 hover:bg-purple-700 text-white',
  }
};

/**
 * SalesCenterPrimaryButton Component
 *
 * Simplified primary action button for Sales Center toolbar.
 * Unlike PrimaryActionGroup, this has no dropdown or action icons - just a simple button.
 *
 * @param {Object} props
 * @param {string} props.label - Label for the button
 * @param {Function} props.onClick - Click handler
 * @param {string} [props.themeColor='purple'] - Theme color
 * @param {boolean} [props.disabled=false] - Whether the button is disabled
 * @param {boolean} [props.loading=false] - Loading state
 */
const SalesCenterPrimaryButton = ({
  label = 'New Item',
  onClick,
  themeColor = 'purple',
  disabled = false,
  loading = false,
  ...props
}) => {
  const theme = themeColors[themeColor] || themeColors.purple;

  const handleClick = () => {
    if (disabled || loading) return;
    onClick?.();
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      {...props}
    >
      <Button
        onClick={handleClick}
        disabled={disabled || loading}
        className={`
          ${theme.primary}
          px-4 py-2 text-sm font-medium rounded-lg
          transition-all duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
        aria-label={label}
      >
        <Plus className="w-4 h-4 mr-2" />
        {loading ? 'Loading...' : label}
      </Button>
    </motion.div>
  );
};

export default SalesCenterPrimaryButton;
