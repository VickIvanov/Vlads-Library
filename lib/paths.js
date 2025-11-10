import { join } from 'path';

/**
 * Универсальная система путей, работающая в любом окружении
 * Использует process.cwd() как базовый путь (работает везде)
 * Поддерживает переменные окружения как опциональные переопределения
 */

// Получаем корневую директорию проекта
// process.cwd() всегда возвращает текущую рабочую директорию, где запущен процесс
const PROJECT_ROOT = process.cwd();

/**
 * Получить путь к файлу базы данных
 * Можно переопределить через переменную окружения DB_FILE
 */
export function getDbPath() {
  // Если указана переменная окружения, используем её
  if (process.env.DB_FILE) {
    // Если абсолютный путь, используем как есть
    if (process.env.DB_FILE.startsWith('/')) {
      return process.env.DB_FILE;
    }
    // Если относительный, добавляем к корню проекта
    return join(PROJECT_ROOT, process.env.DB_FILE);
  }
  // По умолчанию: database.json в корне проекта
  return join(PROJECT_ROOT, 'database.json');
}

/**
 * Получить путь к файлу с книгами
 * Можно переопределить через переменную окружения BOOKS_FILE
 */
export function getBooksFilePath() {
  if (process.env.BOOKS_FILE) {
    if (process.env.BOOKS_FILE.startsWith('/')) {
      return process.env.BOOKS_FILE;
    }
    return join(PROJECT_ROOT, process.env.BOOKS_FILE);
  }
  // По умолчанию: books.json в корне проекта
  return join(PROJECT_ROOT, 'books.json');
}

/**
 * Получить путь к директории с файлами книг
 * Можно переопределить через переменную окружения BOOKS_DIR
 */
export function getBooksDirPath() {
  if (process.env.BOOKS_DIR) {
    if (process.env.BOOKS_DIR.startsWith('/')) {
      return process.env.BOOKS_DIR;
    }
    return join(PROJECT_ROOT, process.env.BOOKS_DIR);
  }
  // По умолчанию: папка books в корне проекта
  return join(PROJECT_ROOT, 'books');
}

/**
 * Получить путь к файлу внутри директории книг
 */
export function getBookFilePath(filename) {
  return join(getBooksDirPath(), filename);
}

