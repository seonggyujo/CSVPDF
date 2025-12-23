const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const convertRouter = require('./routes/convert');
const { startCleanupJob } = require('./utils/cleanup');

const app = express();
const PORT = process.env.PORT || 4000;
const isProduction = process.env.NODE_ENV === 'production';

// ===================
// Security Middleware
// ===================

// 1. Helmet - 보안 헤더 설정
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
      frameAncestors: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

// 2. 서버 정보 숨기기
app.disable('x-powered-by');

// 3. CORS - 자기 도메인만 허용
const allowedOrigins = isProduction 
  ? ['https://csvpdf.duckdns.org']
  : ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:8080', 'http://127.0.0.1:8080'];

app.use(cors({
  origin: (origin, callback) => {
    // 같은 출처 요청 (origin이 없음) 또는 허용된 출처
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy violation'));
    }
  },
  methods: ['GET', 'POST'],
  credentials: false,
  maxAge: 86400 // 24시간 캐시
}));

// 4. Rate Limiting - API 요청 제한
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 100, // IP당 100회
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/api/health' // health check 제외
});

// 파일 업로드 전용 (더 엄격)
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 20, // IP당 20회
  message: { error: 'Too many upload requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

// 5. JSON Body 크기 제한
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ===================
// API Routes
// ===================

// Rate limiter 적용
app.use('/api/', apiLimiter);
app.use('/api/convert', uploadLimiter);

// Convert API
app.use('/api/convert', convertRouter);

// Health check (인증 없이 접근, 최소 정보만)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ===================
// Static Files (Production)
// ===================

if (isProduction) {
  const clientDistPath = path.join(__dirname, '../../client/dist');
  
  // 정적 파일 캐싱 설정
  app.use(express.static(clientDistPath, {
    maxAge: '1d',
    etag: true
  }));
  
  // SPA fallback
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// ===================
// Error Handling
// ===================

// 404 처리
app.use((req, res, next) => {
  res.status(404).json({ error: 'Not Found' });
});

// 글로벌 에러 핸들러
app.use((err, req, res, next) => {
  // 프로덕션에서는 로그만, 개발에서는 상세 출력
  if (isProduction) {
    console.error('Error:', err.message);
  } else {
    console.error('Error:', err);
  }
  
  // 클라이언트에는 일반적인 메시지만 전송 (내부 정보 숨김)
  const statusCode = err.status || 500;
  const message = statusCode === 500 
    ? 'Internal Server Error' 
    : err.message || 'An error occurred';
  
  res.status(statusCode).json({ error: message });
});

// ===================
// Server Start
// ===================

// Start cleanup job for temp files
startCleanupJob();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
