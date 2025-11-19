import { getAllUsers, getUsersFromEnv } from '../../lib/users.js';
import { getAllUsersFromDb } from '../../lib/db.js';
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

