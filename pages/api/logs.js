import { getLogs, cleanOldLogs } from '../../lib/logger.js';
import { isAdmin } from '../../lib/users.js';

export default async function handler(req, res) {
  // Только админы могут просматривать логи
  const username = req.headers['x-username'] || req.query.username;
  if (!username || !isAdmin(username)) {
    return res.status(403).json({ error: 'Доступ запрещен. Только администраторы могут просматривать логи.' });
  }

  try {
    if (req.method === 'GET') {
      const { level, limit = 100, offset = 0, userId } = req.query;
      
      const logs = await getLogs({
        level: level || undefined,
        limit: parseInt(limit),
        offset: parseInt(offset),
        userId: userId || undefined
      });

      res.status(200).json(logs);
    } else if (req.method === 'DELETE') {
      // Очистка старых логов
      const { days = 30 } = req.query;
      const result = await cleanOldLogs(parseInt(days));
      
      if (result.success) {
        res.status(200).json({ 
          message: `Удалено ${result.deletedCount} старых логов`,
          deletedCount: result.deletedCount
        });
      } else {
        res.status(500).json({ error: result.error || 'Ошибка очистки логов' });
      }
    } else {
      res.status(405).json({ error: 'Method Not Allowed' });
    }
  } catch (error) {
    console.error('Ошибка работы с логами:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

