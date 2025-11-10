import { getAllBooks, addBook, deleteBook } from '../../lib/db.js';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const books = await getAllBooks();
      // Всегда возвращаем массив
      const booksArray = Array.isArray(books) ? books : [];
      res.status(200).json(booksArray);
    } else if (req.method === 'POST') {
      const { title, author, genre, description = '', cover = 'https://via.placeholder.com/150', added_by = 'неизвестно' } = req.body;
      if (!title || !author || !genre) {
        return res.status(400).json({ error: 'title, author и genre обязательны' });
      }

      const bookData = { title, author, genre, description, cover, added_by };
      // ID теперь генерируется автоматически из названия книги

      const result = await addBook(bookData);
      if (result.success) {
        res.status(200).json({ message: 'Книга добавлена', id: result.id });
      } else {
        res.status(400).json({ error: result.message || 'Не удалось добавить книгу' });
      }
    } else if (req.method === 'DELETE') {
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
    } else {
      res.status(405).json({ error: 'Method Not Allowed' });
    }
  } catch (error) {
    console.error('Ошибка API:', error);
    // Для GET запросов возвращаем пустой массив вместо ошибки
    if (req.method === 'GET') {
      return res.status(200).json([]);
    }
    res.status(500).json({ error: error.message || 'Внутренняя ошибка сервера' });
  }
}
