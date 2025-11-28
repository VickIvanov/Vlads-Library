import { getSql } from '../../../lib/db-connection.js';
import { ensureDatabaseInitialized } from '../../../lib/db-init.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { username } = req.query;

  if (!username) {
    return res.status(400).json({ error: 'Имя пользователя не указано' });
  }

  // Настраиваем Server-Sent Events
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Отключаем буферизацию для nginx

  await ensureDatabaseInitialized();

  let lastMessageId = 0;
  let isActive = true;

  // Обработка закрытия соединения
  req.on('close', () => {
    isActive = false;
  });

  const sendUpdate = async () => {
    if (!isActive) return;

    try {
      const sql = await getSql();
      
      // Получаем новые сообщения
      const newMessages = await sql`
        SELECT * FROM messages
        WHERE (sender_username = ${username} OR receiver_username = ${username})
          AND id > ${lastMessageId}
        ORDER BY created_at ASC
      `;

      if (newMessages.rows.length > 0) {
        lastMessageId = Math.max(...newMessages.rows.map(m => m.id));
        
        // Отправляем новые сообщения
        res.write(`data: ${JSON.stringify({ type: 'messages', data: newMessages.rows })}\n\n`);
      }

      // Отправляем heartbeat для поддержания соединения
      res.write(`data: ${JSON.stringify({ type: 'ping', timestamp: Date.now() })}\n\n`);
    } catch (error) {
      console.error('Ошибка SSE:', error);
      if (isActive) {
        res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
      }
    }
  };

  // Отправляем обновления каждую секунду
  const interval = setInterval(() => {
    if (isActive) {
      sendUpdate();
    } else {
      clearInterval(interval);
    }
  }, 1000);

  // Отправляем начальное сообщение
  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

  // Очистка при закрытии
  req.on('close', () => {
    clearInterval(interval);
    isActive = false;
  });
}

