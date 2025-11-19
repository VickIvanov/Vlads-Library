import { verifyPassword, userExists } from '../../lib/users.js';
import { userExistsInDb, getAllUsersFromDb } from '../../lib/db.js';
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

    // Сначала проверяем администратора
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    if (username === adminUsername && password === adminPassword) {
      await logToDb('info', 'Admin logged in', { username }, req);
      return res.status(200).json({ 
        message: 'Вход выполнен успешно',
        username,
        source: 'admin'
      });
    }

    // Затем проверяем в .env (LIBRARY_USERS)
    if (verifyPassword(username, password)) {
      await logToDb('info', 'User logged in', { username, source: 'env' }, req);
      return res.status(200).json({ 
        message: 'Вход выполнен успешно',
        username,
        source: 'env'
      });
    }

    // Если не найден в .env, проверяем в PostgreSQL БД
    const dbUsers = await getAllUsersFromDb();
    const dbUser = dbUsers.find(u => u.username === username && u.password === password);

    if (dbUser) {
      await logToDb('info', 'User logged in', { username, source: 'database' }, req);
      return res.status(200).json({ 
        message: 'Вход выполнен успешно',
        username,
        source: 'database'
      });
    }

    // ВАЖНО: Проверяем существование пользователя - нельзя войти в незарегистрированный аккаунт
    const existsInDb = await userExistsInDb(username);
    const existsInEnv = userExists(username);
    const isAdminUser = username === adminUsername;
    
    if (isAdminUser) {
      await logToDb('warning', 'Failed admin login attempt', { username }, req);
      return res.status(401).json({ error: 'Неверный пароль администратора' });
    }
    
    if (existsInEnv || existsInDb) {
      await logToDb('warning', 'Failed login attempt - wrong password', { username }, req);
      return res.status(401).json({ error: 'Неверный пароль' });
    }

    await logToDb('warning', 'Failed login attempt - user not found', { username }, req);
    return res.status(401).json({ error: 'Пользователь не зарегистрирован. Пожалуйста, сначала зарегистрируйтесь.' });
  } catch (error) {
    console.error('Ошибка входа:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

