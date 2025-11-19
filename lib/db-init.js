/**
 * Автоматическая инициализация БД при первом запуске
 * Вызывается один раз при старте приложения
 */

import { initDatabase } from './db-pg.js';

let initialized = false;
let initPromise = null;

export async function ensureDatabaseInitialized() {
  if (initialized) {
    return true;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      await initDatabase();
      initialized = true;
      return true;
    } catch (error) {
      console.error('Ошибка инициализации БД:', error);
      // Не блокируем работу приложения, если БД недоступна
      return false;
    }
  })();

  return initPromise;
}

