# AdStory Pro - Patch (API Key via Settings Key)

File yang diubah:
- App.tsx: tombol "Settings Key" sekarang bisa paste API key (tanpa AI Studio).
- services/geminiService.ts: ambil API key dari localStorage (user-based), optional fallback VITE_GEMINI_API_KEY.

Cara pakai:
1) Ganti file di repo kamu:
   - App.tsx (root src)
   - services/geminiService.ts
2) Deploy ulang di Cloudflare Pages (build: npm install && npm run build, output: dist).
3) Buka web → klik "Settings Key" → paste API key Google AI Studio.

Catatan:
- Untuk trial pribadi, ini aman.
- Kalau mau aman untuk publik/penjualan besar, sebaiknya pakai backend proxy (Worker) agar API key tidak tersimpan di browser.
