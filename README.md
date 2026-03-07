# Hukuk Çalışma Asistanı

Türk hukuku **öğrencileri** için ders ve sınav çalışmasına yönelik bir **çalışma asistanı**. Genel bir hukuk platformu değildir; hukuk fakültesi öğrencilerinin ders tekrarı ve sınav hazırlığı için kullanması hedeflenir.

---

## Ürün yönü

- **Hedef kitle:** Hukuk fakültesi öğrencileri  
- **Amaç:** Ders çalışması ve sınav hazırlığı (vize, final, açık uçlu / olay sorusu pratiği)  
- **Değil:** Hukuki danışmanlık veya genel hukuk bilgi platformu  
- **Dil:** Arayüz ve metinler tamamen Türkçe  

---

## Çekirdek araçlar (öncelikli)

| Araç | Açıklama |
|------|----------|
| **Sohbet** | Ders ve sınav çalışırken konu sorun; yanıtlar tanım, ilgili madde, açıklama, örnek olay ve sınav notu formatında gelir. |
| **Madde Ara** | Anayasa, TCK, TMK, TBK, CMK, HMK, İİK, TTK, İYUK, İş Kanunu, Kabahatler madde numarasıyla (örn. TCK 21, TBK 77, İİK 38) madde metni, açıklama ve örnek bulun. Mevzuat dosyasında yoksa madde-index’ten döner. |
| **Olay Analizi** | Vize/final tarzı vakaları yapıştırın; olay özeti, hukuki sorun, ilgili maddeler ve değerlendirme alın. |
| **Sınav Pratiği** | Açık uçlu sınav sorusu üretilir, cevabınızı yazarsınız; puan ve geri bildirim (güçlü yönler, eksikler, öneriler) verilir. |
| **Güncel Hukuk Gelişmeleri** | Son mevzuat değişiklikleri ve önemli kararlar; öğrenci için neden önemli olduğu ile birlikte (güncelleme pipeline çıktısı). |

---

## Diğer araçlar (ek çalışma)

| Araç | Açıklama |
|------|----------|
| **Çoktan Seçmeli Test** | Konuya göre 5 çoktan seçmeli soru üretir. |
| **Bilgi Kartları** | Konuya göre soru–cevap flashcard’ları oluşturur. |
| **Konu Anlatımı** | Ders alanı ve konu seçerek sade, sınav odaklı kısa anlatım alırsınız. |

---

## Teknoloji

- **Next.js 16** (App Router), **React 19**, **TypeScript**
- **OpenAI API** (gpt-4o-mini) — sohbet, olay analizi, sınav sorusu/değerlendirme, test, kartlar, konu anlatımı
- **Tailwind CSS** — arayüz
- **Node.js 20.9+** gerekli

---

## Mimari: Kaynak temelli (source-grounded) yapı

Bu proje **OpenAI modelini fine-tune etmez veya eğitmez.** Hazır API kullanır; model ağırlıkları değiştirilmez. Türk hukuku **öğrencileri** ve **sınav hazırlığı** için tasarlanmış **kaynak temelli (source-grounded)** bir mimari kullanır: yanıtlar yerel hukuk verisine dayanır, model yalnızca bu bağlam üzerinden metin üretir.

### Bileşenler birlikte nasıl çalışır?

Üç parça birlikte kullanılır:

1. **Yerel law-data** — Kanun metinleri (Anayasa, TCK, TMK, TBK, CMK, HMK, İİK, TTK, İdari Yargılama Usulü, İş Kanunu, Kabahatler, İdare), konu notları ve madde açıklamaları `law-data/` altında tutulur. **Mevzuat** (`law-data/mevzuat/`) Markdown; **madde-index** (`law-data/madde-index/`) madde metinleri için JSON indeksi; **konu-notlari** (`law-data/konu-notlari/`) öğrenci odaklı konu notları. Tüm hukuki yanıtlar bu kaynaklardan beslenir.
2. **Güncelleme pipeline'ı** — Mevzuat ve karar özetleri `scripts/update-legal-data.ts` ile güncellenir. Yerel dosya değişiklikleri tespit edilir; isteğe bağlı olarak Resmî Gazete / mahkeme kaynaklarından alınan özetler `law-data/guncellemeler/` (recent-amendments, recent-important-decisions) içine yazılır. **Güncel hukuk gelişmeleri** bu işlerle takip edilir; sınav için önemli değişiklikler "Güncel Hukuk Gelişmeleri" sayfasında özetlenir.
3. **OpenAI API** — Sohbet, olay analizi, sınav pratiği vb. özelliklerde model, **law-data'dan çekilen metinler** bağlam olarak verilerek çağrılır. Model kendi "hafızasına" değil, her istekte sağlanan kaynak metinlere dayanır.

Özet: **Yerel law-data + güncelleme işleri + OpenAI** birlikte kullanılır; eğitim veya fine-tuning yoktur.

### Kaynak kuralları

- **Yapılandırılmış kaynak:** AI yanıtları yalnızca sağlanan law-data metinlerine (ve güncellemeler klasöründeki özetlere) dayanır.
- **Retrieval:** İlgili bölümler `law-rag` ile seçilir; öncelik sırası: (1) mevzuat (madde metni), (2) madde-index, (3) konu-notlari, (4) guncellemeler. Her AI çağrısında bu metinler bağlam olarak verilir (`source-grounded`).
- **Uydurma yok:** Kanun maddesi, karar numarası, tarih veya güncel gelişme uydurulmaz. Kaynakta yoksa "Verilen kaynaklarda yer almıyor" gibi ifade kullanılır.
- **Ürün amacı:** Hukuk **öğrencisi** için **ders ve sınav hazırlığı** asistanı; hukuki danışmanlık veya genel hukuk platformu değildir.

### Resmî kaynak önceliği (zorunlu)

İçerik üretiminde **resmî kaynak önceliği** uygulanır. Rastgele web özetleri resmî hukuk kaynaklarından öncelikli sayılmaz. Sıra:

1. Resmî Gazete ve resmî mevzuat kaynakları  
2. Resmî mahkeme kararı veritabanları (Yargıtay, AYM vb.)  
3. Bu kaynaklardan üretilmiş yerel **law-data** dosyaları  
4. Bu kaynaklardan türetilmiş eğitim amaçlı özetler (konu notları, guncellemeler)

Bu politika sohbet, madde arama, olay analizi, sınav pratiği ve güncel gelişmeler dahil **tüm** hukuki içerik üretiminde geçerlidir. Madde Ara doğrudan law-data okur; AI kullanan özelliklerde bağlam yine law-data'dan enjekte edilir.

### Güncel gelişmelerin takibi (update jobs)

Son mevzuat değişiklikleri ve önemli kararlar **güncelleme işleri** ile takip edilir:

- **Günlük/haftalık scriptler:** `npm run legal:update:daily` (mevzuat), `npm run legal:update:weekly` (karar özetleri) veya tam güncelleme `npm run legal:update`.
- **Çıktı:** `law-data/guncellemeler/recent-amendments.md`, `recent-important-decisions.md`, `update-log.json`. Bu dosyalar "Güncel Hukuk Gelişmeleri" sayfasında ve (uygunsa) sohbet/uyarı metinlerinde kullanılır.
- **Resmî kaynak vurgusu:** Özetler Resmî Gazete ve mahkeme veritabanlarına atıf yapar; kesin metin için kullanıcı bu kaynaklara yönlendirilir.

Detaylar için `law-data/guncellemeler/README.md` ve `src/lib/legal-sources.ts` (kaynak öncelik listesi) kullanılabilir.

### Teknik (kod tarafı)

- Tüm AI route'ları `src/lib/source-grounded.ts` üzerinden ortak kaynak kuralına uyar; `getLawDatabaseContext()` ile law-data bağlamı enjekte edilir.
- Prompt'lar "KANUN KAYNAK METİNLERİ" ve güncellemeler klasörüne atıf yapar; güncellik uyarıları `src/lib/freshness-warnings.ts` ile eklenebilir.


---

## Kurulum ve çalıştırma

```bash
npm install
npm run dev
```

Tarayıcıda [http://localhost:3000](http://localhost:3000) açın.

### OpenAI API

1. Proje kökünde `.env.local` oluşturun.
2. İçine ekleyin: `OPENAI_API_KEY=sk-...` ([OpenAI API Keys](https://platform.openai.com/api-keys))
3. `npm run dev` ile sunucuyu yeniden başlatın.

API anahtarı veya kota hatalarında kullanıcıya **Türkçe** mesajlar gösterilir.

---

## Deployment

### Yerel ortamda çalıştırma

```bash
npm install
npm run dev
```

Tarayıcıda [http://localhost:3000](http://localhost:3000) açın. Production build denemek için: `npm run build` ve `npm start`.

### Ortam değişkenleri (`.env.local`)

1. Proje kökünde `.env.local` dosyası oluşturun (git’e eklenmez).
2. İsteğe bağlı olarak OpenAI anahtarını ekleyin:

   ```
   OPENAI_API_KEY=sk-...
   ```

   Anahtarı [OpenAI API Keys](https://platform.openai.com/api-keys) sayfasından alabilirsiniz.

**AI özellikleri isteğe bağlıdır.** `OPENAI_API_KEY` tanımlı değilse Sohbet, Olay Analizi, Sınav Pratiği, Test, Kartlar ve Konu Anlatımı sayfaları API hatası verecektir; **Madde Ara** ise yalnızca `law-data` dosyalarını okuduğu için anahtar olmadan çalışır. Tüm arayüz ve metinler yine Türkçe görünür.

### Vercel’e deploy etme

1. Projeyi GitHub/GitLab/Bitbucket’a push edin.
2. [Vercel](https://vercel.com) hesabınızla giriş yapın, **Add New Project** ile repoyu seçin.
3. Framework Preset olarak **Next.js** seçili kalsın; **Deploy** ile build alın.

### Vercel’de ortam değişkenleri

1. Vercel dashboard’da projeyi açın → **Settings** → **Environment Variables**.
2. **Name:** `OPENAI_API_KEY`  
   **Value:** `sk-...` (OpenAI API anahtarınız)  
   **Environment:** Production (ve isterseniz Preview, Development).
3. Kaydedin. Sonraki deploy’da bu değişken kullanılır.

Deploy sonrası AI kullanan sayfalar yalnızca `OPENAI_API_KEY` tanımlıysa çalışır; tanımlı değilse ilgili sayfalarda Türkçe hata mesajı gösterilir.

---

## Proje yapısı (özet)

```
law-data/
  mevzuat/          # Kanun metinleri (anayasa, tck, tmk, tbk, cmk, hmk, iik, ttk, idari-yargilama-usulu, is-kanunu, kabahatler, idare)
  madde-index/       # Madde metinleri JSON (anayasa, tck, tmk, tbk, cmk, hmk, iik, ttk, idari-yargilama-usulu, is-kanunu, kabahatler)
  konu-notlari/      # Öğrenci konu notları (ceza-genel, medeni-giris, borclar-genel, anayasa-genel, usul/cmk/hmk/icra/ticaret/is/idare giriş)
  guncellemeler/     # recent-amendments, recent-important-decisions
scripts/            # update-legal-data.ts (güncelleme pipeline)
src/
  app/
    page.tsx              # Ana sayfa (kartlar)
    sohbet/                # Sohbet (RAG + kaynak şeffaflığı + güncellik uyarıları)
    law-search/           # Madde Ara
    case-solver/          # Olay Analizi
    exam-practice/        # Sınav Pratiği
    guncel-gelismeler/    # Güncel Hukuk Gelişmeleri
    quiz/                 # Çoktan Seçmeli Test
    flashcards/           # Bilgi Kartları
    law-lessons/          # Konu Anlatımı
    api/                  # chat, law-search, case, exam-practice, quiz, flashcards, lesson
  components/             # Sidebar, ChatMessage
  lib/                    # api, law-database, law-rag, law-search, source-grounded, source-metadata,
                          # freshness-warnings, legal-sources, *-prompt
```

---

## Not

- **Hukuki danışmanlık değildir;** yalnızca ders ve sınav çalışması amaçlıdır.
- Yanıtlar `law-data` ve prompt kurallarına dayanır; uydurma mahkeme kararı veya madde üretilmez.
