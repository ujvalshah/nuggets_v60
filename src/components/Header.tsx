import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, LogOut, Settings, Shield, LogIn, Layers, User as UserIcon, Globe, FileText, Lock, BookOpen, MessageSquare, Menu, X, LayoutGrid, Rows, Columns, List, Filter, ArrowUpDown, Maximize, Sun, Moon, Send, CheckCircle2, Search } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { Avatar } from './shared/Avatar';
import { FilterPopover, FilterState } from './header/FilterPopover';
import { storageService } from '@/services/storageService';
import { useAuth } from '@/hooks/useAuth';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useToast } from '@/hooks/useToast';
import { adminFeedbackService } from '@/admin/services/adminFeedbackService';

interface HeaderProps {
  isDark: boolean;
  toggleTheme: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (o: boolean) => void;
  viewMode: 'grid' | 'feed' | 'masonry' | 'utility';
  setViewMode: (mode: 'grid' | 'feed' | 'masonry' | 'utility') => void;
  selectedCategories: string[];
  setSelectedCategories: (c: string[]) => void;
  selectedTag: string | null;
  setSelectedTag: (t: string | null) => void;
  sortOrder: any;
  setSortOrder: (s: any) => void;
  onCreateNugget: () => void;
  currentUserId?: string;
}

export const Header: React.FC<HeaderProps> = ({ 
  searchQuery, 
  setSearchQuery, 
  onCreateNugget,
  sidebarOpen,
  setSidebarOpen,
  viewMode,
  setViewMode,
  selectedCategories,
  setSelectedCategories,
  sortOrder,
  setSortOrder,
  isDark,
  toggleTheme
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [filterState, setFilterState] = useState<FilterState>({
    favorites: false,
    unread: false,
    formats: [],
    timeRange: 'all',
  });
  const userMenuRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);
  const filterPopoverRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const { currentUser, isAuthenticated, openAuthModal, logout } = useAuth();
  const { withAuth } = useRequireAuth();

  const isAdmin = currentUser?.role === 'admin';
  const currentPath = location.pathname;
  const isHome = currentPath === '/';
  const isCollections = currentPath === '/collections';

  useEffect(() => {
    storageService.getCategories().then(setCategories);
  }, []);

  const toggleCategory = (cat: string) => {
    setSelectedCategories(selectedCategories.includes(cat) 
      ? selectedCategories.filter(c => c !== cat) 
      : [...selectedCategories, cat]);
  };
  
  const clearCategories = () => setSelectedCategories([]);

  // Removed auto-open behavior - CategoryFilterBar now handles category selection
  // The old FilterScrollRow overlay should only open via explicit filter button click

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const targetElement = target as HTMLElement;
      
      // Check if click is on a logout button - don't close menu in that case
      // Logout buttons have data-logout-button attribute and handle their own closing
      const isLogoutButton = targetElement.closest('button[data-logout-button="true"]');
      
      if (userMenuRef.current && !userMenuRef.current.contains(target) && !isLogoutButton) {
        setIsUserMenuOpen(false);
      }
      if (sortRef.current && !sortRef.current.contains(target)) {
        setIsSortOpen(false);
      }
      if (filterPopoverRef.current && !filterPopoverRef.current.contains(target)) {
        setIsFilterPopoverOpen(false);
      }
    };
    if (isUserMenuOpen || isSortOpen || isFilterPopoverOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isUserMenuOpen, isSortOpen, isFilterPopoverOpen]);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Search shortcut (⌘K / Ctrl+K)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="text"][placeholder*="Search"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      }
      // Escape to close dropdowns
      if (e.key === 'Escape') {
        if (isSortOpen) setIsSortOpen(false);
        if (isUserMenuOpen) setIsUserMenuOpen(false);
        if (isFilterPopoverOpen) setIsFilterPopoverOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
            }, [isSortOpen, isUserMenuOpen, isFilterPopoverOpen]);

  return (
    <>
      {/* Desktop Header */}
      <header className="hidden lg:block fixed top-0 z-50 w-full h-16 bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="grid grid-cols-[1fr_minmax(auto,600px)_1fr] items-center px-4 h-full">
        
        {/* Zone A: Left - Logo + Segmented Control */}
        <div className="flex items-center gap-3">
          {/* Menu Button */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="Open Menu"
          >
            <Menu size={20} />
          </button>

          {/* Logo (Icon Only) */}
          <Link to="/" className="flex items-center justify-center">
            <div className="w-8 h-8 bg-yellow-400 rounded-lg flex items-center justify-center text-gray-900 font-bold text-lg shadow-sm">
              N
            </div>
          </Link>

          {/* Segmented Control */}
          <nav 
            className="bg-gray-100 rounded-lg p-1 flex gap-1 overflow-x-auto no-scrollbar-visual" 
            role="navigation"
            aria-label="Main navigation"
          >
            <Link
              to="/"
              className={`px-3 py-1 text-sm font-medium rounded-md transition-all whitespace-nowrap flex-shrink-0 ${
                isHome
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              aria-current={isHome ? 'page' : undefined}
            >
              Home
            </Link>
            <Link
              to="/collections"
              className={`px-3 py-1 text-sm font-medium rounded-md transition-all whitespace-nowrap flex-shrink-0 ${
                isCollections
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              aria-current={isCollections ? 'page' : undefined}
            >
              Collections
            </Link>
            {isAuthenticated && (
              <Link
                to={`/profile/${currentUser?.id || ''}`}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-all whitespace-nowrap flex-shrink-0 ${
                  currentPath.includes('/profile') || currentPath === '/myspace'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                aria-current={(currentPath.includes('/profile') || currentPath === '/myspace') ? 'page' : undefined}
              >
                My Space
              </Link>
            )}
            {isAdmin && (
              <>
                <Link
                  to="/bulk-create"
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-all whitespace-nowrap flex-shrink-0 ${
                    currentPath === '/bulk-create'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  aria-current={currentPath === '/bulk-create' ? 'page' : undefined}
                >
                  Batch Import
                </Link>
                <Link
                  to="/admin"
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-all whitespace-nowrap flex-shrink-0 ${
                    currentPath.startsWith('/admin')
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  aria-current={currentPath.startsWith('/admin') ? 'page' : undefined}
                >
                  Admin
                </Link>
              </>
            )}
          </nav>
        </div>

        {/* Zone B: Center - Search Hero */}
        <div className="flex items-center justify-center">
          <div className="relative w-full max-w-2xl">
            {/* Search Icon */}
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              <Search size={16} />
            </div>
            
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value.trimStart())}
              onBlur={(e) => setSearchQuery(e.target.value.trim())}
              placeholder="Search..."
              className="w-full h-10 pl-10 pr-24 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:bg-white focus:outline-none transition-all"
              aria-label="Search"
            />
            
            {/* Clear Button - positioned before clustered controls */}
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-[72px] top-1/2 -translate-y-1/2 p-1 rounded text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}

            {/* Clustered Controls: Filter/Sort + ⌘K Badge */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              {/* Filter Button with Popover */}
              <div className="relative" ref={filterPopoverRef}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsFilterPopoverOpen(!isFilterPopoverOpen);
                  }}
                  className={`p-1.5 rounded transition-all relative ${
                    isFilterPopoverOpen || 
                    selectedCategories.length > 0 || 
                    filterState.favorites || 
                    filterState.unread || 
                    filterState.formats.length > 0 || 
                    filterState.timeRange !== 'all'
                      ? 'text-yellow-500 bg-yellow-50'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                  aria-label="Filter"
                  title="Filter"
                >
                  <Filter size={16} fill={
                    isFilterPopoverOpen || 
                    selectedCategories.length > 0 || 
                    filterState.favorites || 
                    filterState.unread || 
                    filterState.formats.length > 0 || 
                    filterState.timeRange !== 'all'
                      ? "currentColor" 
                      : "none"
                  } />
                  {/* Muted Filter Count Badge */}
                  {(selectedCategories.length > 0 || 
                    filterState.favorites || 
                    filterState.unread || 
                    filterState.formats.length > 0 || 
                    filterState.timeRange !== 'all') && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-gray-400 text-white text-[9px] rounded-full flex items-center justify-center font-medium">
                      {selectedCategories.length + 
                        (filterState.favorites ? 1 : 0) + 
                        (filterState.unread ? 1 : 0) + 
                        filterState.formats.length + 
                        (filterState.timeRange !== 'all' ? 1 : 0)}
                    </span>
                  )}
                </button>
                {isFilterPopoverOpen && (
                  <div className="absolute top-full right-0 mt-2 z-50">
                    <FilterPopover
                      filters={filterState}
                      onChange={setFilterState}
                      onClear={() => {
                        setFilterState({
                          favorites: false,
                          unread: false,
                          formats: [],
                          timeRange: 'all',
                        });
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Sort Dropdown */}
              <div className="relative" ref={sortRef}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsSortOpen(!isSortOpen);
                  }}
                  className="p-1.5 rounded text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Sort"
                  title="Sort"
                >
                  <ArrowUpDown size={16} />
                </button>
                {isSortOpen && (
                  <div className="absolute top-full right-0 mt-2 w-36 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50">
                    <button
                      onClick={() => { setSortOrder('latest'); setIsSortOpen(false); }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                        sortOrder === 'latest' ? 'bg-gray-50 font-medium' : ''
                      }`}
                    >
                      Latest
                    </button>
                    <button
                      onClick={() => { setSortOrder('oldest'); setIsSortOpen(false); }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                        sortOrder === 'oldest' ? 'bg-gray-50 font-medium' : ''
                      }`}
                    >
                      Oldest
                    </button>
                  </div>
                )}
              </div>

              {/* Keyboard Shortcut Badge - clustered with filter/sort */}
              <div className="flex items-center gap-1 px-2 py-0.5 bg-white border border-gray-200 rounded text-xs text-gray-500 font-mono ml-0.5">
                <kbd className="text-[10px]">⌘</kbd>
                <kbd className="text-[10px]">K</kbd>
              </div>
            </div>
          </div>
        </div>

        {/* Zone C: Right - Profile & Utilities */}
        <div className="flex items-center justify-end gap-2">
          {/* Create Button */}
          <button
            onClick={withAuth(onCreateNugget)}
            className="h-9 px-4 bg-white hover:bg-[#F7F7F7] text-[#202124] font-medium text-sm rounded-full shadow-sm border border-gray-200/50 transition-all active:scale-95"
          >
            <span className="flex items-center gap-1.5">
              <Sparkles size={16} strokeWidth={2.5} className="text-yellow-500" fill="currentColor" />
              Create
            </span>
          </button>

          {/* View Mode Switcher */}
          <div className="flex items-center bg-gray-100 p-1 rounded-lg border border-gray-200">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded transition-all ${
                viewMode === 'grid'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              title="Grid View"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode('feed')}
              className={`p-1.5 rounded transition-all ${
                viewMode === 'feed'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              title="Feed View"
            >
              <Rows size={16} />
            </button>
            <button
              onClick={() => setViewMode('masonry')}
              className={`p-1.5 rounded transition-all ${
                viewMode === 'masonry'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              title="Masonry View"
            >
              <Columns size={16} />
            </button>
            <button
              onClick={() => setViewMode('utility')}
              className={`p-1.5 rounded transition-all ${
                viewMode === 'utility'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              title="Utility View"
            >
              <List size={16} />
            </button>
          </div>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullScreen}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            title="Toggle Fullscreen"
            aria-label="Toggle Fullscreen"
          >
            <Maximize size={18} />
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            title="Toggle Theme"
            aria-label="Toggle Theme"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* User Avatar Dropdown */}
          <div className="relative" ref={userMenuRef}>
            {isAuthenticated ? (
              <>
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="p-0.5 rounded-full border-2 border-transparent hover:border-gray-300 transition-colors"
                  aria-label="User menu"
                >
                  <Avatar 
                    name={currentUser?.name || 'User'} 
                    src={currentUser?.avatarUrl}
                    size="md" 
                  />
                </button>

                {isUserMenuOpen && (
                  <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50 animate-in slide-in-from-top-2 fade-in duration-200">
                    {/* User Info */}
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {currentUser?.name}
                      </p>
                      {currentUser?.email && (
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          {currentUser.email}
                        </p>
                      )}
                    </div>

                    {/* Menu Items */}
                    <div className="py-1">
                      <Link
                        to={`/profile/${currentUser?.id || ''}`}
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <UserIcon size={16} />
                        My Space
                      </Link>
                      <Link
                        to="/account"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <Settings size={16} />
                        Settings
                      </Link>
                      {isAdmin && (
                        <>
                          <div className="h-px bg-gray-100 my-1" />
                          <Link
                            to="/admin"
                            onClick={() => setIsUserMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 transition-colors"
                          >
                            <Shield size={16} />
                            Admin Panel
                          </Link>
                          <Link
                            to="/bulk-create"
                            onClick={() => setIsUserMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 transition-colors"
                          >
                            <Layers size={16} />
                            Batch Import
                          </Link>
                        </>
                      )}
                    </div>

                    {/* Legal & Info */}
                    <div className="border-t border-gray-100 py-1">
                      <p className="px-4 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Legal & Info</p>
                      <Link
                        to="/about"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        <Globe size={14} />
                        About Us
                      </Link>
                      <Link
                        to="/terms"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        <FileText size={14} />
                        Terms of Service
                      </Link>
                      <Link
                        to="/privacy"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        <Lock size={14} />
                        Privacy Policy
                      </Link>
                      <Link
                        to="/guidelines"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        <BookOpen size={14} />
                        Guidelines
                      </Link>
                      <Link
                        to="/contact"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        <MessageSquare size={14} />
                        Contact
                      </Link>
                    </div>

                    {/* Logout */}
                    <div className="border-t border-gray-100 py-1">
                      <button
                        data-logout-button="true"
                        onMouseDown={(e) => {
                          // Stop mousedown propagation to prevent click-outside handler from closing menu
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          // Don't close menu immediately - let logout complete first
                          // Menu will close naturally when isAuthenticated becomes false
                          try {
                            await logout();
                            // Close menu after logout completes
                            setIsUserMenuOpen(false);
                          } catch (error) {
                            console.error('Logout failed:', error);
                            // Close menu even if logout fails
                            setIsUserMenuOpen(false);
                          }
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut size={16} />
                        Log Out
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <button
                onClick={() => openAuthModal('login')}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white font-medium text-sm rounded-lg hover:bg-gray-800 transition-colors"
              >
                <LogIn size={16} />
                Sign In
              </button>
            )}
          </div>
        </div>

        {/* Old Filter Overlay - Removed in favor of CategoryFilterBar */}
        {/* CategoryFilterBar now handles category filtering via the YouTube-style bar */}
      </div>
      </header>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 z-50 w-full h-14 bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="flex items-center justify-between px-4 h-full">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              aria-label="Open Menu"
            >
              <Menu size={22} />
            </button>
            <Link to="/" className="flex items-center justify-center">
              <div className="w-7 h-7 bg-yellow-400 rounded-lg flex items-center justify-center text-gray-900 font-bold text-base shadow-sm">
                N
              </div>
            </Link>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={withAuth(onCreateNugget)}
              className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              aria-label="Create"
            >
              <Sparkles size={20} className="text-yellow-500" fill="currentColor" />
            </button>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              aria-label="Toggle Theme"
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            {isAuthenticated ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="p-0.5 rounded-full border-2 border-transparent hover:border-gray-300 transition-colors"
                  aria-label="User menu"
                >
                  <Avatar 
                    name={currentUser?.name || 'User'} 
                    src={currentUser?.avatarUrl}
                    size="sm" 
                  />
                </button>
                {isUserMenuOpen && (
                  <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {currentUser?.name}
                      </p>
                      {currentUser?.email && (
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          {currentUser.email}
                        </p>
                      )}
                    </div>
                    <div className="py-1">
                      <Link
                        to={`/profile/${currentUser?.id || ''}`}
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <UserIcon size={16} />
                        My Space
                      </Link>
                      <Link
                        to="/account"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <Settings size={16} />
                        Settings
                      </Link>
                      {isAdmin && (
                        <>
                          <div className="h-px bg-gray-100 my-1" />
                          <Link
                            to="/admin"
                            onClick={() => setIsUserMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 transition-colors"
                          >
                            <Shield size={16} />
                            Admin Panel
                          </Link>
                          <Link
                            to="/bulk-create"
                            onClick={() => setIsUserMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 transition-colors"
                          >
                            <Layers size={16} />
                            Batch Import
                          </Link>
                        </>
                      )}
                    </div>
                    <div className="border-t border-gray-100 py-1">
                      <button
                        data-logout-button="true"
                        onMouseDown={(e) => {
                          // Stop mousedown propagation to prevent click-outside handler from closing menu
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          // Don't close menu immediately - let logout complete first
                          // Menu will close naturally when isAuthenticated becomes false
                          try {
                            await logout();
                            // Close menu after logout completes
                            setIsUserMenuOpen(false);
                          } catch (error) {
                            console.error('Logout failed:', error);
                            // Close menu even if logout fails
                            setIsUserMenuOpen(false);
                          }
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut size={16} />
                        Log Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => openAuthModal('login')}
                className="px-3 py-1.5 bg-gray-900 text-white font-medium text-xs rounded-lg hover:bg-gray-800 transition-colors"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      <NavigationDrawer 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)}
        isAuthenticated={isAuthenticated}
        currentUser={currentUser}
        isAdmin={isAdmin}
        logout={logout}
        openAuthModal={() => openAuthModal('login')}
      />
    </>
  );
};

// --- Internal Feedback Form Component ---
interface DrawerFeedbackFormProps {
  isAuthenticated: boolean;
  currentUser?: { id: string; name: string; email?: string; avatarUrl?: string } | null;
}

const DrawerFeedbackForm: React.FC<DrawerFeedbackFormProps> = ({ isAuthenticated, currentUser }) => {
  const [feedback, setFeedback] = useState('');
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!feedback.trim()) return;
    
    setIsSending(true);
    try {
      await adminFeedbackService.submitFeedback(
        feedback.trim(),
        'general',
        currentUser ? {
          id: currentUser.id,
          name: currentUser.name,
          email: currentUser.email,
          avatarUrl: currentUser.avatarUrl
        } : undefined,
        !currentUser ? email : undefined
      );
      
      setSent(true);
      toast.success('Feedback sent!');
      
      setTimeout(() => {
          setSent(false);
          setFeedback('');
          setEmail('');
      }, 3000);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      toast.error('Failed to send feedback. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  if (sent) {
      return (
        <div className="mx-3 my-2 p-4 bg-green-50 text-green-600 text-xs rounded-xl font-bold text-center border border-green-100 animate-in fade-in flex items-center justify-center gap-2 h-32">
           <CheckCircle2 size={24} />
           <div>
             Thanks for your thoughts! <br/> We read every message.
           </div>
        </div>
      );
  }

  return (
    <div className="mx-3 my-4 px-4 py-3 bg-yellow-50/40 rounded-xl border border-yellow-100/50" onClick={(e) => e.stopPropagation()}>
        <p className="text-[10px] font-bold text-yellow-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <MessageSquare size={12} className="text-yellow-500" /> Feedback
        </p>
        <p className="text-xs text-gray-500 mb-3 leading-relaxed">
            Have an idea? Send suggestions directly to the founder.
        </p>
        <form onSubmit={handleSubmit} className="space-y-2">
            <textarea 
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="I wish this app had..."
                className="w-full text-xs p-3 bg-white border border-yellow-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400/50 resize-none h-24 text-gray-700 placeholder:text-gray-400 cursor-text"
                onKeyDown={(e) => e.stopPropagation()}
            />
            {!isAuthenticated && (
                <input 
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Your email (optional)"
                    className="w-full text-xs p-2.5 bg-white border border-yellow-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400/50 text-gray-700 placeholder:text-gray-400"
                    onKeyDown={(e) => e.stopPropagation()}
                />
            )}
            <button 
                type="submit"
                disabled={!feedback.trim() || isSending}
                className="w-full py-2 bg-yellow-100 text-yellow-900 border border-yellow-200 text-xs font-bold rounded-xl hover:bg-yellow-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
                onClick={(e) => e.stopPropagation()}
            >
                {isSending ? 'Sending...' : <><Send size={12} /> Send to Founder</>}
            </button>
        </form>
    </div>
  );
};

// --- Navigation Drawer Component ---
interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
  currentUser: any;
  isAdmin: boolean;
  logout: () => void;
  openAuthModal: () => void;
}

const NavigationDrawer: React.FC<NavigationDrawerProps> = ({
  isOpen, onClose, isAuthenticated, currentUser, isAdmin, logout, openAuthModal
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" onClick={onClose} />
      <div className="absolute top-0 bottom-0 left-0 w-[280px] bg-white shadow-2xl flex flex-col animate-in slide-in-from-left duration-300 border-r border-gray-200">
        
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
           <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-yellow-400 rounded-lg flex items-center justify-center text-gray-900 font-bold text-lg shadow-sm">N</div>
              <span className="font-extrabold text-lg text-gray-900">Nuggets</span>
           </div>
           <button onClick={onClose} className="p-2 -mr-2 text-gray-400 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors">
             <X size={20} />
           </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
           <p className="px-4 pb-2 pt-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Navigation</p>
           <Link to="/" onClick={onClose} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-100 text-gray-700 font-bold text-sm transition-colors">
              <LayoutGrid size={18} /> Home
           </Link>
           <Link to="/collections" onClick={onClose} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-100 text-gray-700 font-bold text-sm transition-colors">
              <Layers size={18} /> Collections
           </Link>
           
           {isAuthenticated && (
             <>
               <div className="my-2 h-px bg-gray-100 mx-4" />
               <p className="px-4 pb-2 pt-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Personal</p>
               <Link to={`/profile/${currentUser?.id || ''}`} onClick={onClose} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-100 text-gray-700 font-bold text-sm transition-colors">
                  <UserIcon size={18} /> My Space
               </Link>
               <Link to="/account" onClick={onClose} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-100 text-gray-700 font-bold text-sm transition-colors">
                  <Settings size={18} /> Settings
               </Link>
             </>
           )}

           {isAdmin && (
             <>
               <div className="my-2 h-px bg-gray-100 mx-4" />
               <p className="px-4 pb-2 pt-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Admin</p>
               <Link to="/admin" onClick={onClose} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-900 text-white shadow-md font-bold text-sm mb-1">
                  <Shield size={18} /> Admin Panel
               </Link>
               <Link to="/bulk-create" onClick={onClose} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-100 text-gray-700 font-bold text-sm transition-colors">
                  <Layers size={18} /> Batch Import
               </Link>
             </>
           )}

           <div className="my-4 h-px bg-gray-100 mx-4" />
           
           {/* Feedback Widget */}
           <DrawerFeedbackForm isAuthenticated={isAuthenticated} currentUser={currentUser} />

           <div className="my-4 h-px bg-gray-100 mx-4" />
           
           <div className="px-4 pb-2">
             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Legal & Info</p>
             <div className="flex flex-col gap-1">
               <Link to="/about" onClick={onClose} className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                  <Globe size={16} /> About Us
               </Link>
               <Link to="/terms" onClick={onClose} className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                  <FileText size={16} /> Terms of Service
               </Link>
               <Link to="/privacy" onClick={onClose} className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                  <Lock size={16} /> Privacy Policy
               </Link>
               <Link to="/guidelines" onClick={onClose} className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                  <BookOpen size={16} /> Guidelines
               </Link>
               <Link to="/contact" onClick={onClose} className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                  <MessageSquare size={16} /> Contact
               </Link>
             </div>
           </div>
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50/50">
           {isAuthenticated ? (
             <button onClick={async (e) => { 
               e.preventDefault();
               e.stopPropagation();
               onClose(); 
               try {
                 await logout();
               } catch (error) {
                 console.error('Logout failed:', error);
               }
             }} className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-white border border-gray-200 text-red-600 font-bold text-sm hover:bg-red-50 transition-colors shadow-sm">
               <LogOut size={18} /> Sign Out
             </button>
           ) : (
             <button onClick={() => { openAuthModal(); onClose(); }} className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-yellow-400 text-gray-900 font-bold text-sm shadow-lg shadow-yellow-400/20 hover:scale-[1.02] transition-transform">
               <LogIn size={18} /> Sign In
             </button>
           )}
        </div>
      </div>
    </div>,
    document.body
  );
};

