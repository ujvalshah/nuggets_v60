import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { BatchRow, ImportMode } from '@/types/batch';
import { batchService } from '@/services/batchService';
import { BatchPreviewTable } from '@/components/batch/BatchPreviewTable';
import { FileSpreadsheet, FileText, Link as LinkIcon, Download, ChevronRight, Loader2, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

export const BulkCreateNuggetsPage: React.FC = () => {
  const { currentUserId } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  // --- State ---
  const [activeTab, setActiveTab] = useState<ImportMode>('links');
  const [rows, setRows] = useState<BatchRow[]>([]);
  const [step, setStep] = useState<'input' | 'review'>('input');
  
  const [linkInput, setLinkInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // --- Handlers ---

  const handleLinksParse = async () => {
    if (!linkInput.trim()) return;
    setIsProcessing(true);
    try {
      const parsed = await batchService.parseLinks(linkInput);
      const withMeta = await batchService.fetchMetadataForRows(parsed);
      setRows(withMeta);
      setStep('review');
    } catch (e) {
      toast.error("Failed to parse links");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'csv' | 'excel') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const parsed = type === 'csv' 
        ? await batchService.parseCSV(file) 
        : await batchService.parseExcel(file);
        
      // If titles are missing, try to fetch meta
      const needsMeta = parsed.some(r => !r.title);
      const finalRows = needsMeta ? await batchService.fetchMetadataForRows(parsed) : parsed;
      
      setRows(finalRows);
      setStep('review');
    } catch (e) {
      console.error(e);
      toast.error(`Failed to parse ${type.toUpperCase()} file`);
    } finally {
      setIsProcessing(false);
      // Reset input
      e.target.value = '';
    }
  };

  const handleImport = async () => {
    setIsProcessing(true);
    try {
      const result = await batchService.createBatch(rows, currentUserId);
      setRows(result);
      
      const successCount = result.filter(r => r.status === 'success').length;
      if (successCount > 0) {
        toast.success(`Successfully created ${successCount} nuggets!`);
      }
    } catch (e) {
      toast.error("Batch creation failed");
    } finally {
      setIsProcessing(false);
    }
  };

  // --- Render Helpers ---

  const downloadTemplate = (type: 'csv' | 'excel') => {
    const headers = ['url', 'title', 'text', 'categories', 'visibility'];
    const row = ['https://example.com', 'Example Title', 'Optional note', 'tech, news', 'public'];
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), row.join(',')].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    // Use .csv for both as content is csv structure in data uri
    const ext = type === 'excel' ? 'csv' : 'csv';
    link.setAttribute("download", `nuggets_template.${ext}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <button onClick={() => navigate('/myspace')} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white mb-4 transition-colors">
            <ArrowLeft size={16} /> Back to My Space
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Batch Nugget Creation
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">Import multiple nuggets at once from links or files.</p>
            </div>
            {step === 'review' && (
                <div className="flex items-center gap-3">
                   <div className="text-sm font-medium text-slate-500">
                      {rows.filter(r => r.selected).length} items selected
                   </div>
                   <button 
                      onClick={handleImport}
                      disabled={isProcessing || rows.filter(r => r.selected && r.status !== 'success').length === 0}
                      className="px-6 py-2 bg-primary-500 text-slate-900 rounded-xl font-bold text-sm hover:bg-primary-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm transition-all"
                   >
                      {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                      Import Selected
                   </button>
                </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        
        {step === 'input' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden min-h-[500px] flex flex-col">
            {/* Tabs */}
            <div className="flex border-b border-slate-100 dark:border-slate-800">
              <button 
                onClick={() => setActiveTab('links')}
                className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'links' ? 'border-primary-500 text-slate-900 dark:text-white bg-primary-50/50 dark:bg-primary-900/10' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
              >
                <LinkIcon size={18} /> Paste Links
              </button>
              <button 
                onClick={() => setActiveTab('csv')}
                className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'csv' ? 'border-primary-500 text-slate-900 dark:text-white bg-primary-50/50 dark:bg-primary-900/10' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
              >
                <FileText size={18} /> Import CSV
              </button>
              <button 
                onClick={() => setActiveTab('excel')}
                className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'excel' ? 'border-primary-500 text-slate-900 dark:text-white bg-primary-50/50 dark:bg-primary-900/10' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
              >
                <FileSpreadsheet size={18} /> Import Excel
              </button>
            </div>

            <div className="p-8 flex-1 flex flex-col">
              
              {/* LINK MODE */}
              {activeTab === 'links' && (
                <div className="flex flex-col h-full max-w-2xl mx-auto w-full gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-200">Paste URLs (one per line)</label>
                    <textarea 
                      value={linkInput}
                      onChange={(e) => setLinkInput(e.target.value)}
                      placeholder="https://example.com/article-1&#10;https://example.com/article-2"
                      className="w-full h-64 p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm resize-none"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button 
                      onClick={handleLinksParse}
                      disabled={!linkInput.trim() || isProcessing}
                      className="px-8 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold hover:opacity-90 disabled:opacity-50 flex items-center gap-2 transition-all shadow-lg shadow-primary-500/20"
                    >
                      {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <>Next <ChevronRight size={18} /></>}
                    </button>
                  </div>
                </div>
              )}

              {/* FILE MODES */}
              {(activeTab === 'csv' || activeTab === 'excel') && (
                <div className="flex flex-col items-center justify-center h-full gap-6 max-w-xl mx-auto w-full text-center">
                   <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 mb-2">
                      {activeTab === 'csv' ? <FileText size={40} /> : <FileSpreadsheet size={40} />}
                   </div>
                   
                   <div>
                     <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Upload your {activeTab === 'csv' ? 'CSV' : 'Excel'} file</h3>
                     <p className="text-sm text-slate-500 dark:text-slate-400">
                       Ensure your file has headers: <code>url, title, text, categories, visibility</code>
                     </p>
                   </div>

                   <div className="flex flex-col gap-4 w-full max-w-sm">
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 dark:border-slate-700 border-dashed rounded-xl cursor-pointer bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <p className="mb-2 text-sm text-slate-500 dark:text-slate-400 group-hover:text-primary-600 transition-colors font-bold">Click to upload</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">or drag and drop</p>
                          </div>
                          <input type="file" className="hidden" accept={activeTab === 'csv' ? ".csv" : ".xlsx, .xls"} onChange={(e) => handleFileUpload(e, activeTab === 'csv' ? 'csv' : 'excel')} />
                      </label>

                      <button 
                        onClick={() => downloadTemplate(activeTab === 'csv' ? 'csv' : 'excel')}
                        className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center justify-center gap-1.5 py-2 hover:bg-primary-50 rounded-lg transition-colors"
                      >
                         <Download size={14} /> Download {activeTab.toUpperCase()} Template
                      </button>
                   </div>
                   
                   {isProcessing && <div className="flex items-center gap-2 text-sm font-bold text-slate-500"><Loader2 size={16} className="animate-spin" /> Parsing file...</div>}
                </div>
              )}
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="space-y-4">
             <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Review & Edit ({rows.length} items)</h2>
                <button onClick={() => { setRows([]); setStep('input'); }} className="text-sm font-bold text-red-500 hover:text-red-600">Discard All</button>
             </div>
             
             <BatchPreviewTable 
                rows={rows}
                onUpdateRow={(id, updates) => setRows(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r))}
                onRemoveRow={(id) => setRows(prev => prev.filter(r => r.id !== id))}
                onRetryRow={async (id) => {
                   const row = rows.find(r => r.id === id);
                   if (!row) return;
                   // Simple retry logic: just refetch meta
                   const [updated] = await batchService.fetchMetadataForRows([{ ...row, status: 'pending', errorMessage: undefined }]);
                   setRows(prev => prev.map(r => r.id === id ? updated : r));
                }}
             />
          </div>
        )}

      </div>
    </div>
  );
};
