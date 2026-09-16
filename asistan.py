"""
AI Asistan - Ses + Klavye
Mikrofon calismazsa klavye ile devam eder
"""

import os, sys, time, json, re

if sys.platform == 'win32':
    os.system('chcp 65001 >nul 2>&1')
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import pyttsx3
import requests

# AYARLAR
OLLAMA_URL = "http://localhost:11434"
LLM_MODEL = "qwen2.5:0.5b"

# TTS
tts = pyttsx3.init()
tts.setProperty('rate', 160)
tts.setProperty('volume', 1.0)  # Max ses

# SOHBET
history = []

def speak(text):
    # Sadece markdown temizle, Turkce karakterleri koru
    clean = re.sub(r'[*#`_~>|]', '', text)
    clean = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', clean)
    clean = re.sub(r'\s+', ' ', clean).strip()
    if not clean:
        return
    print(f"\n[ASISTAN] {clean}")
    tts.say(clean)
    tts.runAndWait()

def listen_mic():
    """Mikrofon ile dinle"""
    try:
        import pyaudio
        from vosk import Model, KaldiRecognizer
        
        m = Model('vosk-model-small-tr-0.3')
        r = KaldiRecognizer(m, 16000)
        
        pa = pyaudio.PyAudio()
        stream = pa.open(format=pyaudio.paInt16, channels=1, rate=16000, input=True, frames_per_buffer=4096)
        
        print("[MIK] Konusunuz... (5 saniye)")
        start = time.time()
        
        while time.time() - start < 5:
            data = stream.read(4096, exception_on_overflow=False)
            if r.AcceptWaveform(data):
                result = json.loads(r.Result())
                text = result.get('text', '').strip()
                if text:
                    stream.stop_stream()
                    stream.close()
                    pa.terminate()
                    return text
        
        final = json.loads(r.FinalResult())
        stream.stop_stream()
        stream.close()
        pa.terminate()
        return final.get('text', '')
        
    except Exception as e:
        print(f"[MIK HATA] {e}")
        return None

def listen_keyboard():
    """Klavye ile dinle"""
    try:
        text = input("\n[SIZ] Mesajiniz: ").strip()
        return text
    except EOFError:
        return None

def think(text):
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
        return "Ollama calismiyor. 'ollama serve' calistirin."
    except Exception as e:
        return f"Hata: {str(e)}"

# ANA PROGRAM
print("\n" + "="*50)
print("   AI ASISTAN - SES + KLAVYE")
print("="*50)
print()
print("  SECENEKLER:")
print("  1. Mikrofon ile konusun")
print("  2. Klavye ile yazin")
print("  3. Ctrl+C ile cikis")
print()

# Once mikrofonu dene
print("[TEST] Mikrofon testi yapiliyor...")
mic_text = listen_mic()

if mic_text:
    print(f"[OK] Mikrofon calisiyor! Algilanan: {mic_text}")
    use_mic = True
else:
    print("[UYARI] Mikrofon calismadi. Klaleyde moduna geciliyor.")
    use_mic = False

speak("Merhaba! Ben AI asistaninizim. Size nasil yardimci olabilirim?")

while True:
    try:
        print("\n--- Yeni tur ---")
        
        if use_mic:
            text = listen_mic()
        else:
            text = listen_keyboard()
        
        if not text:
            print("[BOS] Bir sey algılanamadi")
            continue
        
        print(f"[SIZ] {text}")
        text_lower = text.lower()
        
        # Komutlar
        if any(w in text_lower for w in ['saat', 'kac saat', 'zaman']):
            from datetime import datetime
            speak(f"Saat su an {datetime.now().strftime('%H:%M')}")
            continue
        
        if any(w in text_lower for w in ['tarih', 'bugun', 'gunlerden']):
            from datetime import datetime
            speak(f"Bugun {datetime.now().strftime('%d %B %Y')}")
            continue
        
        if any(w in text_lower for w in ['gule gule', 'hosca kal', 'bay bay', 'kendine iyi bak']):
            speak("Gule gule! Iyi gunler dilerim.")
            break
        
        if any(w in text_lower for w in ['tesekkur', 'sagol', 'sag ol']):
            speak("Rica ederim! Baska bir sey yardimci olabilir miyim?")
            continue
        
        if any(w in text_lower for w in ['kimsin', 'adın ne', 'sen kimsin', 'kimsin sen']):
            speak("Ben AI asistaninizim. Size yardimci olmak icin buradayim.")
            continue
        
        if any(w in text_lower for w in ['klavye', 'yazarak', 'mod degis']):
            use_mic = False
            speak("Klavye moduna gectim. Artik yazarak konusabilirsiniz.")
            continue
        
        if any(w in text_lower for w in ['mikrofon', 'sesli', 'konusarak']):
            use_mic = True
            speak("Mikrofon moduna gectim. Artik sesli konusabilirsiniz.")
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
