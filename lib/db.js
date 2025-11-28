// Экспортируем функции из PostgreSQL модуля
// Этот файл теперь является обёрткой для обратной совместимости
export {
  initDatabase,
  getAllUsersFromDb,
  addUserToDb,
  userExistsInDb,
  deleteUserFromDb,
  getAllBooks,
  addBook,
  deleteBook,
  getBookmarks,
  addBookmark,
  deleteBookmark,
  getSettings,
  saveSettings,
  sendMessage,
  getConversation,
  getUserChats,
  markMessagesAsRead,
  getUnreadCount,
  addToFavorites,
  removeFromFavorites,
  getUserFavorites,
  isBookInFavorites
} from './db-pg.js';
