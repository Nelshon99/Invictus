// Test setup file
import { jest } from '@jest/globals';

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db?schema=public';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.WEIGHING_TOLERANCE_CG = '50';

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});
