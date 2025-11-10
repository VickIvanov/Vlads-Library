import { readFile, writeFile } from 'fs/promises';
import { getDbPath, getBooksFilePath, getBooksDirPath, getBookFilePath } from './paths.js';

// Получаем пути через универсальную систему
const DB_PATH = getDbPath();
const BOOKS_PATH = getBooksFilePath();

// Функция для нормализации названия в ID
function normalizeTitleToId(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9а-яё\s-]/gi, '') // Удаляем спецсимволы, оставляем буквы, цифры, пробелы и дефисы
    .replace(/\s+/g, '_') // Заменяем пробелы на подчеркивания
    .replace(/-+/g, '_') // Заменяем дефисы на подчеркивания
    .replace(/_+/g, '_') // Убираем множественные подчеркивания
    .replace(/^_+|_+$/g, ''); // Убираем подчеркивания в начале и конце
}

// Чтение базы данных
export async function readDb() {
  try {
    const data = await readFile(DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // Если файл не существует, создаем пустую структуру
    if (error.code === 'ENOENT') {
      const defaultDb = {
        users: [],
        books: [],
        settings: {
          background: null,
          backgroundType: 'default'
        }
      };
      await writeDb(defaultDb);
      return defaultDb;
    }
    throw error;
  }
}

// Запись базы данных
export async function writeDb(data) {
  try {
    await writeFile(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Ошибка записи БД:', error);
    return false;
  }
}

// Чтение файла с книгами
async function readBooksFile() {
  try {
    console.log('Reading books file from:', BOOKS_PATH);
    const data = await readFile(BOOKS_PATH, 'utf-8');
    const books = JSON.parse(data);
    console.log('Books file read successfully, count:', Array.isArray(books) ? books.length : 'not an array');
    return Array.isArray(books) ? books : [];
  } catch (error) {
    console.error('Error reading books file:', error.code, error.message);
    // Если файл не существует, пытаемся создать пустую структуру
    if (error.code === 'ENOENT') {
      console.log('Books file not found, creating empty array');
      const defaultBooks = [];
      // Пытаемся создать файл, но не падаем, если не получилось (например, на Vercel в режиме только чтения)
      try {
        await writeBooksFile(defaultBooks);
        console.log('Empty books file created');
      } catch (writeError) {
        console.warn('Не удалось создать файл books.json, возвращаем пустой массив:', writeError.message);
      }
      return defaultBooks;
    }
    // Для других ошибок логируем и возвращаем пустой массив
    console.error('Ошибка чтения файла с книгами:', error);
    return [];
  }
}

// Запись файла с книгами
async function writeBooksFile(books) {
  try {
    await writeFile(BOOKS_PATH, JSON.stringify(books, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Ошибка записи файла с книгами:', error);
    return false;
  }
}

// Получить все книги
export async function getAllBooks() {
  try {
    return await readBooksFile();
  } catch (error) {
    console.error('Ошибка получения книг:', error);
    // Возвращаем пустой массив вместо ошибки
    return [];
  }
}

// Добавить книгу
export async function addBook(bookData) {
  const books = await readBooksFile();
  
  // Используем название книги как ID
  if (!bookData.title) {
    return { success: false, message: 'Название книги обязательно' };
  }
  
  const bookId = normalizeTitleToId(bookData.title);
  
  // Проверяем, не существует ли книга с таким ID (названием)
  if (books.some(b => b.id === bookId)) {
    return { success: false, message: 'Книга с таким названием уже существует' };
  }
  
  // Устанавливаем ID как нормализованное название
  bookData.id = bookId;
  
  // Добавляем дату создания
  bookData.created_at = new Date().toISOString();
  
  books.push(bookData);
  
  const success = await writeBooksFile(books);
  return success 
    ? { success: true, id: bookData.id }
    : { success: false, message: 'Ошибка сохранения' };
}

// Удалить книгу
export async function deleteBook(id) {
  const books = await readBooksFile();
  
  // ID теперь строка (название), не число
  const bookIndex = books.findIndex(b => b.id === id);
  if (bookIndex === -1) {
    return { success: false, message: 'Книга не найдена' };
  }
  
  const book = books[bookIndex];
  
  // Удаляем файл книги, если он есть
  if (book.book_file) {
    try {
      const { unlink } = await import('fs/promises');
      const filePath = getBookFilePath(book.book_file);
      await unlink(filePath);
    } catch (error) {
      // Игнорируем ошибку, если файл не найден
      if (error.code !== 'ENOENT') {
        console.error('Ошибка удаления файла книги:', error);
      }
    }
  }
  
  books.splice(bookIndex, 1);
  
  const success = await writeBooksFile(books);
  return success 
    ? { success: true }
    : { success: false, message: 'Ошибка удаления' };
}

// Получить все закладки для книги
export async function getBookmarks(filename) {
  const db = await readDb();
  if (!db.bookmarks) {
    db.bookmarks = [];
    await writeDb(db);
  }
  return db.bookmarks.filter(b => b.filename === filename);
}

// Добавить закладку
export async function addBookmark(bookmarkData) {
  const db = await readDb();
  if (!db.bookmarks) {
    db.bookmarks = [];
  }
  
  const bookmark = {
    id: Date.now().toString(),
    filename: bookmarkData.filename,
    page: bookmarkData.page,
    title: bookmarkData.title || `Закладка на странице ${bookmarkData.page + 1}`,
    createdAt: new Date().toISOString()
  };
  
  db.bookmarks.push(bookmark);
  const success = await writeDb(db);
  return success 
    ? { success: true, bookmark }
    : { success: false, message: 'Ошибка сохранения закладки' };
}

// Удалить закладку
export async function deleteBookmark(id) {
  const db = await readDb();
  if (!db.bookmarks) {
    return { success: false, message: 'Закладка не найдена' };
  }
  
  const bookmarkIndex = db.bookmarks.findIndex(b => b.id === id);
  if (bookmarkIndex === -1) {
    return { success: false, message: 'Закладка не найдена' };
  }
  
  db.bookmarks.splice(bookmarkIndex, 1);
  const success = await writeDb(db);
  return success 
    ? { success: true }
    : { success: false, message: 'Ошибка удаления закладки' };
}
