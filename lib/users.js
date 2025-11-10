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

// Добавить пользователя (для динамического добавления в JSON БД)
// Это дополнительная функция для пользователей не из .env
export async function addUserToDb(username, password) {
  const dbModule = await import('./db.js');
  const db = await dbModule.readDb();
  const users = db.users || [];
  
  // Проверяем, не существует ли уже такой пользователь
  if (users.some(u => u.username === username)) {
    return { success: false, message: 'Пользователь уже существует' };
  }
  
  // Проверяем также в .env
  if (userExists(username)) {
    return { success: false, message: 'Пользователь уже существует в .env' };
  }
  
  users.push({ username, password, created_at: new Date().toISOString() });
  db.users = users;
  
  const success = await dbModule.writeDb(db);
  return success ? { success: true } : { success: false, message: 'Ошибка сохранения' };
}

// Получить всех пользователей (из .env и из JSON БД)
export async function getAllUsers() {
  const envUsers = parseUsersFromEnv();
  const dbModule = await import('./db.js');
  const db = await dbModule.readDb();
  const dbUsers = db.users || [];
  
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
