import { addToFavorites, removeFromFavorites, getUserFavorites, isBookInFavorites, getUserPrivacySettings } from '../../lib/db-pg.js';
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
      
      console.log('[FAVORITES API] Добавление в избранное:', { username, bookId });
      const result = await addToFavorites(username, bookId);
      console.log('[FAVORITES API] Результат:', result);
      
      if (result.success) {
        try {
          await logToDb('info', 'Book added to favorites via API', { username, bookId }, req);
        } catch (logError) {
          // Игнорируем ошибки логирования
        }
        return res.status(200).json({ message: 'Книга добавлена в избранное', favorite: result.favorite });
      } else {
        console.error('[FAVORITES API] Ошибка:', result.message);
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
        // Проверяем, запрашивает ли пользователь свои собственные избранные книги
        const requestingUser = req.query.requestingUser || req.headers['x-requesting-user'];
        const isOwnRequest = requestingUser === username;
        
        // Если это не запрос от самого пользователя, проверяем настройки приватности
        if (!isOwnRequest) {
          const privacySettings = await getUserPrivacySettings(username);
          
          if (!privacySettings.show_favorites) {
            // Если избранное скрыто, возвращаем пустой массив
            return res.status(200).json([]);
          }
        }
        
        // Пользователь всегда видит свои избранные книги, независимо от настроек
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

