#!/usr/bin/env python
# -*- coding: utf-8 -*-
import sys
import os

print("Проверка зависимостей...")
try:
    import flask
    print("✓ Flask установлен")
except ImportError:
    print("✗ Flask не установлен!")
    print("Установите: pip install Flask python-dotenv")
    sys.exit(1)

try:
    from dotenv import load_dotenv
    print("✓ python-dotenv установлен")
except ImportError:
    print("✗ python-dotenv не установлен!")
    print("Установите: pip install python-dotenv")
    sys.exit(1)

print("\nЗапуск сервера...")
print("Откройте браузер: http://localhost:5000")
print("Для остановки нажмите Ctrl+C\n")

os.system("python app.py")


# -*- coding: utf-8 -*-
import sys
import os

print("Проверка зависимостей...")
try:
    import flask
    print("✓ Flask установлен")
except ImportError:
    print("✗ Flask не установлен!")
    print("Установите: pip install Flask python-dotenv")
    sys.exit(1)

try:
    from dotenv import load_dotenv
    print("✓ python-dotenv установлен")
except ImportError:
    print("✗ python-dotenv не установлен!")
    print("Установите: pip install python-dotenv")
    sys.exit(1)

print("\nЗапуск сервера...")
print("Откройте браузер: http://localhost:5000")
print("Для остановки нажмите Ctrl+C\n")

os.system("python app.py")






