import React, { useRef, useState } from 'react';
import { Upload } from 'lucide-react';

export interface FileDropzoneProps {
  onFile: (file: File) => void;
  accept?: string;
  inputRef?: React.RefObject<HTMLInputElement>;
  className?: string;
  title?: string;
  subtitle?: string;
}

export function FileDropzone({
  onFile,
  accept = '.csv,text/csv',
  inputRef,
  className = '',
  title = 'Drag and drop your file here, or click to browse',
  subtitle = 'Only supported file types are accepted'
}: FileDropzoneProps) {
  const localRef = useRef<HTMLInputElement>(null);
  const mergedRef = inputRef ?? localRef;
  const [isDragActive, setIsDragActive] = useState(false);

  const openFilePicker = () => {
    const input = mergedRef.current as HTMLInputElement | null;
    if (!input) return;
    try {
      const maybePicker = (input as unknown as { showPicker?: () => void });
      if (typeof maybePicker.showPicker === 'function') {
        maybePicker.showPicker();
        return;
      }
    } catch {}
    input.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`w-full border-2 border-dashed rounded-md p-6 text-center transition-colors ${
        isDragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10' : 'border-gray-300 dark:border-gray-700'
      } ${className}`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openFilePicker();
        }
      }}
      aria-label="File upload dropzone"
      onClick={openFilePicker}
    >
      <input
        ref={mergedRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="sr-only"
      />
      <Upload className="h-5 w-5 mx-auto mb-2 opacity-70" />
      <p className="text-sm">{title}</p>
      <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
    </div>
  );
}

export default FileDropzone;