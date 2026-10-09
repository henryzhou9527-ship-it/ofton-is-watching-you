param([string]$InstallDirectory)
$ErrorActionPreference = 'Stop'
$registered = Get-ScheduledTask -TaskName 'OftonWatching' -ErrorAction SilentlyContinue
$sid = [System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value
$managedPath = $registered -and $registered.Principal.UserId -eq $sid -and [System.IO.Path]::GetFileName($registered.Actions.Execute) -eq 'OftonClient.exe'
$root = if($InstallDirectory){[System.IO.Path]::GetFullPath($InstallDirectory)}elseif($managedPath){Split-Path (Split-Path $registered.Actions.Execute -Parent) -Parent}else{Join-Path $env:LOCALAPPDATA 'OftonWatching'}
$app = Join-Path $root 'app'
$data = Join-Path $root 'data'
$exe = Join-Path $app 'OftonClient.exe'
if (Test-Path -LiteralPath $exe) {
    Start-Process -FilePath $exe -ArgumentList ('--pause --data-dir "'+$data+'"') -WindowStyle Hidden -Wait
    Start-Sleep -Seconds 16
}
$task = Get-ScheduledTask -TaskName 'OftonWatching' -ErrorAction SilentlyContinue
if ($task -and $task.Actions.Execute -eq $exe) {
    Stop-ScheduledTask -TaskName 'OftonWatching' -ErrorAction SilentlyContinue
    Unregister-ScheduledTask -TaskName 'OftonWatching' -Confirm:$false
}
if (Test-Path -LiteralPath $app) {
    $resolved = (Resolve-Path -LiteralPath $app).Path
    if ($resolved -ne ([System.IO.Path]::GetFullPath($app)) -or (Split-Path $resolved -Parent) -ne [System.IO.Path]::GetFullPath($root)) { throw '安装路径异常，已停止卸载。' }
    $backup = Join-Path $root ('app.removed-'+(Get-Date -Format 'yyyyMMdd-HHmmss'))
    Move-Item -LiteralPath $resolved -Destination $backup
}
$menu = Join-Path ([Environment]::GetFolderPath('StartMenu')) 'Programs\Ofton Watching'
foreach($name in @('启动上报.lnk','停止上报.lnk','查看状态.lnk')) {
    $shortcut=Join-Path $menu $name
    if(Test-Path -LiteralPath $shortcut){Remove-Item -LiteralPath $shortcut}
}
@{automatic_recovery=$false} | ConvertTo-Json | Set-Content (Join-Path $data 'installation.json') -Encoding utf8
Write-Output '已关闭自动启动并移除启动入口。本机配置与安装备份保留在 LocalAppData\OftonWatching。'
