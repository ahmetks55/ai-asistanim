@echo off
chcp 65001 >nul
title AI Asistanım - Sohbet Asistanı

echo.
echo ========================================
echo   AI ASİSTANIM - SOHBET ASİSTANI
echo ========================================
echo.

:: Ollama çalışıyor mu kontrol et
tasklist /FI "IMAGENAME eq ollama.exe" 2>NUL | find /I "ollama.exe" >NUL
if errorlevel 1 (
    echo [!] Ollama çalışmıyor, başlatılıyor...
    start "" "C:\Users\ASUS\AppData\Local\Programs\Ollama\ollama.exe" serve
    timeout /t 5 /nobreak >nul
)

echo [OK] Ollama çalışıyor
echo.

:: Asistanı başlat
echo Asistan başlatılıyor...
echo Durdurmak için Ctrl+C veya "güle güle" diyebilirsiniz
echo.
python chat_assistant.py

pause
