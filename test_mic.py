"""Hizli test"""
import os, sys, time
if sys.platform == 'win32':
    os.system('chcp 65001 >nul 2>&1')
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from vosk import Model, KaldiRecognizer
import pyaudio, json

print('[1] Vosk modeli yukleniyor...')
model = Model('vosk-model-small-tr-0.3')
rec = KaldiRecognizer(model, 16000)
print('[2] Model hazir')

print('[3] Mikrofon aciliyor...')
pa = pyaudio.PyAudio()
stream = pa.open(format=pyaudio.paInt16, channels=1, rate=16000, input=True, frames_per_buffer=4096)
print('[4] Mikrofon acik, 5 saniye dinle...')

for i in range(50):  # ~5 saniye
    data = stream.read(4096, exception_on_overflow=False)
    if rec.AcceptWaveform(data):
        result = json.loads(rec.Result())
        if result.get('text'):
            print(f'  Tespit: {result["text"]}')

final = json.loads(rec.FinalResult())
print(f'[5] Sonuc: {final.get("text", "(bos)")}')

stream.stop_stream()
stream.close()
pa.terminate()
print('[6] Test tamam')
