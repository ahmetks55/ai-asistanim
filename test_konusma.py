import sys, json
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import pyaudio
from vosk import Model, KaldiRecognizer

print('Model yukleniyor...')
m = Model('vosk-model-small-tr-0.3')
r = KaldiRecognizer(m, 16000)
print('Model hazir!')

print('Mikrofon testi basliyor (5 saniye)...')
pa = pyaudio.PyAudio()
stream = pa.open(format=pyaudio.paInt16, channels=1, rate=16000, input=True, frames_per_buffer=4096)

for i in range(50):
    data = stream.read(4096, exception_on_overflow=False)
    if r.AcceptWaveform(data):
        result = json.loads(r.Result())
        if result.get('text'):
            print(f'  TESPIT: {result["text"]}')

final = json.loads(r.FinalResult())
print(f'SONUC: {final.get("text", "(bos)")}')

stream.stop_stream()
stream.close()
pa.terminate()
print('TEST TAMAM')
