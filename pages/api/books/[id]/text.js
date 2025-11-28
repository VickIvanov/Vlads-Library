import { readFile } from 'fs/promises';
import { getBookFilePath } from '../../../../lib/paths.js';
import { getSql } from '../../../../lib/db-connection.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'ID книги не указан' });
    }

    // Получаем информацию о книге из базы данных
    try {
      const sql = await getSql();
      const result = await sql`SELECT * FROM books WHERE id = ${id}`;
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Книга не найдена' });
      }

      const book = result.rows[0];
      const filename = book.book_file || book.id;

      if (!filename) {
        return res.status(404).json({ error: 'Файл книги не указан' });
      }

      // Проверяем безопасность имени файла
      if (filename.includes('..') || filename.includes('/')) {
        return res.status(400).json({ error: 'Некорректное имя файла' });
      }

      const filePath = getBookFilePath(filename);

      try {
        // Проверяем существование файла
        const { access } = await import('fs/promises');
        try {
          await access(filePath);
        } catch (accessError) {
          if (accessError.code === 'ENOENT') {
            console.error('Файл не найден:', filePath);
            return res.status(404).json({ 
              error: `Файл "${filename}" не найден`,
              details: `Путь: ${filePath}`
            });
          }
          throw accessError;
        }
        
        const fileContent = await readFile(filePath, 'utf-8');
        
        return res.status(200).json({
          text: fileContent,
          title: book.title || 'Книга',
          author: book.author || 'Неизвестен'
        });
      } catch (error) {
        console.error('Ошибка чтения файла:', error);
        if (error.code === 'ENOENT') {
          return res.status(404).json({ error: `Файл "${filename}" не найден` });
        }
        throw error;
      }
    } catch (dbError) {
      console.error('Ошибка получения книги из БД:', dbError);
      // Если БД недоступна, пытаемся прочитать файл напрямую по ID
      const filePath = getBookFilePath(id);
      try {
        const { access } = await import('fs/promises');
        await access(filePath);
        const fileContent = await readFile(filePath, 'utf-8');
        return res.status(200).json({
          text: fileContent,
          title: id.replace(/\.(txt|TXT)$/, ''),
          author: 'Неизвестен'
        });
      } catch (fileError) {
        return res.status(404).json({ 
          error: 'Книга не найдена',
          details: dbError.message || 'Ошибка подключения к базе данных'
        });
      }
    }
  } catch (error) {
    console.error('Ошибка получения текста книги:', error);
    res.status(500).json({ error: error.message || 'Внутренняя ошибка сервера' });
  }
}

