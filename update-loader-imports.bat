@echo off
echo Starting the import update process...

powershell -Command "Get-ChildItem -Path src -Filter *.tsx -Recurse | ForEach-Object { $content = Get-Content -Path $_.FullName; $updated = $content -replace 'import Loader from (.*)Loader', 'import { Loader } from $1Loader'; if ($updated -ne $content) { $updated | Set-Content -Path $_.FullName; Write-Host 'Updated: ' $_.FullName } }"

echo Done updating imports. 