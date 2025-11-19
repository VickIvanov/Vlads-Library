import { getAllBooks, addBook, deleteBook } from '../../lib/db.js';
import { logToDb } from '../../lib/logger.js';
import { ensureDatabaseInitialized } from '../../lib/db-init.js';

export default async function handler(req, res) {
  // Инициализируем БД при первом запросе
  await ensureDatabaseInitialized();
  
  try {
    if (req.method === 'GET') {
      const books = await getAllBooks();
      // Всегда возвращаем массив
      const booksArray = Array.isArray(books) ? books : [];
      await logToDb('info', 'Books list requested', { count: booksArray.length }, req);
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
        await logToDb('info', 'Book added', { bookId: result.id, title: title }, req);
        res.status(200).json({ message: 'Книга добавлена', id: result.id });
      } else {
        await logToDb('warning', 'Failed to add book', { title, reason: result.message }, req);
        res.status(400).json({ error: result.message || 'Не удалось добавить книгу' });
      }
    } else if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: 'ID обязателен' });
      }

      const result = await deleteBook(id);
      if (result.success) {
        await logToDb('info', 'Book deleted', { bookId: id }, req);
        res.status(200).json({ message: 'Книга удалена' });
      } else {
        await logToDb('warning', 'Failed to delete book', { bookId: id, reason: result.message }, req);
        res.status(404).json({ error: result.message || 'Книга не найдена' });
      }
    } else {
      res.status(405).json({ error: 'Method Not Allowed' });
    }
  } catch (error) {
    console.error('Ошибка API:', error);
    await logToDb('error', 'Books API error', { method: req.method, error: error.message }, req);
    // Для GET запросов возвращаем пустой массив вместо ошибки
    if (req.method === 'GET') {
      return res.status(200).json([]);
    }
    res.status(500).json({ error: error.message || 'Внутренняя ошибка сервера' });
  }
}
