import { getSql } from '../../../lib/db-connection.js';
import { ensureDatabaseInitialized } from '../../../lib/db-init.js';

// Хранилище статусов "пишет" (в памяти, для простоты)
// В продакшене лучше использовать Redis или БД
const typingUsers = new Map(); // Map<username, { typing: boolean, timestamp: number }>

export default async function handler(req, res) {
  await ensureDatabaseInitialized();
  
  if (req.method === 'POST') {
    // Установить статус "пишет"
    const { username, receiverUsername, isTyping } = req.body;
    
    if (!username || !receiverUsername) {
      return res.status(400).json({ error: 'Не указаны пользователи' });
    }
    
    const key = `${username}_${receiverUsername}`;
    
    if (isTyping) {
      typingUsers.set(key, { typing: true, timestamp: Date.now() });
      // Автоматически убираем статус через 3 секунды
      setTimeout(() => {
        if (typingUsers.has(key)) {
          const data = typingUsers.get(key);
          if (Date.now() - data.timestamp > 3000) {
            typingUsers.delete(key);
          }
        }
      }, 3000);
    } else {
      typingUsers.delete(key);
    }
    
    return res.status(200).json({ success: true });
  } else if (req.method === 'GET') {
    // Получить статус "пишет"
    const { username, receiverUsername } = req.query;
    
    if (!username || !receiverUsername) {
      return res.status(400).json({ error: 'Не указаны пользователи' });
    }
    
    const key = `${receiverUsername}_${username}`; // Проверяем обратный ключ
    const typingData = typingUsers.get(key);
    
    if (typingData && Date.now() - typingData.timestamp < 3000) {
      return res.status(200).json({ isTyping: true });
    } else {
      // Удаляем устаревшие данные
      if (typingData) {
        typingUsers.delete(key);
      }
      return res.status(200).json({ isTyping: false });
    }
  } else {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
}

