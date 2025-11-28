import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import MessageNotifications from '../components/MessageNotifications';

export default function Home() {
  const router = useRouter();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ username: '', password: '', userId: '' });
  const [favorites, setFavorites] = useState(new Set());
  
  const loadFavorites = async (username) => {
    if (!username) return;
    try {
      const res = await fetch(`/api/favorites?username=${encodeURIComponent(username)}`);
      if (res.ok) {
        const data = await res.json();
        setFavorites(new Set(data.map(book => book.id)));
      }
    } catch (error) {
      console.error('Ошибка загрузки избранного:', error);
    }
  };

  const loadBooks = async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const res = await fetch('/api/books');
      if (!res.ok) {
        console.error('Ошибка загрузки книг:', res.status, res.statusText);
        setBooks([]);
        if (showRefreshing) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
        return;
      }
      const data = await res.json();
      setBooks(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Ошибка загрузки книг:', error);
      setBooks([]);
    } finally {
      if (showRefreshing) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  
  const openBookReader = (book) => {
    if (!book || !book.id) {
      console.error('Книга или ID книги не найдены:', book);
      alert('Ошибка: книга не найдена');
      return;
    }
    try {
      // Открываем страницу чтения в текущей вкладке
      router.push(`/reader?id=${encodeURIComponent(book.id)}`);
    } catch (error) {
      console.error('Ошибка открытия читалки:', error);
      alert('Ошибка открытия книги');
    }
  };

  const deleteBook = async (id) => {
    if (!id) {
      console.error('ID книги не указан');
      return;
    }
    if (!confirm('Вы уверены, что хотите удалить эту книгу?')) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/books?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Ошибка удаления книги' }));
        console.error('Ошибка удаления книги:', errorData.error);
        return;
      }
      const data = await res.json();
      if (data.message) {
        loadBooks();
      }
    } catch (error) {
      console.error('Ошибка удаления книги:', error);
    } finally {
      setLoading(false);
    }
  };


  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginForm.username || !loginForm.password) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Ошибка входа' }));
        console.error('Ошибка входа:', errorData.error);
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (data.message) {
        setCurrentUser(data.username);
        // Сохраняем в localStorage
        localStorage.setItem('currentUser', data.username);
        // Обновляем статус пользователя на "online"
        try {
          await fetch('/api/user-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: data.username, status: 'online' })
          });
        } catch (error) {
          console.error('Ошибка обновления статуса:', error);
        }
        // Проверяем через API, является ли пользователь админом
        try {
          const adminRes = await fetch(`/api/check-admin?username=${encodeURIComponent(data.username)}`);
          if (adminRes.ok) {
            const adminData = await adminRes.json();
            setIsUserAdmin(adminData.isAdmin);
          }
        } catch (error) {
          console.error('Ошибка проверки админа:', error);
        }
        setShowLogin(false);
        setLoginForm({ username: '', password: '' });
      }
    } catch (error) {
      console.error('Ошибка входа:', error);
    } finally {
      setLoading(false);
    }
  };


  const handleRegister = async (e) => {
    e.preventDefault();
    if (!registerForm.username || !registerForm.password || !registerForm.userId) {
      alert('Заполните все поля, включая уникальный ID');
      return;
    }
    
    if (registerForm.password.length < 5) {
      alert('Пароль должен содержать минимум 5 символов');
      return;
    }
    
    // Валидация user_id (обязательное поле)
    if (!registerForm.userId || !registerForm.userId.trim()) {
      alert('Уникальный ID обязателен для регистрации');
      return;
    }
    
    const userId = registerForm.userId.trim().replace(/^@+/, '');
    if (!/^[a-zA-Z0-9_\-]+$/.test(userId)) {
      alert('ID может содержать только буквы, цифры, подчеркивания и дефисы');
      return;
    }
    if (userId.length < 3) {
      alert('ID должен содержать минимум 3 символа');
      return;
    }
    if (userId.length > 30) {
      alert('ID не должен превышать 30 символов');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: registerForm.username,
          password: registerForm.password,
          userId: registerForm.userId
        })
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Ошибка регистрации' }));
        console.error('Ошибка регистрации:', errorData.error);
        alert(errorData.error || 'Ошибка регистрации');
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (data.message) {
        setShowRegister(false);
        setRegisterForm({ username: '', password: '', userId: '' });
        setShowLogin(true);
      }
    } catch (error) {
      console.error('Ошибка регистрации:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    const username = localStorage.getItem('currentUser');
    if (username) {
      // Обновляем статус пользователя на "offline" при выходе
      try {
        await fetch('/api/user-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, status: 'offline' })
        });
      } catch (error) {
        console.error('Ошибка обновления статуса:', error);
      }
    }
    localStorage.removeItem('currentUser');
    setCurrentUser(null);
    setIsUserAdmin(false);
  };

  useEffect(() => { 
    // Проверяем, что мы в браузере
    if (typeof window === 'undefined') return;
    
    loadBooks();
    
    // Очищаем URL от старых параметров (если есть)
    try {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.has('error') || urlParams.has('google_login') || urlParams.has('username')) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch (error) {
      console.error('Ошибка очистки URL:', error);
    }
    
    // Проверяем сохраненного пользователя
    try {
      const savedUser = localStorage.getItem('currentUser');
      if (savedUser) {
        setCurrentUser(savedUser);
        loadFavorites(savedUser);
        // Проверяем через API, является ли пользователь админом
        fetch(`/api/check-admin?username=${encodeURIComponent(savedUser)}`)
          .then(res => {
            if (res.ok) {
              return res.json();
            }
            return { isAdmin: false };
          })
          .then(data => setIsUserAdmin(data.isAdmin || false))
          .catch(error => console.error('Ошибка проверки админа:', error));
      }
    } catch (error) {
      console.error('Ошибка чтения localStorage:', error);
    }
    
  }, []);

  const backgroundStyle = {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      ...backgroundStyle,
      position: 'relative',
      padding: '0'
    }}>
      {/* Overlay для лучшей читаемости */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.1)',
        zIndex: 0
      }} />

      {/* Message Notifications */}
      {currentUser && <MessageNotifications currentUser={currentUser} />}

      {/* Header */}
      <header style={{
        position: 'relative',
        zIndex: 10,
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(10px)',
        padding: '20px 40px',
        boxShadow: '0 2px 20px rgba(0,0,0,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '15px'
      }}>
        <h1 style={{ 
          margin: 0, 
          fontSize: '2.5rem',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontWeight: 'bold'
        }}>
          📚 Космическая Библиотека
        </h1>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Кнопка обновления библиотеки - видна всем */}
          <button 
            onClick={() => loadBooks(true)}
            disabled={loading || refreshing}
            style={{ 
              padding: '12px 24px', 
              backgroundColor: (loading || refreshing) ? '#9ca3af' : '#10b981', 
              color: 'white', 
              border: 'none', 
              borderRadius: '8px',
              cursor: (loading || refreshing) ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: '600',
              boxShadow: (loading || refreshing) ? 'none' : '0 4px 15px rgba(16, 185, 129, 0.4)',
              transition: 'all 0.3s ease',
              opacity: (loading || refreshing) ? 0.7 : 1
            }}
            onMouseOver={(e) => !(loading || refreshing) && (e.target.style.transform = 'translateY(-2px)')}
            onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
            title="Обновить список книг"
          >
            {refreshing ? '⏳ Обновление...' : '🔄 Обновить библиотеку'}
          </button>
          
          {currentUser ? (
            <>
              <span style={{ 
                padding: '8px 16px',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                borderRadius: '8px',
                color: '#667eea',
                fontWeight: '600',
                fontSize: '14px',
                cursor: 'pointer'
              }}
              onClick={() => router.push('/profile')}
              >
                👤 {currentUser}
              </span>
              <button 
                onClick={() => router.push('/profile')}
                style={{ 
                  padding: '12px 24px', 
                  backgroundColor: '#8b5cf6', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600',
                  boxShadow: '0 4px 15px rgba(139, 92, 246, 0.4)',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
              >
                👤 Профиль
              </button>
              <button 
                onClick={() => router.push('/chats')}
                style={{ 
                  padding: '12px 24px', 
                  backgroundColor: '#f59e0b', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600',
                  boxShadow: '0 4px 15px rgba(245, 158, 11, 0.4)',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
              >
                💬 Чаты
              </button>
              <button 
                onClick={handleLogout}
                style={{ 
                  padding: '12px 24px', 
                  backgroundColor: '#ef4444', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
              >
                🚪 Выйти
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => { setShowLogin(true); setShowRegister(false); }}
                style={{ 
                  padding: '12px 24px', 
                  backgroundColor: '#10b981', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600',
                  boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
              >
                🔐 Войти
              </button>
              <button 
                onClick={() => { setShowRegister(true); setShowLogin(false); }}
                style={{ 
                  padding: '12px 24px', 
                  backgroundColor: '#3b82f6', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600',
                  boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
              >
                ✨ Регистрация
              </button>
            </>
          )}
          {isUserAdmin && (
            <>
              <button 
                onClick={() => router.push('/add-book')}
                style={{ 
                  padding: '12px 24px', 
                  backgroundColor: '#667eea', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600',
                  boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
              >
                ➕ Добавить книгу
              </button>
              <button 
                onClick={() => router.push('/users')}
                style={{ 
                  padding: '12px 24px', 
                  backgroundColor: '#8b5cf6', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600',
                  boxShadow: '0 4px 15px rgba(139, 92, 246, 0.4)',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
              >
                👥 Пользователи
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main style={{
        position: 'relative',
        zIndex: 1,
        padding: '40px 20px',
        maxWidth: '1400px',
        margin: '0 auto'
      }}>
        {/* Books Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'white', fontSize: '20px' }}>
            ⏳ Загрузка книг...
          </div>
        ) : books.length === 0 ? (
          <div style={{
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(10px)',
            padding: '60px',
            borderRadius: '20px',
            textAlign: 'center',
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>📖</div>
            <h2 style={{ color: '#333', marginBottom: '10px' }}>Библиотека пуста</h2>
            <p style={{ color: '#666', fontSize: '18px' }}>Добавьте первую книгу, чтобы начать!</p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '25px'
          }}>
            {books.map(book => (
              <div 
                key={book.id || book.title} 
                style={{
                  background: 'rgba(255,255,255,0.95)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '20px',
                  padding: '25px',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-5px)';
                  e.currentTarget.style.boxShadow = '0 15px 50px rgba(0,0,0,0.3)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 10px 40px rgba(0,0,0,0.2)';
                }}
                onClick={(e) => {
                  // Предотвращаем всплытие события на карточку
                  e.stopPropagation();
                }}
              >
                <div style={{ 
                  width: '100%', 
                  height: '400px', 
                  borderRadius: '15px',
                  overflow: 'hidden',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '48px'
                }}>
                  {book.cover && book.cover !== 'https://via.placeholder.com/300x400/4a5568/ffffff?text=No+Cover' ? (
                    <img 
                      src={book.cover} 
                      alt={book.title}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain'
                      }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.parentElement.innerHTML = '📚';
                      }}
                    />
                  ) : (
                    <span>📚</span>
                  )}
                </div>
                <h3 style={{ 
                  margin: '0 0 10px 0', 
                  fontSize: '22px',
                  color: '#333',
                  fontWeight: 'bold',
                  lineHeight: '1.3'
                }}>
                  {book.title}
                </h3>
                <p style={{ 
                  margin: '0 0 8px 0', 
                  color: '#667eea',
                  fontSize: '16px',
                  fontWeight: '600'
                }}>
                  ✍️ {book.author}
                </p>
                <p style={{ 
                  margin: '0 0 12px 0', 
                  color: '#666',
                  fontSize: '14px'
                }}>
                  🏷️ {book.genre}
                </p>
                {book.description && (
                  <p style={{ 
                    margin: '0 0 20px 0', 
                    color: '#555',
                    fontSize: '14px',
                    lineHeight: '1.6',
                    flexGrow: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical'
                  }}>
                    {book.description}
                  </p>
                )}
                <div style={{ display: 'flex', gap: '10px', marginTop: 'auto', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {book.book_file && (
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (book && book.book_file) {
                            openBookReader(book);
                          }
                        }}
                        style={{
                          flex: 1,
                          padding: '12px 20px',
                          backgroundColor: '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '10px',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseOver={(e) => e.target.style.backgroundColor = '#059669'}
                        onMouseOut={(e) => e.target.style.backgroundColor = '#10b981'}
                      >
                        📖 Читать
                      </button>
                    )}
                    {currentUser && (
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const isFavorite = favorites.has(book.id);
                          try {
                            if (isFavorite) {
                              const res = await fetch(`/api/favorites?username=${encodeURIComponent(currentUser)}&bookId=${encodeURIComponent(book.id)}`, {
                                method: 'DELETE'
                              });
                              if (res.ok) {
                                setFavorites(prev => {
                                  const newSet = new Set(prev);
                                  newSet.delete(book.id);
                                  return newSet;
                                });
                              }
                            } else {
                              const res = await fetch('/api/favorites', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  username: currentUser,
                                  bookId: book.id
                                })
                              });
                              if (res.ok) {
                                const data = await res.json();
                                setFavorites(prev => new Set(prev).add(book.id));
                                // Обновляем список избранного после успешного добавления
                                loadFavorites(currentUser);
                              } else {
                                const errorData = await res.json().catch(() => ({ error: 'Ошибка добавления в избранное' }));
                                console.error('Ошибка добавления в избранное:', errorData.error);
                                alert(errorData.error || 'Ошибка добавления в избранное');
                              }
                            }
                          } catch (error) {
                            console.error('Ошибка изменения избранного:', error);
                          }
                        }}
                        style={{
                          padding: '12px 20px',
                          backgroundColor: favorites.has(book.id) ? '#ef4444' : '#f59e0b',
                          color: 'white',
                          border: 'none',
                          borderRadius: '10px',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseOver={(e) => e.target.style.opacity = '0.9'}
                        onMouseOut={(e) => e.target.style.opacity = '1'}
                      >
                        {favorites.has(book.id) ? '⭐ В избранном' : '⭐ В избранное'}
                      </button>
                    )}
                  </div>
                  {isUserAdmin && (
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (book && book.id) {
                          deleteBook(book.id);
                        }
                      }}
                      disabled={loading}
                      style={{
                        flex: 1,
                        padding: '12px 20px',
                        backgroundColor: loading ? '#ccc' : '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseOver={(e) => !loading && (e.target.style.backgroundColor = '#dc2626')}
                      onMouseOut={(e) => !loading && (e.target.style.backgroundColor = '#ef4444')}
                    >
                      🗑️ Удалить
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Login Modal */}
      {showLogin && (
        <>
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              zIndex: 1999,
              backdropFilter: 'blur(5px)'
            }}
            onClick={() => { setShowLogin(false); setLoginForm({ username: '', password: '' }); }}
          />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'white',
            padding: '40px',
            borderRadius: '20px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            zIndex: 2000,
            maxWidth: '400px',
            width: '90%'
          }}>
            <h2 style={{ marginTop: 0, marginBottom: '25px', color: '#333', textAlign: 'center' }}>🔐 Вход</h2>
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <input 
                type="text"
                placeholder="Имя пользователя" 
                value={loginForm.username} 
                onChange={e => setLoginForm({...loginForm, username: e.target.value})}
                required
                style={{
                  padding: '14px 16px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '10px',
                  fontSize: '16px',
                  transition: 'all 0.3s ease',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              />
              <input 
                type="password"
                placeholder="Пароль" 
                value={loginForm.password} 
                onChange={e => setLoginForm({...loginForm, password: e.target.value})}
                required
                style={{
                  padding: '14px 16px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '10px',
                  fontSize: '16px',
                  transition: 'all 0.3s ease',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              />
              <button 
                type="submit"
                disabled={loading}
                style={{
                  padding: '14px 24px',
                  backgroundColor: loading ? '#ccc' : '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)',
                  transition: 'all 0.3s ease',
                  marginTop: '10px'
                }}
              >
                {loading ? '⏳ Вход...' : 'Войти'}
              </button>
              
              <button 
                type="button"
                onClick={() => { setShowLogin(false); setShowRegister(true); }}
                style={{
                  padding: '10px',
                  background: 'none',
                  border: 'none',
                  color: '#667eea',
                  fontSize: '14px',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Нет аккаунта? Зарегистрироваться
              </button>
            </form>
          </div>
        </>
      )}

      {/* Register Modal */}
      {showRegister && (
        <>
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              zIndex: 1999,
              backdropFilter: 'blur(5px)'
            }}
            onClick={() => { setShowRegister(false); setRegisterForm({ username: '', password: '' }); }}
          />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'white',
            padding: '40px',
            borderRadius: '20px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            zIndex: 2000,
            maxWidth: '400px',
            width: '90%'
          }}>
            <h2 style={{ marginTop: 0, marginBottom: '25px', color: '#333', textAlign: 'center' }}>✨ Регистрация</h2>
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <input 
                type="text"
                placeholder="Имя пользователя" 
                value={registerForm.username} 
                onChange={e => setRegisterForm({...registerForm, username: e.target.value})}
                required
                style={{
                  padding: '14px 16px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '10px',
                  fontSize: '16px',
                  transition: 'all 0.3s ease',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              />
              <input 
                type="text"
                placeholder="Ваш уникальный ID (например: vlad123_)" 
                value={registerForm.userId} 
                onChange={e => setRegisterForm({...registerForm, userId: e.target.value})}
                required
                style={{
                  padding: '14px 16px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '10px',
                  fontSize: '16px',
                  transition: 'all 0.3s ease',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              />
              <p style={{ margin: '-10px 0 0 0', fontSize: '12px', color: '#666' }}>
                ID будет отображаться как @ваш_id. Обязательно для регистрации. Можно использовать для поиска и связи с другими пользователями.
              </p>
              <input 
                type="password"
                placeholder="Пароль (минимум 5 символов)" 
                value={registerForm.password} 
                onChange={e => setRegisterForm({...registerForm, password: e.target.value})}
                required
                minLength={5}
                style={{
                  padding: '14px 16px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '10px',
                  fontSize: '16px',
                  transition: 'all 0.3s ease',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              />
              <button 
                type="submit"
                disabled={loading}
                style={{
                  padding: '14px 24px',
                  backgroundColor: loading ? '#ccc' : '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)',
                  transition: 'all 0.3s ease',
                  marginTop: '10px'
                }}
              >
                {loading ? '⏳ Регистрация...' : 'Зарегистрироваться'}
              </button>
              <button 
                type="button"
                onClick={() => { setShowRegister(false); setShowLogin(true); }}
                style={{
                  padding: '10px',
                  background: 'none',
                  border: 'none',
                  color: '#667eea',
                  fontSize: '14px',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Уже есть аккаунт? Войти
              </button>
            </form>
          </div>
        </>
      )}


      <style jsx>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
              