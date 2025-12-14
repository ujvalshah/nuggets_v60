
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, FileText, Layers, Flag, MessageSquare, Globe, Lock, Hash, Bookmark } from 'lucide-react';
import { adminUsersService } from '../services/adminUsersService';
import { adminNuggetsService } from '../services/adminNuggetsService';
import { adminCollectionsService } from '../services/adminCollectionsService';
import { adminTagsService } from '../services/adminTagsService';
import { adminModerationService } from '../services/adminModerationService';
import { adminFeedbackService } from '../services/adminFeedbackService';
import { useAdminHeader } from '../layout/AdminLayout';

interface DashboardMetrics {
  users: { total: number };
  nuggets: { total: number; public: number; private: number };
  collections: { community: number; nuggetsInCommunity: number };
  tags: { total: number };
  reports: { open: number };
  bookmarks: { total: number };
  feedback: { total: number };
}

const MetricCard = ({ label, value, subValue, icon, onClick, colorClass }: any) => (
  <div 
    onClick={onClick}
    className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md transition-all group"
  >
    <div className="flex justify-between items-start">
        <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">{value}</h3>
            {subValue && <p className="text-xs text-slate-400 mt-1">{subValue}</p>}
        </div>
        <div className={`p-2 rounded-lg ${colorClass} group-hover:scale-110 transition-transform`}>
            {icon}
        </div>
    </div>
  </div>
);

export const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const { setPageHeader } = useAdminHeader();

  useEffect(() => {
    setPageHeader(
      "Dashboard", 
      "Platform overview at a glance.",
      <button className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold shadow-sm hover:opacity-90">Download Report</button>
    );
  }, []);

  useEffect(() => {
    const loadAll = async () => {
        const [users, nuggets, cols, tags, reports, feed] = await Promise.all([
            adminUsersService.getStats(),
            adminNuggetsService.getStats(),
            adminCollectionsService.getStats(),
            adminTagsService.getStats(),
            adminModerationService.getStats(),
            adminFeedbackService.getStats()
        ]);

        setMetrics({
            users: { total: users.total },
            nuggets: { total: nuggets.total, public: nuggets.public, private: nuggets.private },
            collections: { community: cols.totalCommunity, nuggetsInCommunity: cols.totalNuggetsInCommunity },
            tags: { total: tags.totalTags },
            reports: { open: reports.open },
            bookmarks: { total: users.bookmarks }, 
            feedback: { total: feed.total }
        });
    };
    loadAll();
  }, []);

  if (!metrics) return <div className="p-8 text-center text-slate-400">Loading dashboard...</div>;

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <MetricCard 
            label="Standard Users" 
            value={metrics.users.total} 
            icon={<Users size={18} />} 
            colorClass="bg-blue-50 text-blue-600"
            onClick={() => navigate('/admin/users')}
        />
        <MetricCard 
            label="Total Nuggets" 
            value={metrics.nuggets.total} 
            icon={<FileText size={18} />} 
            colorClass="bg-indigo-50 text-indigo-600"
            onClick={() => navigate('/admin/nuggets')}
        />
        <MetricCard 
            label="Public Nuggets" 
            value={metrics.nuggets.public} 
            icon={<Globe size={18} />} 
            colorClass="bg-green-50 text-green-600"
            onClick={() => navigate('/admin/nuggets')}
        />
        <MetricCard 
            label="Private Nuggets" 
            value={metrics.nuggets.private} 
            icon={<Lock size={18} />} 
            colorClass="bg-slate-100 text-slate-600"
            onClick={() => navigate('/admin/nuggets')}
        />
        <MetricCard 
            label="Comm. Collections" 
            value={metrics.collections.community} 
            subValue={`${metrics.collections.nuggetsInCommunity} items`}
            icon={<Layers size={18} />} 
            colorClass="bg-purple-50 text-purple-600"
            onClick={() => navigate('/admin/collections')}
        />
        <MetricCard 
            label="Total Bookmarks" 
            value={metrics.bookmarks.total} 
            icon={<Bookmark size={18} />} 
            colorClass="bg-amber-50 text-amber-600"
            onClick={() => navigate('/admin/users')}
        />
        <MetricCard 
            label="Total Tags" 
            value={metrics.tags.total} 
            icon={<Hash size={18} />} 
            colorClass="bg-pink-50 text-pink-600"
            onClick={() => navigate('/admin/tags')}
        />
        <MetricCard 
            label="Open Reports" 
            value={metrics.reports.open} 
            icon={<Flag size={18} />} 
            colorClass="bg-red-50 text-red-600"
            onClick={() => navigate('/admin/moderation')}
        />
        <MetricCard 
            label="Total Feedback" 
            value={metrics.feedback.total} 
            icon={<MessageSquare size={18} />} 
            colorClass="bg-teal-50 text-teal-600"
            onClick={() => navigate('/admin/feedback')}
        />
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => navigate('/admin/downloads')}>
            <span className="text-xs font-bold text-slate-500">Download Data</span>
            <span className="text-[10px] text-slate-400 mt-1">Export Reports</span>
        </div>
      </div>

      {/* Quick Status Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-900 dark:text-white">System Health</h3>
                <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">Operational</span>
            </div>
            <div className="space-y-3">
                <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Database</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">Healthy</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Storage</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">24% Used</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Last Backup</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">2 hours ago</span>
                </div>
            </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-900 dark:text-white">Admin Actions</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <button onClick={() => navigate('/admin/users')} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-left hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                    <span className="block text-xs font-bold text-slate-500 mb-1">Users</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">Manage Access</span>
                </button>
                <button onClick={() => navigate('/admin/config')} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-left hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                    <span className="block text-xs font-bold text-slate-500 mb-1">Config</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">System Settings</span>
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};
