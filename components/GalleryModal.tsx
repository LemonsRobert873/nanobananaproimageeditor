
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, Download, CheckSquare, Square, FileText, Image as ImageIcon, Grid3X3, Copy, Info, Filter, ArrowDownWideNarrow, ArrowUpNarrowWide, Check } from 'lucide-react';
import { HistoryItem, GenerationMode } from '../types';
import Button from './Button';
import { useToast } from '../context/ToastContext';

interface GalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryItem[];
  onDeleteItems: (ids: string[]) => Promise<void>;
  onDownloadImage: (url: string, id: string) => void;
}

type ContentFilter = 'all' | 'image' | 'text';
type SortOrder = 'newest' | 'oldest';

const GalleryModal: React.FC<GalleryModalProps> = ({ 
  isOpen, 
  onClose, 
  history, 
  onDeleteItems,
  onDownloadImage 
}) => {
  const { addToast } = useToast();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeItem, setActiveItem] = useState<HistoryItem | null>(null);
  const [lightboxZoomed, setLightboxZoomed] = useState(false);

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

  // Reset selection and zoom when modal opens/closes or active item changes
  useEffect(() => {
    if (!isOpen) {
        setSelectedIds(new Set());
        setShowDeleteConfirm(false);
        setActiveItem(null);
        setLightboxZoomed(false);
    }
  }, [isOpen]);

  // Reset zoom when active item changes
  useEffect(() => {
    setLightboxZoomed(false);
  }, [activeItem]);

  // Global Escape Key Handler for Gallery Context
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Priority 1: Reset Zoom
        if (lightboxZoomed) {
          setLightboxZoomed(false);
          e.stopPropagation();
          e.preventDefault();
          return;
        }
        
        // Priority 2: Close Lightbox
        if (activeItem) {
          setActiveItem(null);
          e.stopPropagation();
          e.preventDefault();
          return;
        }
        
        // Priority 3: Close Gallery
        onClose();
        e.stopPropagation();
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, lightboxZoomed, activeItem, onClose]);

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

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
    } catch (e) {
      addToast('Failed to delete selected items', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDownload = async () => {
    if (selectedIds.size === 0) return;

    const itemsToDownload = history.filter(item => selectedIds.has(item.id));
    let downloadedCount = 0;
    
    addToast('Starting downloads...', 'info');

    for (const item of itemsToDownload) {
      if (item.type === 'image') {
         const link = document.createElement('a');
         link.href = item.url;
         link.download = `nanobanana-${item.id}.png`;
         document.body.appendChild(link);
         link.click();
         document.body.removeChild(link);
         downloadedCount++;
         await new Promise(r => setTimeout(r, 200));
      } else if (item.type === 'text') {
         const blob = new Blob([item.text], { type: 'text/plain' });
         const url = URL.createObjectURL(blob);
         const link = document.createElement('a');
         link.href = url;
         link.download = `prompt-${item.id}.txt`;
         document.body.appendChild(link);
         link.click();
         document.body.removeChild(link);
         URL.revokeObjectURL(url);
         downloadedCount++;
         await new Promise(r => setTimeout(r, 100));
      }
    }
    
    addToast(`Downloaded ${downloadedCount} items`, 'success');
  };

  const handleSingleDelete = async (id: string) => {
      try {
          await onDeleteItems([id]);
          addToast('Item deleted', 'success');
          setActiveItem(null);
      } catch (e) {
          addToast('Failed to delete item', 'error');
      }
  };

  const handleSingleDownload = (item: HistoryItem) => {
      if (item.type === 'image') {
          onDownloadImage(item.url, item.id);
          addToast('Download started', 'info');
      } else {
          const blob = new Blob([item.text], { type: 'text/plain' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `prompt-${item.id}.txt`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          addToast('Download started', 'info');
      }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/95 backdrop-blur-md"
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
                <Grid3X3 size={20} className="text-yellow-500" />
                Gallery
                <span className="text-zinc-500 text-sm font-normal ml-2">
                    {filteredHistory.length} items
                </span>
              </h3>
              <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Button 
                        variant="ghost" 
                        disabled={selectedIds.size === 0}
                        onClick={handleBulkDownload}
                        className="h-8 text-xs"
                    >
                        <Download size={14} className="mr-2" />
                        Download ({selectedIds.size})
                    </Button>
                    <Button 
                        variant="danger" 
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
                        className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-yellow-500/50"
                     >
                         <option value="all">All Modes</option>
                         <option value={GenerationMode.IMAGE_EDIT}>Image Edit</option>
                         <option value={GenerationMode.IMAGE_TO_IMAGE}>Image to Image</option>
                         <option value={GenerationMode.IMG_TO_PROMPT}>Img to Prompt</option>
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
            <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-zinc-950/30 custom-scrollbar">
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
                                    <CheckSquare className="text-yellow-500" size={18} />
                                ) : (
                                    <Square className="text-zinc-600" size={18} />
                                )}
                                Select All
                            </button>
                        </div>
                        
                        {/* 3-Column Grid 16:9 */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredHistory.map(item => {
                                const isSelected = selectedIds.has(item.id);
                                return (
                                    <div 
                                        key={item.id}
                                        className={`relative group rounded-xl overflow-hidden border-2 transition-all bg-zinc-900 aspect-video ${
                                            isSelected ? 'border-yellow-500 ring-1 ring-yellow-500/50' : 'border-zinc-800 hover:border-zinc-700'
                                        }`}
                                    >
                                        {/* Checkbox Overlay (Click to Select) */}
                                        <div 
                                            className="absolute top-2 left-2 z-20 cursor-pointer p-1"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleSelection(item.id);
                                            }}
                                        >
                                            {isSelected ? (
                                                <div className="bg-yellow-500 text-black rounded text-xs p-0.5 shadow-sm">
                                                    <CheckSquare size={16} />
                                                </div>
                                            ) : (
                                                <div className="bg-black/40 text-white/50 hover:text-white rounded p-0.5 backdrop-blur-sm transition-colors">
                                                    <Square size={16} />
                                                </div>
                                            )}
                                        </div>

                                        {/* Main Content (Click to Open Lightbox) */}
                                        <div 
                                            className="cursor-pointer w-full h-full" 
                                            onClick={() => setActiveItem(item)}
                                        >
                                            {item.type === 'image' ? (
                                                <img 
                                                    src={item.url} 
                                                    draggable="false"
                                                    className="w-full h-full object-cover" 
                                                    loading="lazy" 
                                                    alt="Generated" 
                                                />
                                            ) : (
                                                <div className="w-full h-full p-4 flex flex-col bg-zinc-900 overflow-hidden">
                                                    <div className="flex items-center gap-2 text-zinc-500 mb-2 shrink-0">
                                                        <FileText size={16} />
                                                        <span className="text-[10px] uppercase font-bold tracking-wider">Prompt Text</span>
                                                    </div>
                                                    <p className="text-xs text-zinc-400 line-clamp-6 leading-relaxed flex-1">
                                                        {item.text}
                                                    </p>
                                                </div>
                                            )}
                                            
                                            {/* Hover Metadata Overlay */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3 pointer-events-none">
                                                <div className="flex items-center gap-1.5 text-zinc-300">
                                                    {item.type === 'image' ? <ImageIcon size={12} /> : <FileText size={12} />}
                                                    <span className="text-[10px] font-medium">{item.metadata?.mode?.replace(/_/g, ' ')}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
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
                                <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
                                <Button variant="danger" onClick={handleBulkDelete} isLoading={isDeleting}>Delete Forever</Button>
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
                        onClose={() => setActiveItem(null)} 
                        onDelete={() => handleSingleDelete(activeItem.id)}
                        onDownload={() => handleSingleDownload(activeItem)}
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
}

const LightboxView: React.FC<LightboxViewProps> = ({ item, isZoomed, setZoomed, onClose, onDelete, onDownload }) => {
    const { addToast } = useToast();
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
                            src={item.url} 
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
                    <Info size={16} className="text-yellow-500" />
                    <h3 className="font-medium text-zinc-100">Metadata Inspector</h3>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
                    {/* Common Metadata */}
                    <div className="space-y-1">
                        <label className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">Mode</label>
                        <div className="text-sm text-zinc-300 font-medium bg-zinc-950/50 p-2 rounded border border-zinc-800/50 break-words">
                            {item.metadata?.mode}
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">Created</label>
                        <div className="text-sm text-zinc-400">
                            {new Date(item.timestamp).toLocaleString()}
                        </div>
                    </div>

                    {/* Image Specific */}
                    {item.metadata?.aspectRatio && (
                        <div className="grid grid-cols-2 gap-2">
                             <div className="space-y-1">
                                <label className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">Ratio</label>
                                <div className="text-sm text-zinc-300 bg-zinc-950/50 p-2 rounded border border-zinc-800/50">{item.metadata.aspectRatio}</div>
                             </div>
                             {item.metadata.resolution && (
                                <div className="space-y-1">
                                    <label className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">Quality</label>
                                    <div className="text-sm text-zinc-300 bg-zinc-950/50 p-2 rounded border border-zinc-800/50">{item.metadata.resolution}</div>
                                </div>
                             )}
                        </div>
                    )}

                    {item.metadata?.referenceOperation && (
                        <div className="space-y-1">
                            <label className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">Ref Operation</label>
                            <div className="text-sm text-zinc-300 bg-zinc-950/50 p-2 rounded border border-zinc-800/50 break-words">
                                {item.metadata.referenceOperation}
                            </div>
                        </div>
                    )}

                    {item.metadata?.refStrength !== undefined && (
                        <div className="space-y-1">
                            <label className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">Ref Strength</label>
                            <div className="text-sm text-yellow-500 font-medium bg-zinc-950/50 p-2 rounded border border-zinc-800/50">
                                {item.metadata.refStrength}%
                            </div>
                        </div>
                    )}

                    {/* Prompts */}
                    {item.metadata?.textPrompt && (
                        <div className="space-y-1">
                            <div className="flex items-center justify-between">
                                <label className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">Prompt</label>
                                <button 
                                    onClick={() => {
                                        navigator.clipboard.writeText(item.metadata?.textPrompt || "");
                                        addToast('Copied', 'info');
                                    }}
                                    className="text-[10px] flex items-center gap-1 text-zinc-500 hover:text-white"
                                >
                                    <Copy size={10} /> Copy
                                </button>
                            </div>
                            <div className="text-xs text-zinc-400 bg-zinc-950/50 p-3 rounded border border-zinc-800/50 leading-relaxed max-h-40 overflow-y-auto custom-scrollbar">
                                {item.metadata.textPrompt}
                            </div>
                        </div>
                    )}

                    {item.metadata?.negativePrompt && (
                         <div className="space-y-1">
                            <label className="text-xs uppercase tracking-wider text-red-400 font-semibold">Negative Prompt</label>
                            <div className="text-xs text-red-200/70 bg-red-950/10 p-3 rounded border border-red-900/20 leading-relaxed max-h-32 overflow-y-auto custom-scrollbar">
                                {item.metadata.negativePrompt}
                            </div>
                        </div>
                    )}
                </div>

                {/* Actions Footer */}
                <div className="p-5 border-t border-zinc-800 bg-zinc-900/50 space-y-3">
                    <Button onClick={onDownload} className="w-full text-sm">
                        <Download size={16} className="mr-2" /> Download
                    </Button>
                    <Button variant="danger" onClick={onDelete} className="w-full text-sm bg-red-900/20 hover:bg-red-900/40 border-red-900/30">
                        <Trash2 size={16} className="mr-2" /> Delete Item
                    </Button>
                </div>
            </div>
        </motion.div>
    );
};

export default GalleryModal;
