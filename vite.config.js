import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    // 1. ปรับเพิ่มขีดจำกัดการเตือนเป็น 1000kb (1MB)
    chunkSizeWarningLimit: 1000, 

    // 2. (แนะนำเพิ่มเติม) ตั้งค่าการแบ่งไฟล์ (Rollup Options) 
    // เพื่อให้ Vite แยก Library ออกเป็นไฟล์ย่อยๆ ช่วยให้โหลดหน้าเว็บเร็วขึ้น
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return id.toString().split('node_modules/')[1].split('/')[0].toString();
          }
        }
      }
    }
  }
})