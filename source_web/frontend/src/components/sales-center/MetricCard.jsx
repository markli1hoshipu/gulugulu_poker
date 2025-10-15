import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { TrendingUp, DollarSign, Users, Target, AlertCircle } from 'lucide-react';

const MetricCard = ({
  title,
  value,
  icon = 'TrendingUp',
  color = 'blue',
  formatType = 'number',
  loading = false,
  error = null
}) => {
  // Icon mapping
  const IconComponent = {
    TrendingUp,
    DollarSign,
    Users,
    Target
  }[icon] || TrendingUp;

  // Color class mapping
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-50',
    green: 'text-green-600 bg-green-50',
    purple: 'text-purple-600 bg-purple-50',
    orange: 'text-orange-600 bg-orange-50',
    red: 'text-red-600 bg-red-50'
  };

  // Format value based on type
  const formatValue = (val, type) => {
    if (val === null || val === undefined || isNaN(val)) return 'N/A';

    const numVal = Number(val);

    switch (type) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(numVal);

      case 'percentage':
        return `${numVal.toFixed(1)}%`;

      case 'number':
      default:
        if (numVal >= 1000000) {
          return `${(numVal / 1000000).toFixed(1)}M`;
        } else if (numVal >= 1000) {
          return `${(numVal / 1000).toFixed(1)}K`;
        }
        return numVal.toLocaleString();
    }
  };

  // Loading state
  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <div className={`h-4 w-4 rounded ${colorClasses[color] || colorClasses.blue}`}>
            <div className="animate-pulse bg-current opacity-20 h-full w-full rounded"></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-24 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-16"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="h-full border-red-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <AlertCircle className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">Error</div>
          <p className="text-xs text-red-500 mt-1">Failed to load</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={`p-2 rounded-lg ${colorClasses[color] || colorClasses.blue}`}>
          <IconComponent className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {formatValue(value, formatType)}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Real-time data
        </p>
      </CardContent>
    </Card>
  );
};

// PropTypes-like validation for better development experience
MetricCard.propTypes = {
  title: (props, propName, componentName) => {
    if (typeof props[propName] !== 'string') {
      return new Error(`Invalid prop \`${propName}\` of type \`${typeof props[propName]}\` supplied to \`${componentName}\`, expected \`string\`.`);
    }
  },
  value: (props, propName, componentName) => {
    const val = props[propName];
    if (val !== null && val !== undefined && isNaN(Number(val))) {
      return new Error(`Invalid prop \`${propName}\` supplied to \`${componentName}\`, expected a number or null/undefined.`);
    }
  },
  icon: (props, propName, componentName) => {
    const validIcons = ['TrendingUp', 'DollarSign', 'Users', 'Target'];
    if (props[propName] && !validIcons.includes(props[propName])) {
      return new Error(`Invalid prop \`${propName}\` of value \`${props[propName]}\` supplied to \`${componentName}\`, expected one of: ${validIcons.join(', ')}.`);
    }
  },
  color: (props, propName, componentName) => {
    const validColors = ['blue', 'green', 'purple', 'orange', 'red'];
    if (props[propName] && !validColors.includes(props[propName])) {
      return new Error(`Invalid prop \`${propName}\` of value \`${props[propName]}\` supplied to \`${componentName}\`, expected one of: ${validColors.join(', ')}.`);
    }
  },
  formatType: (props, propName, componentName) => {
    const validTypes = ['currency', 'number', 'percentage'];
    if (props[propName] && !validTypes.includes(props[propName])) {
      return new Error(`Invalid prop \`${propName}\` of value \`${props[propName]}\` supplied to \`${componentName}\`, expected one of: ${validTypes.join(', ')}.`);
    }
  },
  loading: (props, propName, componentName) => {
    if (typeof props[propName] !== 'boolean') {
      return new Error(`Invalid prop \`${propName}\` of type \`${typeof props[propName]}\` supplied to \`${componentName}\`, expected \`boolean\`.`);
    }
  },
  error: (props, propName, componentName) => {
    const val = props[propName];
    if (val !== null && typeof val !== 'string') {
      return new Error(`Invalid prop \`${propName}\` of type \`${typeof val}\` supplied to \`${componentName}\`, expected \`string\` or \`null\`.`);
    }
  }
};

export default React.memo(MetricCard);