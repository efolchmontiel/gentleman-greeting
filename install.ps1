# Instalador de gentleman-greeting para Windows (PowerShell).
#
#   .\install.ps1            copia la extensión y sus assets al agent home
#   .\install.ps1 -DryRun    muestra qué haría, sin escribir
#
# Si preferís la vía de paquetes del harness, no hace falta este script:
#
#   gentle-shell install git:github.com/efolchmontiel/gentleman-greeting
#
[CmdletBinding()]
param([switch]$DryRun)

$ErrorActionPreference = 'Stop'

$aca = Split-Path -Parent $MyInvocation.MyCommand.Path

function Get-AgentHome {
  if ($env:GENTLE_PI_AGENT_HOME) { return $env:GENTLE_PI_AGENT_HOME }
  if ($env:PI_CODING_AGENT_DIR) { return $env:PI_CODING_AGENT_DIR }
  $gentle = Join-Path $HOME '.gentle-shell/agent'
  if (Test-Path $gentle) { return $gentle }
  $pi = Join-Path $HOME '.pi/agent'
  if (Test-Path $pi) { return $pi }
  return $gentle
}

$home_ = Get-AgentHome
$destinoExt = Join-Path $home_ 'extensions/gentleman-greeting.ts'
$destinoAssets = Join-Path $home_ 'assets/gentleman-greeting'
$marca = Get-Date -Format 'yyyyMMdd-HHmmss'
$origenAssets = Join-Path $aca 'assets/gentleman-greeting'

Write-Host "agent home:  $home_"
Write-Host "extensión:   $destinoExt"
Write-Host "assets:      $destinoAssets\"
if ($DryRun) { Write-Host '(dry run: no se escribe nada)' }

function Invoke-Paso {
  param([string]$Descripcion, [scriptblock]$Accion)
  if ($DryRun) {
    Write-Host "  + $Descripcion"
  } else {
    & $Accion
  }
}

Invoke-Paso "mkdir $home_\extensions" { New-Item -ItemType Directory -Force -Path (Join-Path $home_ 'extensions') | Out-Null }
Invoke-Paso "mkdir $destinoAssets" { New-Item -ItemType Directory -Force -Path $destinoAssets | Out-Null }

if (Test-Path $destinoExt) {
  Write-Host "backup:      $destinoExt.bak-$marca"
  Invoke-Paso "copy $destinoExt -> $destinoExt.bak-$marca" { Copy-Item $destinoExt "$destinoExt.bak-$marca" }
}

Invoke-Paso "copy extension" { Copy-Item (Join-Path $aca 'extensions/gentleman-greeting.ts') $destinoExt -Force }
Invoke-Paso "copy frases.json" { Copy-Item (Join-Path $origenAssets 'frases.json') $destinoAssets -Force }
Invoke-Paso "copy inicio_*.png" { Copy-Item (Join-Path $origenAssets 'inicio_*.png') $destinoAssets -Force }
Invoke-Paso "copy cierre_*.png" { Copy-Item (Join-Path $origenAssets 'cierre_*.png') $destinoAssets -Force }

Write-Host
Write-Host 'Listo. Cerrá y volvé a abrir Gentle Shell para que cargue la extensión.'
Write-Host 'Despedida manual sin cerrar la sesión:  /goodbye'
