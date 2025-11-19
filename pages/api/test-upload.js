// Тестовый endpoint для проверки работы API routes
export default async function handler(req, res) {
  console.log('[TEST-UPLOAD] Запрос получен:', { method: req.method, url: req.url });
  
  res.status(200).json({ 
    message: 'API route работает!',
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString()
  });
}

