"""
AI Asistanim - Sohbet Asistani
Surekli konusan, dinleyen ve yanit veren asistan
"""

import os
import sys
import json
import time

# Windows icin UTF-8
if sys.platform == 'win32':
    os.system('chcp 65001 >nul 2>&1')
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

import pyaudio
import pyttsx3
import requests

# ============================================
# AYARLAR
# ============================================

OLLAMA_URL = "http://localhost:11434"
MODEL = "qwen2.5:0.5b"
SAMPLE_RATE = 16000

# ============================================
# SES SISTEMI (TTS)
# ============================================

class Voice:
    def __init__(self):
        self.engine = pyttsx3.init()
        self.engine.setProperty('rate', 160)
        self.engine.setProperty('volume', 1.0)
        print("[OK] Ses motoru hazir")
    
    def speak(self, text):
        clean = self.clean(text)
        print(f"\n[ASISTAN] {clean}")
        self.engine.say(clean)
        self.engine.runAndWait()
    
    def clean(self, text):
        import re
        text = re.sub(r'[^\w\s.,!?]', '', text)
        text = re.sub(r'\s+', ' ', text).strip()
        return text

# ============================================
# DINLEME SISTEMI (STT)
# ============================================

class Listener:
    def __init__(self):
        self.recognizer = None
        self._load_model()
    
    def _load_model(self):
        try:
            from vosk import Model, KaldiRecognizer
        except ImportError:
            print("[HATA] vosk yuklu degil. pip install vosk")
            return
        
        # Model yolu ara
        paths = ['vosk-model-small-tr-0.3', 'vosk-model-tr-0.3', 'vosk-model-small-en-us-0.15']
        
        for path in paths:
            if os.path.exists(path):
                try:
                    model = Model(path)
                    self.recognizer = KaldiRecognizer(model, SAMPLE_RATE)
                    print(f"[OK] Vosk modeli: {path}")
                    return
                except Exception as e:
                    print(f"[UYARI] {path} yuklenemedi: {e}")
                    continue
        
        print("[HATA] Vosk modeli bulunamadi!")
        print("  Turkce model icin: https://alphacephei.com/vosk/models")
        print("  Kucuk model: vosk-model-small-tr-0.3.zip")
    
    def listen(self, timeout=8):
        if not self.recognizer:
            print("[HATA] Vosk yuklenmedi")
            return ""
        
        print("[MIK] Dinleniyor... (konusun)")
        
        pa = pyaudio.PyAudio()
        stream = pa.open(
            format=pyaudio.paInt16,
            channels=1,
            rate=SAMPLE_RATE,
            input=True,
            frames_per_buffer=4096
        )
        
        import json as json_mod
        frames = []
        start = time.time()
        
        while time.time() - start < timeout:
            try:
                data = stream.read(4096, exception_on_overflow=False)
                frames.append(data)
                
                if self.recognizer.AcceptWaveform(data):
                    result = json_mod.loads(self.recognizer.Result())
                    text = result.get('text', '').strip()
                    if text:
                        stream.stop_stream()
                        stream.close()
                        pa.terminate()
                        return text
            except Exception as e:
                print(f"[HATA] Mikrofon: {e}")
                break
        
        try:
            final = json_mod.loads(self.recognizer.FinalResult())
            stream.stop_stream()
            stream.close()
            pa.terminate()
            return final.get('text', '')
        except:
            return ""

# ============================================
# ZEKA SISTEMI (LLM)
# ============================================

class Brain:
    def __init__(self):
        self.history = []
        self.system_prompt = """Sen "AI Asistan" yardimci bir asistansin.
- Kisa ve net yanit ver (1-2 cumle)
- Turkce konus
- Nazik ve yardimci ol
- Gereksiz tekrar yapma"""
    
    def think(self, text):
        self.history.append({"role": "user", "content": text})
        
        messages = [{"role": "system", "content": self.system_prompt}]
        messages.extend(self.history[-8:])
        
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
                return "Dusunemiyorum, tekrar soyler misin?"
                
        except requests.exceptions.ConnectionError:
            return "Ollama calismiyor. Lutfen 'ollama serve' calistirin."
        except Exception as e:
            return f"Bir hata olustu: {str(e)}"
    
    def reset(self):
        self.history = []

# ============================================
# ANA ASISTAN
# ============================================

class Assistant:
    def __init__(self):
        print("\n" + "="*50)
        print("   AI ASISTAN - SOHBET ASISTANI")
        print("="*50)
        
        self.voice = Voice()
        self.listener = Listener()
        self.brain = Brain()
        
        self.running = False
        self.wake_words = ["hey jarvis", "hey asistan", "jarvis", "asistan", "selam"]
    
    def start(self):
        self.running = True
        
        print("[BASLAT] Asistan baslatiliyor...")
        self.voice.speak("Merhaba! Ben AI asistaninizim.")
        
        while self.running:
            try:
                # Vosk yuklu mu kontrol et
                if not self.listener.recognizer:
                    print("\n[HATA] Vosk modeli yuklenemedi!")
                    print("  Lutfen vosk-model-small-tr-0.3 dosyasini indirin:")
                    print("  https://huggingface.co/rhasspy/vosk-models/resolve/main/tr/vosk-model-small-tr-0.3.zip")
                    print("\n  veya konsoldan konusarak devam edin:")
                    text = input("\n[SIZ] Mesajiniz: ").strip()
                    if text:
                        self._process(text)
                    continue
                
                # Wake word bekle
                print("[DINLE] 'Hey Jarvis' bekleniyor...")
                text = self.listener.listen(timeout=10)
                print(f"[SONUC] '{text}'")
                
                if not text:
                    continue
                
                text_lower = text.lower()
                
                # Wake word kontrolu
                wake_found = False
                for word in self.wake_words:
                    if word in text_lower:
                        wake_found = True
                        break
                
                if wake_found:
                    print(f"[BULDU] {text}")
                    self.voice.speak("Dinliyorum.")
                    
                    # Kullaniciyi dinle
                    user_text = self.listener.listen(timeout=8)
                    
                    if not user_text:
                        self.voice.speak("Anlayamadim, tekrar soyler misin?")
                        continue
                    
                    print(f"[SIZ] {user_text}")
                    self._process(user_text)
                else:
                    # Wake word yoksa, konsoldan devam et
                    print(f"[DINLE] {text}")
                    
            except KeyboardInterrupt:
                self.stop()
                break
            except Exception as e:
                print(f"[HATA] {e}")
                time.sleep(1)
    
    def _process(self, text):
        """Mesaji isle"""
        text_lower = text.lower()
        
        # Komut kontrolu
        if any(w in text_lower for w in ['temizle', 'sifirla', 'unut']):
            self.brain.reset()
            self.voice.speak("Sohbet gecmisini temizledim.")
            return
        
        if any(w in text_lower for w in ['kapat', 'gule gule', 'hoscakal']):
            self.voice.speak("Gule gule! Iyi gunler.")
            self.stop()
            return
        
        if any(w in text_lower for w in ['saat', 'zaman', 'kac']):
            from datetime import datetime
            now = datetime.now().strftime("%H:%M")
            self.voice.speak(f"Saat {now}")
            return
        
        if any(w in text_lower for w in ['tarih', 'bugun', 'gun']):
            from datetime import datetime
            today = datetime.now().strftime("%d %B %Y")
            self.voice.speak(f"Bugun {today}")
            return
        
        # LLM'e gonder
        print("[DUSUN] Dusunuyorum...")
        response = self.brain.think(text)
        self.voice.speak(response)
    
    def stop(self):
        self.running = False
        print("\n[GULE] Asistan kapatildi")

# ============================================
# BASLAT
# ============================================

if __name__ == "__main__":
    print("\n[baslat] Asistan baslatiliyor...")
    print("   Durdurmak icin: Ctrl+C")
    print("   veya 'gule gule' diyebilirsiniz\n")
    
    assistant = Assistant()
    assistant.start()
