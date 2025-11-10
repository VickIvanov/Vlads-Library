from flask import Flask, render_template, request, jsonify, session, redirect, url_for, send_from_directory
from functools import wraps
from werkzeug.utils import secure_filename
import json
import os
import re
from pathlib import Path
from dotenv import load_dotenv
from urllib.parse import urlencode, parse_qs
import requests

# Загрузка переменных окружения из .env
load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', 'your-secret-key-change-this-in-production-12345')

# Определяем файлы для разных серверов
is_vercel = os.getenv('VERCEL') or os.getenv('VERCEL_ENV')

if is_vercel:
    # Для Vercel
    DB_PATH = '/tmp/database.json'
    USERS_PATH = '/tmp/users.json'
    BOOKS_DIR = '/tmp/books'
    BACKGROUNDS_DIR = '/tmp/backgrounds'
else:
    # Для localhost
    DB_PATH = 'database.json'
    USERS_PATH = 'users.json'
    BOOKS_DIR = 'books'
    BACKGROUNDS_DIR = 'static/backgrounds'

# Создаем папки
if not os.path.exists(BOOKS_DIR):
    os.makedirs(BOOKS_DIR)
if not os.path.exists(BACKGROUNDS_DIR):
    os.makedirs(BACKGROUNDS_DIR)

# Настройки загрузки файлов
ALLOWED_BOOK_EXTENSIONS = {'txt'}
ALLOWED_IMAGE_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'}
UPLOAD_FOLDER = BOOKS_DIR
MAX_UPLOAD_SIZE = 16 * 1024 * 1024  # 16MB

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_UPLOAD_SIZE

def allowed_file(filename, extensions):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in extensions

# Инициализация базы данных
def init_db():
    if not os.path.exists(DB_PATH):
        default_data = {
            "settings": {
                "background": None,
                "backgroundType": "default"
            }
        }
        save_db(default_data)

# Инициализация файла пользователей
def init_users():
    if not os.path.exists(USERS_PATH):
        default_users = []
        save_users(default_users)

# Чтение пользователей
def read_users():
    init_users()
    try:
        with open(USERS_PATH, 'r', encoding='utf-8') as f:
            return json.load(f)
    except:
        return []

# Сохранение пользователей
def save_users(users):
    try:
        with open(USERS_PATH, 'w', encoding='utf-8') as f:
            json.dump(users, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        print(f'Ошибка сохранения пользователей: {e}')
        return False

# Чтение базы данных
def read_db():
    init_db()
    try:
        with open(DB_PATH, 'r', encoding='utf-8') as f:
            return json.load(f)
    except:
        return {"users": [], "books": [], "settings": {"background": None}}

# Сохранение базы данных
def save_db(data):
    with open(DB_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

# Получить пользователей из .env
def get_users_from_env():
    users_env = os.getenv('LIBRARY_USERS', '')
    users = []
    if users_env:
        for pair in users_env.split(','):
            pair = pair.strip()
            if ':' in pair:
                username, password = pair.split(':', 1)
                users.append({'username': username.strip(), 'password': password.strip()})
    return users

# Получить доступные фоны
def get_available_backgrounds():
    is_vercel = os.getenv('VERCEL') or os.getenv('VERCEL_ENV')
    
    if is_vercel:
        backgrounds = os.getenv('VERCEL_BACKGROUNDS', 'space1.svg,space2.svg,space3.svg')
    else:
        backgrounds = os.getenv('LOCAL_BACKGROUNDS', 'local1.svg,local2.svg,local3.svg')
    
    return [bg.strip() for bg in backgrounds.split(',') if bg.strip()]

# Проверка авторизации админа
def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('is_admin'):
            return jsonify({'error': 'Требуется авторизация администратора'}), 403
        return f(*args, **kwargs)
    return decorated_function

# Проверка является ли пользователь админом
def is_admin():
    admin_username = os.getenv('ADMIN_USERNAME', 'admin')
    return session.get('username') == admin_username

# Главная страница (для всех)
@app.route('/')
def index():
    return render_template('main.html')

# Админ панель
@app.route('/admin')
def admin_panel():
    return render_template('index.html')

# Страница управления пользователями (только для админа)
@app.route('/admin/users')
def admin_users():
    return render_template('users.html')

# Публичная страница с книгами (для всех)
@app.route('/books')
def public_books():
    return render_template('public.html')

# API: Получить все книги (публичный доступ)
@app.route('/api/books', methods=['GET'])
def get_books():
    # Загружаем книги из папки books
    books = []
    if os.path.exists(BOOKS_DIR):
        for filename in os.listdir(BOOKS_DIR):
            if filename.endswith('.json'):
                file_path = os.path.join(BOOKS_DIR, filename)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        book = json.load(f)
                        books.append(book)
                except Exception as e:
                    print(f'Ошибка чтения файла {filename}: {e}')
    
    # Поиск по запросу
    search_query = request.args.get('search', '').lower()
    if search_query:
        filtered_books = []
        for book in books:
            title = book.get('title', '').lower()
            author = book.get('author', '').lower()
            genre = book.get('genre', '').lower()
            description = book.get('description', '').lower()
            
            if (search_query in title or 
                search_query in author or 
                search_query in genre or 
                search_query in description):
                filtered_books.append(book)
        books = filtered_books
    
    return jsonify(books)

# API: Получить текст книги для чтения
@app.route('/api/books/<path:book_id>/text')
def get_book_text(book_id):
    try:
        from urllib.parse import unquote
        book_id = unquote(book_id)
        # Убираем лишние кавычки, если они есть
        book_id = book_id.strip('"').strip("'").strip()
        
        print(f"Запрос текста книги для ID: {book_id}")
        print(f"BOOKS_DIR: {BOOKS_DIR}")
        
        # Проверяем существование папки
        if not os.path.exists(BOOKS_DIR):
            print(f"Папка {BOOKS_DIR} не существует")
            return jsonify({'error': f'Папка книг не найдена: {BOOKS_DIR}'}), 404
        
        # Ищем файл метаданных
        meta_path = os.path.join(BOOKS_DIR, book_id + '.json')
        print(f"Проверка метаданных: {meta_path}, существует: {os.path.exists(meta_path)}")
        
        if os.path.exists(meta_path):
            with open(meta_path, 'r', encoding='utf-8') as f:
                book_data = json.load(f)
                book_file = book_data.get('book_file')
                print(f"Найдены метаданные, book_file: {book_file}")
                
                if book_file:
                    file_path = os.path.join(BOOKS_DIR, book_file)
                    print(f"Путь к файлу: {file_path}, существует: {os.path.exists(file_path)}")
                    if os.path.exists(file_path):
                        with open(file_path, 'r', encoding='utf-8') as f:
                            text = f.read()
                        print(f"Файл прочитан, размер текста: {len(text)} символов")
                        return jsonify({
                            'text': text,
                            'title': book_data.get('title', 'Книга'),
                            'author': book_data.get('author', 'Неизвестен')
                        })
        
        # Также проверяем файл напрямую (book_id может быть именем файла)
        book_file_path = os.path.join(BOOKS_DIR, book_id)
        print(f"Проверка прямого пути: {book_file_path}, существует: {os.path.exists(book_file_path)}")
        
        if os.path.exists(book_file_path) and not book_file_path.endswith('.json'):
            with open(book_file_path, 'r', encoding='utf-8') as f:
                text = f.read()
            print(f"Файл прочитан напрямую, размер: {len(text)} символов")
            return jsonify({
                'text': text,
                'title': book_id.replace('.txt', '').replace('.TXT', ''),
                'author': 'Неизвестен'
            })
        
        # Ищем по всем файлам в папке
        print(f"Поиск по всем файлам в {BOOKS_DIR}")
        files_in_dir = os.listdir(BOOKS_DIR) if os.path.exists(BOOKS_DIR) else []
        print(f"Файлы в папке: {files_in_dir}")
        
        for filename in files_in_dir:
            if filename.endswith('.json'):
                file_path = os.path.join(BOOKS_DIR, filename)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        book_data = json.load(f)
                    print(f"Проверка файла {filename}, ID в данных: {book_data.get('id')}")
                    if book_data.get('id') == book_id:
                        book_file = book_data.get('book_file')
                        if book_file:
                            book_file_path = os.path.join(BOOKS_DIR, book_file)
                            if os.path.exists(book_file_path):
                                with open(book_file_path, 'r', encoding='utf-8') as f:
                                    text = f.read()
                                print(f"Найдена книга по ID, размер текста: {len(text)}")
                                return jsonify({
                                    'text': text,
                                    'title': book_data.get('title', 'Книга'),
                                    'author': book_data.get('author', 'Неизвестен')
                                })
                except Exception as e:
                    print(f"Ошибка при чтении {filename}: {e}")
                    continue
        
        error_msg = f'Файл книги не найден. ID: {book_id}, Папка: {BOOKS_DIR}'
        print(error_msg)
        return jsonify({'error': error_msg}), 404
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"Исключение в get_book_text: {error_trace}")
        return jsonify({'error': f'Ошибка: {str(e)}', 'traceback': error_trace}), 500

# API: Страница чтения книги
@app.route('/read')
def read_book():
    return render_template('reader.html')

# API: Скачать файл книги
@app.route('/api/books/<path:book_id>/download')
def download_book(book_id):
    try:
        # Ищем файл метаданных (book_id уже содержит формат, например "название.txt")
        # Декодируем book_id (он может быть URL-encoded)
        from urllib.parse import unquote
        book_id = unquote(book_id)
        # Убираем лишние кавычки, если они есть
        book_id = book_id.strip('"').strip("'").strip()
        
        meta_path = os.path.join(BOOKS_DIR, book_id + '.json')
        
        if os.path.exists(meta_path):
            with open(meta_path, 'r', encoding='utf-8') as f:
                book_data = json.load(f)
                book_file = book_data.get('book_file')
                
                if book_file:
                    file_path = os.path.join(BOOKS_DIR, book_file)
                    if os.path.exists(file_path):
                        # Открываем файл в браузере, а не скачиваем
                        response = send_from_directory(BOOKS_DIR, book_file, as_attachment=False)
                        # Устанавливаем правильный Content-Type для текстовых файлов
                        if book_file.endswith('.txt'):
                            response.headers['Content-Type'] = 'text/plain; charset=utf-8'
                        return response
                    else:
                        # Если файл не найден по имени из метаданных, пробуем найти по ID
                        # (возможно, файл был сохранен с другим именем)
                        pass
        
        # Также проверяем, может быть файл сам по себе (book_id = название.txt)
        book_file_path = os.path.join(BOOKS_DIR, book_id)
        if os.path.exists(book_file_path) and not book_file_path.endswith('.json'):
            # Открываем файл в браузере, а не скачиваем
            response = send_from_directory(BOOKS_DIR, book_id, as_attachment=False)
            if book_id.endswith('.txt'):
                response.headers['Content-Type'] = 'text/plain; charset=utf-8'
            return response
        
        # Пробуем найти все файлы в папке books и найти подходящий
        if os.path.exists(BOOKS_DIR):
            # Ищем метаданные по всем файлам
            for filename in os.listdir(BOOKS_DIR):
                if filename.endswith('.json'):
                    file_path = os.path.join(BOOKS_DIR, filename)
                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            book_data = json.load(f)
                            if book_data.get('id') == book_id:
                                book_file = book_data.get('book_file')
                                if book_file:
                                    book_file_path = os.path.join(BOOKS_DIR, book_file)
                                    if os.path.exists(book_file_path):
                                        # Открываем файл в браузере, а не скачиваем
                                        response = send_from_directory(BOOKS_DIR, book_file, as_attachment=False)
                                        if book_file.endswith('.txt'):
                                            response.headers['Content-Type'] = 'text/plain; charset=utf-8'
                                        return response
                    except Exception:
                        continue
        
        return jsonify({'error': 'Файл книги не найден'}), 404
    except Exception as e:
        import traceback
        return jsonify({'error': f'Ошибка: {str(e)}', 'traceback': traceback.format_exc()}), 500

# Функция для создания безопасного имени файла из названия
def create_book_filename(title, file_format='txt'):
    # Убираем спецсимволы, оставляем только буквы, цифры, пробелы и дефисы
    filename = re.sub(r'[^\w\s-]', '', title)
    # Заменяем пробелы на подчеркивания
    filename = re.sub(r'\s+', '_', filename)
    # Убираем множественные подчеркивания
    filename = re.sub(r'_+', '_', filename)
    # Убираем подчеркивания в начале и конце
    filename = filename.strip('_')
    # Если пустое, используем "book"
    if not filename:
        filename = "book"
    # Добавляем формат
    return f"{filename}.{file_format}"

# API: Вход админа
@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    data = request.json
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    
    # Получаем данные из .env или используем значения по умолчанию
    admin_username = os.getenv('ADMIN_USERNAME', 'admin').strip()
    admin_password = os.getenv('ADMIN_PASSWORD', 'admin123').strip()
    
    # Простая проверка - используем значения по умолчанию если не заданы в .env
    if not admin_username or admin_username == '':
        admin_username = 'admin'
    if not admin_password or admin_password == '':
        admin_password = 'admin123'
    
    if username == admin_username and password == admin_password:
        session['username'] = username
        session['is_admin'] = True
        session.permanent = True
        return jsonify({'message': 'Вход выполнен успешно', 'is_admin': True})
    else:
        return jsonify({'error': f'Неверный логин или пароль. Попробуйте: {admin_username} / {admin_password}'}), 401

# API: Выход
@app.route('/api/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'message': 'Выход выполнен'})

# API: Проверка авторизации
@app.route('/api/check-auth', methods=['GET'])
def check_auth():
    return jsonify({
        'is_admin': session.get('is_admin', False),
        'username': session.get('username')
    })

# API: Добавить книгу (только для админа)
@app.route('/api/books', methods=['POST'])
def add_book():
    # Проверяем авторизацию
    if not session.get('is_admin'):
        return jsonify({'error': 'Требуется авторизация администратора'}), 403
    
    # Проверяем тип запроса - FormData или JSON
    if request.is_json:
        # Обработка JSON запроса (для совместимости)
        data = request.json
        title = data.get('title', '').strip()
        author = data.get('author', '').strip()
        genre = data.get('genre', '').strip()
        description = data.get('description', '')
        cover = data.get('cover', 'https://via.placeholder.com/150')
        book_file = None
    else:
        # Обработка FormData
        title = request.form.get('title', '').strip()
        author = request.form.get('author', '').strip()
        genre = request.form.get('genre', '').strip()
        description = request.form.get('description', '')
        cover = request.form.get('cover', 'https://via.placeholder.com/150')
        
        # Проверяем наличие файла
        if 'book_file' in request.files:
            book_file = request.files['book_file']
            if book_file and book_file.filename:
                book_file = book_file
            else:
                book_file = None
        else:
            book_file = None
    
    # Валидация обязательных полей
    if not title or not author or not genre:
        return jsonify({'error': 'title, author и genre обязательны'}), 400
    
    # Определяем формат файла
    if book_file and book_file.filename and allowed_file(book_file.filename, ALLOWED_BOOK_EXTENSIONS):
        file_format = book_file.filename.rsplit('.', 1)[1].lower()
    else:
        file_format = 'txt'  # По умолчанию
    
    # ID = название книги + формат
    book_filename = create_book_filename(title, file_format)
    book_id = book_filename  # ID включает формат: название.txt
    
    # Проверяем, не существует ли уже книга с таким ID
    book_file_path = os.path.join(BOOKS_DIR, book_filename)
    book_meta_path = os.path.join(BOOKS_DIR, book_id + '.json')
    
    if os.path.exists(book_file_path) or os.path.exists(book_meta_path):
        return jsonify({'error': f'Книга с названием "{title}" уже существует'}), 400
    
    # Сохраняем файл книги, если он есть
    saved_filename = None
    if book_file and book_file.filename:
        try:
            # Используем book_filename напрямую, чтобы соответствовать ID
            # secure_filename может изменить имя, что приведет к несоответствию
            filename = book_filename  # Используем то же имя, что и для ID
            file_path = os.path.join(BOOKS_DIR, filename)
            book_file.save(file_path)
            saved_filename = filename
        except Exception as e:
            return jsonify({'error': f'Ошибка сохранения файла: {e}'}), 500
    
    # Создаем метаданные о книге
    new_book = {
        'id': book_id,
        'title': title,
        'author': author,
        'genre': genre,
        'description': description,
        'cover': cover if cover else 'https://via.placeholder.com/150',
        'added_by': session.get('username', 'admin'),
        'added_at': str(Path(__file__).stat().st_mtime),
        'book_file': saved_filename,
        'file_format': file_format
    }
    
    # Сохраняем метаданные
    try:
        with open(book_meta_path, 'w', encoding='utf-8') as f:
            json.dump(new_book, f, ensure_ascii=False, indent=2)
    except Exception as e:
        # Если ошибка сохранения метаданных, удаляем файл
        if saved_filename and os.path.exists(os.path.join(BOOKS_DIR, saved_filename)):
            os.remove(os.path.join(BOOKS_DIR, saved_filename))
        return jsonify({'error': f'Ошибка сохранения: {e}'}), 500
    
    return jsonify({'message': 'Книга добавлена', 'id': book_id, 'book': new_book})

# API: Удалить книгу (только для админа)
@app.route('/api/books', methods=['DELETE'])
def delete_book():
    if not session.get('is_admin'):
        return jsonify({'error': 'Требуется авторизация администратора'}), 403
    
    book_id = request.args.get('id')
    if not book_id:
        return jsonify({'error': 'ID обязателен'}), 400
    
    # Ищем файлы книги по ID (метаданные и сам файл)
    deleted = False
    book_file_to_delete = None
    
    if os.path.exists(BOOKS_DIR):
        # Ищем файл метаданных
        meta_file = book_id + '.json'
        meta_path = os.path.join(BOOKS_DIR, meta_file)
        
        if os.path.exists(meta_path):
            try:
                # Читаем метаданные, чтобы узнать имя файла книги
                with open(meta_path, 'r', encoding='utf-8') as f:
                    book_data = json.load(f)
                    book_file_to_delete = book_data.get('book_file')
                
                # Удаляем метаданные
                os.remove(meta_path)
                deleted = True
                
                # Удаляем файл книги, если он есть
                if book_file_to_delete:
                    book_file_path = os.path.join(BOOKS_DIR, book_file_to_delete)
                    if os.path.exists(book_file_path):
                        os.remove(book_file_path)
            except Exception as e:
                return jsonify({'error': f'Ошибка удаления файла: {e}'}), 500
    
    if deleted:
        return jsonify({'message': 'Книга удалена'})
    
    return jsonify({'error': 'Книга не найдена'}), 404

# API: Регистрация
@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    
    if not username or not password:
        return jsonify({'error': 'Заполните все поля'}), 400
    
    # Проверяем в .env
    env_users = get_users_from_env()
    if any(u.get('username') == username for u in env_users):
        return jsonify({'error': 'Пользователь с таким именем уже существует в системе (.env)'}), 400
    
    # Проверяем в файле пользователей
    users = read_users()
    if any(u.get('username') == username for u in users):
        return jsonify({'error': 'Пользователь уже существует'}), 400
    
    # Добавляем нового пользователя
    new_user = {
        'username': username,
        'password': password,
        'created_at': str(Path(__file__).stat().st_mtime),
        'role': 'user',
        'is_admin': False,
        'has_subscription': False
    }
    users.append(new_user)
    
    if save_users(users):
        return jsonify({'message': f'Пользователь {username} зарегистрирован!'})
    else:
        return jsonify({'error': 'Ошибка сохранения пользователя'}), 500

# API: Логин (для обычных пользователей)
@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    
    if not username or not password:
        return jsonify({'error': 'Заполните все поля'}), 400
    
    # Проверяем в .env
    env_users = get_users_from_env()
    for user in env_users:
        if user.get('username') == username and user.get('password') == password:
            session['username'] = username
            session['is_user'] = True
            return jsonify({'message': 'Вход выполнен успешно', 'username': username, 'source': 'env'})
    
    # Проверяем в файле пользователей
    users = read_users()
    for user in users:
        if user.get('username') == username and user.get('password') == password:
            session['username'] = username
            session['is_user'] = True
            return jsonify({'message': 'Вход выполнен успешно', 'username': username, 'source': 'file'})
    
    # Проверяем существование пользователя
    if any(u.get('username') == username for u in env_users):
        return jsonify({'error': 'Неверный пароль'}), 401
    
    return jsonify({'error': 'Пользователь не найден'}), 401

# API: Настройки
@app.route('/api/settings', methods=['GET'])
def get_settings():
    db = read_db()
    settings = db.get('settings', {'background': None, 'backgroundType': 'default'})
    backgrounds = get_available_backgrounds()
    
    # Добавляем стандартные фоны
    backgrounds_list = [{
        'name': bg,
        'url': f'/static/backgrounds/{bg}'
    } for bg in backgrounds]
    
    # Добавляем пользовательские фоны из папки
    if os.path.exists(BACKGROUNDS_DIR):
        for filename in os.listdir(BACKGROUNDS_DIR):
            if allowed_file(filename, ALLOWED_IMAGE_EXTENSIONS):
                # Проверяем, нет ли уже такого фона
                if not any(bg['name'] == filename for bg in backgrounds_list):
                    backgrounds_list.append({
                        'name': filename,
                        'url': f'/backgrounds/{filename}'
                    })
    
    return jsonify({
        'settings': settings,
        'availableBackgrounds': backgrounds_list
    })

# API: Сохранить настройки
@app.route('/api/settings', methods=['POST'])
def save_settings():
    db = read_db()
    
    # Проверяем, есть ли загрузка файла фона
    if 'background_file' in request.files:
        file = request.files['background_file']
        if file and file.filename and allowed_file(file.filename, ALLOWED_IMAGE_EXTENSIONS):
            filename = secure_filename(file.filename)
            file_path = os.path.join(BACKGROUNDS_DIR, filename)
            file.save(file_path)
            
            background_url = f'/backgrounds/{filename}'
            
            if 'settings' not in db:
                db['settings'] = {}
            
            db['settings'].update({
                'background': background_url,
                'backgroundType': 'custom'
            })
            
            save_db(db)
            return jsonify({'message': 'Фон загружен и сохранен', 'settings': db['settings']})
        else:
            return jsonify({'error': 'Неподдерживаемый формат. Разрешены: png, jpg, jpeg, gif, svg, webp'}), 400
    else:
        # Обычное сохранение через JSON
        data = request.json if request.is_json else request.form.to_dict()
        
        if 'settings' not in db:
            db['settings'] = {}
        
        db['settings'].update({
            'background': data.get('background'),
            'backgroundType': data.get('backgroundType', 'default')
        })
        
        save_db(db)
        
        return jsonify({'message': 'Настройки сохранены', 'settings': db['settings']})

# Статические файлы фонов
@app.route('/backgrounds/<filename>')
def serve_background(filename):
    return send_from_directory(BACKGROUNDS_DIR, filename)

# API: Получить всех пользователей (только для админа)
@app.route('/api/users', methods=['GET'])
@admin_required
def get_all_users():
    users = read_users()
    env_users = get_users_from_env()
    
    # Объединяем пользователей из файла и .env
    all_users = []
    
    # Добавляем пользователей из .env
    for env_user in env_users:
        all_users.append({
            'username': env_user.get('username'),
            'source': 'env',
            'is_admin': False,
            'has_subscription': False,
            'created_at': None
        })
    
    # Добавляем пользователей из файла
    for user in users:
        all_users.append({
            'username': user.get('username'),
            'source': 'file',
            'is_admin': user.get('is_admin', False),
            'has_subscription': user.get('has_subscription', False),
            'created_at': user.get('created_at')
        })
    
    return jsonify(all_users)

# API: Обновить права пользователя (только для админа)
@app.route('/api/users/<path:username>', methods=['PUT'])
@admin_required
def update_user(username):
    from urllib.parse import unquote
    username = unquote(username)
    
    data = request.json
    is_admin = data.get('is_admin')
    has_subscription = data.get('has_subscription')
    
    users = read_users()
    user_found = False
    
    for user in users:
        if user.get('username') == username:
            # Обновляем только переданные поля
            if is_admin is not None:
                user['is_admin'] = is_admin
            if has_subscription is not None:
                user['has_subscription'] = has_subscription
            user_found = True
            break
    
    if not user_found:
        return jsonify({'error': 'Пользователь не найден'}), 404
    
    if save_users(users):
        return jsonify({'message': 'Права пользователя обновлены', 'user': {
            'username': username,
            'is_admin': user.get('is_admin', False),
            'has_subscription': user.get('has_subscription', False)
        }})
    else:
        return jsonify({'error': 'Ошибка сохранения'}), 500

# Google OAuth: Начало авторизации
@app.route('/api/auth/google', methods=['GET'])
def google_auth():
    # Получаем URL для редиректа
    redirect_uri = request.args.get('redirect_uri', request.url_root.rstrip('/') + '/api/auth/google/callback')
    
    # Получаем credentials из .env
    client_id = os.getenv('GOOGLE_CLIENT_ID')
    client_secret = os.getenv('GOOGLE_CLIENT_SECRET')
    
    if not client_id:
        return jsonify({'error': 'Google OAuth не настроен. Добавьте GOOGLE_CLIENT_ID в .env'}), 400
    
    # Сохраняем redirect_uri в сессии
    session['oauth_redirect_uri'] = redirect_uri
    
    # Формируем URL для авторизации Google
    auth_url = (
        'https://accounts.google.com/o/oauth2/v2/auth?'
        + urlencode({
            'client_id': client_id,
            'redirect_uri': request.url_root.rstrip('/') + '/api/auth/google/callback',
            'response_type': 'code',
            'scope': 'openid email profile',
            'access_type': 'online',
            'prompt': 'select_account'
        })
    )
    
    return redirect(auth_url)

# Google OAuth: Callback
@app.route('/api/auth/google/callback', methods=['GET'])
def google_auth_callback():
    code = request.args.get('code')
    error = request.args.get('error')
    
    if error:
        return redirect('/?error=' + error)
    
    if not code:
        return redirect('/?error=no_code')
    
    client_id = os.getenv('GOOGLE_CLIENT_ID')
    client_secret = os.getenv('GOOGLE_CLIENT_SECRET')
    
    if not client_id or not client_secret:
        return redirect('/?error=oauth_not_configured')
    
    # Обмениваем код на токен
    token_url = 'https://oauth2.googleapis.com/token'
    redirect_uri = request.url_root.rstrip('/') + '/api/auth/google/callback'
    
    token_data = {
        'code': code,
        'client_id': client_id,
        'client_secret': client_secret,
        'redirect_uri': redirect_uri,
        'grant_type': 'authorization_code'
    }
    
    try:
        token_response = requests.post(token_url, data=token_data)
        token_response.raise_for_status()
        tokens = token_response.json()
        access_token = tokens.get('access_token')
        
        if not access_token:
            return redirect('/?error=no_token')
        
        # Получаем информацию о пользователе
        user_info_url = 'https://www.googleapis.com/oauth2/v2/userinfo'
        headers = {'Authorization': f'Bearer {access_token}'}
        user_response = requests.get(user_info_url, headers=headers)
        user_response.raise_for_status()
        user_info = user_response.json()
        
        email = user_info.get('email')
        name = user_info.get('name', email)
        
        if not email:
            return redirect('/?error=no_email')
        
        # Проверяем или создаем пользователя
        users = read_users()
        user_found = False
        
        for user in users:
            if user.get('email') == email or user.get('username') == email:
                user_found = True
                # Обновляем информацию
                user['username'] = email
                user['email'] = email
                user['name'] = name
                user['auth_method'] = 'google'
                break
        
        if not user_found:
            # Создаем нового пользователя
            new_user = {
                'username': email,
                'email': email,
                'name': name,
                'password': None,  # Пароль не нужен для Google OAuth
                'created_at': str(Path(__file__).stat().st_mtime),
                'role': 'user',
                'is_admin': False,
                'has_subscription': False,
                'auth_method': 'google'
            }
            users.append(new_user)
            save_users(users)
        
        # Устанавливаем сессию
        session['username'] = email
        session['is_user'] = True
        session['user_name'] = name
        session['auth_method'] = 'google'
        
        # Проверяем, является ли пользователь админом
        is_admin_user = False
        for user in users:
            if user.get('username') == email and user.get('is_admin'):
                is_admin_user = True
                break
        
        # Также проверяем, является ли это админ из .env
        admin_username = os.getenv('ADMIN_USERNAME', 'admin').strip()
        if email == admin_username:
            is_admin_user = True
        
        if is_admin_user:
            session['is_admin'] = True
        
        # Редиректим обратно
        redirect_uri = session.pop('oauth_redirect_uri', '/')
        return redirect(redirect_uri)
        
    except Exception as e:
        print(f'Ошибка Google OAuth: {e}')
        return redirect('/?error=oauth_error')

if __name__ == '__main__':
    init_db()
    print("\n" + "="*50)
    print("Сервер запущен!")
    print("Откройте браузер: http://localhost:5000")
    print("Для остановки нажмите Ctrl+C")
    print("="*50 + "\n")
    app.run(debug=True, host='127.0.0.1', port=5000)


from werkzeug.utils import secure_filename
import json
import os
import re
from pathlib import Path
from dotenv import load_dotenv
from urllib.parse import urlencode, parse_qs
import requests

# Загрузка переменных окружения из .env
load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', 'your-secret-key-change-this-in-production-12345')

# Определяем файлы для разных серверов
is_vercel = os.getenv('VERCEL') or os.getenv('VERCEL_ENV')

if is_vercel:
    # Для Vercel
    DB_PATH = '/tmp/database.json'
    USERS_PATH = '/tmp/users.json'
    BOOKS_DIR = '/tmp/books'
    BACKGROUNDS_DIR = '/tmp/backgrounds'
else:
    # Для localhost
    DB_PATH = 'database.json'
    USERS_PATH = 'users.json'
    BOOKS_DIR = 'books'
    BACKGROUNDS_DIR = 'static/backgrounds'

# Создаем папки
if not os.path.exists(BOOKS_DIR):
    os.makedirs(BOOKS_DIR)
if not os.path.exists(BACKGROUNDS_DIR):
    os.makedirs(BACKGROUNDS_DIR)

# Настройки загрузки файлов
ALLOWED_BOOK_EXTENSIONS = {'txt'}
ALLOWED_IMAGE_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'}
UPLOAD_FOLDER = BOOKS_DIR
MAX_UPLOAD_SIZE = 16 * 1024 * 1024  # 16MB

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_UPLOAD_SIZE

def allowed_file(filename, extensions):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in extensions

# Инициализация базы данных
def init_db():
    if not os.path.exists(DB_PATH):
        default_data = {
            "settings": {
                "background": None,
                "backgroundType": "default"
            }
        }
        save_db(default_data)

# Инициализация файла пользователей
def init_users():
    if not os.path.exists(USERS_PATH):
        default_users = []
        save_users(default_users)

# Чтение пользователей
def read_users():
    init_users()
    try:
        with open(USERS_PATH, 'r', encoding='utf-8') as f:
            return json.load(f)
    except:
        return []

# Сохранение пользователей
def save_users(users):
    try:
        with open(USERS_PATH, 'w', encoding='utf-8') as f:
            json.dump(users, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        print(f'Ошибка сохранения пользователей: {e}')
        return False

# Чтение базы данных
def read_db():
    init_db()
    try:
        with open(DB_PATH, 'r', encoding='utf-8') as f:
            return json.load(f)
    except:
        return {"users": [], "books": [], "settings": {"background": None}}

# Сохранение базы данных
def save_db(data):
    with open(DB_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

# Получить пользователей из .env
def get_users_from_env():
    users_env = os.getenv('LIBRARY_USERS', '')
    users = []
    if users_env:
        for pair in users_env.split(','):
            pair = pair.strip()
            if ':' in pair:
                username, password = pair.split(':', 1)
                users.append({'username': username.strip(), 'password': password.strip()})
    return users

# Получить доступные фоны
def get_available_backgrounds():
    is_vercel = os.getenv('VERCEL') or os.getenv('VERCEL_ENV')
    
    if is_vercel:
        backgrounds = os.getenv('VERCEL_BACKGROUNDS', 'space1.svg,space2.svg,space3.svg')
    else:
        backgrounds = os.getenv('LOCAL_BACKGROUNDS', 'local1.svg,local2.svg,local3.svg')
    
    return [bg.strip() for bg in backgrounds.split(',') if bg.strip()]

# Проверка авторизации админа
def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('is_admin'):
            return jsonify({'error': 'Требуется авторизация администратора'}), 403
        return f(*args, **kwargs)
    return decorated_function

# Проверка является ли пользователь админом
def is_admin():
    admin_username = os.getenv('ADMIN_USERNAME', 'admin')
    return session.get('username') == admin_username

# Главная страница (для всех)
@app.route('/')
def index():
    return render_template('main.html')

# Админ панель
@app.route('/admin')
def admin_panel():
    return render_template('index.html')

# Страница управления пользователями (только для админа)
@app.route('/admin/users')
def admin_users():
    return render_template('users.html')

# Публичная страница с книгами (для всех)
@app.route('/books')
def public_books():
    return render_template('public.html')

# API: Получить все книги (публичный доступ)
@app.route('/api/books', methods=['GET'])
def get_books():
    # Загружаем книги из папки books
    books = []
    if os.path.exists(BOOKS_DIR):
        for filename in os.listdir(BOOKS_DIR):
            if filename.endswith('.json'):
                file_path = os.path.join(BOOKS_DIR, filename)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        book = json.load(f)
                        books.append(book)
                except Exception as e:
                    print(f'Ошибка чтения файла {filename}: {e}')
    
    # Поиск по запросу
    search_query = request.args.get('search', '').lower()
    if search_query:
        filtered_books = []
        for book in books:
            title = book.get('title', '').lower()
            author = book.get('author', '').lower()
            genre = book.get('genre', '').lower()
            description = book.get('description', '').lower()
            
            if (search_query in title or 
                search_query in author or 
                search_query in genre or 
                search_query in description):
                filtered_books.append(book)
        books = filtered_books
    
    return jsonify(books)

# API: Получить текст книги для чтения
@app.route('/api/books/<path:book_id>/text')
def get_book_text(book_id):
    try:
        from urllib.parse import unquote
        book_id = unquote(book_id)
        # Убираем лишние кавычки, если они есть
        book_id = book_id.strip('"').strip("'").strip()
        
        print(f"Запрос текста книги для ID: {book_id}")
        print(f"BOOKS_DIR: {BOOKS_DIR}")
        
        # Проверяем существование папки
        if not os.path.exists(BOOKS_DIR):
            print(f"Папка {BOOKS_DIR} не существует")
            return jsonify({'error': f'Папка книг не найдена: {BOOKS_DIR}'}), 404
        
        # Ищем файл метаданных
        meta_path = os.path.join(BOOKS_DIR, book_id + '.json')
        print(f"Проверка метаданных: {meta_path}, существует: {os.path.exists(meta_path)}")
        
        if os.path.exists(meta_path):
            with open(meta_path, 'r', encoding='utf-8') as f:
                book_data = json.load(f)
                book_file = book_data.get('book_file')
                print(f"Найдены метаданные, book_file: {book_file}")
                
                if book_file:
                    file_path = os.path.join(BOOKS_DIR, book_file)
                    print(f"Путь к файлу: {file_path}, существует: {os.path.exists(file_path)}")
                    if os.path.exists(file_path):
                        with open(file_path, 'r', encoding='utf-8') as f:
                            text = f.read()
                        print(f"Файл прочитан, размер текста: {len(text)} символов")
                        return jsonify({
                            'text': text,
                            'title': book_data.get('title', 'Книга'),
                            'author': book_data.get('author', 'Неизвестен')
                        })
        
        # Также проверяем файл напрямую (book_id может быть именем файла)
        book_file_path = os.path.join(BOOKS_DIR, book_id)
        print(f"Проверка прямого пути: {book_file_path}, существует: {os.path.exists(book_file_path)}")
        
        if os.path.exists(book_file_path) and not book_file_path.endswith('.json'):
            with open(book_file_path, 'r', encoding='utf-8') as f:
                text = f.read()
            print(f"Файл прочитан напрямую, размер: {len(text)} символов")
            return jsonify({
                'text': text,
                'title': book_id.replace('.txt', '').replace('.TXT', ''),
                'author': 'Неизвестен'
            })
        
        # Ищем по всем файлам в папке
        print(f"Поиск по всем файлам в {BOOKS_DIR}")
        files_in_dir = os.listdir(BOOKS_DIR) if os.path.exists(BOOKS_DIR) else []
        print(f"Файлы в папке: {files_in_dir}")
        
        for filename in files_in_dir:
            if filename.endswith('.json'):
                file_path = os.path.join(BOOKS_DIR, filename)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        book_data = json.load(f)
                    print(f"Проверка файла {filename}, ID в данных: {book_data.get('id')}")
                    if book_data.get('id') == book_id:
                        book_file = book_data.get('book_file')
                        if book_file:
                            book_file_path = os.path.join(BOOKS_DIR, book_file)
                            if os.path.exists(book_file_path):
                                with open(book_file_path, 'r', encoding='utf-8') as f:
                                    text = f.read()
                                print(f"Найдена книга по ID, размер текста: {len(text)}")
                                return jsonify({
                                    'text': text,
                                    'title': book_data.get('title', 'Книга'),
                                    'author': book_data.get('author', 'Неизвестен')
                                })
                except Exception as e:
                    print(f"Ошибка при чтении {filename}: {e}")
                    continue
        
        error_msg = f'Файл книги не найден. ID: {book_id}, Папка: {BOOKS_DIR}'
        print(error_msg)
        return jsonify({'error': error_msg}), 404
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"Исключение в get_book_text: {error_trace}")
        return jsonify({'error': f'Ошибка: {str(e)}', 'traceback': error_trace}), 500

# API: Страница чтения книги
@app.route('/read')
def read_book():
    return render_template('reader.html')

# API: Скачать файл книги
@app.route('/api/books/<path:book_id>/download')
def download_book(book_id):
    try:
        # Ищем файл метаданных (book_id уже содержит формат, например "название.txt")
        # Декодируем book_id (он может быть URL-encoded)
        from urllib.parse import unquote
        book_id = unquote(book_id)
        # Убираем лишние кавычки, если они есть
        book_id = book_id.strip('"').strip("'").strip()
        
        meta_path = os.path.join(BOOKS_DIR, book_id + '.json')
        
        if os.path.exists(meta_path):
            with open(meta_path, 'r', encoding='utf-8') as f:
                book_data = json.load(f)
                book_file = book_data.get('book_file')
                
                if book_file:
                    file_path = os.path.join(BOOKS_DIR, book_file)
                    if os.path.exists(file_path):
                        # Открываем файл в браузере, а не скачиваем
                        response = send_from_directory(BOOKS_DIR, book_file, as_attachment=False)
                        # Устанавливаем правильный Content-Type для текстовых файлов
                        if book_file.endswith('.txt'):
                            response.headers['Content-Type'] = 'text/plain; charset=utf-8'
                        return response
                    else:
                        # Если файл не найден по имени из метаданных, пробуем найти по ID
                        # (возможно, файл был сохранен с другим именем)
                        pass
        
        # Также проверяем, может быть файл сам по себе (book_id = название.txt)
        book_file_path = os.path.join(BOOKS_DIR, book_id)
        if os.path.exists(book_file_path) and not book_file_path.endswith('.json'):
            # Открываем файл в браузере, а не скачиваем
            response = send_from_directory(BOOKS_DIR, book_id, as_attachment=False)
            if book_id.endswith('.txt'):
                response.headers['Content-Type'] = 'text/plain; charset=utf-8'
            return response
        
        # Пробуем найти все файлы в папке books и найти подходящий
        if os.path.exists(BOOKS_DIR):
            # Ищем метаданные по всем файлам
            for filename in os.listdir(BOOKS_DIR):
                if filename.endswith('.json'):
                    file_path = os.path.join(BOOKS_DIR, filename)
                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            book_data = json.load(f)
                            if book_data.get('id') == book_id:
                                book_file = book_data.get('book_file')
                                if book_file:
                                    book_file_path = os.path.join(BOOKS_DIR, book_file)
                                    if os.path.exists(book_file_path):
                                        # Открываем файл в браузере, а не скачиваем
                                        response = send_from_directory(BOOKS_DIR, book_file, as_attachment=False)
                                        if book_file.endswith('.txt'):
                                            response.headers['Content-Type'] = 'text/plain; charset=utf-8'
                                        return response
                    except Exception:
                        continue
        
        return jsonify({'error': 'Файл книги не найден'}), 404
    except Exception as e:
        import traceback
        return jsonify({'error': f'Ошибка: {str(e)}', 'traceback': traceback.format_exc()}), 500

# Функция для создания безопасного имени файла из названия
def create_book_filename(title, file_format='txt'):
    # Убираем спецсимволы, оставляем только буквы, цифры, пробелы и дефисы
    filename = re.sub(r'[^\w\s-]', '', title)
    # Заменяем пробелы на подчеркивания
    filename = re.sub(r'\s+', '_', filename)
    # Убираем множественные подчеркивания
    filename = re.sub(r'_+', '_', filename)
    # Убираем подчеркивания в начале и конце
    filename = filename.strip('_')
    # Если пустое, используем "book"
    if not filename:
        filename = "book"
    # Добавляем формат
    return f"{filename}.{file_format}"

# API: Вход админа
@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    data = request.json
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    
    # Получаем данные из .env или используем значения по умолчанию
    admin_username = os.getenv('ADMIN_USERNAME', 'admin').strip()
    admin_password = os.getenv('ADMIN_PASSWORD', 'admin123').strip()
    
    # Простая проверка - используем значения по умолчанию если не заданы в .env
    if not admin_username or admin_username == '':
        admin_username = 'admin'
    if not admin_password or admin_password == '':
        admin_password = 'admin123'
    
    if username == admin_username and password == admin_password:
        session['username'] = username
        session['is_admin'] = True
        session.permanent = True
        return jsonify({'message': 'Вход выполнен успешно', 'is_admin': True})
    else:
        return jsonify({'error': f'Неверный логин или пароль. Попробуйте: {admin_username} / {admin_password}'}), 401

# API: Выход
@app.route('/api/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'message': 'Выход выполнен'})

# API: Проверка авторизации
@app.route('/api/check-auth', methods=['GET'])
def check_auth():
    return jsonify({
        'is_admin': session.get('is_admin', False),
        'username': session.get('username')
    })

# API: Добавить книгу (только для админа)
@app.route('/api/books', methods=['POST'])
def add_book():
    # Проверяем авторизацию
    if not session.get('is_admin'):
        return jsonify({'error': 'Требуется авторизация администратора'}), 403
    
    # Проверяем тип запроса - FormData или JSON
    if request.is_json:
        # Обработка JSON запроса (для совместимости)
        data = request.json
        title = data.get('title', '').strip()
        author = data.get('author', '').strip()
        genre = data.get('genre', '').strip()
        description = data.get('description', '')
        cover = data.get('cover', 'https://via.placeholder.com/150')
        book_file = None
    else:
        # Обработка FormData
        title = request.form.get('title', '').strip()
        author = request.form.get('author', '').strip()
        genre = request.form.get('genre', '').strip()
        description = request.form.get('description', '')
        cover = request.form.get('cover', 'https://via.placeholder.com/150')
        
        # Проверяем наличие файла
        if 'book_file' in request.files:
            book_file = request.files['book_file']
            if book_file and book_file.filename:
                book_file = book_file
            else:
                book_file = None
        else:
            book_file = None
    
    # Валидация обязательных полей
    if not title or not author or not genre:
        return jsonify({'error': 'title, author и genre обязательны'}), 400
    
    # Определяем формат файла
    if book_file and book_file.filename and allowed_file(book_file.filename, ALLOWED_BOOK_EXTENSIONS):
        file_format = book_file.filename.rsplit('.', 1)[1].lower()
    else:
        file_format = 'txt'  # По умолчанию
    
    # ID = название книги + формат
    book_filename = create_book_filename(title, file_format)
    book_id = book_filename  # ID включает формат: название.txt
    
    # Проверяем, не существует ли уже книга с таким ID
    book_file_path = os.path.join(BOOKS_DIR, book_filename)
    book_meta_path = os.path.join(BOOKS_DIR, book_id + '.json')
    
    if os.path.exists(book_file_path) or os.path.exists(book_meta_path):
        return jsonify({'error': f'Книга с названием "{title}" уже существует'}), 400
    
    # Сохраняем файл книги, если он есть
    saved_filename = None
    if book_file and book_file.filename:
        try:
            # Используем book_filename напрямую, чтобы соответствовать ID
            # secure_filename может изменить имя, что приведет к несоответствию
            filename = book_filename  # Используем то же имя, что и для ID
            file_path = os.path.join(BOOKS_DIR, filename)
            book_file.save(file_path)
            saved_filename = filename
        except Exception as e:
            return jsonify({'error': f'Ошибка сохранения файла: {e}'}), 500
    
    # Создаем метаданные о книге
    new_book = {
        'id': book_id,
        'title': title,
        'author': author,
        'genre': genre,
        'description': description,
        'cover': cover if cover else 'https://via.placeholder.com/150',
        'added_by': session.get('username', 'admin'),
        'added_at': str(Path(__file__).stat().st_mtime),
        'book_file': saved_filename,
        'file_format': file_format
    }
    
    # Сохраняем метаданные
    try:
        with open(book_meta_path, 'w', encoding='utf-8') as f:
            json.dump(new_book, f, ensure_ascii=False, indent=2)
    except Exception as e:
        # Если ошибка сохранения метаданных, удаляем файл
        if saved_filename and os.path.exists(os.path.join(BOOKS_DIR, saved_filename)):
            os.remove(os.path.join(BOOKS_DIR, saved_filename))
        return jsonify({'error': f'Ошибка сохранения: {e}'}), 500
    
    return jsonify({'message': 'Книга добавлена', 'id': book_id, 'book': new_book})

# API: Удалить книгу (только для админа)
@app.route('/api/books', methods=['DELETE'])
def delete_book():
    if not session.get('is_admin'):
        return jsonify({'error': 'Требуется авторизация администратора'}), 403
    
    book_id = request.args.get('id')
    if not book_id:
        return jsonify({'error': 'ID обязателен'}), 400
    
    # Ищем файлы книги по ID (метаданные и сам файл)
    deleted = False
    book_file_to_delete = None
    
    if os.path.exists(BOOKS_DIR):
        # Ищем файл метаданных
        meta_file = book_id + '.json'
        meta_path = os.path.join(BOOKS_DIR, meta_file)
        
        if os.path.exists(meta_path):
            try:
                # Читаем метаданные, чтобы узнать имя файла книги
                with open(meta_path, 'r', encoding='utf-8') as f:
                    book_data = json.load(f)
                    book_file_to_delete = book_data.get('book_file')
                
                # Удаляем метаданные
                os.remove(meta_path)
                deleted = True
                
                # Удаляем файл книги, если он есть
                if book_file_to_delete:
                    book_file_path = os.path.join(BOOKS_DIR, book_file_to_delete)
                    if os.path.exists(book_file_path):
                        os.remove(book_file_path)
            except Exception as e:
                return jsonify({'error': f'Ошибка удаления файла: {e}'}), 500
    
    if deleted:
        return jsonify({'message': 'Книга удалена'})
    
    return jsonify({'error': 'Книга не найдена'}), 404

# API: Регистрация
@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    
    if not username or not password:
        return jsonify({'error': 'Заполните все поля'}), 400
    
    # Проверяем в .env
    env_users = get_users_from_env()
    if any(u.get('username') == username for u in env_users):
        return jsonify({'error': 'Пользователь с таким именем уже существует в системе (.env)'}), 400
    
    # Проверяем в файле пользователей
    users = read_users()
    if any(u.get('username') == username for u in users):
        return jsonify({'error': 'Пользователь уже существует'}), 400
    
    # Добавляем нового пользователя
    new_user = {
        'username': username,
        'password': password,
        'created_at': str(Path(__file__).stat().st_mtime),
        'role': 'user',
        'is_admin': False,
        'has_subscription': False
    }
    users.append(new_user)
    
    if save_users(users):
        return jsonify({'message': f'Пользователь {username} зарегистрирован!'})
    else:
        return jsonify({'error': 'Ошибка сохранения пользователя'}), 500

# API: Логин (для обычных пользователей)
@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    
    if not username or not password:
        return jsonify({'error': 'Заполните все поля'}), 400
    
    # Проверяем в .env
    env_users = get_users_from_env()
    for user in env_users:
        if user.get('username') == username and user.get('password') == password:
            session['username'] = username
            session['is_user'] = True
            return jsonify({'message': 'Вход выполнен успешно', 'username': username, 'source': 'env'})
    
    # Проверяем в файле пользователей
    users = read_users()
    for user in users:
        if user.get('username') == username and user.get('password') == password:
            session['username'] = username
            session['is_user'] = True
            return jsonify({'message': 'Вход выполнен успешно', 'username': username, 'source': 'file'})
    
    # Проверяем существование пользователя
    if any(u.get('username') == username for u in env_users):
        return jsonify({'error': 'Неверный пароль'}), 401
    
    return jsonify({'error': 'Пользователь не найден'}), 401

# API: Настройки
@app.route('/api/settings', methods=['GET'])
def get_settings():
    db = read_db()
    settings = db.get('settings', {'background': None, 'backgroundType': 'default'})
    backgrounds = get_available_backgrounds()
    
    # Добавляем стандартные фоны
    backgrounds_list = [{
        'name': bg,
        'url': f'/static/backgrounds/{bg}'
    } for bg in backgrounds]
    
    # Добавляем пользовательские фоны из папки
    if os.path.exists(BACKGROUNDS_DIR):
        for filename in os.listdir(BACKGROUNDS_DIR):
            if allowed_file(filename, ALLOWED_IMAGE_EXTENSIONS):
                # Проверяем, нет ли уже такого фона
                if not any(bg['name'] == filename for bg in backgrounds_list):
                    backgrounds_list.append({
                        'name': filename,
                        'url': f'/backgrounds/{filename}'
                    })
    
    return jsonify({
        'settings': settings,
        'availableBackgrounds': backgrounds_list
    })

# API: Сохранить настройки
@app.route('/api/settings', methods=['POST'])
def save_settings():
    db = read_db()
    
    # Проверяем, есть ли загрузка файла фона
    if 'background_file' in request.files:
        file = request.files['background_file']
        if file and file.filename and allowed_file(file.filename, ALLOWED_IMAGE_EXTENSIONS):
            filename = secure_filename(file.filename)
            file_path = os.path.join(BACKGROUNDS_DIR, filename)
            file.save(file_path)
            
            background_url = f'/backgrounds/{filename}'
            
            if 'settings' not in db:
                db['settings'] = {}
            
            db['settings'].update({
                'background': background_url,
                'backgroundType': 'custom'
            })
            
            save_db(db)
            return jsonify({'message': 'Фон загружен и сохранен', 'settings': db['settings']})
        else:
            return jsonify({'error': 'Неподдерживаемый формат. Разрешены: png, jpg, jpeg, gif, svg, webp'}), 400
    else:
        # Обычное сохранение через JSON
        data = request.json if request.is_json else request.form.to_dict()
        
        if 'settings' not in db:
            db['settings'] = {}
        
        db['settings'].update({
            'background': data.get('background'),
            'backgroundType': data.get('backgroundType', 'default')
        })
        
        save_db(db)
        
        return jsonify({'message': 'Настройки сохранены', 'settings': db['settings']})

# Статические файлы фонов
@app.route('/backgrounds/<filename>')
def serve_background(filename):
    return send_from_directory(BACKGROUNDS_DIR, filename)

# API: Получить всех пользователей (только для админа)
@app.route('/api/users', methods=['GET'])
@admin_required
def get_all_users():
    users = read_users()
    env_users = get_users_from_env()
    
    # Объединяем пользователей из файла и .env
    all_users = []
    
    # Добавляем пользователей из .env
    for env_user in env_users:
        all_users.append({
            'username': env_user.get('username'),
            'source': 'env',
            'is_admin': False,
            'has_subscription': False,
            'created_at': None
        })
    
    # Добавляем пользователей из файла
    for user in users:
        all_users.append({
            'username': user.get('username'),
            'source': 'file',
            'is_admin': user.get('is_admin', False),
            'has_subscription': user.get('has_subscription', False),
            'created_at': user.get('created_at')
        })
    
    return jsonify(all_users)

# API: Обновить права пользователя (только для админа)
@app.route('/api/users/<path:username>', methods=['PUT'])
@admin_required
def update_user(username):
    from urllib.parse import unquote
    username = unquote(username)
    
    data = request.json
    is_admin = data.get('is_admin')
    has_subscription = data.get('has_subscription')
    
    users = read_users()
    user_found = False
    
    for user in users:
        if user.get('username') == username:
            # Обновляем только переданные поля
            if is_admin is not None:
                user['is_admin'] = is_admin
            if has_subscription is not None:
                user['has_subscription'] = has_subscription
            user_found = True
            break
    
    if not user_found:
        return jsonify({'error': 'Пользователь не найден'}), 404
    
    if save_users(users):
        return jsonify({'message': 'Права пользователя обновлены', 'user': {
            'username': username,
            'is_admin': user.get('is_admin', False),
            'has_subscription': user.get('has_subscription', False)
        }})
    else:
        return jsonify({'error': 'Ошибка сохранения'}), 500

# Google OAuth: Начало авторизации
@app.route('/api/auth/google', methods=['GET'])
def google_auth():
    # Получаем URL для редиректа
    redirect_uri = request.args.get('redirect_uri', request.url_root.rstrip('/') + '/api/auth/google/callback')
    
    # Получаем credentials из .env
    client_id = os.getenv('GOOGLE_CLIENT_ID')
    client_secret = os.getenv('GOOGLE_CLIENT_SECRET')
    
    if not client_id:
        return jsonify({'error': 'Google OAuth не настроен. Добавьте GOOGLE_CLIENT_ID в .env'}), 400
    
    # Сохраняем redirect_uri в сессии
    session['oauth_redirect_uri'] = redirect_uri
    
    # Формируем URL для авторизации Google
    auth_url = (
        'https://accounts.google.com/o/oauth2/v2/auth?'
        + urlencode({
            'client_id': client_id,
            'redirect_uri': request.url_root.rstrip('/') + '/api/auth/google/callback',
            'response_type': 'code',
            'scope': 'openid email profile',
            'access_type': 'online',
            'prompt': 'select_account'
        })
    )
    
    return redirect(auth_url)

# Google OAuth: Callback
@app.route('/api/auth/google/callback', methods=['GET'])
def google_auth_callback():
    code = request.args.get('code')
    error = request.args.get('error')
    
    if error:
        return redirect('/?error=' + error)
    
    if not code:
        return redirect('/?error=no_code')
    
    client_id = os.getenv('GOOGLE_CLIENT_ID')
    client_secret = os.getenv('GOOGLE_CLIENT_SECRET')
    
    if not client_id or not client_secret:
        return redirect('/?error=oauth_not_configured')
    
    # Обмениваем код на токен
    token_url = 'https://oauth2.googleapis.com/token'
    redirect_uri = request.url_root.rstrip('/') + '/api/auth/google/callback'
    
    token_data = {
        'code': code,
        'client_id': client_id,
        'client_secret': client_secret,
        'redirect_uri': redirect_uri,
        'grant_type': 'authorization_code'
    }
    
    try:
        token_response = requests.post(token_url, data=token_data)
        token_response.raise_for_status()
        tokens = token_response.json()
        access_token = tokens.get('access_token')
        
        if not access_token:
            return redirect('/?error=no_token')
        
        # Получаем информацию о пользователе
        user_info_url = 'https://www.googleapis.com/oauth2/v2/userinfo'
        headers = {'Authorization': f'Bearer {access_token}'}
        user_response = requests.get(user_info_url, headers=headers)
        user_response.raise_for_status()
        user_info = user_response.json()
        
        email = user_info.get('email')
        name = user_info.get('name', email)
        
        if not email:
            return redirect('/?error=no_email')
        
        # Проверяем или создаем пользователя
        users = read_users()
        user_found = False
        
        for user in users:
            if user.get('email') == email or user.get('username') == email:
                user_found = True
                # Обновляем информацию
                user['username'] = email
                user['email'] = email
                user['name'] = name
                user['auth_method'] = 'google'
                break
        
        if not user_found:
            # Создаем нового пользователя
            new_user = {
                'username': email,
                'email': email,
                'name': name,
                'password': None,  # Пароль не нужен для Google OAuth
                'created_at': str(Path(__file__).stat().st_mtime),
                'role': 'user',
                'is_admin': False,
                'has_subscription': False,
                'auth_method': 'google'
            }
            users.append(new_user)
            save_users(users)
        
        # Устанавливаем сессию
        session['username'] = email
        session['is_user'] = True
        session['user_name'] = name
        session['auth_method'] = 'google'
        
        # Проверяем, является ли пользователь админом
        is_admin_user = False
        for user in users:
            if user.get('username') == email and user.get('is_admin'):
                is_admin_user = True
                break
        
        # Также проверяем, является ли это админ из .env
        admin_username = os.getenv('ADMIN_USERNAME', 'admin').strip()
        if email == admin_username:
            is_admin_user = True
        
        if is_admin_user:
            session['is_admin'] = True
        
        # Редиректим обратно
        redirect_uri = session.pop('oauth_redirect_uri', '/')
        return redirect(redirect_uri)
        
    except Exception as e:
        print(f'Ошибка Google OAuth: {e}')
        return redirect('/?error=oauth_error')

if __name__ == '__main__':
    init_db()
    print("\n" + "="*50)
    print("Сервер запущен!")
    print("Откройте браузер: http://localhost:5000")
    print("Для остановки нажмите Ctrl+C")
    print("="*50 + "\n")
    app.run(debug=True, host='127.0.0.1', port=5000)

