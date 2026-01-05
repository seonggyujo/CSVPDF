import { useRef, useState } from 'react';

function ImageUploader({ onSave, onClose }) {
  const fileInputRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 파일 타입 검증
    if (!file.type.startsWith('image/')) {
      setError('이미지 파일만 업로드할 수 있습니다.');
      return;
    }

    // 파일 크기 검증 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('파일 크기는 5MB 이하여야 합니다.');
      return;
    }

    setError('');

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // 이미지 크기 조정 (최대 300px)
        const maxSize = 300;
        let width = img.width;
        let height = img.height;

        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = (height / width) * maxSize;
            width = maxSize;
          } else {
            width = (width / height) * maxSize;
            height = maxSize;
          }
        }

        // 캔버스에 리사이즈된 이미지 그리기
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        setPreview(canvas.toDataURL('image/png'));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const fakeEvent = { target: { files: [file] } };
      handleFileSelect(fakeEvent);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleSave = () => {
    if (preview) {
      onSave(preview);
    }
  };

  const clearPreview = () => {
    setPreview(null);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <div className="tool-panel-overlay" onClick={onClose} />
      <div className="tool-panel">
        <div className="tool-panel-header">
          <h2>이미지 업로드</h2>
          <button className="tool-panel-close" onClick={onClose}>×</button>
        </div>

        {!preview ? (
          <div
            className="image-upload-zone"
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            <div style={{ color: '#666' }}>
              <p style={{ fontSize: '32px', marginBottom: '8px' }}>+</p>
              <p>클릭하거나 이미지를 드래그하세요</p>
              <p style={{ fontSize: '12px', marginTop: '8px', color: '#999' }}>
                PNG, JPG (최대 5MB)
              </p>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              background: '#f5f5f5', 
              padding: '20px', 
              borderRadius: '8px',
              marginBottom: '16px'
            }}>
              <img
                src={preview}
                alt="미리보기"
                className="image-preview"
              />
            </div>
            <button 
              className="btn btn-secondary" 
              onClick={clearPreview}
              style={{ marginRight: '8px' }}
            >
              다시 선택
            </button>
          </div>
        )}

        {error && (
          <p style={{ color: '#e74c3c', fontSize: '13px', marginTop: '12px' }}>
            {error}
          </p>
        )}

        <div className="signature-actions" style={{ marginTop: '20px', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>
            취소
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleSave}
            disabled={!preview}
          >
            사용하기
          </button>
        </div>
      </div>
    </>
  );
}

export default ImageUploader;
