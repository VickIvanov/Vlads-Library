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
      console.log('[BOOK-TEXT] Запрос книги с ID:', id);
      const result = await sql`SELECT * FROM books WHERE id = ${id}`;
      
      if (result.rows.length === 0) {
        console.error('[BOOK-TEXT] Книга не найдена в БД с ID:', id);
        return res.status(404).json({ 
          error: 'Книга не найдена в базе данных',
          details: `ID: ${id}`
        });
      }

      const book = result.rows[0];
      console.log('[BOOK-TEXT] Книга найдена:', { 
        id: book.id, 
        title: book.title, 
        book_file: book.book_file,
        hasContent: !!book.content
      });
      
      // Приоритет: содержимое из БД, затем файл на диске
      if (book.content) {
        console.log('[BOOK-TEXT] Используется содержимое из БД, размер:', book.content.length);
        return res.status(200).json({
          text: book.content,
          title: book.title || 'Книга',
          author: book.author || 'Неизвестен'
        });
      }
      
      // Fallback: пытаемся прочитать файл (для обратной совместимости)
      const filename = book.book_file || book.id;
      if (!filename) {
        console.error('[BOOK-TEXT] Файл книги не указан и содержимое отсутствует для ID:', id);
        return res.status(404).json({ 
          error: 'Содержимое книги не найдено в базе данных',
          details: `ID: ${id}, book_file: ${book.book_file}`
        });
      }

      // Проверяем безопасность имени файла
      if (filename.includes('..') || filename.includes('/')) {
        return res.status(400).json({ error: 'Некорректное имя файла' });
      }

      const filePath = getBookFilePath(filename);
      console.log('[BOOK-TEXT] Содержимое в БД отсутствует, пытаемся прочитать файл:', filePath);

      try {
        // Проверяем существование файла
        const { access, readdir } = await import('fs/promises');
        try {
          await access(filePath);
        } catch (accessError) {
          if (accessError.code === 'ENOENT') {
            console.error('[BOOK-TEXT] Файл не найден по пути:', filePath);
            return res.status(404).json({ 
              error: `Содержимое книги не найдено`,
              details: `Файл "${filename}" не найден и содержимое отсутствует в БД. Перезагрузите книгу.`,
              bookId: id,
              bookFile: filename
            });
          }
          throw accessError;
        }
        
        const fileContent = await readFile(filePath, 'utf-8');
        console.log('[BOOK-TEXT] Файл успешно прочитан, размер:', fileContent.length);
        
        return res.status(200).json({
          text: fileContent,
          title: book.title || 'Книга',
          author: book.author || 'Неизвестен'
        });
      } catch (error) {
        console.error('[BOOK-TEXT] Ошибка чтения файла:', error);
        if (error.code === 'ENOENT') {
          return res.status(404).json({ 
            error: `Содержимое книги не найдено`,
            details: `Файл "${filename}" не найден и содержимое отсутствует в БД`
          });
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

