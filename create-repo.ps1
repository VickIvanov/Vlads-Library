# Скрипт для автоматического создания репозитория на GitHub
Write-Host "🚀 Создание репозитория на GitHub..." -ForegroundColor Green

# Проверка авторизации
$authStatus = gh auth status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Вы не авторизованы в GitHub!" -ForegroundColor Red
    Write-Host "Выполните: gh auth login --web" -ForegroundColor Yellow
    exit 1
}

# Имя репозитория
$repoName = "библиотека-Влада"
$description = "Веб-приложение для управления личной библиотекой книг"

Write-Host "📦 Создание репозитория: $repoName" -ForegroundColor Cyan

# Создание репозитория на GitHub
gh repo create $repoName --public --description $description --source=. --remote=origin --push

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Репозиторий успешно создан и код загружен!" -ForegroundColor Green
    Write-Host "🔗 URL: https://github.com/$(gh api user --jq .login)/$repoName" -ForegroundColor Cyan
    Write-Host "`n📋 Следующий шаг: Деплой на Vercel" -ForegroundColor Yellow
    Write-Host "   Перейдите: https://vercel.com/new" -ForegroundColor White
} else {
    Write-Host "`n❌ Ошибка при создании репозитория" -ForegroundColor Red
    Write-Host "Попробуйте создать репозиторий вручную на GitHub" -ForegroundColor Yellow
}

