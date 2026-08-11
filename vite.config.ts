import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig({
  // getUserMedia는 localhost 외에는 HTTPS가 필수라 모바일 실기기 테스트를 위해 자체 서명 인증서 사용
  plugins: [react(), basicSsl()],
  server: {
    // 로컬 개발에서도 공유 기능이 동작하도록 API는 배포된 함수로 프록시
    proxy: {
      '/api': {
        target: 'https://lifecut.vercel.app',
        changeOrigin: true,
      },
    },
  },
})
