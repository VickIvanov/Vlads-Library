import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';

export default function Chats() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchUserId, setSearchUserId] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef(null);
  const eventSourceRef = useRef(null);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);
  const [showFavorites, setShowFavorites] = useState(false);
  const [otherUserFavorites, setOtherUserFavorites] = useState([]);
  const [chatNicknames, setChatNicknames] = useState({});
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [userMenuNickname, setUserMenuNickname] = useState('');
  const [userStatus, setUserStatus] = useState({ status: 'offline', last_seen: null });
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingContent, setEditingContent] = useState('');

  useEffect(() => {
    // Проверяем, залогинен ли пользователь
    const user = localStorage.getItem('currentUser');
    if (!user) {
      router.push('/');
      return;
    }
    setCurrentUser(user);
    
    // Восстанавливаем выбранный чат из localStorage
    const savedChat = localStorage.getItem('selectedChat');
    if (savedChat) {
      setSelectedChat(savedChat);
    }
    
    loadChats();
    loadUnreadCount();
    loadChatNicknames();
    
    // Обновляем статус пользователя на "online" при входе
    updateUserStatus('online');
    
    // Обновляем статус каждые 30 секунд
    const statusInterval = setInterval(() => {
      updateUserStatus('online');
    }, 30000);
    
    // Обновляем статус при выходе
    return () => {
      clearInterval(statusInterval);
      updateUserStatus('offline');
    };
    
    // Настраиваем Server-Sent Events для реального времени
    if (typeof EventSource !== 'undefined') {
      const eventSource = new EventSource(`/api/messages/stream?username=${encodeURIComponent(user)}`);
      eventSourceRef.current = eventSource;
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'messages' && data.data) {
            // Обновляем чаты и сообщения при получении новых
            loadChats();
            loadUnreadCount();
            
            // Если есть новые сообщения, проверяем нужно ли открыть чат
            const newMessages = data.data;
            if (newMessages.length > 0) {
              const lastMessage = newMessages[newMessages.length - 1];
              // Если сообщение для текущего пользователя (входящее), открываем чат только если ничего не выбрано
              if (lastMessage.receiver_username === user) {
                // Открываем чат только если пользователь не выбрал другой чат вручную
                const currentSelected = selectedChat || localStorage.getItem('selectedChat');
                if (!currentSelected || currentSelected === lastMessage.sender_username) {
                  setSelectedChat(lastMessage.sender_username);
                  localStorage.setItem('selectedChat', lastMessage.sender_username);
                }
              }
            }
            
            // Обновляем сообщения только для текущего выбранного чата
            const currentSelected = selectedChat || localStorage.getItem('selectedChat');
            if (currentSelected) {
              loadMessages(currentSelected);
            }
          } else if (data.type === 'chats_update') {
            // Обновляем список чатов при получении сигнала
            // НЕ меняем выбранный чат при обновлении
            loadChats();
            loadUnreadCount();
          } else if (data.type === 'error') {
            console.error('Ошибка SSE:', data.message);
          }
        } catch (error) {
          console.error('Ошибка парсинга SSE данных:', error);
        }
      };
      
      eventSource.onerror = (error) => {
        console.error('Ошибка SSE соединения:', error);
        // Переподключаемся через 3 секунды
        setTimeout(() => {
          if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = new EventSource(`/api/messages/stream?username=${encodeURIComponent(user)}`);
          }
        }, 3000);
      };
      
      return () => {
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
        }
      };
    } else {
      // Fallback: polling если SSE не поддерживается
      const interval = setInterval(() => {
        loadChats().then(() => {
          // После загрузки чатов проверяем, есть ли новые чаты
          // Если есть новый чат и ничего не выбрано, открываем его
        });
        loadUnreadCount();
        if (selectedChat) {
          loadMessages(selectedChat);
        }
      }, 2000);
      
      return () => clearInterval(interval);
    }
  }, [router, selectedChat, currentUser]);

  useEffect(() => {
    if (selectedChat) {
      loadMessages(selectedChat);
      loadUserStatus(selectedChat);
    }
  }, [selectedChat]);
  
  useEffect(() => {
    // Обновляем статус собеседника каждые 10 секунд
    if (selectedChat) {
      const statusInterval = setInterval(() => {
        loadUserStatus(selectedChat);
      }, 10000);
      return () => clearInterval(statusInterval);
    }
  }, [selectedChat]);

  useEffect(() => {
    // Прокрутка к последнему сообщению
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadChats = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/messages?username=${encodeURIComponent(currentUser)}&action=chats`);
      if (res.ok) {
        const data = await res.json();
        setChats(data);
        
        // Если нет выбранного чата, но есть чаты, открываем первый
        // НО только если пользователь не начал новый чат через поиск
        // Проверяем и состояние, и localStorage
        const currentSelected = selectedChat || localStorage.getItem('selectedChat');
        if (!currentSelected && data.length > 0) {
          const firstChat = data[0].other_username;
          setSelectedChat(firstChat);
          localStorage.setItem('selectedChat', firstChat);
        } else if (currentSelected && !selectedChat) {
          // Восстанавливаем выбранный чат из localStorage, если он был сохранен
          setSelectedChat(currentSelected);
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки чатов:', error);
    }
  };

  const loadUnreadCount = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/messages?username=${encodeURIComponent(currentUser)}&action=unread`);
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.count || 0);
      }
    } catch (error) {
      console.error('Ошибка загрузки непрочитанных:', error);
    }
  };

  const loadMessages = async (otherUsername) => {
    if (!currentUser || !otherUsername) return;
    try {
      const res = await fetch(`/api/messages?username=${encodeURIComponent(currentUser)}&otherUsername=${encodeURIComponent(otherUsername)}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (error) {
      console.error('Ошибка загрузки сообщений:', error);
    }
  };

  const searchUser = async () => {
    if (!searchUserId.trim()) return;
    
    setLoading(true);
    try {
      // Убираем @ если есть
      const userId = searchUserId.trim().replace(/^@+/, '');
      const res = await fetch(`/api/users/@${userId}`);
      
      if (res.ok) {
        const data = await res.json();
        setSearchResult(data);
        setSearchUserId('');
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Пользователь не найден' }));
        alert(errorData.error || 'Пользователь не найден');
        setSearchResult(null);
      }
    } catch (error) {
      console.error('Ошибка поиска пользователя:', error);
      alert('Ошибка поиска пользователя');
    } finally {
      setLoading(false);
    }
  };

  const startChat = (username) => {
    // Устанавливаем выбранный чат и сохраняем его
    setSelectedChat(username);
    localStorage.setItem('selectedChat', username);
    setSearchResult(null);
    // Загружаем сообщения для нового чата
    loadMessages(username);
    // Обновляем список чатов, но не меняем выбранный чат
    loadChats();
  };

  // Обработка параметра open из URL (для открытия чата из уведомления)
  useEffect(() => {
    const { open } = router.query;
    if (open && typeof open === 'string') {
      startChat(open);
      // Убираем параметр из URL
      router.replace('/chats', undefined, { shallow: true });
    }
  }, [router.query]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat || !currentUser) return;
    
    const messageContent = newMessage.trim();
    setNewMessage(''); // Очищаем поле сразу для лучшего UX
    
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderUsername: currentUser,
          receiverUsername: selectedChat,
          content: messageContent
        })
      });
      
      if (res.ok) {
        // Убираем статус "пишет" после отправки
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        fetch('/api/messages/typing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: currentUser,
            receiverUsername: selectedChat,
            isTyping: false
          })
        }).catch(err => console.error('Ошибка отправки статуса "пишет":', err));
        
        // Сообщение отправлено, обновим данные
        // SSE автоматически обновит интерфейс, но обновим сразу для мгновенной обратной связи
        // Важно: сохраняем выбранный чат, чтобы не переключился на другой
        const currentChat = selectedChat;
        setTimeout(() => {
          if (currentChat) {
            loadMessages(currentChat);
            setSelectedChat(currentChat); // Убеждаемся, что чат остался выбранным
            localStorage.setItem('selectedChat', currentChat);
          }
          loadChats();
          loadUnreadCount();
        }, 100);
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Ошибка отправки' }));
        alert(errorData.error || 'Ошибка отправки сообщения');
        setNewMessage(messageContent); // Возвращаем текст если ошибка
      }
    } catch (error) {
      console.error('Ошибка отправки сообщения:', error);
      alert('Ошибка отправки сообщения');
      setNewMessage(messageContent); // Возвращаем текст если ошибка
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'только что';
    if (minutes < 60) return `${minutes} мин назад`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)} ч назад`;
    
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  const loadChatNicknames = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/chat-nicknames?username=${encodeURIComponent(currentUser)}&action=all`);
      if (res.ok) {
        const data = await res.json();
        setChatNicknames(data);
      }
    } catch (error) {
      console.error('Ошибка загрузки переименований:', error);
    }
  };

  const saveNickname = async (contactUsername, nickname) => {
    if (!currentUser || !contactUsername) return;
    try {
      const res = await fetch('/api/chat-nicknames', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: currentUser,
          contactUsername: contactUsername,
          nickname: nickname
        })
      });
      
      if (res.ok) {
        loadChatNicknames();
        setEditingNickname(null);
        setNicknameInput('');
      }
    } catch (error) {
      console.error('Ошибка сохранения переименования:', error);
    }
  };

  const getDisplayName = (username) => {
    return chatNicknames[username] || username;
  };
  
  const updateUserStatus = async (status) => {
    if (!currentUser) return;
    try {
      await fetch('/api/user-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: currentUser, status })
      });
    } catch (error) {
      console.error('Ошибка обновления статуса:', error);
    }
  };
  
  const loadUserStatus = async (username) => {
    if (!username) return;
    try {
      const res = await fetch(`/api/user-status?username=${encodeURIComponent(username)}`);
      if (res.ok) {
        const data = await res.json();
        setUserStatus(data);
      }
    } catch (error) {
      console.error('Ошибка загрузки статуса пользователя:', error);
    }
  };
  
  const handleEditMessage = async (messageId, currentContent) => {
    setEditingMessageId(messageId);
    setEditingContent(currentContent);
  };
  
  const saveEditMessage = async (messageId) => {
    if (!editingContent.trim() || !currentUser) return;
    
    try {
      const res = await fetch('/api/messages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId,
          senderUsername: currentUser,
          content: editingContent.trim()
        })
      });
      
      if (res.ok) {
        setEditingMessageId(null);
        setEditingContent('');
        loadMessages(selectedChat);
      } else {
        const error = await res.json();
        alert(error.error || 'Ошибка редактирования сообщения');
      }
    } catch (error) {
      console.error('Ошибка редактирования сообщения:', error);
      alert('Ошибка редактирования сообщения');
    }
  };
  
  const handleDeleteMessage = async (messageId) => {
    if (!currentUser || !confirm('Вы уверены, что хотите удалить это сообщение?')) return;
    
    try {
      const res = await fetch('/api/messages', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId,
          senderUsername: currentUser
        })
      });
      
      if (res.ok) {
        loadMessages(selectedChat);
      } else {
        const error = await res.json();
        alert(error.error || 'Ошибка удаления сообщения');
      }
    } catch (error) {
      console.error('Ошибка удаления сообщения:', error);
      alert('Ошибка удаления сообщения');
    }
  };
  
  const formatLastSeen = (lastSeen) => {
    if (!lastSeen) return 'никогда';
    const date = new Date(lastSeen);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'только что';
    if (minutes < 60) return `${minutes} мин назад`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)} ч назад`;
    
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  // Отслеживание ввода текста для статуса "пишет"
  const handleTyping = () => {
    if (!selectedChat || !currentUser) return;
    
    // Отправляем статус "пишет"
    fetch('/api/messages/typing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: currentUser,
        receiverUsername: selectedChat,
        isTyping: true
      })
    }).catch(err => console.error('Ошибка отправки статуса "пишет":', err));
    
    // Очищаем предыдущий таймаут
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Через 2 секунды после остановки ввода убираем статус
    typingTimeoutRef.current = setTimeout(() => {
      fetch('/api/messages/typing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: currentUser,
          receiverUsername: selectedChat,
          isTyping: false
        })
      }).catch(err => console.error('Ошибка отправки статуса "пишет":', err));
    }, 2000);
  };

  // Проверка статуса "пишет" собеседника
  useEffect(() => {
    if (!selectedChat || !currentUser) return;
    
    const checkTyping = async () => {
      try {
        const res = await fetch(`/api/messages/typing?username=${encodeURIComponent(currentUser)}&receiverUsername=${encodeURIComponent(selectedChat)}`);
        if (res.ok) {
          const data = await res.json();
          setIsTyping(data.isTyping);
        }
      } catch (error) {
        console.error('Ошибка проверки статуса "пишет":', error);
      }
    };
    
    const interval = setInterval(checkTyping, 1000);
    return () => clearInterval(interval);
  }, [selectedChat, currentUser]);

  if (!currentUser) {
    return null;
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column'
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
        <h1 style={{ margin: 0, fontSize: '24px', color: '#333' }}>💬 Чаты</h1>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {unreadCount > 0 && (
            <span style={{
              background: '#ef4444',
              color: 'white',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '14px',
              fontWeight: '600'
            }}>
              {unreadCount} непрочитано
            </span>
          )}
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
      </div>

      <div style={{ display: 'flex', gap: '20px', flex: 1, minHeight: 0 }}>
        {/* Боковая панель с чатами и поиском */}
        <div style={{
          width: '350px',
          background: 'rgba(255,255,255,0.95)',
          borderRadius: '15px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '15px'
        }}>
          {/* Поиск пользователя */}
          <div>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#333' }}>Найти пользователя</h3>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                placeholder="@user_id"
                value={searchUserId}
                onChange={e => setSearchUserId(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && searchUser()}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
              <button
                onClick={searchUser}
                disabled={loading}
                style={{
                  padding: '10px 20px',
                  backgroundColor: loading ? '#ccc' : '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? '...' : 'Найти'}
              </button>
            </div>
            
            {searchResult && (
              <div style={{
                marginTop: '10px',
                padding: '12px',
                background: '#f0f4ff',
                borderRadius: '8px',
                border: '1px solid #667eea'
              }}>
                <div style={{ fontWeight: '600', marginBottom: '5px' }}>{searchResult.userId || '@' + searchResult.username}</div>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>{searchResult.username}</div>
                <button
                  onClick={() => startChat(searchResult.username)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: '#667eea',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  Написать
                </button>
              </div>
            )}
          </div>

          {/* Список чатов */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#333' }}>Мои чаты</h3>
            {chats.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#666', padding: '20px', fontSize: '14px' }}>
                Нет активных чатов
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {chats.map((chat) => {
                  const otherUser = chat.other_username;
                  const isSelected = selectedChat === otherUser;
                  return (
                    <div
                      key={otherUser}
                      onClick={() => startChat(otherUser)}
                      style={{
                        padding: '12px',
                        background: isSelected ? '#e0e7ff' : '#f8f9fa',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        border: isSelected ? '2px solid #667eea' : '1px solid #e2e8f0',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ fontWeight: '600', marginBottom: '4px' }}>{getDisplayName(otherUser)}</div>
                      <div style={{ fontSize: '12px', color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {chat.content}
                      </div>
                      <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                        {formatTime(chat.created_at)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Область чата */}
        <div style={{
          flex: 1,
          background: 'rgba(255,255,255,0.95)',
          borderRadius: '15px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {selectedChat ? (
            <>
              {/* Заголовок чата */}
              <div style={{
                paddingBottom: '15px',
                borderBottom: '2px solid #e2e8f0',
                marginBottom: '15px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <h2 
                    style={{ 
                      margin: 0, 
                      fontSize: '20px', 
                      color: '#333',
                      cursor: 'pointer',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      transition: 'all 0.2s',
                      display: 'inline-block'
                    }}
                    onClick={() => {
                      setShowUserMenu(true);
                      setUserMenuNickname(chatNicknames[selectedChat] || '');
                    }}
                    onMouseOver={(e) => {
                      e.target.style.backgroundColor = '#f0f4ff';
                      e.target.style.color = '#667eea';
                    }}
                    onMouseOut={(e) => {
                      e.target.style.backgroundColor = 'transparent';
                      e.target.style.color = '#333';
                    }}
                  >
                    {getDisplayName(selectedChat)}
                  </h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#666' }}>
                    <span style={{
                      display: 'inline-block',
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: userStatus.status === 'online' ? '#10b981' : '#6b7280'
                    }} />
                    <span>
                      {userStatus.status === 'online' ? 'В сети' : `Был(а) ${formatLastSeen(userStatus.last_seen)}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Модальное окно профиля пользователя */}
              {showUserMenu && (
                <>
                  <div
                    style={{
                      position: 'fixed',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: 'rgba(0, 0, 0, 0.5)',
                      zIndex: 9999,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    onClick={() => {
                      setShowUserMenu(false);
                      setShowFavorites(false);
                    }}
                  />
                  <div
                    style={{
                      position: 'fixed',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      background: 'white',
                      borderRadius: '20px',
                      padding: '30px',
                      zIndex: 10000,
                      maxWidth: '500px',
                      width: '90%',
                      maxHeight: '80vh',
                      overflowY: 'auto',
                      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '20px'
                    }}>
                      <h2 style={{ margin: 0, fontSize: '24px', color: '#333' }}>
                        👤 {selectedChat}
                      </h2>
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          setShowFavorites(false);
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          fontSize: '24px',
                          cursor: 'pointer',
                          color: '#999',
                          padding: '0',
                          width: '30px',
                          height: '30px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        onMouseOver={(e) => e.target.style.color = '#ef4444'}
                        onMouseOut={(e) => e.target.style.color = '#999'}
                      >
                        ×
                      </button>
                    </div>

                    {/* Переименование */}
                    <div style={{ marginBottom: '25px' }}>
                      <h3 style={{ margin: '0 0 15px 0', fontSize: '18px', color: '#333' }}>
                        ✏️ Переименовать
                      </h3>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <input
                          type="text"
                          value={userMenuNickname}
                          onChange={(e) => setUserMenuNickname(e.target.value)}
                          placeholder="Введите новое имя (оставьте пустым для сброса)"
                          style={{
                            flex: 1,
                            padding: '12px 16px',
                            border: '2px solid #e2e8f0',
                            borderRadius: '10px',
                            fontSize: '16px',
                            outline: 'none'
                          }}
                          onFocus={(e) => e.target.style.borderColor = '#667eea'}
                          onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              saveNickname(selectedChat, userMenuNickname);
                              setShowUserMenu(false);
                            }
                          }}
                        />
                        <button
                          onClick={() => {
                            saveNickname(selectedChat, userMenuNickname);
                            setShowUserMenu(false);
                          }}
                          style={{
                            padding: '12px 24px',
                            backgroundColor: '#667eea',
                            color: 'white',
                            border: 'none',
                            borderRadius: '10px',
                            fontSize: '16px',
                            fontWeight: '600',
                            cursor: 'pointer'
                          }}
                        >
                          Сохранить
                        </button>
                      </div>
                      <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#666' }}>
                        Это имя будет видно только вам
                      </p>
                    </div>

                    {/* Избранные книги */}
                    <div>
                      <h3 style={{ margin: '0 0 15px 0', fontSize: '18px', color: '#333' }}>
                        ⭐ Избранные книги
                      </h3>
                      {showFavorites ? (
                        <div style={{
                          padding: '15px',
                          background: '#f0f4ff',
                          borderRadius: '10px',
                          border: '1px solid #667eea',
                          maxHeight: '300px',
                          overflowY: 'auto'
                        }}>
                          {otherUserFavorites.length === 0 ? (
                            <div style={{ color: '#666', fontSize: '14px', textAlign: 'center', padding: '20px' }}>
                              У пользователя нет избранных книг или они скрыты
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {otherUserFavorites.map((book) => (
                                <div
                                  key={book.id}
                                  style={{
                                    padding: '12px',
                                    background: 'white',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                  }}
                                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e0e7ff'}
                                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'white'}
                                  onClick={() => {
                                    router.push(`/reader?id=${encodeURIComponent(book.id)}`);
                                    setShowUserMenu(false);
                                  }}
                                >
                                  <div style={{ fontWeight: '600', marginBottom: '4px', color: '#333' }}>
                                    {book.title}
                                  </div>
                                  <div style={{ fontSize: '12px', color: '#666' }}>
                                    {book.author}
                                  </div>
                                  {book.genre && (
                                    <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                                      {book.genre}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          <button
                            onClick={() => setShowFavorites(false)}
                            style={{
                              marginTop: '15px',
                              width: '100%',
                              padding: '10px',
                              backgroundColor: '#ef4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              fontSize: '14px',
                              fontWeight: '600',
                              cursor: 'pointer'
                            }}
                          >
                            Скрыть избранное
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={async () => {
                            try {
                              const res = await fetch(`/api/favorites?username=${encodeURIComponent(selectedChat)}`);
                              if (res.ok) {
                                const data = await res.json();
                                setOtherUserFavorites(data);
                                setShowFavorites(true);
                              } else {
                                const errorData = await res.json().catch(() => ({ error: 'Избранное скрыто' }));
                                if (errorData.error) {
                                  alert('Пользователь скрыл свои избранные книги');
                                }
                              }
                            } catch (error) {
                              console.error('Ошибка загрузки избранного:', error);
                              alert('Ошибка загрузки избранных книг');
                            }
                          }}
                          style={{
                            width: '100%',
                            padding: '12px 24px',
                            backgroundColor: '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '10px',
                            fontSize: '16px',
                            fontWeight: '600',
                            cursor: 'pointer'
                          }}
                        >
                          Показать избранные книги
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Сообщения */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                marginBottom: '15px',
                padding: '10px',
                background: '#f8f9fa',
                borderRadius: '10px',
                maxHeight: '500px'
              }}>
                {messages.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
                    Нет сообщений. Начните переписку!
                  </div>
                ) : (
                  <>
                    {messages.map((msg) => {
                      const isOwn = msg.sender_username === currentUser;
                      const isEditing = editingMessageId === msg.id;
                      return (
                        <div
                          key={msg.id}
                          style={{
                            alignSelf: isOwn ? 'flex-end' : 'flex-start',
                            maxWidth: '70%',
                            position: 'relative'
                          }}
                          onMouseEnter={(e) => {
                            if (isOwn) {
                              const buttons = e.currentTarget.querySelector('.message-actions');
                              if (buttons) buttons.style.display = 'flex';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (isOwn && !isEditing) {
                              const buttons = e.currentTarget.querySelector('.message-actions');
                              if (buttons) buttons.style.display = 'none';
                            }
                          }}
                        >
                          {isEditing ? (
                            <div style={{
                              padding: '10px 14px',
                              background: '#f0f4ff',
                              borderRadius: '12px',
                              border: '2px solid #667eea',
                              minWidth: '200px'
                            }}>
                              <input
                                type="text"
                                value={editingContent}
                                onChange={(e) => setEditingContent(e.target.value)}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    saveEditMessage(msg.id);
                                  } else if (e.key === 'Escape') {
                                    setEditingMessageId(null);
                                    setEditingContent('');
                                  }
                                }}
                                autoFocus
                                style={{
                                  width: '100%',
                                  padding: '8px',
                                  border: '1px solid #667eea',
                                  borderRadius: '6px',
                                  fontSize: '14px',
                                  outline: 'none'
                                }}
                              />
                              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                <button
                                  onClick={() => saveEditMessage(msg.id)}
                                  style={{
                                    padding: '6px 12px',
                                    backgroundColor: '#667eea',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  Сохранить
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingMessageId(null);
                                    setEditingContent('');
                                  }}
                                  style={{
                                    padding: '6px 12px',
                                    backgroundColor: '#ef4444',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  Отмена
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div style={{
                                padding: '10px 14px',
                                background: isOwn ? '#667eea' : '#e2e8f0',
                                color: isOwn ? 'white' : '#333',
                                borderRadius: '12px',
                                fontSize: '14px',
                                wordWrap: 'break-word',
                                position: 'relative'
                              }}>
                                {msg.content}
                                {isOwn && (
                                  <div className="message-actions" style={{
                                    display: 'none',
                                    position: 'absolute',
                                    top: '-30px',
                                    right: '0',
                                    gap: '4px',
                                    background: 'white',
                                    padding: '4px',
                                    borderRadius: '6px',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                                  }}>
                                    <button
                                      onClick={() => handleEditMessage(msg.id, msg.content)}
                                      style={{
                                        padding: '4px 8px',
                                        backgroundColor: '#667eea',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        fontSize: '11px',
                                        cursor: 'pointer'
                                      }}
                                      title="Редактировать"
                                    >
                                      ✏️
                                    </button>
                                    <button
                                      onClick={() => handleDeleteMessage(msg.id)}
                                      style={{
                                        padding: '4px 8px',
                                        backgroundColor: '#ef4444',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        fontSize: '11px',
                                        cursor: 'pointer'
                                      }}
                                      title="Удалить"
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                )}
                              </div>
                              <div style={{
                                fontSize: '11px',
                                color: '#999',
                                marginTop: '4px',
                                textAlign: isOwn ? 'right' : 'left',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                justifyContent: isOwn ? 'flex-end' : 'flex-start'
                              }}>
                                <span>{formatMessageTime(msg.created_at)}</span>
                                {msg.edited_at && (
                                  <span style={{ fontSize: '10px', fontStyle: 'italic' }}>
                                    (изменено)
                                  </span>
                                )}
                                {isOwn && (
                                  <span style={{ 
                                    fontSize: '14px', 
                                    color: msg.read_status ? '#667eea' : '#999',
                                    fontWeight: 'bold',
                                    marginLeft: '4px'
                                  }}>
                                    {msg.read_status ? '✓✓ Прочитано' : '✓ Отправлено'}
                                  </span>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                    {isTyping && (
                      <div style={{
                        alignSelf: 'flex-start',
                        maxWidth: '70%'
                      }}>
                        <div style={{
                          padding: '10px 14px',
                          background: '#e2e8f0',
                          color: '#333',
                          borderRadius: '12px',
                          fontSize: '14px',
                          fontStyle: 'italic',
                          opacity: 0.7
                        }}>
                          {selectedChat} печатает...
                        </div>
                      </div>
                    )}
                  </>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Форма отправки сообщения */}
              <form onSubmit={sendMessage} style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  value={newMessage}
                  onChange={e => {
                    setNewMessage(e.target.value);
                    handleTyping();
                  }}
                  onKeyDown={handleTyping}
                  placeholder="Введите сообщение..."
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '10px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: newMessage.trim() ? '#667eea' : '#ccc',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: newMessage.trim() ? 'pointer' : 'not-allowed'
                  }}
                >
                  Отправить
                </button>
              </form>
            </>
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: '#666',
              fontSize: '16px'
            }}>
              Выберите чат или найдите пользователя для начала переписки
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

