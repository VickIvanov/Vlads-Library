import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Profile() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = localStorage.getItem('currentUser');
    if (!user) {
      router.push('/');
      return;
    }
    setCurrentUser(user);
    loadUserInfo();
    loadFavorites();
  }, [router]);

  const loadUserInfo = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/users/@${currentUser}`);
      if (res.ok) {
        const data = await res.json();
        setUserInfo(data);
      }
    } catch (error) {
      console.error('Ошибка загрузки информации о пользователе:', error);
    }
  };

  const loadFavorites = async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/favorites?username=${encodeURIComponent(currentUser)}`);
      if (res.ok) {
        const data = await res.json();
        setFavorites(data);
      }
    } catch (error) {
      console.error('Ошибка загрузки избранного:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeFromFavorites = async (bookId) => {
    if (!currentUser) return;
    
    if (!confirm('Удалить книгу из избранного?')) {
      return;
    }
    
    try {
      const res = await fetch(`/api/favorites?username=${encodeURIComponent(currentUser)}&bookId=${encodeURIComponent(bookId)}`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        loadFavorites();
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Ошибка удаления' }));
        alert(errorData.error || 'Ошибка удаления из избранного');
      }
    } catch (error) {
      console.error('Ошибка удаления из избранного:', error);
      alert('Ошибка удаления из избранного');
    }
  };

  if (!currentUser) {
    return null;
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
      padding: '40px 20px'
    }}>
      {/* Header */}
      <div style={{
        background: 'rgba(255,255,255,0.95)',
        padding: '20px',
        borderRadius: '15px',
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h1 style={{ margin: 0, fontSize: '24px', color: '#333' }}>👤 Мой профиль</h1>
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
            cursor: 'pointer'
          }}
        >
          ← Назад
        </button>
      </div>

      {/* User Info */}
      <div style={{
        background: 'rgba(255,255,255,0.95)',
        padding: '30px',
        borderRadius: '15px',
        marginBottom: '20px'
      }}>
        <h2 style={{ margin: '0 0 20px 0', color: '#333' }}>Информация</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <strong style={{ color: '#666' }}>Имя пользователя:</strong>
            <div style={{ fontSize: '18px', fontWeight: '600', color: '#333', marginTop: '5px' }}>
              {currentUser}
            </div>
          </div>
          {userInfo && userInfo.userId && (
            <div>
              <strong style={{ color: '#666' }}>ID:</strong>
              <div style={{ fontSize: '18px', fontWeight: '600', color: '#667eea', marginTop: '5px' }}>
                {userInfo.userId}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Favorites */}
      <div style={{
        background: 'rgba(255,255,255,0.95)',
        padding: '30px',
        borderRadius: '15px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, color: '#333' }}>⭐ Избранные книги</h2>
          <button
            onClick={loadFavorites}
            style={{
              padding: '8px 16px',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            🔄 Обновить
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            ⏳ Загрузка...
          </div>
        ) : favorites.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            <div style={{ fontSize: '48px', marginBottom: '10px' }}>📚</div>
            <p>Нет избранных книг</p>
            <button
              onClick={() => router.push('/')}
              style={{
                marginTop: '15px',
                padding: '10px 20px',
                backgroundColor: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Перейти к книгам
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '15px' }}>
            {favorites.map((book) => (
              <div
                key={book.id}
                style={{
                  padding: '20px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = '#667eea';
                  e.currentTarget.style.backgroundColor = '#f0f4ff';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '18px', fontWeight: '600', color: '#333', marginBottom: '5px' }}>
                    {book.title}
                  </div>
                  <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>
                    Автор: {book.author}
                  </div>
                  {book.genre && (
                    <div style={{ fontSize: '12px', color: '#999' }}>
                      Жанр: {book.genre}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => router.push(`/reader?id=${encodeURIComponent(book.id)}`)}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#667eea',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Читать
                  </button>
                  <button
                    onClick={() => removeFromFavorites(book.id)}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

