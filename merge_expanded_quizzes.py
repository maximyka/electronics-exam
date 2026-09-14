import json

with open('app/exam_data.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Извлекаем JSON из "window.EXAM_DATA = { ... };"
prefix = "window.EXAM_DATA = "
suffix = ";"
if content.startswith(prefix):
    json_str = content[len(prefix):].rstrip().rstrip(';')
else:
    raise ValueError("Unexpected format in exam_data.js")

data = json.loads(json_str)

with open('expanded_quizzes.json', 'r', encoding='utf-8') as f:
    new_quizzes = json.load(f)

data['quizzes'] = new_quizzes

total_q = sum(len(q['questions']) for q in data['quizzes'])
print(f"Обновлено quizzes! Всего вопросов: {total_q}")

# Сохраняем обновленный exam_data.js
with open('app/exam_data.js', 'w', encoding='utf-8') as f:
    f.write("window.EXAM_DATA = " + json.dumps(data, ensure_ascii=False, indent=2) + ";\n")

print("Успешно записано в app/exam_data.js")
