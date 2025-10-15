import React from 'react';
import { motion } from 'framer-motion';

/**
 * SalesCenterToolbarContainer Component
 *
 * Layout container for the Sales Center toolbar with left/right sections.
 * Isolated from common toolbar to prevent dependencies.
 *
 * @param {Object} props
 * @param {React.ReactNode} [props.leftSection] - Primary action button
 * @param {React.ReactNode} [props.rightSection] - Filter groups
 * @param {string} [props.className] - Additional CSS classes
 */
const SalesCenterToolbarContainer = ({
  leftSection,
  rightSection,
  className = '',
  ...props
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`px-6 py-3 bg-white ${className}`}
      role="toolbar"
      aria-label="Sales Center actions and filters"
      {...props}
    >
      <div className="flex items-center gap-4">
        {/* Left Section - Primary Action */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {leftSection}
        </div>

        {/* Filters Section */}
        <div className="flex items-center gap-2">
          {rightSection}
        </div>
      </div>
    </motion.div>
  );
};

export default SalesCenterToolbarContainer;
