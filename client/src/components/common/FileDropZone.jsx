import { useState, useCallback } from 'react';
import './FileDropZone.css';

function FileDropZone({ accept, onFileSelect, children, disabled = false }) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (disabled) return;
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      onFileSelect(files[0]);
    }
  }, [disabled, onFileSelect]);

  const handleFileInput = useCallback((e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileSelect(files[0]);
    }
    e.target.value = '';
  }, [onFileSelect]);

  return (
    <div
      className={`file-drop-zone ${isDragging ? 'dragging' : ''} ${disabled ? 'disabled' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept={accept}
        onChange={handleFileInput}
        disabled={disabled}
        className="file-input"
        id="file-input"
      />
      <label htmlFor="file-input" className="file-drop-zone-content">
        {children || (
          <>
            <div className="file-drop-icon">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <path
                  d="M24 4L12 16h8v16h8V16h8L24 4z"
                  fill="currentColor"
                  opacity="0.3"
                />
                <path
                  d="M40 36v4H8v-4H4v8h40v-8h-4z"
                  fill="currentColor"
                />
              </svg>
            </div>
            <p className="file-drop-text">
              파일을 드래그하거나 클릭하여 업로드
            </p>
          </>
        )}
      </label>
    </div>
  );
}

export default FileDropZone;
