import React from 'react';

export const Button = ({ 
  children, 
  onClick, 
  variant = 'default', 
  size = 'default',
  disabled = false,
  className = '',
  ...props 
}) => {
  const baseStyles = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variants = {
    default: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
    ghost: 'hover:bg-gray-100 text-gray-700',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
  };
  
  const sizes = {
    default: 'px-4 py-2 text-sm',
    sm: 'px-3 py-1.5 text-xs',
    lg: 'px-6 py-3 text-base'
  };
  
  const disabledStyles = disabled ? 'opacity-50 cursor-not-allowed' : '';
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${disabledStyles} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};