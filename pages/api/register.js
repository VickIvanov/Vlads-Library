import { userExists, addUserToDb } from '../../lib/users.js';
import { logToDb } from '../../lib/logger.js';
import { ensureDatabaseInitialized } from '../../lib/db-init.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { username, password, userId } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Заполните все поля' });
    }

    // Проверяем длину пароля
    if (password.length < 5) {
      return res.status(400).json({ error: 'Пароль должен содержать минимум 5 символов' });
    }
    
    // Валидация user_id если указан
    let normalizedUserId = null;
    if (userId) {
      // Убираем @ в начале если есть
      normalizedUserId = userId.trim().replace(/^@+/, '');
      
      // Проверяем формат: только буквы, цифры, подчеркивания, дефисы
      if (!/^[a-zA-Z0-9_\-]+$/.test(normalizedUserId)) {
        return res.status(400).json({ 
          error: 'ID может содержать только буквы, цифры, подчеркивания и дефисы' 
        });
      }
      
      // Проверяем длину
      if (normalizedUserId.length < 3) {
        return res.status(400).json({ error: 'ID должен содержать минимум 3 символа' });
      }
      
      if (normalizedUserId.length > 30) {
        return res.status(400).json({ error: 'ID не должен превышать 30 символов' });
      }
      
      // Добавляем @ в начало
      normalizedUserId = '@' + normalizedUserId;
    }

    // Проверяем, не существует ли пользователь в .env
    if (userExists(username)) {
      return res.status(400).json({ error: 'Пользователь с таким именем уже существует в системе (.env)' });
    }

    // Инициализируем БД перед регистрацией
    const dbInitialized = await ensureDatabaseInitialized();
    if (!dbInitialized) {
      return res.status(500).json({ 
        error: 'База данных не настроена',
        details: 'Создайте PostgreSQL базу данных:\n\n1. Откройте проект на Vercel (https://vercel.com/dashboard)\n2. Перейдите в раздел "Storage" (Хранилище)\n3. Нажмите "Create Database" (Создать базу данных)\n4. Выберите любой PostgreSQL провайдер:\n   - Neon (Serverless Postgres) - рекомендуется\n   - Prisma Postgres\n   - Supabase\n   - Или любой другой PostgreSQL\n5. После создания Vercel автоматически добавит переменные окружения\n6. Перезапустите деплой (Deployments → последний деплой → Redeploy)\n\nПосле этого приложение автоматически подключится к базе данных.'
      });
    }

    // Добавляем пользователя в PostgreSQL БД
    const result = await addUserToDb(username, password, normalizedUserId);
    if (result.success) {
      try {
        await logToDb('info', 'User registered', { username }, req);
      } catch (logError) {
        // Игнорируем ошибки логирования
      }
      res.status(200).json({ message: `Пользователь ${username} зарегистрирован!` });
    } else {
      try {
        await logToDb('warning', 'Registration failed', { username, reason: result.message }, req);
      } catch (logError) {
        // Игнорируем ошибки логирования
      }
      // Если есть детали, возвращаем их отдельно
      if (result.details) {
        res.status(500).json({ 
          error: result.message || 'Ошибка регистрации',
          details: result.details
        });
      } else {
        res.status(400).json({ error: result.message || 'Ошибка регистрации' });
      }
    }
  } catch (error) {
    console.error('Ошибка регистрации:', error);
    
    // Проверяем, связана ли ошибка с БД
    if (error.message && (
      error.message.includes('Не найдена переменная окружения') ||
      error.message.includes('Не удалось подключиться') ||
      error.message.includes('connection') ||
      error.message.includes('ECONNREFUSED')
    )) {
      return res.status(500).json({ 
        error: 'База данных не настроена',
        details: 'Создайте PostgreSQL базу данных:\n\n1. Откройте проект на Vercel (https://vercel.com/dashboard)\n2. Перейдите в раздел "Storage" (Хранилище)\n3. Нажмите "Create Database" (Создать базу данных)\n4. Выберите любой PostgreSQL провайдер:\n   - Neon (Serverless Postgres) - рекомендуется\n   - Prisma Postgres\n   - Supabase\n   - Или любой другой PostgreSQL\n5. После создания Vercel автоматически добавит переменные окружения\n6. Перезапустите деплой (Deployments → последний деплой → Redeploy)\n\nПосле этого приложение автоматически подключится к базе данных.'
      });
    }
    
    try {
      await logToDb('error', 'Registration error', { error: error.message }, req);
    } catch (logError) {
      // Игнорируем ошибки логирования
    }
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}
