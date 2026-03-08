@echo off
REM Günlük güncelleme: haberler, mevzuat RSS, güncel hukuk gelişmeleri.
REM Windows Görev Zamanlayıcı ile her gün (örn. 06:00) çalıştırın.
cd /d "%~dp0.."
call npm run daily:update
exit /b %ERRORLEVEL%
