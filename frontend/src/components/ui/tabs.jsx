import React, { createContext, useContext, useState } from 'react';

const TabsContext = createContext();

export const Tabs = ({ defaultValue, children, className = '' }) => {
  const [activeTab, setActiveTab] = useState(defaultValue);

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={className}>
        {children}
      </div>
    </TabsContext.Provider>
  );
};

export const TabsList = ({ children, className = '' }) => {
  return (
    <div className={`flex items-center justify-start border-b ${className}`}>
      {children}
    </div>
  );
};

export const TabsTrigger = ({ value, children, className = '' }) => {
  const { activeTab, setActiveTab } = useContext(TabsContext);
  const isActive = activeTab === value;

  return (
    <button
      onClick={() => setActiveTab(value)}
      className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
        isActive 
          ? 'text-blue-600 border-blue-600' 
          : 'text-gray-500 border-transparent hover:text-gray-700'
      } ${className}`}
    >
      {children}
    </button>
  );
};

export const TabsContent = ({ value, children, className = '' }) => {
  const { activeTab } = useContext(TabsContext);

  if (activeTab !== value) return null;

  return (
    <div className={`mt-4 ${className}`}>
      {children}
    </div>
  );
};