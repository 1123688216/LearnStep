param(
    [ValidateSet('Start','Stop','Check')][string]$Action='Start',
    [ValidateRange(1024,65535)][int]$AppPort=3011
)
$ErrorActionPreference='Stop'
$projectRoot=(Resolve-Path -LiteralPath (Split-Path -Parent $PSScriptRoot)).ProviderPath
function Invoke-Helper([string]$Name,[string[]]$Options) {
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot $Name) @Options
    if ($LASTEXITCODE -ne 0) { throw "$Name failed. Already running services are preserved; check the log path printed above." }
}
function Test-DockerReady {
    $ErrorActionPreference='Continue'
    & docker info --format '{{.ServerVersion}}' 2>&1 | Out-Null
    return ($LASTEXITCODE -eq 0)
}
if ($Action -eq 'Check') {
    Invoke-Helper 'start-rag-stack.ps1' @('-CheckOnly','-IncludeApp','-AppPort',"$AppPort")
    Invoke-Helper 'ragflow-stack.ps1' @('-Action','Check')
    exit 0
}
if ($Action -eq 'Stop') {
    Invoke-Helper 'stop-rag-stack.ps1' @()
    Invoke-Helper 'ragflow-stack.ps1' @('-Action','Stop')
    Write-Host '[STOP] Managed project services stopped. Docker Desktop, unrelated containers, volumes and model files preserved.'
    exit 0
}
# Read-only preflight before starting anything.
Invoke-Helper 'start-rag-stack.ps1' @('-CheckOnly','-IncludeApp','-AppPort',"$AppPort")
Get-Command docker -ErrorAction Stop | Out-Null
if (-not (Test-DockerReady)) {
    $desktop=Join-Path $env:ProgramFiles 'Docker\Docker\Docker Desktop.exe'
    if (-not (Test-Path -LiteralPath $desktop -PathType Leaf)) { throw 'Docker Desktop is not installed at the standard path. Start it manually and retry.' }
    Start-Process -FilePath $desktop -WindowStyle Hidden | Out-Null
    $timer=[Diagnostics.Stopwatch]::StartNew()
    do {
        Write-Host "[WAIT] Docker engine: $([int]$timer.Elapsed.TotalSeconds)s"
        Start-Sleep -Seconds 3
        if (Test-DockerReady) { break }
    } while ($timer.Elapsed.TotalSeconds -lt 180)
    if (-not (Test-DockerReady)) { throw 'Docker engine did not become ready within 180s.' }
}
Invoke-Helper 'ragflow-stack.ps1' @('-Action','Start')
Invoke-Helper 'start-rag-stack.ps1' @('-IncludeApp','-AppPort',"$AppPort")
Write-Host "[READY] Learning app: http://127.0.0.1:$AppPort ; RAGFlow: see endpoint above."
Write-Host "[LOGS] $(Join-Path $projectRoot '.runtime\rag-stack')"
