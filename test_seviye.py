import sys, json, struct
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import pyaudio

print('Mikrofon testi (10 saniye)...')
print('Lutfen bir seyler soyleyin!')
print()

pa = pyaudio.PyAudio()
stream = pa.open(format=pyaudio.paInt16, channels=1, rate=16000, input=True, frames_per_buffer=4096)

for i in range(100):  # ~10 saniye
    data = stream.read(4096, exception_on_overflow=False)
    # Ses seviyesini olc
    samples = struct.unpack('<' + 'h' * (len(data)//2), data)
    level = max(abs(s) for s in samples)
    
    # Seviyeyi goster
    bar = '#' * min(level // 100, 50)
    print(f'Seviye: {level:6d} |{bar}|')
    
    if level > 1000:
        print('  >>> SES ALGILANDI!')

stream.stop_stream()
stream.close()
pa.terminate()
print('\nTest tamamlandi')
