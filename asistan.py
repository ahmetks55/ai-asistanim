"""
AI Asistan - Direkt Konusma
Wake word olmadan, dogrudan konusarak calisir
"""

import os, sys, time, json, re

if sys.platform == 'win32':
    os.system('chcp 65001 >nul 2>&1')
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import pyaudio
import pyttsx3
import requests
from vosk import Model, KaldiRecognizer

# AYARLAR
OLLAMA_URL = "http://localhost:11434"
LLM_MODEL = "qwen2.5:0.5b"
SAMPLE_RATE = 16000

# TTS
tts = pyttsx3.init()
tts.setProperty('rate', 160)

# STT
print("Vosk modeli yukleniyor...")
stt_model = Model('vosk-model-small-tr-0.3')
rec = KaldiRecognizer(stt_model, SAMPLE_RATE)
print("Vosk hazir!")

# SOHBET GECMISI
history = []

def speak(text):
    """Sesli oku"""
    clean = re.sub(r'[^\w\s.,!?]', '', text)
    clean = re.sub(r'\s+', ' ', clean).strip()
    print(f"\n[ASISTAN] {clean}")
    tts.say(clean)
    tts.runAndWait()

def listen():
    """Mikrofondan dinle - sadece konusma olunca dondur"""
    pa = pyaudio.PyAudio()
    stream = pa.open(
        format=pyaudio.paInt16, channels=1, rate=SAMPLE_RATE,
        input=True, frames_per_buffer=4096
    )
    
    print("[MIK] Konusunuz...")
    silence_count = 0
    frames = []
    
    while True:
        data = stream.read(4096, exception_on_overflow=False)
        
        if rec.AcceptWaveform(data):
            result = json.loads(rec.Result())
            text = result.get('text', '').strip()
            if text:
                stream.stop_stream()
                stream.close()
                pa.terminate()
                return text
        
        # Arka plan gurultusu kontrolu
        import struct
        audio_level = max(struct.unpack('<' + 'h' * (len(data)//2), data))
        if audio_level < 500:  # Sessizlik
            Silence_count += 1
        else:
            Silence_count = 0
        
        # Cok uzun sessizlik varsa dur
        if Silence_count > 50:  # ~3 saniye
            final = json.loads(rec.FinalResult())
            stream.stop_stream()
            stream.close()
            pa.terminate()
            return final.get('text', '')

def think(text):
    """LLM'e sor"""
    history.append({"role": "user", "content": text})
    messages = [{"role": "system", "content": "Sen yardimci bir asistansin. Turkce kisa net yanit ver. 1-2 cumle."}]
    messages.extend(history[-6:])
    
    try:
        r = requests.post(
            f"{OLLAMA_URL}/api/chat",
            json={"model": LLM_MODEL, "messages": messages, "stream": False},
            timeout=30
        )
        reply = r.json()['message']['content']
        history.append({"role": "assistant", "content": reply})
        return reply
    except requests.exceptions.ConnectionError:
        return "Ollama calismiyor. Lutfen ollama serve calistirin."
    except Exception as e:
        return f"Hata: {str(e)}"

# ANA DONGU
print("\n" + "="*40)
print("   AI ASISTAN HAZIR!")
print("   Konusmaya baslayabilirsiniz.")
print("   Durdurmak icin: Ctrl+C")
print("="*40)

speak("Merhaba! Ben AI asistaninizim. Bana istediginizi soyleyebilirsiniz.")

while True:
    try:
        print("\n--- Yeni tur ---")
        text = listen()
        
        if not text:
            print("[BOS] Bir sey duyulamadi")
            continue
        
        print(f"[SIZ] {text}")
        
        # Komutlar
        text_lower = text.lower()
        
        if any(w in text_lower for w in ['saat', 'kac saat', 'zaman']):
            from datetime import datetime
            speak(f"Saat su an {datetime.now().strftime('%H:%M')}")
            continue
        
        if any(w in text_lower for w in ['tarih', 'bugun', 'gunlerden']):
            from datetime import datetime
            speak(f"Bugun {datetime.now().strftime('%d %B %Y')}")
            continue
        
        if any(w in text_lower for w in ['gule gule', 'hosca kal', 'kendine iyi bak', 'bay bay']):
            speak("Gule gule! Iyi gunler dilerim.")
            break
        
        if any(w in text_lower for w in ['tesekkur', 'sagol', 'sag ol']):
            speak("Rica ederim! Baska bir sey yardimci olabilir miyim?")
            continue
        
        if any(w in text_lower for w in ['kimsin', 'adın ne', 'sen kimsin']):
            speak("Ben AI asistaninizim. Size yardimci olmak icin buradayim.")
            continue
        
        # LLM'e gonder
        print("[DUSUN] Dusunuyorum...")
        response = think(text)
        speak(response)
        
    except KeyboardInterrupt:
        speak("Gule gule! Kapatiliyorum.")
        break
    except Exception as e:
        print(f"[HATA] {e}")
        time.sleep(1)
