import { getUserPrivacySettings, saveUserPrivacySettings } from '../../lib/db.js';
import { ensureDatabaseInitialized } from '../../lib/db-init.js';
import { logToDb } from '../../lib/logger.js';

export default async function handler(req, res) {
  await ensureDatabaseInitialized();
  
  try {
    const { username } = req.query;
    
    if (!username) {
      return res.status(400).json({ error: 'Имя пользователя не указано' });
    }
    
    if (req.method === 'GET') {
      // Получить настройки приватности
      const settings = await getUserPrivacySettings(username);
      return res.status(200).json(settings);
    } else if (req.method === 'POST') {
      // Сохранить настройки приватности
      const { show_favorites, show_description } = req.body;
      
      const result = await saveUserPrivacySettings(username, {
        show_favorites: show_favorites === true || show_favorites === 'true',
        show_description: show_description === true || show_description === 'true'
      });
      
      if (result.success) {
        try {
          await logToDb('info', 'User privacy settings updated via API', { username }, req);
        } catch (logError) {
          // Игнорируем ошибки логирования
        }
        return res.status(200).json({ message: 'Настройки приватности сохранены' });
      } else {
        return res.status(400).json({ error: result.message || 'Ошибка сохранения настроек' });
      }
    } else {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }
  } catch (error) {
    console.error('Ошибка API настроек приватности:', error);
    try {
      await logToDb('error', 'User privacy API error', { error: error.message }, req);
    } catch (logError) {
      // Игнорируем ошибки логирования
    }
    res.status(500).json({ error: error.message || 'Внутренняя ошибка сервера' });
  }
}

