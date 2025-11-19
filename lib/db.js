// Экспортируем функции из PostgreSQL модуля
// Этот файл теперь является обёрткой для обратной совместимости
export {
  initDatabase,
  getAllUsersFromDb,
  addUserToDb,
  userExistsInDb,
  getAllBooks,
  addBook,
  deleteBook,
  getBookmarks,
  addBookmark,
  deleteBookmark,
  getSettings,
  saveSettings
} from './db-pg.js';
