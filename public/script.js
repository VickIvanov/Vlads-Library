// Загрузка всех книг при старте
async function loadBooks() {
  try {
    const res = await fetch('/api/books');
    const books = await res.json();

    const list = document.getElementById('book-list');
    list.innerHTML = '';

    books.forEach(book => {
      const item = document.createElement('div');
      item.className = 'book-item';
      item.innerHTML = `
        <h3>${book.title}</h3>
        <p><b>Автор:</b> ${book.author}</p>
        <p><b>Жанр:</b> ${book.genre}</p>
        <p>${book.description || ''}</p>
        <img src="${book.cover || 'https://via.placeholder.com/100x150?text=Cover'}" alt="cover" width="100">
        <button onclick="deleteBook(${book.id})">Удалить</button>
      `;
      list.appendChild(item);
    });
  } catch (err) {
    console.error(err);
    alert('Ошибка при загрузке книг');
  }
}

// Добавление книги
async function addBook(e) {
  e.preventDefault();

  const title = document.getElementById('title').value.trim();
  const author = document.getElementById('author').value.trim();
  const genre = document.getElementById('genre').value.trim();
  const description = document.getElementById('description').value.trim();
  const cover = document.getElementById('cover').value.trim();
  const added_by = document.getElementById('username').value.trim() || 'неизвестно';

  if (!title || !author || !genre) {
    alert('Заполни все поля!');
    return;
  }

  try {
    const res = await fetch('/api/books', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, author, genre, description, cover, added_by })
    });

    const data = await res.json();
    alert(data.message || data.error);
    loadBooks();
  } catch (err) {
    console.error(err);
    alert('Ошибка при добавлении книги');
  }
}

// Удаление книги
async function deleteBook(id) {
  if (!confirm('Удалить книгу?')) return;

  try {
    const res = await fetch(`/api/delete-books?id=${id}`, { method: 'DELETE' });
    const data = await res.json();
    alert(data.message || data.error);
    loadBooks();
  } catch (err) {
    console.error(err);
    alert('Ошибка при удалении книги');
  }
}

// Регистрация пользователя
async function registerUser(e) {
  e.preventDefault();

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();

  if (!username || !password) {
    alert('Введите логин и пароль!');
    return;
  }

  try {
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    alert(data.message || data.error);
  } catch (err) {
    console.error(err);
    alert('Ошибка при регистрации');
  }
}

document.addEventListener('DOMContentLoaded', loadBooks);
