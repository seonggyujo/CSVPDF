import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import NavBar from './components/common/NavBar';
import CsvPage from './pages/CsvPage';
import ConvertPage from './pages/ConvertPage';

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ToastProvider>
          <div className="app">
            <NavBar />
            <main className="main-content">
              <Routes>
                <Route path="/" element={<Navigate to="/csv" replace />} />
                <Route path="/csv" element={<CsvPage />} />
                <Route path="/convert" element={<ConvertPage />} />
              </Routes>
            </main>
          </div>
        </ToastProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
