param([ValidateRange(1024,65535)][int]$AppPort=3011)
$ErrorActionPreference='Stop'
function Invoke-Helper([string]$Name,[string[]]$Options) {
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot $Name) @Options
    if ($LASTEXITCODE -ne 0) { throw "$Name failed; restart aborted." }
}
# Validate dependencies before stopping the current frontend.
Invoke-Helper 'start-rag-stack.ps1' @('-FrontendOnly','-CheckOnly','-AppPort',"$AppPort")
Write-Host '[RESTART] Frontend only. Active web requests may be interrupted; backend services are untouched.'
Invoke-Helper 'stop-rag-stack.ps1' @('-Service','Frontend')
$client=New-Object Net.Sockets.TcpClient
try {
    $pending=$client.BeginConnect('127.0.0.1',$AppPort,$null,$null)
    $occupied=$false
    if ($pending.AsyncWaitHandle.WaitOne(500)) {
        try { $client.EndConnect($pending); $occupied=$true } catch { }
    }
} finally { $client.Dispose() }
if ($occupied) { throw "Port $AppPort is still occupied by an unmanaged service. Stop it in its original terminal first; no process was killed by port." }
Invoke-Helper 'start-rag-stack.ps1' @('-FrontendOnly','-AppPort',"$AppPort")
Write-Host "[READY] Frontend restarted: http://127.0.0.1:$AppPort"
