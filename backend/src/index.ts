import 'dotenv/config';
import path from 'path';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import inventoryRoutes from './modules/inventory/routes';
import accountingRoutes from './modules/accounting/routes';
import logsRoutes from './modules/logs/routes';
import { errorHandler, requestLogger, captureOperator } from './middleware/errorHandler';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Middleware general
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);
app.use(captureOperator);

// Serve frontend static files in production
// The frontend build output is copied to backend/dist/frontend during deployment
if (process.env.NODE_ENV === 'production') {
  const frontendPath = path.join(__dirname, '../frontend');
  app.use(express.static(frontendPath));

  // Serve index.html for all non-API routes (SPA fallback)
  app.get('*', (req: Request, res: Response) => {
    if (!req.originalUrl.startsWith('/api')) {
      res.sendFile(path.join(frontendPath, 'index.html'));
    }
  });
}

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// API routes
app.use('/api/v1/inventory', inventoryRoutes);
app.use('/api/v1/accounting', accountingRoutes);
app.use('/api/v1/logs', logsRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      message: `Route ${req.method} ${req.originalUrl} not found`,
    },
  });
});

// Error handler
app.use(errorHandler);

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Listening on 0.0.0.0 (all interfaces)`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`📚 API docs: http://localhost:${PORT}/api/v1/inventory`);
});

export default app;
