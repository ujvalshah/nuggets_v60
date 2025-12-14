
import React from 'react';
import { LegalFooter } from '../LegalFooter';

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200 font-sans selection:bg-primary-500/30 flex flex-col">
      <div className="flex-1">
        {children}
      </div>
      <LegalFooter />
    </div>
  );
};
