
import React, { useEffect, useState } from 'react';
import { AdminTable, Column } from '../components/AdminTable';
import { AdminSummaryBar } from '../components/AdminSummaryBar';
import { AdminReport } from '../types/admin';
import { adminModerationService } from '../services/adminModerationService';
import { AlertCircle, CheckCircle, XCircle, FileText, User, Layers, Info, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { AdminDrawer } from '../components/AdminDrawer';
import { ConfirmActionModal } from '@/components/settings/ConfirmActionModal';
import { formatDate } from '@/utils/formatters';
import { useAdminHeader } from '../layout/AdminLayout';

export const AdminModerationPage: React.FC = () => {
  const { setPageHeader } = useAdminHeader();
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [stats, setStats] = useState({ open: 0, resolved: 0, dismissed: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<AdminReport | null>(null);
  const [filter, setFilter] = useState<'open' | 'resolved' | 'dismissed'>('open');
  const [dateFilter, setDateFilter] = useState('');
  const [resolveTarget, setResolveTarget] = useState<{ id: string; status: 'resolved' | 'dismissed' } | null>(null);
  
  const toast = useToast();

  useEffect(() => {
    setPageHeader(
      "Moderation Queue", 
      "Review and resolve user reports.",
      <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          {['open', 'resolved', 'dismissed'].map((status) => (
              <button 
                  key={status}
                  onClick={() => setFilter(status as any)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg capitalize transition-all ${filter === status ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500'}`}
              >
                  {status}
              </button>
          ))}
      </div>
    );
  }, [filter]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [reportsData, statsData] = await Promise.all([
        adminModerationService.listReports(filter),
        adminModerationService.getStats()
      ]);
      
      let filteredReports = reportsData;
      if (dateFilter) {
          const d = new Date(dateFilter).toDateString();
          filteredReports = reportsData.filter(r => new Date(r.createdAt).toDateString() === d);
      }

      setReports(filteredReports);
      setStats(statsData);
    } catch (e) {
      toast.error("Failed to load reports");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filter, dateFilter]);

  const executeResolution = async () => {
    if (!resolveTarget) return;
    try {
      await adminModerationService.resolveReport(resolveTarget.id, resolveTarget.status);
      setReports(prev => prev.filter(r => r.id !== resolveTarget.id));
      toast.success(resolveTarget.status === 'resolved' ? "Report Resolved" : "Report Dismissed");
      setResolveTarget(null);
      setSelectedReport(null);
      if (filter !== 'open') loadData(); 
    } catch (e) {
      toast.error("Action failed");
    }
  };

  const getTargetIcon = (type: string) => {
    switch (type) {
        case 'nugget': return <FileText size={14} />;
        case 'user': return <User size={14} />;
        case 'collection': return <Layers size={14} />;
        default: return <Info size={14} />;
    }
  };

  const columns: Column<AdminReport>[] = [
    {
      key: 'reason',
      header: 'Reason',
      width: 'w-40',
      render: (r) => (
        <div className="flex items-center gap-2">
            <span className={`p-1.5 rounded-lg ${r.reason === 'spam' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'} dark:bg-opacity-20`}>
                <AlertCircle size={14} />
            </span>
            <span className="font-bold text-slate-900 dark:text-white capitalize">{r.reason}</span>
        </div>
      )
    },
    {
      key: 'reporter',
      header: 'Complainant',
      render: (r) => <span className="text-xs text-slate-600">{r.reporter.name}</span>
    },
    {
      key: 'respondent',
      header: 'Respondent',
      render: (r) => <span className="text-xs font-bold text-slate-700">{r.respondent?.name || 'Unknown'}</span>
    },
    {
      key: 'targetType',
      header: 'Type',
      render: (r) => (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-xs font-medium capitalize">
            {getTargetIcon(r.targetType)} {r.targetType}
        </span>
      )
    },
    {
      key: 'description',
      header: 'Description',
      render: (r) => (
        <span className="text-sm text-slate-500 line-clamp-1 max-w-xs" title={r.description}>{r.description || 'No details provided'}</span>
      )
    },
    {
      key: 'createdAt',
      header: 'Reported',
      render: (r) => <span className="text-xs text-slate-500">{formatDate(r.createdAt, true)}</span>
    },
    {
      key: 'actions',
      header: 'Action',
      render: (r) => (
        <button 
            onClick={() => setSelectedReport(r)}
            className="text-primary-600 hover:text-primary-700 text-xs font-bold"
        >
            Review
        </button>
      )
    }
  ];

  return (
    <div>
      <AdminSummaryBar items={[{label:'Open', value: stats.open}, {label: 'Resolved', value: stats.resolved}]} isLoading={isLoading} />
      
      <AdminTable 
        columns={columns} 
        data={reports} 
        isLoading={isLoading} 
        placeholder="Search reports..."
        filters={
            <input 
                type="date" 
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="pl-3 pr-2 py-1.5 text-[10px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
        }
      />

      <AdminDrawer
        isOpen={!!selectedReport}
        onClose={() => setSelectedReport(null)}
        title="Review Report"
        footer={
            selectedReport?.status === 'open' && (
                <div className="grid grid-cols-2 gap-3 w-full">
                    <button 
                        onClick={() => setResolveTarget({ id: selectedReport.id, status: 'dismissed' })}
                        className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center gap-2 transition-colors"
                    >
                        <XCircle size={16} /> Dismiss
                    </button>
                    <button 
                        onClick={() => setResolveTarget({ id: selectedReport.id, status: 'resolved' })}
                        className="px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 flex items-center justify-center gap-2 transition-colors"
                    >
                        <CheckCircle size={16} /> Take Action
                    </button>
                </div>
            )
        }
      >
        {selectedReport && (
            <div className="space-y-6">
                
                {/* Reporter Info */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Reporter</span>
                        <span className="text-xs text-slate-500">{formatDate(selectedReport.createdAt, true)}</span>
                    </div>
                    <div className="flex items-center gap-2 font-medium text-slate-900 dark:text-white">
                        <User size={16} className="text-slate-400" />
                        {selectedReport.reporter.name}
                    </div>
                </div>

                {/* The Report */}
                <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                        <AlertCircle size={16} className="text-red-500" />
                        Reason: <span className="capitalize">{selectedReport.reason}</span>
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300 bg-red-50 dark:bg-red-900/10 p-3 rounded-xl border border-red-100 dark:border-red-900/20 leading-relaxed">
                        "{selectedReport.description || 'No description provided.'}"
                    </p>
                </div>

                {/* Targeted Content Stub */}
                <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Targeted Content</h3>
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm opacity-80">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 uppercase">{selectedReport.targetType}</span>
                            <span className="text-xs text-slate-400">ID: {selectedReport.targetId}</span>
                        </div>
                        <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center text-slate-400 text-xs italic">
                            Content Preview Stub
                        </div>
                        <div className="mt-3 flex justify-end">
                            <button className="text-xs font-bold text-primary-600 flex items-center gap-1 hover:underline">
                                View Full Entity <ExternalLink size={12} />
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        )}
      </AdminDrawer>

      <ConfirmActionModal 
        isOpen={!!resolveTarget} 
        onClose={() => setResolveTarget(null)} 
        onConfirm={executeResolution} 
        title={resolveTarget?.status === 'resolved' ? "Resolve Report?" : "Dismiss Report?"} 
        description={resolveTarget?.status === 'resolved' ? "This will mark the report as resolved and close the ticket." : "This will dismiss the report without action."}
        actionLabel={resolveTarget?.status === 'resolved' ? "Resolve" : "Dismiss"}
      />
    </div>
  );
};
