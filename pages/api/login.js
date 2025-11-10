import { verifyPassword, userExists } from '../../lib/users.js';
import { readDb } from '../../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Заполните все поля' });
    }

    // Сначала проверяем администратора
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    if (username === adminUsername && password === adminPassword) {
      return res.status(200).json({ 
        message: 'Вход выполнен успешно',
        username,
        source: 'admin'
      });
    }

    // Затем проверяем в .env (LIBRARY_USERS)
    if (verifyPassword(username, password)) {
      return res.status(200).json({ 
        message: 'Вход выполнен успешно',
        username,
        source: 'env'
      });
    }

    // Если не найден в .env, проверяем в JSON БД
    const db = await readDb();
    const dbUsers = db.users || [];
    const dbUser = dbUsers.find(u => u.username === username && u.password === password);

    if (dbUser) {
      return res.status(200).json({ 
        message: 'Вход выполнен успешно',
        username,
        source: 'database'
      });
    }

    // ВАЖНО: Проверяем существование пользователя - нельзя войти в незарегистрированный аккаунт
    const existsInDb = dbUsers.some(u => u.username === username);
    const existsInEnv = userExists(username);
    const isAdminUser = username === adminUsername;
    
    if (isAdminUser) {
      return res.status(401).json({ error: 'Неверный пароль администратора' });
    }
    
    if (existsInEnv || existsInDb) {
      return res.status(401).json({ error: 'Неверный пароль' });
    }

    return res.status(401).json({ error: 'Пользователь не зарегистрирован. Пожалуйста, сначала зарегистрируйтесь.' });
  } catch (error) {
    console.error('Ошибка входа:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

