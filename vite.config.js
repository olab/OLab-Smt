import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import * as path from 'path';

const ASSET_URL = process.env.ASSET_URL || '';

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  
  const env = loadEnv(mode, process.cwd(), '');

  return {
   base: `${env.VITE_APP_BASEPATH}`,
    build: {
      outDir: './build',
      emptyOutDir: true, // also necessary      
      sourcemap: true,
      rollupOptions: {
        onLog(level, log, handler) {
          if (log.cause && log.cause.message === `Can't resolve original location of error.`) {
            return
          }
          handler(level, log)
        },        
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            material: ['@mui/material', '@mui/icons-material']
          }
        }
      }      
    },
    plugins: [
      react(),
      // basicSsl()
    ],
    resolve: {
      alias: [
        { find: '@', replacement: path.resolve(__dirname, 'src') },
      ],
    }
  }

})
