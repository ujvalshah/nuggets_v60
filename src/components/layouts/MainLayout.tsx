
import React from 'react';

interface MainLayoutProps {
  children: React.ReactNode;
}

/**
 * ARCHITECTURAL INVARIANT: MainLayout Structure
 * 
 * This component enforces the critical layout architecture:
 * 
 * 1. Header MUST be rendered OUTSIDE this layout (in App.tsx)
 *    - Header is fixed positioned and must NOT be a child of flex/grid containers
 *    - Header must NEVER be conditionally rendered or wrapped by stateful containers
 * 
 * 2. This layout provides ONLY the page content container
 *    - Uses padding-top to account for fixed header (pt-14 lg:pt-16)
 *    - Does NOT wrap Header component
 * 
 * 3. Scroll ownership:
 *    - Body/document is the scroll container
 *    - Header is outside scroll container (fixed position)
 *    - Page content scrolls independently
 * 
 * 4. Width constraints:
 *    - Applied at page level, not layout level
 *    - Ensures consistency across routes
 * 
 * VIOLATION WARNING:
 * If Header is moved inside MainLayout or wrapped by flex/grid containers,
 * layout instability WILL occur regardless of CSS fixes.
 */
export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200 font-sans selection:bg-primary-500/30">
      {/* 
        Content container with header offset padding.
        Header is rendered OUTSIDE this container in App.tsx.
        This ensures Header is never affected by flex/grid calculations.
      */}
      <div className="pt-14 lg:pt-16">
        {children}
      </div>
    </div>
  );
};
