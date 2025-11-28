import { getAllUsers, getUsersFromEnv, isAdmin } from '../../lib/users.js';
import { getAllUsersFromDb, deleteUserFromDb } from '../../lib/db.js';
import { logToDb } from '../../lib/logger.js';
import { ensureDatabaseInitialized } from '../../lib/db-init.js';

// Парсим пользователей из .env для получения паролей
function parseUsersFromEnv() {
  const usersEnv = process.env.LIBRARY_USERS || '';
  const users = [];
  
  if (!usersEnv.trim()) {
    return users;
  }
  
  const userPairs = usersEnv.split(',').map(pair => pair.trim()).filter(Boolean);
  
  for (const pair of userPairs) {
    const [username, password] = pair.split(':').map(s => s.trim());
    if (username && password) {
      users.push({ username, password });
    }
  }
  
  return users;
}

export default async function handler(req, res) {
  // Инициализируем БД при первом запросе
  await ensureDatabaseInitialized();
  
  if (req.method === 'DELETE') {
    // Удаление пользователя (только для админа)
    const { username: adminUsername } = req.query;
    const { username } = req.body;
    
    // Проверяем права админа
    if (!adminUsername || !isAdmin(adminUsername)) {
      return res.status(403).json({ error: 'Доступ запрещен. Только администратор может удалять пользователей.' });
    }
    
    if (!username) {
      return res.status(400).json({ error: 'Имя пользователя не указано' });
    }
    
    // Нельзя удалить самого себя
    if (username === adminUsername) {
      return res.status(400).json({ error: 'Нельзя удалить самого себя' });
    }
    
    // Нельзя удалить админа
    const adminUsernameEnv = process.env.ADMIN_USERNAME || 'admin';
    if (username === adminUsernameEnv) {
      return res.status(400).json({ error: 'Нельзя удалить администратора' });
    }
    
    try {
      const result = await deleteUserFromDb(username);
      
      if (result.success) {
        try {
          await logToDb('info', 'User deleted by admin', { deletedUser: username, admin: adminUsername }, req);
        } catch (logError) {
          // Игнорируем ошибки логирования
        }
        return res.status(200).json({ message: result.message || 'Пользователь удален' });
      } else {
        return res.status(400).json({ error: result.message || 'Ошибка удаления пользователя' });
      }
    } catch (error) {
      console.error('Ошибка удаления пользователя:', error);
      try {
        await logToDb('error', 'Failed to delete user', { username, error: error.message }, req);
      } catch (logError) {
        // Игнорируем ошибки логирования
      }
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Получаем пользователей из PostgreSQL
    const dbUsers = await getAllUsersFromDb();
    
    // Получаем пароли из .env
    const envUsersWithPasswords = parseUsersFromEnv();
    
    // Объединяем всех пользователей с паролями
    const allUsers = [
      ...envUsersWithPasswords.map(u => ({ 
        username: u.username, 
        password: u.password,
        source: 'env' 
      })),
      ...dbUsers.map(u => ({ 
        username: u.username || u.email, 
        password: u.password || null,
        email: u.email,
        name: u.name,
        user_id: u.user_id,
        source: 'database',
        auth_method: u.auth_method || 'password',
        created_at: u.created_at
      }))
    ];

    // Убираем дубликаты по username (приоритет у пользователей из .env)
    const uniqueUsers = [];
    const seenUsernames = new Set();
    
    // Сначала добавляем пользователей из .env
    for (const user of envUsersWithPasswords) {
      if (!seenUsernames.has(user.username)) {
        seenUsernames.add(user.username);
        uniqueUsers.push({
          username: user.username,
          password: user.password,
          source: 'env'
        });
      }
    }
    
    // Затем добавляем пользователей из БД (если их еще нет)
    for (const user of dbUsers) {
      const username = user.username || user.email;
      if (username && !seenUsernames.has(username)) {
        seenUsernames.add(username);
        uniqueUsers.push({
          username: username,
          password: user.password || null,
          email: user.email,
          name: user.name,
          user_id: user.user_id,
          source: 'database',
          auth_method: user.auth_method || 'password',
          created_at: user.created_at
        });
      }
    }

    await logToDb('info', 'Users list requested', { count: uniqueUsers.length }, req);
    res.status(200).json(uniqueUsers);
  } catch (error) {
    console.error('Ошибка получения пользователей:', error);
    await logToDb('error', 'Failed to get users', { error: error.message }, req);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

