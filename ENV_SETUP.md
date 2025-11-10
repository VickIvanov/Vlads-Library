# Настройка .env файла

## Локальная разработка

1. Создайте файл `.env` в корне проекта
2. Добавьте в него следующий контент:
   ```env
# Пользователи библиотеки (формат: username1:password1,username2:password2)
LIBRARY_USERS=admin:admin123,user:user123

# Администратор (для добавления книг)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
   
   # Секретный ключ для сессий (опционально)
   SESSION_SECRET=your-secret-key-here
   
   # Окружение
   NODE_ENV=development
   ```

## Развертывание на Vercel

1. Перейдите в настройки проекта на Vercel
2. Откройте раздел "Environment Variables"
3. Добавьте переменную `LIBRARY_USERS` со значением:
   ```
   admin:admin123,user:user123
   ```

## Формат пользователей

- Формат: `username1:password1,username2:password2`
- Можно добавить несколько пользователей через запятую
- Пользователи из `.env` имеют приоритет над пользователями из JSON БД

## Дополнительные переменные

- `SESSION_SECRET` - секретный ключ для сессий (опционально)
- `NODE_ENV` - окружение (development/production)
- `LOCAL_BACKGROUNDS` - список фонов для localhost (формат: `local1.svg,local2.svg,local3.svg`)
- `VERCEL_BACKGROUNDS` - список фонов для Vercel (формат: `space1.svg,space2.svg,space3.svg`)

## Важно

- Файл `.env` НЕ должен попадать в git (уже добавлен в .gitignore)
- На Vercel используйте Environment Variables в настройках проекта
- Пользователи из `.env` используются для логина в первую очередь


## Локальная разработка

1. Создайте файл `.env` в корне проекта
2. Добавьте в него следующий контент:
   ```env
# Пользователи библиотеки (формат: username1:password1,username2:password2)
LIBRARY_USERS=admin:admin123,user:user123

# Администратор (для добавления книг)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
   
   # Секретный ключ для сессий (опционально)
   SESSION_SECRET=your-secret-key-here
   
   # Окружение
   NODE_ENV=development
   ```

## Развертывание на Vercel

1. Перейдите в настройки проекта на Vercel
2. Откройте раздел "Environment Variables"
3. Добавьте переменную `LIBRARY_USERS` со значением:
   ```
   admin:admin123,user:user123
   ```

## Формат пользователей

- Формат: `username1:password1,username2:password2`
- Можно добавить несколько пользователей через запятую
- Пользователи из `.env` имеют приоритет над пользователями из JSON БД

## Дополнительные переменные

- `SESSION_SECRET` - секретный ключ для сессий (опционально)
- `NODE_ENV` - окружение (development/production)
- `LOCAL_BACKGROUNDS` - список фонов для localhost (формат: `local1.svg,local2.svg,local3.svg`)
- `VERCEL_BACKGROUNDS` - список фонов для Vercel (формат: `space1.svg,space2.svg,space3.svg`)

## Важно

- Файл `.env` НЕ должен попадать в git (уже добавлен в .gitignore)
- На Vercel используйте Environment Variables в настройках проекта
- Пользователи из `.env` используются для логина в первую очередь

