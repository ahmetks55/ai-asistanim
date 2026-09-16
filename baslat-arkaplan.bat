@echo off
echo ========================================
echo    AI Asistanım - Köprü Başlatılıyor
echo ========================================
echo.

:: Node.js server.js dosyasını arka planda başlat
start /min node server.js

echo Köprü başlatıldı (arka planda çalışıyor)
echo.
echo Tarayıcıda açmak için: http://localhost:8787
echo.
echo Kapatmak için bu pencereyi kapatmayın veya
echo Görev Yöneticisi'nden "node" процессünü sonlandırın.
echo.
pause
