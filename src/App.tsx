
import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { BackToTopButton } from '@/components/UI/BackToTopButton';
import { ToastContainer } from '@/components/UI/Toast';
import { ToastProvider } from '@/context/ToastContext';
import { AuthProvider } from '@/context/AuthContext';
import { MainLayout } from '@/components/layouts/MainLayout';
import { SortOrder } from '@/types';
import { Loader2 } from 'lucide-react';
import { CreateNuggetModal } from '@/components/CreateNuggetModal';
import { useAuth } from '@/hooks/useAuth';
import { AuthModal } from '@/components/auth/AuthModal';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { LegalPageRenderer } from '@/pages/LegalPageRenderer';
import { ErrorBoundary } from '@/components/UI/ErrorBoundary';

// Lazy Load Pages
const HomePage = lazy(() => import('@/pages/HomePage').then(module => ({ default: module.HomePage })));
const CollectionsPage = lazy(() => import('@/pages/CollectionsPage').then(module => ({ default: module.CollectionsPage })));
const CollectionDetailPage = lazy(() => import('@/pages/CollectionDetailPage').then(module => ({ default: module.CollectionDetailPage })));
const MySpacePage = lazy(() => import('@/pages/MySpacePage').then(module => ({ default: module.MySpacePage })));
const AccountSettingsPage = lazy(() => import('@/pages/AccountSettingsPage').then(module => ({ default: module.AccountSettingsPage })));
const AdminPanelPage = lazy(() => import('@/pages/AdminPanelPage').then(module => ({ default: module.AdminPanelPage })));
const VerifyEmailPage = lazy(() => import('@/pages/VerifyEmailPage').then(module => ({ default: module.VerifyEmailPage })));
const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage').then(module => ({ default: module.ResetPasswordPage })));
const BulkCreateNuggetsPage = lazy(() => import('@/pages/BulkCreateNuggetsPage').then(module => ({ default: module.BulkCreateNuggetsPage })));

const AppContent: React.FC = () => {
  const [isDark, setIsDark] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'feed' | 'masonry' | 'utility'>('grid');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('latest');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Use Auth hook for user context
  const { currentUserId } = useAuth();

  useEffect(() => {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) setIsDark(true);
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    if (isDark) html.classList.add('dark');
    else html.classList.remove('dark');
  }, [isDark]);

  return (
    <>
      {/* 
        ARCHITECTURAL INVARIANT: Header Rendering
        Header MUST be rendered OUTSIDE MainLayout to prevent layout instability.
        Header is fixed positioned and must NOT be a child of flex/grid containers.
        This ensures Header position is never affected by:
        - Content loading states
        - Empty states
        - Filter changes
        - Route transitions
        - Flex/grid recalculations
      */}
      <Header 
        isDark={isDark} 
        toggleTheme={() => setIsDark(!isDark)} 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        viewMode={viewMode}
        setViewMode={setViewMode}
        selectedCategories={selectedCategories}
        setSelectedCategories={setSelectedCategories}
        selectedTag={selectedTag}
        setSelectedTag={setSelectedTag}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        onCreateNugget={() => setIsCreateOpen(true)}
        currentUserId={currentUserId}
      />

      <MainLayout>
        {/* 
          Suspense fallback must NOT use min-h-screen to prevent layout shifts.
          It should only provide visual feedback without affecting layout structure.
        */}
        <Suspense fallback={<div className="flex items-center justify-center py-32"><Loader2 className="animate-spin w-8 h-8 text-primary-500" /></div>}>
          <Routes>
          <Route path="/" element={<HomePage searchQuery={searchQuery} viewMode={viewMode} setViewMode={setViewMode} selectedCategories={selectedCategories} setSelectedCategories={setSelectedCategories} selectedTag={selectedTag} setSelectedTag={setSelectedTag} sortOrder={sortOrder} />} />
          
          <Route path="/collections" element={<CollectionsPage />} />
          <Route path="/collections/:collectionId" element={<CollectionDetailPage />} />
          
          {/* My Space (Current User) - Protected */}
          <Route path="/myspace" element={
            <ProtectedRoute>
              <Navigate to={`/profile/${currentUserId}`} replace />
            </ProtectedRoute>
          } />
          
          {/* Profile Page (Handles both My Space and Public Profiles) */}
          <Route path="/profile/:userId" element={<MySpacePage currentUserId={currentUserId} />} />
          
          <Route path="/account" element={
            <ProtectedRoute>
              <AccountSettingsPage userId={currentUserId} />
            </ProtectedRoute>
          } />

          {/* Admin Route with Wildcard for nested routing */}
          <Route path="/admin/*" element={
            <ProtectedRoute>
              <AdminPanelPage />
            </ProtectedRoute>
          } />

          <Route path="/bulk-create" element={
            <ProtectedRoute>
              <BulkCreateNuggetsPage />
            </ProtectedRoute>
          } />

          {/* Legal Pages - Dynamic Routing */}
          <Route path="/about" element={<LegalPageRenderer />} />
          <Route path="/terms" element={<LegalPageRenderer />} />
          <Route path="/privacy" element={<LegalPageRenderer />} />
          <Route path="/contact" element={<LegalPageRenderer />} />
          <Route path="/guidelines" element={<LegalPageRenderer />} />
          <Route path="/disclaimer" element={<LegalPageRenderer />} />
          <Route path="/cookie-policy" element={<LegalPageRenderer />} />

          {/* Auth Routes */}
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
        
        <BackToTopButton />
        <ToastContainer />
        
        <CreateNuggetModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
        <AuthModal />
      </MainLayout>
    </>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
};

export default App;
