import { getSettings as getSettingsFromDb, saveSettings as saveSettingsToDb } from './db.js';

// Получить настройки (включая фон)
export async function getSettings() {
  return await getSettingsFromDb();
}

// Сохранить настройки
export async function saveSettings(settings) {
  return await saveSettingsToDb(settings);
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
