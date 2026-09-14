#!/bin/bash
# Скрипт для публикации обновлений в облако (Render / GitHub / Vercel)
# Автоматически повышает версию и выкатывает апдейт всем пользователям

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "======================================================="
echo "   🚀 ПУБЛИКАЦИЯ ОБНОВЛЕНИЯ В ОБЛАКО (PWA AUTO-UPDATE) "
echo "======================================================="

# Проверяем наличие remote репозитория
REMOTE_URL=$(git remote get-url origin 2>/dev/null)
if [ -z "$REMOTE_URL" ]; then
    echo ""
    echo "⚠️  Внимание: еще не привязан удаленный репозиторий GitHub!"
    echo "Чтобы изменения улетали в облако (на Render / Vercel / GitHub Pages):"
    echo "1. Создайте репозиторий на github.com (например: electronics-exam)"
    echo "2. Выполните в терминале:"
    echo "   git remote add origin https://github.com/ВАШ_ЛОГИН/electronics-exam.git"
    echo "   git push -u origin main"
    echo ""
    echo "Нажмите Enter для локального повышения версии или Ctrl+C для отмены..."
    read -r
fi

echo ""
echo "Введите описание обновления (или нажмите Enter для значения по умолчанию):"
read -r NOTE
if [ -z "$NOTE" ]; then
    NOTE="Обновление материалов и формул"
fi

echo ""
echo "📦 Повышение версии в файлах приложения..."
python3 publish_update.py "$NOTE"

git add app/ .gitignore publish_update.py Запустить_Приложение.command Опубликовать_Обновления.command
git commit -m "Release: $NOTE"

if [ -n "$REMOTE_URL" ]; then
    echo ""
    echo "🚀 Отправка в облако (git push)..."
    git push origin main
    echo ""
    echo "======================================================="
    echo "🎉 УСПЕШНО! Обновление отправлено."
    echo "Через 15-30 секунд Render / Vercel применит изменения,"
    echo "и у всех пользователей на экранах появится кнопка «Обновить»!"
    echo "======================================================="
else
    echo ""
    echo "Локальный коммит готов. Привяжите репозиторий, чтобы отправить в сеть."
fi

echo ""
echo "Нажмите любую клавишу для закрытия..."
read -n 1 -s
