import asyncio
import edge_tts
import subprocess
import os

async def test():
    voice = 'tr-TR-AhmetNeural'
    text = 'Merhaba! Ben AI asistaninizim. Simdi Turkce konusuyorum.'
    
    tmp = os.path.join(os.environ['TEMP'], 'asistan_test.mp3')
    
    print(f'Ses olusturuluyor: {voice}')
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(tmp)
    print(f'Ses dosyasi: {tmp}')
    
    print('Ses calindiriliyor...')
    subprocess.run(['start', tmp], shell=True)
    print('OK')

asyncio.run(test())
