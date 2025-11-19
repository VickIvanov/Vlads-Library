import { userExists, addUserToDb } from '../../lib/users.js';
import { logToDb } from '../../lib/logger.js';
import { ensureDatabaseInitialized } from '../../lib/db-init.js';

export default async function handler(req, res) {
  // Инициализируем БД при первом запросе
  await ensureDatabaseInitialized();
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Заполните все поля' });
    }

    // Проверяем длину пароля
    if (password.length < 5) {
      return res.status(400).json({ error: 'Пароль должен содержать минимум 5 символов' });
    }

    // Проверяем, не существует ли пользователь в .env
    if (userExists(username)) {
      return res.status(400).json({ error: 'Пользователь с таким именем уже существует в системе (.env)' });
    }

    // Добавляем пользователя в PostgreSQL БД
    const result = await addUserToDb(username, password);
    if (result.success) {
      await logToDb('info', 'User registered', { username }, req);
      res.status(200).json({ message: `Пользователь ${username} зарегистрирован!` });
    } else {
      await logToDb('warning', 'Registration failed', { username, reason: result.message }, req);
      res.status(400).json({ error: result.message || 'Ошибка регистрации' });
    }
  } catch (error) {
    console.error('Ошибка регистрации:', error);
    await logToDb('error', 'Registration error', { error: error.message }, req);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}
