# Скрипт для автоматической настройки GitHub репозитория
# Требуется: Git должен быть установлен

Write-Host "🚀 Настройка репозитория для GitHub..." -ForegroundColor Green

# Проверка наличия Git
try {
    $gitVersion = git --version
    Write-Host "✅ Git найден: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Git не установлен!" -ForegroundColor Red
    Write-Host "📥 Скачайте Git: https://git-scm.com/download/win" -ForegroundColor Yellow
    Write-Host "После установки запустите этот скрипт снова." -ForegroundColor Yellow
    pause
    exit
}

# Проверка, инициализирован ли уже репозиторий
if (Test-Path .git) {
    Write-Host "⚠️  Git репозиторий уже инициализирован" -ForegroundColor Yellow
    $continue = Read-Host "Продолжить? (y/n)"
    if ($continue -ne "y") {
        exit
    }
} else {
    Write-Host "📦 Инициализация Git репозитория..." -ForegroundColor Cyan
    git init
}

# Добавление всех файлов
Write-Host "📝 Добавление файлов..." -ForegroundColor Cyan
git add .

# Создание первого коммита
Write-Host "💾 Создание коммита..." -ForegroundColor Cyan
git commit -m "Initial commit: Библиотека Влада"

# Переименование ветки в main
Write-Host "🌿 Настройка ветки main..." -ForegroundColor Cyan
git branch -M main

Write-Host "`n✅ Локальный репозиторий готов!" -ForegroundColor Green
Write-Host "`n📋 Следующие шаги:" -ForegroundColor Yellow
Write-Host "1. Создайте репозиторий на GitHub:" -ForegroundColor White
Write-Host "   https://github.com/new" -ForegroundColor Cyan
Write-Host "   Название: библиотека-Влада" -ForegroundColor White
Write-Host "   НЕ добавляйте README, .gitignore или лицензию" -ForegroundColor White
Write-Host "`n2. После создания репозитория, выполните:" -ForegroundColor White
Write-Host "   git remote add origin https://github.com/YOUR_USERNAME/библиотека-Влада.git" -ForegroundColor Cyan
Write-Host "   git push -u origin main" -ForegroundColor Cyan
Write-Host "`n   (Замените YOUR_USERNAME на ваш GitHub username)" -ForegroundColor Gray

$username = Read-Host "`nВведите ваш GitHub username (или нажмите Enter, чтобы пропустить)"
if ($username) {
    $repoName = "библиотека-Влада"
    Write-Host "`n🔗 Добавление remote репозитория..." -ForegroundColor Cyan
    git remote add origin "https://github.com/$username/$repoName.git" 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Remote добавлен!" -ForegroundColor Green
        Write-Host "`n📤 Отправка кода на GitHub..." -ForegroundColor Cyan
        Write-Host "   (Вам может потребоваться ввести логин и пароль)" -ForegroundColor Yellow
        git push -u origin main
    } else {
        Write-Host "⚠️  Remote уже существует или репозиторий еще не создан на GitHub" -ForegroundColor Yellow
        Write-Host "   Создайте репозиторий на GitHub сначала, затем выполните:" -ForegroundColor White
        Write-Host "   git remote add origin https://github.com/$username/$repoName.git" -ForegroundColor Cyan
        Write-Host "   git push -u origin main" -ForegroundColor Cyan
    }
}

Write-Host "`n✨ Готово! Репозиторий настроен." -ForegroundColor Green
pause

