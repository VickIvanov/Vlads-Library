import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Profile() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [privacySettings, setPrivacySettings] = useState({
    show_favorites: true,
    show_description: true
  });

  useEffect(() => {
    const user = localStorage.getItem('currentUser');
    if (!user) {
      router.push('/');
      return;
    }
    setCurrentUser(user);
    loadUserInfo();
    loadFavorites();
    loadPrivacySettings();
  }, [router]);
  
  const loadPrivacySettings = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/user-privacy?username=${encodeURIComponent(currentUser)}`);
      if (res.ok) {
        const data = await res.json();
        // Используем прямое значение из API (уже обработанное в getUserPrivacySettings)
        setPrivacySettings({
          show_favorites: data.show_favorites === true,
          show_description: data.show_description === true
        });
      }
    } catch (error) {
      console.error('Ошибка загрузки настроек приватности:', error);
    }
  };
  
  const savePrivacySettings = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/user-privacy?username=${encodeURIComponent(currentUser)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(privacySettings)
      });
      
      if (res.ok) {
        alert('Настройки приватности сохранены');
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Ошибка сохранения' }));
        alert(errorData.error || 'Ошибка сохранения настроек');
      }
    } catch (error) {
      console.error('Ошибка сохранения настроек приватности:', error);
      alert('Ошибка сохранения настроек');
    }
  };

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
      // Указываем, что это запрос от самого пользователя
      const res = await fetch(`/api/favorites?username=${encodeURIComponent(currentUser)}&requestingUser=${encodeURIComponent(currentUser)}`);
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

      {/* Privacy Settings */}
      <div style={{
        background: 'rgba(255,255,255,0.95)',
        padding: '30px',
        borderRadius: '15px',
        marginBottom: '20px'
      }}>
        <h2 style={{ margin: '0 0 20px 0', color: '#333' }}>🔒 Настройки приватности</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={privacySettings.show_favorites}
              onChange={(e) => setPrivacySettings({...privacySettings, show_favorites: e.target.checked})}
              style={{ width: '20px', height: '20px', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '16px', color: '#333' }}>Показывать избранные книги другим пользователям</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={privacySettings.show_description}
              onChange={(e) => setPrivacySettings({...privacySettings, show_description: e.target.checked})}
              style={{ width: '20px', height: '20px', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '16px', color: '#333' }}>Показывать описание профиля</span>
          </label>
          <button
            onClick={savePrivacySettings}
            style={{
              marginTop: '10px',
              padding: '12px 24px',
              backgroundColor: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              alignSelf: 'flex-start'
            }}
          >
            💾 Сохранить настройки
          </button>
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
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: '20px'
          }}>
            {favorites.map((book) => (
              <div
                key={book.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  position: 'relative'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-5px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
                onClick={() => router.push(`/reader?id=${encodeURIComponent(book.id)}`)}
              >
                {/* Обложка книги */}
                <div style={{
                  width: '100%',
                  aspectRatio: '3/4',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '48px',
                  fontWeight: 'bold',
                  marginBottom: '10px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {book.title ? book.title.charAt(0).toUpperCase() : '📚'}
                  {/* Кнопка удаления */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFromFavorites(book.id);
                    }}
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(239, 68, 68, 0.9)',
                      color: 'white',
                      border: 'none',
                      fontSize: '16px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 1)';
                      e.currentTarget.style.transform = 'scale(1.1)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.9)';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    ×
                  </button>
                </div>
                {/* Название книги */}
                <div style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#333',
                  textAlign: 'center',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  padding: '0 4px'
                }}>
                  {book.title}
                </div>
                {book.author && (
                  <div style={{
                    fontSize: '12px',
                    color: '#666',
                    textAlign: 'center',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    padding: '0 4px',
                    marginTop: '4px'
                  }}>
                    {book.author}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

