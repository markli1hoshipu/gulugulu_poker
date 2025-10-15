import React, { useState, useRef, useEffect } from 'react';
import { Filter, X, ChevronDown } from 'lucide-react';

const FilterDropdown = ({ 
  columns, 
  onApplyFilters, 
  activeFilters = {},
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState(activeFilters);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFilterChange = (columnId, condition, value) => {
    setFilters(prev => ({
      ...prev,
      [columnId]: { condition, value }
    }));
  };

  const handleApply = () => {
    onApplyFilters(filters);
    setIsOpen(false);
  };

  const handleClear = () => {
    setFilters({});
    onApplyFilters({});
  };

  const hasActiveFilters = Object.keys(filters).some(key => filters[key]?.value);

  const getConditionOptions = (type) => {
    switch (type) {
      case 'text':
      case 'email':
      case 'tel':
        return [
          { value: 'contains', label: 'Contains' },
          { value: 'equals', label: 'Equals' },
          { value: 'starts_with', label: 'Starts with' },
          { value: 'ends_with', label: 'Ends with' },
          { value: 'not_contains', label: 'Does not contain' },
          { value: 'is_empty', label: 'Is empty' },
          { value: 'not_empty', label: 'Is not empty' }
        ];
      case 'number':
      case 'currency':
        return [
          { value: 'equals', label: 'Equals' },
          { value: 'not_equals', label: 'Not equals' },
          { value: 'greater_than', label: 'Greater than' },
          { value: 'less_than', label: 'Less than' },
          { value: 'greater_equal', label: 'Greater or equal' },
          { value: 'less_equal', label: 'Less or equal' },
          { value: 'between', label: 'Between' },
          { value: 'is_empty', label: 'Is empty' },
          { value: 'not_empty', label: 'Is not empty' }
        ];
      case 'date':
      case 'datetime':
        return [
          { value: 'equals', label: 'Equals' },
          { value: 'before', label: 'Before' },
          { value: 'after', label: 'After' },
          { value: 'between', label: 'Between' },
          { value: 'last_days', label: 'Last X days' },
          { value: 'next_days', label: 'Next X days' },
          { value: 'is_empty', label: 'Is empty' },
          { value: 'not_empty', label: 'Is not empty' }
        ];
      case 'select':
        return [
          { value: 'equals', label: 'Equals' },
          { value: 'not_equals', label: 'Not equals' },
          { value: 'in', label: 'Is one of' },
          { value: 'not_in', label: 'Is not one of' },
          { value: 'is_empty', label: 'Is empty' },
          { value: 'not_empty', label: 'Is not empty' }
        ];
      default:
        return [
          { value: 'contains', label: 'Contains' },
          { value: 'equals', label: 'Equals' }
        ];
    }
  };

  const renderValueInput = (column, condition, value) => {
    const needsValue = condition && !['is_empty', 'not_empty'].includes(condition);
    
    if (!needsValue) return null;

    if (condition === 'between') {
      const [min, max] = (value || '').split(',');
      return (
        <div className="flex gap-2">
          <input
            type={column.type === 'currency' || column.type === 'number' ? 'number' : 'text'}
            placeholder="Min"
            value={min || ''}
            onChange={(e) => {
              const newValue = `${e.target.value},${max || ''}`;
              handleFilterChange(column.id, condition, newValue);
            }}
            className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <input
            type={column.type === 'currency' || column.type === 'number' ? 'number' : 'text'}
            placeholder="Max"
            value={max || ''}
            onChange={(e) => {
              const newValue = `${min || ''},${e.target.value}`;
              handleFilterChange(column.id, condition, newValue);
            }}
            className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      );
    }

    if (column.type === 'select' && ['in', 'not_in'].includes(condition)) {
      return (
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {column.options?.map(option => (
            <label key={option.value} className="flex items-center gap-2 cursor-pointer p-1 hover:bg-gray-50 rounded">
              <input
                type="checkbox"
                checked={(value || '').split(',').includes(option.value)}
                onChange={(e) => {
                  const values = (value || '').split(',').filter(v => v);
                  if (e.target.checked) {
                    values.push(option.value);
                  } else {
                    const index = values.indexOf(option.value);
                    if (index > -1) values.splice(index, 1);
                  }
                  handleFilterChange(column.id, condition, values.join(','));
                }}
                className="text-blue-600"
              />
              <span className="text-sm">{option.label}</span>
            </label>
          ))}
        </div>
      );
    }

    if (column.type === 'select' && ['equals', 'not_equals'].includes(condition)) {
      return (
        <select
          value={value || ''}
          onChange={(e) => handleFilterChange(column.id, condition, e.target.value)}
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Select...</option>
          {column.options?.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }

    if (['last_days', 'next_days'].includes(condition)) {
      return (
        <input
          type="number"
          placeholder="Number of days"
          value={value || ''}
          onChange={(e) => handleFilterChange(column.id, condition, e.target.value)}
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          min="1"
        />
      );
    }

    return (
      <input
        type={column.type === 'date' ? 'date' : column.type === 'currency' || column.type === 'number' ? 'number' : 'text'}
        placeholder={`Filter ${column.label}...`}
        value={value || ''}
        onChange={(e) => handleFilterChange(column.id, condition, e.target.value)}
        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        step={column.type === 'currency' ? '0.01' : undefined}
      />
    );
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
          hasActiveFilters 
            ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200' 
            : 'text-gray-700 hover:bg-gray-100 border border-gray-300'
        }`}
      >
        <Filter className="w-4 h-4" />
        <span>Filters</span>
        {hasActiveFilters && (
          <span className="bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full">
            {Object.keys(filters).filter(key => filters[key]?.value).length}
          </span>
        )}
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Column Filters</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="p-4 max-h-96 overflow-y-auto">
            <div className="space-y-4">
              {columns.map(column => {
                const filter = filters[column.id] || {};
                return (
                  <div key={column.id} className="space-y-2">
                    <label className="text-xs font-medium text-gray-700">
                      {column.label}
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={filter.condition || ''}
                        onChange={(e) => handleFilterChange(column.id, e.target.value, filter.value)}
                        className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">No filter</option>
                        {getConditionOptions(column.type).map(opt => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    {filter.condition && renderValueInput(column, filter.condition, filter.value)}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-4 border-t border-gray-200 flex items-center justify-between">
            <button
              onClick={handleClear}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Clear all
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => setIsOpen(false)}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleApply}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterDropdown;