"""
AI Asistanım - Ses Sistemi
Wake Word + STT + TTS
"""

import os
import sys
import json
import time
import wave
import struct
import threading
import queue
from datetime import datetime

# ============================================
# KURULUM KONTROL
# ============================================

def install_packages():
    """Gerekli paketleri yükler"""
    packages = [
        'pyaudio',          # Mikrofon erişimi
        'pvporcupine',      # Wake word (Picovoice)
        'vosk',             # STT (çevrimdışı)
        'pyttsx3',          # TTS (çevrimdışı)
        'sounddevice',      # Ses kayıt
        'numpy',            # Sayısal işlemler
        'requests',         # API istekleri
    ]
    
    for pkg in packages:
        try:
            __import__(pkg)
        except ImportError:
            print(f"⏳ {pkg} yükleniyor...")
            os.system(f'pip install {pkg}')
            print(f"✅ {pkg} yüklendi")

install_packages()

import pyaudio
import numpy as np
import pyttsx3
from vosk import Model, KaldiRecognizer
import sounddevice as sd

# ============================================
# AYARLAR
# ============================================

CONFIG = {
    'wake_word': 'jarvis',           # Wake word
    'wake_word_tr': 'hey asistan',   # Türkçe wake word
    'language': 'tr-TR',             # Dil
    'sample_rate': 16000,            # Örnekleme hızı
    'vosk_model_path': 'vosk-model-tr-0.3',  # Vosk model yolu
    'bridge_url': 'http://localhost:8788',    # Köprü URL'i
    'tts_rate': 150,                 # Konuşma hızı
    'tts_volume': 0.9,               # Ses seviyesi
    'api_key': '',                   # API key (opsiyonel)
    'model': 'nara:agnes-2.5-flash', # AI modeli
    'use_local_llm': True,           # Yerel LLM kullan (Ollama)
    'ollama_url': 'http://localhost:11434',  # Ollama URL
    'local_model': 'qwen2.5:0.5b',  # Küçük model (4GB RAM için uygun)
}

# ============================================
# SES MOTORU (TTS)
# ============================================

class TTSEngine:
    """Text-to-Speech motoru"""
    
    def __init__(self):
        self.engine = pyttsx3.init()
        self.setup_voice()
    
    def setup_voice(self):
        """Türkçe sesi ayarla"""
        voices = self.engine.getProperty('voices')
        
        # Türkçe ses ara
        turkish_voice = None
        for voice in voices:
            if 'turkish' in voice.name.lower() or 'tr' in voice.id.lower():
                turkish_voice = voice
                break
        
        if turkish_voice:
            self.engine.setProperty('voice', turkish_voice.id)
            print(f"🎤 Türkçe ses bulundu: {turkish_voice.name}")
        else:
            print("⚠️ Türkçe ses bulunamadı, varsayılan ses kullanılıyor")
        
        self.engine.setProperty('rate', CONFIG['tts_rate'])
        self.engine.setProperty('volume', CONFIG['tts_volume'])
    
    def speak(self, text):
        """Metni seslendir"""
        # Emojileri temizle
        clean_text = self.clean_emojis(text)
        print(f"🔊 Konuşuyor: {clean_text[:50]}...")
        self.engine.say(clean_text)
        self.engine.runAndWait()
    
    def clean_emojis(self, text):
        """Emojileri doğal kelimelere çevir"""
        emoji_map = {
            '😊': 'gülümseyerek', '😃': 'gülümseyerek', '😄': 'gülümseyerek',
            '😁': 'gülümseyerek', '😆': 'gülümseyerek',
            '😍': 'sevgiyle', '🥰': 'sevgiyle', '😘': 'sevgiyle',
            '💕': 'sevgiyle', '❤️': 'sevgiyle', '💖': 'sevgiyle',
            '👍': 'harika', '👏': 'harika', '🎉': 'harika',
            '✅': 'harika', '💯': 'harika', '🔥': 'harika',
            '😂': 'gülerek', '🤣': 'gülerek', '🤭': 'gülerek',
            '🤔': 'düşünerek', '💭': 'düşünerek',
            '😢': 'üzgün bir şekilde', '😭': 'üzgün bir şekilde',
            '😠': 'kızgın bir şekilde', '😡': 'kızgın bir şekilde',
            '😱': 'şaşkınlıkla', '😮': 'şaşkınlıkla',
            '🙏': 'rica ederek', '💪': 'güçlü bir şekilde',
            '🚀': 'hızla', '🧠': 'akıllıca',
        }
        
        for emoji, word in emoji_map.items():
            text = text.replace(emoji, word)
        
        # Markdown temizle
        import re
        text = re.sub(r'[*#`_~>|]', '', text)
        text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', text)
        text = re.sub(r'\s+', ' ', text).strip()
        
        return text
    
    def stop(self):
        """Sesli okumayı durdur"""
        self.engine.stop()

# ============================================
# SES KAYIT (STT)
# ============================================

class STTEngine:
    """Speech-to-Text motoru (Vosk)"""
    
    def __init__(self):
        self.model = None
        self.recognizer = None
        self.setup_model()
    
    def setup_model(self):
        """Vosk modelini yükle"""
        model_path = CONFIG['vosk_model_path']
        
        if not os.path.exists(model_path):
            print(f"⏳ Vosk modeli indiriliyor: {model_path}")
            print("   İlk seferde ~150MB indirebilir.")
            # Otomatik indirme için:
            # wget https://alphacephei.com/vosk/models/vosk-model-tr-0.3.zip
            
            # Küçük İngilizce modeli kullan (daha hızlı)
            model_path = 'vosk-model-small-en-us-0.15'
            if not os.path.exists(model_path):
                print("⚠️ Vosk modeli bulunamadı. İngilizce küçük model kullanılıyor.")
                print("   Türkçe model için: https://alphacephei.com/vosk/models")
        
        try:
            self.model = Model(model_path)
            self.recognizer = KaldiRecognizer(self.model, CONFIG['sample_rate'])
            print(f"✅ Vosk modeli yüklendi: {model_path}")
        except Exception as e:
            print(f"❌ Vosk model yükleme hatası: {e}")
    
    def listen(self, timeout=5):
        """Mikrofondan dinle ve metin döndür"""
        if not self.recognizer:
            print("❌ Vosk tanıyıcı yüklenmedi")
            return ""
        
        print("🎤 Dinleniyor... (Konuşun)")
        
        audio = pyaudio.PyAudio()
        stream = audio.open(
            format=pyaudio.paInt16,
            channels=1,
            rate=CONFIG['sample_rate'],
            input=True,
            frames_per_buffer=4096
        )
        
        frames = []
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            data = stream.read(4096, exception_on_overflow=False)
            frames.append(data)
            
            if self.recognizer.AcceptWaveform(data):
                result = json.loads(self.recognizer.Result())
                if result.get('text', '').strip():
                    stream.stop_stream()
                    stream.close()
                    audio.terminate()
                    return result['text']
        
        # Son kısmı al
        final = json.loads(self.recognizer.FinalResult())
        stream.stop_stream()
        stream.close()
        audio.terminate()
        
        return final.get('text', '')

# ============================================
# WAKE WORD
# ============================================

class WakeWordEngine:
    """Wake word algılama motoru"""
    
    def __init__(self):
        self.porcupine = None
        self.audio = None
        self.setup()
    
    def setup(self):
        """Porcupine wake word motorunu kur"""
        try:
            import pvporcupine
            self.porcupine = pvporcupine.create(
                access_key=CONFIG.get('api_key', ''),
                keywords=['jarvis']  # Veya ['picovoice']
            )
            print("✅ Porcupine wake word yüklendi (Jarvis)")
        except ImportError:
            print("⚠️ pvporcupine yüklü değil. Basit wake word kullanılıyor.")
            print("   Kurulum: pip install pvporcupine")
        except Exception as e:
            print(f"⚠️ Porcupine hatası: {e}")
            print("   Basit wake word kullanılıyor.")
    
    def listen_for_wake_word(self, callback=None):
        """Wake word dinle"""
        if self.porcupine:
            self._listen_porcupine(callback)
        else:
            self._listen_simple(callback)
    
    def _listen_porcupine(self, callback):
        """Porcupine ile wake word dinle"""
        import pyaudio
        
        pa = pyaudio.PyAudio()
        stream = pa.open(
            rate=self.porcupine.sample_rate,
            channels=1,
            format=pyaudio.paInt16,
            input=True,
            frames_per_buffer=self.porcupine.frame_length
        )
        
        print(f"👂 '{CONFIG['wake_word']}' bekleniyor...")
        
        try:
            while True:
                pcm = stream.read(self.porcupine.frame_length, exception_on_overflow=False)
                pcm = struct.unpack_from("h" * self.porcupine.frame_length, pcm)
                
                keyword_index = self.porcupine.process(pcm)
                if keyword_index >= 0:
                    print(f"🎯 Wake word algılandı: {CONFIG['wake_word']}")
                    if callback:
                        callback()
                    break
        finally:
            stream.stop_stream()
            stream.close()
            pa.terminate()
    
    def _listen_simple(self, callback):
        """Basit kelime algılama (Vosk ile)"""
        stt = STTEngine()
        
        print(f"👂 '{CONFIG['wake_word']}' veya '{CONFIG['wake_word_tr']}' bekleniyor...")
        
        while True:
            text = stt.listen(timeout=3)
            text_lower = text.lower()
            
            wake_words = [
                CONFIG['wake_word'],
                CONFIG['wake_word_tr'],
                'hey jarvis',
                'hey asistan',
                'asistan',
            ]
            
            for word in wake_words:
                if word in text_lower:
                    print(f"🎯 Wake word algılandı: {text}")
                    if callback:
                        callback()
                    return
    
    def stop(self):
        """Wake word motorunu durdur"""
        if self.porcupine:
            self.porcupine.delete()

# ============================================
# AI KÖPRÜSÜ + LLM
# ============================================

class AIBridge:
    """AI köprü bağlantısı + Yerel LLM"""
    
    def __init__(self):
        self.url = CONFIG['bridge_url']
        self.model = CONFIG['model']
        self.history = []
        self.use_local_llm = CONFIG.get('use_local_llm', False)
        self.ollama_url = CONFIG.get('ollama_url', 'http://localhost:11434')
    
    def send(self, text):
        """Mesajı AI'a gönder (önce yerel LLM, sonra köprü)"""
        
        # Yerel LLM dene (Ollama)
        if self.use_local_llm:
            response = self._send_to_ollama(text)
            if response:
                return response
        
        # Köprü ile bağlan
        return self._send_to_bridge(text)
    
    def _send_to_ollama(self, text):
        """Ollama yerel LLM'e gönder"""
        import requests
        
        self.history.append({"role": "user", "content": text})
        
        try:
            response = requests.post(
                f"{self.ollama_url}/api/chat",
                json={
                    "model": CONFIG.get('local_model', 'qwen2.5:3b'),
                    "messages": self.history[-10:],
                    "stream": False
                },
                timeout=30
            )
            
            data = response.json()
            if 'message' in data:
                reply = data['message']['content']
                self.history.append({"role": "assistant", "content": reply})
                return reply
                
        except requests.exceptions.ConnectionError:
            print("⚠️ Ollama çalıştırılmamış. 'ollama serve' ile başlatın.")
        except Exception as e:
            print(f"⚠️ Ollama hatası: {e}")
        
        return None
    
    def _send_to_bridge(self, text):
        """Köprü üzerinden AI'a gönder"""
        import requests
        
        self.history.append({"role": "user", "content": text})
        
        messages = []
        if self.history:
            context = "\n".join([f"{m['role']}: {m['content']}" for m in self.history[-10:]])
            messages.append({"role": "system", "content": context})
        messages.append({"role": "user", "content": text})
        
        try:
            provider, model = self.model.split(':')
            
            response = requests.post(
                f"{self.url}/chat",
                json={
                    "provider": provider,
                    "model": model,
                    "messages": messages
                },
                timeout=30
            )
            
            data = response.json()
            
            if 'reply' in data:
                self.history.append({"role": "assistant", "content": data['reply']})
                return data['reply']
            else:
                return f"Hata: {data.get('error', 'Yanıt alınamadı')}"
                
        except requests.exceptions.ConnectionError:
            return "Köprüye bağlanılamadı. Köprüyü başlatın: node server.js"
        except Exception as e:
            return f"Hata: {str(e)}"
    
    def clear_history(self):
        """Sohbet geçmişini temizle"""
        self.history = []

# ============================================
# ANA ASİSTAN
# ============================================

class VoiceAssistant:
    """Ana ses asistanı"""
    
    def __init__(self):
        print("🤖 AI Asistanım - Ses Sistemi")
        print("=" * 40)
        
        self.tts = TTSEngine()
        self.stt = STTEngine()
        self.wake = WakeWordEngine()
        self.bridge = AIBridge()
        
        self.is_running = False
        
        print("=" * 40)
        print("✅ Tüm motorlar hazır!")
        print(f"🎯 Wake word: '{CONFIG['wake_word']}' veya '{CONFIG['wake_word_tr']}'")
        print(f"🤖 Model: {CONFIG['model']}")
        print(f"🌐 Köprü: {CONFIG['bridge_url']}")
        print("=" * 40)
    
    def start(self):
        """Asistanı başlat"""
        self.is_running = True
        
        print("\n🚀 Asistan başlatılıyor...")
        self.tts.speak("Merhaba! Ben AI asistanınızım. Bana seslenebilirsiniz.")
        
        while self.is_running:
            try:
                # Wake word dinle
                print("\n⏳ Wake word bekleniyor...")
                self.wake.listen_for_wake_word(callback=self.on_wake_word)
                
            except KeyboardInterrupt:
                print("\n\n👋 Asistan kapatılıyor...")
                self.stop()
                break
            except Exception as e:
                print(f"❌ Hata: {e}")
                time.sleep(1)
    
    def on_wake_word(self):
        """Wake word algılandığında"""
        self.tts.speak("Dinliyorum.")
        
        # Kullanıcının konuşmasını dinle
        text = self.stt.listen(timeout=7)
        
        if text:
            print(f"📝 Söylenen: {text}")
            
            # AI'a gönder
            print("🧠 Düşünüyorum...")
            response = self.bridge.send(text)
            
            print(f"💬 Yanıt: {response[:100]}...")
            
            # Yanıtı seslendir
            self.tts.speak(response)
        else:
            self.tts.speak("Anlayamadım, tekrar söyler misin?")
    
    def stop(self):
        """Asistanı durdur"""
        self.is_running = False
        self.wake.stop()
        self.tts.stop()
        print("✅ Asistan kapatıldı")

# ============================================
# KOMUT SATIRI ARAYÜZÜ
# ============================================

def print_help():
    """Yardım mesajı"""
    print("""
🤖 AI Asistanım - Ses Sistemi
================================

Kullanım:
  python voice_assistant.py [komut]

Komutlar:
  start       Asistanı başlat (varsayılan)
  test-tts    TTS test et
  test-stt    STT test et
  test-bridge Köprü bağlantısını test et
  settings    Ayarları göster
  help        Bu mesajı göster

Örnekler:
  python voice_assistant.py
  python voice_assistant.py start
  python voice_assistant.py test-tts
""")

def test_tts():
    """TTS test et"""
    print("🔊 TTS test ediliyor...")
    tts = TTSEngine()
    tts.speak("Merhaba! Ben AI asistanınızım. Ses sistemi başarıyla çalışıyor.")
    print("✅ TTS testi tamamlandı")

def test_stt():
    """STT test et"""
    print("🎤 STT test ediliyor...")
    print("   5 saniye içinde konuşun...")
    stt = STTEngine()
    text = stt.listen(timeout=5)
    if text:
        print(f"✅ Algılanan: {text}")
    else:
        print("⚠️ Ses algılanamadı")

def test_bridge():
    """Köprü bağlantısını test et"""
    print("🌐 Köprü test ediliyor...")
    bridge = AIBridge()
    response = bridge.send("Merhaba, nasılsın?")
    print(f"💬 Yanıt: {response}")

def show_settings():
    """Ayarları göster"""
    print("\n⚙️ Mevcut Ayarlar:")
    print("=" * 40)
    for key, value in CONFIG.items():
        print(f"  {key}: {value}")
    print("=" * 40)

# ============================================
# ANA PROGRAM
# ============================================

if __name__ == "__main__":
    if len(sys.argv) > 1:
        command = sys.argv[1].lower()
        
        if command == 'start':
            assistant = VoiceAssistant()
            assistant.start()
        elif command == 'test-tts':
            test_tts()
        elif command == 'test-stt':
            test_stt()
        elif command == 'test-bridge':
            test_bridge()
        elif command == 'settings':
            show_settings()
        elif command == 'help':
            print_help()
        else:
            print(f"❌ Bilinmeyen komut: {command}")
            print_help()
    else:
        # Varsayılan olarak asistanı başlat
        assistant = VoiceAssistant()
        assistant.start()
