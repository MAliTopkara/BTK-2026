# TrustLens AI — Chrome Extension

Trendyol, Hepsiburada ve N11 ürün sayfalarında otomatik TrustLens AI butonu inject eder.

## Kurulum (Geliştirici Modu)

1. Chrome'da `chrome://extensions` aç
2. Sağ üstten **"Geliştirici modu"** aç
3. **"Paketlenmemiş öğe yükle"** tıkla
4. Bu klasörü (`browser-extension/`) seç
5. Extension yüklendi — Trendyol'da bir ürün sayfasına git

## Özellikler

- **Floating Action Button (FAB):** Ürün sayfalarında sağ altta TrustLens butonu
- **Sayfa İçi Sonuç:** Tarama sonucu tooltip olarak gösterilir (verdict + skor + özet)
- **Popup:** Extension ikonuna tıkla → URL yapıştır veya aktif sayfayı tara
- **Detaylı Rapor:** Sonuçtan tek tıkla TrustLens dashboard'a git

## Desteklenen Siteler

- `trendyol.com` — ürün sayfaları (`*-p-*` pattern)
- `hepsiburada.com` — ürün sayfaları (`*-p-*` pattern)
- `n11.com` — ürün sayfaları (`/urun/*` pattern)

## Teknik

- Manifest V3
- Service Worker (background.js) → API çağrıları
- Content Script → FAB inject + tooltip
- Popup → Manuel URL tarama
- Storage API → Son tarama sonuçları cache
