import { writeFile, mkdir, unlink } from 'fs/promises';
import { addBook } from '../../lib/db.js';
import { IncomingForm } from 'formidable';
import { getBooksDirPath, getBookFilePath } from '../../lib/paths.js';
import { logToDb } from '../../lib/logger.js';
import { ensureDatabaseInitialized } from '../../lib/db-init.js';

// Функция normalizeFilename больше не используется
// ID теперь = полное имя файла, title = отдельное поле

// Конфигурация для Next.js API route
export const config = {
  api: {
    bodyParser: false, // Отключаем парсинг тела, чтобы обработать FormData
    responseLimit: false, // Отключаем лимит размера ответа
  },
};

export default async function handler(req, res) {
  // Убеждаемся, что мы всегда возвращаем ответ
  try {
    console.log('[UPLOAD-BOOK] === НАЧАЛО ОБРАБОТКИ ===');
    console.log('[UPLOAD-BOOK] Запрос получен:', { 
      method: req.method, 
      url: req.url,
      hasBody: !!req.body,
      contentType: req.headers['content-type']
    });
    
    // Проверяем метод запроса
    if (req.method !== 'POST') {
      console.log('[UPLOAD-BOOK] Неверный метод:', req.method);
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Инициализируем БД при первом запросе (не блокируем, если не удалось)
    let dbInitialized = false;
    try {
      console.log('[UPLOAD-BOOK] Инициализация БД...');
      dbInitialized = await ensureDatabaseInitialized();
      console.log('[UPLOAD-BOOK] БД инициализирована:', dbInitialized);
    } catch (dbInitError) {
      console.error('[UPLOAD-BOOK] Ошибка инициализации БД:', dbInitError);
      // Продолжаем работу даже если БД не инициализирована
    }

    // Получаем путь к папке для книг
    const BOOKS_PATH = getBooksDirPath();
    console.log('[UPLOAD-BOOK] Путь к папке книг:', BOOKS_PATH);
    
    // Создаем папку, если её нет
    try {
      await mkdir(BOOKS_PATH, { recursive: true });
      console.log('[UPLOAD-BOOK] Папка создана/проверена:', BOOKS_PATH);
    } catch (error) {
      if (error.code !== 'EEXIST') {
        console.error('[UPLOAD-BOOK] Ошибка создания папки:', error);
        return res.status(500).json({ 
          error: 'Ошибка создания папки для книг',
          details: error.message 
        });
      }
    }

    // Настраиваем formidable для парсинга multipart/form-data
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
            console.error('[UPLOAD-BOOK] Ошибка парсинга формы:', err);
            reject(err);
          } else {
            resolve({ fields, files });
          }
        });
      });
    };

    try {
      // Парсим форму
      const { fields, files } = await parseForm();
      console.log('[UPLOAD-BOOK] Форма распарсена:', { 
        fieldsKeys: Object.keys(fields || {}), 
        filesKeys: files ? Object.keys(files) : []
      });

      // Проверяем наличие файла
      if (!files || !files.file) {
        console.error('[UPLOAD-BOOK] Файл не найден в запросе');
        return res.status(400).json({ 
          error: 'Файл не загружен', 
          details: 'Поле file отсутствует в запросе' 
        });
      }

      // Получаем файл (может быть массив или объект)
      const file = Array.isArray(files.file) ? files.file[0] : files.file;
      
      if (!file) {
        console.error('[UPLOAD-BOOK] Файл пустой');
        return res.status(400).json({ 
          error: 'Файл не загружен', 
          details: 'Файл пустой или невалидный' 
        });
      }

      // Проверяем наличие filepath
      if (!file.filepath) {
        console.error('[UPLOAD-BOOK] filepath отсутствует:', file);
        return res.status(400).json({ 
          error: 'Ошибка обработки файла', 
          details: 'Не удалось получить путь к файлу' 
        });
      }

      console.log('[UPLOAD-BOOK] Информация о файле:', { 
        originalFilename: file.originalFilename || file.name,
        filepath: file.filepath,
        size: file.size,
        mimetype: file.mimetype
      });

      // Получаем поля формы
      const title = Array.isArray(fields.title) ? fields.title[0] : (fields.title || '');
      const author = Array.isArray(fields.author) ? fields.author[0] : (fields.author || '');
      const genre = Array.isArray(fields.genre) ? fields.genre[0] : (fields.genre || '');
      const description = Array.isArray(fields.description) ? fields.description[0] : (fields.description || '');
      const cover = Array.isArray(fields.cover) ? fields.cover[0] : (fields.cover || 'https://via.placeholder.com/300x400/4a5568/ffffff?text=No+Cover');

      console.log('[UPLOAD-BOOK] Распарсенные данные:', { title, author, genre, hasFile: !!file });

      // Проверяем формат файла
      const fileName = file.originalFilename || file.name || '';
      if (!fileName.toLowerCase().endsWith('.txt')) {
        console.error('[UPLOAD-BOOK] Неверный формат файла:', fileName);
        // Удаляем временный файл
        try {
          if (file.filepath) {
            await unlink(file.filepath);
          }
        } catch (e) {
          console.error('[UPLOAD-BOOK] Ошибка удаления временного файла:', e);
        }
        return res.status(400).json({ 
          error: 'Разрешены только файлы формата .txt', 
          details: `Получен файл: ${fileName}` 
        });
      }

      // Валидация обязательных полей
      if (!title || !title.trim()) {
        console.error('[UPLOAD-BOOK] Отсутствует title');
        try {
          if (file.filepath) {
            await unlink(file.filepath);
          }
        } catch (e) {}
        return res.status(400).json({ 
          error: 'Название книги обязательно', 
          details: 'Поле title пустое или отсутствует' 
        });
      }
      
      if (!author || !author.trim()) {
        console.error('[UPLOAD-BOOK] Отсутствует author');
        try {
          if (file.filepath) {
            await unlink(file.filepath);
          }
        } catch (e) {}
        return res.status(400).json({ 
          error: 'Автор обязателен', 
          details: 'Поле author пустое или отсутствует' 
        });
      }
      
      if (!genre || !genre.trim()) {
        console.error('[UPLOAD-BOOK] Отсутствует genre');
        try {
          if (file.filepath) {
            await unlink(file.filepath);
          }
        } catch (e) {}
        return res.status(400).json({ 
          error: 'Жанр обязателен', 
          details: 'Поле genre пустое или отсутствует' 
        });
      }

      // Получаем ID из формы, если указан, иначе используем оригинальное имя файла
      const customId = Array.isArray(fields.id) ? fields.id[0] : (fields.id || '');
      const originalFilename = file.originalFilename || file.name || '';
      const bookId = customId.trim() || originalFilename; // ID = указанное значение или имя файла
      const filePath = getBookFilePath(bookId); // Используем bookId как имя файла
      console.log('[UPLOAD-BOOK] ID книги (имя файла):', bookId);
      console.log('[UPLOAD-BOOK] Финальный путь к файлу:', filePath);

      // Перемещаем файл с временного имени на финальное
      try {
        const { readFile } = await import('fs/promises');
        const fileContent = await readFile(file.filepath, 'utf-8');
        await writeFile(filePath, fileContent, 'utf-8');
        console.log('[UPLOAD-BOOK] Файл сохранен:', filePath);
        
        // Удаляем временный файл
        try {
          await unlink(file.filepath);
        } catch (e) {
          console.warn('[UPLOAD-BOOK] Не удалось удалить временный файл:', e);
        }
      } catch (error) {
        console.error('[UPLOAD-BOOK] Ошибка сохранения файла:', error);
        // Удаляем временный файл
        try {
          if (file.filepath) {
            await unlink(file.filepath);
          }
        } catch (e) {
          console.error('[UPLOAD-BOOK] Ошибка удаления временного файла:', e);
        }
        return res.status(500).json({ 
          error: 'Ошибка сохранения файла',
          details: error.message 
        });
      }

      // Проверяем, что БД инициализирована перед добавлением книги
      if (!dbInitialized) {
        console.error('[UPLOAD-BOOK] БД не инициализирована, удаляем файл');
        try {
          await unlink(filePath);
        } catch (e) {
          console.error('[UPLOAD-BOOK] Ошибка удаления файла:', e);
        }
        return res.status(500).json({ 
          error: 'База данных не настроена',
          details: 'Создайте PostgreSQL базу данных:\n\n1. Откройте проект на Vercel (https://vercel.com/dashboard)\n2. Перейдите в раздел "Storage" (Хранилище)\n3. Нажмите "Create Database" (Создать базу данных)\n4. Выберите любой PostgreSQL провайдер (Neon, Prisma, Supabase)\n5. После создания перезапустите деплой'
        });
      }

      // Определяем формат файла из расширения
      const fileExtension = bookId.split('.').pop()?.toLowerCase() || 'txt';
      
      // Добавляем книгу в базу данных
      // ID = указанное значение или полное имя файла, title = отдельное поле для отображения
      const bookData = {
        id: bookId, // ID = указанное значение или полное имя файла
        title: title.trim(), // title = отдельное поле для отображения на сайте
        author: author.trim(),
        genre: genre.trim(),
        description: description.trim(),
        cover: cover.trim(),
        book_file: bookId, // Используем bookId как имя файла
        file_format: fileExtension
      };

      console.log('[UPLOAD-BOOK] Пытаемся добавить книгу в БД:', { title, author, genre });
      const result = await addBook(bookData);
      console.log('[UPLOAD-BOOK] Результат добавления:', { 
        success: result.success, 
        message: result.message, 
        id: result.id 
      });
      
      if (result.success) {
        // Безопасное логирование
        try {
          await logToDb('info', 'Book uploaded and added', { 
            bookId: result.id, 
            title, 
            filename: normalizedFilename 
          }, req);
        } catch (logError) {
          console.error('[UPLOAD-BOOK] Ошибка логирования:', logError);
        }
        
        return res.status(200).json({ 
          message: 'Книга и файл успешно добавлены', 
          id: result.id,
          filename: bookId
        });
      } else {
        // Удаляем файл, если не удалось добавить в БД
        try {
          await unlink(filePath);
        } catch (e) {
          console.error('[UPLOAD-BOOK] Ошибка удаления файла:', e);
        }
        
        // Безопасное логирование
        try {
          await logToDb('warning', 'Failed to add uploaded book', { 
            title, 
            reason: result.message 
          }, req);
        } catch (logError) {
          console.error('[UPLOAD-BOOK] Ошибка логирования:', logError);
        }
        
        return res.status(400).json({ 
          error: result.message || 'Не удалось добавить книгу' 
        });
      }
    } catch (error) {
      console.error('[UPLOAD-BOOK] Ошибка обработки:', error);
      console.error('[UPLOAD-BOOK] Stack:', error.stack);
      
      // Безопасное логирование - не блокируем ответ если логирование не удалось
      try {
        await logToDb('error', 'Upload book processing error', { 
          error: error.message, 
          stack: error.stack 
        }, req);
      } catch (logError) {
        console.error('[UPLOAD-BOOK] Ошибка логирования:', logError);
      }
      
      if (!res.headersSent) {
        return res.status(500).json({ 
          error: error.message || 'Внутренняя ошибка сервера',
          details: 'Произошла ошибка при обработке запроса. Проверьте логи сервера.'
        });
      }
    }
  } catch (outerError) {
    console.error('[UPLOAD-BOOK] Критическая ошибка:', outerError);
    console.error('[UPLOAD-BOOK] Stack:', outerError.stack);
    
    // Безопасное логирование
    try {
      await logToDb('error', 'Upload book handler error', { 
        error: outerError.message, 
        stack: outerError.stack 
      }, req);
    } catch (logError) {
      console.error('[UPLOAD-BOOK] Ошибка логирования:', logError);
    }
    
    if (!res.headersSent) {
      return res.status(500).json({ 
        error: 'Критическая ошибка сервера',
        details: outerError.message || 'Неизвестная ошибка'
      });
    }
  }
}
