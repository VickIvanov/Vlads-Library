import { saveChatNickname, getChatNickname, getAllChatNicknames } from '../../lib/db.js';
import { ensureDatabaseInitialized } from '../../lib/db-init.js';

export default async function handler(req, res) {
  await ensureDatabaseInitialized();
  
  try {
    if (req.method === 'POST') {
      // Сохранить переименование
      const { username, contactUsername, nickname } = req.body;
      
      if (!username || !contactUsername) {
        return res.status(400).json({ error: 'Не указаны пользователи' });
      }
      
      const result = await saveChatNickname(username, contactUsername, nickname);
      
      if (result.success) {
        return res.status(200).json({ message: 'Переименование сохранено' });
      } else {
        return res.status(400).json({ error: result.message || 'Ошибка сохранения' });
      }
    } else if (req.method === 'GET') {
      const { username, contactUsername, action } = req.query;
      
      if (!username) {
        return res.status(400).json({ error: 'Имя пользователя не указано' });
      }
      
      if (action === 'all') {
        // Получить все переименования пользователя
        const nicknames = await getAllChatNicknames(username);
        return res.status(200).json(nicknames);
      } else if (contactUsername) {
        // Получить переименование конкретного собеседника
        const nickname = await getChatNickname(username, contactUsername);
        return res.status(200).json({ nickname });
      } else {
        return res.status(400).json({ error: 'Укажите contactUsername или action=all' });
      }
    } else {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }
  } catch (error) {
    console.error('Ошибка API переименований:', error);
    res.status(500).json({ error: error.message || 'Внутренняя ошибка сервера' });
  }
}

