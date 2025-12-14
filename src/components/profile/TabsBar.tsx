import React from 'react';

interface TabOption {
  id: string;
  label: string;
  count?: number;
}

interface TabsBarProps {
  tabs: TabOption[];
  activeTab: string;
  onTabChange: (id: string) => void;
}

export const TabsBar: React.FC<TabsBarProps> = ({ tabs, activeTab, onTabChange }) => {
  return (
    <div className="inline-flex items-center bg-white/70 backdrop-blur-sm border border-slate-200/60 rounded-xl px-4 py-2 space-x-6">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              relative text-sm font-medium transition-colors duration-200
              ${isActive ? 'text-slate-900' : 'text-slate-500 hover:text-slate-900'}
            `}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className={`ml-1.5 text-xs ${isActive ? 'text-slate-500' : 'text-slate-400'}`}>
                {tab.count}
              </span>
            )}
            
            {/* Active Indicator */}
            {isActive && (
              <span className="absolute -bottom-[9px] left-0 right-0 h-[2px] bg-slate-800 rounded-t-full" />
            )}
          </button>
        );
      })}
    </div>
  );
};
