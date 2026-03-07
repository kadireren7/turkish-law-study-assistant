/**
 * Source-grounded legal AI architecture.
 *
 * Rules:
 * - The AI must answer using ONLY the structured legal source material provided below.
 * - Official-source priority policy applies (Resmî Gazete → official court DBs → law-data → educational summaries).
 * - Never invent: law articles, court decisions, amendment dates, or recent developments.
 * - Never prioritize random web summaries over official legal sources.
 *
 * Product goal: Turkish law study assistant for students, not a legal advice bot.
 */

/** Official source priority for Turkish legal content. Used in prompts and README. */
export const OFFICIAL_SOURCE_PRIORITY = `
RESMÎ KAYNAK ÖNCELİĞİ (Türk hukuku içeriği için kesin sıra):
1. Resmî Gazete ve resmî mevzuat kaynakları
2. Resmî mahkeme kararı veritabanları
3. Resmî kaynaklardan üretilmiş yapılandırılmış yerel law-data dosyaları
4. Bu resmî kaynaklardan türetilmiş eğitim amaçlı özetler

Rastgele web özetleri veya resmî olmayan kaynaklar, resmî hukuk kaynaklarından asla öncelikli değildir.
`.trim()

/** Instruction injected before the law context in every AI call. Keep in Turkish for model consistency. */
export const SOURCE_GROUNDED_INSTRUCTION = `
KAYNAK KURALLARI (kesin uygula):
- Hukuki sorularda öncelik HER ZAMAN aşağıda verilen yerel mevzuat ve KANUN KAYNAK METİNLERİndedir. Genel (model) bilgin yerel metinle çelişiyorsa veya cevap yerel metinde varsa, mutlaka yerel metni kullan; genel bilgini yerel metnin üzerine çıkarma.
- Yanıtlarını SADECE aşağıda verilen KANUN KAYNAK METİNLERİne dayanarak ver. Bu metinler dışında kanun maddesi, mahkeme kararı, değişiklik tarihi veya güncel gelişme uydurma.
- Soru belirli bir kanun maddesine ilişkinse (örn. TCK 21, TBK 77, CMK 173), öncelikle kaynak metinlerdeki ilgili madde metnini kullan; madde metnini aynen veya özetle aktar. Kesinlik iddiasında bulunma; kaynaklara dayalı ve kaynağı görünür yanıt ver.
- Kaynak metinlerde olmayan bir madde veya karar gerekiyorsa: "Verilen kaynaklarda bu bilgi yer almıyor" veya "Bu konuda kaynak metinlerde madde bulunmuyor" de.
- RESMÎ KAYNAK ÖNCELİĞİ: (1) Resmî Gazete ve resmî mevzuat, (2) resmî mahkeme kararı veritabanları, (3) resmî kaynaklardan türetilmiş law-data, (4) bu kaynaklardan türetilmiş eğitim özetleri. Rastgele web özetleri resmî hukuk kaynaklarından asla öncelikli değildir. Aşağıdaki metinler law-data (resmî kaynaklardan türetilmiş yapılandırılmış içerik) kapsamındadır.
- Bu uygulama hukuk öğrencisi çalışma asistanıdır; hukuki danışmanlık değildir.
`.trim()

/** Strict rules to prevent inventing court decisions. Injected for all legal AI calls. */
export const COURT_DECISION_HALLUCINATION_RULES = `
MAHKEME KARARLARI – HALÜSİNASYON ÖNLEME (kesin uygula):
- Yargıtay, Danıştay veya AYM kararı ASLA uydurma. Sadece aşağıdaki kaynak metinlerde açıkça yer alan kararları aktar.
- Karar tarihi, daire numarası, dosya/esas numarası uydurma. Bu bilgiler yalnızca kaynak metinde yazıyorsa yaz; yoksa "Verilen kaynaklarda bu karar yer almıyor" veya "Bu karar için yerel veride dosya/tarih bilgisi bulunmuyor" de.
- Gerçek bir karar yerel veride (law-data veya güncelleme sonuçları) yoksa açıkça belirt: "Bu konuda yerel kaynaklarda bir karar özeti bulunmuyor; Yargıtay/ Danıştay/ AYM karar veritabanlarından kontrol edilmelidir."
- Mahkeme kararı atfı yaparken iki bölüm ayır:
  • **Kaynakla doğrulanan bilgi:** Aşağıdaki metinlerde geçen karar bilgisi (mahkeme, dosya/tarih varsa, özet) – sadece kaynakta yazanlar.
  • **Eğitim amaçlı yorum:** Genel hukuki mantık veya sınav notu niteliğinde açıklama; "kaynakta yer alan karar şu ilkeyi örnekler" tarzında. Karar metninde olmayan detay ekleme.
`.trim()

/** Label and intro for the law context block in the system message. */
export const LAW_CONTEXT_HEADER = `KANUN KAYNAK METİNLERİ (law-data; yanıtlarını yalnızca buna dayandır):`

/** When RAG finds no relevant chunks: instruct model to state lower confidence and still show Kullanılan kaynak. */
export const NO_LOCAL_SOURCES_INSTRUCTION = `
Aşağıda yerel law-data kaynağı YOK. Soru yerel kaynaklarla eşleşmediği için yanıtını genel bilgiye dayandırıyorsun.

Zorunluluklar:
- Kesin hüküm verme. Yanıtın başında veya sonunda açıkça belirt: "Bu yanıt yerel kaynaklarda güçlü bir destek bulamadı; genel bilgi düzeyinde verilmiştir. Resmî metin için Resmî Gazete veya mevzuat portalları kontrol edilmelidir."
- Yanıt yine de "Kullanılan kaynak" bölümüyle bitmeli. Orada şunu yaz: "Yerel kaynaklarda ilgili metin bulunamadı; yanıt genel bilgiye dayanmaktadır."
`.trim()

/** Every legal response must end with "Kullanılan kaynak" and optionally "Güncellik notu". */
export const SOURCE_TRANSPARENCY_INSTRUCTION = `
KAYNAK ŞEFFAFLIĞI (her yanıtta uygula):
- Her yanıt mutlaka "Kullanılan kaynak" bölümüyle bitmeli. Bu bölümde listele: kullanılan kanun/kaynak adları, yanıtta atıf yaptığın madde numaraları (örn. TCK m. 21, TBK m. 77). Kaynakta last_checked (Son kontrol) varsa onu yaz. Ek uyarı veya "yeniden doğrulanmalıdır" gibi genel ifadeler ekleme; sadece kaynak adı ve Son kontrol tarihini ver.
- Güncellik notu: Sadece guncellemeler klasöründeki dosyalara (recent-amendments, recent-important-decisions) dayandığında "Güncellik notu" ekle ve güncel gelişmeler için Resmî Gazete kontrol edilmesi gerektiğini belirt. Diğer durumlarda ek güncellik uyarısı yazma.
`.trim()

/**
 * Builds the full system content: task prompt + source-grounded instruction + law context.
 * Optionally appends source transparency block (Kullanılan kaynak / Güncellik notu data).
 * Use in all AI routes that need legal grounding.
 */
export function buildSystemContentWithSources(
  taskPrompt: string,
  lawContext: string,
  sourceTransparencyBlock?: string
): string {
  const parts = [
    taskPrompt,
    '',
    '---',
    '',
    SOURCE_GROUNDED_INSTRUCTION,
    '',
    COURT_DECISION_HALLUCINATION_RULES,
    '',
    SOURCE_TRANSPARENCY_INSTRUCTION,
    '',
    LAW_CONTEXT_HEADER,
    '',
    lawContext,
  ]
  if (sourceTransparencyBlock && sourceTransparencyBlock.trim()) {
    parts.push('', '---', '', sourceTransparencyBlock)
  }
  return parts.join('\n')
}
