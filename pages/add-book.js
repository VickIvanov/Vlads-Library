import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

const GENRES = [
  'Фантастика',
  'Фэнтези',
  'Детектив',
  'Роман',
  'Триллер',
  'Ужасы',
  'Научная литература',
  'Историческая литература',
  'Биография',
  'Автобиография',
  'Поэзия',
  'Драма',
  'Комедия',
  'Приключения',
  'Детская литература',
  'Юмор',
  'Философия',
  'Религия',
  'Справочная литература',
  'Другое'
];

export default function AddBook() {
  const router = useRouter();
  const [form, setForm] = useState({ 
    title: '', 
    author: '', 
    genre: '', 
    description: '', 
    cover: '', 
    file: null 
  });
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isUserAdmin, setIsUserAdmin] = useState(false);

  useEffect(() => {
    // Проверяем, залогинен ли пользователь
    const checkUser = async () => {
      // Проверяем из localStorage
      const user = localStorage.getItem('currentUser');
      if (user) {
        setCurrentUser(user);
        // Проверяем через API, является ли пользователь админом
        try {
          const res = await fetch(`/api/check-admin?username=${encodeURIComponent(user)}`);
          if (res.ok) {
            const data = await res.json();
            setIsUserAdmin(data.isAdmin);
          }
        } catch (error) {
          console.error('Ошибка проверки админа:', error);
        }
      } else {
        // Если не залогинен, перенаправляем на главную
        router.push('/');
      }
    };
    
    checkUser();
  }, [router]);

  // Если не админ, показываем сообщение
  if (currentUser && !isUserAdmin) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
        padding: '40px'
      }}>
        <div style={{
          background: 'rgba(255,255,255,0.95)',
          padding: '40px',
          borderRadius: '20px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          maxWidth: '500px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>🔒</div>
          <h2 style={{ color: '#333', marginBottom: '10px' }}>Доступ запрещен</h2>
          <p style={{ color: '#666', marginBottom: '20px' }}>
            Только администраторы могут добавлять книги
          </p>
          <button
            onClick={() => router.push('/')}
            style={{
              padding: '12px 24px',
              backgroundColor: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Вернуться на главную
          </button>
        </div>
      </div>
    );
  }

  const addBook = async (e) => {
    e.preventDefault();
    if (!form.title || !form.author || !form.genre) {
      return;
    }
    
    setLoading(true);
    
    try {
      let res, data;
      
      // Если есть файл, используем upload-book API
      if (form.file) {
        // Проверяем формат файла
        if (!form.file.name.toLowerCase().endsWith('.txt')) {
          setLoading(false);
          return;
        }
        
        const formData = new FormData();
        formData.append('file', form.file);
        formData.append('title', form.title);
        formData.append('author', form.author);
        formData.append('genre', form.genre);
        formData.append('description', form.description);
        formData.append('cover', form.cover || 'https://via.placeholder.com/300x400/4a5568/ffffff?text=No+Cover');
        
        res = await fetch('/api/upload-book', {
          method: 'POST',
          body: formData
        });
        
        // Проверяем статус ответа
        if (!res.ok) {
          let errorData;
          try {
            const text = await res.text();
            errorData = JSON.parse(text);
          } catch (e) {
            errorData = { error: `Ошибка ${res.status}: ${res.statusText}` };
          }
          console.error('Ошибка загрузки книги:', errorData);
          const errorMessage = errorData.details 
            ? `${errorData.error}\n\nДетали: ${errorData.details}`
            : errorData.error || `Ошибка: ${res.status} ${res.statusText}`;
          alert(errorMessage);
          setLoading(false);
          return;
        }
        
        data = await res.json();
      } else {
        // Если файла нет, используем обычный API
        const bookData = {
          title: form.title,
          author: form.author,
          genre: form.genre,
          description: form.description,
          cover: form.cover || 'https://via.placeholder.com/300x400/4a5568/ffffff?text=No+Cover'
        };
        
        res = await fetch('/api/books', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bookData)
        });
        
        // Проверяем статус ответа
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: 'Неизвестная ошибка сервера' }));
          console.error('Ошибка добавления книги:', errorData);
          alert(errorData.error || `Ошибка: ${res.status} ${res.statusText}`);
          setLoading(false);
          return;
        }
        
        data = await res.json();
      }
      
      if (data.message) {
        setForm({ title: '', author: '', genre: '', description: '', cover: '', file: null });
        router.push('/');
      } else if (data.error) {
        alert(data.error || 'Не удалось добавить книгу');
      }
    } catch (error) {
      console.error('Ошибка добавления книги:', error);
      alert('Произошла ошибка при добавлении книги. Проверьте консоль для деталей.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
      padding: '40px 20px',
      position: 'relative'
    }}>
      {/* Overlay */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.1)',
        zIndex: 0
      }} />

      {/* Header */}
      <header style={{
        position: 'relative',
        zIndex: 10,
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(10px)',
        padding: '20px 40px',
        borderRadius: '20px',
        marginBottom: '30px',
        boxShadow: '0 2px 20px rgba(0,0,0,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        maxWidth: '1200px',
        margin: '0 auto 30px'
      }}>
        <h1 style={{ 
          margin: 0, 
          fontSize: '2rem',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontWeight: 'bold'
        }}>
          ➕ Добавить книгу
        </h1>
        <button
          onClick={() => router.push('/')}
          style={{
            padding: '10px 20px',
            backgroundColor: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
          onMouseOver={(e) => e.target.style.backgroundColor = '#5568d3'}
          onMouseOut={(e) => e.target.style.backgroundColor = '#667eea'}
        >
          ← Назад
        </button>
      </header>

      {/* Form */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        maxWidth: '800px',
        margin: '0 auto',
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(10px)',
        padding: '40px',
        borderRadius: '20px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
      }}>
        <form onSubmit={addBook} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              color: '#333', 
              fontWeight: '600',
              fontSize: '16px'
            }}>
              Название *
            </label>
            <input 
              placeholder="Название книги" 
              value={form.title} 
              onChange={e => setForm({...form, title: e.target.value})} 
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #e2e8f0',
                borderRadius: '10px',
                fontSize: '16px',
                transition: 'all 0.3s ease',
                outline: 'none',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>

          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              color: '#333', 
              fontWeight: '600',
              fontSize: '16px'
            }}>
              Автор *
            </label>
            <input 
              placeholder="Автор книги" 
              value={form.author} 
              onChange={e => setForm({...form, author: e.target.value})} 
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #e2e8f0',
                borderRadius: '10px',
                fontSize: '16px',
                transition: 'all 0.3s ease',
                outline: 'none',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>

          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              color: '#333', 
              fontWeight: '600',
              fontSize: '16px'
            }}>
              Жанр *
            </label>
            <select
              value={form.genre}
              onChange={e => setForm({...form, genre: e.target.value})}
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #e2e8f0',
                borderRadius: '10px',
                fontSize: '16px',
                transition: 'all 0.3s ease',
                outline: 'none',
                boxSizing: 'border-box',
                backgroundColor: 'white',
                cursor: 'pointer'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
            >
              <option value="">Выберите жанр</option>
              {GENRES.map(genre => (
                <option key={genre} value={genre}>{genre}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              color: '#333', 
              fontWeight: '600',
              fontSize: '16px'
            }}>
              Описание
            </label>
            <textarea
              placeholder="Описание книги" 
              value={form.description} 
              onChange={e => setForm({...form, description: e.target.value})}
              rows={4}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #e2e8f0',
                borderRadius: '10px',
                fontSize: '16px',
                transition: 'all 0.3s ease',
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>

          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              color: '#333', 
              fontWeight: '600',
              fontSize: '16px'
            }}>
              Ссылка на обложку
            </label>
            <input 
              placeholder="URL обложки" 
              value={form.cover} 
              onChange={e => setForm({...form, cover: e.target.value})}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #e2e8f0',
                borderRadius: '10px',
                fontSize: '16px',
                transition: 'all 0.3s ease',
                outline: 'none',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>

          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              color: '#333', 
              fontWeight: '600',
              fontSize: '16px'
            }}>
              📄 Файл книги (.txt)
            </label>
            <input 
              type="file"
              accept=".txt"
              onChange={e => setForm({...form, file: e.target.files[0]})}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #e2e8f0',
                borderRadius: '10px',
                fontSize: '16px',
                transition: 'all 0.3s ease',
                outline: 'none',
                cursor: 'pointer'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
            />
            {form.file && (
              <p style={{ marginTop: '8px', color: '#10b981', fontSize: '14px' }}>
                ✓ Выбран файл: {form.file.name}
              </p>
            )}
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{
              padding: '14px 24px',
              backgroundColor: loading ? '#ccc' : '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
              transition: 'all 0.3s ease',
              marginTop: '10px'
            }}
            onMouseOver={(e) => !loading && (e.target.style.transform = 'translateY(-2px)')}
            onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
          >
            {loading ? '⏳ Добавление...' : '✨ Добавить книгу'}
          </button>
        </form>
      </div>
    </div>
  );
}

