param([string]$ConfigPath,[string]$InstallDirectory)
$ErrorActionPreference = 'Stop'
if(-not ('Ofton.InstallerNative' -as [type])) {
    Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; namespace Ofton { public static class InstallerNative { [DllImport("kernel32.dll")] public static extern int GetCurrentPackageFullName(ref uint length, IntPtr name); } }'
}
[uint32]$packageNameLength=0
$packagedHost=[Ofton.InstallerNative]::GetCurrentPackageFullName([ref]$packageNameLength,[IntPtr]::Zero) -ne 15700
$root = if($InstallDirectory){[System.IO.Path]::GetFullPath($InstallDirectory)}elseif($packagedHost){Join-Path $env:USERPROFILE 'Documents\OftonWatching'}else{Join-Path $env:LOCALAPPDATA 'OftonWatching'}
$app = Join-Path $root 'app'
$data = Join-Path $root 'data'
$source = Join-Path $PSScriptRoot 'OftonClient'
$exe = Join-Path $app 'OftonClient.exe'
$taskName = 'OftonWatching'
if (!(Test-Path -LiteralPath (Join-Path $source 'OftonClient.exe'))) { throw '请先解压完整安装包，再运行 Install.ps1。' }
if (Test-Path -LiteralPath $exe) { throw '已经安装。更新前请运行 Uninstall.ps1，它会保留本机配置。' }
# Run from a packaged host (for example a Store-installed terminal) with an
# explicit non-virtualized directory so Task Scheduler can see the executable.
New-Item -ItemType Directory -Path $app,$data -Force | Out-Null
Copy-Item -Path (Join-Path $source '*') -Destination $app -Recurse
if ($ConfigPath) {
    $config = Get-Content -LiteralPath $ConfigPath -Raw | ConvertFrom-Json
    if (!$config.server_url -or !$config.token) { throw '配置缺少服务器地址或设备 Token。' }
    Copy-Item -LiteralPath $ConfigPath -Destination (Join-Path $data 'config.json')
}
$identity = [System.Security.Principal.WindowsIdentity]::GetCurrent()
$sid = $identity.User.Value
$acl = Get-Acl -LiteralPath $data
$acl.SetAccessRuleProtection($true,$false)
foreach($rule in @($acl.Access)) { $acl.RemoveAccessRuleAll($rule) }
foreach($owner in @($sid,'S-1-5-18')) {
    $rule = [System.Security.AccessControl.FileSystemAccessRule]::new([System.Security.Principal.SecurityIdentifier]::new($owner),'FullControl','ContainerInherit,ObjectInherit','None','Allow')
    $acl.AddAccessRule($rule)
}
Set-Acl -LiteralPath $data -AclObject $acl
$arguments = '--supervise --data-dir "' + $data + '"'
$action = New-ScheduledTaskAction -Execute $exe -Argument $arguments -WorkingDirectory $app
$logon = New-ScheduledTaskTrigger -AtLogOn -User $sid
$periodic = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 1)
$principal = New-ScheduledTaskPrincipal -UserId $sid -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit ([TimeSpan]::Zero) -MultipleInstances IgnoreNew -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1)
$existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existing) { throw '已有同名计划任务，请先检查现有安装。' }
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger @($logon,$periodic) -Principal $principal -Settings $settings -Description '当前账号的个人设备状态采集；登录启动，异常自动恢复，手动停止后保持停止。' | Out-Null
@{automatic_recovery=$true;task_name=$taskName;installed_at=(Get-Date).ToUniversalTime().ToString('o')} | ConvertTo-Json | Set-Content (Join-Path $data 'installation.json') -Encoding utf8
$menu = Join-Path ([Environment]::GetFolderPath('StartMenu')) 'Programs\Ofton Watching'
New-Item -ItemType Directory -Path $menu -Force | Out-Null
$shell = New-Object -ComObject WScript.Shell
foreach($item in @(@('启动上报','--start'),@('停止上报','--pause'),@('查看状态','--status'))) {
    $shortcut = $shell.CreateShortcut((Join-Path $menu ($item[0]+'.lnk')))
    $shortcut.TargetPath=$exe
    $shortcut.Arguments=$item[1]+' --data-dir "'+$data+'"'
    $shortcut.WorkingDirectory=$app
    $shortcut.Save()
}
@{enabled=$true;updated_at=(Get-Date).ToUniversalTime().ToString('o')} | ConvertTo-Json | Set-Content (Join-Path $data 'control.json') -Encoding utf8
[System.IO.File]::WriteAllText((Join-Path $data 'control.txt'),"run`n")
Start-ScheduledTask -TaskName $taskName
$deadline=(Get-Date).AddSeconds(20)
$started=$false
do {
    $statePath=Join-Path $data 'supervisor.json'
    if(Test-Path -LiteralPath $statePath) {
        $state=Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
        $process=Get-Process -Id $state.supervisor_pid -ErrorAction SilentlyContinue
        if($process -and $process.Path -eq $exe){$started=$true;break}
    }
    Start-Sleep -Milliseconds 500
} while((Get-Date)-lt$deadline)
if(!$started) { $info=Get-ScheduledTaskInfo -TaskName $taskName; throw "计划任务未能启动客户端，错误码 $($info.LastTaskResult)。安装目录必须能被 Windows 计划任务直接访问。" }
foreach($item in @(@('Start.cmd','--start'),@('Stop.cmd','--pause'),@('Status.cmd','--status'))) {
    $command='@echo off'+"`r`n"+'start "" "%~dp0app\OftonClient.exe" '+$item[1]+' --data-dir "%~dp0data"'+"`r`n"
    [System.IO.File]::WriteAllText((Join-Path $root $item[0]),$command,[System.Text.Encoding]::ASCII)
}
Write-Output "已安装到 $root，并验证计划任务能够启动。停止上报请用安装目录的 Stop.cmd 或开始菜单里的“停止上报”。"
