import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // Load environment variables for the current mode from .env files and Node process environment
  const env = { ...process.env, ...loadEnv(mode, process.cwd(), '') };

  // Explicit constants for Firebase and Turso configuration
  const TURSO_DATABASE_URL = env.VITE_TURSO_DATABASE_URL || '';
  const TURSO_AUTH_TOKEN = env.VITE_TURSO_AUTH_TOKEN || '';

  const FIREBASE_API_KEY = env.VITE_FIREBASE_API_KEY || 'AIzaSyA96ndEVo6VtkuR6hiq06MxY0fUjc4FkDM';
  const FIREBASE_AUTH_DOMAIN = env.VITE_FIREBASE_AUTH_DOMAIN || 'gen-lang-client-0372082836.firebaseapp.com';
  const FIREBASE_PROJECT_ID = env.VITE_FIREBASE_PROJECT_ID || 'gen-lang-client-0372082836';
  const FIREBASE_DATABASE_ID = env.VITE_FIREBASE_DATABASE_ID || 'ai-studio-teachersperforma-7a1e0d4d-1763-4527-ab13-75d5859eb3ca';
  const FIREBASE_STORAGE_BUCKET = env.VITE_FIREBASE_STORAGE_BUCKET || 'gen-lang-client-0372082836.firebasestorage.app';
  const FIREBASE_MESSAGING_SENDER_ID = env.VITE_FIREBASE_MESSAGING_SENDER_ID || '456768297704';
  const FIREBASE_APP_ID = env.VITE_FIREBASE_APP_ID || '1:456768297704:web:5339d93e2de9c15ae4875d';
  const FIREBASE_MEASUREMENT_ID = env.VITE_FIREBASE_MEASUREMENT_ID || '';

  const APP_NAME = env.VITE_APP_NAME || 'St. Alexius College Teacher Performance Evaluation System';

  // Build the define object strictly for `import.meta.env`
  const definedEnv: Record<string, string> = {
    'import.meta.env.VITE_TURSO_DATABASE_URL': JSON.stringify(TURSO_DATABASE_URL),
    'import.meta.env.VITE_TURSO_AUTH_TOKEN': JSON.stringify(TURSO_AUTH_TOKEN),
    'import.meta.env.VITE_FIREBASE_API_KEY': JSON.stringify(FIREBASE_API_KEY),
    'import.meta.env.VITE_FIREBASE_AUTH_DOMAIN': JSON.stringify(FIREBASE_AUTH_DOMAIN),
    'import.meta.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify(FIREBASE_PROJECT_ID),
    'import.meta.env.VITE_FIREBASE_DATABASE_ID': JSON.stringify(FIREBASE_DATABASE_ID),
    'import.meta.env.VITE_FIREBASE_STORAGE_BUCKET': JSON.stringify(FIREBASE_STORAGE_BUCKET),
    'import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(FIREBASE_MESSAGING_SENDER_ID),
    'import.meta.env.VITE_FIREBASE_APP_ID': JSON.stringify(FIREBASE_APP_ID),
    'import.meta.env.VITE_FIREBASE_MEASUREMENT_ID': JSON.stringify(FIREBASE_MEASUREMENT_ID),
    'import.meta.env.VITE_APP_NAME': JSON.stringify(APP_NAME),
  };

  // Dynamically attach any additional VITE_ environment variables strictly under import.meta.env
  Object.keys(env).forEach((key) => {
    if (key.startsWith('VITE_') && !definedEnv[`import.meta.env.${key}`]) {
      definedEnv[`import.meta.env.${key}`] = JSON.stringify(env[key] || '');
    }
  });

  return {
    base: '/',
    plugins: [react(), tailwindcss()],
    envPrefix: ['VITE_'],
    define: definedEnv,
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      // HMR is disabled in AI Studio via DISABLE_HMR env var
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: false,
    },
  };
});

