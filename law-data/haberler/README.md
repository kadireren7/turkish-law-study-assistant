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

## Otomatik güncelleme (her yeni günde kendiliğinden)

Haberler **her yeni güne geçildiğinde** otomatik güncellenir:

1. **Haberler sayfası:** Yeni bir günde sayfa ilk kez açıldığında arka planda güncelleme tetiklenir; bittiğinde sayfa yenilenir.
2. **GitHub Actions:** `.github/workflows/news-update.yml` her gün 06:00 UTC (Türkiye 09:00) çalışır, RSS’ten veri çeker ve değişiklikleri commit eder. Vercel vb. deploy ile senkron kalır.
3. **Vercel Cron:** `vercel.json` içinde tanımlı cron günde bir kez `/api/news-update` çağırır (sunucu yazılabilir ortamda kalıcı güncelleme için).
4. **Harici cron:** İsterseniz günde bir kez `GET https://siteniz.com/api/news-update` çağıran bir cron servisi (cron-job.org vb.) kurabilirsiniz. İsteğe bağlı: `.env` içinde `CRON_SECRET` tanımlayıp istekte `Authorization: Bearer <CRON_SECRET>` gönderin.

**Kendi sunucunuzda (Linux / macOS cron):**
```bash
0 9 * * * cd /path/to/proje && npm run news:update
```

**Windows (Görev Zamanlayıcı):**
- Tetikleyici: Günlük, saat 09:00
- Eylem: `cmd /c "cd /d C:\path\to\proje && npm run news:update"`
