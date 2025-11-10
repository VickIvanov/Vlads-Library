# Скрипт для загрузки кода на GitHub после создания репозитория
Write-Host "📤 Загрузка кода на GitHub..." -ForegroundColor Green

# Проверка наличия remote
$remote = git remote get-url origin 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Remote уже настроен: $remote" -ForegroundColor Green
} else {
    Write-Host "⚠️  Remote не настроен" -ForegroundColor Yellow
    $username = Read-Host "Введите ваш GitHub username"
    if ($username) {
        git remote add origin "https://github.com/$username/библиотека-Влада.git"
        Write-Host "✅ Remote добавлен!" -ForegroundColor Green
    } else {
        Write-Host "❌ Не удалось добавить remote" -ForegroundColor Red
        exit 1
    }
}

# Отправка кода
Write-Host "`n📤 Отправка кода на GitHub..." -ForegroundColor Cyan
git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Код успешно загружен на GitHub!" -ForegroundColor Green
    $repoUrl = git remote get-url origin
    Write-Host "🔗 Репозиторий: $repoUrl" -ForegroundColor Cyan
} else {
    Write-Host "`n❌ Ошибка при отправке кода" -ForegroundColor Red
    Write-Host "Убедитесь, что репозиторий создан на GitHub" -ForegroundColor Yellow
}

