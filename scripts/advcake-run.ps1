$ErrorActionPreference = 'Stop'
$project = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$secret = Join-Path $env:LOCALAPPDATA 'AudiotekaPRO\advcake-token.xml'
if (-not (Test-Path -LiteralPath $secret)) { throw 'AdvCake secret is not configured.' }
$secure = Import-Clixml -LiteralPath $secret
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
  $env:ADVCAKE_API_PASS = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  Set-Location -LiteralPath $project
  & node (Join-Path $project 'scripts\sync-advcake.mjs')
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  & node (Join-Path $project 'scripts\monitor-advcake-feeds.mjs')
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} finally {
  Remove-Item Env:ADVCAKE_API_PASS -ErrorAction SilentlyContinue
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
}
