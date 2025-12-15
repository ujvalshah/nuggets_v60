import React, { useState, useRef, useEffect } from 'react';
import { Menu, LayoutGrid, Rows, Columns, List, Filter, ArrowUpDown, Maximize, Sun, Moon, Plus, User as UserIcon, LogOut, Settings, Shield, LogIn, Layers, X, Globe, FileText, Lock, BookOpen, MessageSquare, Send, CheckCircle2 } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { SortOrder } from '@/types';
import { storageService } from '@/services/storageService';
import { Avatar } from './shared/Avatar';
import { FilterScrollRow } from './header/FilterScrollRow';
import { SearchInput } from './header/SearchInput';
import { NavTab } from './header/NavTab';
import { useAuth } from '@/hooks/useAuth';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useToast } from '@/hooks/useToast';
import { adminFeedbackService } from '@/admin/services/adminFeedbackService';
import { createPortal } from 'react-dom';

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
    e.stopPropagation(); // Prevent bubbling causing drawer close
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
        <div className="mx-3 my-2 p-4 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-xs rounded-xl font-bold text-center border border-green-100 dark:border-green-900/30 animate-in fade-in flex items-center justify-center gap-2 h-32">
           <CheckCircle2 size={24} />
           <div>
             Thanks for your thoughts! <br/> We read every message.
           </div>
        </div>
      );
  }

  return (
    <div className="mx-3 my-4 px-4 py-3 bg-primary-50/40 dark:bg-primary-900/10 rounded-xl border border-primary-100/50 dark:border-primary-900/20" onClick={(e) => e.stopPropagation()}>
        <p className="text-[10px] font-bold text-primary-700 dark:text-primary-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <MessageSquare size={12} className="text-primary-500" /> Feedback
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
            Have an idea? Send suggestions directly to the founder.
        </p>
        <form onSubmit={handleSubmit} className="space-y-2">
            <textarea 
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="I wish this app had..."
                className="w-full text-xs p-3 bg-white dark:bg-slate-950 border border-primary-100 dark:border-primary-900/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/50 resize-none h-24 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 cursor-text"
                onKeyDown={(e) => e.stopPropagation()} // Ensure typing doesn't trigger hotkeys
            />
            {!isAuthenticated && (
                <input 
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Your email (optional)"
                    className="w-full text-xs p-2.5 bg-white dark:bg-slate-950 border border-primary-100 dark:border-primary-900/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/50 text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
                    onKeyDown={(e) => e.stopPropagation()}
                />
            )}
            <button 
                type="submit"
                disabled={!feedback.trim() || isSending}
                className="w-full py-2 bg-primary-100 dark:bg-primary-900/30 text-primary-900 dark:text-primary-100 border border-primary-200 dark:border-primary-800 text-xs font-bold rounded-xl hover:bg-primary-200 dark:hover:bg-primary-900/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
                onClick={(e) => e.stopPropagation()}
            >
                {isSending ? 'Sending...' : <><Send size={12} /> Send to Founder</>}
            </button>
        </form>
    </div>
  );
};

// --- Extracted Navigation Drawer ---
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
  isOpen, onClose, isAuthenticated, isAdmin, logout, openAuthModal
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" onClick={onClose} />
      <div className="absolute top-0 bottom-0 left-0 w-[280px] bg-white dark:bg-slate-950 shadow-2xl flex flex-col animate-in slide-in-from-left duration-300 border-r border-slate-200 dark:border-slate-800">
        
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
           <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center text-slate-900 font-bold text-lg shadow-sm">N</div>
              <span className="font-extrabold text-lg text-slate-900 dark:text-white">Nuggets</span>
           </div>
           <button onClick={onClose} className="p-2 -mr-2 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
             <X size={20} />
           </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar">
           <p className="px-4 pb-2 pt-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Navigation</p>
           <Link to="/" onClick={onClose} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-sm transition-colors">
              <LayoutGrid size={18} /> Home
           </Link>
           <Link to="/collections" onClick={onClose} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-sm transition-colors">
              <Layers size={18} /> Collections
           </Link>
           
           {isAuthenticated && (
             <>
               <div className="my-2 h-px bg-slate-100 dark:border-slate-800 mx-4" />
               <p className="px-4 pb-2 pt-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Personal</p>
               <Link to="/myspace" onClick={onClose} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-sm transition-colors">
                  <UserIcon size={18} /> My Space
               </Link>
               <Link to="/account" onClick={onClose} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-sm transition-colors">
                  <Settings size={18} /> Settings
               </Link>
             </>
           )}

           {isAdmin && (
             <>
               <div className="my-2 h-px bg-slate-100 dark:border-slate-800 mx-4" />
               <p className="px-4 pb-2 pt-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Admin</p>
               <Link to="/admin" onClick={onClose} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-900 text-white shadow-md font-bold text-sm mb-1">
                  <Shield size={18} /> Admin Panel
               </Link>
               <Link to="/bulk-create" onClick={onClose} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-sm transition-colors">
                  <Layers size={18} /> Batch Import
               </Link>
             </>
           )}

           <div className="my-4 h-px bg-slate-100 dark:border-slate-800 mx-4" />
           
           {/* Feedback Widget - Enhanced Styling */}
           <DrawerFeedbackForm isAuthenticated={isAuthenticated} currentUser={currentUser} />

           <div className="my-4 h-px bg-slate-100 dark:border-slate-800 mx-4" />
           
           {/* Legal & Info - Now at bottom of scrollable area */}
           <div className="px-4 pb-2">
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Legal & Info</p>
             <div className="flex flex-col gap-1">
               <Link to="/about" onClick={onClose} className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg transition-colors">
                  <Globe size={16} /> About Us
               </Link>
               <Link to="/terms" onClick={onClose} className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg transition-colors">
                  <FileText size={16} /> Terms of Service
               </Link>
               <Link to="/privacy" onClick={onClose} className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg transition-colors">
                  <Lock size={16} /> Privacy Policy
               </Link>
               <Link to="/guidelines" onClick={onClose} className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg transition-colors">
                  <BookOpen size={16} /> Guidelines
               </Link>
               <Link to="/contact" onClick={onClose} className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg transition-colors">
                  <MessageSquare size={16} /> Contact
               </Link>
             </div>
           </div>
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
           {isAuthenticated ? (
             <button onClick={() => { logout(); onClose(); }} className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-red-600 font-bold text-sm hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors shadow-sm">
               <LogOut size={18} /> Sign Out
             </button>
           ) : (
             <button onClick={() => { openAuthModal(); onClose(); }} className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-primary-500 text-slate-900 font-bold text-sm shadow-lg shadow-primary-500/20 hover:scale-[1.02] transition-transform">
               <LogIn size={18} /> Sign In
             </button>
           )}
        </div>
      </div>
    </div>,
    document.body
  );
};

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
  sortOrder: SortOrder;
  setSortOrder: (s: SortOrder) => void;
  onCreateNugget: () => void;
  currentUserId?: string;
}

export const Header: React.FC<HeaderProps> = ({ 
  isDark, toggleTheme, searchQuery, setSearchQuery, 
  sidebarOpen, setSidebarOpen, viewMode, setViewMode,
  selectedCategories, setSelectedCategories,
  setSortOrder, onCreateNugget
}) => {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [isScrolled, setIsScrolled] = useState(false);
  
  const sortRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const { currentUser, isAuthenticated, openAuthModal, logout } = useAuth();
  const { withAuth } = useRequireAuth();

  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    storageService.getCategories().then(setCategories);
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleCategory = (cat: string) => setSelectedCategories(selectedCategories.includes(cat) ? selectedCategories.filter(c => c !== cat) : [...selectedCategories, cat]);
  const clearCategories = () => setSelectedCategories([]);
  
  useEffect(() => {
    if (selectedCategories.length > 0) {
      setIsFilterOpen(true);
    }
  }, [selectedCategories]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (sortRef.current && !sortRef.current.contains(target)) setIsSortOpen(false);
      if (userMenuRef.current && !userMenuRef.current.contains(target)) setIsUserMenuOpen(false);
    };
    if (isSortOpen || isUserMenuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSortOpen, isUserMenuOpen]);

  const toggleFullScreen = () => !document.fullscreenElement ? document.documentElement.requestFullscreen() : document.exitFullscreen();

  return (
    <>
      <header className={`sticky top-0 z-40 w-full transition-all duration-300 ${isScrolled || isFilterOpen ? 'bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 shadow-sm' : 'bg-slate-100/50 dark:bg-slate-950/50 backdrop-blur-none border-b border-transparent'}`}>
        <div className="hidden lg:flex w-full px-4 sm:px-6 lg:px-8 h-[4.5rem] items-center justify-between gap-4 relative">
          
          {/* Logo & Navigation Tabs */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Desktop Menu Button */}
            <button 
                onClick={() => setSidebarOpen(true)} 
                className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 transition-all mr-1"
                aria-label="Open Menu"
            >
                <Menu size={22} />
            </button>

            <Link to="/" className="flex items-center gap-2.5 group mr-2">
                <div className="w-9 h-9 bg-primary-500 rounded-xl flex items-center justify-center text-slate-900 font-bold text-xl shadow-sm">N</div>
                <span className="block text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight hidden xl:block">Nuggets</span>
            </Link>

            <nav className="flex items-center gap-1 bg-white/50 dark:bg-slate-900/50 p-1 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 backdrop-blur-sm">
                <NavTab to="/" label="Home" active={location.pathname === '/'} />
                <NavTab to="/collections" label="Collections" active={location.pathname === '/collections'} />
                {isAuthenticated && (
                   <NavTab to="/myspace" label="My Space" active={location.pathname.includes('/profile') || location.pathname === '/myspace'} />
                )}
                {isAdmin && (
                  <>
                    <NavTab to="/bulk-create" label="Batch Import" active={location.pathname === '/bulk-create'} />
                    <NavTab to="/admin" label="Admin" active={location.pathname.startsWith('/admin')} />
                  </>
                )}
            </nav>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-4xl mx-auto justify-center relative px-2">
            <div className={`flex w-full items-center rounded-2xl p-1 transition-all duration-300 ${isScrolled || isFilterOpen ? 'bg-slate-100/80 dark:bg-slate-900/80' : 'bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800'}`}>
              <div className="flex-1 min-w-0">
                <SearchInput value={searchQuery} onChange={setSearchQuery} />
              </div>
              <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1" />
              <div className="flex items-center pr-1 gap-1">
                <button 
                    onClick={() => setIsFilterOpen(!isFilterOpen)} 
                    className={`p-2 rounded-xl transition-all duration-200 ${isFilterOpen ? 'bg-primary-500 text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
                >
                    <Filter size={18} fill={isFilterOpen ? "currentColor" : "none"} />
                </button>
                <div className="relative" ref={sortRef}>
                  <button onClick={() => setIsSortOpen(!isSortOpen)} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-800"><ArrowUpDown size={18} /></button>
                  {isSortOpen && <div className="absolute top-full right-0 mt-3 w-36 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden z-50 p-1">
                      <button onClick={() => { setSortOrder('latest'); setIsSortOpen(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-700 dark:text-slate-200">Latest</button>
                      <button onClick={() => { setSortOrder('oldest'); setIsSortOpen(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-700 dark:text-slate-200">Oldest</button>
                  </div>}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 shrink-0">
            <button 
                onClick={withAuth(onCreateNugget)} 
                className="hidden lg:flex items-center gap-2 bg-primary-500 text-slate-900 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-600 transition-all shadow-sm active:scale-95 shadow-primary-500/20"
            >
                <Plus size={18} strokeWidth={2.5} />
                <span>Create</span>
            </button>
            
            {/* Unified Tools Group */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary-600' : 'text-slate-400 hover:text-slate-600'}`} title="Grid View">
                    <LayoutGrid size={18} />
                </button>
                <button onClick={() => setViewMode('feed')} className={`p-2 rounded-lg transition-all ${viewMode === 'feed' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary-600' : 'text-slate-400 hover:text-slate-600'}`} title="Feed View">
                    <Rows size={18} />
                </button>
                <button onClick={() => setViewMode('masonry')} className={`p-2 rounded-lg transition-all ${viewMode === 'masonry' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary-600' : 'text-slate-400 hover:text-slate-600'}`} title="Masonry View">
                    <Columns size={18} />
                </button>
                <button onClick={() => setViewMode('utility')} className={`p-2 rounded-lg transition-all ${viewMode === 'utility' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary-600' : 'text-slate-400 hover:text-slate-600'}`} title="Utility View">
                    <List size={18} />
                </button>
                <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 mx-1" />
                <button onClick={toggleFullScreen} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all" title="Toggle Fullscreen">
                    <Maximize size={18} />
                </button>
                <button onClick={toggleTheme} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all" title="Toggle Theme">
                    {isDark ? <Sun size={18} /> : <Moon size={18} />}
                </button>
            </div>

            {/* User Avatar Menu or Login */}
            <div className="relative" ref={userMenuRef}>
                {isAuthenticated ? (
                    <>
                        <button 
                            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} 
                            className={`p-1 rounded-full border-2 transition-colors ${isUserMenuOpen ? 'border-primary-500' : 'border-slate-200 dark:border-slate-700 hover:border-primary-500'}`}
                        >
                            <Avatar name={currentUser?.name || 'User'} size="md" />
                        </button>

                        {isUserMenuOpen && (
                            <div className="absolute top-full right-0 mt-3 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden z-50 animate-in slide-in-from-top-2 fade-in duration-200">
                                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{currentUser?.name}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{currentUser?.email}</p>
                                </div>
                                <div className="p-1.5 flex flex-col gap-0.5">
                                    <Link to="/myspace" onClick={() => setIsUserMenuOpen(false)} className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                                        <UserIcon size={16} /> My Profile
                                    </Link>
                                    <Link to="/account" onClick={() => setIsUserMenuOpen(false)} className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                                        <Settings size={16} /> Account Settings
                                    </Link>
                                    {isAdmin && (
                                        <>
                                          <Link to="/admin" onClick={() => setIsUserMenuOpen(false)} className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                                              <Shield size={16} /> Admin Panel
                                          </Link>
                                          <Link to="/bulk-create" onClick={() => setIsUserMenuOpen(false)} className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                                              <Layers size={16} /> Batch Import
                                          </Link>
                                        </>
                                    )}
                                </div>

                                {/* Divider & Legal Links */}
                                <div className="border-t border-slate-100 dark:border-slate-800 my-1"></div>
                                <div className="p-1.5">
                                    <p className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Legal & Info</p>
                                    <Link to="/about" onClick={() => setIsUserMenuOpen(false)} className="flex items-center gap-3 px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                                        <Globe size={14} /> About Us
                                    </Link>
                                    <Link to="/guidelines" onClick={() => setIsUserMenuOpen(false)} className="flex items-center gap-3 px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                                        <BookOpen size={14} /> Guidelines
                                    </Link>
                                    <Link to="/contact" onClick={() => setIsUserMenuOpen(false)} className="flex items-center gap-3 px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                                        <MessageSquare size={14} /> Contact
                                    </Link>
                                </div>

                                <div className="p-1.5 border-t border-slate-100 dark:border-slate-800">
                                    <button onClick={() => { logout(); setIsUserMenuOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2 text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-colors">
                                        <LogOut size={16} /> Log Out
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <button 
                        onClick={() => openAuthModal('login')}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 transition-all shadow-sm"
                    >
                        <LogIn size={18} />
                        <span>Sign In</span>
                    </button>
                )}
            </div>
          </div>
        </div>

        {/* Filter Overlay */}
        {isFilterOpen && (
            <div className="hidden lg:block absolute top-full left-0 right-0 z-30 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 animate-in slide-in-from-top-2 duration-300 shadow-lg">
                <div className="py-3">
                    <FilterScrollRow categories={categories} selectedCategories={selectedCategories} onToggle={toggleCategory} onClear={clearCategories} />
                </div>
            </div>
        )}

        {/* Mobile Header (Sticky & always visible on Mobile) */}
        <div className="lg:hidden w-full flex flex-col bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800">
           <div className="h-14 px-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                  <button onClick={() => setSidebarOpen(true)} className="p-1"><Menu size={24} /></button>
                  <span className="font-bold text-xl">Nuggets</span>
              </div>
              <div className="flex items-center gap-3">
                  <button onClick={withAuth(onCreateNugget)} className="text-primary-600 dark:text-primary-400"><Plus size={24} /></button>
                  <button onClick={toggleTheme}>{isDark ? <Sun size={20} /> : <Moon size={20} />}</button>
                  {isAuthenticated ? (
                     <Link to="/myspace">
                        <Avatar name={currentUser?.name || 'U'} size="sm" />
                     </Link>
                  ) : (
                      <button onClick={() => openAuthModal('login')} className="text-sm font-bold text-primary-600">Login</button>
                  )}
              </div>
           </div>
           <div className="flex p-2 gap-2 overflow-x-auto no-scrollbar-visual">
                <NavTab to="/" label="Home" active={location.pathname === '/'} />
                <NavTab to="/collections" label="Collections" active={location.pathname === '/collections'} />
                {isAuthenticated && <NavTab to="/myspace" label="My Space" active={location.pathname.includes('/profile')} />}
                {isAdmin && (
                  <>
                    <NavTab to="/bulk-create" label="Batch Import" active={location.pathname === '/bulk-create'} />
                    <NavTab to="/admin" label="Admin" active={location.pathname.startsWith('/admin')} />
                  </>
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


