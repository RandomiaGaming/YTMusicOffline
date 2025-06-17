@echo off

:: Save a good copy of the script dir since shift will break this
set scriptdir=%~dp0

:: Ensure python is installed
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo Python is required to run YTMusicOffline but it could not be found.
    echo You may need to edit your PATH or download it from https://www.python.org/downloads/
    echo.
    pause
    exit /b 1
)

:: Combine the command line args so they are ready to forward to python
set args=
:argLoopContinue
if "%~1"=="" goto argLoopBreak
set args=%args% "%~1"
shift
goto argLoopContinue
:argLoopBreak

:: Launch server.py and return its status code
python "%scriptdir%server\server.py" %args%
exit /b %errorlevel%