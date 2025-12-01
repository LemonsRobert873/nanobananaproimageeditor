
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, Download, CheckSquare, Square, FileText, Image as ImageIcon, Grid3X3, Copy, Info, Filter, ArrowDownWideNarrow, ArrowUpNarrowWide, Type, Layers } from 'lucide-react';
import { HistoryItem, GenerationMode, ReferenceOperation } from '../types';
import Button from './Button';
import { useToast } from '../context/ToastContext';
import { dataURLtoBlob, createZip, formatDateForFilename } from '../utils/imageUtils';

interface GalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryItem[];
  onDeleteItems: (ids: string[]) => Promise<void>;
  onDownloadImage: (url: string, id: string) => void;
  onSendPromptToMode?: (text: string, targetMode: GenerationMode) => void;
  isProTheme: boolean;
}

type ContentFilter = 'all' | 'image' | 'text';
type SortOrder = 'newest' | 'oldest';

const MODE_LABELS: Record<string, string> = {
  [GenerationMode.IMAGE_EDIT]: 'Image Edit',
  [GenerationMode.IMAGE_TO_IMAGE]: 'Image → Image',
  [GenerationMode.IMG_TO_PROMPT]: 'Image → Text Prompt',
  [GenerationMode.TEXT_TO_PROMPT]: 'Text Prompt'
};

// --- Optimized Gallery Item Component ---
const GalleryItem = React.memo(({ 
  item, 
  isSelected,
  isFocused,
  domId,
  onToggle, 
  onActivate,
  isProTheme
}: { 
  item: HistoryItem, 
  isSelected: boolean, 
  isFocused: boolean,
  domId: string,
  onToggle: (id: string) => void, 
  onActivate: (item: HistoryItem) => void,
  isProTheme: boolean
}) => {
  const accentColor = isProTheme ? 'text-yellow-500' : 'text-cyan-400';
  const selectedBorder = isProTheme ? 'border-yellow-500 ring-yellow-500/50' : 'border-cyan-500 ring-cyan-500/50';
  const selectedBg = isProTheme ? 'bg-yellow-500' : 'bg-cyan-500';

  return (
    <div 
        id={domId}
        className={`relative group rounded-xl overflow-hidden border-2 transition-all duration-200 aspect-video ${
            isFocused 
              ? 'border-zinc-200 ring-2 ring-white ring-inset z-10 scale-[1.02] shadow-xl' 
              : (isSelected ? `${selectedBorder} ring-1` : 'border-zinc-800 hover:border-zinc-700')
        } ${item.type === 'image' ? 'bg-black' : 'bg-zinc-900'}`}
        // Performance: contain-content isolates layout/paint. 
        style={{ contain: 'content' }}
    >
        {/* Selection Checkbox (Top Left) */}
        <div 
            className="absolute top-2 left-2 z-20 cursor-pointer p-1"
            onClick={(e) => {
                e.stopPropagation();
                onToggle(item.id);
            }}
        >
            {isSelected ? (
                <div className={`${selectedBg} text-black rounded text-xs p-0.5 shadow-sm`}>
                    <CheckSquare size={16} />
                </div>
            ) : (
                <div className={`rounded p-0.5 backdrop-blur-sm transition-colors shadow-sm ${isFocused ? 'bg-black/60 text-white' : 'bg-black/40 text-white/50 hover:text-white'}`}>
                    <Square size={16} />
                </div>
            )}
        </div>

        {/* Main Content (Click to Open) */}
        <div 
            className="cursor-pointer w-full h-full" 
            onClick={() => onActivate(item)}
        >
            {item.type === 'image' ? (
                <img 
                    src={item.url} 
                    className="w-full h-full object-contain" 
                    loading="lazy" 
                    decoding="async"
                    alt="Generated" 
                    draggable="false"
                />
            ) : (
                <div className="w-full h-full p-4 flex flex-col bg-zinc-900/50">
                    <div className="flex items-center gap-2 text-zinc-500 mb-2 shrink-0">
                        <FileText size={14} />
                        <span className="text-[10px] uppercase font-bold tracking-wider">Prompt Text</span>
                    </div>
                    <div className="flex-1 overflow-hidden relative">
                        <p className="text-xs text-zinc-300 line-clamp-6 leading-relaxed">
                            {item.text}
                        </p>
                        {/* Fade effect for text truncation */}
                        <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-zinc-900 to-transparent" />
                    </div>
                </div>
            )}
            
            {/* Metadata Overlay (Bottom - Hover or Focus) */}
            <div className={`absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent flex flex-col justify-end p-3 pointer-events-none transition-opacity ${isFocused ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-zinc-300">
                        {item.type === 'image' ? <ImageIcon size={12} /> : <FileText size={12} />}
                        <span className="text-[10px] font-medium uppercase tracking-wide">
                            {MODE_LABELS[item.metadata?.mode || ''] || item.metadata?.mode || 'Generated'}
                        </span>
                    </div>
                    <span className="text-[10px] text-zinc-500 font-mono">
                        {new Date(item.timestamp).toLocaleDateString()}
                    </span>
                </div>
            </div>
        </div>
    </div>
  );
});


const GalleryModal: React.FC<GalleryModalProps> = ({ 
  isOpen, 
  onClose, 
  history, 
  onDeleteItems,
  onDownloadImage,
  onSendPromptToMode,
  isProTheme
}) => {
  const { addToast } = useToast();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeItem, setActiveItem] = useState<HistoryItem | null>(null);
  const [lightboxZoomed, setLightboxZoomed] = useState(false);
  
  // Navigation State
  const [focusedId, setFocusedId] = useState<string | null>(null);

  // Filter States
  const [contentFilter, setContentFilter] = useState<ContentFilter>('all');
  const [modeFilter, setModeFilter] = useState<GenerationMode | 'all'>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');

  // Filter Logic
  const filteredHistory = useMemo(() => {
      let result = [...history];

      // Content Filter
      if (contentFilter !== 'all') {
          result = result.filter(item => item.type === contentFilter);
      }

      // Mode Filter
      if (modeFilter !== 'all') {
          result = result.filter(item => item.metadata?.mode === modeFilter);
      }

      // Sort Order
      result.sort((a, b) => {
          if (sortOrder === 'newest') return b.timestamp - a.timestamp;
          return a.timestamp - b.timestamp;
      });

      return result;
  }, [history, contentFilter, modeFilter, sortOrder]);

  // Reset selection, focus, and zoom when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
        setSelectedIds(new Set());
        setShowDeleteConfirm(false);
        setActiveItem(null);
        setLightboxZoomed(false);
        setFocusedId(null);
    } else {
        // Automatically focus the first item when opening if list exists
        if (filteredHistory.length > 0) {
            setFocusedId(filteredHistory[0].id);
        }
    }
  }, [isOpen]); 

  // Reset zoom when active item changes
  useEffect(() => {
    setLightboxZoomed(false);
  }, [activeItem]);

  // Stable callback for selection to prevent list re-renders
  const toggleSelection = useCallback((id: string) => {
    setSelectedIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        return newSet;
    });
  }, []);

  // Keyboard Navigation Handler
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
        // Prevent default browser scrolling for arrow keys if we are handling navigation
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
            // e.preventDefault() is called inside cases to avoid blocking defaults when not relevant
        }

        // Global Escape (Highest Priority)
        if (e.key === 'Escape') {
            if (lightboxZoomed) {
                setLightboxZoomed(false);
                e.stopPropagation();
                e.preventDefault();
                return;
            }
            if (activeItem) {
                setActiveItem(null);
                // When closing lightbox, ensure focus is on the item we just closed
                setFocusedId(activeItem.id);
                e.stopPropagation();
                e.preventDefault();
                return;
            }
            onClose();
            e.stopPropagation();
            e.preventDefault();
            return;
        }

        // 1. Lightbox Navigation
        if (activeItem) {
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                e.preventDefault();
                const currentIndex = filteredHistory.findIndex(i => i.id === activeItem.id);
                if (currentIndex === -1) return;

                let nextIndex = currentIndex;
                if (e.key === 'ArrowLeft') nextIndex = Math.max(0, currentIndex - 1);
                if (e.key === 'ArrowRight') nextIndex = Math.min(filteredHistory.length - 1, currentIndex + 1);

                if (nextIndex !== currentIndex) {
                    setActiveItem(filteredHistory[nextIndex]);
                    setFocusedId(filteredHistory[nextIndex].id); // Sync focus behind scene
                }
            }
            return;
        }

        // 2. Grid Navigation (When Lightbox Closed)
        // If nothing is focused, start with the first item
        const currentIndex = focusedId ? filteredHistory.findIndex(i => i.id === focusedId) : -1;
        
        // Auto-focus first item if navigation key pressed without focus
        if (currentIndex === -1 && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' '].includes(e.key)) {
            if (filteredHistory.length > 0) {
                e.preventDefault();
                setFocusedId(filteredHistory[0].id);
            }
            return;
        }

        if (currentIndex === -1) return;

        // Determine Columns based on Window Width (matching Tailwind breakpoints)
        const width = window.innerWidth;
        let cols = 1;
        if (width >= 1024) cols = 3;      // lg:
        else if (width >= 640) cols = 2;  // sm:
        
        let nextIndex = currentIndex;

        switch (e.key) {
            case 'ArrowRight':
                e.preventDefault();
                nextIndex = Math.min(filteredHistory.length - 1, currentIndex + 1);
                break;
            case 'ArrowLeft':
                e.preventDefault();
                nextIndex = Math.max(0, currentIndex - 1);
                break;
            case 'ArrowDown':
                e.preventDefault();
                nextIndex = Math.min(filteredHistory.length - 1, currentIndex + cols);
                break;
            case 'ArrowUp':
                e.preventDefault();
                nextIndex = Math.max(0, currentIndex - cols);
                break;
            case 'Enter':
                e.preventDefault();
                setActiveItem(filteredHistory[currentIndex]);
                break;
            case ' ': // Space to toggle select
                e.preventDefault();
                toggleSelection(filteredHistory[currentIndex].id);
                break;
        }

        if (nextIndex !== currentIndex) {
            setFocusedId(filteredHistory[nextIndex].id);
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeItem, focusedId, filteredHistory, toggleSelection, onClose, lightboxZoomed]);

  // Scroll Focused Item into View
  useEffect(() => {
    if (isOpen && focusedId && !activeItem) {
        const element = document.getElementById(`gallery-item-${focusedId}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }
  }, [focusedId, isOpen, activeItem]);

  const toggleSelectAll = () => {
    // Only select currently filtered items
    const visibleIds = filteredHistory.map(item => item.id);
    const allVisibleSelected = visibleIds.every(id => selectedIds.has(id));

    const newSet = new Set(selectedIds);
    if (allVisibleSelected) {
      visibleIds.forEach(id => newSet.delete(id));
    } else {
      visibleIds.forEach(id => newSet.add(id));
    }
    setSelectedIds(newSet);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    
    setIsDeleting(true);
    try {
      await onDeleteItems(Array.from(selectedIds));
      addToast(`Deleted ${selectedIds.size} items`, 'success');
      setSelectedIds(new Set());
      setShowDeleteConfirm(false);
      setFocusedId(null); // Reset focus after bulk delete
    } catch (e) {
      addToast('Failed to delete selected items', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // --- Bulk Download Logic ---
  const handleBulkDownload = async () => {
    if (selectedIds.size === 0) {
        addToast("No items selected.", 'warning');
        return;
    }

    setIsDownloading(true);
    addToast(selectedIds.size > 5 ? 'Preparing ZIP download...' : 'Starting downloads...', 'info');

    try {
        const itemsToDownload = history.filter(item => selectedIds.has(item.id));
        const processedFiles: { name: string, blob: Blob | string }[] = [];

        // 1. Process all files
        for (const item of itemsToDownload) {
            if (item.type === 'image') {
                const rawBlob = dataURLtoBlob(item.url);
                processedFiles.push({
                    name: `nanobanana-${item.id}.png`,
                    blob: rawBlob
                });
            } else if (item.type === 'text') {
                const blob = new Blob([item.text], { type: 'text/plain' });
                processedFiles.push({
                    name: `text-${item.timestamp}.txt`,
                    blob: blob
                });
            }
        }

        // 2. Decide: Individual or ZIP
        if (selectedIds.size <= 5) {
            // Individual Downloads
            let index = 0;
            for (const file of processedFiles) {
                const url = URL.createObjectURL(file.blob as Blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = file.name;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                
                // Small delay to prevent browser throttling
                if (index < processedFiles.length - 1) {
                    await new Promise(r => setTimeout(r, 300));
                }
                index++;
            }
            addToast(`Downloaded ${selectedIds.size} items`, 'success');

        } else {
            // ZIP Download
            const zipBlob = await createZip(processedFiles);
            const now = Date.now();
            const filename = `nanobanana - ${formatDateForFilename(now)}.zip`;
            
            const url = URL.createObjectURL(zipBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            addToast('ZIP download complete', 'success');
        }

    } catch (e) {
        console.error(e);
        addToast('Download failed', 'error');
    } finally {
        setIsDownloading(false);
    }
  };

  const handleSingleDelete = async (id: string) => {
      try {
          await onDeleteItems([id]);
          addToast('Item deleted', 'success');
          setActiveItem(null);
          // Focus resets automatically or stays if index valid
      } catch (e) {
          addToast('Failed to delete item', 'error');
      }
  };

  const handleSingleDownload = async (item: HistoryItem) => {
      try {
          if (item.type === 'image') {
            const rawBlob = dataURLtoBlob(item.url);
            const url = URL.createObjectURL(rawBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `nanobanana-${item.id}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          } else {
            const blob = new Blob([item.text], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `text-${item.timestamp}.txt`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          }
          addToast('Download started', 'info');
      } catch (e) {
          addToast('Download failed', 'error');
      }
  };

  const themeIconColor = isProTheme ? 'text-yellow-500' : 'text-cyan-400';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            // Removed backdrop-blur-md from here for performance, since bg is almost opaque
            className="absolute inset-0 bg-black/95"
            onClick={onClose}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            className="w-full h-full flex flex-col relative z-10 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-950/80 shrink-0">
              <h3 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
                <Grid3X3 size={20} className={themeIconColor} />
                Gallery
                <span className="text-zinc-500 text-sm font-normal ml-2">
                    {filteredHistory.length} items
                </span>
              </h3>
              <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Button 
                        variant="ghost" 
                        isProTheme={isProTheme}
                        disabled={selectedIds.size === 0 || isDownloading}
                        onClick={handleBulkDownload}
                        className="h-8 text-xs"
                    >
                        {isDownloading ? (
                           <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                        ) : (
                           <Download size={14} className="mr-2" />
                        )}
                        Download ({selectedIds.size})
                    </Button>
                    <Button 
                        variant="danger" 
                        isProTheme={isProTheme}
                        disabled={selectedIds.size === 0}
                        onClick={() => setShowDeleteConfirm(true)}
                        className="h-8 text-xs bg-red-900/20 hover:bg-red-900/40 border-red-900/30"
                    >
                        <Trash2 size={14} className="mr-2" />
                        Delete ({selectedIds.size})
                    </Button>
                  </div>
                  <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-white transition-colors">
                    <X size={20} />
                  </button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-4 px-6 py-3 border-b border-zinc-800 bg-zinc-900/40">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                        <Filter size={12} /> Type
                    </span>
                    <div className="flex bg-zinc-900 rounded-lg p-0.5 border border-zinc-800">
                        {(['all', 'image', 'text'] as ContentFilter[]).map((type) => (
                             <button
                                key={type}
                                onClick={() => setContentFilter(type)}
                                className={`px-3 py-1 text-xs rounded-md transition-all capitalize ${
                                    contentFilter === type 
                                    ? 'bg-zinc-800 text-zinc-100 shadow-sm' 
                                    : 'text-zinc-500 hover:text-zinc-300'
                                }`}
                             >
                                 {type}
                             </button>
                        ))}
                    </div>
                </div>

                <div className="w-px h-6 bg-zinc-800" />

                <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Mode</span>
                     <select 
                        value={modeFilter} 
                        onChange={(e) => setModeFilter(e.target.value as GenerationMode | 'all')}
                        className={`bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs rounded-lg px-2 py-1 focus:outline-none focus:ring-1 ${isProTheme ? 'focus:ring-yellow-500/50' : 'focus:ring-cyan-500/50'}`}
                     >
                         <option value="all">All Modes</option>
                         <option value={GenerationMode.IMAGE_EDIT}>Image Edit</option>
                         <option value={GenerationMode.IMAGE_TO_IMAGE}>Image → Image</option>
                         <option value={GenerationMode.IMG_TO_PROMPT}>Image → Text Prompt</option>
                         <option value={GenerationMode.TEXT_TO_PROMPT}>Text Prompt</option>
                     </select>
                </div>

                <div className="w-px h-6 bg-zinc-800" />
                
                <div className="flex items-center gap-2 ml-auto">
                     <button
                        onClick={() => setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-400 hover:text-white hover:border-zinc-700 transition-all"
                     >
                         {sortOrder === 'newest' ? <ArrowDownWideNarrow size={14} /> : <ArrowUpNarrowWide size={14} />}
                         {sortOrder === 'newest' ? 'Newest First' : 'Oldest First'}
                     </button>
                </div>
            </div>

            {/* Content Area - Grid */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-zinc-950/30 custom-scrollbar outline-none" tabIndex={0}>
                {filteredHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-4">
                        <Grid3X3 size={48} className="opacity-20" />
                        <p>No items found matching filters.</p>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center justify-end mb-4">
                            <button 
                                onClick={toggleSelectAll}
                                className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
                            >
                                {filteredHistory.every(item => selectedIds.has(item.id)) ? (
                                    <CheckSquare className={themeIconColor} size={18} />
                                ) : (
                                    <Square className="text-zinc-600" size={18} />
                                )}
                                Select All
                            </button>
                        </div>
                        
                        {/* 3-Column Grid 16:9 - Strictly enforced grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-12">
                            {filteredHistory.map(item => (
                                <GalleryItem 
                                    key={item.id}
                                    domId={`gallery-item-${item.id}`}
                                    item={item}
                                    isSelected={selectedIds.has(item.id)}
                                    isFocused={focusedId === item.id}
                                    onToggle={toggleSelection}
                                    onActivate={(itm) => {
                                        setActiveItem(itm);
                                        setFocusedId(itm.id);
                                    }}
                                    isProTheme={isProTheme}
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Delete Confirmation Overlay */}
            <AnimatePresence>
                {showDeleteConfirm && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="absolute inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => setShowDeleteConfirm(false)}
                    >
                        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl max-w-sm w-full shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
                            <h4 className="text-lg font-semibold text-zinc-100">Confirm Deletion</h4>
                            <p className="text-zinc-400 text-sm">
                                Are you sure you want to delete {selectedIds.size} items? This action cannot be undone.
                            </p>
                            <div className="flex justify-end gap-3 pt-2">
                                <Button variant="ghost" isProTheme={isProTheme} onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
                                <Button variant="danger" isProTheme={isProTheme} onClick={handleBulkDelete} isLoading={isDeleting}>Delete Forever</Button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Lightbox / Detail View */}
            <AnimatePresence>
                {activeItem && (
                    <LightboxView 
                        item={activeItem} 
                        isZoomed={lightboxZoomed}
                        setZoomed={setLightboxZoomed}
                        onClose={() => {
                            setActiveItem(null);
                            // Focus returns to grid via escape key handler automatically
                        }} 
                        onDelete={() => handleSingleDelete(activeItem.id)}
                        onDownload={() => handleSingleDownload(activeItem)}
                        onSendPromptToMode={onSendPromptToMode}
                        isProTheme={isProTheme}
                    />
                )}
            </AnimatePresence>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// --- Sub-component: Lightbox View ---
interface LightboxViewProps {
    item: HistoryItem;
    isZoomed: boolean;
    setZoomed: (val: boolean) => void;
    onClose: () => void;
    onDelete: () => void;
    onDownload: () => void;
    onSendPromptToMode?: (text: string, targetMode: GenerationMode) => void;
    isProTheme: boolean;
}

const LightboxView: React.FC<LightboxViewProps> = ({ item, isZoomed, setZoomed, onClose, onDelete, onDownload, onSendPromptToMode, isProTheme }) => {
    const { addToast } = useToast();
    const [displayUrl, setDisplayUrl] = useState<string | null>(null);
    const viewportRef = useRef<HTMLDivElement>(null);
    const clickTargetRef = useRef<{ x: number, y: number } | null>(null);

    // Zoom Logic
    useEffect(() => {
        if (isZoomed && clickTargetRef.current && viewportRef.current) {
            const viewport = viewportRef.current;
            
            // Use requestAnimationFrame to ensure the new layout (expanded image) is painted
            requestAnimationFrame(() => {
                 const { x, y } = clickTargetRef.current!;
                 const scrollW = viewport.scrollWidth;
                 const scrollH = viewport.scrollHeight;
                 const clientW = viewport.clientWidth;
                 const clientH = viewport.clientHeight;

                 // Calculate the pixel position of the clicked point on the zoomed image
                 const targetX = scrollW * x;
                 const targetY = scrollH * y;
                 
                 // Center the viewport on that pixel
                 const scrollLeft = targetX - (clientW / 2);
                 const scrollTop = targetY - (clientH / 2);
                 
                 viewport.scrollTo({ left: scrollLeft, top: scrollTop, behavior: 'instant' });
                 clickTargetRef.current = null;
            });

        } else if (!isZoomed && viewportRef.current) {
             viewportRef.current.scrollTo({ left: 0, top: 0, behavior: 'instant' });
        }
    }, [isZoomed]);

    // Blob URL Conversion
    useEffect(() => {
        let objectUrl: string | null = null;
        if (item.type === 'image' && item.url) {
             if (item.url.startsWith('data:')) {
                try {
                    const blob = dataURLtoBlob(item.url);
                    objectUrl = URL.createObjectURL(blob);
                    setDisplayUrl(objectUrl);
                } catch (e) {
                     setDisplayUrl(item.url);
                }
             } else {
                 setDisplayUrl(item.url);
             }
        } else {
            setDisplayUrl(null);
        }
        return () => {
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [item]);

    const handleZoomClick = (e: React.MouseEvent<HTMLImageElement>) => {
        if (isZoomed) {
            setZoomed(false);
        } else {
            const rect = e.currentTarget.getBoundingClientRect();
            // Calculate relative position (0 to 1) within the image
            const x = (e.clientX - rect.left) / rect.width;
            const y = (e.clientY - rect.top) / rect.height;
            clickTargetRef.current = { x, y };
            setZoomed(true);
        }
    };

    const accentText = isProTheme ? 'text-yellow-500' : 'text-cyan-400';

    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 z-[65] bg-zinc-950 flex"
            onClick={(e) => e.stopPropagation()}
        >
            {/* Left: Content Area */}
            <div className="flex-1 relative flex flex-col bg-black/50 overflow-hidden">
                <button 
                    onClick={onClose}
                    className="absolute top-4 left-4 z-50 bg-black/50 hover:bg-zinc-800 text-white p-2 rounded-full backdrop-blur-md transition-colors"
                >
                    <X size={20} />
                </button>

                {item.type === 'image' ? (
                    <div 
                        ref={viewportRef}
                        className="w-full h-full overflow-auto flex custom-scrollbar"
                    >
                        <img 
                            src={displayUrl || item.url} 
                            alt="Detail" 
                            draggable="false"
                            onClick={handleZoomClick}
                            className={`transition-transform duration-200 ease-out block m-auto ${isZoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}
                            style={isZoomed ? {
                                height: '200%',
                                width: 'auto',
                                maxWidth: 'none',
                                maxHeight: 'none',
                                flexShrink: 0
                            } : {
                                maxWidth: '100%',
                                maxHeight: '100%',
                                width: 'auto',
                                height: 'auto',
                                objectFit: 'contain'
                            }}
                        />
                    </div>
                ) : (
                    <div className="w-full h-full overflow-y-auto p-12 flex justify-center custom-scrollbar">
                        <div className="w-full max-w-3xl bg-zinc-900 border border-zinc-800 rounded-xl p-8 shadow-2xl h-fit">
                             <pre className="whitespace-pre-wrap font-mono text-sm text-zinc-300 leading-relaxed">
                                {item.text}
                            </pre>
                        </div>
                    </div>
                )}
            </div>

            {/* Right: Info Sidebar */}
            <div className="w-80 border-l border-zinc-800 bg-zinc-900/90 backdrop-blur-md flex flex-col shrink-0">
                <div className="p-5 border-b border-zinc-800 flex items-center gap-2">
                    <Info size={16} className={accentText} />
                    <h3 className="font-medium text-zinc-100">Metadata Inspector</h3>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
                    {/* 1. Mode + Model Version */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">Mode</label>
                            <div className="text-xs text-zinc-300 font-medium bg-zinc-950/50 p-2 rounded border border-zinc-800/50 break-words">
                                {MODE_LABELS[item.metadata?.mode || ''] || item.metadata?.mode}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">Model</label>
                            <div className="text-xs text-zinc-300 bg-zinc-950/50 p-2 rounded border border-zinc-800/50 font-mono break-all">
                                {item.metadata?.model?.replace('gemini-', '').replace('-preview', '') || 'N/A'}
                            </div>
                        </div>
                    </div>

                    {/* 2. Ref Operation */}
                    {item.metadata?.mode === GenerationMode.IMAGE_TO_IMAGE && item.metadata?.referenceOperation && (
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <label className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">Ref Operation</label>
                                {item.metadata.referenceOperation === ReferenceOperation.REPLICATE_REFERENCE && item.metadata.templateVersion && (
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${isProTheme ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-500' : 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400'}`}>
                                        {item.metadata.templateVersion}
                                    </span>
                                )}
                            </div>
                            <div className="text-sm text-zinc-300 bg-zinc-950/50 p-2 rounded border border-zinc-800/50 break-words">
                                {item.metadata.referenceOperation.replace(/_/g, ' ')}
                            </div>
                        </div>
                    )}

                    {/* 3. Prompt with Template Pill and Buttons */}
                    {item.metadata?.textPrompt && (
                        <div className="space-y-2">
                             <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <label className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">Prompt</label>
                                    {/* Only show template version here if NOT Image-to-Image (handled in Ref Operation) */}
                                    {item.metadata.templateVersion && item.metadata.mode !== GenerationMode.IMAGE_TO_IMAGE && (
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${isProTheme ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-500' : 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400'}`}>
                                            {item.metadata.templateVersion}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-1">
                                    {onSendPromptToMode && (
                                        <>
                                            <button 
                                                onClick={() => onSendPromptToMode(item.metadata?.textPrompt || "", GenerationMode.IMAGE_EDIT)}
                                                className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                                                title="Send to Image Edit"
                                            >
                                                <Type size={14} />
                                            </button>
                                            <button 
                                                onClick={() => onSendPromptToMode(item.metadata?.textPrompt || "", GenerationMode.IMAGE_TO_IMAGE)}
                                                className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                                                title="Send to Image → Image"
                                            >
                                                <Layers size={14} />
                                            </button>
                                        </>
                                    )}
                                    <button 
                                        onClick={() => {
                                            navigator.clipboard.writeText(item.metadata?.textPrompt || "");
                                            addToast('Copied', 'info');
                                        }}
                                        className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                                        title="Copy Prompt"
                                    >
                                        <Copy size={14} />
                                    </button>
                                </div>
                            </div>
                            <div className="text-xs text-zinc-400 bg-zinc-950/50 p-3 rounded border border-zinc-800/50 leading-relaxed max-h-40 overflow-y-auto custom-scrollbar whitespace-pre-wrap">
                                {item.metadata.textPrompt}
                            </div>
                        </div>
                    )}

                    {/* 4. Negative Prompt */}
                    {item.metadata?.negativePrompt && (
                         <div className="space-y-1">
                            <label className="text-xs uppercase tracking-wider text-red-400 font-semibold">Negative Prompt</label>
                            <div className="text-xs text-red-200/70 bg-red-950/10 p-3 rounded border border-red-900/20 leading-relaxed max-h-32 overflow-y-auto custom-scrollbar">
                                {item.metadata.negativePrompt}
                            </div>
                        </div>
                    )}

                    {/* 5. Ref Strength */}
                    {item.metadata?.mode === GenerationMode.IMAGE_TO_IMAGE && item.metadata?.refStrength !== undefined && (
                        <div className="space-y-1">
                            <label className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">Ref Strength</label>
                            <div className={`text-sm font-medium bg-zinc-950/50 p-2 rounded border border-zinc-800/50 ${accentText}`}>
                                {item.metadata.refStrength}%
                            </div>
                        </div>
                    )}

                    {/* 6. Settings */}
                    {(item.metadata?.aspectRatio || item.metadata?.resolution) && (
                        <div className="space-y-1">
                            <label className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">Settings</label>
                            <div className="grid grid-cols-2 gap-2">
                                {item.metadata.aspectRatio && (
                                    <div className="bg-zinc-950/50 p-2 rounded border border-zinc-800/50">
                                        <span className="text-[10px] text-zinc-500 block mb-0.5">Ratio</span>
                                        <span className="text-xs text-zinc-300">{item.metadata.aspectRatio}</span>
                                    </div>
                                )}
                                {item.metadata.resolution && (
                                    <div className="bg-zinc-950/50 p-2 rounded border border-zinc-800/50">
                                        <span className="text-[10px] text-zinc-500 block mb-0.5">Quality</span>
                                        <span className="text-xs text-zinc-300">{item.metadata.resolution}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* 7. Generation Time */}
                    {item.metadata?.duration && (
                        <div className="space-y-1">
                            <label className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">Generation Time</label>
                            <div className="text-sm text-zinc-300 bg-zinc-950/50 p-2 rounded border border-zinc-800/50 font-mono">
                                {(item.metadata.duration / 1000).toFixed(2)}s
                            </div>
                        </div>
                    )}
                    
                    {/* 8. Generated On */}
                    <div className="space-y-1 pt-4 border-t border-zinc-800/50">
                        <label className="text-xs uppercase tracking-wider text-zinc-600 font-semibold">Generated On</label>
                        <div className="text-xs text-zinc-500">
                            {new Date(item.timestamp).toLocaleString()}
                        </div>
                    </div>

                </div>

                {/* Actions Footer */}
                <div className="p-5 border-t border-zinc-800 bg-zinc-900/50 space-y-3">
                    <Button onClick={onDownload} isProTheme={isProTheme} className="w-full text-sm">
                        <Download size={16} className="mr-2" /> Download
                    </Button>
                    <Button variant="danger" isProTheme={isProTheme} onClick={onDelete} className="w-full text-sm bg-red-900/20 hover:bg-red-900/40 border-red-900/30">
                        <Trash2 size={16} className="mr-2" /> Delete Item
                    </Button>
                </div>
            </div>
        </motion.div>
    );
};

export default GalleryModal;
