"""
AI Asistanım - Sohbet Asistanı
Sürekli konuşan, dinleyen ve yanıt veren asistan
"""

import os
import sys
import json
import time
import wave
import struct
import threading
import queue

# ============================================
# KURULUM
# ============================================

def install(pkg, name=None):
    try:
        __import__(pkg)
    except ImportError:
        print(f"⏳ {name or pkg} yükleniyor...")
        os.system(f'pip install {pkg}')

install('pyaudio', 'PyAudio')
install('pyttsx3', 'pyttsx3')
install('vosk', 'vosk')
install('requests', 'requests')

import pyaudio
import pyttsx3
import requests
from vosk import Model, KaldiRecognizer

# ============================================
# AYARLAR
# ============================================

OLLAMA_URL = "http://localhost:11434"
MODEL = "qwen2.5:0.5b"  # 4GB RAM için küçük model
SAMPLE_RATE = 16000
WAKE_WORDS = ["hey jarvis", "hey asistan", "jarvis", "asistan", "selam"]

# ============================================
# SES SİSTEMİ
# ============================================

class Voice:
    """Sesli okuma (TTS)"""
    
    def __init__(self):
        self.engine = pyttsx3.init()
        self.engine.setProperty('rate', 160)
        self.engine.setProperty('volume', 1.0)
        
        # Türkçe ses ara
        voices = self.engine.getProperty('voices')
        for v in voices:
            if 'turkish' in v.name.lower() or 'tr' in v.id.lower():
                self.engine.setProperty('voice', v.id)
                print(f"🎤 Türkçe ses: {v.name}")
                break
    
    def speak(self, text):
        """Metni seslendir"""
        clean = self.clean(text)
        print(f"\n🤖 Asistan: {clean}")
        self.engine.say(clean)
        self.engine.runAndWait()
    
    def clean(self, text):
        """Temizle"""
        import re
        emojis = {
            '😊': 'gülümseyerek', '😃': 'gülümseyerek', '😄': 'gülümseyerek',
            '👍': 'harika', '👏': 'harika', '🎉': 'harika',
            '❤️': 'sevgiyle', '💕': 'sevgiyle',
            '😂': 'gülerek', '🤣': 'gülerek',
            '🤔': 'düşünerek', '💭': 'düşünerek',
            '😢': 'üzgün', '😭': 'üzgün',
            '🙏': 'rica ederek', '💪': 'güçlü',
            '🚀': 'hızla', '🧠': 'akıllıca',
        }
        for e, w in emojis.items():
            text = text.replace(e, w)
        text = re.sub(r'[*#`_~>|]', '', text)
        text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', text)
        text = re.sub(r'\s+', ' ', text).strip()
        return text

# ============================================
# DİNLEME SİSTEMİ
# ============================================

class Listener:
    """Mikrofondan dinleme (Vosk ile)"""
    
    def __init__(self):
        self.model = None
        self.recognizer = None
        self._load_model()
    
    def _load_model(self):
        """Vosk modelini yükle"""
        paths = ['vosk-model-tr-0.3', 'vosk-model-small-tr-0.4', 'vosk-model-small-en-us-0.15']
        
        for path in paths:
            if os.path.exists(path):
                try:
                    self.model = Model(path)
                    self.recognizer = KaldiRecognizer(self.model, SAMPLE_RATE)
                    print(f"✅ Vosk modeli: {path}")
                    return
                except:
                    continue
        
        # Otomatik indir
        print("⏳ Vosk modeli indiriliyor...")
        os.system('pip install vosk')
        print("⚠️ Küçük İngilizce model kullanılıyor")
        print("   Türkçe model: https://alphacephei.com/vosk/models")
    
    def listen(self, timeout=8):
        """Mikrofondan dinle"""
        if not self.recognizer:
            print("❌ Vosk yüklenmedi")
            return ""
        
        print("🎤 Dinleniyor... (konuşun)")
        
        pa = pyaudio.PyAudio()
        stream = pa.open(
            format=pyaudio.paInt16,
            channels=1,
            rate=SAMPLE_RATE,
            input=True,
            frames_per_buffer=4096
        )
        
        frames = []
        start = time.time()
        
        while time.time() - start < timeout:
            try:
                data = stream.read(4096, exception_on_overflow=False)
                frames.append(data)
                
                if self.recognizer.AcceptWaveform(data):
                    result = json.loads(self.recognizer.Result())
                    text = result.get('text', '').strip()
                    if text:
                        stream.stop_stream()
                        stream.close()
                        pa.terminate()
                        return text
            except:
                continue
        
        final = json.loads(self.recognizer.FinalResult())
        stream.stop_stream()
        stream.close()
        pa.terminate()
        
        return final.get('text', '')

# ============================================
# ZEKA SİSTEMİ (LLM)
# ============================================

class Brain:
    """Ollama LLM ile düşünme"""
    
    def __init__(self):
        self.history = []
        self.system_prompt = """Sen "AI Asistanım" adında yardımcı bir asistansın.
- Kısa ve net yanıt ver (1-2 cümle)
- Türkçe konuş
- Nazik ve yardımcı ol
- Gereksiz tekrar yapma
- Doğal konuş, robot gibi olma"""
    
    def think(self, text):
        """Düşün ve yanıt üret"""
        self.history.append({"role": "user", "content": text})
        
        messages = [{"role": "system", "content": self.system_prompt}]
        messages.extend(self.history[-8:])  # Son 8 mesajı kullan
        
        try:
            response = requests.post(
                f"{OLLAMA_URL}/api/chat",
                json={
                    "model": MODEL,
                    "messages": messages,
                    "stream": False
                },
                timeout=30
            )
            
            data = response.json()
            
            if 'message' in data:
                reply = data['message']['content']
                self.history.append({"role": "assistant", "content": reply})
                return reply
            else:
                return "Düşünemiyorum, tekrar söyler misin?"
                
        except requests.exceptions.ConnectionError:
            return "Ollama çalışmıyor. Lütfen 'ollama serve' çalıştırın."
        except Exception as e:
            return f"Bir hata oluştu: {str(e)}"
    
    def reset(self):
        """Geçmişi temizle"""
        self.history = []

# ============================================
# ANA ASİSTAN
# ============================================

class Assistant:
    """Sürekli sohbet eden asistan"""
    
    def __init__(self):
        print("\n" + "="*50)
        print("🤖 AI ASİSTANIM - SOHBET ASİSTANI")
        print("="*50)
        
        self.voice = Voice()
        self.listener = Listener()
        self.brain = Brain()
        
        self.running = False
        
        print("="*50)
        print("✅ Hazır!")
        print(f"🎯 Wake word: 'Hey Jarvis' veya 'Hey Asistan'")
        print(f"🤖 Model: {MODEL}")
        print(f"🌐 Ollama: {OLLAMA_URL}")
        print("="*50)
    
    def start(self):
        """Asistanı başlat"""
        self.running = True
        
        self.voice.speak("Merhaba! Ben AI asistanınızım. Bana 'Hey Jarvis' diyerek seslenebilirsiniz.")
        
        while self.running:
            try:
                # Wake word bekle
                print("\n⏳ 'Hey Jarvis' bekleniyor...")
                self._wait_for_wake_word()
                
                # Onay sesi
                self.voice.speak("Dinliyorum.")
                
                # Kullanıcıyı dinle
                text = self.listener.listen(timeout=8)
                
                if not text:
                    self.voice.speak("Anlayamadım, tekrar söyler misin?")
                    continue
                
                print(f"📝 Söylenen: {text}")
                
                # Komut kontrolü
                if self._check_commands(text):
                    continue
                
                # LLM'e gönder
                print("🧠 Düşünüyorum...")
                response = self.brain.think(text)
                
                # Yanıtı seslendir
                self.voice.speak(response)
                
            except KeyboardInterrupt:
                self.stop()
                break
            except Exception as e:
                print(f"❌ Hata: {e}")
                time.sleep(1)
    
    def _wait_for_wake_word(self):
        """Wake word bekle"""
        while self.running:
            text = self.listener.listen(timeout=5)
            text_lower = text.lower()
            
            for word in WAKE_WORDS:
                if word in text_lower:
                    print(f"🎯 Wake word: {text}")
                    return
    
    def _check_commands(self, text):
        """Özel komutları kontrol et"""
        text_lower = text.lower()
        
        # Temizle
        if any(w in text_lower for w in ['temizle', 'sıfırla', 'unut']):
            self.brain.reset()
            self.voice.speak("Sohbet geçmişini temizledim.")
            return True
        
        # Kapat
        if any(w in text_lower for w in ['kapat', 'güle güle', 'hoşça kal']):
            self.voice.speak("Güle güle! İyi günler.")
            self.stop()
            return True
        
        # Saat
        if any(w in text_lower for w in ['saat', 'zaman', 'kaç']):
            from datetime import datetime
            now = datetime.now().strftime("%H:%M")
            self.voice.speak(f"Şu saat {now}")
            return True
        
        # Tarih
        if any(w in text_lower for w in ['tarih', 'bugün', 'gün']):
            from datetime import datetime
            today = datetime.now().strftime("%d %B %Y")
            self.voice.speak(f"Bugün {today}")
            return True
        
        return False
    
    def stop(self):
        """Asistanı durdur"""
        self.running = False
        print("\n👋 Asistan kapatıldı")

# ============================================
# BAŞLAT
# ============================================

if __name__ == "__main__":
    print("\n🚀 Asistan başlatılıyor...")
    print("   Durdurmak için: Ctrl+C")
    print("   veya 'güle güle' diyebilirsiniz\n")
    
    assistant = Assistant()
    assistant.start()
