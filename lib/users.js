// Утилита для работы с пользователями из .env
// Next.js автоматически загружает .env файлы
// Для локальной разработки создайте .env файл в корне проекта
// На Vercel добавьте переменные окружения в настройках проекта

// Парсим пользователей из переменной окружения LIBRARY_USERS
// Формат: username1:password1,username2:password2
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

// Получить всех пользователей из .env
export function getUsersFromEnv() {
  return parseUsersFromEnv();
}

// Проверить существует ли пользователь
export function userExists(username) {
  const users = parseUsersFromEnv();
  return users.some(u => u.username === username);
}

// Проверить правильность пароля
export function verifyPassword(username, password) {
  const users = parseUsersFromEnv();
  const user = users.find(u => u.username === username);
  return user && user.password === password;
}

// Добавить пользователя в PostgreSQL БД
export async function addUserToDb(username, password) {
  // Проверяем также в .env
  if (userExists(username)) {
    return { success: false, message: 'Пользователь уже существует в .env' };
  }
  
  // Проверяем в PostgreSQL
  const { userExistsInDb, addUserToDb: addUser } = await import('./db-pg.js');
  if (await userExistsInDb(username)) {
    return { success: false, message: 'Пользователь уже существует' };
  }
  
  // Добавляем в PostgreSQL
  return await addUser(username, password);
}

// Получить всех пользователей (из .env и из PostgreSQL БД)
export async function getAllUsers() {
  const envUsers = parseUsersFromEnv();
  const { getAllUsersFromDb } = await import('./db-pg.js');
  const dbUsers = await getAllUsersFromDb();
  
  // Объединяем пользователей из .env и из БД
  return {
    envUsers: envUsers.map(u => ({ username: u.username, source: 'env' })),
    dbUsers: dbUsers.map(u => ({ username: u.username, source: 'database' }))
  };
}

// Проверить является ли пользователь админом
export function isAdmin(username) {
  if (!username) return false;
  
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  return username === adminUsername;
}
