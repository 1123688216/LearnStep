@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\project-stack.ps1" -Action Start %*
set "stack_exit=%ERRORLEVEL%"
pause
exit /b %stack_exit%
