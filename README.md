# 🤖 AI Asistanım

Web tabanlı, çok araçlı AI sohbet asistanı. Google Gemini'nin **Interactions API**'sini ve **auth key** (AQ... formatı) kullanır. GitHub Pages üzerinde ücretsiz barındırılır.

## Özellikler / Araçlar
- ✍️ **Sohbet** — Türkçe, detaylı cevaplar (hikaye, özet, çeviri, kompozisyon)
- 🖼️ **Resim üretme** — "bir kedi resmi çiz" → otomatik görsel üretir
- 🗣️ **Metni Sese Çevir (TTS)** — "bunu sesli oku" → Türkçe sesli okur
- 🎬 **Video/Slayt Anlatım** — "bunun videosunu yap" → sesli animasyonlu slayt gösterisi
- 💻 **Kod çalıştırma** — "2+2 kodu yaz ve çalıştır" → JavaScript çalıştırır
- 🔍 **Web arama** — "internette ara..." → arama sonucu getirir
- 🔑 Anahtar tarayıcınızda saklanır, herkese açık değildir

## Kurulum / Kullanım

### 1. Ücretsiz API Anahtarı Alın
1. [Google AI Studio API Keys](https://aistudio.google.com/apikey) sayfasına gidin
2. Google hesabınızla giriş yapın
3. "Create API key" butonuna tıklayın
4. `AQ...` ile başlayan anahtarı kopyalayın

### 2. Siteyi Kullanın
1. [Siteyi açın](https://ahmetks55.github.io/ai-asistanim/)
2. API anahtarınızı girin ve "Anahtarı Kaydet" deyin
3. Sohbet edin

## Teknolojiler
- HTML / CSS / JavaScript
- Google Gemini Interactions API (`gemini-3.5-flash`) — function calling ile araç kullanımı
- Web Speech API (Türkçe seslendirme — ücretsiz)
- HTML5 Canvas (video/slayt animasyonu — ücretsiz)
- Pollinations görsel API (resim üretimi — ücretsiz)
- DuckDuckGo Instant Answer (web arama — ücretsiz)
- GitHub Pages (ücretsiz hosting)

## Araç Çağırma (Function Calling)
Asistan, kullanıcının isteğine göre ilgili aracı otomatik seçer:
- `generate_image` → görsel üretimi
- `text_to_speech` → Türkçe seslendirme
- `make_video` → slayt video
- `run_code` → kod çalıştırma
- `web_search` → web arama

## Lisans
MIT
