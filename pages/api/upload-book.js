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
  // Убеждаемся, что мы всегда возвращаем ответ
  try {
    console.log('[UPLOAD-BOOK] === НАЧАЛО ОБРАБОТКИ ===');
    console.log('[UPLOAD-BOOK] Запрос получен:', { 
      method: req.method, 
      url: req.url, 
      headers: Object.keys(req.headers || {}),
      contentType: req.headers['content-type']
    });
    
    if (req.method !== 'POST') {
      console.log('[UPLOAD-BOOK] Неверный метод:', req.method);
      return res.status(405).json({ error: 'Method Not Allowed' });
    }
    
    // Не проверяем Content-Type строго - FormData может не устанавливать его автоматически
    // Браузер сам установит правильный заголовок с boundary

    // Инициализируем БД при первом запросе
    try {
      console.log('[UPLOAD-BOOK] Инициализация БД...');
      const dbInitResult = await ensureDatabaseInitialized();
      console.log('[UPLOAD-BOOK] БД инициализирована:', dbInitResult);
      
      if (!dbInitResult) {
        console.warn('[UPLOAD-BOOK] БД не инициализирована, но продолжаем...');
      }
    } catch (dbInitError) {
      console.error('[UPLOAD-BOOK] Ошибка инициализации БД:', dbInitError);
      // Не блокируем запрос, если БД не инициализирована - вернем ошибку позже
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
        multiples: false, // Только один файл
      });

      // Используем Promise для правильной обработки асинхронности
      const parseForm = () => {
        return new Promise((resolve, reject) => {
          form.parse(req, (err, fields, files) => {
            if (err) {
              reject(err);
            } else {
              resolve({ fields, files });
            }
          });
        });
      };

      try {
        const { fields, files } = await parseForm();

        console.log('[UPLOAD-BOOK] Получены данные:', { 
          fields: Object.keys(fields), 
          files: files ? Object.keys(files) : 'нет файлов' 
        });
        
        const file = files.file;
        const title = Array.isArray(fields.title) ? fields.title[0] : fields.title || '';
        const author = Array.isArray(fields.author) ? fields.author[0] : fields.author || '';
        const genre = Array.isArray(fields.genre) ? fields.genre[0] : fields.genre || '';
        const description = Array.isArray(fields.description) ? fields.description[0] : fields.description || '';
        const cover = Array.isArray(fields.cover) ? fields.cover[0] : fields.cover || 'https://via.placeholder.com/300x400/4a5568/ffffff?text=No+Cover';

        console.log('[UPLOAD-BOOK] Распарсенные данные:', { title, author, genre, hasFile: !!file });

        if (!file) {
          console.error('[UPLOAD-BOOK] Файл не найден в запросе');
          return res.status(400).json({ error: 'Файл не загружен', details: 'Поле file отсутствует в запросе' });
        }

        const fileObj = Array.isArray(file) ? file[0] : file;
        console.log('[UPLOAD-BOOK] Информация о файле:', { 
          originalFilename: fileObj.originalFilename,
          name: fileObj.name,
          size: fileObj.size,
          mimetype: fileObj.mimetype
        });

        // Проверяем формат файла
        const fileName = fileObj.originalFilename || fileObj.name || '';
        if (!fileName.toLowerCase().endsWith('.txt')) {
          console.error('[UPLOAD-BOOK] Неверный формат файла:', fileName);
          // Удаляем временный файл
          try {
            await unlink(fileObj.filepath);
          } catch (e) {}
          return res.status(400).json({ error: 'Разрешены только файлы формата .txt', details: `Получен файл: ${fileName}` });
        }

        // Валидация обязательных полей
        if (!title || !title.trim()) {
          console.error('[UPLOAD-BOOK] Отсутствует title:', title);
          // Удаляем временный файл
          try {
            await unlink(fileObj.filepath);
          } catch (e) {}
          return res.status(400).json({ error: 'Название книги обязательно', details: 'Поле title пустое или отсутствует' });
        }
        
        if (!author || !author.trim()) {
          console.error('[UPLOAD-BOOK] Отсутствует author:', author);
          // Удаляем временный файл
          try {
            await unlink(fileObj.filepath);
          } catch (e) {}
          return res.status(400).json({ error: 'Автор обязателен', details: 'Поле author пустое или отсутствует' });
        }
        
        if (!genre || !genre.trim()) {
          console.error('[UPLOAD-BOOK] Отсутствует genre:', genre);
          // Удаляем временный файл
          try {
            await unlink(fileObj.filepath);
          } catch (e) {}
          return res.status(400).json({ error: 'Жанр обязателен', details: 'Поле genre пустое или отсутствует' });
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

        console.log('[UPLOAD-BOOK] Пытаемся добавить книгу в БД:', { title, author, genre });
        const result = await addBook(bookData);
        console.log('[UPLOAD-BOOK] Результат добавления:', { success: result.success, message: result.message, id: result.id });
        
        if (result.success) {
          // Безопасное логирование
          try {
            await logToDb('info', 'Book uploaded and added', { bookId: result.id, title, filename: normalizedFilename }, req);
          } catch (logError) {
            console.error('Ошибка логирования:', logError);
          }
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
          // Безопасное логирование
          try {
            await logToDb('warning', 'Failed to add uploaded book', { title, reason: result.message }, req);
          } catch (logError) {
            console.error('Ошибка логирования:', logError);
          }
          res.status(400).json({ error: result.message || 'Не удалось добавить книгу' });
        }
      } catch (error) {
        console.error('[UPLOAD-BOOK] Ошибка обработки:', error);
        // Безопасное логирование - не блокируем ответ если логирование не удалось
        try {
          await logToDb('error', 'Upload book processing error', { error: error.message, stack: error.stack }, req);
        } catch (logError) {
          console.error('Ошибка логирования:', logError);
        }
        
        if (!res.headersSent) {
          res.status(500).json({ error: error.message || 'Внутренняя ошибка сервера' });
        }
      }
    } catch (error) {
      console.error('[UPLOAD-BOOK] Критическая ошибка:', error);
      // Безопасное логирование - не блокируем ответ если логирование не удалось
      try {
        await logToDb('error', 'Upload book handler error', { error: error.message, stack: error.stack }, req);
      } catch (logError) {
        console.error('Ошибка логирования:', logError);
      }
      
      // Убеждаемся, что мы всегда возвращаем ответ
      if (!res.headersSent) {
        res.status(500).json({ 
          error: error.message || 'Внутренняя ошибка сервера',
          details: 'Произошла ошибка при обработке запроса. Проверьте логи сервера.'
        });
      }
    }
  } catch (outerError) {
    console.error('[UPLOAD-BOOK] Внешняя ошибка:', outerError);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Критическая ошибка сервера',
        details: outerError.message || 'Неизвестная ошибка'
      });
    }
  }
}

