import { getSql } from './db-connection.js';

/**
 * Система логирования в PostgreSQL
 * Все логи сохраняются в таблицу logs
 */

// Уровни логирования
export const LOG_LEVELS = {
  DEBUG: 'debug',
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical'
};

/**
 * Логирование в БД
 * @param {string} level - Уровень логирования (debug, info, warning, error, critical)
 * @param {string} message - Сообщение лога
 * @param {object} context - Дополнительный контекст (объект)
 * @param {object} req - Request объект (опционально, для извлечения IP и user-agent)
 */
export async function logToDb(level, message, context = {}, req = null) {
  try {
    let ipAddress = null;
    let userAgent = null;
    let userId = null;

    // Извлекаем информацию из request если доступна
    if (req) {
      ipAddress = req.headers['x-forwarded-for'] || 
                  req.headers['x-real-ip'] || 
                  req.connection?.remoteAddress || 
                  'unknown';
      userAgent = req.headers['user-agent'] || null;
      
      // Пытаемся получить user_id из контекста или сессии
      if (context.user_id) {
        userId = context.user_id;
      }
    }

    // Если userId в контексте, используем его
    if (context.user_id) {
      userId = context.user_id;
    }

    const sql = await getSql();
    await sql`
      INSERT INTO logs (level, message, context, user_id, ip_address, user_agent)
      VALUES (
        ${level},
        ${message},
        ${JSON.stringify(context)},
        ${userId},
        ${ipAddress},
        ${userAgent}
      )
    `;
  } catch (error) {
    // Если не удалось залогировать в БД, пишем в консоль
    console.error(`[LOGGER ERROR] Failed to log to database:`, error);
    console.log(`[${level.toUpperCase()}] ${message}`, context);
  }
}

/**
 * Получить логи из БД
 * @param {object} options - Опции фильтрации
 * @param {string} options.level - Фильтр по уровню
 * @param {number} options.limit - Лимит записей
 * @param {number} options.offset - Смещение
 * @param {string} options.userId - Фильтр по пользователю
 */
export async function getLogs(options = {}) {
  try {
    const sql = await getSql();
    const { level, limit = 100, offset = 0, userId } = options;
    
    // Используем template literal синтаксис для совместимости
    let result;
    if (level && userId) {
      result = await sql`SELECT * FROM logs WHERE level = ${level} AND user_id = ${userId} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    } else if (level) {
      result = await sql`SELECT * FROM logs WHERE level = ${level} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    } else if (userId) {
      result = await sql`SELECT * FROM logs WHERE user_id = ${userId} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    } else {
      result = await sql`SELECT * FROM logs ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    }
    
    return result.rows || result;
  } catch (error) {
    console.error('Ошибка получения логов:', error);
    return [];
  }
}

/**
 * Удалить старые логи (старше указанного количества дней)
 * @param {number} days - Количество дней
 */
export async function cleanOldLogs(days = 30) {
  try {
    const sql = await getSql();
    const result = await sql`
      DELETE FROM logs 
      WHERE created_at < NOW() - INTERVAL '${days} days'
      RETURNING id
    `;
    await logToDb('info', `Cleaned old logs`, { deletedCount: result.rows?.length || 0, days });
    return { success: true, deletedCount: result.rows?.length || 0 };
  } catch (error) {
    console.error('Ошибка очистки логов:', error);
    await logToDb('error', 'Failed to clean old logs', { error: error.message });
    return { success: false, error: error.message };
  }
}

// Экспортируем удобные функции для каждого уровня
export const logDebug = (message, context, req) => logToDb(LOG_LEVELS.DEBUG, message, context, req);
export const logInfo = (message, context, req) => logToDb(LOG_LEVELS.INFO, message, context, req);
export const logWarning = (message, context, req) => logToDb(LOG_LEVELS.WARNING, message, context, req);
export const logError = (message, context, req) => logToDb(LOG_LEVELS.ERROR, message, context, req);
export const logCritical = (message, context, req) => logToDb(LOG_LEVELS.CRITICAL, message, context, req);

