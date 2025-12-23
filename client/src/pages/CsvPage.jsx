import { useState, useMemo } from 'react';
import Papa from 'papaparse';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import Card from '../components/common/Card';
import FileDropZone from '../components/common/FileDropZone';
import { useToast } from '../context/ToastContext';
import './CsvPage.css';

function CsvPage() {
  const [data, setData] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [fileName, setFileName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();

  // Parse CSV file
  const handleFileSelect = (file) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      showToast('CSV 파일만 업로드 가능합니다', 'error');
      return;
    }

    setIsLoading(true);
    setFileName(file.name);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          showToast('CSV 파싱 중 오류가 발생했습니다', 'error');
          console.error('Parse errors:', results.errors);
        }
        setHeaders(results.meta.fields || []);
        setData(results.data);
        setIsLoading(false);
        showToast('CSV 파일을 성공적으로 불러왔습니다', 'success');
      },
      error: (error) => {
        showToast('파일을 읽는 중 오류가 발생했습니다', 'error');
        console.error('Parse error:', error);
        setIsLoading(false);
      }
    });
  };

  // Calculate statistics
  const stats = useMemo(() => {
    if (!data || data.length === 0) return null;

    const rowCount = data.length;
    const colCount = headers.length;
    
    // Count missing values
    let missingCount = 0;
    data.forEach(row => {
      headers.forEach(header => {
        if (row[header] === null || row[header] === undefined || row[header] === '') {
          missingCount++;
        }
      });
    });

    return { rowCount, colCount, missingCount };
  }, [data, headers]);

  // Detect numeric columns for chart
  const numericColumns = useMemo(() => {
    if (!data || data.length === 0 || headers.length === 0) return [];

    return headers.filter(header => {
      const values = data.slice(0, 100).map(row => row[header]);
      const numericValues = values.filter(v => !isNaN(parseFloat(v)) && v !== '');
      return numericValues.length > values.length * 0.5;
    });
  }, [data, headers]);

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!data || numericColumns.length === 0) return null;

    const firstNumericCol = numericColumns[0];
    const labelCol = headers.find(h => !numericColumns.includes(h)) || headers[0];

    return data.slice(0, 20).map((row, index) => ({
      name: row[labelCol] || `Item ${index + 1}`,
      value: parseFloat(row[firstNumericCol]) || 0
    }));
  }, [data, headers, numericColumns]);

  const resetData = () => {
    setData(null);
    setHeaders([]);
    setFileName('');
  };

  return (
    <div className="csv-page">
      <div className="page-header">
        <h1 className="page-title">CSV Viewer</h1>
        <p className="page-subtitle">CSV 파일을 업로드하여 데이터를 분석하고 시각화합니다</p>
      </div>

      {!data ? (
        <Card>
          <FileDropZone
            accept=".csv"
            onFileSelect={handleFileSelect}
            disabled={isLoading}
          >
            <div className="file-drop-icon">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <rect x="8" y="6" width="32" height="36" rx="4" stroke="currentColor" strokeWidth="2" fill="none"/>
                <path d="M14 18h20M14 26h20M14 34h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <p className="file-drop-text">
              {isLoading ? '파일을 불러오는 중...' : 'CSV 파일을 드래그하거나 클릭하여 업로드'}
            </p>
            <p className="file-drop-hint">.csv 파일만 지원됩니다</p>
          </FileDropZone>
        </Card>
      ) : (
        <>
          {/* File Info & Reset */}
          <div className="file-header">
            <div className="file-info-bar">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M4 4a2 2 0 012-2h8l4 4v10a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"/>
              </svg>
              <span className="file-name">{fileName}</span>
            </div>
            <button className="btn btn-secondary" onClick={resetData}>
              다른 파일 선택
            </button>
          </div>

          {/* Summary Cards */}
          {stats && (
            <div className="summary-cards">
              <Card className="summary-card">
                <div className="summary-label">행 수</div>
                <div className="summary-value">{stats.rowCount.toLocaleString()}</div>
              </Card>
              <Card className="summary-card">
                <div className="summary-label">열 수</div>
                <div className="summary-value">{stats.colCount.toLocaleString()}</div>
              </Card>
              <Card className="summary-card">
                <div className="summary-label">결측치</div>
                <div className="summary-value">{stats.missingCount.toLocaleString()}</div>
              </Card>
            </div>
          )}

          {/* Chart */}
          {chartData && chartData.length > 0 && (
            <Card className="chart-card">
              <h3 className="ios-card-title">데이터 시각화</h3>
              <p className="ios-card-subtitle">
                {numericColumns[0]} 컬럼 기준 (상위 20개)
              </p>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 11 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip 
                      contentStyle={{ 
                        background: 'rgba(255,255,255,0.95)',
                        border: '1px solid rgba(0,0,0,0.1)',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                      }}
                    />
                    <Bar dataKey="value" fill="#007aff" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {/* Data Table */}
          <Card className="table-card">
            <h3 className="ios-card-title">데이터 미리보기</h3>
            <p className="ios-card-subtitle">
              상위 100행 표시 중 (전체 {data.length.toLocaleString()}행)
            </p>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    {headers.map((header, index) => (
                      <th key={index}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.slice(0, 100).map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      <td className="row-number">{rowIndex + 1}</td>
                      {headers.map((header, colIndex) => (
                        <td key={colIndex}>{row[header] ?? ''}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

export default CsvPage;
