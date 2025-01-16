set ThumbnailUrl={THUMBNAILURL}
if not "%errorlevel%"=="0" ( pause && exit /B 1 )

set VideoID={VIDEOID}
if not "%errorlevel%"=="0" ( pause && exit /B 1 )

for %%I in ("%ThumbnailUrl%") do set Extension=%%~xI
if not "%errorlevel%"=="0" ( pause && exit /B 1 )

curl --verbose --output "Thumbnails/%VideoID%%Extension%" "%ThumbnailUrl%"
if not "%errorlevel%"=="0" ( pause && exit /B 1 )

exit /B 0