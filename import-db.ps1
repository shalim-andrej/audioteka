# Import SQL dump into Neon PostgreSQL via psql
# Run: powershell -ExecutionPolicy Bypass -File .\import-db.ps1

$ErrorActionPreference = "Continue"

# ---------- SETTINGS ----------
$DIR    = "C:\Users\user\Desktop\portfolio\Audioteka"
$PSQL   = "C:\Program Files\PostgreSQL\18\bin\psql.exe"
$DBHOST = "ep-crimson-bonus-ba7t3nx8.c-8.eu-central-1.aws.neon.tech"
$DBNAME = "neondb"
$DBUSER = "neondb_owner"
$DBPASS = "npg_QjCn8vLF7hxm"
# ------------------------------

$env:PGPASSWORD = $DBPASS
$env:PGSSLMODE  = "require"
$conn = "postgresql://" + $DBUSER + "@" + $DBHOST + "/" + $DBNAME

if (-not (Test-Path $PSQL)) {
    Write-Host "[ERROR] psql not found: $PSQL" -ForegroundColor Red
    exit 1
}

Write-Host "[1/3] Testing connection to $DBHOST ..." -ForegroundColor Cyan
& $PSQL $conn -c "select current_database()"
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Cannot connect. Check password/host in this file." -ForegroundColor Red
    exit 1
}
Write-Host "[1/3] Connection OK" -ForegroundColor Green

$files = Get-ChildItem -Path $DIR -Filter "import_part_*.sql" |
         Sort-Object { [int]($_.BaseName -replace '\D', '') }

if ($files.Count -eq 0) {
    Write-Host "[ERROR] No import_part_*.sql files in $DIR" -ForegroundColor Red
    exit 1
}

Write-Host "[2/3] Files found: $($files.Count)" -ForegroundColor Cyan
Write-Host "      First: $($files[0].Name)" -ForegroundColor Cyan
Write-Host "      Last:  $($files[$files.Count - 1].Name)" -ForegroundColor Cyan
Write-Host ""

$log = Join-Path $DIR "import_errors.log"
if (Test-Path $log) { Remove-Item $log -Force }

$i = 0
$fail = 0
$t0 = Get-Date

foreach ($f in $files) {
    $i = $i + 1
    $out = & $PSQL $conn -f $f.FullName 2>&1
    if ($LASTEXITCODE -ne 0) {
        $fail = $fail + 1
        ("=== " + $f.Name + " ===") | Out-File -FilePath $log -Append -Encoding utf8
        $out | Out-File -FilePath $log -Append -Encoding utf8
        Write-Host ("[" + $i + "/" + $files.Count + "] " + $f.Name + "  ERROR (see import_errors.log)") -ForegroundColor Yellow
    }
    else {
        Write-Host ("[" + $i + "/" + $files.Count + "] " + $f.Name + "  OK") -ForegroundColor Green
    }
}

$sec = [int]((Get-Date) - $t0).TotalSeconds
Write-Host ""
Write-Host "[3/3] Done. Files: $($files.Count), errors: $fail, time: $sec sec." -ForegroundColor Cyan
if ($fail -gt 0) {
    Write-Host "      Error details: $log" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Row counts per table:" -ForegroundColor Cyan
& $PSQL $conn -c "select relname, n_live_tup from pg_stat_user_tables order by n_live_tup desc limit 10;"
