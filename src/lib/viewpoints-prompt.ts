/**
 * Farklı Görüşler / Tartışmalar motoru için paylaşılan metinler.
 * Konu tartışmalı olduğunda kullanılacak yapılandırılmış bölüm ve kurallar.
 * Tamamen Türkçe; sınav odaklı, akademik.
 */

/** Yapılandırılmış "Farklı Görüşler" bölümü başlıkları (konu tartışmalıysa kullan). */
export const FARKLI_GORUSLER_HEADINGS = {
  baskın: 'Baskın görüş',
  karsi: 'Karşı görüş',
  uygulama: 'Uygulamadaki yaklaşım',
  sinavda: 'Sınavda güvenli yazım',
} as const

/**
 * Sistem promptlarına eklenecek ortak kural: Ne zaman "Farklı Görüşler" bölümü eklenir,
 * nasıl ayrım yapılır (kesin kaynak vs öğreti), zorla eklenmemesi.
 */
export const FARKLI_GORUSLER_RULES = `
FARKLI GÖRÜŞLER / TARTIŞMALAR (sadece konu gerçekten tartışmalıysa):
- Konu öğretide farklı yorumlanıyorsa veya hocalara göre farklı anlatılıyorsa aşağıdaki yapıyı kullan. Tartışma yoksa bu bölümü zorunlu kılma; tek satır "Bu konuda öğretide belirgin bir ayrışma yoktur" veya hiç ekleme.
- Kesin kaynak temelli bilgi (madde metni, yerleşik içtihat, kaynakta açık olan) ile öğretideki / yorumdaki farklı bakış açılarını net ayır. Önce "kaynakta şu var" de; sonra "öğretide ise şu görüş / karşı görüş vardır" de.
- Yapı (tartışma varsa): **Baskın görüş:** Öğretide ağırlıklı kabul. **Karşı görüş:** Farklı/azınlık görüşü. **Uygulamadaki yaklaşım:** Yargıtay/Danıştay/AYM (kaynakta varsa). **Sınavda güvenli yazım:** Hangi görüşü yazmak sınavda daha güvenli; "çoğu hocaya göre…" tarzı pratik not.
`.trim()

/**
 * Tartışmalı konu olarak sınıflandırıldığında (tartismali_konu) chat'e eklenen güçlü talimat.
 */
export const TARTISMALI_KONU_CHAT_INSTRUCTION = `
Soru "tartışmalı konu / farklı görüşler" olarak sınıflandırıldı. Farklı Görüşler bölümünü mutlaka yapılandır: **Baskın görüş**, **Karşı görüş**, **Uygulamadaki yaklaşım**, **Sınavda güvenli yazım**. Kesin kaynak bilgisini bu bölümden önce ver; öğretideki farklı yorumları bu bölümde topla.
`.trim()

/**
 * Olay Analizi (case) için: olay tartışmalı konu olarak sınıflandırıldığında Hukuki Değerlendirme içinde Farklı Görüşler alt bölümünü mutlaka doldur.
 */
export const TARTISMALI_KONU_CASE_INSTRUCTION = `
Bu olay "tartışmalı konu / farklı görüşler" olarak sınıflandırıldı. Hukuki Değerlendirme bölümünde mutlaka **Farklı Görüşler** altını ekle: **Baskın görüş**, **Karşı görüş**, **Uygulamadaki yaklaşım**, **Sınavda güvenli yazım**. Kaynakta kesin olanı önce yaz; öğretideki ayrışmayı bu alt bölümde topla.
`.trim()

/**
 * Konu Anlatımı (lesson) için: konu tartışmalı olarak sınıflandırıldığında "Farklı bakış açıları / öğretide farklı görüşler" bölümünü Baskın görüş, Karşı görüş, Uygulama, Sınavda güvenli yazım ile yapılandır.
 */
export const TARTISMALI_KONU_LESSON_INSTRUCTION = `
Konu "tartışmalı konu / farklı görüşler" olarak sınıflandırıldı. "Farklı bakış açıları / öğretide farklı görüşler" bölümünü mutlaka yapılandır: **Baskın görüş**, **Karşı görüş**, **Uygulamadaki yaklaşım**, **Sınavda güvenli yazım**. Kaynakta kesin olanı önce ver; öğretideki ayrışmayı bu bölümde topla.
`.trim()
