import React, { useRef, useState, useEffect } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

interface FileUploadProps {
  label: string;
  helperText?: string;
  onFileSelect: (file: File | null) => void;
  selectedFile: File | null;
  required?: boolean;
  className?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({ 
  label, 
  helperText, 
  onFileSelect, 
  selectedFile,
  required,
  className = ""
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  const clearFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFileSelect(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="flex justify-between items-baseline mb-2">
        <label className="block text-sm font-medium text-zinc-200">
          {label} {required && <span className="text-yellow-500">*</span>}
        </label>
      </div>
      
      <div 
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          e.currentTarget.classList.add('ring-2', 'ring-yellow-500', 'ring-opacity-50');
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.currentTarget.classList.remove('ring-2', 'ring-yellow-500', 'ring-opacity-50');
        }}
        onDrop={(e) => {
           e.currentTarget.classList.remove('ring-2', 'ring-yellow-500', 'ring-opacity-50');
           handleDrop(e);
        }}
        className={`
          relative group cursor-pointer 
          rounded-xl transition-all duration-200
          ${previewUrl 
            ? 'bg-zinc-900 ring-1 ring-zinc-700' 
            : 'bg-zinc-900 border-2 border-dashed border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800/50'
          }
          h-40 flex flex-col items-center justify-center overflow-hidden
        `}
      >
        <input 
          ref={inputRef}
          type="file" 
          accept="image/*" 
          className="hidden" 
          onChange={handleChange}
        />

        {previewUrl ? (
          <>
            <img 
              src={previewUrl} 
              alt="Preview" 
              className="w-full h-full object-contain bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-zinc-950/50" 
            />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
               <span className="text-white font-medium flex items-center gap-2">
                 <Upload size={16} /> Change Image
               </span>
            </div>
            <button 
              onClick={clearFile}
              className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-red-500/80 rounded-full text-white transition-colors"
            >
              <X size={14} />
            </button>
          </>
        ) : (
          <div className="text-center p-4">
            <div className="mx-auto w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Upload className="w-5 h-5 text-zinc-400 group-hover:text-yellow-400" />
            </div>
            <p className="text-sm text-zinc-400 group-hover:text-zinc-200 transition-colors">Upload image</p>
            {helperText && (
              <p className="text-xs text-zinc-600 mt-1">{helperText}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUpload;