import { sql } from '@vercel/postgres';
import { getBooksDirPath, getBookFilePath } from './paths.js';
import { logToDb } from './logger.js';

// Функция для нормализации названия в ID
function normalizeTitleToId(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9а-яё\s-]/gi, '')
    .replace(/\s+/g, '_')
    .replace(/-+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

// Инициализация БД (создание таблиц если их нет)
export async function initDatabase() {
  try {
    // Создаем таблицу пользователей
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        name VARCHAR(255),
        auth_method VARCHAR(50) DEFAULT 'password',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Устанавливаем кодировку UTF-8 для поддержки кириллицы
    await sql`SET client_encoding TO 'UTF8'`;

    // Создаем таблицу книг
    await sql`
      CREATE TABLE IF NOT EXISTS books (
        id VARCHAR(255) PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        author VARCHAR(255) NOT NULL,
        genre VARCHAR(255) NOT NULL,
        description TEXT,
        cover TEXT,
        book_file VARCHAR(500),
        file_format VARCHAR(50) DEFAULT 'txt',
        added_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Создаем таблицу закладок
    await sql`
      CREATE TABLE IF NOT EXISTS bookmarks (
        id VARCHAR(255) PRIMARY KEY,
        filename VARCHAR(500) NOT NULL,
        page INTEGER NOT NULL,
        title VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Создаем таблицу настроек
    await sql`
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        key VARCHAR(255) UNIQUE NOT NULL,
        value TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Создаем таблицу логов
    await sql`
      CREATE TABLE IF NOT EXISTS logs (
        id SERIAL PRIMARY KEY,
        level VARCHAR(50) NOT NULL,
        message TEXT NOT NULL,
        context JSONB,
        user_id VARCHAR(255),
        ip_address VARCHAR(50),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Создаем индексы для производительности
    await sql`CREATE INDEX IF NOT EXISTS idx_books_author ON books(author)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_books_genre ON books(genre)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_bookmarks_filename ON bookmarks(filename)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level)`;

    await logToDb('info', 'Database initialized successfully');
    return true;
  } catch (error) {
    console.error('Ошибка инициализации БД:', error);
    await logToDb('error', 'Database initialization failed', { error: error.message });
    return false;
  }
}

// ============ ПОЛЬЗОВАТЕЛИ ============

// Получить всех пользователей из БД
export async function getAllUsersFromDb() {
  try {
    const result = await sql`SELECT * FROM users ORDER BY created_at DESC`;
    return result.rows;
  } catch (error) {
    console.error('Ошибка получения пользователей:', error);
    await logToDb('error', 'Failed to get users', { error: error.message });
    return [];
  }
}

// Добавить пользователя в БД
export async function addUserToDb(username, password, email = null, name = null) {
  try {
    const result = await sql`
      INSERT INTO users (username, password, email, name)
      VALUES (${username}, ${password}, ${email}, ${name})
      RETURNING *
    `;
    await logToDb('info', 'User added to database', { username });
    return { success: true, user: result.rows[0] };
  } catch (error) {
    if (error.code === '23505') { // Unique violation
      await logToDb('warning', 'User already exists', { username });
      return { success: false, message: 'Пользователь уже существует' };
    }
    console.error('Ошибка добавления пользователя:', error);
    await logToDb('error', 'Failed to add user', { username, error: error.message });
    return { success: false, message: 'Ошибка сохранения' };
  }
}

// Проверить существует ли пользователь в БД
export async function userExistsInDb(username) {
  try {
    const result = await sql`SELECT COUNT(*) as count FROM users WHERE username = ${username}`;
    return parseInt(result.rows[0].count) > 0;
  } catch (error) {
    console.error('Ошибка проверки пользователя:', error);
    return false;
  }
}

// ============ КНИГИ ============

// Получить все книги
export async function getAllBooks() {
  try {
    const result = await sql`SELECT * FROM books ORDER BY created_at DESC`;
    return result.rows;
  } catch (error) {
    console.error('Ошибка получения книг:', error);
    await logToDb('error', 'Failed to get books', { error: error.message });
    return [];
  }
}

// Добавить книгу
export async function addBook(bookData) {
  try {
    if (!bookData.title) {
      return { success: false, message: 'Название книги обязательно' };
    }

    const bookId = normalizeTitleToId(bookData.title);

    // Проверяем, не существует ли книга
    const existing = await sql`SELECT id FROM books WHERE id = ${bookId}`;
    if (existing.rows.length > 0) {
      await logToDb('warning', 'Book already exists', { bookId, title: bookData.title });
      return { success: false, message: 'Книга с таким названием уже существует' };
    }

    const result = await sql`
      INSERT INTO books (id, title, author, genre, description, cover, book_file, file_format, added_by)
      VALUES (
        ${bookId},
        ${bookData.title},
        ${bookData.author},
        ${bookData.genre},
        ${bookData.description || null},
        ${bookData.cover || null},
        ${bookData.book_file || null},
        ${bookData.file_format || 'txt'},
        ${bookData.added_by || null}
      )
      RETURNING *
    `;

    await logToDb('info', 'Book added', { bookId, title: bookData.title });
    return { success: true, id: bookId, book: result.rows[0] };
  } catch (error) {
    console.error('Ошибка добавления книги:', error);
    await logToDb('error', 'Failed to add book', { error: error.message, bookData });
    return { success: false, message: 'Ошибка сохранения' };
  }
}

// Удалить книгу
export async function deleteBook(id) {
  try {
    // Получаем информацию о книге перед удалением
    const bookResult = await sql`SELECT book_file FROM books WHERE id = ${id}`;
    
    if (bookResult.rows.length === 0) {
      return { success: false, message: 'Книга не найдена' };
    }

    const book = bookResult.rows[0];

    // Удаляем файл книги, если он есть
    if (book.book_file) {
      try {
        const { unlink } = await import('fs/promises');
        const filePath = getBookFilePath(book.book_file);
        await unlink(filePath);
        await logToDb('info', 'Book file deleted', { filename: book.book_file });
      } catch (error) {
        if (error.code !== 'ENOENT') {
          console.error('Ошибка удаления файла книги:', error);
          await logToDb('warning', 'Failed to delete book file', { filename: book.book_file, error: error.message });
        }
      }
    }

    // Удаляем книгу из БД
    await sql`DELETE FROM books WHERE id = ${id}`;
    await logToDb('info', 'Book deleted', { bookId: id });
    return { success: true };
  } catch (error) {
    console.error('Ошибка удаления книги:', error);
    await logToDb('error', 'Failed to delete book', { bookId: id, error: error.message });
    return { success: false, message: 'Ошибка удаления' };
  }
}

// ============ ЗАКЛАДКИ ============

// Получить все закладки для книги
export async function getBookmarks(filename) {
  try {
    const result = await sql`SELECT * FROM bookmarks WHERE filename = ${filename} ORDER BY created_at DESC`;
    return result.rows;
  } catch (error) {
    console.error('Ошибка получения закладок:', error);
    await logToDb('error', 'Failed to get bookmarks', { filename, error: error.message });
    return [];
  }
}

// Добавить закладку
export async function addBookmark(bookmarkData) {
  try {
    const bookmarkId = Date.now().toString();
    const title = bookmarkData.title || `Закладка на странице ${bookmarkData.page + 1}`;

    const result = await sql`
      INSERT INTO bookmarks (id, filename, page, title)
      VALUES (${bookmarkId}, ${bookmarkData.filename}, ${bookmarkData.page}, ${title})
      RETURNING *
    `;

    await logToDb('info', 'Bookmark added', { bookmarkId, filename: bookmarkData.filename });
    return { success: true, bookmark: result.rows[0] };
  } catch (error) {
    console.error('Ошибка добавления закладки:', error);
    await logToDb('error', 'Failed to add bookmark', { error: error.message, bookmarkData });
    return { success: false, message: 'Ошибка сохранения закладки' };
  }
}

// Удалить закладку
export async function deleteBookmark(id) {
  try {
    const result = await sql`DELETE FROM bookmarks WHERE id = ${id} RETURNING *`;
    
    if (result.rows.length === 0) {
      return { success: false, message: 'Закладка не найдена' };
    }

    await logToDb('info', 'Bookmark deleted', { bookmarkId: id });
    return { success: true };
  } catch (error) {
    console.error('Ошибка удаления закладки:', error);
    await logToDb('error', 'Failed to delete bookmark', { bookmarkId: id, error: error.message });
    return { success: false, message: 'Ошибка удаления закладки' };
  }
}

// ============ НАСТРОЙКИ ============

// Получить настройки
export async function getSettings() {
  try {
    const result = await sql`SELECT key, value FROM settings`;
    const settings = {};
    result.rows.forEach(row => {
      settings[row.key] = row.value ? JSON.parse(row.value) : null;
    });

    // Дефолтные настройки если их нет
    if (!settings.background) {
      settings.background = null;
      settings.backgroundType = 'default';
    }

    return settings;
  } catch (error) {
    console.error('Ошибка получения настроек:', error);
    await logToDb('error', 'Failed to get settings', { error: error.message });
    return {
      background: null,
      backgroundType: 'default'
    };
  }
}

// Сохранить настройки
export async function saveSettings(settings) {
  try {
    for (const [key, value] of Object.entries(settings)) {
      await sql`
        INSERT INTO settings (key, value, updated_at)
        VALUES (${key}, ${JSON.stringify(value)}, CURRENT_TIMESTAMP)
        ON CONFLICT (key) DO UPDATE SET
          value = ${JSON.stringify(value)},
          updated_at = CURRENT_TIMESTAMP
      `;
    }
    await logToDb('info', 'Settings saved', { keys: Object.keys(settings) });
    return true;
  } catch (error) {
    console.error('Ошибка сохранения настроек:', error);
    await logToDb('error', 'Failed to save settings', { error: error.message });
    return false;
  }
}

