import { useState } from 'react';
import Card from '../components/common/Card';
import FileDropZone from '../components/common/FileDropZone';
import { useToast } from '../context/ToastContext';
import './ConvertPage.css';

const STATUS = {
  IDLE: 'idle',
  UPLOADING: 'uploading',
  CONVERTING: 'converting',
  COMPLETED: 'completed',
  ERROR: 'error'
};

function ConvertPage() {
  const [status, setStatus] = useState(STATUS.IDLE);
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState(0);
  const [pdfBlob, setPdfBlob] = useState(null);
  const [pdfFileName, setPdfFileName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const { showToast } = useToast();

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileSelect = async (file) => {
    const ext = file.name.toLowerCase();
    if (!ext.endsWith('.ppt') && !ext.endsWith('.pptx')) {
      showToast('PPT 또는 PPTX 파일만 업로드 가능합니다', 'error');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      showToast('파일 크기는 50MB를 초과할 수 없습니다', 'error');
      return;
    }

    setFileName(file.name);
    setFileSize(file.size);
    setStatus(STATUS.UPLOADING);
    setErrorMessage('');
    setPdfBlob(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      setStatus(STATUS.CONVERTING);

      const response = await fetch('/api/convert/ppt-to-pdf', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '변환에 실패했습니다');
      }

      const blob = await response.blob();
      const pdfName = file.name.replace(/\.(ppt|pptx)$/i, '.pdf');
      
      setPdfBlob(blob);
      setPdfFileName(pdfName);
      setStatus(STATUS.COMPLETED);
      showToast('PDF 변환이 완료되었습니다', 'success');

    } catch (error) {
      console.error('Conversion error:', error);
      setErrorMessage(error.message || '변환 중 오류가 발생했습니다');
      setStatus(STATUS.ERROR);
      showToast(error.message || '변환에 실패했습니다', 'error');
    }
  };

  const handleDownload = () => {
    if (!pdfBlob) return;

    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = pdfFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setStatus(STATUS.IDLE);
    setFileName('');
    setFileSize(0);
    setPdfBlob(null);
    setPdfFileName('');
    setErrorMessage('');
  };

  const renderStatus = () => {
    switch (status) {
      case STATUS.UPLOADING:
        return (
          <div className="status-container">
            <div className="spinner" />
            <p className="status-text">파일 업로드 중...</p>
          </div>
        );
      case STATUS.CONVERTING:
        return (
          <div className="status-container">
            <div className="spinner" />
            <p className="status-text">PDF로 변환 중...</p>
            <p className="status-hint">파일 크기에 따라 시간이 걸릴 수 있습니다</p>
          </div>
        );
      case STATUS.COMPLETED:
        return (
          <div className="status-container success">
            <div className="status-icon success">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="3" fill="none"/>
                <path d="M15 24l6 6 12-12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p className="status-text">변환 완료!</p>
            <p className="status-hint">{pdfFileName}</p>
          </div>
        );
      case STATUS.ERROR:
        return (
          <div className="status-container error">
            <div className="status-icon error">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="3" fill="none"/>
                <path d="M17 17l14 14M31 17L17 31" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
              </svg>
            </div>
            <p className="status-text">변환 실패</p>
            <p className="status-hint">{errorMessage}</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="convert-page">
      <div className="page-header">
        <h1 className="page-title">PPT to PDF</h1>
        <p className="page-subtitle">PowerPoint 파일을 PDF로 변환합니다</p>
      </div>

      <Card>
        {status === STATUS.IDLE ? (
          <FileDropZone
            accept=".ppt,.pptx"
            onFileSelect={handleFileSelect}
          >
            <div className="file-drop-icon">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <rect x="6" y="8" width="28" height="32" rx="4" stroke="currentColor" strokeWidth="2" fill="none"/>
                <rect x="14" y="14" width="28" height="32" rx="4" fill="currentColor" opacity="0.1" stroke="currentColor" strokeWidth="2"/>
                <path d="M22 26h12M22 32h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <p className="file-drop-text">PPT/PPTX 파일을 드래그하거나 클릭하여 업로드</p>
            <p className="file-drop-hint">최대 50MB까지 지원됩니다</p>
          </FileDropZone>
        ) : (
          <div className="convert-status">
            {/* File Info */}
            <div className="file-info-row">
              <div className="file-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 2a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6H6zm7 1.5L18.5 9H13V3.5zM8 12h8v2H8v-2zm0 4h5v2H8v-2z"/>
                </svg>
              </div>
              <div className="file-details">
                <span className="file-name">{fileName}</span>
                <span className="file-size">{formatFileSize(fileSize)}</span>
              </div>
            </div>

            {/* Status */}
            {renderStatus()}

            {/* Actions */}
            <div className="convert-actions">
              {status === STATUS.COMPLETED && (
                <button className="btn btn-primary" onClick={handleDownload}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 3v10m0 0l-4-4m4 4l4-4M3 17h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                  </svg>
                  PDF 다운로드
                </button>
              )}
              <button className="btn btn-secondary" onClick={handleReset}>
                {status === STATUS.COMPLETED ? '다른 파일 변환' : '취소'}
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Info Section */}
      <Card className="info-card">
        <h3 className="ios-card-title">지원 정보</h3>
        <ul className="info-list">
          <li>지원 형식: PPT, PPTX (PowerPoint)</li>
          <li>최대 파일 크기: 50MB</li>
          <li>변환 시간: 파일 크기에 따라 수 초 ~ 수 분</li>
          <li>변환된 PDF는 자동으로 다운로드됩니다</li>
        </ul>
      </Card>
    </div>
  );
}

export default ConvertPage;
