# Law data (`data/`)

Bu ağaç, Türk hukuku çalışma platformunun **yerel mevzuat, madde indeksleri, konu notları, türetilmiş güncellemeler ve haberler** için kullanılır. İçerik resmî kaynaklara dayalı yapılandırılmış veri ve eğitim amaçlı notlardan oluşur.

## Klasör yapısı

| Klasör | Açıklama |
|--------|----------|
| **core/laws/** | Kanun metinleri (markdown). Örn. anayasa.md, tck.md, tbk.md, … |
| **core/article-index/** | Madde bazlı JSON indeksleri (Madde Ara). |
| **core/topics/** | Konu notları (medeni, borçlar, ceza, anayasa, idare, usul). |
| **derived/updates/** | Son değişiklikler, karar özetleri, `update-log.json`, `history/`, `input/`. |
| **derived/news/** | Hukuk haberleri (JSON). |
| **derived/coverage/** | (İsteğe bağlı) kapsam çıktıları. |
| **cases/decision-summaries/** | Yargıtay / AYM vb. özet alanları. |
| **cases/practicals/** | Pratik / vaka materyali (genişletme için). |
| **pedagogy/** | Sınav / öğretim katmanı (profil, rubrik, örnek cevap, …). |
| **imports/** | Ham / normalize içe aktarma staging. |

## Tüm maddeleri resmî kaynaktan çekme (mevzuat.gov.tr)

1. **Mevzuat çekimi:** `npm run mevzuat:fetch` — çıktı `data/core/laws/*.md`.
2. **Madde indeksini senkronize et:** `npm run madde-index:sync` — çıktı `data/core/article-index/*.json`.

Önerilen sıra: `npm run mevzuat:fetch && npm run madde-index:sync`.

## Madde Ara (article lookup)

- Girdi örnekleri: `tbk 2`, `TBK m.2`, `Türk Borçlar Kanunu 2`, …
- Arama sırası: önce **article-index**, sonra **laws** markdown.

## Kapsam denetimi (coverage audit)

- **API:** `GET /api/law-coverage`
- **Script:** `npm run coverage:audit`

## Kaynak kuralı

- Öncelik: resmî mevzuat ve kamuya açık, yapılandırılmış hukuk verisi.
- Telifli özel yayınlar kullanılmaz; açık lisanslı veya kullanıcı tarafından sağlanan içerik kabul edilir.
