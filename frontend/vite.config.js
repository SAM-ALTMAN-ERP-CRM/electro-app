import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/svc/crm1': { target: 'http://localhost:5101', changeOrigin: true, rewrite: (path) => path.replace(/^\/svc\/crm1/, '') },
      '/svc/crm2': { target: 'http://localhost:5102', changeOrigin: true, rewrite: (path) => path.replace(/^\/svc\/crm2/, '') },
      '/svc/crm3': { target: 'http://localhost:5103', changeOrigin: true, rewrite: (path) => path.replace(/^\/svc\/crm3/, '') },
      '/svc/crm4': { target: 'http://localhost:5104', changeOrigin: true, rewrite: (path) => path.replace(/^\/svc\/crm4/, '') },
      '/svc/crm5': { target: 'http://localhost:5105', changeOrigin: true, rewrite: (path) => path.replace(/^\/svc\/crm5/, '') },
      '/svc/erp1': { target: 'http://localhost:5201', changeOrigin: true, rewrite: (path) => path.replace(/^\/svc\/erp1/, '') },
      '/svc/erp2': { target: 'http://localhost:5202', changeOrigin: true, rewrite: (path) => path.replace(/^\/svc\/erp2/, '') },
      '/svc/erp3': { target: 'http://localhost:5203', changeOrigin: true, rewrite: (path) => path.replace(/^\/svc\/erp3/, '') },
      '/svc/erp4': { target: 'http://localhost:5204', changeOrigin: true, rewrite: (path) => path.replace(/^\/svc\/erp4/, '') },
      '/svc/erp5': { target: 'http://localhost:5205', changeOrigin: true, rewrite: (path) => path.replace(/^\/svc\/erp5/, '') },
      '/svc/erp6': { target: 'http://localhost:5206', changeOrigin: true, rewrite: (path) => path.replace(/^\/svc\/erp6/, '') }
    }
  }
});
