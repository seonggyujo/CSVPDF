import { useRef, useState, useEffect, useCallback } from 'react';

function SignatureCanvas({ onSave, onClose }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [penColor, setPenColor] = useState('#000000');
  const [penSize, setPenSize] = useState(3);
  const [hasContent, setHasContent] = useState(false);

  // 캔버스 초기화
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  // 좌표 계산
  const getCoordinates = useCallback((e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    if (e.touches) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }, []);

  // 그리기 시작
  const startDrawing = useCallback((e) => {
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = penColor;
    ctx.lineWidth = penSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    setIsDrawing(true);
  }, [getCoordinates, penColor, penSize]);

  // 그리기
  const draw = useCallback((e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasContent(true);
  }, [isDrawing, getCoordinates]);

  // 그리기 종료
  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
  }, []);

  // 지우기
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasContent(false);
  };

  // 저장 - 흰 배경 제거하고 투명 PNG로 변환
  const handleSave = () => {
    if (!hasContent) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // 이미지 데이터 가져오기
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // 흰색을 투명하게 변환
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // 흰색에 가까운 픽셀을 투명하게
      if (r > 240 && g > 240 && b > 240) {
        data[i + 3] = 0; // alpha를 0으로
      }
    }
    
    // 임시 캔버스에 그리기
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.putImageData(imageData, 0, 0);
    
    // 실제 내용이 있는 영역만 크롭
    const bounds = getContentBounds(imageData, canvas.width, canvas.height);
    if (!bounds) {
      onSave(tempCanvas.toDataURL('image/png'));
      return;
    }
    
    const croppedCanvas = document.createElement('canvas');
    const padding = 10;
    croppedCanvas.width = bounds.width + padding * 2;
    croppedCanvas.height = bounds.height + padding * 2;
    const croppedCtx = croppedCanvas.getContext('2d');
    
    croppedCtx.drawImage(
      tempCanvas,
      bounds.x, bounds.y, bounds.width, bounds.height,
      padding, padding, bounds.width, bounds.height
    );
    
    onSave(croppedCanvas.toDataURL('image/png'));
  };

  // 내용이 있는 영역 찾기
  const getContentBounds = (imageData, width, height) => {
    const data = imageData.data;
    let minX = width, minY = height, maxX = 0, maxY = 0;
    let found = false;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        if (data[i + 3] > 0) { // alpha > 0
          found = true;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    
    if (!found) return null;
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1
    };
  };

  return (
    <>
      <div className="tool-panel-overlay" onClick={onClose} />
      <div className="tool-panel">
        <div className="tool-panel-header">
          <h2>서명 그리기</h2>
          <button className="tool-panel-close" onClick={onClose}>×</button>
        </div>
        
        <div className="signature-canvas-wrapper">
          <canvas
            ref={canvasRef}
            width={450}
            height={200}
            className="signature-canvas"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
        </div>
        
        <div className="form-row" style={{ marginTop: '16px' }}>
          <label>펜 색상</label>
          <input
            type="color"
            value={penColor}
            onChange={(e) => setPenColor(e.target.value)}
          />
          <label style={{ marginLeft: '16px' }}>펜 두께</label>
          <input
            type="range"
            min="1"
            max="10"
            value={penSize}
            onChange={(e) => setPenSize(Number(e.target.value))}
            style={{ width: '100px' }}
          />
          <span>{penSize}px</span>
        </div>
        
        <div className="signature-actions" style={{ marginTop: '16px', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={clearCanvas}>
            지우기
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleSave}
            disabled={!hasContent}
          >
            사용하기
          </button>
        </div>
      </div>
    </>
  );
}

export default SignatureCanvas;
