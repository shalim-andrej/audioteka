$ErrorActionPreference = 'Stop'
$promotionTask = 'AudiotekaPRO-AdvCake-Promotions'
$catalogTask = 'AudiotekaPRO-AdvCake-Catalog-Staging'
foreach ($name in @($promotionTask,$catalogTask)) {
  if (Get-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue) { throw "Task already exists: $name . No changes made." }
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js was not found.' }
if (-not (Get-Command python -ErrorAction SilentlyContinue)) { throw 'Python was not found.' }
$secretDir = Join-Path $env:LOCALAPPDATA 'AudiotekaPRO'
New-Item -ItemType Directory -Path $secretDir -Force | Out-Null
$secretFile = Join-Path $secretDir 'advcake-token.xml'
if (Test-Path -LiteralPath $secretFile) { throw 'Secret file already exists; refusing to overwrite it.' }
$secret = Read-Host 'Enter your NEW AdvCake API pass' -AsSecureString
if ($secret.Length -eq 0) { throw 'Empty secret; no task created.' }
$secret | Export-Clixml -LiteralPath $secretFile
$exe = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited
$registered = @()
try {
  $runner = Join-Path $PSScriptRoot 'advcake-run.ps1'
  $action = New-ScheduledTaskAction -Execute $exe -Argument ('-NoProfile -NonInteractive -ExecutionPolicy Bypass -File "' + $runner + '"')
  $trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(5) -RepetitionInterval (New-TimeSpan -Hours 4) -RepetitionDuration (New-TimeSpan -Days 3650)
  Register-ScheduledTask -TaskName $promotionTask -Action $action -Trigger $trigger -Principal $principal | Out-Null
  $registered += $promotionTask
  $runner = Join-Path $PSScriptRoot 'advcake-catalog-run.ps1'
  $action = New-ScheduledTaskAction -Execute $exe -Argument ('-NoProfile -NonInteractive -ExecutionPolicy Bypass -File "' + $runner + '"')
  $trigger = New-ScheduledTaskTrigger -Daily -At '03:00'
  Register-ScheduledTask -TaskName $catalogTask -Action $action -Trigger $trigger -Principal $principal | Out-Null
  $registered += $catalogTask
  Write-Host 'Two local tasks created. Run advcake-run.ps1 once to test promotions.'
} catch {
  foreach ($name in $registered) { Unregister-ScheduledTask -TaskName $name -Confirm:$false -ErrorAction SilentlyContinue }
  Remove-Item -LiteralPath $secretFile -Force -ErrorAction SilentlyContinue
  throw
}
