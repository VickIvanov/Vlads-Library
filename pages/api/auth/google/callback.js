import { readDb, writeDb } from '../../../lib/db.js';
import { userExists } from '../../../lib/users.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { code, error } = req.query;

  if (error) {
    return res.redirect(`/?error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return res.redirect('/?error=no_code');
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.redirect('/?error=oauth_not_configured');
  }

  try {
    // Получаем базовый URL
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const baseUrl = `${protocol}://${host}`;
    const redirectUri = `${baseUrl}/api/auth/google/callback`;

    // Обмениваем код на токен
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Ошибка получения токена:', errorData);
      return res.redirect('/?error=token_exchange_failed');
    }

    const tokens = await tokenResponse.json();
    const accessToken = tokens.access_token;

    if (!accessToken) {
      return res.redirect('/?error=no_token');
    }

    // Получаем информацию о пользователе
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userInfoResponse.ok) {
      return res.redirect('/?error=user_info_failed');
    }

    const userInfo = await userInfoResponse.json();
    const email = userInfo.email;
    const name = userInfo.name || email;

    if (!email) {
      return res.redirect('/?error=no_email');
    }

    // ВАЖНО: Проверяем, зарегистрирован ли пользователь
    const db = await readDb();
    const dbUsers = db.users || [];
    
    // Проверяем в .env
    const existsInEnv = userExists(email);
    
    // Проверяем в БД
    const existsInDb = dbUsers.some(u => 
      u.username === email || u.email === email
    );

    // Если пользователь не зарегистрирован, запрещаем вход
    if (!existsInEnv && !existsInDb) {
      return res.redirect('/?error=user_not_registered');
    }

    // Если пользователь найден, обновляем или создаем запись
    let userFound = false;
    for (const user of dbUsers) {
      if (user.username === email || user.email === email) {
        userFound = true;
        // Обновляем информацию
        user.email = email;
        user.name = name;
        user.auth_method = 'google';
        break;
      }
    }

    // Если не найден в БД, но есть в .env, создаем запись в БД
    if (!userFound && existsInEnv) {
      dbUsers.push({
        username: email,
        email: email,
        name: name,
        password: null,
        created_at: new Date().toISOString(),
        auth_method: 'google'
      });
    }

    db.users = dbUsers;
    await writeDb(db);

    // Перенаправляем на главную с успешным входом
    // Используем query параметр для передачи информации о пользователе
    return res.redirect(`/?google_login=success&username=${encodeURIComponent(email)}`);
  } catch (error) {
    console.error('Ошибка Google OAuth:', error);
    return res.redirect('/?error=oauth_error');
  }
}

