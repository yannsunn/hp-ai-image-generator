import React from 'react';

export const Label = ({ 
  children,
  htmlFor,
  className = '',
  ...props 
}) => {
  return (
    <label
      htmlFor={htmlFor}
      className={`text-sm font-medium text-gray-700 ${className}`}
      {...props}
    >
      {children}
    </label>
  );
};