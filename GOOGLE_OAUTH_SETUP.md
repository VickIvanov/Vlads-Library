# Настройка Google OAuth

## Шаги для настройки входа через Google

### 1. Создание OAuth 2.0 Credentials в Google Cloud Console

1. Перейдите на [Google Cloud Console](https://console.cloud.google.com/)
2. Создайте новый проект или выберите существующий
3. Перейдите в **APIs & Services** → **Credentials**
4. Нажмите **Create Credentials** → **OAuth client ID**
5. Если это первый раз, настройте OAuth consent screen:
   - Выберите **External** (для тестирования) или **Internal** (для корпоративных аккаунтов)
   - Заполните обязательные поля (App name, User support email, Developer contact email)
   - Сохраните и продолжите

### 2. Создание OAuth Client ID

1. Выберите тип приложения: **Web application**
2. Укажите **Authorized redirect URIs**:
   - Для localhost: `http://localhost:5000/api/auth/google/callback`
   - Для Vercel: `https://your-domain.vercel.app/api/auth/google/callback`
   - Для другого сервера: `https://your-domain.com/api/auth/google/callback`
3. Сохраните и скопируйте **Client ID** и **Client Secret**

### 3. Добавление в .env файл

Добавьте следующие переменные в ваш `.env` файл:

```env
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
```

### 4. Для Vercel

Добавьте те же переменные в настройках проекта Vercel:
1. Перейдите в Settings → Environment Variables
2. Добавьте `GOOGLE_CLIENT_ID` и `GOOGLE_CLIENT_SECRET`
3. Убедитесь, что они доступны для всех окружений (Production, Preview, Development)

### 5. Проверка работы

1. Запустите сервер
2. Откройте страницу входа
3. Нажмите "Войти через Google"
4. Выберите аккаунт Google
5. После авторизации вы будете перенаправлены обратно на сайт

## Важные замечания

- **Redirect URI должен точно совпадать** с тем, что указан в Google Cloud Console
- Для localhost используйте `http://localhost:5000`
- Для production используйте полный URL с `https://`
- Google OAuth работает как на localhost, так и на любом другом сервере (Vercel, Heroku, и т.д.)
- Пользователи, вошедшие через Google, автоматически создаются в системе с полями `is_admin: false` и `has_subscription: false`
- Администратор может назначить права через страницу управления пользователями

## Безопасность

- **Никогда не коммитьте** `.env` файл в Git
- Храните `GOOGLE_CLIENT_SECRET` в секрете
- Используйте разные Client ID для разных окружений (development, production)


## Шаги для настройки входа через Google

### 1. Создание OAuth 2.0 Credentials в Google Cloud Console

1. Перейдите на [Google Cloud Console](https://console.cloud.google.com/)
2. Создайте новый проект или выберите существующий
3. Перейдите в **APIs & Services** → **Credentials**
4. Нажмите **Create Credentials** → **OAuth client ID**
5. Если это первый раз, настройте OAuth consent screen:
   - Выберите **External** (для тестирования) или **Internal** (для корпоративных аккаунтов)
   - Заполните обязательные поля (App name, User support email, Developer contact email)
   - Сохраните и продолжите

### 2. Создание OAuth Client ID

1. Выберите тип приложения: **Web application**
2. Укажите **Authorized redirect URIs**:
   - Для localhost: `http://localhost:5000/api/auth/google/callback`
   - Для Vercel: `https://your-domain.vercel.app/api/auth/google/callback`
   - Для другого сервера: `https://your-domain.com/api/auth/google/callback`
3. Сохраните и скопируйте **Client ID** и **Client Secret**

### 3. Добавление в .env файл

Добавьте следующие переменные в ваш `.env` файл:

```env
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
```

### 4. Для Vercel

Добавьте те же переменные в настройках проекта Vercel:
1. Перейдите в Settings → Environment Variables
2. Добавьте `GOOGLE_CLIENT_ID` и `GOOGLE_CLIENT_SECRET`
3. Убедитесь, что они доступны для всех окружений (Production, Preview, Development)

### 5. Проверка работы

1. Запустите сервер
2. Откройте страницу входа
3. Нажмите "Войти через Google"
4. Выберите аккаунт Google
5. После авторизации вы будете перенаправлены обратно на сайт

## Важные замечания

- **Redirect URI должен точно совпадать** с тем, что указан в Google Cloud Console
- Для localhost используйте `http://localhost:5000`
- Для production используйте полный URL с `https://`
- Google OAuth работает как на localhost, так и на любом другом сервере (Vercel, Heroku, и т.д.)
- Пользователи, вошедшие через Google, автоматически создаются в системе с полями `is_admin: false` и `has_subscription: false`
- Администратор может назначить права через страницу управления пользователями

## Безопасность

- **Никогда не коммитьте** `.env` файл в Git
- Храните `GOOGLE_CLIENT_SECRET` в секрете
- Используйте разные Client ID для разных окружений (development, production)





