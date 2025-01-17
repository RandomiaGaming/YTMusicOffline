set VideoID=xCP7bCJxxm8
if not "%errorlevel%"=="0" ( pause && exit /B 1 )

yt-dlp.exe --force-overwrites --verbose --no-continue --sleep-interval 0 --max-sleep-interval 3 --format bestaudio --output "YTTemp0.%%(ext)s" "https://www.youtube.com/watch?v=%VideoID%"
if not "%errorlevel%"=="0" ( pause && exit /B 1 )

for %%f in (YTTemp0.*) do set YTDLPOutPath=%%f
if not "%errorlevel%"=="0" ( pause && exit /B 1 )

ffmpeg.exe -i "%YTDLPOutPath%" -c:a aac -b:a 192k -map 0:a:0 -map -0:v -map -0:s -map -0:d -map -0:t -map_chapters -1 -metadata comment="Encoded With BackupService.cs" -movflags +faststart -y "YTTemp1.m4a"
if not "%errorlevel%"=="0" ( pause && exit /B 1 )

move /-Y "YTTemp1.m4a" "Songs/%VideoID%.m4a"
if not "%errorlevel%"=="0" ( pause && exit /B 1 )

del /F "%YTDLPOutPath%"
if not "%errorlevel%"=="0" ( pause && exit /B 1 )

exit /B 0