import React, { useState, useRef, useEffect } from 'react';
import { Filter, X, ChevronDown, Plus, Trash2 } from 'lucide-react';

const FilterDropdown = ({ 
  columns, 
  onApplyFilters, 
  activeFilters = {},
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filterConditions, setFilterConditions] = useState(() => {
    // Convert existing activeFilters to new format
    const conditions = [];
    Object.keys(activeFilters).forEach((columnId, index) => {
      if (activeFilters[columnId]?.condition) {
        conditions.push({
          id: `filter-${index}`,
          column: columnId,
          condition: activeFilters[columnId].condition,
          value: activeFilters[columnId].value || ''
        });
      }
    });
    return conditions.length > 0 ? conditions : [{
      id: `filter-${Date.now()}`,
      column: '',
      condition: '',
      value: ''
    }];
  });
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

  const addFilterCondition = () => {
    setFilterConditions(prev => [...prev, {
      id: `filter-${Date.now()}`,
      column: '',
      condition: '',
      value: ''
    }]);
  };

  const removeFilterCondition = (id) => {
    setFilterConditions(prev => {
      const newConditions = prev.filter(f => f.id !== id);
      // Always keep at least one filter row
      return newConditions.length > 0 ? newConditions : [{
        id: `filter-${Date.now()}`,
        column: '',
        condition: '',
        value: ''
      }];
    });
  };

  const updateFilterCondition = (id, field, value) => {
    setFilterConditions(prev => prev.map(filter => {
      if (filter.id === id) {
        const updated = { ...filter, [field]: value };
        // Reset value when condition changes to certain types
        if (field === 'condition' && ['is_empty', 'not_empty'].includes(value)) {
          updated.value = '';
        }
        // Reset condition and value when column changes
        if (field === 'column') {
          updated.condition = '';
          updated.value = '';
        }
        return updated;
      }
      return filter;
    }));
  };

  const handleApply = () => {
    // Convert filter conditions to the format expected by parent
    const filters = {};
    filterConditions.forEach(fc => {
      if (fc.column && fc.condition) {
        filters[fc.column] = {
          condition: fc.condition,
          value: fc.value
        };
      }
    });
    onApplyFilters(filters);
    setIsOpen(false);
  };

  const handleClear = () => {
    setFilterConditions([{
      id: `filter-${Date.now()}`,
      column: '',
      condition: '',
      value: ''
    }]);
    onApplyFilters({});
  };

  const activeFilterCount = filterConditions.filter(fc => fc.column && fc.condition).length;

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

  const renderValueInput = (filter) => {
    const column = columns.find(c => c.id === filter.column);
    if (!column || !filter.condition) return null;

    const needsValue = !['is_empty', 'not_empty'].includes(filter.condition);
    if (!needsValue) return null;

    if (filter.condition === 'between') {
      const [min, max] = (filter.value || '').split(',');
      return (
        <div className="flex gap-2 flex-1">
          <input
            type={column.type === 'currency' || column.type === 'number' ? 'number' : 'text'}
            placeholder="Min"
            value={min || ''}
            onChange={(e) => {
              const newValue = `${e.target.value},${max || ''}`;
              updateFilterCondition(filter.id, 'value', newValue);
            }}
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type={column.type === 'currency' || column.type === 'number' ? 'number' : 'text'}
            placeholder="Max"
            value={max || ''}
            onChange={(e) => {
              const newValue = `${min || ''},${e.target.value}`;
              updateFilterCondition(filter.id, 'value', newValue);
            }}
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      );
    }

    if (column.type === 'select' && ['in', 'not_in'].includes(filter.condition)) {
      const selectedValues = (filter.value || '').split(',').filter(v => v);
      return (
        <div className="flex-1">
          <div className="relative">
            <select
              multiple
              value={selectedValues}
              onChange={(e) => {
                const values = Array.from(e.target.selectedOptions, option => option.value);
                updateFilterCondition(filter.id, 'value', values.join(','));
              }}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              size="3"
            >
              {column.options?.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-white to-transparent h-4 pointer-events-none"></div>
          </div>
          {selectedValues.length > 0 && (
            <div className="mt-1 text-xs text-gray-500">
              {selectedValues.length} selected
            </div>
          )}
        </div>
      );
    }

    if (column.type === 'select' && ['equals', 'not_equals'].includes(filter.condition)) {
      return (
        <select
          value={filter.value || ''}
          onChange={(e) => updateFilterCondition(filter.id, 'value', e.target.value)}
          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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

    if (['last_days', 'next_days'].includes(filter.condition)) {
      return (
        <input
          type="number"
          placeholder="Number of days"
          value={filter.value || ''}
          onChange={(e) => updateFilterCondition(filter.id, 'value', e.target.value)}
          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          min="1"
        />
      );
    }

    return (
      <input
        type={column.type === 'date' ? 'date' : column.type === 'currency' || column.type === 'number' ? 'number' : 'text'}
        placeholder="Enter value..."
        value={filter.value || ''}
        onChange={(e) => updateFilterCondition(filter.id, 'value', e.target.value)}
        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        step={column.type === 'currency' ? '0.01' : undefined}
      />
    );
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center justify-center font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none active:scale-95 hover:text-accent-foreground font-inter text-sm h-10 px-3 gap-2 rounded-lg transition-colors duration-200 border ${
          activeFilterCount > 0
            ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-300 shadow-sm' 
            : 'text-gray-700 hover:bg-gray-100 border-gray-300'
        }`}
      >
        <Filter className="w-4 h-4" />
        <span>Filters</span>
        {activeFilterCount > 0 && (
          <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
            {activeFilterCount}
          </span>
        )}
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-2xl border border-gray-200 z-50" style={{ minWidth: '800px' }}>
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Filter Builder</h3>
                <p className="text-xs text-gray-500 mt-0.5">Add conditions to filter your data</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="p-4 max-h-96 overflow-y-auto">
            <div className="space-y-3">
              {filterConditions.map((filter, index) => {
                const column = columns.find(c => c.id === filter.column);
                return (
                  <div key={filter.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-3">
                      {/* All fields in one row */}
                      <select
                        value={filter.column}
                        onChange={(e) => updateFilterCondition(filter.id, 'column', e.target.value)}
                        className="w-48 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select column...</option>
                        {columns.map(col => (
                          <option key={col.id} value={col.id}>
                            {col.label}
                          </option>
                        ))}
                      </select>

                      {filter.column && (
                        <select
                          value={filter.condition}
                          onChange={(e) => updateFilterCondition(filter.id, 'condition', e.target.value)}
                          className="w-40 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Condition...</option>
                          {getConditionOptions(column?.type).map(opt => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      )}

                      {filter.column && filter.condition && !['is_empty', 'not_empty'].includes(filter.condition) && (
                        <div className="flex-1">
                          {renderValueInput(filter)}
                        </div>
                      )}

                      {/* Spacer to push delete button to the right */}
                      <div className="flex-1"></div>

                      {/* Delete Button */}
                      {filterConditions.length > 1 && (
                        <button
                          onClick={() => removeFilterCondition(filter.id)}
                          className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                          title="Remove filter"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add Filter Button */}
            <button
              onClick={addFilterCondition}
              className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 border border-dashed border-blue-300 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Filter Condition
            </button>
          </div>

          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between bg-gray-50 rounded-b-lg">
            <button
              onClick={handleClear}
              className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              Clear all
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApply}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm"
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