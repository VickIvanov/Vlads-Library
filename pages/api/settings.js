import { getSettings, saveSettings, getAvailableBackgrounds, getBackgroundPath } from '../../lib/settings.js';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const settings = await getSettings();
      const availableBackgrounds = getAvailableBackgrounds();
      
      // Формируем полные пути к фонам
      const backgrounds = availableBackgrounds.map(bg => ({
        name: bg,
        path: getBackgroundPath(bg),
        url: getBackgroundPath(bg) // Используем правильный путь
      }));
      
      res.status(200).json({
        settings,
        availableBackgrounds: backgrounds
      });
    } else if (req.method === 'POST') {
      const { background, backgroundType } = req.body;
      
      const settings = {
        background: background || null,
        backgroundType: backgroundType || 'default'
      };
      
      const success = await saveSettings(settings);
      if (success) {
        res.status(200).json({ message: 'Настройки сохранены', settings });
      } else {
        res.status(500).json({ error: 'Не удалось сохранить настройки' });
      }
    } else {
      res.status(405).json({ error: 'Method Not Allowed' });
    }
  } catch (error) {
    console.error('Ошибка API настроек:', error);
    res.status(500).json({ error: error.message || 'Внутренняя ошибка сервера' });
  }
}
