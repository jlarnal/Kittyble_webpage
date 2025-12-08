import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { resolve, join, basename } from 'path'
import fs from 'fs'
import zlib from 'zlib'

// Custom Plugin to Gzip and Move files for ESP32 SPIFFS
const esp32PostBuild = () => {
  return {
    name: 'esp32-post-build',
    closeBundle: async () => {
      const distDir = resolve(__dirname, 'data')
      // Adjust this relative path if your firmware project is located elsewhere
      const targetDir = resolve(__dirname, '../KibbleT5/data') 

      console.log(`\n⚡ ESP32 Post-Build: Processing artifacts...`)

      // 1. CLEANUP: Wipe the target directory
      if (fs.existsSync(targetDir)) {
        console.log(`  🗑️  Cleaning target directory: ${targetDir}`)
        fs.rmSync(targetDir, { recursive: true, force: true })
      }
      fs.mkdirSync(targetDir, { recursive: true })

      // 2. PROCESSING: Walk flat directory
      const processDir = (currentDir) => {
        const files = fs.readdirSync(currentDir)
        
        files.forEach(file => {
          const srcPath = join(currentDir, file)
          const stat = fs.statSync(srcPath)
          
          if (stat.isDirectory()) {
            // Recurse if there are subdirectories (though we aim for flat)
            processDir(srcPath)
          } else {
            // Flatten: We only care about the filename, not the source path structure
            // effectively moving assets/foo.js -> foo.js in target
            const fileName = basename(file) 
            const destPath = join(targetDir, fileName)

            // Gzip compressible text assets
            if (/\.(js|css|html|svg|json|xml|txt)$/.test(file)) {
               const fileContent = fs.readFileSync(srcPath)
               const gzippedContent = zlib.gzipSync(fileContent, { level: 9 })
               
               // Write ONLY the .gz file. 
               fs.writeFileSync(destPath + '.gz', gzippedContent)
               
               console.log(`  ✨ Gzipped: ${fileName} -> ${fileName}.gz (${gzippedContent.length} bytes)`)
            } else {
               // Copy binary assets (images, fonts) as-is
               fs.copyFileSync(srcPath, destPath)
               console.log(`  qh  Copied: ${fileName}`)
            }
          }
        })
      }

      try {
        if (fs.existsSync(distDir)) {
            processDir(distDir)
            console.log('✅ ESP32 Build Complete! Files ready in ../KibbleT5/data')
        } else {
            console.warn('⚠️  Output directory not found. Build may have failed.')
        }
      } catch (e) {
        console.error('❌ Post-build failed:', e)
      }
    }
  }
}

export default defineConfig(({ mode }) => {
  const isDebug = mode === 'debug'
  // Define target IP here so we can use it in both configuration and logs
  const targetIp = 'http://192.168.1.61'; 

  return {
    plugins: [
      preact(),
      esp32PostBuild()
    ],
    // Base './' is CRITICAL for ESP32 SPIFFS/LittleFS hosting
    // It ensures assets are requested relatively (e.g., "assets/foo.js" instead of "/assets/foo.js")
    base: './',
    build: {
      outDir: 'data', 
      emptyOutDir: true,
      rollupOptions: {
        output: {
          // FLATTENED OUTPUT: Removed 'assets/' prefix
          entryFileNames: '[name]-[hash].js',
          chunkFileNames: '[name]-[hash].js',
          assetFileNames: '[name]-[hash].[ext]',
          manualChunks: undefined
        }
      },
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: !isDebug,
          drop_debugger: !isDebug
        }
      }
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      proxy: {
        // PROXY: Forwards /api requests to ESP32 during dev
        '/api': {
          target: targetIp, 
          changeOrigin: true,
          secure: false,
          // Hook to print detailed logs to the console
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('\x1b[31m%s\x1b[0m', '[Proxy Error] Connection failed:', err.message);
            });
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              console.log('\x1b[36m%s\x1b[0m', `[Proxy] ${req.method} ${req.url} -> ${targetIp}${req.url}`);
            });
            proxy.on('proxyRes', (proxyRes, req, _res) => {
              console.log(`[Proxy] Received ${proxyRes.statusCode} from target for ${req.url}`);
            });
          }
        }
      }
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
        'react': 'preact/compat',
        'react-dom': 'preact/compat'
      }
    }
  }
})