import { readDb, writeDb } from './db.js';

// Получить настройки (включая фон)
export async function getSettings() {
  const db = await readDb();
  return db.settings || {
    background: null,
    backgroundType: 'default' // 'default', 'custom', 'env'
  };
}

// Сохранить настройки
export async function saveSettings(settings) {
  const db = await readDb();
  if (!db.settings) {
    db.settings = {};
  }
  db.settings = { ...db.settings, ...settings };
  const success = await writeDb(db);
  return success;
}

// Получить путь к фону в зависимости от окружения
export function getBackgroundPath(filename) {
  // Всегда используем путь из public/backgrounds
  // Next.js автоматически обслуживает файлы из public/
  return `/backgrounds/${filename}`;
}

// Получить список доступных фонов
// Универсальная версия - работает везде одинаково
export function getAvailableBackgrounds() {
  // Используем переменную окружения или дефолтные значения
  const backgrounds = process.env.AVAILABLE_BACKGROUNDS || 'local1.svg,local2.svg,local3.svg';
  return backgrounds.split(',').map(bg => bg.trim()).filter(Boolean);
}
