
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminTable, Column } from '../components/AdminTable';
import { AdminFeedback } from '../types/admin';
import { adminFeedbackService } from '../services/adminFeedbackService';
import { MessageSquare, Check, Archive, Trash2, User } from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import { formatDate } from '../../utils/formatters';
import { Avatar } from '../../components/shared/Avatar';
import { useAdminHeader } from '../layout/AdminLayout';

export const AdminFeedbackPage: React.FC = () => {
  const { setPageHeader } = useAdminHeader();
  const [feedback, setFeedback] = useState<AdminFeedback[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'new' | 'read' | 'archived'>('new');
  const [dateFilter, setDateFilter] = useState('');
  
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    setPageHeader(
      "User Feedback", 
      "Listen to your users.",
      <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl items-center gap-2">
          <div className="flex">
              {['new', 'read', 'archived'].map(s => (
                  <button key={s} onClick={() => setFilter(s as any)} className={`px-3 py-1.5 text-xs font-bold capitalize rounded-lg transition-all ${filter === s ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}>{s}</button>
              ))}
          </div>
          <input 
              type="date" 
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="pl-3 pr-2 py-1.5 text-[10px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
      </div>
    );
  }, [filter, dateFilter]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await adminFeedbackService.listFeedback(filter);
      
      let filtered = data;
      if (dateFilter) {
          const d = new Date(dateFilter).toDateString();
          filtered = data.filter(f => new Date(f.createdAt).toDateString() === d);
      }

      setFeedback(filtered);
    } catch (e) {
      toast.error("Failed to load feedback");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filter, dateFilter]);

  const handleStatus = async (id: string, status: 'read' | 'archived') => {
      await adminFeedbackService.updateStatus(id, status);
      setFeedback(prev => prev.filter(f => f.id !== id));
      toast.success("Updated");
  };

  const columns: Column<AdminFeedback>[] = [
    {
      key: 'type',
      header: 'Type',
      width: 'w-24',
      render: (f) => (
        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
            f.type === 'bug' ? 'bg-red-100 text-red-600' :
            f.type === 'feature' ? 'bg-purple-100 text-purple-600' :
            'bg-slate-100 text-slate-600'
        }`}>
            {f.type}
        </span>
      )
    },
    {
      key: 'content',
      header: 'Feedback',
      render: (f) => <p className="text-sm text-slate-700 dark:text-slate-300 font-medium leading-relaxed">{f.content}</p>
    },
    {
      key: 'user',
      header: 'User',
      width: 'w-56',
      render: (f) => f.user ? (
          <div 
            className="flex items-center gap-3 cursor-pointer group"
            onClick={(e) => { e.stopPropagation(); navigate(`/profile/${f.user!.id}`); }}
          >
              <Avatar name={f.user.name} size="sm" src={f.user.avatar} />
              <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-primary-600 group-hover:underline">{f.user.fullName || f.user.name}</div>
                  <div className="text-[10px] text-slate-500">@{f.user.username}</div>
              </div>
          </div>
      ) : (
          <div className="flex items-center gap-2 text-xs text-slate-400">
              <User size={14} /> Anonymous
          </div>
      )
    },
    {
      key: 'date',
      header: 'Date',
      width: 'w-32',
      render: (f) => <span className="text-xs text-slate-400">{new Date(f.createdAt).toLocaleDateString()}</span>
    },
    {
      key: 'time',
      header: 'Time',
      width: 'w-24',
      render: (f) => <span className="text-xs text-slate-400">{new Date(f.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      width: 'w-32',
      render: (f) => (
          <div className="flex justify-end gap-2">
              {f.status === 'new' && (
                  <button onClick={() => handleStatus(f.id, 'read')} className="p-1.5 text-green-600 hover:bg-green-50 rounded" title="Mark Read"><Check size={14} /></button>
              )}
              {f.status !== 'archived' && (
                  <button onClick={() => handleStatus(f.id, 'archived')} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded" title="Archive"><Archive size={14} /></button>
              )}
          </div>
      )
    }
  ];

  return (
    <div>
      <AdminTable columns={columns} data={feedback} isLoading={isLoading} />
    </div>
  );
};
