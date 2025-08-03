/**
 * Production logging utility for frontend
 * Completely disables all console output in production
 */

// Use Vite's mode detection (more reliable than NODE_ENV)
const isDevelopment = import.meta.env.MODE === 'development';

class ProductionLogger {
  static info(message: string, data?: any) {
    // Only log in development
    if (isDevelopment) {
      console.log(`ℹ️ ${message}`, data || '');
    }
    // In production: NO CONSOLE OUTPUT
  }

  static error(message: string, error?: any) {
    // Only log in development
    if (isDevelopment) {
      console.error(`❌ ${message}`, error || '');
    }
    // In production: NO CONSOLE OUTPUT
    // You could send to error tracking service here instead
  }

  static warn(message: string, data?: any) {
    // Only log in development
    if (isDevelopment) {
      console.warn(`⚠️ ${message}`, data || '');
    }
    // In production: NO CONSOLE OUTPUT
  }

  static debug(message: string, data?: any) {
    // Only log in development
    if (isDevelopment) {
      console.log(`🔧 ${message}`, data || '');
    }
    // In production: NO CONSOLE OUTPUT
  }

  static success(message: string, data?: any) {
    // Only log in development
    if (isDevelopment) {
      console.log(`✅ ${message}`, data || '');
    }
    // In production: NO CONSOLE OUTPUT
  }

  // Specialized logging methods - ALL DISABLED IN PRODUCTION
  static compilationStart(contentLength: number) {
    // Only in development
    if (isDevelopment) {
      console.log('🔄 Starting LaTeX compilation...', { contentLength });
    }
  }

  static compilationSuccess(filename: string) {
    // Only in development
    if (isDevelopment) {
      console.log('✅ PDF compiled successfully', { filename });
    }
  }

  static compilationError(error: string) {
    // Only in development
    if (isDevelopment) {
      console.error('❌ LaTeX compilation failed:', error);
    }
  }

  static sessionStart(sessionId: string, userId: string) {
    // Only in development
    if (isDevelopment) {
      console.log('🚀 AI session started', { sessionId, userId });
    }
  }

  static sessionEnd(sessionId: string) {
    // Only in development
    if (isDevelopment) {
      console.log('🔚 AI session ended', { sessionId });
    }
  }

  static pdfProcessing(fileSize: number, success: boolean) {
    // Only in development
    if (isDevelopment) {
      const status = success ? '✅' : '❌';
      console.log(`${status} PDF processing`, { fileSize, success });
    }
  }

  static aiRequest(prompt: string, response: string) {
    // Only in development
    if (isDevelopment) {
      console.log('🤖 AI Request', {
        promptLength: prompt.length,
        responseLength: response.length,
        prompt: prompt.substring(0, 100) + '...',
        response: response.substring(0, 100) + '...'
      });
    }
  }
}

export const logger = ProductionLogger; 