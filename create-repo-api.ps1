# Create repository via GitHub API
Write-Host "Creating repository on GitHub via API..." -ForegroundColor Green

$token = gh auth token 2>$null
if (-not $token) {
    Write-Host "Token not found. Run: gh auth login --web" -ForegroundColor Red
    exit 1
}

$headers = @{
    "Authorization" = "token $token"
    "Accept" = "application/vnd.github.v3+json"
}

$body = @{
    name = "библиотека-Влада"
    description = "Web application for personal library management"
    "public" = $true
} | ConvertTo-Json

try {
    Write-Host "Creating repository..." -ForegroundColor Cyan
    $response = Invoke-RestMethod -Uri "https://api.github.com/user/repos" -Method Post -Headers $headers -Body $body -ContentType "application/json"
    
    Write-Host "Repository created!" -ForegroundColor Green
    Write-Host "URL: $($response.html_url)" -ForegroundColor Cyan
    
    # Add remote
    Write-Host "`nSetting up remote..." -ForegroundColor Cyan
    git remote remove origin 2>$null
    git remote add origin $response.clone_url
    
    # Push code
    Write-Host "Pushing code..." -ForegroundColor Cyan
    git push -u origin main
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`nCode successfully pushed to GitHub!" -ForegroundColor Green
        Write-Host "Repository: $($response.html_url)" -ForegroundColor Cyan
    }
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    if ($_.Exception.Response.StatusCode -eq 422) {
        Write-Host "Repository already exists or name is taken" -ForegroundColor Yellow
    }
}
