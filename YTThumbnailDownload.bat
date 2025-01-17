set ThumbnailUrl="{THUMBNAILURL}"
if not "%errorlevel%"=="0" ( pause && exit /B 1 )

set VideoID={VIDEOID}
if not "%errorlevel%"=="0" ( pause && exit /B 1 )

for %%I in (%ThumbnailUrl%) do set Extension=%%~xI
if not "%errorlevel%"=="0" ( pause && exit /B 1 )

curl --verbose --output "YTTemp0%Extension%" %ThumbnailUrl%
if not "%errorlevel%"=="0" ( pause && exit /B 1 )

ffmpeg -i "YTTemp0%Extension%" "YTTemp1.png"
if not "%errorlevel%"=="0" ( pause && exit /B 1 )

move /-Y "YTTemp1.png" "Thumbnails/%VideoID%.png"
if not "%errorlevel%"=="0" ( pause && exit /B 1 )

del /F "YTTemp0%Extension%"
if not "%errorlevel%"=="0" ( pause && exit /B 1 )

exit /B 0