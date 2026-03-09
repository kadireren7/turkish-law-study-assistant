# Windows'ta güncelleme (manuel veya zamanlanmış)

Tam güncelleme pipeline'ı (mevzuat RSS, güncel gelişmeler, hukuk haberleri) Windows'ta **manuel** çalıştırabilir veya **Görev Zamanlayıcı** ile günlük otomatik yapabilirsiniz. GitHub Actions yalnızca manuel tetiklenir; yerel Windows ayarı bundan bağımsızdır.

## 1. Tek seferde test

Proje klasöründe (örn. `C:\Users\...\hukuk projesi`) komut satırında:

```bat
npm run daily:update
```

Bu komut sırayla: mevzuat RSS → legal update → hukuk haberlerini günceller. Hata almıyorsanız devam edin.

## 2. Görev Zamanlayıcı'da görev oluşturma

1. **Görev Zamanlayıcı** açın: Windows arama çubuğuna "Görev Zamanlayıcı" yazın veya `taskschd.msc` çalıştırın.
2. Sağ taraftan **"Temel Görev Oluştur"** (veya "Görev Oluştur") seçin.
3. **Ad:** Örn. "Hukuk Projesi Günlük Güncelleme".
4. **Tetikleyici:** Günlük → İleri → Başlangıç saati (örn. 06:00) → İleri.
5. **Eylem:** "Program başlat" → İleri.
6. **Program betiği:** Proje klasörünüzdeki `scripts\run-daily-update.bat` dosyasının **tam yolu**  
   Örnek: `C:\Users\kadir\Desktop\hukuk projesi\scripts\run-daily-update.bat`
7. **Başlangıç konumu (isteğe bağlı):** Proje kök klasörü  
   Örnek: `C:\Users\kadir\Desktop\hukuk projesi`  
   (Bu sayede `npm` proje içindeki `package.json`'ı bulur.)
8. Bitir → Oluştur.

## 3. Node/npm yol sorunu

Zamanlanmış görev çalıştığında "npm bulunamadı" hatası alırsanız:

- **Başlangıç konumu** alanının proje kökü olduğundan emin olun.
- Node’u "Program Files" altına kurduysanız, **Program betiği** yerine **Program:** `cmd.exe`, **Bağımsız değişkenler:** `/c "cd /d C:\Users\kadir\Desktop\hukuk projesi && npm run daily:update"` şeklinde de deneyebilirsiniz (yolu kendi proje yolunuzla değiştirin).

Görev her gün belirlediğiniz saatte çalışır; haberler, mevzuat özetleri ve güncel gelişmeler el ile komut çalıştırmadan güncellenir.
