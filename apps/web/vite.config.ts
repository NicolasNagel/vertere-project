import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    // Metade dos núcleos: com todos, os ambientes jsdom disputam CPU e testes de formulário
    // estouram o timeout de 5 s (specs/014-polimento-telas-web/research.md, Decisão 7).
    maxWorkers: '50%',
    // Reutiliza a VM por worker, mantendo isolamento por arquivo e evitando que cobertura gaste
    // a maior parte do tempo recriando 27 ambientes jsdom.
    pool: 'vmThreads',
  },
})
