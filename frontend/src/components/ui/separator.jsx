import React from 'react';

export const Separator = ({ 
  orientation = 'horizontal',
  className = '',
  ...props 
}) => {
  const orientationStyles = orientation === 'horizontal' 
    ? 'h-[1px] w-full' 
    : 'h-full w-[1px]';

  return (
    <div
      className={`bg-gray-200 ${orientationStyles} ${className}`}
      {...props}
    />
  );
};