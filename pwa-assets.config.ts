// Genera los iconos de la app (iPhone, Android, favicon) a partir de public/icon.svg.
// Volver a generarlos: npm run iconos
import { defineConfig } from '@vite-pwa/assets-generator/config';

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    // El icono ya trae su propio fondo, así que no se añade margen ni fondo blanco.
    transparent: { sizes: [64, 192, 512], favicons: [[48, 'favicon.ico']], padding: 0 },
    maskable: { sizes: [512], padding: 0 },
    apple: { sizes: [180], padding: 0 },
  },
  images: ['public/icon.svg'],
});
