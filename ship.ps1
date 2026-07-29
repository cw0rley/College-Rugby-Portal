# ship.ps1 - Save, commit, push, build, and deploy in one step.
#
# Usage:
#   .\ship.ps1 "your commit message"
#   npm run ship -- "your commit message"
#
# Steps: run tests -> stage all -> commit -> push -> build -> deploy hosting.
# Aborts immediately if any step fails.

param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$Message
)

$ErrorActionPreference = "Stop"

# Always run against the repo this script lives in, no matter where it's invoked.
Set-Location -Path $PSScriptRoot

function Step($label, $block) {
    Write-Host "`n=== $label ===" -ForegroundColor Cyan
    & $block
    if ($LASTEXITCODE -ne $null -and $LASTEXITCODE -ne 0) {
        Write-Host "FAILED: $label (exit $LASTEXITCODE)" -ForegroundColor Red
        exit $LASTEXITCODE
    }
}

# 1. Tests must pass before anything is committed or shipped.
Step "Running tests" { npm test }

# 2. Stage everything. If there is nothing to commit, keep going (deploy-only reship is valid).
Write-Host "`n=== Staging + committing ===" -ForegroundColor Cyan
git add -A
git diff --cached --quiet
if ($LASTEXITCODE -eq 0) {
    Write-Host "No changes to commit - proceeding to build + deploy." -ForegroundColor Yellow
} else {
    git commit -m $Message
    if ($LASTEXITCODE -ne 0) { Write-Host "FAILED: commit" -ForegroundColor Red; exit 1 }
    Step "Pushing to origin" { git push }
}

# 3. Build the production bundle.
Step "Building" { npm run build }

# 4. Deploy frontend (hosting only; functions deploy separately when changed).
Step "Deploying hosting" { firebase deploy --only hosting }

Write-Host "`nShipped: $Message" -ForegroundColor Green
Write-Host "Reminder: click 'Publish Changes' in /admin if Firestore data changed." -ForegroundColor Yellow
