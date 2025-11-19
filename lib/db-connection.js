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

  // Проверяем переменные окружения
  const postgresUrl = process.env.POSTGRES_URL || 
                      process.env.POSTGRES_PRISMA_URL || 
                      process.env.DATABASE_URL ||
                      process.env.NEON_DATABASE_URL ||
                      process.env.SUPABASE_DB_URL;

  if (!postgresUrl) {
    throw new Error('Не найдена переменная окружения для подключения к PostgreSQL. Проверьте POSTGRES_URL, DATABASE_URL или другие переменные.');
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
    const pool = new Pool({
      connectionString: postgresUrl,
      ssl: postgresUrl.includes('sslmode=require') || 
           postgresUrl.includes('ssl=true') || 
           postgresUrl.includes('neon.tech') || 
           postgresUrl.includes('supabase.co') 
           ? { rejectUnauthorized: false } 
           : false
    });

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

