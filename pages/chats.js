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
              // Если сообщение для текущего пользователя, обновляем чаты и открываем чат если нужно
              if (lastMessage.receiver_username === user) {
                // Обновляем список чатов сразу
                loadChats();
                // Если чат не открыт, открываем его
                if (!selectedChat || selectedChat !== lastMessage.sender_username) {
                  setSelectedChat(lastMessage.sender_username);
                  localStorage.setItem('selectedChat', lastMessage.sender_username);
                }
              }
            }
            
            if (selectedChat) {
              loadMessages(selectedChat);
            }
          } else if (data.type === 'chats_update') {
            // Обновляем список чатов при получении сигнала
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
        if (!selectedChat && data.length > 0) {
          const firstChat = data[0].other_username;
          setSelectedChat(firstChat);
          localStorage.setItem('selectedChat', firstChat);
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
    setSelectedChat(username);
    localStorage.setItem('selectedChat', username); // Сохраняем выбранный чат
    setSearchResult(null);
  };

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
        setTimeout(() => {
          loadMessages(selectedChat);
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
                      <div style={{ fontWeight: '600', marginBottom: '4px' }}>{otherUser}</div>
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
                <h2 style={{ margin: 0, fontSize: '20px', color: '#333' }}>{selectedChat}</h2>
              </div>

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
                      return (
                        <div
                          key={msg.id}
                          style={{
                            alignSelf: isOwn ? 'flex-end' : 'flex-start',
                            maxWidth: '70%'
                          }}
                        >
                          <div style={{
                            padding: '10px 14px',
                            background: isOwn ? '#667eea' : '#e2e8f0',
                            color: isOwn ? 'white' : '#333',
                            borderRadius: '12px',
                            fontSize: '14px',
                            wordWrap: 'break-word'
                          }}>
                            {msg.content}
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
                            {isOwn && (
                              <span style={{ fontSize: '10px', color: msg.read_status ? '#667eea' : '#999' }}>
                                {msg.read_status ? '✓✓' : '✓'}
                              </span>
                            )}
                          </div>
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

