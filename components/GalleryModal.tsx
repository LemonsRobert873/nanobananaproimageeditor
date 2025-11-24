
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, Download, CheckSquare, Square, FileText, Image as ImageIcon, Grid3X3 } from 'lucide-react';
import { HistoryItem } from '../types';
import Button from './Button';
import { useToast } from '../context/ToastContext';

interface GalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryItem[];
  onDeleteItems: (ids: string[]) => Promise<void>;
  onDownloadImage: (url: string, id: string) => void;
}

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

  // Reset selection when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
        setSelectedIds(new Set());
        setShowDeleteConfirm(false);
    }
  }, [isOpen]);

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
    if (selectedIds.size === history.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(history.map(item => item.id)));
    }
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
         // Create a temporary link for image download
         const link = document.createElement('a');
         link.href = item.url;
         link.download = `nanobanana-${item.id}.png`;
         document.body.appendChild(link);
         link.click();
         document.body.removeChild(link);
         downloadedCount++;
         // Small delay to prevent browser blocking
         await new Promise(r => setTimeout(r, 200));
      } else if (item.type === 'text') {
         // Create a text file download
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

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/90 backdrop-blur-md"
            onClick={onClose}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-zinc-950 border border-zinc-800 rounded-xl w-full max-w-6xl max-h-[90vh] shadow-2xl flex flex-col relative z-10 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/50 shrink-0">
              <h3 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
                <Grid3X3 size={20} className="text-yellow-500" />
                Gallery View
                <span className="text-zinc-500 text-sm font-normal ml-2">
                    {history.length} items
                </span>
              </h3>
              <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Toolbar */}
            <div className="p-4 border-b border-zinc-800 bg-zinc-900/30 flex flex-wrap gap-4 items-center justify-between shrink-0">
                <button 
                  onClick={toggleSelectAll}
                  className="flex items-center gap-2 text-sm text-zinc-300 hover:text-white transition-colors"
                >
                    {selectedIds.size === history.length && history.length > 0 ? (
                        <CheckSquare className="text-yellow-500" size={18} />
                    ) : (
                        <Square className="text-zinc-600" size={18} />
                    )}
                    Select All
                </button>

                <div className="flex items-center gap-3">
                    <Button 
                        variant="ghost" 
                        disabled={selectedIds.size === 0}
                        onClick={handleBulkDownload}
                        className="h-9 text-xs"
                    >
                        <Download size={14} className="mr-2" />
                        Download Selected ({selectedIds.size})
                    </Button>
                    <Button 
                        variant="danger" 
                        disabled={selectedIds.size === 0}
                        onClick={() => setShowDeleteConfirm(true)}
                        className="h-9 text-xs"
                    >
                        <Trash2 size={14} className="mr-2" />
                        Delete Selected ({selectedIds.size})
                    </Button>
                </div>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto p-6 bg-zinc-950/50 custom-scrollbar">
                {history.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-4">
                        <Grid3X3 size={48} className="opacity-20" />
                        <p>No items in history yet.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        {history.map(item => {
                            const isSelected = selectedIds.has(item.id);
                            return (
                                <motion.div 
                                    layout
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    key={item.id}
                                    className={`relative group rounded-lg overflow-hidden border-2 transition-all cursor-pointer bg-zinc-900 aspect-square flex flex-col ${
                                        isSelected ? 'border-yellow-500 ring-1 ring-yellow-500/50' : 'border-zinc-800 hover:border-zinc-600'
                                    }`}
                                    onClick={() => toggleSelection(item.id)}
                                >
                                    {/* Selection Overlay */}
                                    <div className={`absolute inset-0 bg-yellow-500/10 transition-opacity pointer-events-none z-10 ${isSelected ? 'opacity-100' : 'opacity-0'}`} />

                                    {/* Checkbox */}
                                    <div className="absolute top-2 left-2 z-20">
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

                                    {/* Content */}
                                    {item.type === 'image' ? (
                                        <img src={item.url} className="w-full h-full object-cover" loading="lazy" alt="Generated" />
                                    ) : (
                                        <div className="w-full h-full p-4 flex flex-col items-center justify-center text-center">
                                            <FileText size={24} className="text-zinc-600 mb-2" />
                                            <p className="text-[10px] text-zinc-500 line-clamp-4 leading-relaxed">
                                                {item.text}
                                            </p>
                                        </div>
                                    )}

                                    {/* Metadata Bar */}
                                    <div className="absolute bottom-0 inset-x-0 bg-black/80 backdrop-blur-md p-2 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                        <div className="flex items-center gap-1.5 text-zinc-400">
                                            {item.type === 'image' ? <ImageIcon size={10} /> : <FileText size={10} />}
                                            <span className="text-[10px] font-medium">{item.metadata?.mode?.replace('_', ' ')}</span>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>
            
            {/* Delete Confirmation Overlay */}
            <AnimatePresence>
                {showDeleteConfirm && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="absolute inset-0 z-30 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
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

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default GalleryModal;
