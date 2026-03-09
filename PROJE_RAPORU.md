# Hukuk Projesi – Detaylı İnceleme Raporu

Bu rapor, projenin yapısı, tespit edilen sorunlar ve geliştirilebilir alanları özetler.

---

## 1. Proje Özeti

- **Teknoloji:** Next.js 16 (App Router), React 19, TypeScript, Tailwind, OpenAI (gpt-4o-mini)
- **Amaç:** Hukuk öğrencileri için ders/sınav çalışma asistanı (Sohbet, Madde Ara, Olay Analizi, Karar Analizi, Pratik Çöz, Quiz, Flashcards, Konu Anlatımı, Güncel Gelişmeler, Haberler, Çalışma Özeti)
- **Veri:** Yerel `law-data/` (mevzuat, madde-index, konu-notlari, guncellemeler, haberler) + RAG tabanlı kaynak kullanımı

---

## 2. Tespit Edilen Hatalar ve Tutarsızlıklar

### 2.1 API anahtarı kontrolü tutarsızlığı

- **Sorun:** `src/app/api/law-search/route.ts` içinde `OPENAI_API_KEY` yoksa sadece classification atlanıyor; diğer route’lar 503 + “OPENAI_API_KEY tanımlı değil” dönüyor. Madde arama anahtar olmadan çalışıyor (doğru), ancak davranış dokümante değil ve diğer route’larla tutarsız.
- **Öneri:** Law-search’te “API key yoksa sadece classification yapılmaz” davranışını bir yorumla netleştirin; diğer route’larda hata mesajları için ortak bir sabit (örn. `ERROR_MESSAGES`) kullanın.

### 2.2 Duplicate / çift dosya yolları

- **Sorun:** Bazı import’lar `src\app\...` (backslash), bazıları `src/app/...` (slash) ile görünüyor. Windows’ta çalışır ama Git/cross-platform’da karışıklığa yol açabilir.
- **Öneri:** Tüm import’larda tutarlı şekilde `/` kullanın (Next/TypeScript zaten buna uygun).

### 2.3 Global hata yakalama eksikliği

- **Sorun:** `src/app` altında `global-error.tsx` veya `error.tsx` yok. Beklenmeyen hatalar kullanıcıya Next.js varsayılan hata sayfası olarak gidebilir.
- **Öneri:** En azından `src/app/global-error.tsx` ekleyin; Türkçe, sade bir “Bir şeyler yanlış gitti” mesajı ve (isteğe bağlı) yeniden dene / ana sayfaya dön butonu sunun.

### 2.4 Middleware yok

- **Sorun:** Rate limiting, güvenlik başlıkları veya ortak yönlendirme için kullanılabilecek bir `middleware.ts` tanımlı değil.
- **Öneri:** İleride API isteklerini sınırlamak veya güvenlik başlıkları eklemek isterseniz kök dizinde `middleware.ts` ekleyebilirsiniz.

### 2.5 `.env` örneği yok

- **Sorun:** `.env.example` veya benzeri bir dosya yok. Yeni geliştiriciler hangi değişkenlerin gerekli olduğunu README dışında göremiyor.
- **Öneri:** `.env.example` ekleyin, örneğin:
  ```env
  OPENAI_API_KEY=
  CRON_SECRET=
  ```
  README’de “Kopyalayıp .env.local yapın” ifadesini kullanın.

---

## 3. Geliştirilebilir / İyileştirilebilir Kısımlar

### 3.1 Rate limiting (API)

- **Durum:** API route’larda rate limit yok. Bir kullanıcı sınırsız istek atabilir; OpenAI maliyeti ve sunucu yükü artar.
- **Öneri:** Vercel’de Vercel KV veya Upstash Redis ile istek başına IP veya kullanıcı bazlı limit (örn. dakikada 20 istek) koyun. Alternatif: Vercel’in kendi rate limit özelliği varsa onu kullanın.

### 3.2 Input validasyonu ve boyut sınırları

- **Durum:** Birçok yerde `slice(0, N)` ile metin kesiliyor (örn. chat 2500, decision-analysis 12000). Ancak body boyutu veya mesaj uzunluğu için erken red (413 / 400) yok; çok büyük istekler işlendikten sonra kesiliyor.
- **Öneri:**  
  - Request body için maksimum boyut (örn. 500 KB) ve metin alanları için maksimum karakter sayısı tanımlayın.  
  - Aşan istekleri 400/413 ile hemen reddedin; gerekirse ortak bir `validateBodySize` / `validateTextLength` yardımcısı kullanın.

### 3.3 Ortak OpenAI client ve hata mesajları

- **Durum:** Her API route kendi `new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? '' })` ve bazen farklı hata metinlerini kullanıyor.
- **Öneri:**  
  - `src/lib/openai.ts` gibi tek bir modülde client oluşturun; API key kontrolü burada veya route’ta tek yerde yapılsın.  
  - Tüm route’larda kullanılacak ortak `ERROR_MESSAGES` (missingKey, quota, server) tanımlayın; böylece mesajlar Türkçe ve tutarlı kalır.

### 3.4 Test altyapısı

- **Durum:** `package.json`’da test script’i yok; Playwright kurulu ama otomatik test tanımı görünmüyor.
- **Öneri:**  
  - En azından `npm run lint` ile birlikte çalışacak bir `npm run test` (örn. Vitest veya Jest) ekleyin.  
  - Kritik lib fonksiyonları (örn. `parseLawQuery`, `getLawDisplayLabel`) için birim testleri yazın.  
  - İsteğe bağlı: Playwright ile birkaç kritik sayfa (ana sayfa, madde ara, sohbet girişi) için E2E testi ekleyin.

### 3.5 Erişilebilirlik (a11y)

- **Durum:** Formlar ve butonlar için bazı yerlerde `aria-label` var (örn. “Menüyü aç”); tüm interaktif öğeler ve hata durumları gözden geçirilmemiş olabilir.
- **Öneri:**  
  - Önemli buton ve linklere anlamlı `aria-label` veya görünür metin verin.  
  - Yükleme ve hata durumlarında `aria-live` veya `role="status"` kullanın.  
  - Mümkünse `eslint-plugin-jsx-a11y` ile kontrolleri otomatikleştirin.

### 3.6 Sidebar’da eksik sayfa

- **Durum:** `src/app/exam-practice/page.tsx` (Sınav Pratiği) var ama `Sidebar` içindeki `navItems` listesinde yok. Kullanıcı bu sayfaya sadece doğrudan URL veya başka bir link ile gidebiliyor.
- **Öneri:** “Sınav Pratiği”ni sidebar’a ekleyin (örn. “Sınav Pratiği” adıyla `/exam-practice`) veya “Pratik Çöz” ile aynı özellikse yönlendirme/linkleri netleştirin.

### 3.7 Üyelik sayfası

- **Durum:** `src/app/uyelik/page.tsx` (ücretli planlar) var; sidebar’da link yok. Bilinçli bir “henüz yayında değil” tercihi olabilir.
- **Öneri:** Yayına alacaksanız sidebar’a “Üyelik” veya “Planlar” ekleyin; almayacaksanız sayfayı kaldırın veya “Yakında” şeklinde işaretleyin.

### 3.8 News-update route güvenliği

- **Durum:** `CRON_SECRET` varsa Bearer token ile korunuyor; yoksa herkes GET/POST ile güncellemeyi tetikleyebilir.
- **Öneri:** Production’da mutlaka `CRON_SECRET` tanımlı olsun; dokümantasyonda bunu zorunlu gösterin.

### 3.9 Vercel cron

- **Durum:** `vercel.json` içinde `"crons": []` boş; günlük/haftalık güncellemeler şu an manuel veya dış cron’a bağlı.
- **Öneri:** Vercel’de cron kullanacaksanız ilgili endpoint’i (örn. `/api/news-update`) `vercel.json` crons’a ekleyin ve `CRON_SECRET` ile koruyun.

### 3.10 Loading ve hata durumları (UI)

- **Durum:** Sohbet sayfasında loading ve hata mesajı var; diğer sayfalarda tutarlı bir “loading” / “error” pattern’i olmayabilir.
- **Öneri:** Tüm API çağıran sayfalarda (Madde Ara, Olay Analizi, Karar Analizi, Pratik Çöz, Quiz, vb.) ortak bir loading (skeleton/spinner) ve hata mesajı (retry/geri dön) kullanın.

---

## 4. Projeyi Ciddi Şekilde İleri Taşıyacak Öneriler

### 4.1 Teknik borç ve tutarlılık

- Ortak **OpenAI client** + **hata mesajları** + **input validasyonu** ile bakım kolaylaşır ve güvenlik artar.
- **global-error** ve (isteğe bağlı) sayfa bazlı **error.tsx** ile kullanıcı deneyimi iyileşir.
- **Rate limiting** ile hem maliyet hem sunucu sağlığı kontrol altına alınır.

### 4.2 Test ve kalite

- **Birim testleri** (özellikle `law-search`, `query-classifier`, RAG yardımcıları) regresyonları azaltır.
- **E2E** (Playwright) ile kritik akışların her deploy’da çalıştığından emin olursunuz.

### 4.3 Kullanıcı deneyimi

- **Sidebar’da tüm ana özelliklerin** (Sınav Pratiği dahil) bulunması keşfedilebilirliği artırır.
- **Ortak loading/error** bileşenleri tüm sayfalarda aynı hissi verir.
- **Erişilebilirlik** iyileştirmeleri hem ahlaki hem yasal açıdan değerli olur.

### 4.4 Operasyon ve güvenlik

- **.env.example** ve README ile kurulum süresi kısalır.
- **CRON_SECRET**’in production’da zorunlu olması ve **rate limiting** ile kötüye kullanım azalır.
- **Vercel cron** ile güncellemeler otomatik ve öngörülebilir hale gelir.

### 4.5 Kod organizasyonu

- **Backslash/slash** tutarlılığı ve mümkünse duplicate route/component isimlerinin temizlenmesi (örn. `src\app\...` vs `src/app/...`) ileride refactor’u kolaylaştırır.

---

## 5. Özet Tablo

| Konu | Öncelik | Zorluk | Etki |
|------|---------|--------|------|
| global-error.tsx | Yüksek | Düşük | Kullanıcı deneyimi |
| .env.example | Orta | Düşük | Kurulum |
| Law-search API key davranışı (dokümantasyon/tutarlılık) | Orta | Düşük | Bakım |
| Ortak OpenAI + ERROR_MESSAGES | Orta | Orta | Bakım / tutarlılık |
| Input/body boyut sınırı | Orta | Orta | Güvenlik / kaynak |
| Rate limiting | Yüksek | Orta | Maliyet / güvenlik |
| Sidebar’a Sınav Pratiği | Orta | Düşük | Keşfedilebilirlik |
| Birim testleri (law-search, RAG) | Orta | Orta | Kalite |
| Erişilebilirlik (a11y) | Orta | Orta | Erişilebilirlik |
| CRON_SECRET zorunluluğu (prod) | Yüksek | Düşük | Güvenlik |
| Vercel cron tanımı | Düşük | Düşük | Otomasyon |

---

Bu rapor, mevcut koda dayalı tespitlerdir. Öncelikleri takım ve iş hedeflerinize göre ayarlayabilirsiniz.
