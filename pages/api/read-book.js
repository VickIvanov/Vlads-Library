import { readFile } from 'fs/promises';
import { getBookFilePath } from '../../lib/paths.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { filename } = req.query;

    if (!filename) {
      return res.status(400).json({ error: 'Имя файла не указано' });
    }

    // Проверяем безопасность имени файла (только .txt файлы)
    if (!filename.endsWith('.txt') || filename.includes('..') || filename.includes('/')) {
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
          return res.status(404).json({ error: `Файл "${filename}" не найден` });
        }
        throw accessError;
      }
      
      const fileContent = await readFile(filePath, 'utf-8');
      
      // Устанавливаем заголовки для отображения текста
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      // Убираем Content-Disposition, чтобы избежать проблем с кодированием
      // res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
      
      res.status(200).send(fileContent);
    } catch (error) {
      console.error('Ошибка чтения файла:', error);
      if (error.code === 'ENOENT') {
        return res.status(404).json({ error: `Файл "${filename}" не найден` });
      }
      throw error;
    }
  } catch (error) {
    console.error('Ошибка чтения файла:', error);
    res.status(500).json({ error: error.message || 'Внутренняя ошибка сервера' });
  }
}

