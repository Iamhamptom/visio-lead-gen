'use client';

import { useEffect } from 'react';
import { installGlobalErrorHandler } from '@/lib/error-logger';

/**
 * Installs global window.onerror and unhandledrejection listeners
 * so that all uncaught errors are captured in the error log.
 */
export function GlobalErrorInit() {
  useEffect(() => {
    installGlobalErrorHandler();
  }, []);
  return null;
}
