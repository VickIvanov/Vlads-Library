/**
 * Универсальное подключение к PostgreSQL
 * Поддерживает: Vercel Postgres, Neon, Supabase, Prisma и другие провайдеры
 */

let sql = null;
let connectionType = null;

// Инициализация подключения
async function initConnection() {
  if (sql) {
    return sql;
  }

  // Проверяем переменные окружения (приоритет для Neon)
  // Поддерживаем переменные с префиксом (например, library_DATABASE_URL) и без префикса
  // ВАЖНО: Проверяем DATABASE_URL первым, так как это основная переменная для Neon
  const postgresUrl = process.env.DATABASE_URL ||
                      process.env.library_DATABASE_URL ||
                      process.env.NEON_DATABASE_URL ||
                      process.env.library_NEON_DATABASE_URL ||
                      process.env.POSTGRES_URL ||
                      process.env.library_POSTGRES_URL ||
                      process.env.POSTGRES_PRISMA_URL ||
                      process.env.library_POSTGRES_PRISMA_URL ||
                      process.env.SUPABASE_DB_URL;

  if (!postgresUrl) {
    // Детальное логирование для отладки
    const allEnvKeys = Object.keys(process.env);
    const dbKeys = allEnvKeys.filter(k => 
      k.includes('POSTGRES') || 
      k.includes('DATABASE') || 
      k.includes('NEON') ||
      k.includes('PG') ||
      k.startsWith('library_')
    );
    console.error('[DB-CONNECTION] ❌ Не найдена переменная окружения для подключения к PostgreSQL');
    console.error('[DB-CONNECTION] Проверенные переменные:');
    console.error('[DB-CONNECTION]   - NEON_DATABASE_URL:', !!process.env.NEON_DATABASE_URL);
    console.error('[DB-CONNECTION]   - library_NEON_DATABASE_URL:', !!process.env.library_NEON_DATABASE_URL);
    console.error('[DB-CONNECTION]   - DATABASE_URL:', !!process.env.DATABASE_URL);
    console.error('[DB-CONNECTION]   - library_DATABASE_URL:', !!process.env.library_DATABASE_URL);
    console.error('[DB-CONNECTION]   - POSTGRES_URL:', !!process.env.POSTGRES_URL);
    console.error('[DB-CONNECTION]   - library_POSTGRES_URL:', !!process.env.library_POSTGRES_URL);
    console.error('[DB-CONNECTION] Найденные переменные окружения, связанные с БД:', dbKeys.length > 0 ? dbKeys.join(', ') : 'нет');
    console.error('[DB-CONNECTION] Всего переменных окружения:', allEnvKeys.length);
    
    throw new Error('Не найдена переменная окружения для подключения к PostgreSQL. Добавьте DATABASE_URL в Settings → Environment Variables на Vercel.');
  }
  
  console.log('[DB-CONNECTION] Найдена переменная окружения для подключения к БД');
  console.log('[DB-CONNECTION] URL (первые 50 символов):', postgresUrl.substring(0, 50) + '...');

  // Определяем провайдера
  const isNeon = postgresUrl.includes('neon.tech') || 
                 process.env.NEON_DATABASE_URL || 
                 process.env.library_NEON_DATABASE_URL;
  if (isNeon) {
    console.log('[DB] Обнаружена Neon база данных');
  }

  // Пытаемся использовать @neondatabase/serverless (рекомендуется для Neon)
  if (isNeon) {
    try {
      const { neon } = await import('@neondatabase/serverless');
      const neonSql = neon(postgresUrl);
      
      // Создаем обертку для совместимости с template literals
      // Neon serverless driver использует параметризованные запросы
      sql = async (strings, ...values) => {
        if (typeof strings === 'string') {
          // Если передан обычный SQL запрос (для getLogs)
          const result = await neonSql(strings, values);
          // Neon возвращает массив строк напрямую, оборачиваем в формат { rows }
          return { rows: Array.isArray(result) ? result : [result] };
        }
        
        // Template literal синтаксис - конвертируем в параметризованный запрос
        let query = '';
        const params = [];
        let paramIndex = 1;
        
        for (let i = 0; i < strings.length; i++) {
          query += strings[i];
          if (i < values.length) {
            query += `$${paramIndex++}`;
            params.push(values[i]);
          }
        }
        
        const result = await neonSql(query, params);
        // Neon возвращает массив строк напрямую, оборачиваем в формат { rows }
        return { rows: Array.isArray(result) ? result : [result] };
      };
      
      connectionType = 'neon';
      console.log('[DB] Используется @neondatabase/serverless (оптимизировано для Neon)');
      return sql;
    } catch (error) {
      console.log('[DB] @neondatabase/serverless недоступен, используем pg:', error.message);
    }
  }

  // Пытаемся использовать @vercel/postgres (для Vercel Postgres)
  try {
    const vercelPostgres = await import('@vercel/postgres');
    sql = vercelPostgres.sql;
    connectionType = 'vercel';
    console.log('[DB] Используется @vercel/postgres');
    return sql;
  } catch (error) {
    console.log('[DB] @vercel/postgres недоступен, используем pg');
  }

  // Используем стандартный pg (для Neon, Supabase и других)
  try {
    const { Pool } = await import('pg');
    
    // Neon всегда требует SSL
    const isNeon = postgresUrl.includes('neon.tech') || 
                   process.env.NEON_DATABASE_URL || 
                   process.env.library_NEON_DATABASE_URL;
    const needsSSL = postgresUrl.includes('sslmode=require') || 
                     postgresUrl.includes('ssl=true') || 
                     isNeon || 
                     postgresUrl.includes('supabase.co');
    
    const pool = new Pool({
      connectionString: postgresUrl,
      ssl: needsSSL ? { rejectUnauthorized: false } : false,
      // Для Neon рекомендуется использовать connection pooling
      max: isNeon ? 10 : 20, // Максимум соединений
      idleTimeoutMillis: isNeon ? 30000 : 30000, // Таймаут для неактивных соединений
    });
    
    if (isNeon) {
      console.log('[DB] Настроено подключение к Neon с SSL');
    }

    // Создаем обертку для совместимости с @vercel/postgres (template literals)
    sql = (strings, ...values) => {
      if (typeof strings === 'string') {
        // Если передан обычный SQL запрос (для getLogs)
        return pool.query(strings, values);
      }
      
      // Template literal синтаксис
      let query = '';
      const params = [];
      let paramIndex = 1;
      
      for (let i = 0; i < strings.length; i++) {
        query += strings[i];
        if (i < values.length) {
          query += `$${paramIndex++}`;
          params.push(values[i]);
        }
      }
      
      return pool.query(query, params);
    };

    connectionType = 'pg';
    console.log('[DB] Используется pg (стандартный PostgreSQL клиент)');
    return sql;
  } catch (error) {
    console.error('[DB] Ошибка инициализации подключения:', error);
    throw new Error(`Не удалось подключиться к базе данных: ${error.message}`);
  }
}

// Получить SQL функцию
export async function getSql() {
  if (!sql) {
    await initConnection();
  }
  return sql;
}

// Выполнить SQL запрос (для обратной совместимости)
// Удалено - используйте getSql() напрямую

// Получить тип подключения
export function getConnectionType() {
  return connectionType;
}

