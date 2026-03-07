# Güncellemeler (Legal Updates)

Bu klasör, yerel hukuk bilgi tabanındaki **son değişiklikler** ve **önemli kararlar** özetlerini tutar. İçerik `scripts/update-legal-data.ts` scripti ile güncellenir. Resmî kaynak listesi **`src/lib/legal-sources.ts`** config dosyasında tanımlıdır. Özet dosyalarının üzerine yazılmadan önce **history/** altında değişiklik geçmişi saklanır.

## Güncelleme scriptleri (manuel çalıştırma)

| Komut | Ne yapar |
|-------|----------|
| **npm run legal:update** | Tam güncelleme: hem kanun değişiklikleri hem karar özetleri güncellenir. |
| **npm run legal:update:daily** | Günlük mod: sadece **mevzuat / kanun değişiklikleri** (recent-amendments.md). Resmî Gazete odaklı güncellemeler için önerilir. |
| **npm run legal:update:weekly** | Haftalık mod: sadece **önemli karar özetleri** (recent-important-decisions.md). Yargıtay / AYM karar güncellemeleri için önerilir. |

Eski kullanım: `npm run update-legal` = `npm run legal:update` ile aynıdır.

**Manuel çalıştırma örnekleri:**

```bash
# Tam güncelleme (hem amendments hem decisions)
npm run legal:update

# Sadece kanun değişiklikleri (günlük kontrol)
npm run legal:update:daily

# Sadece karar özetleri (haftalık kontrol)
npm run legal:update:weekly
```

**Zamanlama (isteğe bağlı):** Günlük/haftalık güncellemeleri otomatik çalıştırmak için:

- **Linux/macOS (cron):** Günlük sabah 09:00’da mevzuat, pazar 09:00’da kararlar:
  - `0 9 * * * cd /path/to/project && npm run legal:update:daily`
  - `0 9 * * 0 cd /path/to/project && npm run legal:update:weekly`
- **Windows (Görev Zamanlayıcı):** Aynı komutları tetikleyecek görevler oluşturun (`npm run legal:update:daily` ve `npm run legal:update:weekly`).

## Resmî kaynak config

Kaynak tanımları (id, name, type, priority, update_frequency, notes) **`src/lib/legal-sources.ts`** içindedir. Güncelleme scripti bu config’i kullanarak oluşturduğu markdown’da “Resmî kaynak önceliği” bölümünü doldurur.

| Kaynak | Tür | Öncelik | Güncelleme |
|--------|-----|---------|------------|
| Resmî Gazete | gazette | 1 | daily |
| Resmî mevzuat (kanunlar) | legislation | 2 | weekly |
| UYAP Emsal Karar Arama | court_decisions | 3 | daily |
| Yargıtay Karar Arama | court_decisions | 4 | daily |
| Anayasa Mahkemesi Kararlar Bilgi Bankası | court_decisions | 5 | daily |

## Dosyalar

| Dosya / klasör | Açıklama |
|----------------|----------|
| **recent-amendments.md** | Yerel mevzuat dosyası değişiklikleri + manuel eklenen kanun değişikliği özetleri |
| **recent-important-decisions.md** | Önemli mahkeme kararı özetleri (Yargıtay, AYM vb.) |
| **update-log.json** | Son çalıştırma zamanı, önceki snapshot (hash + madde listesi), her çalıştırmanın özeti (schedule: full/daily/weekly) |
| **history/** | Özet dosyalarının üzerine yazılmadan önce kopyalanan sürümler (amendments-*.md, decisions-*.md). Son 30’ar dosya saklanır. |

## Nasıl çalışır?

1. **Yerel karşılaştırma:** Script, `law-data/mevzuat/` altındaki dosyaların hash’ini ve madde numaralarını önceki çalıştırmayla karşılaştırır. Değişen dosyalarda eklenen / kaldırılan / değişmiş olabilecek maddeler tespit edilir.
2. **Manuel girdi:** Resmî Gazete veya mahkeme veritabanlarından aldığınız bilgileri aşağıdaki input dosyalarına ekleyebilirsiniz; script bunları markdown özetine yansıtır.

## Manuel girdi (Resmî kaynaklardan)

Resmî Gazete veya karar veritabanlarından bilgi eklemek için:

- **input/amendments.json** – Kanun değişikliği özetleri (kanun adı, tarih, değişen maddeler, kaynak).
- **input/decisions.json** – Önemli karar özetleri (mahkeme, dosya no, tarih, konu, özet, kaynak).

Örnek yapı script ilk çalıştırmasında bu dosyalarda mevcuttur. Güncel bilgi için Resmî Gazete ve ilgili mahkeme sitelerini kullanın.
