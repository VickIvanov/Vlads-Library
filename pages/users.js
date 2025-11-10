import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Users() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState({});

  useEffect(() => {
    // Проверяем, залогинен ли пользователь
    const checkUser = async () => {
      const user = localStorage.getItem('currentUser');
      if (user) {
        setCurrentUser(user);
        // Проверяем через API, является ли пользователь админом
        try {
          const res = await fetch(`/api/check-admin?username=${encodeURIComponent(user)}`);
          if (res.ok) {
            const data = await res.json();
            setIsUserAdmin(data.isAdmin);
            
            // Если админ, загружаем список пользователей
            if (data.isAdmin) {
              loadUsers();
            } else {
              setLoading(false);
            }
          }
        } catch (error) {
          console.error('Ошибка проверки админа:', error);
          setLoading(false);
        }
      } else {
        // Если не залогинен, перенаправляем на главную
        router.push('/');
      }
    };
    
    checkUser();
  }, [router]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Ошибка загрузки пользователей:', error);
    } finally {
      setLoading(false);
    }
  };

  // Если не админ, показываем сообщение
  if (!loading && currentUser && !isUserAdmin) {
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
            Только администраторы могут просматривать список пользователей
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

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
        color: 'white',
        fontSize: '20px'
      }}>
        ⏳ Загрузка...
      </div>
    );
  }

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
          👥 Пользователи
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

      {/* Users List */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        maxWidth: '1000px',
        margin: '0 auto',
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(10px)',
        padding: '40px',
        borderRadius: '20px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '30px'
        }}>
          <h2 style={{ margin: 0, color: '#333', fontSize: '24px' }}>
            Всего пользователей: {users.length}
          </h2>
          <button
            onClick={loadUsers}
            style={{
              padding: '10px 20px',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#059669'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#10b981'}
          >
            🔄 Обновить
          </button>
        </div>

        {users.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '60px',
            color: '#666'
          }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>👤</div>
            <p>Пользователи не найдены</p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gap: '15px'
          }}>
            {users.map((user, index) => (
              <div
                key={index}
                style={{
                  padding: '20px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '15px',
                  transition: 'all 0.3s ease',
                  backgroundColor: '#f8f9fa'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = '#667eea';
                  e.currentTarget.style.backgroundColor = '#f0f4ff';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.backgroundColor = '#f8f9fa';
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: '18px',
                      fontWeight: '600',
                      color: '#333',
                      marginBottom: '8px'
                    }}>
                      {user.name || user.username}
                    </div>
                    <div style={{
                      fontSize: '14px',
                      color: '#666',
                      marginBottom: '4px'
                    }}>
                      <strong>Логин:</strong> {user.username}
                    </div>
                    {user.password !== null && user.password !== undefined && (
                      <div style={{
                        fontSize: '14px',
                        color: '#666',
                        marginBottom: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <strong>Пароль:</strong>
                        <span style={{ fontFamily: 'monospace' }}>
                          {visiblePasswords[user.username] ? user.password : '•'.repeat(7)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setVisiblePasswords(prev => ({
                            ...prev,
                            [user.username]: !prev[user.username]
                          }))}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '2px 8px',
                            fontSize: '12px',
                            color: '#667eea',
                            textDecoration: 'underline'
                          }}
                          onMouseOver={(e) => e.target.style.color = '#5568d3'}
                          onMouseOut={(e) => e.target.style.color = '#667eea'}
                        >
                          {visiblePasswords[user.username] ? 'Скрыть' : 'Показать'}
                        </button>
                      </div>
                    )}
                    {user.email && (
                      <div style={{
                        fontSize: '14px',
                        color: '#666',
                        marginBottom: '4px'
                      }}>
                        <strong>Email:</strong> {user.email}
                      </div>
                    )}
                    {user.created_at && (
                      <div style={{
                        fontSize: '12px',
                        color: '#999',
                        marginTop: '8px'
                      }}>
                        <strong>Создан:</strong> {new Date(user.created_at).toLocaleDateString('ru-RU')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

