import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base relatif : l'app fonctionne aussi bien à la racine d'un domaine
// que dans un sous-chemin type https://user.github.io/mon-repo/
export default defineConfig({
  plugins: [react()],
  base: './',
})
