import { getSql } from '../../../lib/db-connection.js';
import { ensureDatabaseInitialized } from '../../../lib/db-init.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    await ensureDatabaseInitialized();
    
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'ID пользователя не указан' });
    }

    // Убираем @ если есть
    const normalizedUserId = userId.replace(/^@+/, '');
    
    try {
      const sql = await getSql();
      const result = await sql`SELECT id, username, user_id, name, email, created_at FROM users WHERE user_id = ${'@' + normalizedUserId}`;
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Пользователь не найден' });
      }

      const user = result.rows[0];
      
      // Не возвращаем пароль и другую чувствительную информацию
      return res.status(200).json({
        id: user.id,
        username: user.username,
        userId: user.user_id,
        name: user.name,
        email: user.email ? user.email.substring(0, 3) + '***' : null, // Частично скрываем email
        createdAt: user.created_at
      });
    } catch (dbError) {
      console.error('Ошибка поиска пользователя:', dbError);
      return res.status(500).json({ 
        error: 'Ошибка поиска пользователя',
        details: dbError.message 
      });
    }
  } catch (error) {
    console.error('Ошибка API поиска пользователя:', error);
    res.status(500).json({ error: error.message || 'Внутренняя ошибка сервера' });
  }
}

