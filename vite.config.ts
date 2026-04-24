import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import cesium from 'vite-plugin-cesium';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // vite-plugin-cesium automatically copies the CesiumJS static assets
    // (Workers, ThirdParty, Assets, Widgets) into the build output directory
    // and sets the CESIUM_BASE_URL environment variable. Without this plugin,
    // you would need to manually configure copy tasks and URL settings.
    cesium(),
  ],
});
