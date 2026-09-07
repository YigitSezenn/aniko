# Aniko

Windows masaüstünde duran, konuşan ve animasyonlu orijinal anime kızı companion.

- Şeffaf, her zaman üstte pencere
- Tıklama, idle ve günün saatine göre Türkçe replikler
- Nefes, göz kırpma, konuşma ağzı, tıklama bounce
- Sistem tepsisi: Göster / Gizle / Ses (TTS) / Karakter: Aniko / Karakter: Akari / Çıkış
- Sürükleyerek yerini değiştir

## Gereksinimler

- Node.js 20+
- [Rust](https://rustup.rs/)
- Windows: [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) içinde **Desktop development with C++**
- WebView2 (Windows 10/11’de genelde hazır)

## Çalıştır

```bash
npm install
npm run tauri:dev
```

Tarayıcı önizlemesi (şeffaf overlay yok):

```bash
npm run dev
```

## Kullanım

- Karaktere tıkla: rastgele replik
- Basılı tutup sürükle: pencereyi taşı
- Bir süre dokunmazsan idle cümlesi gelir
- Tepsi ikonundan gizle, göster, karakter değiştir veya çık
- Ses için tepsi: **Ses aç** / **Sesi kapat** (hazır anime-kız tarzi kadın ses klipleri)

Kendi 3D modelin için `public/models/character.vrm` bırakabilirsin; v1 2.5D katmanlı sahneyi kullanır, VRM sonraki adım için iskelet olarak durur.
