# Простой скрипт запуска Flask сервера
import os
import sys

print("=" * 50)
print("ЗАПУСК КОСМИЧЕСКОЙ БИБЛИОТЕКИ")
print("=" * 50)
print()

# Проверка установки Flask
try:
    import flask
    print("Flask установлен")
except ImportError:
    print("ОШИБКА: Flask не установлен!")
    print("Выполните команду: pip install -r requirements.txt")
    input("Нажмите Enter для выхода...")
    sys.exit(1)

print("Запуск сервера...")
print("Откройте браузер: http://localhost:5000")
print("Для остановки нажмите Ctrl+C")
print("=" * 50)
print()

# Запуск приложения
os.system("python app.py")


import os
import sys

print("=" * 50)
print("ЗАПУСК КОСМИЧЕСКОЙ БИБЛИОТЕКИ")
print("=" * 50)
print()

# Проверка установки Flask
try:
    import flask
    print("Flask установлен")
except ImportError:
    print("ОШИБКА: Flask не установлен!")
    print("Выполните команду: pip install -r requirements.txt")
    input("Нажмите Enter для выхода...")
    sys.exit(1)

print("Запуск сервера...")
print("Откройте браузер: http://localhost:5000")
print("Для остановки нажмите Ctrl+C")
print("=" * 50)
print()

# Запуск приложения
os.system("python app.py")
















