import { deleteBook } from '../../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ error: 'ID обязателен' });
    }

    const result = await deleteBook(id);
    if (result.success) {
      res.status(200).json({ message: 'Книга удалена' });
    } else {
      res.status(404).json({ error: result.message || 'Книга не найдена' });
    }
  } catch (error) {
    console.error('Ошибка при удалении:', error);
    res.status(500).json({ error: 'Ошибка при удалении' });
  }
}
