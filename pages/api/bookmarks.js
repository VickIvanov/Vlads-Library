import { getBookmarks, addBookmark, deleteBookmark } from '../../lib/db.js';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const { filename } = req.query;
      if (!filename) {
        return res.status(400).json({ error: 'filename обязателен' });
      }
      const bookmarks = await getBookmarks(filename);
      res.status(200).json(bookmarks);
    } else if (req.method === 'POST') {
      const { filename, page, title } = req.body;
      if (!filename || page === undefined) {
        return res.status(400).json({ error: 'filename и page обязательны' });
      }
      const result = await addBookmark({ filename, page, title });
      if (result.success) {
        res.status(200).json({ message: 'Закладка добавлена', bookmark: result.bookmark });
      } else {
        res.status(400).json({ error: result.message || 'Не удалось добавить закладку' });
      }
    } else if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: 'ID обязателен' });
      }
      const result = await deleteBookmark(id);
      if (result.success) {
        res.status(200).json({ message: 'Закладка удалена' });
      } else {
        res.status(404).json({ error: result.message || 'Закладка не найдена' });
      }
    } else {
      res.status(405).json({ error: 'Method Not Allowed' });
    }
  } catch (error) {
    console.error('Ошибка API закладок:', error);
    res.status(500).json({ error: error.message || 'Внутренняя ошибка сервера' });
  }
}

