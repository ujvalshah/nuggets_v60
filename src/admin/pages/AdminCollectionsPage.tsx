
import React, { useEffect, useState, useMemo } from 'react';
import { AdminTable, Column } from '../components/AdminTable';
import { AdminSummaryBar } from '../components/AdminSummaryBar';
import { AdminCollection } from '../types/admin';
import { adminCollectionsService } from '../services/adminCollectionsService';
import { Eye, Trash2, Lock, Globe, EyeOff, Folder, Layers } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { AdminDrawer } from '../components/AdminDrawer';
import { ConfirmActionModal } from '@/components/settings/ConfirmActionModal';
import { useAdminPermissions } from '../hooks/useAdminPermissions';
import { formatDate } from '@/utils/formatters';
import { useAdminHeader } from '../layout/AdminLayout';

export const AdminCollectionsPage: React.FC = () => {
  const { setPageHeader } = useAdminHeader();
  const [collections, setCollections] = useState<AdminCollection[]>([]);
  const [stats, setStats] = useState({ totalCommunity: 0, totalNuggetsInCommunity: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCollection, setSelectedCollection] = useState<AdminCollection | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Sorting & Filtering
  const [sortKey, setSortKey] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [dateFilter, setDateFilter] = useState('');

  // Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toast = useToast();
  const { can } = useAdminPermissions();

  const loadData = async (q?: string) => {
    setIsLoading(true);
    try {
      const [colsData, statsData] = await Promise.all([
        adminCollectionsService.listCollections(q),
        adminCollectionsService.getStats()
      ]);
      setCollections(colsData);
      setStats(statsData);
    } catch (e) {
      toast.error("Failed to load collections");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setPageHeader("Collections", "Review and manage user collections.");
    loadData();
  }, []);

  // Derived state
  const processedCollections = useMemo(() => {
    let result = [...collections];
    
    // Date Filter
    if (dateFilter) {
      const filterDate = new Date(dateFilter).toDateString();
      result = result.filter(c => new Date(c.createdAt).toDateString() === filterDate);
    }

    result.sort((a, b) => {
      let valA: any = a[sortKey as keyof AdminCollection] || '';
      let valB: any = b[sortKey as keyof AdminCollection] || '';

      if (sortKey === 'creator') {
        valA = a.creator.name.toLowerCase();
        valB = b.creator.name.toLowerCase();
      } else if (sortKey === 'createdAt') {
        valA = new Date(a.createdAt).getTime();
        valB = new Date(b.createdAt).getTime();
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [collections, dateFilter, sortKey, sortDirection]);

  const handleDelete = async () => {
    if (!selectedCollection) return;
    try {
      await adminCollectionsService.deleteCollection(selectedCollection.id);
      setCollections(prev => prev.filter(c => c.id !== selectedCollection.id));
      const newStats = await adminCollectionsService.getStats();
      setStats(newStats);
      toast.success("Collection deleted");
      setSelectedCollection(null);
      setShowDeleteConfirm(false);
    } catch (e) {
      toast.error("Delete failed");
    }
  };

  const handleToggleStatus = async (col: AdminCollection) => {
    const newStatus = col.status === 'active' ? 'hidden' : 'active';
    try {
        await adminCollectionsService.updateCollectionStatus(col.id, newStatus);
        setCollections(prev => prev.map(c => c.id === col.id ? { ...c, status: newStatus } : c));
        toast.success(`Collection is now ${newStatus}`);
    } catch(e) {
        toast.error("Status update failed");
    }
  };

  const handleBulkAction = (action: string) => {
      toast.info(`${action} ${selectedIds.length} items (Not implemented)`);
      setSelectedIds([]);
  };

  const columns: Column<AdminCollection>[] = [
    {
      key: 'name',
      header: 'Collection Name',
      width: 'w-72',
      minWidth: '250px',
      sortable: true,
      sticky: 'left',
      render: (c) => (
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500">
             <Folder size={16} />
          </div>
          <div className="min-w-0">
              <div className="font-bold text-slate-900 dark:text-white truncate">{c.name}</div>
              {c.status === 'hidden' && <span className="text-[9px] px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-500 rounded font-bold uppercase">Hidden</span>}
          </div>
        </div>
      )
    },
    {
      key: 'creator',
      header: 'Owner',
      width: 'w-40',
      minWidth: '150px',
      sortable: true,
      sortKey: 'creator',
      render: (c) => <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{c.creator.name}</span>
    },
    {
      key: 'type',
      header: 'Visibility',
      width: 'w-24',
      minWidth: '100px',
      sortable: true,
      render: (c) => (
        <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-slate-500">
            {c.type === 'private' ? <Lock size={12} /> : <Globe size={12} />}
            {c.type}
        </span>
      )
    },
    {
      key: 'followerCount',
      header: 'Followers',
      width: 'w-24',
      minWidth: '100px',
      sortable: true,
      align: 'center',
      render: (c) => <span className="text-xs font-bold">{c.followerCount}</span>
    },
    {
      key: 'itemCount',
      header: 'Nuggets',
      width: 'w-24',
      minWidth: '100px',
      sortable: true,
      align: 'center',
      render: (c) => <span className="text-xs font-bold">{c.itemCount}</span>
    },
    {
      key: 'createdDate',
      header: 'Date',
      width: 'w-32',
      minWidth: '120px',
      sortable: true,
      sortKey: 'createdAt',
      render: (c) => <span className="text-xs text-slate-500">{new Date(c.createdAt).toLocaleDateString()}</span>
    },
    {
      key: 'createdTime',
      header: 'Time',
      width: 'w-24',
      minWidth: '100px',
      render: (c) => <span className="text-xs text-slate-400">{new Date(c.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      width: 'w-24',
      minWidth: '100px',
      sticky: 'right',
      render: (c) => (
        <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
          {can('admin.collections.view') && (
             <button 
                onClick={() => setSelectedCollection(c)}
                className="flex items-center gap-1.5 px-2 py-1.5 md:px-3 md:py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
             >
                <Eye size={14} /> <span className="hidden md:inline">View</span>
             </button>
          )}
          {can('admin.collections.edit') && (
             <button 
                onClick={() => handleToggleStatus(c)}
                className="flex items-center gap-1.5 px-2 py-1.5 md:px-3 md:py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                title={c.status === 'active' ? "Hide" : "Unhide"}
             >
                {c.status === 'active' ? <EyeOff size={14} /> : <Eye size={14} />}
             </button>
          )}
        </div>
      )
    }
  ];

  const BulkActions = selectedIds.length > 0 ? (
      <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2 duration-200">
          <span className="text-xs font-bold text-slate-500">{selectedIds.length} selected</span>
          <button onClick={() => handleBulkAction('hide')} className="px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-[10px] font-bold transition-colors">Hide</button>
          <button onClick={() => handleBulkAction('delete')} className="px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-[10px] font-bold transition-colors">Delete</button>
      </div>
  ) : null;

  return (
    <div>
      <AdminSummaryBar 
        items={[
          { label: 'Community Collections', value: stats.totalCommunity, icon: <Layers size={18} /> },
          { label: 'Total Nuggets', value: stats.totalNuggetsInCommunity, icon: <Folder size={18} />, hint: 'In public collections' },
        ]}
        isLoading={isLoading}
      />

      <AdminTable 
        columns={columns} 
        data={processedCollections} 
        isLoading={isLoading} 
        actions={BulkActions}
        onSearch={(q) => loadData(q)} 
        placeholder="Search collections..."
        
        // Add date filter to toolbar
        filters={
            <input 
                type="date" 
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="ml-2 pl-3 pr-2 py-1.5 text-[10px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
        }
        
        sortKey={sortKey}
        sortDirection={sortDirection}
        onSortChange={(k, d) => { setSortKey(k); setSortDirection(d); }}
        
        onRowClick={(c) => setSelectedCollection(c)}
        selection={{
            enabled: true,
            selectedIds: selectedIds,
            onSelect: setSelectedIds
        }}
      />

      <AdminDrawer
        isOpen={!!selectedCollection}
        onClose={() => setSelectedCollection(null)}
        title="Collection Details"
        width="lg"
        footer={
            <div className="flex justify-between w-full">
                {can('admin.collections.edit') && (
                    <button 
                        onClick={() => setShowDeleteConfirm(true)} 
                        className="flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg text-sm font-bold transition-colors"
                    >
                        <Trash2 size={16} /> Delete
                    </button>
                )}
            </div>
        }
      >
        {selectedCollection && (
            <div className="space-y-6">
                <div className="flex gap-4">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 shrink-0">
                        <Folder size={32} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight mb-1">{selectedCollection.name}</h2>
                        <p className="text-sm text-slate-500">{selectedCollection.description || 'No description provided.'}</p>
                    </div>
                </div>
            </div>
        )}
      </AdminDrawer>

      <ConfirmActionModal 
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Collection?"
        description="This will permanently delete the collection. The nuggets inside will not be deleted."
        actionLabel="Delete"
        isDestructive
      />
    </div>
  );
};
