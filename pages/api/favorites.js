import { addToFavorites, removeFromFavorites, getUserFavorites, isBookInFavorites } from '../../lib/db.js';
import { ensureDatabaseInitialized } from '../../lib/db-init.js';
import { logToDb } from '../../lib/logger.js';

export default async function handler(req, res) {
  await ensureDatabaseInitialized();
  
  try {
    if (req.method === 'POST') {
      // Добавить в избранное
      const { username, bookId } = req.body;
      
      if (!username || !bookId) {
        return res.status(400).json({ error: 'Не указаны пользователь или книга' });
      }
      
      const result = await addToFavorites(username, bookId);
      
      if (result.success) {
        try {
          await logToDb('info', 'Book added to favorites via API', { username, bookId }, req);
        } catch (logError) {
          // Игнорируем ошибки логирования
        }
        return res.status(200).json({ message: 'Книга добавлена в избранное', favorite: result.favorite });
      } else {
        return res.status(400).json({ error: result.message || 'Ошибка добавления в избранное' });
      }
    } else if (req.method === 'DELETE') {
      // Удалить из избранного
      const { username, bookId } = req.query;
      
      if (!username || !bookId) {
        return res.status(400).json({ error: 'Не указаны пользователь или книга' });
      }
      
      const result = await removeFromFavorites(username, bookId);
      
      if (result.success) {
        try {
          await logToDb('info', 'Book removed from favorites via API', { username, bookId }, req);
        } catch (logError) {
          // Игнорируем ошибки логирования
        }
        return res.status(200).json({ message: 'Книга удалена из избранного' });
      } else {
        return res.status(400).json({ error: result.message || 'Ошибка удаления из избранного' });
      }
    } else if (req.method === 'GET') {
      const { username, bookId, action } = req.query;
      
      if (action === 'check') {
        // Проверить, в избранном ли книга
        if (!username || !bookId) {
          return res.status(400).json({ error: 'Не указаны пользователь или книга' });
        }
        
        const isFavorite = await isBookInFavorites(username, bookId);
        return res.status(200).json({ isFavorite });
      } else if (username) {
        // Получить избранные книги пользователя
        const favorites = await getUserFavorites(username);
        return res.status(200).json(favorites);
      } else {
        return res.status(400).json({ error: 'Укажите username или action' });
      }
    } else {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }
  } catch (error) {
    console.error('Ошибка API избранного:', error);
    try {
      await logToDb('error', 'Favorites API error', { error: error.message }, req);
    } catch (logError) {
      // Игнорируем ошибки логирования
    }
    res.status(500).json({ error: error.message || 'Внутренняя ошибка сервера' });
  }
}

