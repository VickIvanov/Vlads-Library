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
      const success = await initDatabase();
      if (success) {
        initialized = true;
        return true;
      } else {
        console.warn('Инициализация БД вернула false');
        return false;
      }
    } catch (error) {
      console.error('Ошибка инициализации БД:', error);
      // Логируем ошибку, но не блокируем работу приложения
      // Приложение попробует инициализировать БД при следующем запросе
      return false;
    }
  })();

  return initPromise;
}

