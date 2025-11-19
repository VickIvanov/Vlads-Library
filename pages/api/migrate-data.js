import { initDatabase } from '../../lib/db-pg.js';
import { readFile } from 'fs/promises';
import { getDbPath, getBooksFilePath } from '../../lib/paths.js';
import { addUserToDb, addBook, addBookmark, saveSettings } from '../../lib/db-pg.js';
import { logToDb } from '../../lib/logger.js';
import { isAdmin } from '../../lib/users.js';

export default async function handler(req, res) {
  // Только админы могут запускать миграцию
  const username = req.headers['x-username'] || req.query.username;
  if (!username || !isAdmin(username)) {
    return res.status(403).json({ error: 'Доступ запрещен. Только администраторы могут запускать миграцию.' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    console.log('[MIGRATE] Начало миграции данных...');

    // Инициализируем БД
    console.log('[MIGRATE] Инициализация структуры БД...');
    const initSuccess = await initDatabase();
    if (!initSuccess) {
      return res.status(500).json({ error: 'Не удалось инициализировать базу данных. Проверьте подключение.' });
    }
    console.log('[MIGRATE] Структура БД готова');

    let migratedCount = {
      users: 0,
      books: 0,
      bookmarks: 0,
      settings: 0
    };

    // Миграция пользователей
    try {
      const dbPath = getDbPath();
      const data = JSON.parse(await readFile(dbPath, 'utf-8'));
      const users = data.users || [];

      console.log(`[MIGRATE] Миграция ${users.length} пользователей...`);
      for (const user of users) {
        if (process.env.LIBRARY_USERS?.includes(user.username)) {
          continue; // Пропускаем пользователей из .env
        }

        const result = await addUserToDb(
          user.username,
          user.password,
          user.email || null,
          user.name || null
        );

        if (result.success) {
          migratedCount.users++;
        }
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('[MIGRATE] Ошибка миграции пользователей:', error);
      }
    }

    // Миграция книг
    try {
      const booksPath = getBooksFilePath();
      const books = JSON.parse(await readFile(booksPath, 'utf-8'));

      if (Array.isArray(books)) {
        console.log(`[MIGRATE] Миграция ${books.length} книг...`);
        for (const book of books) {
          const result = await addBook(book);
          if (result.success) {
            migratedCount.books++;
          }
        }
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('[MIGRATE] Ошибка миграции книг:', error);
      }
    }

    // Миграция закладок
    try {
      const dbPath = getDbPath();
      const data = JSON.parse(await readFile(dbPath, 'utf-8'));
      const bookmarks = data.bookmarks || [];

      console.log(`[MIGRATE] Миграция ${bookmarks.length} закладок...`);
      for (const bookmark of bookmarks) {
        const result = await addBookmark({
          filename: bookmark.filename,
          page: bookmark.page,
          title: bookmark.title
        });

        if (result.success) {
          migratedCount.bookmarks++;
        }
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('[MIGRATE] Ошибка миграции закладок:', error);
      }
    }

    // Миграция настроек
    try {
      const dbPath = getDbPath();
      const data = JSON.parse(await readFile(dbPath, 'utf-8'));
      const settings = data.settings || {};

      if (Object.keys(settings).length > 0) {
        console.log('[MIGRATE] Миграция настроек...');
        await saveSettings(settings);
        migratedCount.settings = 1;
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('[MIGRATE] Ошибка миграции настроек:', error);
      }
    }

    await logToDb('info', 'Data migration completed', migratedCount, req);

    res.status(200).json({
      message: 'Миграция данных завершена успешно',
      migrated: migratedCount
    });
  } catch (error) {
    console.error('[MIGRATE] Критическая ошибка миграции:', error);
    await logToDb('error', 'Data migration failed', { error: error.message }, req);
    res.status(500).json({ error: 'Ошибка миграции данных', details: error.message });
  }
}

