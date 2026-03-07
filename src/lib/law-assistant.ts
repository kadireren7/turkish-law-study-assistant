/**
 * Law education assistant logic.
 * Responses follow the defined formats (no fabricated court decisions or law articles).
 * In production, replace these with calls to a real LLM API (e.g. OpenAI) using the same prompts.
 */

export async function getLawAssistantReply(message: string): Promise<string> {
  const lower = message.toLowerCase().trim()
  // Check if asking for a specific law article (e.g. TBK 609, BK 609, 609. madde)
  const articleMatch = message.match(/(?:TBK|BK|Borçlar\s*Kanunu|609|610|Madde\s*\d+)/i)
  if (articleMatch || lower.includes('madde') || lower.includes('kanun')) {
    return formatArticleResponse(message)
  }
  // General topic: return definition-style format
  return formatGeneralResponse(message)
}

function formatArticleResponse(query: string): string {
  return `**KANUN:**
(İlgili kanun ve madde metni – gerçek kaynaktan kontrol ediniz. Örnek: TBK m. 609 sebepsiz zenginleşme.)

**AÇIKLAMA:**
Maddeyi sade ve anlaşılır şekilde açıklıyorum. Sebepsiz zenginleşme, bir kimsenin malvarlığında haklı bir sebep olmaksızın başkasının malvarlığı veya emeğiyle artış meydana gelmesidir.

**HUKUKİ MANTIK:**
Bu düzenlemenin amacı, haksız zenginleşmeyi önlemek ve denkleştirmektir.

**ÖRNEK:**
A, B’ye yanlışlıkla 10.000 TL ödemiştir. Haklı bir sebep olmadığı için B’nin zenginleşmesi sebepsizdir; A iade talep edebilir.

**SINAV NOTU:**
Zenginleşme, haklı sebep yokluğu ve illiyet bağı unsurlarına dikkat edin. Bu bilgi eğitim amaçlıdır; madde metnini resmi kaynaktan doğrulayın.`
}

function formatGeneralResponse(query: string): string {
  return `**1. Tanım**
Sorduğunuz kavramın hukuki tanımı burada yer alır. (Gerçek kaynaklardan teyit ediniz.)

**2. Unsurlar**
• Unsurlar madde madde yazılır.

**3. Örnek olay**
Gerçek hayata benzer kısa bir örnek.

**4. İstisnalar**
Varsa istisnalar belirtilir.

**5. Sınavda sorulabilecek nokta**
Dikkat edilmesi gereken hususlar.

*Bu açıklama eğitim amaçlıdır ve profesyonel hukuk danışmanlığı yerine geçmez. Kesin bilgi için ilgili kanun ve içtihatları kontrol ediniz.*`
}

export async function analyzeCaseForLaw(caseText: string): Promise<string> {
  return `**OLAY ÖZETİ:**
${caseText.slice(0, 200)}${caseText.length > 200 ? '...' : ''}

**HUKUKİ SORUN:**
Olayda çözülmesi gereken hukuki problem, olayın türüne göre (borçlar, ceza, idare vb.) ilgili normlara göre tespit edilmelidir.

**İLGİLİ MADDELER:**
Konuya göre TBK, TCK, CMK, İYUK vb. ilgili maddeler uygulanır. Resmi metinlerden kontrol ediniz.

**DEĞERLENDİRME:**
Olay, ilgili normun unsurlarıyla karşılaştırılarak değerlendirilir. Burada genel bir çerçeve verilmiştir; somut sonuç için dava dosyası ve deliller gerekir.

**SONUÇ:**
Muhtemel hukuki sonuç, uygulanacak hukuka ve ispat edilebilir olgulara bağlıdır. Kesin hüküm ancak mahkeme kararıyla verilir.

*Bu analiz eğitim amaçlıdır; profesyonel hukuki danışmanlık yerine geçmez.*`
}

const SAMPLE_QUIZ = [
  {
    question: 'Sebepsiz zenginleşmede aşağıdakilerden hangisi unsur değildir?',
    options: ['Zenginleşme', 'Fakirleşme', 'İlliyet bağı', 'Kusur'],
    correct: 'Kusur',
    explanation: 'Sebepsiz zenginleşmede kusur aranmaz; zenginleşme, fakirleşme ve illiyet bağı yeterlidir.',
  },
  {
    question: 'TBK\'da sözleşmenin kurulması için aşağıdakilerden hangisi gerekli değildir?',
    options: ['İrade açıklaması', 'Karşılıklı ve birbirine uygun irade', 'Sebep', 'Şekil (genel kural)'],
    correct: 'Şekil (genel kural)',
    explanation: 'Genel kural olarak sözleşme şekle tabi değildir; kanunda öngörülen hallerde şekil gerekir.',
  },
  {
    question: 'Ceza hukukunda kast türlerinden biri aşağıdakilerden hangisidir?',
    options: ['Dolaylı kast', 'Taksir', 'Netice sebebiyle ağırlaşmış kast', 'Olası kast'],
    correct: 'Dolaylı kast',
    explanation: 'Dolaylı kast, failin neticeyi doğrudan istememekle birlikte kabullenmesi halidir.',
  },
  {
    question: 'Anayasa\'ya göre temel hak ve özgürlükler hangi hallerde sınırlanabilir?',
    options: ['Sadece savaş halinde', 'Kanunla ve ancak Anayasa\'nın sözüne ve ruhuna uygun olarak', 'Bakanlar Kurulu kararıyla', 'Hiçbir zaman'],
    correct: "Kanunla ve ancak Anayasa'nın sözüne ve ruhuna uygun olarak",
    explanation: 'Anayasa m. 13\'e göre temel hak ve özgürlükler, ancak kanunla ve Anayasa\'nın sözüne ve ruhuna uygun biçimde sınırlanabilir.',
  },
  {
    question: 'İdari işlemin unsurlarından biri aşağıdakilerden hangisidir?',
    options: ['Yetki', 'Şekil', 'Sebep', 'Hepsi'],
    correct: 'Hepsi',
    explanation: 'İdari işlemde yetki, şekil, sebep, konu ve amaç unsurları birlikte aranır.',
  },
]

export async function generateQuizForLaw(topic: string): Promise<{
  question: string
  options: string[]
  correct: string
  explanation: string
}[]> {
  // Return sample quiz following the 5-question, 4-option format. In production, generate from LLM.
  return SAMPLE_QUIZ
}

const SAMPLE_FLASHCARDS: { front: string; back: string }[] = [
  { front: 'Sebepsiz zenginleşme nedir?', back: 'Haklı bir sebep olmaksızın bir kimsenin malvarlığında, başkasının malvarlığı veya emeğiyle meydana gelen artıştır (TBK m. 609).' },
  { front: 'Kast nedir?', back: 'Suçun kanuni tanımındaki unsurların bilerek ve istenerek gerçekleştirilmesidir.' },
  { front: 'İdari işlem nedir?', back: 'İdarenin, tek taraflı, hukuki sonuç doğurmak amacıyla yaptığı işlemdir.' },
  { front: 'Temel hakların sınırlanması hangi koşullara bağlıdır?', back: 'Anayasa m. 13: Kanunla, Anayasa\'nın sözüne ve ruhuna uygun, ölçülülük ilkesine uygun ve demokratik toplum düzeninin gereklerine uygun olmalıdır.' },
  { front: 'Sözleşmede irade ile irade açıklaması uyumsuzluğu ne zaman söz konusudur?', back: 'İç irade ile dışa yansıyan irade (açıklama) birbirine uymadığında; hata, hile, ikrah halleri gibi.' },
]

export async function generateFlashcardsForLaw(topic: string): Promise<{ front: string; back: string }[]> {
  return SAMPLE_FLASHCARDS
}
