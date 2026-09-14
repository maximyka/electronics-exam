#!/bin/bash
# Запуск приложения для подготовки к экзамену по «Электронике и схемотехнике»

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
APP_DIR="$DIR/app"
PORT=8085

echo "======================================================="
echo "  Электроника и Схемотехника — Подготовка к экзамену   "
echo "======================================================="

# Проверяем, запущен ли уже сервер
if ! lsof -i:$PORT >/dev/null 2>&1; then
    echo "Запуск локального PWA сервера на порту $PORT..."
    python3 -m http.server $PORT --directory "$APP_DIR" >/dev/null 2>&1 &
    sleep 1
else
    echo "Сервер уже активен на порту $PORT."
fi

# Открываем в браузере по умолчанию
open "http://localhost:$PORT/"

# Определяем локальный IP Mac
LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "127.0.0.1")

echo ""
echo "💻 На Mac: http://localhost:$PORT/"
echo "📱 На iPhone (в той же Wi-Fi сети): http://$LOCAL_IP:$PORT/"
echo ""
echo "Инструкция для установки:"
echo "• На Mac: Safari -> Файл -> Добавить в Dock (работает как нативное приложение)"
echo "• На iPhone: Safari -> Поделиться (квадрат со стрелочкой) -> «На экран «Домой»"
echo "======================================================="
