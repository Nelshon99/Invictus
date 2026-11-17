import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/appError';

export interface AppRequest extends Request {
  operator?: string;
  ipAddress?: string;
  userAgent?: string;
}

// Middleware para manejo de errores global
export function errorHandler(err: any, req: AppRequest, res: Response, next: NextFunction): void {
  // Si ya se envió una respuesta, salir
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Error interno del servidor';

  if (process.env.NODE_ENV === 'development') {
    console.error(`[ERROR] ${statusCode} ${message}`);
    if (err.stack) {
      console.error(err.stack);
    }
  } else {
    console.error(`[ERROR] ${statusCode} ${message}`);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(process.env.NODE_ENV === 'development' && !err.isOperational && { stack: err.stack }),
    },
  });
}

// Middleware para validar contenido JSON
export function validateJson(req: AppRequest, res: Response, next: NextFunction): void {
  if (!req.is('application/json')) {
    res.status(400).json({
      success: false,
      error: {
        message: 'Content-Type debe ser application/json',
      },
    });
    return;
  }
  next();
}

// Middleware para logging de requests
export function requestLogger(req: AppRequest, res: Response, next: NextFunction): void {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
  });
  next();
}

// Middleware para validar IDs
export function validateId(paramName: string = 'id') {
  return (req: AppRequest, res: Response, next: NextFunction): void => {
    const id = req.params[paramName];
    if (!id || id.trim() === '') {
      res.status(400).json({
        success: false,
        error: {
          message: `El parámetro ${paramName} es requerido`,
        },
      });
      return;
    }
    next();
  };
}

// Middleware para capturar info del operador
export function captureOperator(req: AppRequest, res: Response, next: NextFunction): void {
  req.operator = req.headers['x-operator'] as string || 'system';
  req.ipAddress = req.ip;
  req.userAgent = req.get('User-Agent') || '';
  next();
}
