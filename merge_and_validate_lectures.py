# -*- coding: utf-8 -*-
import json
from lectures_part1 import get_lectures_1_and_2
from lectures_part2 import get_lectures_3_and_4
from lectures_part3 import get_lectures_5_and_6
from lectures_part4 import get_lectures_7_and_8
from lectures_part5 import get_lectures_9_and_10
from lectures_part6 import get_lectures_11_and_12
from lectures_part7 import get_lectures_13_and_14

all_lectures = []
all_lectures.extend(get_lectures_1_and_2())
all_lectures.extend(get_lectures_3_and_4())
all_lectures.extend(get_lectures_5_and_6())
all_lectures.extend(get_lectures_7_and_8())
all_lectures.extend(get_lectures_9_and_10())
all_lectures.extend(get_lectures_11_and_12())
all_lectures.extend(get_lectures_13_and_14())

print(f"Total lectures collected: {len(all_lectures)}")
assert len(all_lectures) == 14, f"Expected 14 lectures, got {len(all_lectures)}"

with open("app/lectures.json", "w", encoding="utf-8") as f:
    json.dump(all_lectures, f, ensure_ascii=False, indent=2)

print("Saved app/lectures.json successfully.")
