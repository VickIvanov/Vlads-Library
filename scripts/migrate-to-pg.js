/**
 * Скрипт миграции данных из JSON файлов в PostgreSQL
 * Запуск: node scripts/migrate-to-pg.js
 */

import { readFile } from 'fs/promises';
import { getDbPath, getBooksFilePath } from '../lib/paths.js';
import { initDatabase, addUserToDb, addBook, addBookmark, saveSettings } from '../lib/db-pg.js';
import { logToDb } from '../lib/logger.js';

async function migrateUsers() {
  try {
    const dbPath = getDbPath();
    const data = JSON.parse(await readFile(dbPath, 'utf-8'));
    const users = data.users || [];

    console.log(`📦 Миграция ${users.length} пользователей...`);

    for (const user of users) {
      // Пропускаем пользователей из .env (они уже есть)
      if (process.env.LIBRARY_USERS?.includes(user.username)) {
        console.log(`⏭️  Пропущен пользователь из .env: ${user.username}`);
        continue;
      }

      const result = await addUserToDb(
        user.username,
        user.password,
        user.email || null,
        user.name || null
      );

      if (result.success) {
        console.log(`✅ Мигрирован пользователь: ${user.username}`);
      } else {
        console.log(`⚠️  Пользователь ${user.username}: ${result.message}`);
      }
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('📄 Файл database.json не найден, пропускаем миграцию пользователей');
    } else {
      console.error('❌ Ошибка миграции пользователей:', error);
    }
  }
}

async function migrateBooks() {
  try {
    const booksPath = getBooksFilePath();
    const books = JSON.parse(await readFile(booksPath, 'utf-8'));

    if (!Array.isArray(books)) {
      console.log('📄 Файл books.json не содержит массив, пропускаем миграцию книг');
      return;
    }

    console.log(`📦 Миграция ${books.length} книг...`);

    for (const book of books) {
      const result = await addBook(book);
      if (result.success) {
        console.log(`✅ Мигрирована книга: ${book.title}`);
      } else {
        console.log(`⚠️  Книга ${book.title}: ${result.message}`);
      }
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('📄 Файл books.json не найден, пропускаем миграцию книг');
    } else {
      console.error('❌ Ошибка миграции книг:', error);
    }
  }
}

async function migrateBookmarks() {
  try {
    const dbPath = getDbPath();
    const data = JSON.parse(await readFile(dbPath, 'utf-8'));
    const bookmarks = data.bookmarks || [];

    console.log(`📦 Миграция ${bookmarks.length} закладок...`);

    for (const bookmark of bookmarks) {
      const result = await addBookmark({
        filename: bookmark.filename,
        page: bookmark.page,
        title: bookmark.title
      });

      if (result.success) {
        console.log(`✅ Мигрирована закладка: ${bookmark.title || bookmark.id}`);
      } else {
        console.log(`⚠️  Закладка ${bookmark.id}: ${result.message}`);
      }
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('📄 Файл database.json не найден, пропускаем миграцию закладок');
    } else {
      console.error('❌ Ошибка миграции закладок:', error);
    }
  }
}

async function migrateSettings() {
  try {
    const dbPath = getDbPath();
    const data = JSON.parse(await readFile(dbPath, 'utf-8'));
    const settings = data.settings || {};

    if (Object.keys(settings).length > 0) {
      console.log(`📦 Миграция настроек...`);
      await saveSettings(settings);
      console.log(`✅ Настройки мигрированы`);
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('📄 Файл database.json не найден, пропускаем миграцию настроек');
    } else {
      console.error('❌ Ошибка миграции настроек:', error);
    }
  }
}

async function main() {
  console.log('🚀 Начало миграции данных в PostgreSQL...\n');

  try {
    // Инициализируем БД
    console.log('1️⃣  Инициализация структуры БД...');
    await initDatabase();
    console.log('✅ Структура БД готова\n');

    // Мигрируем данные
    console.log('2️⃣  Миграция пользователей...');
    await migrateUsers();
    console.log('');

    console.log('3️⃣  Миграция книг...');
    await migrateBooks();
    console.log('');

    console.log('4️⃣  Миграция закладок...');
    await migrateBookmarks();
    console.log('');

    console.log('5️⃣  Миграция настроек...');
    await migrateSettings();
    console.log('');

    console.log('✅ Миграция завершена успешно!');
    await logToDb('info', 'Data migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Критическая ошибка миграции:', error);
    await logToDb('error', 'Data migration failed', { error: error.message });
    process.exit(1);
  }
}

main();

