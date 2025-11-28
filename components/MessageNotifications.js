import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';

export default function MessageNotifications({ currentUser }) {
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const eventSourceRef = useRef(null);
  const processedMessageIds = useRef(new Set());
  
  // Загружаем уже показанные уведомления из localStorage при монтировании
  useEffect(() => {
    if (currentUser) {
      const stored = localStorage.getItem(`shownNotifications_${currentUser}`);
      if (stored) {
        try {
          const ids = JSON.parse(stored);
          processedMessageIds.current = new Set(ids);
        } catch (e) {
          console.error('Ошибка загрузки показанных уведомлений:', e);
        }
      }
    }
  }, [currentUser]);
  
  // Сохраняем показанные уведомления в localStorage
  const saveShownNotification = (messageId) => {
    if (!currentUser) return;
    processedMessageIds.current.add(messageId);
    try {
      const ids = Array.from(processedMessageIds.current);
      localStorage.setItem(`shownNotifications_${currentUser}`, JSON.stringify(ids));
    } catch (e) {
      console.error('Ошибка сохранения показанных уведомлений:', e);
    }
  };

  useEffect(() => {
    if (!currentUser) return;

    // Настраиваем Server-Sent Events для получения новых сообщений
    if (typeof EventSource !== 'undefined') {
      const eventSource = new EventSource(`/api/messages/stream?username=${encodeURIComponent(currentUser)}`);
      eventSourceRef.current = eventSource;
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'messages' && data.data) {
            const newMessages = data.data;
            
            // Фильтруем только новые непрочитанные входящие сообщения
            const incomingMessages = newMessages.filter(msg => 
              msg.receiver_username === currentUser && 
              !msg.read_status &&
              !processedMessageIds.current.has(msg.id)
            );
            
            if (incomingMessages.length > 0) {
              // Добавляем уведомления для новых сообщений
              incomingMessages.forEach(msg => {
                // Сохраняем ID в памяти и localStorage
                saveShownNotification(msg.id);
                
                const notification = {
                  id: msg.id,
                  sender: msg.sender_username,
                  content: msg.content,
                  timestamp: Date.now()
                };
                
                setNotifications(prev => {
                  // Добавляем новое уведомление в начало, ограничиваем до 3
                  const updated = [notification, ...prev].slice(0, 3);
                  return updated;
                });
                
                // Автоматически удаляем уведомление через 5 секунд
                setTimeout(() => {
                  setNotifications(prev => prev.filter(n => n.id !== msg.id));
                }, 5000);
              });
            }
          }
        } catch (error) {
          console.error('Ошибка обработки SSE данных:', error);
        }
      };
      
      eventSource.onerror = (error) => {
        console.error('Ошибка SSE соединения:', error);
      };
      
      return () => {
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
        }
      };
    }
  }, [currentUser]);

  const handleNotificationClick = (sender) => {
    // Переходим в чаты и открываем чат с отправителем
    router.push(`/chats?open=${encodeURIComponent(sender)}`);
    // Удаляем уведомление
    setNotifications(prev => prev.filter(n => n.sender !== sender));
  };

  const handleClose = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  if (!currentUser || notifications.length === 0) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: 10000,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      maxWidth: '500px',
      width: '500px'
    }}>
      {notifications.map((notification, index) => (
        <div
          key={notification.id}
          style={{
            background: 'rgba(255, 255, 255, 0.98)',
            padding: '15px',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
            border: '2px solid #667eea',
            cursor: 'pointer',
            animation: `slideIn 0.3s ease-out ${index * 0.1}s both`,
            position: 'relative',
            transition: 'all 0.3s ease'
          }}
          onClick={() => handleNotificationClick(notification.sender)}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateX(-5px)';
            e.currentTarget.style.boxShadow = '0 6px 25px rgba(0, 0, 0, 0.2)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateX(0)';
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.15)';
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleClose(notification.id);
            }}
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              background: 'transparent',
              border: 'none',
              fontSize: '18px',
              cursor: 'pointer',
              color: '#999',
              padding: '0',
              width: '20px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseOver={(e) => e.target.style.color = '#ef4444'}
            onMouseOut={(e) => e.target.style.color = '#999'}
          >
            ×
          </button>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '8px'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '18px',
              fontWeight: 'bold',
              flexShrink: 0
            }}>
              {notification.sender.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontWeight: '600',
                color: '#333',
                fontSize: '14px',
                marginBottom: '4px'
              }}>
                {notification.sender}
              </div>
              <div style={{
                color: '#666',
                fontSize: '13px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                lineHeight: '1.4'
              }}>
                {notification.content}
              </div>
            </div>
          </div>
        </div>
      ))}
      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}

