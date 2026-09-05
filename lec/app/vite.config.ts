import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// base './' → build estático desplegable en GitHub Pages o cualquier subruta.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
});
