import { updateUserStatus, getUserStatus } from '../../lib/db.js';
import { ensureDatabaseInitialized } from '../../lib/db-init.js';

export default async function handler(req, res) {
  await ensureDatabaseInitialized();
  
  try {
    if (req.method === 'POST') {
      // Обновление статуса пользователя
      const { username, status } = req.body;
      
      if (!username) {
        return res.status(400).json({ error: 'Имя пользователя не указано' });
      }
      
      const result = await updateUserStatus(username, status || 'online');
      
      if (result.success) {
        return res.status(200).json({ success: true });
      } else {
        return res.status(400).json({ error: result.message || 'Ошибка обновления статуса' });
      }
    } else if (req.method === 'GET') {
      // Получение статуса пользователя
      const { username } = req.query;
      
      if (!username) {
        return res.status(400).json({ error: 'Имя пользователя не указано' });
      }
      
      const status = await getUserStatus(username);
      return res.status(200).json(status);
    } else {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }
  } catch (error) {
    console.error('Ошибка API статуса пользователя:', error);
    res.status(500).json({ error: error.message || 'Внутренняя ошибка сервера' });
  }
}

