@echo off
title TAHADDANI — Content Watcher
color 0B
echo.
echo  ████████╗ █████╗ ██╗  ██╗ █████╗ ██████╗ ██████╗  █████╗ ███╗   ██╗██╗
echo     ██╔══╝██╔══██╗██║  ██║██╔══██╗██╔══██╗██╔══██╗██╔══██╗████╗  ██║██║
echo     ██║   ███████║███████║███████║██║  ██║██║  ██║███████║██╔██╗ ██║██║
echo     ██║   ██╔══██║██╔══██║██╔══██║██║  ██║██║  ██║██╔══██║██║╚██╗██║██║
echo     ██║   ██║  ██║██║  ██║██║  ██║██████╔╝██████╔╝██║  ██║██║ ╚████║██║
echo     ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝
echo.
echo  Content Watcher — watching for changes...
echo  Press Ctrl+C to stop.
echo  ─────────────────────────────────────────────────────────────────
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
"$root = Split-Path -Parent '%~f0'; ^
$watched = @( ^
  (Join-Path $root 'src\imports\questions.json'), ^
  (Join-Path $root 'src\imports\thirty-categories.json'), ^
  (Join-Path $root 'src\imports\guess-categories.json'), ^
  (Join-Path $root 'src\imports\solo.json'), ^
  (Join-Path $root 'src\imports\manifest.json'), ^
  (Join-Path $root 'public\images'), ^
  (Join-Path $root 'public\TAHADDANI\images\avatar') ^
); ^
$watchers = @(); ^
foreach ($path in $watched) { ^
  if (-not (Test-Path $path)) { ^
    New-Item -ItemType Directory -Force -Path $path -ErrorAction SilentlyContinue | Out-Null ^
    Write-Host ('  [created] ' + $path.Replace($root, '.')) -ForegroundColor DarkGray ^
  } ^
  $dir = if ((Get-Item $path -ErrorAction SilentlyContinue).PSIsContainer) { $path } else { Split-Path $path } ^
  $filter = if ((Get-Item $path -ErrorAction SilentlyContinue).PSIsContainer) { '*.*' } else { Split-Path -Leaf $path } ^
  $w = New-Object System.IO.FileSystemWatcher ^
  $w.Path = $dir ^
  $w.Filter = $filter ^
  $w.IncludeSubdirectories = $true ^
  $w.EnableRaisingEvents = $true ^
  $onChange = { ^
    $name = $Event.SourceEventArgs.Name ^
    $type = $Event.SourceEventArgs.ChangeType ^
    $time = Get-Date -Format 'HH:mm:ss' ^
    $color = switch ($type) { ^
      'Created' { 'Green' } ^
      'Deleted' { 'Red' } ^
      'Renamed' { 'Cyan' } ^
      default   { 'Yellow' } ^
    } ^
    Write-Host ('  [' + $time + '] ' + $type.ToUpper().PadRight(8) + ' ' + $name) -ForegroundColor $color ^
    if ($name -match '^images\\\\guess\\\\') { ^
      Write-Host '  → syncing guess.json...' -ForegroundColor Magenta ^
      $out = & node (Join-Path $root 'sync-guess.cjs') 2>&1 ^
      Write-Host ($out -join \"`n\") -ForegroundColor Magenta ^
      Write-Host '  → deploying edge functions...' -ForegroundColor Cyan ^
      $d1 = & supabase functions deploy get-guess-categories 2>&1 ^
      $d2 = & supabase functions deploy get-guess-deal 2>&1 ^
      Write-Host ($d1 -join \"`n\") -ForegroundColor DarkCyan ^
      Write-Host ($d2 -join \"`n\") -ForegroundColor DarkCyan ^
      Write-Host '  ✓ Guess categories deployed.' -ForegroundColor Green ^
    } ^
  } ^
  Register-ObjectEvent $w Created  -Action $onChange | Out-Null ^
  Register-ObjectEvent $w Changed  -Action $onChange | Out-Null ^
  Register-ObjectEvent $w Deleted  -Action $onChange | Out-Null ^
  Register-ObjectEvent $w Renamed  -Action $onChange | Out-Null ^
  $watchers += $w ^
  Write-Host ('  Watching: .' + $path.Replace($root, '')) -ForegroundColor DarkCyan ^
} ^
Write-Host '' ^
Write-Host '  Ready. Waiting for changes...' -ForegroundColor White ^
Write-Host '' ^
try { while ($true) { Start-Sleep -Seconds 1; Get-Event | Out-Null } } ^
finally { foreach ($w in $watchers) { $w.Dispose() } }"

echo.
echo  Watcher stopped.
pause
