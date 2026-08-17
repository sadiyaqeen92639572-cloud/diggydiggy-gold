'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface TabsContextType {
  value: string;
  onValueChange?: (value: string) => void;
  setValue: (value: string) => void;
}

const TabsContext = createContext<TabsContextType | undefined>(undefined);

export function Tabs({
  defaultValue,
  value: controlledValue,
  onValueChange,
  children,
  className = '',
}: {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  const [localValue, setLocalValue] = useState(controlledValue || defaultValue || '');
  const [prevControlled, setPrevControlled] = useState(controlledValue);

  if (controlledValue !== prevControlled) {
    setPrevControlled(controlledValue);
    if (controlledValue !== undefined) {
      setLocalValue(controlledValue);
    }
  }

  const setValue = (newValue: string) => {
    if (controlledValue === undefined) {
      setLocalValue(newValue);
    }
    if (onValueChange) {
      onValueChange(newValue);
    }
  };

  return (
    <TabsContext.Provider value={{ value: localValue, onValueChange, setValue }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-1.5 bg-white p-1.5 brutal-border brutal-shadow ${className}`}>
      {children}
    </div>
  );
}

export function TabsTrigger({
  value,
  children,
  className = '',
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
}) {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabsTrigger must be used inside a Tabs component');

  const isActive = context.value === value;

  return (
    <button
      type="button"
      onClick={() => context.setValue(value)}
      className={`flex-1 text-center py-2 text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer select-none focus:outline-none border-2 ${
        isActive
          ? 'bg-black text-white border-black'
          : 'bg-white text-black border-transparent hover:bg-slate-100 hover:text-black'
      } ${className}`}
    >
      {children}
    </button>
  );
}

export function TabsContent({
  value,
  children,
  className = '',
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
}) {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabsContent must be used inside a Tabs component');

  const isActive = context.value === value;

  if (!isActive) return null;

  return <div className={`focus:outline-none ${className}`}>{children}</div>;
}
