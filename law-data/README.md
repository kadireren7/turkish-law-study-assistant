# Law Data – Yerel Hukuk Bilgi Tabanı

Bu klasör, Türk hukuku çalışma platformunun **yerel mevzuat, madde indeksleri ve konu notları** için kullanılır. İçerik resmî kaynaklara (Resmî Gazete, mevzuat.gov.tr) dayalı yapılandırılmış veri ve eğitim amaçlı konu notlarından oluşur.

## Klasör yapısı

| Klasör | Açıklama |
|--------|----------|
| **mevzuat/** | Kanun metinleri (markdown). Örn. anayasa.md, tck.md, tbk.md, tmk.md, cmk.md, hmk.md, iik.md, ttk.md, kabahatler.md, is-kanunu.md, idari-yargilama-usulu.md, idare.md. |
| **madde-index/** | Madde bazlı JSON indeksleri. Madde Ara özelliği önce bu dosyalara bakar; her girdi lawCode, lawName, articleNumber, title, text, keywords, legalArea içerir. |
| **konu-notlari/** | Eğitim amaçlı konu notları (medeni, borçlar, ceza, anayasa, idare, usul). |
| **guncellemeler/** | Son değişiklikler (recent-amendments.md), önemli karar özetleri (recent-important-decisions.md), update-log. |
| **haberler/** | Hukuk haberleri (JSON). |

## Tüm maddeleri resmî kaynaktan çekme (mevzuat.gov.tr)

Bütün kanun maddelerini güncel ve tam almak için:

1. **Mevzuat çekimi:** `npm run mevzuat:fetch`  
   Mevzuat Bilgi Sistemi (mevzuat.gov.tr) üzerinden Anayasa, TCK, TMK, TBK, CMK, HMK, İİK, TTK, Kabahatler Kanunu metinleri otomatik çekilir ve `law-data/mevzuat/*.md` dosyalarına yazılır. İlk kullanımda TLS hatası alırsanız: `npx playwright install chromium` sonra script tekrar çalışır (tarayıcı fallback).

2. **Madde indeksini senkronize et:** `npm run madde-index:sync`  
   Mevzuat markdown dosyalarındaki her `## Madde N` bölümü `law-data/madde-index/*.json` dosyalarına aktarılır; böylece Madde Ara tüm maddeleri bulur.

Önerilen sıra: `npm run mevzuat:fetch && npm run madde-index:sync`. Güncellemeleri periyodik (örn. aylık) çalıştırabilirsiniz.

## Madde Ara (article lookup)

- Girdi örnekleri: `tbk 2`, `TBK m.2`, `Türk Borçlar Kanunu 2`, `anayasa 10`, `TMK 472`, `cmk 100`, `hmk 119`.
- Arama sırası: önce **madde-index** (ilgili kanunun .json dosyası), bulunamazsa **mevzuat** markdown içinde `## Madde N` / `### Madde N` bölümü.
- Tüm maddeleri eklemek için yukarıdaki “Tüm maddeleri resmî kaynaktan çekme” adımlarını kullanın; tek tek madde eklemek için madde-index dosyalarına girdi ekleyebilirsiniz (lawCode, articleNumber, title, text, keywords, legalArea).

## Kapsam denetimi (coverage audit)

Zayıf alanları tespit etmek için:

- **API:** `GET /api/law-coverage` — tüm index dosyalarının madde sayıları, mevzuat dosya varlığı, eksik index/mevzuat listesi döner.
- **Kod:** `getLawCoverageAudit()` (`src/lib/law-coverage-audit.ts`).

Raporda “lawsWithWeakCoverage” (az madde içeren indexler), “missingIndexFiles”, “missingMevzuatFiles” ile eksikleri sistematik olarak giderebilirsiniz.

## Kaynak kuralı

- Öncelik: resmî mevzuat ve kamuya açık, yapılandırılmış hukuk verisi.
- Telifli hukuk kitapları veya özel yayınlar kullanılmaz; sadece açık lisanslı veya kullanıcı tarafından sağlanan içerik kabul edilir.
