param([string]$Python='python',[string]$OutputDirectory=(Join-Path $PSScriptRoot 'dist'))
$ErrorActionPreference='Stop'
Push-Location $PSScriptRoot
try {
    & $Python -m unittest test_recovery -q
    if($LASTEXITCODE -ne 0){throw 'Windows recovery tests failed'}
    & $Python -m PyInstaller --noconfirm --clean --onedir --windowed --name OftonClient --distpath $OutputDirectory --workpath (Join-Path $PSScriptRoot 'build') --specpath (Join-Path $PSScriptRoot 'build') --add-data ((Join-Path $PSScriptRoot 'nsfw-blocklist.json')+';.') --add-data ((Join-Path $PSScriptRoot 'media-sources.json')+';.') --add-data ((Join-Path $PSScriptRoot 'LICENSE')+';.') --collect-data requests --collect-data psutil --collect-data pystray --collect-data PIL --exclude-module numpy --exclude-module matplotlib --exclude-module pygame --exclude-module IPython --exclude-module PyQt5 --exclude-module PySide6 launcher.py
    if($LASTEXITCODE -ne 0){throw 'Windows build failed'}
    & $Python collect_notices.py (Join-Path $OutputDirectory 'OftonClient/licenses')
    if($LASTEXITCODE -ne 0){throw 'Dependency notices could not be collected'}
    Copy-Item Install.ps1,Uninstall.ps1 -Destination $OutputDirectory
} finally { Pop-Location }
