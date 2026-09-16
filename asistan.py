"""
AI Asistan - Turkce Sesli
edge-tts ile Turkce konusan asistan
"""

import os, sys, time, json, re, asyncio

if sys.platform == 'win32':
    os.system('chcp 65001 >nul 2>&1')
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import edge_tts
import requests
import pygame

# Pygame mixer baslat
pygame.mixer.init()

# AYARLAR
OLLAMA_URL = "http://localhost:11434"
LLM_MODEL = "qwen2.5:0.5b"
TTS_VOICE = "tr-TR-AhmetNeural"  # Turkce erkek ses

# SOHBET
history = []

def speak(text):
    """Turkce sesli oku"""
    clean = re.sub(r'[*#`_~>|]', '', text)
    clean = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', clean)
    clean = re.sub(r'\s+', ' ', clean).strip()
    if not clean:
        return
    
    print(f"\n[ASISTAN] {clean}")
    
    try:
        tmp = os.path.join(os.environ['TEMP'], 'asistan_ses.mp3')
        communicate = edge_tts.Communicate(clean, TTS_VOICE)
        asyncio.run(communicate.save(tmp))
        
        # pygame ile cal
        pygame.mixer.music.load(tmp)
        pygame.mixer.music.play()
        while pygame.mixer.music.get_busy():
            time.sleep(0.1)
    except Exception as e:
        print(f"[SES HATA] {e}")

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
    """LLM'e sor"""
    history.append({"role": "user", "content": text})
    messages = [{"role": "system", "content": "Sen yardimci bir asistansin. Turkce kisa net yanit ver. 1-2 cumle."}]
    messages.extend(history[-6:])
    
    try:
        r = requests.post(
            f"{OLLAMA_URL}/api/chat",
            json={"model": LLM_MODEL, "messages": messages, "stream": False},
            timeout=60
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
print("   AI ASISTAN - TURKCE SESLI")
print("="*50)
print()
print("  Komutlar:")
print("  - Direkt yazarak konusun")
print("  - 'saat kac' -> saati soyler")
print("  - 'guule guule' -> kapatir")
print("  - Ctrl+C ile cikis")
print()

# Mikrofon testi
print("[TEST] Mikrofon testi...")
mic_text = listen_mic()
use_mic = bool(mic_text)

if use_mic:
    print(f"[OK] Mikrofon calisiyor: {mic_text}")
else:
    print("[UYARI] Mikrofon calismadi. Klavye modu.")

speak("Merhaba! Ben AI asistaninizim. Size nasil yardimci olabilirim?")

while True:
    try:
        print("\n--- Yeni tur ---")
        
        if use_mic:
            text = listen_mic()
        else:
            text = listen_keyboard()
        
        if not text:
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
        
        if any(w in text_lower for w in ['guule guule', 'hosca kal', 'bay bay']):
            speak("Guule guule! Iyi gunler dilerim.")
            break
        
        if any(w in text_lower for w in ['tesekkur', 'sagol']):
            speak("Rica ederim!")
            continue
        
        if any(w in text_lower for w in ['kimsin', 'adın ne']):
            speak("Ben AI asistaninizim.")
            continue
        
        if any(w in text_lower for w in ['klavye', 'yazarak']):
            use_mic = False
            speak("Klavye moduna gectim.")
            continue
        
        if any(w in text_lower for w in ['mikrofon', 'sesli']):
            use_mic = True
            speak("Mikrofon moduna gectim.")
            continue
        
        # LLM'e gonder
        print("[DUSUN] Dusunuyorum...")
        response = think(text)
        speak(response)
        
    except KeyboardInterrupt:
        speak("Guule guule! Kapatiliyorum.")
        break
    except Exception as e:
        print(f"[HATA] {e}")
        time.sleep(1)
