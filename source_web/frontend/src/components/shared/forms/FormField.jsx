import React from 'react';
import { Label } from '../../ui/label';
import { Input } from '../../ui/input';
import { cn } from '../../../lib/utils';

const FormField = React.forwardRef(({
  label,
  id,
  error,
  required = false,
  className,
  labelClassName,
  inputClassName,
  children,
  ...props
}, ref) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  
  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label 
          htmlFor={inputId}
          className={cn(
            'text-sm font-medium text-gray-700',
            { 'after:content-["*"] after:ml-1 after:text-red-500': required },
            labelClassName
          )}
        >
          {label}
        </Label>
      )}
      
      {children || (
        <Input
          ref={ref}
          id={inputId}
          className={cn(
            {
              'border-red-300 focus:border-red-500 focus:ring-red-500': error
            },
            inputClassName
          )}
          {...props}
        />
      )}
      
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
});

FormField.displayName = 'FormField';

export default FormField;