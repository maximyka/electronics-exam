# -*- coding: utf-8 -*-
"""
Внедрение 214 флеш-карточек в app/exam_data.js
"""
import json
from build_full_flashcards import FLASHCARDS

EXAM_DATA_PATH = 'app/exam_data.js'

with open(EXAM_DATA_PATH, 'r', encoding='utf-8') as f:
    content = f.read()

# Находим начало и конец поля "flashcards"
fc_start_key = '"flashcards": ['
fc_start_pos = content.find(fc_start_key)
if fc_start_pos == -1:
    raise ValueError("Не найден ключ '\"flashcards\": [' в exam_data.js")

quiz_start_key = '"quizzes": ['
quiz_start_pos = content.find(quiz_start_key)
if quiz_start_pos == -1:
    raise ValueError("Не найден ключ '\"quizzes\": [' в exam_data.js")

# Между fc_start_pos и quiz_start_pos должен быть конец массива flashcards: ],
# Найдем закрывающую скобку перед '"quizzes": ['
fc_end_pos = content.rfind('],', fc_start_pos, quiz_start_pos)
if fc_end_pos == -1:
    raise ValueError("Не найдена закрывающая скобка '],' перед 'quizzes'")

# Генерируем красивый JSON для флеш-карточек
fc_json = json.dumps(FLASHCARDS, ensure_ascii=False, indent=4)
# Сдвигаем на 2 пробела для красивого форматирования внутри объекта
fc_indented_lines = []
for line in fc_json.splitlines():
    fc_indented_lines.append("  " + line)
fc_formatted = "\n".join(fc_indented_lines).strip()

# Заменяем блок
new_fc_block = '"flashcards": ' + fc_formatted + ','
new_content = content[:fc_start_pos] + new_fc_block + '\n  ' + content[quiz_start_pos:]

with open(EXAM_DATA_PATH, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Успешно заменено! Размер обновленного exam_data.js:", len(new_content))
