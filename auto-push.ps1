# Auto-push script
Write-Host "Checking if repository exists..." -ForegroundColor Cyan

$username = "VickIvanov"
$repoName = "библиотека-Влада"
$maxAttempts = 30
$attempt = 0

while ($attempt -lt $maxAttempts) {
    $attempt++
    Write-Host "Attempt $attempt/$maxAttempts..." -ForegroundColor Gray
    
    git remote remove origin 2>$null
    git remote add origin "https://github.com/$username/$repoName.git" 2>$null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Remote added, pushing code..." -ForegroundColor Green
        $pushOutput = git push -u origin main 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "`nCode successfully pushed to GitHub!" -ForegroundColor Green
            Write-Host "Repository: https://github.com/$username/$repoName" -ForegroundColor Cyan
            exit 0
        } else {
            Write-Host "Repository not found yet, waiting..." -ForegroundColor Yellow
        }
    }
    
    Start-Sleep -Seconds 2
}

Write-Host "`nTimeout. Repository not created yet." -ForegroundColor Yellow
Write-Host "Please create repository manually and run push-to-github.ps1" -ForegroundColor White
