import { getSql } from './db-connection.js';
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

// Проверка наличия переменных окружения для подключения к БД
// Поддерживаем разные провайдеры: Neon, Prisma, Supabase, и стандартный Vercel Postgres
function checkDatabaseConfig() {
  // Проверяем различные варианты переменных окружения
  // Поддерживаем переменные с префиксом (например, library_DATABASE_URL) и без префикса
  // ВАЖНО: DATABASE_URL проверяем первым, так как это основная переменная для Neon
  const possibleVars = [
    'DATABASE_URL', // Neon, Supabase - основная переменная
    'library_DATABASE_URL',
    'NEON_DATABASE_URL',
    'library_NEON_DATABASE_URL',
    'POSTGRES_URL',
    'library_POSTGRES_URL',
    'POSTGRES_PRISMA_URL',
    'library_POSTGRES_PRISMA_URL',
    'POSTGRES_URL_NON_POOLING',
    'library_POSTGRES_URL_NON_POOLING',
    'SUPABASE_DB_URL',
    'POSTGRES_HOST',
    'library_POSTGRES_HOST',
    'POSTGRES_DATABASE',
    'library_POSTGRES_DATABASE'
  ];
  
  const found = possibleVars.find(v => process.env[v]);
  
  if (!found) {
    console.error('[DB] Отсутствуют переменные окружения для подключения к БД');
    console.error('[DB] Проверенные переменные:', possibleVars.join(', '));
    
    // Более детальное логирование всех переменных окружения
    const allEnvVars = Object.keys(process.env);
    const dbRelatedVars = allEnvVars.filter(k => 
      k.includes('POSTGRES') || 
      k.includes('DATABASE') || 
      k.includes('NEON') ||
      k.includes('PG')
    );
    console.error('[DB] Доступные переменные окружения, связанные с БД:', dbRelatedVars.length > 0 ? dbRelatedVars.join(', ') : 'нет');
    
    // Показываем первые несколько переменных для отладки (без значений)
    if (dbRelatedVars.length > 0) {
      console.error('[DB] Найдены переменные:', dbRelatedVars.slice(0, 10).join(', '));
    }
    
    return false;
  }
  
  console.log(`[DB] Используется переменная окружения: ${found}`);
  console.log(`[DB] Значение переменной (первые 50 символов): ${process.env[found]?.substring(0, 50)}...`);
  return true;
}

// Инициализация БД (создание таблиц если их нет)
export async function initDatabase() {
  // Проверяем наличие переменных окружения
  if (!checkDatabaseConfig()) {
    console.error('[DB] База данных не настроена. Создайте PostgreSQL базу данных в Vercel Storage.');
    return false;
  }
  
  try {
    const sql = await getSql();
    
    // Проверяем подключение простым запросом
    await sql`SELECT 1`;
    
    // Создаем таблицу пользователей
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        user_id VARCHAR(255) UNIQUE,
        password VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        name VARCHAR(255),
        auth_method VARCHAR(50) DEFAULT 'password',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Добавляем колонку user_id если её нет (для существующих таблиц)
    try {
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS user_id VARCHAR(255) UNIQUE`;
    } catch (error) {
      // Игнорируем ошибку если колонка уже существует
      if (!error.message.includes('duplicate column') && !error.message.includes('already exists')) {
        console.warn('[DB] Предупреждение при добавлении колонки user_id:', error.message);
      }
    }
    
    // Добавляем колонки status и last_seen если их нет
    try {
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'offline'`;
    } catch (error) {
      if (!error.message.includes('duplicate column') && !error.message.includes('already exists')) {
        console.warn('[DB] Предупреждение при добавлении колонки status:', error.message);
      }
    }
    
    try {
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP`;
    } catch (error) {
      if (!error.message.includes('duplicate column') && !error.message.includes('already exists')) {
        console.warn('[DB] Предупреждение при добавлении колонки last_seen:', error.message);
      }
    }
    
    // Создаем индекс для быстрого поиска по user_id
    try {
      await sql`CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id)`;
    } catch (error) {
      // Игнорируем ошибку если индекс уже существует
      console.warn('[DB] Предупреждение при создании индекса user_id:', error.message);
    }
    
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
        content TEXT,
        file_format VARCHAR(50) DEFAULT 'txt',
        added_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Добавляем колонку content если её нет (для существующих таблиц)
    try {
      await sql`ALTER TABLE books ADD COLUMN IF NOT EXISTS content TEXT`;
    } catch (error) {
      // Игнорируем ошибку если колонка уже существует
      if (!error.message.includes('duplicate column') && !error.message.includes('already exists')) {
        console.warn('[DB] Предупреждение при добавлении колонки content:', error.message);
      }
    }

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
    
    // Создаем таблицу избранных книг
    await sql`
      CREATE TABLE IF NOT EXISTS favorites (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        book_id VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(username, book_id)
      )
    `;
    
    // Создаем индекс для быстрого поиска избранных книг пользователя
    await sql`CREATE INDEX IF NOT EXISTS idx_favorites_username ON favorites(username)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_favorites_book_id ON favorites(book_id)`;

    // Создаем таблицу настроек
    await sql`
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        key VARCHAR(255) UNIQUE NOT NULL,
        value TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Создаем таблицу настроек приватности пользователей
    await sql`
      CREATE TABLE IF NOT EXISTS user_privacy_settings (
        username VARCHAR(255) PRIMARY KEY,
        show_favorites BOOLEAN DEFAULT TRUE,
        show_description BOOLEAN DEFAULT TRUE,
        show_user_id BOOLEAN DEFAULT TRUE,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Создаем таблицу переименований собеседников (только для текущего пользователя)
    await sql`
      CREATE TABLE IF NOT EXISTS chat_nicknames (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        contact_username VARCHAR(255) NOT NULL,
        nickname VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(username, contact_username)
      )
    `;
    
    // Создаем индексы
    await sql`CREATE INDEX IF NOT EXISTS idx_chat_nicknames_user ON chat_nicknames(username, contact_username)`;

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
    
    // Создаем таблицу сообщений (чаты)
    await sql`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        sender_username VARCHAR(255) NOT NULL,
        receiver_username VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        read_status BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Добавляем колонки edited_at и deleted_at если их нет
    try {
      await sql`ALTER TABLE messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP`;
    } catch (error) {
      if (!error.message.includes('duplicate column') && !error.message.includes('already exists')) {
        console.warn('[DB] Предупреждение при добавлении колонки edited_at:', error.message);
      }
    }
    
    try {
      await sql`ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP`;
    } catch (error) {
      if (!error.message.includes('duplicate column') && !error.message.includes('already exists')) {
        console.warn('[DB] Предупреждение при добавлении колонки deleted_at:', error.message);
      }
    }
    
    // Создаем индексы для быстрого поиска сообщений
    await sql`CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_username, created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_username, created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(sender_username, receiver_username, created_at DESC)`;

    // Создаем индексы для производительности
    await sql`CREATE INDEX IF NOT EXISTS idx_books_author ON books(author)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_books_genre ON books(genre)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_bookmarks_filename ON bookmarks(filename)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level)`;

    await logToDb('info', 'Database initialized successfully');
    return true;
  } catch (error) {
    console.error('[DB] Ошибка инициализации БД:', error);
    
    // Безопасное логирование (может не работать если БД недоступна)
    try {
      await logToDb('error', 'Database initialization failed', { error: error.message });
    } catch (logError) {
      console.error('[DB] Не удалось залогировать ошибку:', logError);
    }
    
    // Проверяем тип ошибки
    if (error.message && (
      error.message.includes('connection') || 
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('ENOTFOUND') ||
      error.message.includes('timeout')
    )) {
      console.error('[DB] Ошибка подключения к базе данных. Проверьте:');
      console.error('[DB] 1. Создана ли PostgreSQL база данных в Vercel Storage');
      console.error('[DB] 2. Правильно ли настроены переменные окружения');
      console.error('[DB] 3. Доступна ли база данных');
    }
    
    return false;
  }
}

// ============ ПОЛЬЗОВАТЕЛИ ============

// Получить всех пользователей из БД
export async function getAllUsersFromDb() {
  try {
    // Проверяем наличие переменных окружения
    if (!checkDatabaseConfig()) {
      return []; // Если БД не настроена, возвращаем пустой массив
    }
    
    const sql = await getSql();
    const result = await sql`SELECT * FROM users ORDER BY created_at DESC`;
    return result.rows;
  } catch (error) {
    // Если ошибка связана с подключением, возвращаем пустой массив
    if (error.message && (
      error.message.includes('Не найдена переменная окружения') ||
      error.message.includes('Не удалось подключиться') ||
      error.message.includes('connection') ||
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('ENOTFOUND') ||
      error.message.includes('timeout') ||
      error.message.includes('relation "users" does not exist')
    )) {
      return [];
    }
    console.error('Ошибка получения пользователей:', error);
    try {
      await logToDb('error', 'Failed to get users', { error: error.message });
    } catch (logError) {
      // Игнорируем ошибки логирования
    }
    return [];
  }
}

// Добавить пользователя в БД
export async function addUserToDb(username, password, email = null, name = null, userId = null) {
  try {
    // Проверяем наличие переменных окружения перед попыткой подключения
    if (!checkDatabaseConfig()) {
      return { 
        success: false, 
        message: 'База данных не настроена',
        details: 'Создайте PostgreSQL базу данных:\n\n1. Откройте проект на Vercel (https://vercel.com/dashboard)\n2. Перейдите в раздел "Storage" (Хранилище)\n3. Нажмите "Create Database" (Создать базу данных)\n4. Выберите любой PostgreSQL провайдер:\n   - Neon (Serverless Postgres) - рекомендуется\n   - Prisma Postgres\n   - Supabase\n   - Или любой другой PostgreSQL\n5. После создания Vercel автоматически добавит переменные окружения\n6. Перезапустите деплой (Deployments → последний деплой → Redeploy)\n\nПосле этого приложение автоматически подключится к базе данных.'
      };
    }
    
    const sql = await getSql();
    
    // Если указан user_id, проверяем его уникальность
    if (userId) {
      const userIdCheck = await sql`SELECT id FROM users WHERE user_id = ${userId}`;
      if (userIdCheck.rows.length > 0) {
        await logToDb('warning', 'User ID already exists', { userId });
        return { success: false, message: `ID ${userId} уже занят. Выберите другой.` };
      }
    }
    
    const result = await sql`
      INSERT INTO users (username, password, email, name, user_id)
      VALUES (${username}, ${password}, ${email}, ${name}, ${userId || null})
      RETURNING *
    `;
    await logToDb('info', 'User added to database', { username, userId });
    return { success: true, user: result.rows[0] };
  } catch (error) {
    if (error.code === '23505') { // Unique violation
      if (error.message && error.message.includes('user_id')) {
        await logToDb('warning', 'User ID already exists', { userId });
        return { success: false, message: `ID ${userId} уже занят. Выберите другой.` };
      }
      await logToDb('warning', 'User already exists', { username });
      return { success: false, message: 'Пользователь уже существует' };
    }
    
    // Обработка ошибок подключения к БД
    if (error.message && (
      error.message.includes('Не найдена переменная окружения') ||
      error.message.includes('Не удалось подключиться') ||
      error.message.includes('connection') ||
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('ENOTFOUND') ||
      error.message.includes('timeout') ||
      error.message.includes('relation "users" does not exist')
    )) {
      return { 
        success: false, 
        message: 'База данных не настроена',
        details: 'Создайте PostgreSQL базу данных:\n\n1. Откройте проект на Vercel (https://vercel.com/dashboard)\n2. Перейдите в раздел "Storage" (Хранилище)\n3. Нажмите "Create Database" (Создать базу данных)\n4. Выберите любой PostgreSQL провайдер:\n   - Neon (Serverless Postgres) - рекомендуется\n   - Prisma Postgres\n   - Supabase\n   - Или любой другой PostgreSQL\n5. После создания Vercel автоматически добавит переменные окружения\n6. Перезапустите деплой (Deployments → последний деплой → Redeploy)\n\nПосле этого приложение автоматически подключится к базе данных.'
      };
    }
    
    console.error('Ошибка добавления пользователя:', error);
    try {
      await logToDb('error', 'Failed to add user', { username, error: error.message });
    } catch (logError) {
      // Игнорируем ошибки логирования
    }
    return { success: false, message: 'Ошибка сохранения' };
  }
}

// Проверить существует ли пользователь в БД
export async function userExistsInDb(username) {
  try {
    // Проверяем наличие переменных окружения
    if (!checkDatabaseConfig()) {
      return false; // Если БД не настроена, считаем что пользователя нет
    }
    
    const sql = await getSql();
    const result = await sql`SELECT COUNT(*) as count FROM users WHERE username = ${username}`;
    return parseInt(result.rows[0].count) > 0;
  } catch (error) {
    // Если ошибка связана с подключением, считаем что пользователя нет
    if (error.message && (
      error.message.includes('Не найдена переменная окружения') ||
      error.message.includes('Не удалось подключиться') ||
      error.message.includes('connection') ||
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('ENOTFOUND') ||
      error.message.includes('timeout') ||
      error.message.includes('relation "users" does not exist')
    )) {
      return false;
    }
    console.error('Ошибка проверки пользователя:', error);
    return false;
  }
}

// ============ КНИГИ ============

// Получить все книги
export async function getAllBooks() {
  try {
    const sql = await getSql();
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
    // Проверяем наличие переменных окружения
    if (!checkDatabaseConfig()) {
      return { 
        success: false, 
        message: 'База данных не настроена',
        details: 'Создайте PostgreSQL базу данных:\n\n1. Откройте проект на Vercel (https://vercel.com/dashboard)\n2. Перейдите в раздел "Storage" (Хранилище)\n3. Нажмите "Create Database" (Создать базу данных)\n4. Выберите любой PostgreSQL провайдер:\n   - Neon (Serverless Postgres) - рекомендуется\n   - Prisma Postgres\n   - Supabase\n   - Или любой другой PostgreSQL\n5. После создания Vercel автоматически добавит переменные окружения\n6. Перезапустите деплой (Deployments → последний деплой → Redeploy)\n\nПосле этого приложение автоматически подключится к базе данных.'
      };
    }
    
    if (!bookData.title) {
      return { success: false, message: 'Название книги обязательно' };
    }

    // ID = полное имя файла (если передано), иначе генерируем из title для обратной совместимости
    let bookId;
    if (bookData.id) {
      // Если ID передан явно (имя файла), используем его
      bookId = bookData.id;
    } else if (bookData.book_file) {
      // Если есть book_file, используем его как ID
      bookId = bookData.book_file;
    } else {
      // Для обратной совместимости: генерируем ID из title
      bookId = normalizeTitleToId(bookData.title);
    }

    const sql = await getSql();
    
    // Проверяем, не существует ли книга
    const existing = await sql`SELECT id FROM books WHERE id = ${bookId}`;
    if (existing.rows.length > 0) {
      await logToDb('warning', 'Book already exists', { bookId, title: bookData.title });
      return { success: false, message: 'Книга с таким ID уже существует' };
    }

    const result = await sql`
      INSERT INTO books (id, title, author, genre, description, cover, book_file, content, file_format, added_by)
      VALUES (
        ${bookId},
        ${bookData.title},
        ${bookData.author},
        ${bookData.genre},
        ${bookData.description || null},
        ${bookData.cover || null},
        ${bookData.book_file || bookId},
        ${bookData.content || null},
        ${bookData.file_format || 'txt'},
        ${bookData.added_by || null}
      )
      RETURNING *
    `;

    await logToDb('info', 'Book added', { bookId, title: bookData.title });
    return { success: true, id: bookId, book: result.rows[0] };
  } catch (error) {
    console.error('Ошибка добавления книги:', error);
    
    // Более детальное сообщение об ошибке
    let errorMessage = 'Ошибка сохранения';
    if (error.message) {
      if (error.message.includes('relation "books" does not exist')) {
        errorMessage = 'База данных не инициализирована. Пожалуйста, подождите несколько секунд и попробуйте снова.';
      } else if (error.message.includes('connection') || error.message.includes('ECONNREFUSED')) {
        errorMessage = 'Не удалось подключиться к базе данных. Проверьте настройки подключения.';
      } else {
        errorMessage = `Ошибка: ${error.message}`;
      }
    }
    
    await logToDb('error', 'Failed to add book', { error: error.message, errorCode: error.code, bookData });
    return { success: false, message: errorMessage };
  }
}

// Удалить книгу
export async function deleteBook(id) {
  try {
    const sql = await getSql();
    
    // Получаем информацию о книге перед удалением
    const bookResult = await sql`SELECT book_file FROM books WHERE id = ${id}`;
    
    if (bookResult.rows.length === 0) {
      return { success: false, message: 'Книга не найдена' };
    }

    const book = bookResult.rows[0];

    // Пытаемся удалить файл книги, если он есть (не критично, так как содержимое в БД)
    if (book.book_file) {
      try {
        const { unlink } = await import('fs/promises');
        const filePath = getBookFilePath(book.book_file);
        await unlink(filePath);
        await logToDb('info', 'Book file deleted', { filename: book.book_file });
      } catch (error) {
        // Игнорируем ошибку если файл не найден (содержимое в БД)
        if (error.code !== 'ENOENT') {
          console.warn('Ошибка удаления файла книги (не критично, содержимое в БД):', error.message);
        }
      }
    }

    // Удаляем книгу из БД (включая содержимое)
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
    const sql = await getSql();
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
    const sql = await getSql();
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
    const sql = await getSql();
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
    const sql = await getSql();
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
    const sql = await getSql();
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

// ============ СООБЩЕНИЯ (ЧАТЫ) ============

// Отправить сообщение
export async function sendMessage(senderUsername, receiverUsername, content) {
  try {
    if (!checkDatabaseConfig()) {
      return { success: false, message: 'База данных не настроена' };
    }
    
    if (!senderUsername || !receiverUsername || !content) {
      return { success: false, message: 'Заполните все поля' };
    }
    
    const sql = await getSql();
    const result = await sql`
      INSERT INTO messages (sender_username, receiver_username, content)
      VALUES (${senderUsername}, ${receiverUsername}, ${content})
      RETURNING *
    `;
    
    await logToDb('info', 'Message sent', { sender: senderUsername, receiver: receiverUsername });
    return { success: true, message: result.rows[0] };
  } catch (error) {
    console.error('Ошибка отправки сообщения:', error);
    try {
      await logToDb('error', 'Failed to send message', { error: error.message });
    } catch (logError) {
      // Игнорируем ошибки логирования
    }
    return { success: false, message: 'Ошибка отправки сообщения' };
  }
}

// Получить переписку между двумя пользователями
export async function getConversation(username1, username2, limit = 100) {
  try {
    if (!checkDatabaseConfig()) {
      return [];
    }
    
    const sql = await getSql();
    const result = await sql`
      SELECT * FROM messages
      WHERE ((sender_username = ${username1} AND receiver_username = ${username2})
         OR (sender_username = ${username2} AND receiver_username = ${username1}))
         AND deleted_at IS NULL
      ORDER BY created_at ASC
      LIMIT ${limit}
    `;
    
    return result.rows;
  } catch (error) {
    console.error('Ошибка получения переписки:', error);
    return [];
  }
}

// Получить список чатов пользователя (последние сообщения с каждым собеседником)
export async function getUserChats(username) {
  try {
    if (!checkDatabaseConfig()) {
      return [];
    }
    
    const sql = await getSql();
    // Получаем все сообщения пользователя (исключая удаленные)
    const allMessages = await sql`
      SELECT * FROM messages
      WHERE (sender_username = ${username} OR receiver_username = ${username})
        AND deleted_at IS NULL
      ORDER BY created_at DESC
    `;
    
    // Группируем по собеседникам, оставляя последнее сообщение
    const chatsMap = new Map();
    for (const msg of allMessages.rows) {
      const otherUser = msg.sender_username === username ? msg.receiver_username : msg.sender_username;
      if (!chatsMap.has(otherUser)) {
        chatsMap.set(otherUser, { ...msg, other_username: otherUser });
      }
    }
    
    return Array.from(chatsMap.values());
  } catch (error) {
    console.error('Ошибка получения чатов:', error);
    return [];
  }
}

// Отметить сообщения как прочитанные
export async function markMessagesAsRead(senderUsername, receiverUsername) {
  try {
    if (!checkDatabaseConfig()) {
      return { success: false };
    }
    
    const sql = await getSql();
    await sql`
      UPDATE messages
      SET read_status = TRUE
      WHERE sender_username = ${senderUsername} AND receiver_username = ${receiverUsername} AND read_status = FALSE
    `;
    
    return { success: true };
  } catch (error) {
    console.error('Ошибка отметки сообщений как прочитанных:', error);
    return { success: false };
  }
}

// Обновить статус пользователя
export async function updateUserStatus(username, status = 'online') {
  try {
    if (!checkDatabaseConfig()) {
      return { success: false, message: 'База данных не настроена' };
    }
    
    const sql = await getSql();
    await sql`
      UPDATE users
      SET status = ${status}, last_seen = CURRENT_TIMESTAMP
      WHERE username = ${username}
    `;
    
    return { success: true };
  } catch (error) {
    console.error('Ошибка обновления статуса пользователя:', error);
    return { success: false, message: 'Ошибка обновления статуса' };
  }
}

// Получить статус пользователя
export async function getUserStatus(username) {
  try {
    if (!checkDatabaseConfig()) {
      return { status: 'offline', last_seen: null };
    }
    
    const sql = await getSql();
    const result = await sql`
      SELECT status, last_seen FROM users
      WHERE username = ${username}
    `;
    
    if (result.rows.length > 0) {
      return {
        status: result.rows[0].status || 'offline',
        last_seen: result.rows[0].last_seen
      };
    }
    
    return { status: 'offline', last_seen: null };
  } catch (error) {
    console.error('Ошибка получения статуса пользователя:', error);
    return { status: 'offline', last_seen: null };
  }
}

// Редактировать сообщение
export async function editMessage(messageId, senderUsername, newContent) {
  try {
    if (!checkDatabaseConfig()) {
      return { success: false, message: 'База данных не настроена' };
    }
    
    if (!newContent || !newContent.trim()) {
      return { success: false, message: 'Сообщение не может быть пустым' };
    }
    
    const sql = await getSql();
    
    // Проверяем, что сообщение принадлежит отправителю
    const checkResult = await sql`
      SELECT sender_username FROM messages
      WHERE id = ${messageId} AND sender_username = ${senderUsername} AND deleted_at IS NULL
    `;
    
    if (checkResult.rows.length === 0) {
      return { success: false, message: 'Сообщение не найдено или вы не можете его редактировать' };
    }
    
    // Обновляем сообщение
    const result = await sql`
      UPDATE messages
      SET content = ${newContent.trim()}, edited_at = CURRENT_TIMESTAMP
      WHERE id = ${messageId} AND sender_username = ${senderUsername}
      RETURNING *
    `;
    
    return { success: true, message: result.rows[0] };
  } catch (error) {
    console.error('Ошибка редактирования сообщения:', error);
    return { success: false, message: 'Ошибка редактирования сообщения' };
  }
}

// Удалить сообщение
export async function deleteMessage(messageId, senderUsername) {
  try {
    if (!checkDatabaseConfig()) {
      return { success: false, message: 'База данных не настроена' };
    }
    
    const sql = await getSql();
    
    // Проверяем, что сообщение принадлежит отправителю
    const checkResult = await sql`
      SELECT sender_username FROM messages
      WHERE id = ${messageId} AND sender_username = ${senderUsername} AND deleted_at IS NULL
    `;
    
    if (checkResult.rows.length === 0) {
      return { success: false, message: 'Сообщение не найдено или вы не можете его удалить' };
    }
    
    // Помечаем сообщение как удаленное
    const result = await sql`
      UPDATE messages
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE id = ${messageId} AND sender_username = ${senderUsername}
      RETURNING *
    `;
    
    return { success: true, message: result.rows[0] };
  } catch (error) {
    console.error('Ошибка удаления сообщения:', error);
    return { success: false, message: 'Ошибка удаления сообщения' };
  }
}

// Получить количество непрочитанных сообщений
export async function getUnreadCount(username) {
  try {
    if (!checkDatabaseConfig()) {
      return 0;
    }
    
    const sql = await getSql();
    const result = await sql`
      SELECT COUNT(*) as count
      FROM messages
      WHERE receiver_username = ${username} AND read_status = FALSE AND deleted_at IS NULL
    `;
    
    return parseInt(result.rows[0].count) || 0;
  } catch (error) {
    console.error('Ошибка получения количества непрочитанных:', error);
    return 0;
  }
}

// Удалить пользователя из БД (только для админа)
export async function deleteUserFromDb(username) {
  try {
    if (!checkDatabaseConfig()) {
      return { success: false, message: 'База данных не настроена' };
    }
    
    if (!username) {
      return { success: false, message: 'Имя пользователя не указано' };
    }
    
    const sql = await getSql();
    
    // Проверяем, существует ли пользователь
    const userCheck = await sql`SELECT id FROM users WHERE username = ${username}`;
    if (userCheck.rows.length === 0) {
      return { success: false, message: 'Пользователь не найден в базе данных' };
    }
    
    // Удаляем все сообщения пользователя
    await sql`DELETE FROM messages WHERE sender_username = ${username} OR receiver_username = ${username}`;
    
    // Удаляем пользователя
    await sql`DELETE FROM users WHERE username = ${username}`;
    
    await logToDb('info', 'User deleted from database', { username });
    return { success: true, message: 'Пользователь удален' };
  } catch (error) {
    console.error('Ошибка удаления пользователя:', error);
    try {
      await logToDb('error', 'Failed to delete user', { username, error: error.message });
    } catch (logError) {
      // Игнорируем ошибки логирования
    }
    return { success: false, message: 'Ошибка удаления пользователя' };
  }
}

// ============ ИЗБРАННЫЕ КНИГИ ============

// Добавить книгу в избранное
export async function addToFavorites(username, bookId) {
  try {
    if (!checkDatabaseConfig()) {
      return { success: false, message: 'База данных не настроена' };
    }
    
    if (!username || !bookId) {
      return { success: false, message: 'Не указаны пользователь или книга' };
    }
    
    const sql = await getSql();
    const result = await sql`
      INSERT INTO favorites (username, book_id)
      VALUES (${username}, ${bookId})
      ON CONFLICT (username, book_id) DO NOTHING
      RETURNING *
    `;
    
    if (result.rows.length > 0) {
      await logToDb('info', 'Book added to favorites', { username, bookId });
      return { success: true, favorite: result.rows[0] };
    } else {
      return { success: false, message: 'Книга уже в избранном' };
    }
  } catch (error) {
    console.error('Ошибка добавления в избранное:', error);
    try {
      await logToDb('error', 'Failed to add to favorites', { username, bookId, error: error.message });
    } catch (logError) {
      // Игнорируем ошибки логирования
    }
    return { success: false, message: 'Ошибка добавления в избранное' };
  }
}

// Удалить книгу из избранного
export async function removeFromFavorites(username, bookId) {
  try {
    if (!checkDatabaseConfig()) {
      return { success: false, message: 'База данных не настроена' };
    }
    
    if (!username || !bookId) {
      return { success: false, message: 'Не указаны пользователь или книга' };
    }
    
    const sql = await getSql();
    const result = await sql`
      DELETE FROM favorites
      WHERE username = ${username} AND book_id = ${bookId}
      RETURNING *
    `;
    
    if (result.rows.length > 0) {
      await logToDb('info', 'Book removed from favorites', { username, bookId });
      return { success: true };
    } else {
      return { success: false, message: 'Книга не найдена в избранном' };
    }
  } catch (error) {
    console.error('Ошибка удаления из избранного:', error);
    try {
      await logToDb('error', 'Failed to remove from favorites', { username, bookId, error: error.message });
    } catch (logError) {
      // Игнорируем ошибки логирования
    }
    return { success: false, message: 'Ошибка удаления из избранного' };
  }
}

// Получить избранные книги пользователя
export async function getUserFavorites(username) {
  try {
    if (!checkDatabaseConfig()) {
      return [];
    }
    
    if (!username) {
      return [];
    }
    
    const sql = await getSql();
    const result = await sql`
      SELECT b.*, f.created_at as favorited_at
      FROM favorites f
      JOIN books b ON f.book_id = b.id
      WHERE f.username = ${username}
      ORDER BY f.created_at DESC
    `;
    
    return result.rows;
  } catch (error) {
    console.error('Ошибка получения избранных книг:', error);
    return [];
  }
}

// Проверить, находится ли книга в избранном
export async function isBookInFavorites(username, bookId) {
  try {
    if (!checkDatabaseConfig() || !username || !bookId) {
      return false;
    }
    
    const sql = await getSql();
    const result = await sql`
      SELECT id FROM favorites
      WHERE username = ${username} AND book_id = ${bookId}
    `;
    
    return result.rows.length > 0;
  } catch (error) {
    console.error('Ошибка проверки избранного:', error);
    return false;
  }
}

// ============ НАСТРОЙКИ ПРИВАТНОСТИ ============

// Получить настройки приватности пользователя
export async function getUserPrivacySettings(username) {
  try {
    if (!checkDatabaseConfig() || !username) {
      return {
        show_favorites: true,
        show_description: true
      };
    }
    
    const sql = await getSql();
    const result = await sql`
      SELECT * FROM user_privacy_settings WHERE username = ${username}
    `;
    
    if (result.rows.length > 0) {
      const row = result.rows[0];
      return {
        show_favorites: row.show_favorites === true || row.show_favorites === null,
        show_description: row.show_description === true || row.show_description === null
      };
    }
    
    // Возвращаем дефолтные настройки
    return {
      show_favorites: true,
      show_description: true
    };
  } catch (error) {
    console.error('Ошибка получения настроек приватности:', error);
    return {
      show_favorites: true,
      show_description: true
    };
  }
}

// Сохранить настройки приватности пользователя
export async function saveUserPrivacySettings(username, settings) {
  try {
    if (!checkDatabaseConfig() || !username) {
      return { success: false, message: 'База данных не настроена или не указан пользователь' };
    }
    
    const sql = await getSql();
    await sql`
      INSERT INTO user_privacy_settings (username, show_favorites, show_description, updated_at)
      VALUES (${username}, ${settings.show_favorites === true}, ${settings.show_description === true}, CURRENT_TIMESTAMP)
      ON CONFLICT (username) DO UPDATE SET
        show_favorites = ${settings.show_favorites === true},
        show_description = ${settings.show_description === true},
        updated_at = CURRENT_TIMESTAMP
    `;
    
    await logToDb('info', 'User privacy settings saved', { username });
    return { success: true };
  } catch (error) {
    console.error('Ошибка сохранения настроек приватности:', error);
    try {
      await logToDb('error', 'Failed to save privacy settings', { username, error: error.message });
    } catch (logError) {
      // Игнорируем ошибки логирования
    }
    return { success: false, message: 'Ошибка сохранения настроек приватности' };
  }
}

// ============ ПЕРЕИМЕНОВАНИЯ СОБЕСЕДНИКОВ ============

// Сохранить переименование собеседника
export async function saveChatNickname(username, contactUsername, nickname) {
  try {
    if (!checkDatabaseConfig() || !username || !contactUsername) {
      return { success: false, message: 'Не указаны пользователи' };
    }
    
    const sql = await getSql();
    if (nickname && nickname.trim()) {
      await sql`
        INSERT INTO chat_nicknames (username, contact_username, nickname)
        VALUES (${username}, ${contactUsername}, ${nickname.trim()})
        ON CONFLICT (username, contact_username) DO UPDATE SET
          nickname = ${nickname.trim()},
          created_at = CURRENT_TIMESTAMP
      `;
    } else {
      // Удаляем переименование если пустое
      await sql`
        DELETE FROM chat_nicknames
        WHERE username = ${username} AND contact_username = ${contactUsername}
      `;
    }
    
    return { success: true };
  } catch (error) {
    console.error('Ошибка сохранения переименования:', error);
    return { success: false, message: 'Ошибка сохранения переименования' };
  }
}

// Получить переименование собеседника
export async function getChatNickname(username, contactUsername) {
  try {
    if (!checkDatabaseConfig() || !username || !contactUsername) {
      return null;
    }
    
    const sql = await getSql();
    const result = await sql`
      SELECT nickname FROM chat_nicknames
      WHERE username = ${username} AND contact_username = ${contactUsername}
    `;
    
    if (result.rows.length > 0) {
      return result.rows[0].nickname;
    }
    
    return null;
  } catch (error) {
    console.error('Ошибка получения переименования:', error);
    return null;
  }
}

// Получить все переименования пользователя
export async function getAllChatNicknames(username) {
  try {
    if (!checkDatabaseConfig() || !username) {
      return {};
    }
    
    const sql = await getSql();
    const result = await sql`
      SELECT contact_username, nickname FROM chat_nicknames
      WHERE username = ${username}
    `;
    
    const nicknames = {};
    result.rows.forEach(row => {
      nicknames[row.contact_username] = row.nickname;
    });
    
    return nicknames;
  } catch (error) {
    console.error('Ошибка получения переименований:', error);
    return {};
  }
}

