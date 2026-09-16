@echo off
chcp 65001 >nul
title AI Asistanim - Sohbet Asistani

echo.
echo ========================================
echo   AI ASISTANIM - SOHBET ASISTANI
echo ========================================
echo.

:: Ollama calisiyor mu kontrol et
tasklist /FI "IMAGENAME eq ollama.exe" 2>NUL | find /I "ollama.exe" >NUL
if errorlevel 1 (
    echo [!] Ollama calismiyor, baslatiliyor...
    start "" "C:\Users\ASUS\AppData\Local\Programs\Ollama\ollama.exe" serve
    timeout /t 5 /nobreak >nul
)

echo [OK] Ollama calisiyor
echo.

:: Asistani baslat
echo Asistan baslatiliyor...
echo Durdurmak icin Ctrl+C veya "gule gule" diyebilirsiniz
echo.
"C:\Users\ASUS\AppData\Local\Programs\Python\Python312\python.exe" chat_assistant.py

pause
