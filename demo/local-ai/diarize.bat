@echo off
setlocal
set "DIR=%~dp0"
python "%DIR%diarize.py" %*
