import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { X, Globe, Lock, Loader2 } from 'lucide-react';
import { getInitials } from '@/utils/formatters';
import { storageService } from '@/services/storageService';
import { detectProviderFromUrl, shouldFetchMetadata } from '@/utils/urlUtils';
import { queryClient } from '@/queryClient';
import { GenericLinkPreview } from './embeds/GenericLinkPreview';
import { Collection } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { aiService } from '@/services/aiService';
import { useToast } from '@/hooks/useToast';
import { compressImage, isImageFile, formatFileSize } from '@/utils/imageOptimizer';
import { unfurlUrl } from '@/services/unfurlService';
import type { NuggetMedia } from '@/types';
import { formatApiError, getUserFriendlyMessage, logError } from '@/utils/errorHandler';
import { SourceSelector } from './shared/SourceSelector';
import { SourceBadge } from './shared/SourceBadge';
import { TagSelector } from './CreateNuggetModal/TagSelector';
import { CollectionSelector } from './CreateNuggetModal/CollectionSelector';
import { TitleInput } from './CreateNuggetModal/TitleInput';
import { ContentEditor } from './CreateNuggetModal/ContentEditor';
import { UrlInput } from './CreateNuggetModal/UrlInput';
import { AttachmentManager, FileAttachment } from './CreateNuggetModal/AttachmentManager';
import { FormFooter } from './CreateNuggetModal/FormFooter';
import type { Article } from '@/types';

interface CreateNuggetModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: 'create' | 'edit';
  initialData?: Article;
}

// FileAttachment is now imported from AttachmentManager

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB (before compression)
const MAX_FILE_SIZE_AFTER_COMPRESSION = 500 * 1024; // 500KB (after compression)

/**
 * PHASE 2: TITLE GENERATION POLICY (NON-NEGOTIABLE)
 * 
 * Title field is OPTIONAL.
 * The system must NEVER auto-add or auto-modify the title.
 * Title generation must happen ONLY when the user explicitly clicks a "Generate title" button.
 * 
 * Metadata may SUGGEST a title (stored in suggestedTitle state) but must NEVER mutate title state automatically.
 * 
 * REGRESSION SAFEGUARD: 
 * - isTitleUserEdited flag prevents metadata from overwriting user-edited titles
 * - No useEffect may write to title state
 * - Metadata title is stored in suggestedTitle, never directly in title
 * - Title is only populated when user clicks "Generate title" button
 */

export const CreateNuggetModal: React.FC<CreateNuggetModalProps> = ({ isOpen, onClose, mode = 'create', initialData }) => {
  // Auth
  const { currentUser, currentUserId, isAdmin } = useAuth();
  const authorName = currentUser?.name || 'User';
  const navigate = useNavigate();
  const toast = useToast();
  
  // Ref to track if form has been initialized from initialData (prevents re-initialization)
  const initializedFromDataRef = useRef<string | null>(null);

  // Content State
  const [title, setTitle] = useState('');
  const [isTitleUserEdited, setIsTitleUserEdited] = useState(false); // PHASE 6: Safeguard flag
  const [suggestedTitle, setSuggestedTitle] = useState<string | null>(null); // PHASE 3: Metadata suggests but never mutates
  const [content, setContent] = useState('');
  const [urls, setUrls] = useState<string[]>([]);
  const [urlInput, setUrlInput] = useState('');
  const [detectedLink, setDetectedLink] = useState<string | null>(null);
  const [linkMetadata, setLinkMetadata] = useState<NuggetMedia | null>(null);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
  const [customDomain, setCustomDomain] = useState<string | null>(null);
  
  // Attachments
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Refs for accessibility and focus management
  const modalRef = useRef<HTMLDivElement>(null);
  const tagsComboboxRef = useRef<HTMLDivElement>(null);
  const tagsListboxRef = useRef<HTMLDivElement>(null);
  const collectionsComboboxRef = useRef<HTMLDivElement>(null);
  const collectionsListboxRef = useRef<HTMLDivElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number; fileName: string } | null>(null);
  
  // Field-level validation states
  const [tagsError, setTagsError] = useState<string | null>(null);
  const [contentError, setContentError] = useState<string | null>(null);
  const [tagsTouched, setTagsTouched] = useState(false);
  const [contentTouched, setContentTouched] = useState(false);

  // Store previous active element for focus restoration
  useEffect(() => {
    if (isOpen) {
      previousActiveElementRef.current = document.activeElement as HTMLElement;
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      loadData();
      document.body.style.overflow = 'hidden';
      
      // Initialize form from initialData when in edit mode (only once per nugget)
      if (mode === 'edit' && initialData && initializedFromDataRef.current !== initialData.id) {
        setTitle(initialData.title || '');
        setIsTitleUserEdited(!!initialData.title); // PHASE 6: Mark as edited if title exists
        setSuggestedTitle(null); // PHASE 3: Clear suggestion in edit mode
        setContent(initialData.content || '');
        setCategories(initialData.categories || []);
        setVisibility(initialData.visibility || 'public');
        
        // Extract URLs from media
        const urlFromMedia = initialData.media?.url || initialData.media?.previewMetadata?.url;
        if (urlFromMedia) {
          setUrls([urlFromMedia]);
          setDetectedLink(urlFromMedia);
          if (initialData.media) {
            setLinkMetadata(initialData.media);
          }
        } else {
          setUrls([]);
        }
        
        // Note: We don't pre-fill attachments or collections in edit mode
        // as they require file objects and collection membership is separate
        
        initializedFromDataRef.current = initialData.id;
      } else if (mode === 'create') {
        // Reset initialization ref when switching to create mode
        initializedFromDataRef.current = null;
      }
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen, mode, initialData]);

  // Focus trap and initial focus when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const modal = modalRef.current;
    if (!modal) return;

    // Focus first focusable element after a short delay to allow DOM to settle
    const timer = setTimeout(() => {
      const firstFocusable = modal.querySelector(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ) as HTMLElement;
      firstFocusable?.focus();
    }, 100);

    // Focus trap handler
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      // Tab handling is managed by SelectableDropdown components

      const focusableElements = modal.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    // Handle Escape key - dropdowns handle their own Escape, this handles modal close
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Check if focus is in a dropdown (listbox)
        const activeElement = document.activeElement;
        const isInDropdown = activeElement?.closest('[role="listbox"]');
        if (!isInDropdown) {
          handleClose();
        }
      }
    };

    modal.addEventListener('keydown', handleTab);
    document.addEventListener('keydown', handleEscape);
    return () => {
      clearTimeout(timer);
      modal.removeEventListener('keydown', handleTab);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const loadData = async () => {
    try {
      const [cats, cols] = await Promise.all([
        storageService.getCategories(),
        storageService.getCollections()
      ]);
      // Filter out any non-string or empty category values
      const validCategories = (cats || []).filter((cat): cat is string => typeof cat === 'string' && cat.trim() !== '');
      setAvailableCategories(validCategories);
      setAllCollections(cols || []);
      setAvailableAliases([]); // Content aliases feature not yet implemented
      setSelectedAlias("Custom...");
    } catch (e) {
      console.error("Failed to load metadata", e);
    }
  };

  const resetForm = () => {
    setTitle('');
    setIsTitleUserEdited(false);
    setSuggestedTitle(null);
    setContent('');
    setUrls([]);
    setUrlInput('');
    setDetectedLink(null);
    setAttachments([]);
    setCategories([]);
    setVisibility('public');
    setSelectedCollections([]);
    // categoryInput and collectionInput are now managed by components
    setPostAs('me');
    setCustomAlias('');
    setCustomDomain(null);
    setError(null);
    setIsAiLoading(false);
    // Reset field-level validation states
    setTagsError(null);
    setContentError(null);
    setTagsTouched(false);
    setContentTouched(false);
    // Reset initialization ref
    initializedFromDataRef.current = null;
  };

  const handleClose = () => {
    resetForm();
    // Restore focus to previous active element
    if (previousActiveElementRef.current) {
      previousActiveElementRef.current.focus();
      previousActiveElementRef.current = null;
    }
    onClose();
  };

  // Fetch metadata when URL is added (PHASE 2: NO auto-title mutation)
  useEffect(() => {
    if (urls.length > 0) {
      // Find first non-image URL that should have metadata fetched
      const firstLinkUrl = urls.find(url => {
        const type = detectProviderFromUrl(url);
        return type !== 'image' && shouldFetchMetadata(url);
      });
      
      if (firstLinkUrl && firstLinkUrl !== detectedLink) {
        setDetectedLink(firstLinkUrl);
        setCustomDomain(null);
        setIsLoadingMetadata(true);
        unfurlUrl(firstLinkUrl)
          .then((metadata) => {
            if (metadata) {
              setLinkMetadata(metadata);
              
              // FIX: Completely disable auto-title suggestions for YouTube/social networks
              // User explicitly requested no auto-title functionality for these platforms
              // Check if this is a YouTube or social network URL
              const isYouTubeOrSocial = firstLinkUrl && (
                firstLinkUrl.includes('youtube.com') || 
                firstLinkUrl.includes('youtu.be') ||
                firstLinkUrl.includes('twitter.com') || 
                firstLinkUrl.includes('x.com') ||
                firstLinkUrl.includes('linkedin.com') ||
                firstLinkUrl.includes('instagram.com') ||
                firstLinkUrl.includes('tiktok.com') ||
                firstLinkUrl.includes('facebook.com') ||
                firstLinkUrl.includes('threads.net') ||
                firstLinkUrl.includes('reddit.com')
              );
              
              // Do NOT store suggestedTitle for YouTube/social networks
              if (isYouTubeOrSocial) {
                console.log('[CreateNuggetModal] YouTube/social network detected - skipping title suggestion');
                setSuggestedTitle(null);
              } else if (metadata.previewMetadata?.title) {
                const metaTitle = metadata.previewMetadata.title.trim();
                // Skip if title is just a domain or URL pattern
                const isBadTitle = metaTitle.match(/^(https?:\/\/|www\.|Content from|content from)/i) ||
                                  metaTitle.match(/^[a-z0-9-]+\.[a-z]{2,}$/i) || // Just domain
                                  metaTitle.length < 3; // Too short
                if (!isBadTitle) {
                  console.log('[CreateNuggetModal] Metadata title found, storing as suggestion:', metaTitle);
                  setSuggestedTitle(metaTitle);
                  // CRITICAL: DO NOT call setTitle() here - title must remain empty until user clicks button
                } else {
                  console.log('[CreateNuggetModal] Metadata title rejected as bad title:', metaTitle);
                  setSuggestedTitle(null);
                }
              } else {
                console.log('[CreateNuggetModal] No metadata title found');
                setSuggestedTitle(null);
              }
            } else {
              setLinkMetadata(null);
              setSuggestedTitle(null);
            }
          })
          .catch((error) => {
            console.error('Failed to fetch link metadata:', error);
            setLinkMetadata(null);
            setSuggestedTitle(null);
          })
          .finally(() => {
            setIsLoadingMetadata(false);
          });
      } else if (!firstLinkUrl && detectedLink) {
        // No URLs that need metadata, clear link metadata
        setDetectedLink(null);
        setLinkMetadata(null);
        setSuggestedTitle(null);
        setCustomDomain(null);
      }
    } else {
      if (detectedLink) {
        setDetectedLink(null);
        setLinkMetadata(null);
        setSuggestedTitle(null);
        setCustomDomain(null);
      }
    }
  }, [urls, detectedLink]);

  // Parse multiple URLs from text (separated by newlines, spaces, commas, etc.)
  const parseMultipleUrls = (text: string): string[] => {
    // Split by common delimiters: newlines, spaces, commas, tabs
    const separators = /\s+|,|\n|\r\n|\r|\t/;
    const parts = text.split(separators);
    
    const validUrls: string[] = [];
    const errors: string[] = [];
    
    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      
      // Try to validate as URL
      try {
        // Add protocol if missing
        let urlToValidate = trimmed;
        if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
          urlToValidate = `https://${trimmed}`;
        }
        
        new URL(urlToValidate);
        const finalUrl = trimmed.startsWith('http://') || trimmed.startsWith('https://') 
          ? trimmed 
          : urlToValidate;
        
        // Add if not already in list
        if (!urls.includes(finalUrl) && !validUrls.includes(finalUrl)) {
          validUrls.push(finalUrl);
        }
      } catch {
        // Invalid URL, skip it
        errors.push(trimmed);
      }
    }
    
    if (errors.length > 0 && validUrls.length === 0) {
      setError(`Could not parse any valid URLs from: ${errors.slice(0, 3).join(', ')}${errors.length > 3 ? '...' : ''}`);
    } else if (errors.length > 0 && validUrls.length > 0) {
      // Show warning if some URLs were invalid but some were valid
      toast.warning(`Added ${validUrls.length} URL(s). ${errors.length} invalid URL(s) skipped.`);
    }
    
    return validUrls;
  };

  const addUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    
    // Check if input contains multiple URLs (has newlines or multiple URLs)
    const hasMultipleUrls = trimmed.includes('\n') || 
                           trimmed.includes('\r') || 
                           trimmed.split(/\s+|,/).filter(p => p.trim().length > 0).length > 1;
    
    if (hasMultipleUrls) {
      // Parse multiple URLs
      const parsedUrls = parseMultipleUrls(trimmed);
      if (parsedUrls.length > 0) {
        setUrls([...urls, ...parsedUrls]);
        setUrlInput('');
        if (!contentTouched) setContentTouched(true);
        // Clear content error immediately when URL is added
        if (contentError) {
          const error = validateContent();
          setContentError(error);
        }
        if (parsedUrls.length > 1) {
          toast.success(`Added ${parsedUrls.length} URLs`);
        }
      }
    } else {
      // Single URL
      if (!urls.includes(trimmed)) {
        try {
          // Add protocol if missing
          let urlToValidate = trimmed;
          if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
            urlToValidate = `https://${trimmed}`;
          }
          
          new URL(urlToValidate);
          const finalUrl = trimmed.startsWith('http://') || trimmed.startsWith('https://') 
            ? trimmed 
            : urlToValidate;
          setUrls([...urls, finalUrl]);
          setUrlInput('');
          if (!contentTouched) setContentTouched(true);
          // Clear content error immediately when URL is added
          if (contentError) {
            const error = validateContent();
            setContentError(error);
          }
        } catch {
          setError('Please enter a valid URL');
        }
      }
    }
  };

  const handleUrlPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData('text');
    
    // Check if pasted text looks like multiple URLs
    const hasMultipleUrls = pastedText.includes('\n') || 
                           pastedText.includes('\r') || 
                           pastedText.split(/\s+|,/).filter(p => p.trim().length > 0 && (p.includes('.') || p.startsWith('http'))).length > 1;
    
    if (hasMultipleUrls) {
      e.preventDefault();
      const parsedUrls = parseMultipleUrls(pastedText);
      if (parsedUrls.length > 0) {
        setUrls([...urls, ...parsedUrls]);
        setUrlInput('');
        toast.success(`Added ${parsedUrls.length} URLs`);
      }
    }
    // If not multiple URLs, allow default paste behavior
  };

  const removeUrl = (urlToRemove: string) => {
    setUrls(urls.filter(u => u !== urlToRemove));
    if (!contentTouched) setContentTouched(true);
    // Validate content when URL is removed
    if (contentTouched) {
      const error = validateContent();
      setContentError(error);
    }
  };

  // addCategory and toggleCollection are now handled by TagSelector and CollectionSelector components

  // Field-level validation functions
  const validateTags = (): string | null => {
    if (categories.length === 0) {
      return "Please add at least one tag. Tags enable smarter news discovery.";
    }
    return null;
  };

  const validateContent = (): string | null => {
    const hasContent = content.trim() || title.trim();
    const hasUrl = urls.length > 0;
    const hasAttachment = attachments.length > 0;
    
    if (!hasContent && !hasUrl && !hasAttachment) {
      return "Please add some content, a URL, or an attachment to create a nugget.";
    }
    return null;
  };

  // Validate tags when categories change (if touched)
  useEffect(() => {
    if (tagsTouched) {
      const error = validateTags();
      setTagsError(error);
    }
  }, [categories, tagsTouched]);

  // Validate content when relevant fields change (if touched)
  useEffect(() => {
    if (contentTouched) {
      const error = validateContent();
      setContentError(error);
    }
  }, [content, title, urls, attachments, contentTouched]);

  // Keyboard navigation handlers are now in SelectableDropdown component

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;

      setIsSubmitting(true); // Show loading state during compression
      const newAttachments: FileAttachment[] = [];
      const totalFiles = files.length;
      
      try {
          for (let i = 0; i < files.length; i++) {
              const file = files[i];
              
              // Update progress indicator
              setUploadProgress({ current: i + 1, total: totalFiles, fileName: file.name });
              
              if (file.type.match(/(application\/x-msdownload|application\/x-sh|text\/javascript)/)) {
                  setError("Script/Executable files are not allowed.");
                  continue;
              }
              if (file.size > MAX_FILE_SIZE) {
                  setError(`File "${file.name}" exceeds ${formatFileSize(MAX_FILE_SIZE)} limit.`);
                  continue;
              }
              
              const isImage = isImageFile(file);
              let processedFile = file;
              
              // Compress images before adding to attachments
              if (isImage) {
                  try {
                      processedFile = await compressImage(file);
                      const sizeReduction = ((file.size - processedFile.size) / file.size * 100).toFixed(0);
                      console.log(`Compressed ${file.name}: ${formatFileSize(file.size)} → ${formatFileSize(processedFile.size)} (${sizeReduction}% reduction)`);
                      
                      // Double-check size after compression
                      if (processedFile.size > MAX_FILE_SIZE_AFTER_COMPRESSION) {
                          setError(`Image "${file.name}" is still too large after compression. Please use a smaller image.`);
                          continue;
                      }
                  } catch (compressionError) {
                      console.error('Image compression failed:', compressionError);
                      setError(`Failed to compress "${file.name}". Using original file.`);
                      // Fall back to original file if compression fails
                  }
              }
              
              newAttachments.push({
                  file: processedFile,
                  previewUrl: URL.createObjectURL(processedFile),
                  type: isImage ? 'image' : 'document'
              });
          }
          
          setAttachments(prev => [...prev, ...newAttachments]);
          setError(null);
          if (!contentTouched) setContentTouched(true);
          // Clear content error immediately when attachment is added
          if (contentError) {
            const error = validateContent();
            setContentError(error);
          }
      } catch (error) {
          console.error('File upload error:', error);
          setError('Failed to process files. Please try again.');
      } finally {
          setIsSubmitting(false);
          setUploadProgress(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  // removeAttachment is now handled by AttachmentManager component

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
        if (!contentTouched) setContentTouched(true);
        // Clear content error immediately when AI adds content
        if (contentError) {
            const error = validateContent();
            setContentError(error);
        }
        
        // Add unique categories safely
        const returnedTags = Array.isArray(summary.tags) ? summary.tags : [];
        // Filter to only include valid string tags
        const validTags = returnedTags.filter((tag): tag is string => typeof tag === 'string' && tag.trim() !== '');
        const newCats = validTags.filter(tag => !categories.includes(tag));
        
        if (newCats.length > 0) {
            setCategories(prev => [...prev, ...newCats]);
            if (!tagsTouched) setTagsTouched(true);
            // Clear tags error immediately when AI adds tags
            if (tagsError) {
                const error = validateTags();
                setTagsError(error);
            }
            // Optimistically add to available if missing
            newCats.forEach(cat => {
                if (!availableCategories.includes(cat)) {
                    setAvailableCategories(prev => [...prev, cat].filter((c): c is string => typeof c === 'string' && c.trim() !== '').sort());
                }
            });
        }
        
        toast.success("Nugget summarized by AI ?");
    } catch (e) {
        console.error(e);
        toast.error("Failed to generate summary. Try again.");
    } finally {
        setIsAiLoading(false);
    }
  };

  const handleSubmit = async () => {
    // Mark all fields as touched to show validation errors
    setTagsTouched(true);
    setContentTouched(true);
    
    // Validate field-level errors first
    const tagsErr = validateTags();
    const contentErr = validateContent();
    
    setTagsError(tagsErr);
    setContentError(contentErr);
    
    // If field errors exist, stop submission
    if (tagsErr || contentErr) {
      // Scroll to first error if needed
      if (tagsErr) {
        tagsComboboxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else if (contentErr) {
        document.getElementById('title-input')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      return;
    }
    
    // Validate user is authenticated (server-side check, use global error)
    if (!currentUserId) {
        setError("You must be logged in to create a nugget.");
        return;
    }
    
    // Validate edit mode has initialData
    if (mode === 'edit' && !initialData) {
        setError("Cannot edit: nugget data is missing.");
        return;
    }
    
    setIsSubmitting(true);
    setError(null);
    try {
        // CRITICAL: Do NOT derive titles from content for text-only nuggets
        // Auto-title generation is STRICTLY LIMITED to Social/Video content types
        // Titles are optional - allow empty/null titles
        const finalTitle = title.trim() || '';
        const wordCount = content.trim().split(/\s+/).length;
        const readTime = Math.max(1, Math.ceil(wordCount / 200));

        // Handle edit mode - only update editable fields
        if (mode === 'edit' && initialData) {
            // Prepare update payload with only editable fields
            const updatePayload: Partial<Article> = {
                title: finalTitle,
                content: content.trim() || '',
                categories,
                visibility,
            };
            
            // Update excerpt if content changed
            const excerptText = content.trim() || finalTitle || '';
            updatePayload.excerpt = excerptText.length > 150 ? excerptText.substring(0, 150) + '...' : excerptText;
            
            // Handle URLs/media updates
            const imageUrls: string[] = [];
            const linkUrls: string[] = [];
            
            for (const url of urls) {
                const urlType = detectProviderFromUrl(url);
                if (urlType === 'image') {
                    imageUrls.push(url);
                } else {
                    linkUrls.push(url);
                }
            }
            
            const primaryUrl = linkUrls.length > 0 ? linkUrls[0] : detectedLink;
            
            // Update media if URLs changed
            if (linkMetadata || primaryUrl) {
                updatePayload.media = linkMetadata ? {
                    ...linkMetadata,
                    previewMetadata: linkMetadata.previewMetadata ? {
                        ...linkMetadata.previewMetadata,
                        url: linkMetadata.previewMetadata.url || primaryUrl || '',
                        siteName: customDomain || linkMetadata.previewMetadata.siteName,
                    } : {
                        url: primaryUrl || '',
                        title: finalTitle,
                        siteName: customDomain || undefined,
                    }
                } : (primaryUrl ? {
                    type: detectProviderFromUrl(primaryUrl),
                    url: primaryUrl,
                    previewMetadata: {
                        url: primaryUrl,
                        title: finalTitle,
                        siteName: customDomain || undefined,
                    }
                } : null);
            }
            
            // Update images if image URLs were added
            if (imageUrls.length > 0) {
                const existingImages = initialData.images || [];
                updatePayload.images = [...existingImages, ...imageUrls];
            }
            
            // Call update
            const updatedArticle = await storageService.updateArticle(initialData.id, updatePayload);
            
            if (!updatedArticle) {
                throw new Error('Failed to update nugget');
            }
            
            // Optimistically update query cache
            queryClient.setQueryData(['articles'], (oldData: any) => {
                if (!oldData) return oldData;
                // Handle paginated response
                if (oldData.data && Array.isArray(oldData.data)) {
                    return {
                        ...oldData,
                        data: oldData.data.map((a: Article) => 
                            a.id === updatedArticle.id ? updatedArticle : a
                        )
                    };
                }
                // Handle array response
                if (Array.isArray(oldData)) {
                    return oldData.map((a: Article) => 
                        a.id === updatedArticle.id ? updatedArticle : a
                    );
                }
                return oldData;
            });
            
            // Also invalidate to ensure consistency
            await queryClient.invalidateQueries({ queryKey: ['articles'] });
            
            toast.success('Nugget updated successfully');
            handleClose();
            return;
        }
        
        // CREATE MODE (existing logic)
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

        // Separate image URLs from regular URLs
        const imageUrls: string[] = [];
        const linkUrls: string[] = [];
        
        for (const url of urls) {
            const urlType = detectProviderFromUrl(url);
            if (urlType === 'image') {
                imageUrls.push(url);
            } else {
                linkUrls.push(url);
            }
        }

        // Add image URLs to uploaded images array
        uploadedImages.push(...imageUrls);

        const finalAliasName = selectedAlias === 'Custom...' ? customAlias : selectedAlias;

        // Use first non-image URL for media metadata, or fallback to detected link
        const primaryUrl = linkUrls.length > 0 ? linkUrls[0] : detectedLink;
        
        // Generate excerpt from content if available, otherwise use title or empty
        const excerptText = content.trim() || finalTitle || '';
        const excerpt = excerptText.length > 150 ? excerptText.substring(0, 150) + '...' : excerptText;
        
        /**
         * PHASE 4: Tag Data Contract
         * 
         * Tags are stored in the 'categories' state variable in the frontend.
         * When submitting to the backend, we must send them as 'tags' (string[]).
         * 
         * Contract:
         * - Frontend state: categories (string[])
         * - Backend field: tags (string[])
         * - Minimum requirement: >= 1 non-empty string
         * - Validation: Frontend validates before submit, backend validates on receive
         * 
         * This normalization ensures:
         * 1. Only valid string tags are sent (filters out null/undefined/empty)
         * 2. Tags match categories (single source of truth)
         * 3. Backend receives the expected format
         */
        const validTags = categories.filter((tag): tag is string => 
            typeof tag === 'string' && tag.trim().length > 0
        );
        
        // PHASE 5: Regression safeguard - defensive assertion
        // This should never trigger if validation works correctly, but prevents silent failures
        if (validTags.length === 0) {
            setTagsError("Please add at least one tag. Tags enable smarter news discovery.");
            setIsSubmitting(false);
            return;
        }
        
        const newArticle = await storageService.createArticle({
            title: finalTitle,
            content: content.trim() || '', // Send empty string if no content (allowed when URLs/images exist)
            excerpt: excerpt,
            author: { id: currentUserId, name: authorName },
            displayAuthor: (postAs === 'alias' && finalAliasName.trim()) ? { name: finalAliasName.trim() } : undefined,
            categories,
            tags: validTags, // FIX: Use categories (tags) instead of empty array 
            readTime,
            images: uploadedImages,
            documents: uploadedDocs,
            visibility,
            // Store multiple URLs in a custom field if supported, or use first URL for media
            // For now, using first URL for media compatibility
            // Also create media object for text nuggets if customDomain is set (for source badge display)
            media: linkMetadata ? {
                ...linkMetadata,
                previewMetadata: linkMetadata.previewMetadata ? {
                    ...linkMetadata.previewMetadata,
                    url: linkMetadata.previewMetadata.url || primaryUrl || '',
                    siteName: customDomain || linkMetadata.previewMetadata.siteName,
                } : {
                    url: primaryUrl || '',
                    title: finalTitle,
                    siteName: customDomain || undefined,
                }
            } : (primaryUrl ? {
                type: detectProviderFromUrl(primaryUrl),
                url: primaryUrl,
                previewMetadata: {
                    url: primaryUrl,
                    title: finalTitle,
                    siteName: customDomain || undefined,
                }
            } : (customDomain ? {
                // For text nuggets with custom domain, create minimal media object for source badge
                type: 'link' as const,
                url: `https://${customDomain}`,
                previewMetadata: {
                    url: `https://${customDomain}`,
                    title: finalTitle,
                    siteName: customDomain,
                }
            } : null)),
            source_type: (primaryUrl || imageUrls.length > 0) ? 'link' : 'text',
            // Store additional URLs in content or a notes field if needed
            // For now, we'll append URLs to content if they're not already there
            // This is a temporary solution until we add a proper urls field to Article type
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
    } catch (e: any) {
        console.error("Failed to create nugget", e);
        
        // Use unified error handling
        logError('CreateNuggetModal', e, { title, attachmentsCount: attachments.length, urlsCount: urls.length, categoriesCount: categories.length });
        
        const apiError = formatApiError(e);
        const baseErrorMessage = getUserFriendlyMessage(apiError);
        
        // PHASE 5: Handle tag-specific validation errors from backend
        // If backend returns a tag validation error, set it on the tags field
        if (e?.errors && Array.isArray(e.errors)) {
            const tagError = e.errors.find((err: any) => err.path === 'tags' || err.path?.includes('tags'));
            if (tagError) {
                setTagsError("Tags required to post the nugget");
                setTagsTouched(true);
                tagsComboboxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
        
        // Handle multiple validation errors
        let finalErrorMessage = baseErrorMessage;
        let toastMessage = baseErrorMessage;
        
        if (e?.errors && Array.isArray(e.errors) && e.errors.length > 1) {
            const formattedErrors = e.errors.map((err: any) => getUserFriendlyMessage(formatApiError(err)));
            finalErrorMessage = `Please fix the following issues:\n${formattedErrors.map((msg: string, idx: number) => `${idx + 1}. ${msg}`).join('\n')}`;
            toastMessage = `Multiple validation errors. ${formattedErrors.length} issue(s) need to be fixed.`;
        } else if (e?.message) {
            // Handle specific error types
            const message = e.message;
            if (message.includes('network') || message.includes('fetch')) {
                finalErrorMessage = "Unable to connect to the server. Please check your internet connection and try again.";
                toastMessage = "Connection error. Please try again.";
            } else if (message.includes('unauthorized') || message.includes('401')) {
                finalErrorMessage = "Your session has expired. Please refresh the page and sign in again.";
                toastMessage = "Session expired. Please sign in again.";
            } else if (message.includes('forbidden') || message.includes('403')) {
                finalErrorMessage = "You don't have permission to perform this action.";
                toastMessage = "Permission denied.";
            } else if (message.includes('timeout')) {
                finalErrorMessage = "The request took too long. Please try again.";
                toastMessage = "Request timeout. Please try again.";
            }
        }
        
        // Set error state for inline display
        setError(finalErrorMessage);
        
        // Show toast notification
        toast.error(toastMessage);
    } finally {
        setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={handleClose} />
      
      <div 
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="relative w-full h-full sm:h-auto sm:max-h-[85vh] sm:max-w-2xl bg-white dark:bg-slate-900 sm:rounded-2xl shadow-2xl flex flex-col animate-in zoom-in-95 fade-in duration-200 border border-slate-200 dark:border-slate-800 overflow-hidden"
      >
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 z-20 shrink-0">
            <h2 id="modal-title" className="text-sm font-bold text-slate-900 dark:text-white">
              {mode === 'edit' ? 'Edit Nugget' : 'Create Nugget'}
            </h2>
            <button 
              onClick={handleClose} 
              aria-label="Close modal"
              className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
            >
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

                {/* Organization Rows - Tags and Collections/Bookmarks */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                    <TagSelector
                        selected={categories}
                        availableCategories={availableCategories}
                        onSelectedChange={setCategories}
                        onAvailableCategoriesChange={setAvailableCategories}
                        error={tagsError}
                        touched={tagsTouched}
                        onTouchedChange={setTagsTouched}
                        onErrorChange={setTagsError}
                        comboboxRef={tagsComboboxRef}
                        listboxRef={tagsListboxRef}
                    />
                    <CollectionSelector
                        selected={selectedCollections}
                        availableCollections={allCollections}
                        visibility={visibility}
                        onSelectedChange={setSelectedCollections}
                        comboboxRef={collectionsComboboxRef}
                        listboxRef={collectionsListboxRef}
                    />
                </div>

                {/* Title Field */}
                <div className="space-y-2">
                    <TitleInput
                        value={title}
                        onChange={(value) => {
                            setTitle(value);
                            setIsTitleUserEdited(true); // PHASE 6: Mark as user-edited
                            if (!contentTouched) setContentTouched(true);
                            if (contentError) {
                                const error = validateContent();
                                setContentError(error);
                            }
                        }}
                        onBlur={() => {
                            if (!contentTouched) setContentTouched(true);
                            const error = validateContent();
                            setContentError(error);
                        }}
                        linkMetadataTitle={suggestedTitle || undefined}
                        error={contentError}
                        warning={contentTouched && !contentError && !content.trim() && !title.trim() && urls.length === 0 && attachments.length === 0 ? "Add some content, a URL, or an attachment before submitting." : undefined}
                        onTouchedChange={setContentTouched}
                        onErrorChange={setContentError}
                    />
                    {/* FIX: Removed "Generate title from source" button - auto-title disabled for YouTube/social networks */}
                    {/* Title suggestions are completely disabled per user request */}
                </div>

                {/* URLs Field */}
                <UrlInput
                    urlInput={urlInput}
                    urls={urls}
                    onUrlInputChange={(value) => {
                        setUrlInput(value);
                        if (!contentTouched) setContentTouched(true);
                    }}
                    onAddUrl={addUrl}
                    onRemoveUrl={(url) => {
                        removeUrl(url);
                        if (!contentTouched) setContentTouched(true);
                        if (contentTouched) {
                            const error = validateContent();
                            setContentError(error);
                        }
                    }}
                    onUrlPaste={handleUrlPaste}
                    onTouchedChange={(touched) => {
                        if (touched) setContentTouched(true);
                    }}
                    onErrorChange={(error) => {
                        if (error !== null) {
                            const validationError = validateContent();
                            setContentError(validationError);
                        }
                    }}
                />

                {/* Editor Area with AI Trigger */}
                <ContentEditor
                    value={content}
                    onChange={(newContent) => {
                        setContent(newContent);
                        if (!contentTouched) setContentTouched(true);
                        if (contentError) {
                            const error = validateContent();
                            setContentError(error);
                        }
                    }}
                    isAiLoading={isAiLoading}
                    onAiSummarize={handleAISummarize}
                    onImagePaste={(file) => {
                        if (isImageFile(file)) {
                            const dataTransfer = new DataTransfer();
                            dataTransfer.items.add(file);
                            const fileInput = document.createElement('input');
                            fileInput.type = 'file';
                            fileInput.files = dataTransfer.files;
                            const syntheticEvent = {
                                target: fileInput,
                                currentTarget: fileInput
                            } as React.ChangeEvent<HTMLInputElement>;
                            handleFileUpload(syntheticEvent);
                        }
                    }}
                    error={contentError}
                    warning={contentTouched && !contentError && !content.trim() && !title.trim() && urls.length === 0 && attachments.length === 0 ? "Add some content, a URL, or an attachment before submitting." : undefined}
                    onTouchedChange={setContentTouched}
                    onErrorChange={setContentError}
                />

                {/* Source Selector - Always visible for manual favicon/domain entry */}
                {/* TEMPORARILY DISABLED: Hide favicon selector */}
                {false && (
                    <SourceSelector
                        currentUrl={urls.find(url => detectProviderFromUrl(url) !== 'image') || detectedLink || null}
                        onDomainChange={setCustomDomain}
                        initialDomain={customDomain}
                    />
                )}

                {/* Attachments Preview */}
                {/* Upload Progress Indicator */}
                {uploadProgress && (
                    <div className="px-5 py-3 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg mb-4">
                        <div className="flex items-center gap-3">
                            <Loader2 size={16} className="animate-spin text-primary-600 dark:text-primary-400" />
                            <div className="flex-1">
                                <div className="text-xs font-medium text-primary-900 dark:text-primary-100">
                                    Processing {uploadProgress.fileName}...
                                </div>
                                <div className="text-[10px] text-primary-700 dark:text-primary-300 mt-0.5">
                                    {uploadProgress.current} of {uploadProgress.total} files
                                </div>
                            </div>
                            <div className="text-xs font-bold text-primary-600 dark:text-primary-400">
                                {Math.round((uploadProgress.current / uploadProgress.total) * 100)}%
                            </div>
                        </div>
                    </div>
                )}
                
                <AttachmentManager
                    attachments={attachments}
                    onAttachmentsChange={(newAttachments) => {
                        setAttachments(newAttachments);
                        if (!contentTouched) setContentTouched(true);
                        if (contentError) {
                            const error = validateContent();
                            setContentError(error);
                        }
                    }}
                    onFileSelect={handleFileUpload}
                    onError={setError}
                />

                {/* Link Preview */}
                {(urls.length > 0 || detectedLink) && (() => {
                    // Separate image URLs from regular URLs for display
                    const imageUrls = urls.filter(url => detectProviderFromUrl(url) === 'image');
                    const linkUrls = urls.filter(url => detectProviderFromUrl(url) !== 'image');
                    const primaryLinkUrl = linkUrls.length > 0 ? linkUrls[0] : detectedLink;
                    const hasMultipleImages = imageUrls.length > 1;
                    const hasMultipleLinks = linkUrls.length > 1;
                    
                    return (
                        <div className="space-y-3">
                            {/* Show all image URLs */}
                            {imageUrls.length > 0 && (
                                <div className="space-y-2">
                                    {hasMultipleImages && (
                                        <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                            {imageUrls.length} Image{imageUrls.length > 1 ? 's' : ''} Added
                                        </div>
                                    )}
                                    <div className={`grid gap-2 ${hasMultipleImages ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                        {imageUrls.map((imageUrl, idx) => {
                                            const detectedType = detectProviderFromUrl(imageUrl);
                                            return (
                                                <div key={idx} className="relative group rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 shadow-sm">
                                                    <button 
                                                        onClick={() => removeUrl(imageUrl)} 
                                                        className="absolute top-2 right-2 bg-slate-900/80 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-slate-900"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                    <div className="max-h-[160px] overflow-hidden">
                                                        <GenericLinkPreview 
                                                            url={imageUrl} 
                                                            metadata={{ url: imageUrl }} 
                                                            type={detectedType} 
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                            
                            {/* Show link preview (non-image URLs) */}
                            {primaryLinkUrl && (
                                <div className="relative group rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 shadow-sm">
                                    {hasMultipleLinks && (
                                        <div className="absolute top-2 left-2 z-10 px-2 py-1 bg-slate-900/80 text-white text-[10px] font-bold rounded">
                                            {linkUrls.length} Link{linkUrls.length > 1 ? 's' : ''}
                                        </div>
                                    )}
                                    <button 
                                        onClick={() => { 
                                            if (linkUrls.length > 0 && primaryLinkUrl) {
                                                removeUrl(primaryLinkUrl);
                                            } else {
                                                setDetectedLink(null);
                                                setLinkMetadata(null);
                                                setCustomDomain(null);
                                            }
                                        }} 
                                        className="absolute top-2 right-2 bg-slate-900/80 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-slate-900"
                                    >
                                        <X size={12} />
                                    </button>
                                    {/* Source Badge Preview - Shows in real-time */}
                                    {/* TEMPORARILY DISABLED: Hide favicon preview */}
                                    {false && !hasMultipleLinks && (
                                        <div className="absolute top-2 left-2 z-10">
                                            <SourceBadge
                                                url={primaryLinkUrl || ''}
                                                customDomain={customDomain || undefined}
                                                size="sm"
                                            />
                                        </div>
                                    )}
                                    <div className="max-h-[160px] overflow-hidden">
                                        {isLoadingMetadata ? (
                                            <div className="p-4 flex items-center justify-center">
                                                <Loader2 size={16} className="animate-spin text-slate-400" />
                                                <span className="ml-2 text-xs text-slate-500">Loading preview...</span>
                                            </div>
                                        ) : (() => {
                                            // Determine content type for proper preview handling
                                            const detectedType = primaryLinkUrl ? detectProviderFromUrl(primaryLinkUrl) : 'link';
                                            
                                            const fallbackMetadata = { 
                                                url: primaryLinkUrl || '', 
                                                title: primaryLinkUrl || '' 
                                            };
                                            
                                            return (
                                                <GenericLinkPreview 
                                                    url={primaryLinkUrl || ''} 
                                                    metadata={linkMetadata?.previewMetadata || fallbackMetadata} 
                                                    type={linkMetadata?.type || detectedType} 
                                                />
                                            );
                                        })()}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })()}

                {error && (
                    <div 
                        role="alert" 
                        aria-live="assertive" 
                        aria-atomic="true"
                        className="text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 p-3 rounded-lg font-medium border border-red-300 dark:border-red-700 whitespace-pre-line"
                    >
                        <div className="flex items-start gap-2">
                            <span className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" aria-hidden="true">⚠</span>
                            <div className="flex-1">
                                <div className="font-bold mb-1 text-red-800 dark:text-red-300">Unable to create nugget</div>
                                <div className="text-[11px] opacity-90">{error}</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* Footer Toolbar */}
        <FormFooter
            fileInputRef={fileInputRef}
            onFileSelect={handleFileUpload}
            onBulkCreate={() => { handleClose(); navigate('/bulk-create'); }}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            canSubmit={
                // PHASE 5: Regression safeguard - disable submit if tags are empty
                categories.length > 0 && 
                !!(content.trim() || title.trim() || urls.length > 0 || attachments.length > 0)
            }
        />

      </div>
    </div>,
    document.body
  );
};


