import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";
import UnoCSS from 'unocss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), UnoCSS()],
});
