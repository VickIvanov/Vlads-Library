/**
 * Скрипт инициализации базы данных PostgreSQL
 * Запуск: node scripts/init-db.js
 */

import { initDatabase } from '../lib/db-pg.js';
import { logToDb } from '../lib/logger.js';

async function main() {
  console.log('🚀 Инициализация базы данных...');
  
  try {
    const success = await initDatabase();
    
    if (success) {
      console.log('✅ База данных успешно инициализирована!');
      await logToDb('info', 'Database initialization script completed successfully');
      process.exit(0);
    } else {
      console.error('❌ Ошибка инициализации базы данных');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
    process.exit(1);
  }
}

main();

