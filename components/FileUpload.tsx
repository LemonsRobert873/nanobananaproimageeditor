import React, { useRef, useState, useEffect } from 'react';
import { Upload, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { dataURLtoFile } from '../utils/imageUtils';

interface FileUploadProps {
  label: string;
  helperText?: string;
  onFileSelect: (file: File | null) => void;
  selectedFile: File | null;
  required?: boolean;
  className?: string;
  isActive?: boolean;
  onActivate?: () => void;
  isProTheme?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ 
  label, 
  helperText, 
  onFileSelect, 
  selectedFile,
  required,
  className = "",
  isActive,
  onActivate,
  isProTheme = true
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [selectedFile]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    // 1. Check for internal drag (from history)
    const internalUrl = e.dataTransfer.getData('application/x-nanobanana-image');
    if (internalUrl) {
      const file = dataURLtoFile(internalUrl, 'dragged-history-image.png');
      onFileSelect(file);
      if (onActivate) onActivate();
      return;
    }

    // 2. Check for external file drop
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        onFileSelect(file);
        if (onActivate) onActivate();
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
      if (onActivate) onActivate();
    }
  };

  const clearFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFileSelect(null);
    if (inputRef.current) inputRef.current.value = '';
    // We don't necessarily clear active state here to allow pasting a new one immediately
  };

  const handleClick = () => {
    if (onActivate) onActivate();
    inputRef.current?.click();
  };

  const activeColor = isProTheme ? '#EAB308' : '#06b6d4'; // Yellow or Cyan
  const activeText = isProTheme ? 'text-yellow-500' : 'text-cyan-400';
  const activeBg = isProTheme ? 'rgba(234, 179, 8, 0.05)' : 'rgba(6, 182, 212, 0.05)';
  const activeShadow = isProTheme ? '0 0 0 2px rgba(234, 179, 8, 0.2)' : '0 0 0 2px rgba(6, 182, 212, 0.2)';

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <div className="flex justify-between items-baseline mb-2">
          <label className={`block text-sm font-medium transition-colors ${isActive ? activeText : 'text-zinc-200'}`}>
            {label} {required && <span className={activeText}>*</span>}
          </label>
        </div>
      )}
      
      <motion.div 
        onClick={handleClick}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDragOver(false);
        }}
        onDrop={handleDrop}
        animate={{
          borderColor: isDragOver ? activeColor : (isActive ? activeColor : (previewUrl ? '#3f3f46' : '#27272a')),
          backgroundColor: isDragOver ? activeBg : (previewUrl ? '#18181b' : '#18181b'),
          scale: isDragOver ? 1.01 : 1,
          boxShadow: isActive ? activeShadow : 'none'
        }}
        transition={{ duration: 0.2 }}
        className={`
          relative group cursor-pointer 
          rounded-xl border-2 border-dashed
          h-40 flex flex-col items-center justify-center overflow-hidden
          transition-colors
        `}
      >
        <input 
          ref={inputRef}
          type="file" 
          accept="image/*" 
          className="hidden" 
          onChange={handleChange}
        />

        <AnimatePresence mode="wait">
          {previewUrl ? (
            <motion.div 
              key="preview"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full h-full relative"
            >
              <img 
                src={previewUrl} 
                alt="Preview" 
                className="w-full h-full object-contain bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-zinc-950/50" 
              />
              <motion.div 
                initial={{ opacity: 0 }}
                whileHover={{ opacity: 1 }}
                className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm"
              >
                 <span className="text-white font-medium flex items-center gap-2">
                   <Upload size={16} /> Change Image
                 </span>
              </motion.div>
              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={clearFile}
                className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-red-500/80 rounded-full text-white transition-colors"
              >
                <X size={14} />
              </motion.button>
            </motion.div>
          ) : (
            <motion.div 
              key="placeholder"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-center p-4"
            >
              <motion.div 
                className="mx-auto w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center mb-2"
                animate={{ 
                  scale: isDragOver || isActive ? 1.1 : 1,
                  backgroundColor: isDragOver || isActive ? activeColor : '#27272a',
                  color: isDragOver || isActive ? '#000000' : '#a1a1aa'
                }}
              >
                <Upload className="w-5 h-5" />
              </motion.div>
              <p className={`text-sm transition-colors ${isActive ? activeText : 'text-zinc-400 group-hover:text-zinc-200'}`}>
                 {isActive ? 'Paste or Drop Image' : 'Upload image'}
              </p>
              {helperText && (
                <p className="text-xs text-zinc-600 mt-1">{helperText}</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default FileUpload;