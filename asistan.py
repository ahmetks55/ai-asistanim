"""
AI Asistan - Basit Versiyon
"""

import os, sys, time, json, re

if sys.platform == 'win32':
    os.system('chcp 65001 >nul 2>&1')
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

print("[1] Kutuphaneler yukleniyor...")
import pyaudio
import pyttsx3
import requests
from vosk import Model, KaldiRecognizer
print("[2] Kutuphaneler hazir")

# TTS
print("[3] Ses motoru baslatiliyor...")
tts = pyttsx3.init()
tts.setProperty('rate', 160)
print("[4] Ses motoru hazir")

# STT
print("[5] Vosk modeli yukleniyor...")
model = Model('vosk-model-small-tr-0.3')
rec = KaldiRecognizer(model, 16000)
print("[6] Vosk hazir")

# LLM
OLLAMA_URL = "http://localhost:11434"
LLM_MODEL = "qwen2.5:0.5b"
history = []

def speak(text):
    clean = re.sub(r'[^\w\s.,!?]', '', text)
    clean = re.sub(r'\s+', ' ', clean).strip()
    print(f"\n[ASISTAN] {clean}")
    tts.say(clean)
    tts.runAndWait()

def listen(timeout=8):
    print("[MIK] Dinleme basliyor...")
    pa = pyaudio.PyAudio()
    stream = pa.open(format=pyaudio.paInt16, channels=1, rate=16000, input=True, frames_per_buffer=4096)
    
    start = time.time()
    while time.time() - start < timeout:
        data = stream.read(4096, exception_on_overflow=False)
        if rec.AcceptWaveform(data):
            result = json.loads(rec.Result())
            text = result.get('text', '').strip()
            if text:
                stream.stop_stream()
                stream.close()
                pa.terminate()
                return text
    
    final = json.loads(rec.FinalResult())
    stream.stop_stream()
    stream.close()
    pa.terminate()
    return final.get('text', '')

def think(text):
    history.append({"role": "user", "content": text})
    messages = [{"role": "system", "content": "Turkce kisa net yanit ver."}]
    messages.extend(history[-6:])
    
    try:
        r = requests.post(f"{OLLAMA_URL}/api/chat", json={"model": LLM_MODEL, "messages": messages, "stream": False}, timeout=30)
        reply = r.json()['message']['content']
        history.append({"role": "assistant", "content": reply})
        return reply
    except:
        return "Ollama calismiyor."

# BASLAT
print("\n" + "="*40)
print("   AI ASISTAN HAZIR")
print("="*40)
speak("Merhaba! Ben AI asistaninizim.")

while True:
    try:
        print("\n[BEKLE] 'Hey Jarvis' veya 'Hey Asistan' deyin...")
        text = listen(timeout=10)
        
        if not text:
            continue
        
        print(f"[DINLE] {text}")
        text_lower = text.lower()
        
        if any(w in text_lower for w in ['hey jarvis', 'hey asistan', 'jarvis', 'asistan']):
            speak("Dinliyorum.")
            
            user_text = listen(timeout=8)
            if user_text:
                print(f"[SIZ] {user_text}")
                
                if any(w in user_text.lower() for w in ['saat', 'kac']):
                    from datetime import datetime
                    speak(f"Saat {datetime.now().strftime('%H:%M')}")
                elif any(w in user_text.lower() for w in ['kapat', 'gule gule']):
                    speak("Gule gule!")
                    break
                else:
                    speak(think(user_text))
            else:
                speak("Anlayamadim.")
        
    except KeyboardInterrupt:
        speak("Kapatiliyorum.")
        break
    except Exception as e:
        print(f"[HATA] {e}")
        time.sleep(1)
