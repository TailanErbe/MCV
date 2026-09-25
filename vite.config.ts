import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base relativa: o build funciona em qualquer hospedagem estática ou subpasta.
export default defineConfig({
  base: './',
  plugins: [react()],
});
