import { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// PDF.js worker 설정 (로컬 파일 사용 - CSP 호환)
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

function PdfViewer({ 
  file, 
  currentPage, 
  selectedPages, 
  onPageChange, 
  onPageSelect, 
  onPdfLoad,
  onScaleChange,
  signatures,
  onSignatureMove,
  onSignatureResize,
  onSignatureDelete,
  selectedSignature,
  onSignatureSelect
}) {
  const [pdfDoc, setPdfDoc] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [thumbnails, setThumbnails] = useState([]);
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 });
  const [renderScale, setRenderScale] = useState(1);
  const [justDragged, setJustDragged] = useState(false);
  const mainCanvasRef = useRef(null);
  const containerRef = useRef(null);
  const wrapperRef = useRef(null);
  const dragTimerRef = useRef(null);

  // PDF 로드
  useEffect(() => {
    if (!file) return;

    const loadPdf = async () => {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        setPdfDoc(pdf);
        setTotalPages(pdf.numPages);
        onPdfLoad?.(pdf.numPages);

        // 썸네일 생성
        const thumbs = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 0.2 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          
          await page.render({
            canvasContext: context,
            viewport: viewport
          }).promise;
          
          thumbs.push({
            pageNum: i,
            dataUrl: canvas.toDataURL()
          });
        }
        setThumbnails(thumbs);
      } catch (error) {
        console.error('PDF 로드 실패:', error);
      }
    };

    loadPdf();
  }, [file, onPdfLoad]);

  // 현재 페이지 렌더링
  useEffect(() => {
    if (!pdfDoc || !mainCanvasRef.current) return;

    const renderPage = async () => {
      const page = await pdfDoc.getPage(currentPage);
      const canvas = mainCanvasRef.current;
      const context = canvas.getContext('2d');
      
      // 컨테이너에 맞게 스케일 조정
      const containerWidth = containerRef.current?.clientWidth || 800;
      const maxHeight = 600;
      
      const originalViewport = page.getViewport({ scale: 1 });
      const scaleX = (containerWidth - 40) / originalViewport.width;
      const scaleY = maxHeight / originalViewport.height;
      const scale = Math.min(scaleX, scaleY, 1.5);
      
      const viewport = page.getViewport({ scale });
      
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      setPageSize({ width: viewport.width, height: viewport.height });
      setRenderScale(scale);
      
      // 부모에게 scale과 원본 페이지 크기 전달
      onScaleChange?.({
        scale,
        originalWidth: originalViewport.width,
        originalHeight: originalViewport.height,
        renderedWidth: viewport.width,
        renderedHeight: viewport.height
      });
      
      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;
    };

    renderPage();
  }, [pdfDoc, currentPage, onScaleChange]);

  // 페이지 선택 토글
  const togglePageSelect = useCallback((pageNum) => {
    const newSelected = selectedPages.includes(pageNum)
      ? selectedPages.filter(p => p !== pageNum)
      : [...selectedPages, pageNum].sort((a, b) => a - b);
    onPageSelect(newSelected);
  }, [selectedPages, onPageSelect]);

  // 드래그 관련 상태
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragSignature, setDragSignature] = useState(null);

  // 서명 드래그 시작
  const handleSignatureMouseDown = (e, sig) => {
    e.stopPropagation();
    onSignatureSelect(sig.id);
    setIsDragging(true);
    setDragSignature(sig);
    
    // wrapper 기준 상대 좌표 계산
    const wrapperRect = wrapperRef.current?.getBoundingClientRect();
    if (!wrapperRect) return;
    
    const offsetX = e.clientX - wrapperRect.left - sig.x;
    const offsetY = e.clientY - wrapperRect.top - sig.y;
    
    setDragStart({ x: offsetX, y: offsetY });
  };

  // 서명 드래그 중
  const handleMouseMove = useCallback((e) => {
    if (!isDragging || !dragSignature) return;
    
    const wrapperRect = wrapperRef.current?.getBoundingClientRect();
    if (!wrapperRect) return;
    
    const newX = e.clientX - wrapperRect.left - dragStart.x;
    const newY = e.clientY - wrapperRect.top - dragStart.y;
    
    // 경계 체크
    const boundedX = Math.max(0, Math.min(newX, pageSize.width - dragSignature.width));
    const boundedY = Math.max(0, Math.min(newY, pageSize.height - dragSignature.height));
    
    onSignatureMove(dragSignature.id, boundedX, boundedY);
  }, [isDragging, dragSignature, dragStart, pageSize, onSignatureMove]);

  // 서명 드래그 종료
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragSignature(null);
    setJustDragged(true);
    if (dragTimerRef.current) clearTimeout(dragTimerRef.current);
    dragTimerRef.current = setTimeout(() => setJustDragged(false), 100);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // 리사이즈 관련
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });

  const handleResizeMouseDown = (e, sig) => {
    e.stopPropagation();
    setIsResizing(true);
    setDragSignature(sig);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: sig.width,
      height: sig.height
    });
  };

  const handleResizeMove = useCallback((e) => {
    if (!isResizing || !dragSignature) return;
    
    const deltaX = e.clientX - resizeStart.x;
    const aspectRatio = resizeStart.width / resizeStart.height;
    const newWidth = Math.max(30, resizeStart.width + deltaX);
    const newHeight = newWidth / aspectRatio;
    
    onSignatureResize(dragSignature.id, newWidth, newHeight);
  }, [isResizing, dragSignature, resizeStart, onSignatureResize]);

  const handleResizeUp = useCallback(() => {
    setIsResizing(false);
    setDragSignature(null);
    setJustDragged(true);
    if (dragTimerRef.current) clearTimeout(dragTimerRef.current);
    dragTimerRef.current = setTimeout(() => setJustDragged(false), 100);
  }, []);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleResizeMove);
      window.addEventListener('mouseup', handleResizeUp);
      return () => {
        window.removeEventListener('mousemove', handleResizeMove);
        window.removeEventListener('mouseup', handleResizeUp);
      };
    }
  }, [isResizing, handleResizeMove, handleResizeUp]);

  // 캔버스 클릭 시 선택 해제 (드래그 직후에는 무시)
  const handleCanvasClick = () => {
    if (justDragged) return;
    onSignatureSelect(null);
  };

  if (!file) {
    return null;
  }

  const currentPageSignatures = signatures.filter(s => s.page === currentPage);

  return (
    <div className="sign-layout">
      {/* 왼쪽: 페이지 썸네일 */}
      <div className="page-sidebar">
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">페이지 선택</h2>
          </div>
          <div className="card-body">
            <div className="page-list">
              {thumbnails.map(thumb => (
                <div
                  key={thumb.pageNum}
                  className={`page-thumbnail ${currentPage === thumb.pageNum ? 'active' : ''} ${selectedPages.includes(thumb.pageNum) ? 'selected' : ''}`}
                  onClick={() => onPageChange(thumb.pageNum)}
                >
                  <input
                    type="checkbox"
                    className="page-checkbox"
                    checked={selectedPages.includes(thumb.pageNum)}
                    onChange={(e) => {
                      e.stopPropagation();
                      togglePageSelect(thumb.pageNum);
                    }}
                  />
                  <img src={thumb.dataUrl} alt={`페이지 ${thumb.pageNum}`} />
                  <span className="page-number">{thumb.pageNum} / {totalPages}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 오른쪽: 메인 편집 영역 */}
      <div className="editor-area">
        <div 
          className="pdf-canvas-container" 
          ref={containerRef}
          onClick={handleCanvasClick}
        >
          <div className="pdf-canvas-wrapper" ref={wrapperRef}>
            <canvas ref={mainCanvasRef} />
            
            {/* 현재 페이지의 서명들 */}
            {currentPageSignatures.map(sig => (
              <div
                key={sig.id}
                className={`draggable-signature ${selectedSignature === sig.id ? 'selected' : ''}`}
                style={{
                  left: sig.x,
                  top: sig.y,
                  width: sig.width,
                  height: sig.height
                }}
                onMouseDown={(e) => handleSignatureMouseDown(e, sig)}
              >
                <img src={sig.imageData} alt="서명" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                {selectedSignature === sig.id && (
                  <>
                    <div
                      className="resize-handle"
                      onMouseDown={(e) => handleResizeMouseDown(e, sig)}
                    />
                    <button
                      className="delete-handle"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSignatureDelete(sig.id);
                      }}
                    >
                      ×
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PdfViewer;
