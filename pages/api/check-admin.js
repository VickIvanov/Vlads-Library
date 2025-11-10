import { isAdmin } from '../../lib/users.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { username } = req.query;
    
    if (!username) {
      return res.status(400).json({ error: 'username обязателен' });
    }

    const admin = isAdmin(username);
    res.status(200).json({ isAdmin: admin });
  } catch (error) {
    console.error('Ошибка проверки админа:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

