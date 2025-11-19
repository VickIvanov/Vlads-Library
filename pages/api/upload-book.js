import { writeFile, mkdir, unlink } from 'fs/promises';
import { addBook } from '../../lib/db.js';
import { IncomingForm } from 'formidable';
import { getBooksDirPath, getBookFilePath } from '../../lib/paths.js';
import { logToDb } from '../../lib/logger.js';
import { ensureDatabaseInitialized } from '../../lib/db-init.js';

// Функция для нормализации имени файла
function normalizeFilename(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9а-яё\s-]/gi, '')
    .replace(/\s+/g, '_')
    .replace(/-+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '') + '.txt';
}

export const config = {
  api: {
    bodyParser: false, // Отключаем парсинг тела, чтобы обработать FormData
  },
};

export default async function handler(req, res) {
  // Инициализируем БД при первом запросе
  await ensureDatabaseInitialized();
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const BOOKS_PATH = getBooksDirPath();
    
    // Создаем папку, если её нет
    try {
      await mkdir(BOOKS_PATH, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        console.error('Ошибка создания папки:', error);
      }
    }

    const form = new IncomingForm({
      uploadDir: BOOKS_PATH,
      keepExtensions: true,
      maxFileSize: 16 * 1024 * 1024, // 16MB
    });

    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error('Ошибка парсинга формы:', err);
        return res.status(500).json({ error: 'Ошибка обработки файла' });
      }

      try {
        const file = files.file;
        const title = Array.isArray(fields.title) ? fields.title[0] : fields.title || '';
        const author = Array.isArray(fields.author) ? fields.author[0] : fields.author || '';
        const genre = Array.isArray(fields.genre) ? fields.genre[0] : fields.genre || '';
        const description = Array.isArray(fields.description) ? fields.description[0] : fields.description || '';
        const cover = Array.isArray(fields.cover) ? fields.cover[0] : fields.cover || 'https://via.placeholder.com/300x400/4a5568/ffffff?text=No+Cover';

        if (!file) {
          return res.status(400).json({ error: 'Файл не загружен' });
        }

        const fileObj = Array.isArray(file) ? file[0] : file;

        // Проверяем формат файла
        const fileName = fileObj.originalFilename || fileObj.name || '';
        if (!fileName.toLowerCase().endsWith('.txt')) {
          // Удаляем временный файл
          try {
            await unlink(fileObj.filepath);
          } catch (e) {}
          return res.status(400).json({ error: 'Разрешены только файлы формата .txt' });
        }

        // Валидация обязательных полей
        if (!title || !author || !genre) {
          // Удаляем временный файл
          try {
            await unlink(fileObj.filepath);
          } catch (e) {}
          return res.status(400).json({ error: 'title, author и genre обязательны' });
        }

        // Нормализуем имя файла
        const normalizedFilename = normalizeFilename(title);
        const filePath = getBookFilePath(normalizedFilename);

        // Перемещаем файл с временного имени на финальное
        try {
          const { readFile } = await import('fs/promises');
          const fileContent = await readFile(fileObj.filepath, 'utf-8');
          await writeFile(filePath, fileContent, 'utf-8');
          // Удаляем временный файл
          await unlink(fileObj.filepath);
        } catch (error) {
          console.error('Ошибка сохранения файла:', error);
          // Удаляем временный файл
          try {
            await unlink(fileObj.filepath);
          } catch (e) {}
          return res.status(500).json({ error: 'Ошибка сохранения файла' });
        }

        // Добавляем книгу в базу данных
        const bookData = {
          title,
          author,
          genre,
          description,
          cover,
          book_file: normalizedFilename,
          file_format: 'txt'
        };

        const result = await addBook(bookData);
        
        if (result.success) {
          await logToDb('info', 'Book uploaded and added', { bookId: result.id, title, filename: normalizedFilename }, req);
          res.status(200).json({ 
            message: 'Книга и файл успешно добавлены', 
            id: result.id,
            filename: normalizedFilename
          });
        } else {
          // Удаляем файл, если не удалось добавить в БД
          try {
            await unlink(filePath);
          } catch (e) {
            console.error('Ошибка удаления файла:', e);
          }
          await logToDb('warning', 'Failed to add uploaded book', { title, reason: result.message }, req);
          res.status(400).json({ error: result.message || 'Не удалось добавить книгу' });
        }
      } catch (error) {
        console.error('Ошибка обработки:', error);
        await logToDb('error', 'Upload book processing error', { error: error.message, stack: error.stack }, req);
        res.status(500).json({ error: error.message || 'Внутренняя ошибка сервера' });
      }
    });
  } catch (error) {
    console.error('Ошибка загрузки файла:', error);
    await logToDb('error', 'Upload book handler error', { error: error.message, stack: error.stack }, req);
    res.status(500).json({ error: error.message || 'Внутренняя ошибка сервера' });
  }
}

