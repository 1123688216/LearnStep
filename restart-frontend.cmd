@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\restart-frontend.ps1" %*
set "stack_exit=%ERRORLEVEL%"
pause
exit /b %stack_exit%
