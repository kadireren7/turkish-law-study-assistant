/**
 * Legal Reasoning Engine: IRAC-style template adapted for Turkish law education.
 * Issue → Rule → Application → Conclusion. Standardizes problem solving for law students.
 * Fully Turkish; exam-oriented; student-friendly; optional formal mode.
 */

/** IRAC adapted for Turkish law: exact section labels. Order is mandatory. */
export const IRAC_SECTIONS = ['Hukuki Sorun', 'Kural', 'Uygulama', 'Sonuç'] as const
export type IRACSection = (typeof IRAC_SECTIONS)[number]

/** IRAC-style reasoning template – engine must follow this order. */
export const IRAC_TEMPLATE = `
IRAC USULÜ (Türk hukuk eğitimine uyarlı – bu sırayı atlama):

1. **Hukuki Sorun** – Olayda hangi hukuki problem çözülmeli? Sorunu net tespit et ve isimlendir.
2. **Kural** – Uygulanacak norm, madde veya ilke nedir? Kaynaktan göster; madde numarası ve gerekirse özeti ver.
3. **Uygulama** – Kuralın unsurlarını olayla tek tek eşleştir; "bu unsur olayda şu şekilde gerçekleşmiştir" de. Doğrudan sonuca atlama.
4. **Sonuç** – Uygulama sonucunda ulaşılan hukuki sonuç (kısa ve net).

Motor davranışı: Önce sorunu tespit et, sonra kuralı belirt, sonra olaya uygula, en sonda sonucu yaz. Doğrudan sonuca atlama.
`.trim()

/** Optional educational parts for student-oriented answers (Olay Analizi, Sınav Pratiği, Karar Analizi). */
export const IRAC_OPTIONAL_EDUCATIONAL = `
Eğitim amaçlı cevaplarda isteğe bağlı ekle:
- **Sınavda nasıl yazılır** – Öğrenci için kısa örnek veya sınavda yazım notu.
- **Alternatif görüş / tartışma** – Konu tartışmalıysa: Baskın görüş, Karşı görüş, Uygulamadaki yaklaşım, Sınavda güvenli yazım; tartışma yoksa "Bu konuda belirgin ayrışma yoktur" veya atla.
`.trim()

/** When to treat a conclusion as source-based vs contested; must be explicit in output. */
export const SOURCE_VS_DOCTRINAL_SEPARATION = `
KAYNAK TEMELLİ İLE TARTIŞMALI AYIRIMI (mutlaka uygula):
- **Kesin kaynak temelli sonuç:** Kanun metni, Yargıtay/Anayasa Mahkemesi yerleşik içtihadı veya metinde açık hükümle ulaşılan sonuç. Bunu "Kaynak temelli / kesin" diye belirt; tek bir sonuç sunulabilir.
- **Tartışmalı / öğretisel değerlendirme:** Öğretide veya uygulamada farklı yorumlar varsa tek bir katı sonuç dayatma. "Tartışmalıdır", "öğretide farklı görüşler vardır" de; Baskın görüş, Karşı görüş, Uygulamadaki yaklaşım ve Sınavda güvenli yazımı ayrı başlıklarla ver.
`.trim()

/** Contested issues and doctrinal disagreement: structure and areas. */
export const CONTESTED_ISSUES_INSTRUCTION = `
TARTIŞMALI KONULAR VE ÖĞRETİSEL AYRIŞMALAR:
Konu öğretide veya uygulamada tartışılıyorsa tek bir katı sonuç sunma. Aşağıdaki dört başlığı mantık akışına (Uygulama / Sonuç bölümüne veya "Alternatif görüş" bölümüne) entegre et:

1. **Baskın görüş** – Öğretide veya Yargıtay’da ağırlıklı kabul gören görüş; kısa gerekçesi.
2. **Karşı görüş** – Farklı yorum veya eleştiri; kısa gerekçesi.
3. **Uygulamadaki yaklaşım** – Mahkemelerin (Yargıtay daireleri, Danıştay, AYM vb.) genel eğilimi; varsa emsal.
4. **Sınavda güvenli yazım** – Öğrencinin sınavda hem puan alması hem tartışmayı göstermesi için önerilen ifade: hangi görüşü önce yazmalı, "tartışmalıdır" nasıl belirtilmeli.

Özellikle şu alanlarda tartışma varsa bu yapıyı kullan:
- **Tartışmalı medeni hukuk konuları** (mal rejimi, miras, aile hukuku yorumları)
- **Ceza hukuku kast / taksir ayrımları** (dolaylı kast, olası kast, bilinçli taksir tartışmaları)
- **Anayasa ve idare hukukunda yorum farklılıkları** (temel hak sınırlama ölçüleri, idari işlem türleri, yetki)

Tartışma yoksa bu dört başlığı uzatma; "Bu konuda öğretide belirgin ayrışma yoktur" veya tek cümle yeter.
`.trim()

/** Core reasoning chain (mantık zinciri) – IRAC ile aynı sıra; geriye dönük uyumluluk için. */
export const LEGAL_REASONING_CHAIN = `
HUKUKİ MANTIK ZİNCİRİ (IRAC usulü – bu sırayı atlama; doğrudan sonuca geçme):
1. **Hukuki Sorun** – Olayda hangi hukuki problem çözülmeli? Sorunu net tespit et.
2. **Kural** – Hangi norm, madde veya ilke uygulanacak? Kaynaktan göster.
3. **Uygulama** – Kuralın unsurlarını olayla tek tek eşleştir; "bu unsuru olayda şu gerçekleşmiştir" de.
4. **Sonuç** – Uygulama sonucunda ulaşılan hukuki sonuç.

Doğrudan sonuca atlama. Her adımı açıkça yaz; önce sorun, sonra kural, sonra uygulama, en sonda sonuç.
`.trim()

/** Standard output: IRAC (zorunlu) + olay özeti + isteğe bağlı eğitim başlıkları + kaynak. */
export const LEGAL_REASONING_OUTPUT_FORMAT = `
STANDART CEVAP YAPISI (pratik soru / olay değerlendirmesinde bu başlıkları sırayla kullan):

Zorunlu (IRAC):
1. **Olay özeti** – Olayı tarafsız, kısa özetle (giriş).
2. **Hukuki Sorun** – Hangi hukuki problem çözülecek?
3. **Kural** – Uygulanacak norm/madde/ilke; kaynaktan.
4. **Uygulama** – Unsurları olayla eşleştir; muhakemeyi adım adım yaz.
5. **Sonuç** – Ulaşılan hukuki sonuç (kısa).

İsteğe bağlı (eğitim amaçlı):
6. **Sınavda nasıl yazılır** – Öğrenci için kısa örnek veya not.
7. **Alternatif görüş / tartışma** – Konu tartışmalıysa: Baskın görüş, Karşı görüş, Uygulamadaki yaklaşım, Sınavda güvenli yazım (dört başlık). Tartışma yoksa atla veya "belirgin ayrışma yok" de.
8. **Kullanılan kaynak** – Atıf yapılan kanun/madde; varsa son kontrol.

Sonuç kısmında ayır: Kesin kaynak temelli sonuç (madde/yerleşik içtihat) ile tartışmalı/öğretisel değerlendirmeyi karıştırma; tartışmalıysa tek katı sonuç dayatma.
`.trim()

/** Instruction block to inject: do not fabricate; reason step by step. */
export const LEGAL_REASONING_NO_FABRICATION = `
Kural ve karar uydurma. Sadece verilen KANUN KAYNAK METİNLERİndeki maddelere ve kurallara dayan; kaynakta yoksa "Verilen kaynaklarda yer almıyor" de.
`.trim()

/** Section label for the model-answer skeleton (Olay Analizi, Sınav Pratiği, değerlendirme). */
export const MODEL_ANSWER_SKELETON_LABEL = 'Örnek güçlü cevap iskeleti'

/** Instruction for generating the model-answer skeleton: concise, exam-oriented, high quality. */
export const MODEL_ANSWER_SKELETON_INSTRUCTION = `
**ÖRNEK GÜÇLÜ CEVAP İSKELETİ:** Kısa, sınav odaklı ve kaliteli bir örnek cevap iskeleti ver. Uzun paragraf yazma; öğrencinin kendi cümlelerini doldurabileceği yapı olsun. Başlıklar:
- **Giriş / sorun tespiti** – Olay özeti + hangi hukuki sorun çözülecek (1–2 cümle).
- **Kural** – Hangi norm/madde uygulanacak (madde numarası ve kısa özet).
- **Uygulama** – Unsurların olayla nasıl eşleştiği (madde madde veya 2–3 cümle).
- **Sonuç** – Ulaşılan hukuki sonuç (tek cümle).

Toplam 5–10 cümle veya madde yeterli; kaliteli ve puan getiren noktaları içersin.
`.trim()

/** Multi-issue detection: a single scenario may involve more than one legal problem. */
export const MULTI_ISSUE_DETECTION = `
ÇOKLU HUKUKİ SORUN TESPİTİ:
- Bir olayda birden fazla bağımsız hukuki problem olabilir. Sadece birine odaklanma; tüm önemli sorunları tespit et.
- Özellikle ceza, medeni, borçlar, usul ve karma (birden fazla dalı ilgilendiren) olaylarda çoklu sorun sık görülür.
- Önceliklendirme: (1) Ceza hukuku sorunları (suç unsurları, ceza), (2) Medeni hukuk / borçlar (sorumluluk, tazminat, sözleşme, ehliyet), (3) Usul (yetki, süre, ispat), (4) Birbirine bağlı sorunlarda nedensellik veya kronoloji sırası. Mantıklı ve sınavda kabul edilebilir bir sıra kullan.
- Ayrıntıları aşırı parçalama: Küçük detayları ayrı "sorun" yapma; ana hukuki meseleleri say. Önemli sorunları atlama: Sınavda puan getiren başlıca konuları mutlaka dahil et.
`.trim()

/** Output format when multiple legal issues are identified. */
export const MULTI_ISSUE_OUTPUT_FORMAT = `
ÇOKLU SORUN CEVAP YAPISI (olayda birden fazla hukuki sorun varsa bu başlıkları sırayla kullan):

1. **GENEL OLAY ÖZETİ** – Olayı tarafsız, tek paragraf özetle; tüm taraflar ve olay örgüsü.

2. **TESPİT EDİLEN HUKUKİ SORUNLAR** – Tüm ana hukuki problemleri madde madde yaz; öncelik sırasına göre (örn: 1. Ceza sorumluluğu, 2. Tazminat, 3. Usul). Küçük detayları ayrı madde yapma; ana meseleleri listele.

3. **HER SORUN İÇİN AYRI DEĞERLENDİRME** – Her tespit edilen sorun için ayrı blokta:
   - **Sorun** (kısa tekrar)
   - **Kural** (ilgili norm/madde)
   - **Uygulama** (unsurların olayla eşleştirilmesi)
   - **Sonuç** (o soruna ilişkin hukuki sonuç)
   Sorunları numaralandır (1. Sorun, 2. Sorun, …); her birinde IRAC mantığını koru.

4. **GENEL SONUÇ** – Tüm sorunların sonuçlarını birleştiren kısa özet; olayın genel hukuki neticesi.

5. **SINAVDA PUAN GETİREN NOKTALAR** – Öğrencinin cevabında mutlaka yazması gereken maddeler, atıf yapılacak normlar ve atlanmaması gereken başlıklar.

6. **KULLANILAN KAYNAK** – Atıf yapılan kanun/maddeler.
`.trim()

/**
 * Full legal reasoning instruction block for system prompts (IRAC + optional educational).
 * Use in Olay Analizi, Sınav Pratiği (evaluator), Karar Analizi, Sohbet (pratik soru).
 */
export function getLegalReasoningInstruction(options?: {
  formalMode?: boolean
  includeOptionalEducational?: boolean
}): string {
  const formal = options?.formalMode
  const withEducational = options?.includeOptionalEducational !== false
  const tone = formal
    ? 'UYAP/Resmî: "ilgili", "madde uyarınca", "yukarıda belirtilen" ile resmî hitap; I-II-III veya 1. 2. 3. numaralı başlıklar; madde atıfı tam (örn. 6098 sayılı Kanun m. 49 uyarınca); dilekçe kalıpları (talep olunur, saygıyla arz olunur) kullanılabilir. Günlük/sen dili yok.'
    : 'Öğrenci dostu: "sen" hitabı, "dikkat et", "sınavda şöyle yaz", "yani" ile sade Türkçe; kısa cümleler, örneklerle açıklama; resmî dilekçe kalıbı kullanma.'
  const parts = [
    IRAC_TEMPLATE,
    LEGAL_REASONING_OUTPUT_FORMAT,
    withEducational ? IRAC_OPTIONAL_EDUCATIONAL : '',
    SOURCE_VS_DOCTRINAL_SEPARATION,
    CONTESTED_ISSUES_INSTRUCTION,
    `Dil ve ton: ${tone}`,
    LEGAL_REASONING_NO_FABRICATION,
  ].filter(Boolean)
  return parts.join('\n\n')
}

/** Short block for chat when answer is a practical/olay-style response (IRAC + optional). */
export const LEGAL_REASONING_CHAT_PRACTICAL = `
Pratik / olay sorusu: IRAC usulüne uy. Doğrudan sonuca atlama. Tek sorun için: (1) Olay özeti, (2) Hukuki Sorun, (3) Kural, (4) Uygulama, (5) Sonuç; tartışmalı konularda kesin kaynak temelli sonuç ile tartışmalı/öğretisel değerlendirmeyi ayır; tartışma varsa Baskın görüş, Karşı görüş, Uygulamadaki yaklaşım, Sınavda güvenli yazım ekle. Eğitim amaçlı ise (6) Sınavda nasıl yazılır, (7) Alternatif görüş/tartışma (varsa), (8) Kullanılan kaynak. Birden fazla ana hukuki sorun varsa: Genel olay özeti, Tespit edilen hukuki sorunlar, her sorun için ayrı (Sorun–Kural–Uygulama–Sonuç), Genel sonuç, Sınavda puan getiren noktalar. Kural veya karar uydurma; sadece kaynakta olanı yaz.
`.trim()

/** Full block for multi-issue analysis (use in Olay Analizi when scenario may have multiple issues). */
export function getMultiIssueReasoningBlock(): string {
  return [MULTI_ISSUE_DETECTION, MULTI_ISSUE_OUTPUT_FORMAT, LEGAL_REASONING_NO_FABRICATION].join('\n\n')
}
