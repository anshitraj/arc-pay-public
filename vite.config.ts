import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig(async () => {
  // Load Replit plugins conditionally
  let replitPlugins: any[] = [];
  if (process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined) {
    try {
      const cartographer = await import("@replit/vite-plugin-cartographer");
      const devBanner = await import("@replit/vite-plugin-dev-banner");
      replitPlugins = [cartographer.cartographer(), devBanner.devBanner()];
    } catch (e) {
      // Silently fail if plugins aren't available
      console.warn("Replit plugins not available:", e);
    }
  }

  return {
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...replitPlugins,
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    minify: "esbuild",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'wallet-vendor': ['wagmi', '@rainbow-me/rainbowkit', 'viem'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select'],
          'query-vendor': ['@tanstack/react-query'],
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },
    chunkSizeWarningLimit: 1000,
    cssCodeSplit: true,
    reportCompressedSize: false,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
    hmr: {
      overlay: true,
    },
    watch: {
      usePolling: false,
      interval: 100,
    },
  },
  optimizeDeps: {
    include: ["react", "react-dom"],
    exclude: [],
  },
  define: {
    global: 'globalThis',
  },
  };
});
