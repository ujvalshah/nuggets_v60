
import React, { useState } from 'react';
import { Outlet, useOutletContext } from 'react-router-dom';
import { AdminSidebar } from '../components/AdminSidebar';
import { AdminTopbar } from '../components/AdminTopbar';

export interface AdminHeaderContext {
  setPageHeader: (title: string, description?: string, actions?: React.ReactNode) => void;
}

export const useAdminHeader = () => useOutletContext<AdminHeaderContext>();

export const AdminLayout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [headerState, setHeaderState] = useState({
    title: '',
    description: '',
    actions: null as React.ReactNode | null
  });

  const setPageHeader = (title: string, description: string = '', actions: React.ReactNode = null) => {
    // Prevent infinite loops by checking equality (basic shallow check)
    setHeaderState(prev => {
      if (prev.title === title && prev.description === description && prev.actions === actions) return prev;
      return { title, description, actions };
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex font-sans">
      <AdminSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        <AdminTopbar 
          onMenuClick={() => setIsSidebarOpen(true)} 
          title={headerState.title}
          description={headerState.description}
          actions={headerState.actions}
        />
        
        <main className="flex-1 p-4 lg:p-8 overflow-x-hidden">
          <div className="max-w-7xl mx-auto">
            <Outlet context={{ setPageHeader }} />
          </div>
        </main>
      </div>
    </div>
  );
};
