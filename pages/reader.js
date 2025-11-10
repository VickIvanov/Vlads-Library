import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';

export default function Reader() {
  const router = useRouter();
  const { filename } = router.query;
  const [content, setContent] = useState('');
  const [pages, setPages] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bookmarks, setBookmarks] = useState([]);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showAddBookmark, setShowAddBookmark] = useState(false);
  const [bookmarkTitle, setBookmarkTitle] = useState('');
  const pageRef = useRef(null);

  // Функция для разбиения текста на страницы
  const splitIntoPages = (text, charsPerPage = 2000) => {
    const pages = [];
    let currentPage = '';
    let charCount = 0;
    
    // Разбиваем по абзацам для более естественного разбиения
    const paragraphs = text.split(/\n\n+/);
    
    for (const paragraph of paragraphs) {
      const paragraphLength = paragraph.length + 2; // +2 для переносов строк
      
      if (charCount + paragraphLength > charsPerPage && currentPage) {
        pages.push(currentPage.trim());
        currentPage = paragraph + '\n\n';
        charCount = paragraphLength;
      } else {
        currentPage += paragraph + '\n\n';
        charCount += paragraphLength;
      }
    }
    
    if (currentPage.trim()) {
      pages.push(currentPage.trim());
    }
    
    return pages.length > 0 ? pages : [text];
  };

  useEffect(() => {
    if (!filename) return;

    const loadBook = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/read-book?filename=${encodeURIComponent(filename)}`);
        
        if (!res.ok) {
          const responseText = await res.text();
          let errorMessage = 'Не удалось загрузить книгу';
          
          try {
            const errorData = JSON.parse(responseText);
            errorMessage = errorData.error || errorMessage;
          } catch (jsonError) {
            errorMessage = responseText || errorMessage;
          }
          
          throw new Error(errorMessage);
        }
        
        const text = await res.text();
        setContent(text);
        const bookPages = splitIntoPages(text);
        setPages(bookPages);
        setCurrentPage(0);
      } catch (err) {
        console.error('Ошибка загрузки книги:', err);
        setError(err.message || 'Не удалось загрузить книгу');
      } finally {
        setLoading(false);
      }
    };

    loadBook();
  }, [filename]);

  // Загрузка закладок
  useEffect(() => {
    if (!filename) return;

    const loadBookmarks = async () => {
      try {
        const res = await fetch(`/api/bookmarks?filename=${encodeURIComponent(filename)}`);
        if (res.ok) {
          const data = await res.json();
          setBookmarks(data);
        }
      } catch (error) {
        console.error('Ошибка загрузки закладок:', error);
      }
    };

    loadBookmarks();
  }, [filename]);

  // Добавление закладки
  const handleAddBookmark = async () => {
    if (!filename) return;
    
    const title = bookmarkTitle.trim() || `Закладка на странице ${currentPage + 1}`;
    
    try {
      const res = await fetch('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, page: currentPage, title })
      });
      
      if (res.ok) {
        const data = await res.json();
        setBookmarks([...bookmarks, data.bookmark]);
        setBookmarkTitle('');
        setShowAddBookmark(false);
      }
    } catch (error) {
      console.error('Ошибка добавления закладки:', error);
    }
  };

  // Удаление закладки
  const handleDeleteBookmark = async (id) => {
    if (!confirm('Удалить эту закладку?')) return;
    
    try {
      const res = await fetch(`/api/bookmarks?id=${id}`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        setBookmarks(bookmarks.filter(b => b.id !== id));
      }
    } catch (error) {
      console.error('Ошибка удаления закладки:', error);
    }
  };

  // Переход к закладке
  const goToBookmark = (page) => {
    goToPage(page);
    setShowBookmarks(false);
  };

  // Навигация по страницам
  const goToPage = (pageIndex) => {
    if (pageIndex >= 0 && pageIndex < pages.length) {
      setCurrentPage(pageIndex);
      if (pageRef.current) {
        pageRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const nextPage = () => {
    if (currentPage < pages.length - 1) {
      goToPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 0) {
      goToPage(currentPage - 1);
    }
  };

  // Обработка клавиш
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        if (e.key === 'ArrowLeft') {
          prevPage();
        } else {
          nextPage();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentPage, pages.length]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        fontSize: '20px'
      }}>
        ⏳ Загрузка книги...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '40px'
      }}>
        <div style={{ fontSize: '64px', marginBottom: '20px' }}>❌</div>
        <h1 style={{ marginBottom: '10px' }}>Ошибка</h1>
        <p>{error}</p>
        <button
          onClick={() => router.push('/')}
          style={{
            marginTop: '20px',
            padding: '12px 24px',
            backgroundColor: 'white',
            color: '#667eea',
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
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Кнопка назад */}
      <button
        onClick={() => router.push('/')}
        style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          padding: '10px 20px',
          backgroundColor: 'rgba(255,255,255,0.9)',
          color: '#667eea',
          border: 'none',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '600',
          cursor: 'pointer',
          zIndex: 10,
          transition: 'all 0.3s ease'
        }}
        onMouseOver={(e) => e.target.style.backgroundColor = 'white'}
        onMouseOut={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.9)'}
      >
        ← Назад
      </button>

      {/* Кнопки закладок */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        display: 'flex',
        gap: '10px',
        zIndex: 10
      }}>
        <button
          onClick={() => setShowAddBookmark(true)}
          style={{
            padding: '10px 20px',
            backgroundColor: 'rgba(255,255,255,0.9)',
            color: '#667eea',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
          onMouseOver={(e) => e.target.style.backgroundColor = 'white'}
          onMouseOut={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.9)'}
        >
          🔖 Добавить закладку
        </button>
        <button
          onClick={() => setShowBookmarks(!showBookmarks)}
          style={{
            padding: '10px 20px',
            backgroundColor: 'rgba(255,255,255,0.9)',
            color: '#667eea',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            position: 'relative'
          }}
          onMouseOver={(e) => e.target.style.backgroundColor = 'white'}
          onMouseOut={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.9)'}
        >
          📑 Закладки {bookmarks.length > 0 && `(${bookmarks.length})`}
        </button>
      </div>

      {/* Контейнер для страниц */}
      <div style={{
        display: 'flex',
        width: '100%',
        maxWidth: '1400px',
        height: '90vh',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '20px',
        position: 'relative'
      }}>
        {/* Кнопка предыдущей страницы */}
        <button
          onClick={prevPage}
          disabled={currentPage === 0}
          style={{
            padding: '20px 15px',
            backgroundColor: currentPage === 0 ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.9)',
            color: currentPage === 0 ? 'rgba(255,255,255,0.5)' : '#667eea',
            border: 'none',
            borderRadius: '10px',
            fontSize: '24px',
            fontWeight: 'bold',
            cursor: currentPage === 0 ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: currentPage === 0 ? 'none' : '0 4px 15px rgba(0,0,0,0.2)'
          }}
          onMouseOver={(e) => {
            if (currentPage > 0) {
              e.target.style.backgroundColor = 'white';
              e.target.style.transform = 'scale(1.1)';
            }
          }}
          onMouseOut={(e) => {
            if (currentPage > 0) {
              e.target.style.backgroundColor = 'rgba(255,255,255,0.9)';
              e.target.style.transform = 'scale(1)';
            }
          }}
        >
          ‹
        </button>

        {/* Страница книги */}
        <div
          ref={pageRef}
          style={{
            flex: 1,
            maxWidth: '800px',
            height: '100%',
            background: '#fefefe',
            borderRadius: '15px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
            padding: '60px 80px',
            overflow: 'auto',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start'
          }}
        >
          <div style={{
            fontSize: '20px',
            lineHeight: '1.8',
            color: '#333',
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word',
            fontFamily: 'Georgia, serif',
            textAlign: 'justify',
            flex: 1
          }}>
            {pages[currentPage] || content}
          </div>
          
          {/* Номер страницы внизу */}
          <div style={{
            position: 'absolute',
            bottom: '20px',
            right: '40px',
            fontSize: '14px',
            color: '#999',
            fontFamily: 'Arial, sans-serif'
          }}>
            {currentPage + 1} / {pages.length}
          </div>
        </div>

        {/* Кнопка следующей страницы */}
        <button
          onClick={nextPage}
          disabled={currentPage === pages.length - 1}
          style={{
            padding: '20px 15px',
            backgroundColor: currentPage === pages.length - 1 ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.9)',
            color: currentPage === pages.length - 1 ? 'rgba(255,255,255,0.5)' : '#667eea',
            border: 'none',
            borderRadius: '10px',
            fontSize: '24px',
            fontWeight: 'bold',
            cursor: currentPage === pages.length - 1 ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: currentPage === pages.length - 1 ? 'none' : '0 4px 15px rgba(0,0,0,0.2)'
          }}
          onMouseOver={(e) => {
            if (currentPage < pages.length - 1) {
              e.target.style.backgroundColor = 'white';
              e.target.style.transform = 'scale(1.1)';
            }
          }}
          onMouseOut={(e) => {
            if (currentPage < pages.length - 1) {
              e.target.style.backgroundColor = 'rgba(255,255,255,0.9)';
              e.target.style.transform = 'scale(1)';
            }
          }}
        >
          ›
        </button>
      </div>

      {/* Подсказка */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        color: 'rgba(255,255,255,0.8)',
        fontSize: '14px',
        fontFamily: 'Arial, sans-serif'
      }}>
        Используйте стрелки ← → для навигации
      </div>

      {/* Модальное окно добавления закладки */}
      {showAddBookmark && (
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
            onClick={() => { setShowAddBookmark(false); setBookmarkTitle(''); }}
          />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '20px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            zIndex: 2000,
            maxWidth: '400px',
            width: '90%'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#333' }}>Добавить закладку</h3>
            <p style={{ marginBottom: '15px', color: '#666', fontSize: '14px' }}>
              Страница: {currentPage + 1} / {pages.length}
            </p>
            <input
              type="text"
              placeholder="Название закладки (необязательно)"
              value={bookmarkTitle}
              onChange={(e) => setBookmarkTitle(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #e2e8f0',
                borderRadius: '10px',
                fontSize: '16px',
                marginBottom: '20px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleAddBookmark();
                }
              }}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleAddBookmark}
                style={{
                  flex: 1,
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
                Добавить
              </button>
              <button
                onClick={() => { setShowAddBookmark(false); setBookmarkTitle(''); }}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  backgroundColor: '#e2e8f0',
                  color: '#333',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Отмена
              </button>
            </div>
          </div>
        </>
      )}

      {/* Модальное окно списка закладок */}
      {showBookmarks && (
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
            onClick={() => setShowBookmarks(false)}
          />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '20px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            zIndex: 2000,
            maxWidth: '500px',
            width: '90%',
            maxHeight: '70vh',
            overflow: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '24px', color: '#333' }}>Закладки</h3>
              <button
                onClick={() => setShowBookmarks(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#666',
                  padding: '5px 10px'
                }}
              >
                ✖
              </button>
            </div>
            {bookmarks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                <div style={{ fontSize: '48px', marginBottom: '10px' }}>🔖</div>
                <p>Нет закладок</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {bookmarks.map((bookmark) => (
                  <div
                    key={bookmark.id}
                    style={{
                      padding: '15px',
                      border: '2px solid #e2e8f0',
                      borderRadius: '10px',
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
                      e.currentTarget.style.backgroundColor = 'white';
                    }}
                  >
                    <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => goToBookmark(bookmark.page)}>
                      <div style={{ fontWeight: '600', color: '#333', marginBottom: '5px' }}>
                        {bookmark.title}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        Страница {bookmark.page + 1} / {pages.length}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteBookmark(bookmark.id)}
                      style={{
                        padding: '8px 12px',
                        backgroundColor: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        marginLeft: '10px'
                      }}
                    >
                      Удалить
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
