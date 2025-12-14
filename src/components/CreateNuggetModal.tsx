import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { X, Check, Loader2, Globe, Lock, Paperclip, FileText, ChevronDown, Layers, Sparkles } from 'lucide-react';
import { Badge } from './UI/Badge';
import { RichTextEditor } from './RichTextEditor';
import { normalizeCategoryLabel, getInitials } from '@/utils/formatters';
import { storageService } from '@/services/storageService';
import { detectProviderFromUrl } from '@/utils/urlUtils';
import { queryClient } from '@/queryClient';
import { GenericLinkPreview } from './embeds/GenericLinkPreview';
import { Collection } from '@/types';
import { Image } from './Image';
import { useAuth } from '@/hooks/useAuth';
import { aiService } from '@/services/aiService';
import { useToast } from '@/hooks/useToast';

interface CreateNuggetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FileAttachment {
  file: File;
  previewUrl: string;
  type: 'image' | 'document';
}

const MAX_FILE_SIZE = 1024 * 1024; // 1MB

export const CreateNuggetModal: React.FC<CreateNuggetModalProps> = ({ isOpen, onClose }) => {
  // Auth
  const { currentUser, currentUserId, isAdmin } = useAuth();
  const authorName = currentUser?.name || 'User';
  const navigate = useNavigate();
  const toast = useToast();

  // Content State
  const [content, setContent] = useState('');
  const [detectedLink, setDetectedLink] = useState<string | null>(null);
  
  // Attachments
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Metadata State
  const [categories, setCategories] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  
  // Identity State (Admin Only)
  const [postAs, setPostAs] = useState<'me' | 'alias'>('me');
  const [selectedAlias, setSelectedAlias] = useState('');
  const [customAlias, setCustomAlias] = useState('');
  const [availableAliases, setAvailableAliases] = useState<string[]>([]);
  
  // Data Source State
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [allCollections, setAllCollections] = useState<Collection[]>([]);
  
  // UI State
  const [isCatDropdownOpen, setIsCatDropdownOpen] = useState(false);
  const [categoryInput, setCategoryInput] = useState('');
  
  const [isColDropdownOpen, setIsColDropdownOpen] = useState(false);
  const [collectionInput, setCollectionInput] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  const loadData = async () => {
    try {
      const [cats, cols] = await Promise.all([
        storageService.getCategories(),
        storageService.getCollections()
      ]);
      setAvailableCategories(cats || []);
      setAllCollections(cols || []);
      setAvailableAliases([]); // Content aliases feature not yet implemented
      setSelectedAlias("Custom...");
    } catch (e) {
      console.error("Failed to load metadata", e);
    }
  };

  const resetForm = () => {
    setContent('');
    setDetectedLink(null);
    setAttachments([]);
    setCategories([]);
    setVisibility('public');
    setSelectedCollections([]);
    setCategoryInput('');
    setCollectionInput('');
    setPostAs('me');
    setCustomAlias('');
    setError(null);
    setIsAiLoading(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  useEffect(() => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const matches = content.match(urlRegex);
    if (matches && matches.length > 0) {
       const firstLink = matches[0];
       if (firstLink !== detectedLink) {
           setDetectedLink(firstLink);
       }
    } else {
        if (detectedLink && !content.includes(detectedLink)) {
            setDetectedLink(null);
        }
    }
  }, [content, detectedLink]);

  const addCategory = async (cat: string) => {
    const normalized = normalizeCategoryLabel(cat);
    if (normalized) {
        const cleanCat = normalized.replace(/^#/, '');
        if (!categories.includes(cleanCat)) {
            setCategories([...categories, cleanCat]);
            setCategoryInput('');
            if (!availableCategories.includes(cleanCat)) {
                await storageService.addCategory(cleanCat);
                setAvailableCategories(prev => [...prev, cleanCat].sort());
            }
        }
    }
  };

  const toggleCollection = (colName: string) => {
    if (selectedCollections.includes(colName)) {
      setSelectedCollections(selectedCollections.filter(c => c !== colName));
    } else {
      setSelectedCollections([...selectedCollections, colName]);
    }
    setCollectionInput('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;

      const newAttachments: FileAttachment[] = [];
      
      for (let i = 0; i < files.length; i++) {
          const file = files[i];
          if (file.type.match(/(application\/x-msdownload|application\/x-sh|text\/javascript)/)) {
              setError("Script/Executable files are not allowed.");
              continue;
          }
          if (file.size > MAX_FILE_SIZE) {
              setError(`File "${file.name}" exceeds 1MB limit.`);
              continue;
          }
          const isImage = file.type.startsWith('image/');
          newAttachments.push({
              file,
              previewUrl: URL.createObjectURL(file),
              type: isImage ? 'image' : 'document'
          });
      }
      setAttachments(prev => [...prev, ...newAttachments]);
      setError(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
      setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = error => reject(error);
      });
  };

  // --- AI HANDLER ---
  const handleAISummarize = async () => {
    if (!content || content.length < 10) {
        toast.error("Please enter some text to summarize first.");
        return;
    }
    
    setIsAiLoading(true);
    try {
        const summary = await aiService.summarizeText(content);
        
        // Safety check if summarization failed silently or returned empty
        if (!summary.title && !summary.excerpt) {
            throw new Error("Empty summary received");
        }

        // Update content with structured format (Title + Summary)
        const formattedContent = `**${summary.title}**\n\n${summary.excerpt}`;
        setContent(formattedContent);
        
        // Add unique categories safely
        const returnedTags = Array.isArray(summary.tags) ? summary.tags : [];
        const newCats = returnedTags.filter(tag => !categories.includes(tag));
        
        if (newCats.length > 0) {
            setCategories(prev => [...prev, ...newCats]);
            // Optimistically add to available if missing
            newCats.forEach(cat => {
                if (!availableCategories.includes(cat)) {
                    setAvailableCategories(prev => [...prev, cat]);
                }
            });
        }
        
        toast.success("Nugget summarized by AI ✨");
    } catch (e) {
        console.error(e);
        toast.error("Failed to generate summary. Try again.");
    } finally {
        setIsAiLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!content.trim() && attachments.length === 0) return;
    setIsSubmitting(true);
    try {
        const derivedTitle = content.split('\n')[0].replace(/\*\*/g, '').substring(0, 80).trim() || 'Untitled Nugget';
        const wordCount = content.trim().split(/\s+/).length;
        const readTime = Math.max(1, Math.ceil(wordCount / 200));

        const uploadedImages: string[] = [];
        const uploadedDocs: any[] = [];

        for (const att of attachments) {
            const base64 = await convertFileToBase64(att.file);
            if (att.type === 'image') {
                uploadedImages.push(base64);
            } else {
                uploadedDocs.push({
                    title: att.file.name,
                    url: base64,
                    type: att.file.name.split('.').pop() || 'file',
                    size: (att.file.size / 1024).toFixed(0) + 'KB'
                });
            }
        }

        const finalAliasName = selectedAlias === 'Custom...' ? customAlias : selectedAlias;

        const newArticle = await storageService.createArticle({
            title: derivedTitle,
            content: content,
            excerpt: content.substring(0, 150) + (content.length > 150 ? '...' : ''),
            author: { id: currentUserId, name: authorName },
            displayAuthor: (postAs === 'alias' && finalAliasName.trim()) ? { name: finalAliasName.trim() } : undefined,
            categories,
            tags: [], 
            readTime,
            images: uploadedImages,
            documents: uploadedDocs,
            visibility, // Pass visibility state
            media: detectedLink ? {
                type: detectProviderFromUrl(detectedLink),
                url: detectedLink,
                previewMetadata: {
                    url: detectedLink,
                    title: 'New Link', 
                }
            } : null,
            source_type: detectedLink ? 'link' : 'text'
        });

        const allCols = await storageService.getCollections();
        for (const colName of selectedCollections) {
            let targetCol = allCols.find(c => c.name === colName);
            if (!targetCol) {
                targetCol = await storageService.createCollection(colName, '', currentUserId, visibility);
            }
            await storageService.addArticleToCollection(targetCol.id, newArticle.id, currentUserId);
        }

        await queryClient.invalidateQueries({ queryKey: ['articles'] });
        handleClose();
    } catch (e) {
        console.error("Failed to create nugget", e);
        setError("Failed to post nugget. Please try again.");
    } finally {
        setIsSubmitting(false);
    }
  };

  const visibleCollections = (allCollections || []).filter(c => c.type === visibility);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={handleClose} />
      
      <div className="relative w-full h-full sm:h-auto sm:max-h-[85vh] sm:max-w-xl bg-white dark:bg-slate-900 sm:rounded-2xl shadow-2xl flex flex-col animate-in zoom-in-95 fade-in duration-200 border border-slate-200 dark:border-slate-800 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 z-20 shrink-0">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Create Nugget</h2>
            <button onClick={handleClose} className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                <X size={18} />
            </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-white dark:bg-slate-900">
            <div className="p-4 space-y-4"> 
                {/* Identity & Visibility */}
                <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                    
                    {/* Identity Selector (Admin Only) */}
                    {isAdmin ? (
                        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                            <button 
                                onClick={() => setPostAs('me')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${postAs === 'me' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Me
                            </button>
                            <button 
                                onClick={() => setPostAs('alias')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${postAs === 'alias' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Alias
                            </button>
                            
                            {postAs === 'alias' && (
                                <div className="flex items-center gap-2">
                                    <select 
                                        value={selectedAlias} 
                                        onChange={(e) => setSelectedAlias(e.target.value)} 
                                        className="bg-transparent border-b border-slate-300 dark:border-slate-600 px-2 py-0.5 text-xs font-medium focus:outline-none focus:border-primary-500 dark:text-white cursor-pointer"
                                    >
                                        {availableAliases.map(a => <option key={a} value={a}>{a}</option>)}
                                        <option value="Custom...">Custom...</option>
                                    </select>
                                    
                                    {selectedAlias === 'Custom...' && (
                                        <input 
                                            autoFocus
                                            className="w-24 bg-transparent border-b border-slate-300 dark:border-slate-600 px-2 py-0.5 text-xs font-medium focus:outline-none focus:border-primary-500 dark:text-white"
                                            placeholder="Name"
                                            value={customAlias}
                                            onChange={(e) => setCustomAlias(e.target.value)}
                                        />
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 mt-1">
                            <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 text-[10px] border border-slate-200 dark:border-slate-700">
                                {getInitials(authorName)}
                            </div>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{authorName}</span>
                        </div>
                    )}

                    <div className="flex flex-col items-end gap-1">
                        <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
                             <button 
                                onClick={() => { setVisibility('public'); setSelectedCollections([]); }}
                                className={`px-3 py-1.5 text-[10px] font-bold rounded-md flex items-center gap-1.5 transition-all ${visibility === 'public' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500'}`}
                             >
                                <Globe size={12} /> Public
                             </button>
                             <button 
                                onClick={() => { setVisibility('private'); setSelectedCollections([]); }}
                                className={`px-3 py-1.5 text-[10px] font-bold rounded-md flex items-center gap-1.5 transition-all ${visibility === 'private' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500'}`}
                             >
                                <Lock size={12} /> Private
                             </button>
                        </div>
                    </div>
                </div>

                {/* Organization Rows */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    {/* Categories Input */}
                    <div className="relative group">
                        <div 
                            className="w-full flex items-center gap-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2.5 cursor-pointer hover:border-slate-300 dark:hover:border-slate-600 transition-colors shadow-sm min-h-[42px]"
                            onClick={() => setIsCatDropdownOpen(true)}
                        >
                            <div className="text-slate-400 font-bold text-xs">#</div>
                            
                            <div className="flex-1 flex flex-nowrap gap-1.5 items-center overflow-x-auto custom-scrollbar no-scrollbar-visual">
                                {categories.length > 0 ? (
                                    categories.map(cat => (
                                        <Badge key={cat} label={cat} variant="primary" onRemove={() => setCategories(c => c.filter(x => x !== cat))} />
                                    ))
                                ) : (
                                    <span className="text-xs text-slate-400 whitespace-nowrap">Add category filters...</span>
                                )}
                            </div>
                            
                            <ChevronDown size={14} className="text-slate-400 shrink-0 ml-1" />
                        </div>
                        
                        {isCatDropdownOpen && (
                            <div className="absolute left-0 top-full mt-1 w-full bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-2 z-30">
                                <div className="fixed inset-0 -z-10" onClick={(e) => { e.stopPropagation(); setIsCatDropdownOpen(false); }} />
                                <input 
                                    autoFocus
                                    className="w-full text-xs border-b border-slate-100 dark:border-slate-700 pb-2 mb-2 focus:outline-none bg-transparent px-2 text-slate-900 dark:text-white placeholder-slate-400 font-medium"
                                    placeholder="Search or create category..."
                                    value={categoryInput}
                                    onChange={(e) => setCategoryInput(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') addCategory(categoryInput); }}
                                    onClick={(e) => e.stopPropagation()}
                                />
                                <div className="max-h-32 overflow-y-auto custom-scrollbar flex flex-col gap-1">
                                    {(availableCategories || []).filter(c => !categories.includes(c) && c.toLowerCase().includes(categoryInput.toLowerCase())).map(cat => (
                                        <button key={cat} onClick={(e) => { e.stopPropagation(); addCategory(cat); }} className="text-left text-[11px] px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-200 transition-colors font-medium">
                                            #{cat}
                                        </button>
                                    ))}
                                    {categoryInput && !availableCategories.some(c => c.toLowerCase() === normalizeCategoryLabel(categoryInput).toLowerCase().replace('#', '')) && (
                                        <button onClick={(e) => { e.stopPropagation(); addCategory(categoryInput); }} className="text-left text-[11px] px-2 py-1.5 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg text-primary-600 font-bold transition-colors">
                                            Create "{normalizeCategoryLabel(categoryInput)}"
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Collections Input */}
                    <div className="relative group">
                         <div 
                            className="w-full flex items-center gap-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2.5 cursor-pointer hover:border-slate-300 dark:hover:border-slate-600 transition-colors shadow-sm min-h-[42px]"
                            onClick={() => setIsColDropdownOpen(true)}
                         >
                             <div className="text-slate-400 shrink-0">
                                 {visibility === 'public' ? <Globe size={14} /> : <Lock size={14} />}
                             </div>
                             
                             <div className="flex-1 flex flex-nowrap gap-1.5 items-center overflow-x-auto custom-scrollbar no-scrollbar-visual">
                                {selectedCollections.length > 0 ? selectedCollections.map(col => (
                                    <Badge key={col} label={col} variant="primary" icon={<Check size={10} />} onRemove={() => toggleCollection(col)} />
                                )) : (
                                    <span className="text-xs text-slate-400 whitespace-nowrap">Add to {visibility === 'public' ? 'Collection' : 'Bookmarks'}...</span>
                                )}
                             </div>
                             
                             <ChevronDown size={14} className="text-slate-400 shrink-0 ml-1" />
                         </div>

                         {isColDropdownOpen && (
                            <>
                                <div className="fixed inset-0 z-20" onClick={() => setIsColDropdownOpen(false)} />
                                <div className="absolute top-full mt-1 left-0 w-full bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-2 z-30 max-h-48 overflow-y-auto custom-scrollbar">
                                    <input 
                                        autoFocus
                                        className="w-full text-xs border-b border-slate-100 dark:border-slate-700 pb-2 mb-2 focus:outline-none bg-transparent px-2 text-slate-900 dark:text-white placeholder-slate-400 font-medium"
                                        placeholder={`Find ${visibility} collection...`}
                                        value={collectionInput}
                                        onChange={(e) => setCollectionInput(e.target.value)}
                                    />
                                    {visibleCollections.filter(c => c.name.toLowerCase().includes(collectionInput.toLowerCase())).map(col => (
                                        <button 
                                            key={col.id} 
                                            onClick={() => toggleCollection(col.name)} 
                                            className={`w-full text-left text-[11px] px-2 py-1.5 rounded-lg flex items-center justify-between mb-0.5 transition-colors font-medium ${selectedCollections.includes(col.name) ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 font-bold' : 'hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'}`}
                                        >
                                            {col.name}
                                            {selectedCollections.includes(col.name) && <Check size={12} />}
                                        </button>
                                    ))}
                                    {collectionInput && !visibleCollections.some(c => c.name.toLowerCase() === collectionInput.toLowerCase()) && (
                                        <button onClick={() => toggleCollection(collectionInput)} className="w-full text-left text-[11px] px-2 py-1.5 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg text-primary-600 font-bold transition-colors">
                                            Create "{collectionInput}"
                                        </button>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Editor Area with AI Trigger */}
                <div className="relative group/editor">
                    {/* AI Button - Positioned absolutely within editor context or relative above */}
                    <div className="flex justify-end mb-2">
                        <button 
                            onClick={handleAISummarize}
                            disabled={isAiLoading || !content}
                            className={`
                                flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all
                                ${isAiLoading 
                                    ? 'bg-slate-100 text-slate-400 dark:bg-slate-800' 
                                    : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-md hover:shadow-lg hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100'
                                }
                            `}
                        >
                            {isAiLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} fill="currentColor" />}
                            {isAiLoading ? 'Analyzing...' : 'AI Summarize'}
                        </button>
                    </div>

                    <RichTextEditor 
                        value={content}
                        onChange={setContent}
                        placeholder="Share an insight, observation, or paste a long article to summarize..."
                        className={`min-h-[120px] transition-opacity duration-300 ${isAiLoading ? 'opacity-50 pointer-events-none' : ''}`}
                    />
                </div>

                {/* Attachments Preview */}
                {attachments.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                        {attachments.map((att, idx) => (
                            <div key={idx} className="relative group shrink-0 w-20 h-20 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-50 dark:bg-slate-800">
                                {att.type === 'image' ? (
                                    <Image src={att.previewUrl} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-1">
                                        <FileText size={20} />
                                        <span className="text-[8px] truncate w-full text-center mt-1">{att.file.name}</span>
                                    </div>
                                )}
                                <button 
                                    onClick={() => removeAttachment(idx)}
                                    className="absolute top-0.5 right-0.5 bg-black/50 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                                >
                                    <X size={10} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Link Preview */}
                {detectedLink && (
                    <div className="relative group rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 shadow-sm">
                        <button 
                            onClick={() => setDetectedLink(null)} 
                            className="absolute top-2 right-2 bg-slate-900/80 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-slate-900"
                        >
                            <X size={12} />
                        </button>
                        <div className="max-h-[160px] overflow-hidden">
                            <GenericLinkPreview url={detectedLink} metadata={{ url: detectedLink, title: 'Loading preview...', description: detectedLink }} type={detectProviderFromUrl(detectedLink)} />
                        </div>
                    </div>
                )}

                {error && (
                    <div className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded-lg font-medium">
                        {error}
                    </div>
                )}
            </div>
        </div>

        {/* Footer Toolbar */}
        <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 z-20 shrink-0">
            <div className="flex items-center gap-3">
                <input 
                    type="file" 
                    ref={fileInputRef}
                    className="hidden" 
                    multiple 
                    accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                    onChange={handleFileUpload}
                />
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors text-xs font-bold border border-slate-200 dark:border-slate-700"
                    title="Attach files"
                >
                    <Paperclip size={16} />
                    Attach
                </button>
                <span className="text-[10px] text-slate-400 hidden sm:inline-block font-medium">
                    Max 1MB
                </span>
            </div>

            <div className="flex items-center gap-3">
                <button 
                    onClick={() => { onClose(); navigate('/bulk-create'); }}
                    className="text-slate-500 hover:text-slate-900 dark:hover:text-white text-xs font-bold flex items-center gap-1.5 mr-2"
                    title="Bulk Import"
                >
                    <Layers size={14} />
                    <span>Bulk Create</span>
                </button>

                <button 
                    onClick={handleSubmit}
                    disabled={isSubmitting || (!content.trim() && attachments.length === 0)}
                    className={`px-6 py-2 rounded-lg text-xs font-bold text-slate-900 transition-all shadow-sm flex items-center gap-2 ${isSubmitting || (!content.trim() && attachments.length === 0) ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-primary-500 hover:bg-primary-400 active:scale-95 text-slate-900'}`}
                >
                    {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} strokeWidth={3} />}
                    Post Nugget
                </button>
            </div>
        </div>

      </div>
    </div>,
    document.body
  );
};


