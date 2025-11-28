import { sendMessage, getConversation, getUserChats, markMessagesAsRead, getUnreadCount, editMessage, deleteMessage } from '../../lib/db.js';
import { ensureDatabaseInitialized } from '../../lib/db-init.js';
import { logToDb } from '../../lib/logger.js';

export default async function handler(req, res) {
  await ensureDatabaseInitialized();
  
  try {
    if (req.method === 'POST') {
      // Отправка сообщения
      const { senderUsername, receiverUsername, content } = req.body;
      
      if (!senderUsername || !receiverUsername || !content) {
        return res.status(400).json({ error: 'Заполните все поля' });
      }
      
      if (!content.trim()) {
        return res.status(400).json({ error: 'Сообщение не может быть пустым' });
      }
      
      const result = await sendMessage(senderUsername, receiverUsername, content.trim());
      
      if (result.success) {
        try {
          await logToDb('info', 'Message sent via API', { sender: senderUsername, receiver: receiverUsername }, req);
        } catch (logError) {
          // Игнорируем ошибки логирования
        }
        return res.status(200).json({ message: 'Сообщение отправлено', data: result.message });
      } else {
        return res.status(400).json({ error: result.message || 'Ошибка отправки сообщения' });
      }
    } else if (req.method === 'GET') {
      const { username, otherUsername, action } = req.query;
      
      if (!username) {
        return res.status(400).json({ error: 'Имя пользователя не указано' });
      }
      
      if (action === 'chats') {
        // Получить список чатов пользователя
        const chats = await getUserChats(username);
        return res.status(200).json(chats);
      } else if (action === 'unread') {
        // Получить количество непрочитанных сообщений
        const count = await getUnreadCount(username);
        return res.status(200).json({ count });
      } else if (otherUsername) {
        // Получить переписку между двумя пользователями
        const conversation = await getConversation(username, otherUsername);
        
        // Отмечаем сообщения как прочитанные
        if (username !== otherUsername) {
          await markMessagesAsRead(otherUsername, username);
        }
        
        return res.status(200).json(conversation);
      } else {
        return res.status(400).json({ error: 'Укажите otherUsername или action' });
      }
    } else if (req.method === 'PUT') {
      // Редактирование сообщения
      const { messageId, senderUsername, content } = req.body;
      
      if (!messageId || !senderUsername || !content) {
        return res.status(400).json({ error: 'Заполните все поля' });
      }
      
      if (!content.trim()) {
        return res.status(400).json({ error: 'Сообщение не может быть пустым' });
      }
      
      const result = await editMessage(messageId, senderUsername, content.trim());
      
      if (result.success) {
        return res.status(200).json({ message: 'Сообщение отредактировано', data: result.message });
      } else {
        return res.status(400).json({ error: result.message || 'Ошибка редактирования сообщения' });
      }
    } else if (req.method === 'DELETE') {
      // Удаление сообщения
      const { messageId, senderUsername } = req.body;
      
      if (!messageId || !senderUsername) {
        return res.status(400).json({ error: 'ID сообщения и имя пользователя обязательны' });
      }
      
      const result = await deleteMessage(messageId, senderUsername);
      
      if (result.success) {
        return res.status(200).json({ message: 'Сообщение удалено', data: result.message });
      } else {
        return res.status(400).json({ error: result.message || 'Ошибка удаления сообщения' });
      }
    } else {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }
  } catch (error) {
    console.error('Ошибка API сообщений:', error);
    try {
      await logToDb('error', 'Messages API error', { error: error.message }, req);
    } catch (logError) {
      // Игнорируем ошибки логирования
    }
    res.status(500).json({ error: error.message || 'Внутренняя ошибка сервера' });
  }
}

