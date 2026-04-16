# Haberler (News) veri yapısı

Bu klasör `/haberler` sayfasını besler. **Tüm kayıtlar** gösterilir; en yeni tarih önce sıralanır. Güncelleme scripti başarıyla çalışınca **last-update.json** yazılır. Script hata verirse mevcut dosyalar değiştirilmez.

## Dosyalar

| Dosya | Açıklama |
|-------|----------|
| **hukuk-haberleri.json** | Resmî ve hukuki kaynaklara dayalı güncel gelişmeler (mevzuat, kararlar, Resmî Gazete). |
| **siyaset-gundemi.json** | Siyaset ve mevzuat gündemi; güvenilir gazete/haber kaynakları. |
| **last-update.json** | Script tarafından yazılır; `lastSuccessfulUpdate` (ISO tarih) son başarılı güncelleme zamanını tutar. |

## JSON şeması

Her dosya:

```json
{
  "lastUpdated": "2026-03-07",
  "isExampleData": false,
  "items": [
    {
      "baslik": "Başlık",
      "tarih": "2026-03-01",
      "kaynak": "Kaynak adı",
      "kisaOzet": "Kısa özet",
      "nedenOnemli": "Neden önemli",
      "kategori": "Kategori",
      "imageUrl": "https://...",
      "link": "https://..."
    }
  ]
}
```

- **lastUpdated:** Gerçek veri çekildiğinde ISO tarih (YYYY-MM-DD). `null` ise sayfada "Henüz canlı veri güncellemesi yapılmadı" gösterilir.
- **isExampleData:** `true` ise sayfada "Bu içerik örnek veridir; henüz gerçek güncel kaynaklardan çekilmemiştir" uyarısı çıkar.
- **items:** Tüm kayıtlar gösterilir; en yeni tarih önce. **imageUrl** ve **link** isteğe bağlı; yoksa placeholder görsel ve tıklanmaz kart kullanılır.

## Güncelleme scriptleri

| Komut | Ne yapar |
|-------|----------|
| **npm run news:update** | Her iki dosyayı günceller (tüm kayıtlar, en yeni önce). Başarıda `last-update.json` yazılır; hata durumunda mevcut veriler korunur. |
| **npm run news:update:law** | Sadece `hukuk-haberleri.json`. |
| **npm run news:update:politics** | Sadece `siyaset-gundemi.json`. |

Script **RSS beslemelerinden** gerçek haber çeker (Anadolu Ajansı, TRT Haber, Resmî Gazete, AYM, Yargıtay vb.). Eksik besleme veya alan olduğunda hata vermez; sadece o kaynak atlanır. `lastUpdated` ve `isExampleData` çekilen veriye göre yazılır.

## Güncelleme

- **Tam pipeline:** `npm run daily:update` — mevzuat RSS, güncel gelişmeler ve hukuk haberleri birlikte güncellenir; bu klasörde `hukuk-haberleri.json` ve `last-update.json` yazılır.
- **Sadece haberler:** `npm run news:update` veya `npm run news:update:law`.
- **GitHub Actions:** Manuel; repo → Actions → "Legal data update" → Run workflow.
- **Haberler sayfası:** İsteğe bağlı olarak sayfada "Güncelle" ile `/api/news-update` tetiklenebilir (sadece haberler).
- **Windows:** `scripts\runners\run-daily-update.bat` ile manuel veya Görev Zamanlayıcı; bkz. `scripts/runners/GUNLUK-GUNCELLEME-WINDOWS.md`.
