import React, { useEffect, useState, useCallback } from 'react';
import { AdminTable, Column } from '../components/AdminTable';
import { AdminSummaryBar } from '../components/AdminSummaryBar';
import { AdminReport } from '../types/admin';
import { adminModerationService } from '../services/adminModerationService';
import { AlertCircle, CheckCircle, XCircle, FileText, User, Layers, Info, ChevronDown, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { formatDate } from '@/utils/formatters';
import { useAdminHeader } from '../layout/AdminLayout';
import { useSearchParams } from 'react-router-dom';
import { ReportContentPreview } from '../components/ReportContentPreview';

export const AdminModerationPage: React.FC = () => {
  const { setPageHeader } = useAdminHeader();
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [stats, setStats] = useState({ open: 0, resolved: 0, dismissed: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filter, setFilter] = useState<'open' | 'resolved' | 'dismissed'>('open');
  const [dateFilter, setDateFilter] = useState('');
  const [pendingActions, setPendingActions] = useState<Set<string>>(new Set());
  
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

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

  // ONE-TIME URL → STATE HYDRATION: Read URL params ONCE on mount only
  useEffect(() => {
    const statusParam = searchParams.get('status');
    const date = searchParams.get('date');
    if (statusParam === 'open' || statusParam === 'resolved' || statusParam === 'dismissed') {
      setFilter(statusParam);
    }
    if (date) {
      setDateFilter(date);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // STATE-DRIVEN DATA LOADING: Loads whenever filter or dateFilter changes
  // No initialization gates - data loads immediately based on state
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const activeFilter = filter || 'open';
      
      const [reportsData, statsData] = await Promise.all([
        adminModerationService.listReports(activeFilter),
        adminModerationService.getStats()
      ]);
      
      let filteredReports = reportsData;
      if (dateFilter && dateFilter.trim() !== '') {
          const d = new Date(dateFilter).toDateString();
          filteredReports = reportsData.filter(r => new Date(r.createdAt).toDateString() === d);
      }

      setReports(filteredReports);
      setStats(statsData);
      setErrorMessage(null);
    } catch (e: any) {
      console.error('[AdminModeration] Error loading reports:', e);
      if (e.message !== 'Request cancelled') {
        setErrorMessage("Could not load reports. Please retry.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [filter, dateFilter]);

  // Load data whenever filter or dateFilter state changes
  useEffect(() => {
    loadData();
  }, [loadData]);

  // PASSIVE URL SYNC: Write-only side-effect that syncs state to URL
  // Never reads from URL - only writes state changes to URL
  useEffect(() => {
    const params: Record<string, string> = {};
    if (filter) params.status = filter;
    if (dateFilter) params.date = dateFilter;
    setSearchParams(params, { replace: true });
  }, [filter, dateFilter, setSearchParams]);

  const executeAction = async (reportId: string, action: 'resolved' | 'dismissed') => {
    // Prevent duplicate actions
    if (pendingActions.has(reportId)) {
      return;
    }

    // Store previous state for rollback
    const prevReports = [...reports];
    const prevStats = { ...stats };
    
    // Optimistic UI update: Remove from list and update counts
    setPendingActions(prev => new Set(prev).add(reportId));
    setReports(prev => prev.filter(r => r.id !== reportId));
    setSelectedIds(prev => prev.filter(id => id !== reportId));
    if (expandedRowId === reportId) {
      setExpandedRowId(null);
    }
    
    // Update stats optimistically
    if (filter === 'open') {
      setStats(prev => ({
        ...prev,
        open: Math.max(0, prev.open - 1),
        [action === 'resolved' ? 'resolved' : 'dismissed']: prev[action === 'resolved' ? 'resolved' : 'dismissed'] + 1
      }));
    }
    
    try {
      // Call appropriate service method
      await (action === 'resolved' 
        ? adminModerationService.resolveReport(reportId)
        : adminModerationService.dismissReport(reportId));
      
      toast.success(action === 'resolved' ? "Report Resolved" : "Report Dismissed");
      
      // Refresh stats to ensure consistency
      try {
        const freshStats = await adminModerationService.getStats();
        setStats(freshStats);
      } catch (e) {
        // Stats refresh failed, but action succeeded - non-critical
        console.warn('[AdminModeration] Failed to refresh stats:', e);
      }
      
      // If viewing resolved/dismissed tab, refresh list to show the new item
      if (filter === action) {
        loadData();
      }
    } catch (e: any) {
      // Rollback on failure
      setReports(prevReports);
      setStats(prevStats);
      
      const errorMessage = e.message || (e.response?.data?.message) || "Action failed. Changes reverted.";
      toast.error(errorMessage);
    } finally {
      setPendingActions(prev => {
        const next = new Set(prev);
        next.delete(reportId);
        return next;
      });
    }
  };

  const executeBulkAction = async (action: 'resolved' | 'dismissed') => {
    if (selectedIds.length === 0) return;

    const idsToProcess = [...selectedIds];
    const prevReports = [...reports];

    // Optimistic update: Remove all selected from list
    idsToProcess.forEach(id => setPendingActions(prev => new Set(prev).add(id)));
    setReports(prev => prev.filter(r => !idsToProcess.includes(r.id)));
    setSelectedIds([]);
    setExpandedRowId(null);

    // Update stats optimistically
    if (filter === 'open') {
      setStats(prev => ({
        ...prev,
        open: Math.max(0, prev.open - idsToProcess.length),
        [action === 'resolved' ? 'resolved' : 'dismissed']: prev[action === 'resolved' ? 'resolved' : 'dismissed'] + idsToProcess.length
      }));
    }

    // Process all actions in parallel
    const results = await Promise.allSettled(
      idsToProcess.map(id => 
        action === 'resolved' 
          ? adminModerationService.resolveReport(id)
          : adminModerationService.dismissReport(id)
      )
    );

    // Check for failures
    const failedIds: string[] = [];
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        failedIds.push(idsToProcess[index]);
      }
    });

    if (failedIds.length > 0) {
      // Rollback only failed items
      const failedReports = prevReports.filter(r => failedIds.includes(r.id));
      setReports(prev => [...prev, ...failedReports].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
      setSelectedIds(prev => [...prev, ...failedIds]);
      
      // Rollback stats for failed items
      if (filter === 'open') {
        setStats(prev => ({
          ...prev,
          open: prev.open + failedIds.length,
          [action === 'resolved' ? 'resolved' : 'dismissed']: prev[action === 'resolved' ? 'resolved' : 'dismissed'] - failedIds.length
        }));
      }

      toast.error(`${failedIds.length} of ${idsToProcess.length} actions failed. Changes reverted for failed items.`);
    } else {
      toast.success(`${idsToProcess.length} reports ${action === 'resolved' ? 'resolved' : 'dismissed'}`);
    }

    // Clean up pending actions
    idsToProcess.forEach(id => {
      setPendingActions(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    });

    // Refresh stats
    try {
      const freshStats = await adminModerationService.getStats();
      setStats(freshStats);
    } catch (e) {
      console.warn('[AdminModeration] Failed to refresh stats:', e);
    }

    // Refresh list if viewing target tab
    if (filter === action) {
      loadData();
    }
  };

  const handleRowClick = (report: AdminReport) => {
    setExpandedRowId(expandedRowId === report.id ? null : report.id);
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
      header: '',
      width: 'w-12',
      align: 'right',
      render: (r) => (
        <div className="flex items-center justify-end">
          {expandedRowId === r.id ? (
            <ChevronDown size={16} className="text-slate-400" />
          ) : (
            <ChevronRight size={16} className="text-slate-400" />
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-4">
      {errorMessage && (
        <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span>{errorMessage}</span>
          <button
            onClick={loadData}
            className="px-3 py-1 rounded-md bg-amber-100 text-amber-900 font-semibold hover:bg-amber-200 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      <AdminSummaryBar items={[{label:'Open', value: stats.open}, {label: 'Resolved', value: stats.resolved}]} isLoading={isLoading} />
      
      <AdminTable 
        columns={columns} 
        data={reports} 
        isLoading={isLoading} 
        virtualized
        placeholder="Search reports..."
        emptyState={
          <div className="flex flex-col items-center justify-center text-slate-500 space-y-2">
            <p className="text-sm font-semibold">No reports match the current filters.</p>
            <p className="text-xs text-slate-400">Try changing the status filter or date range.</p>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => { setFilter('open'); setDateFilter(''); loadData(); }}
                className="px-3 py-1 text-xs font-bold rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
              >
                Clear filters
              </button>
              <button
                onClick={loadData}
                className="px-3 py-1 text-xs font-bold rounded-md bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        }
        onRowClick={handleRowClick}
        expandedRowId={expandedRowId}
        expandedRowContent={(report) => (
          <div className="space-y-4">
            {/* Report Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle size={16} className="text-red-500" />
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Report Details</h4>
                </div>
                <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-lg">
                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">Reason</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white capitalize">{report.reason}</p>
                  {report.description && (
                    <>
                      <p className="text-xs font-bold text-slate-400 uppercase mt-3 mb-1">Description</p>
                      <p className="text-sm text-slate-600 dark:text-slate-300">{report.description}</p>
                    </>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Reporter Info</h4>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <User size={14} className="text-slate-400" />
                    <span className="text-sm font-medium text-slate-900 dark:text-white">{report.reporter.name}</span>
                  </div>
                  <p className="text-xs text-slate-500">{formatDate(report.createdAt, true)}</p>
                </div>
              </div>
            </div>

            {/* Content Preview */}
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Reported Content</h4>
              <ReportContentPreview targetId={report.targetId} targetType={report.targetType} />
            </div>

            {/* Inline Actions */}
            {report.status === 'open' && !pendingActions.has(report.id) && (
              <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    executeAction(report.id, 'dismissed');
                  }}
                  disabled={pendingActions.has(report.id)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <XCircle size={16} /> Dismiss
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    executeAction(report.id, 'resolved');
                  }}
                  disabled={pendingActions.has(report.id)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle size={16} /> Resolve
                </button>
              </div>
            )}
          </div>
        )}
        selection={{
          selectedIds,
          onSelect: setSelectedIds,
          enabled: true
        }}
        actions={
          selectedIds.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600 dark:text-slate-400">
                {selectedIds.length} selected
              </span>
              <button
                onClick={() => executeBulkAction('dismissed')}
                disabled={selectedIds.some(id => pendingActions.has(id))}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <XCircle size={14} /> Dismiss All
              </button>
              <button
                onClick={() => executeBulkAction('resolved')}
                disabled={selectedIds.some(id => pendingActions.has(id))}
                className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle size={14} /> Resolve All
              </button>
            </div>
          )
        }
        filters={
            <input 
                type="date" 
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="pl-3 pr-2 py-1.5 text-[10px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
        }
      />

    </div>
  );
};
