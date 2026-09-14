#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Скрипт внедрения логики лабораторных работ в app/app.js
"""

with open("app/app.js", "r", encoding="utf-8") as f:
    code = f.read()

# 1. Добавляем labDefenseStatus в инициализацию state
old_state = "mistakes: []        // [questionId, ...]\n  };"
new_state = "mistakes: [],       // [questionId, ...]\n    labDefenseStatus: {} // { [qId]: 'known' | 'repeat' }\n  };"

if old_state in code:
    code = code.replace(old_state, new_state)
    print("Added labDefenseStatus to state.")
else:
    print("Warning: old_state not found.")

# 2. Добавляем функции работы с лабораторными перед renderCourseView
target_anchor = "  /* ==========================================================================\n     АКАДЕМИЧЕСКИЙ КУРС ЛЕКЦИЙ (14 ЛЕКЦИЙ)"

labs_logic = """  /* ==========================================================================
     ЛАБОРАТОРНЫЙ ПРАКТИКУМ (ВЫДЕЛЕННЫЙ РАЗДЕЛ LABS)
     ========================================================================== */
  let activeLabId = 'lab1';
  let activeLabSubtab = 'theory';

  function renderLabsView() {
    const labs = window.LABS_DATA || [];
    if (labs.length === 0) return;

    if (!state.labDefenseStatus) state.labDefenseStatus = {};

    // 1. Статистика
    const totalLabsEl = document.getElementById('labs-total-count');
    const totalQuestionsEl = document.getElementById('labs-questions-count');
    const learnedCountEl = document.getElementById('labs-learned-count');

    let totalQuestions = 0;
    labs.forEach(l => {
      totalQuestions += (l.questions || []).length;
    });

    let learnedCount = 0;
    Object.values(state.labDefenseStatus).forEach(st => {
      if (st === 'known') learnedCount++;
    });

    if (totalLabsEl) totalLabsEl.textContent = labs.length;
    if (totalQuestionsEl) totalQuestionsEl.textContent = totalQuestions;
    if (learnedCountEl) learnedCountEl.textContent = learnedCount;

    // 2. Панель выбора лабораторной работы (Карточки-селекторы)
    const pickerBar = document.getElementById('labs-picker-bar');
    if (pickerBar) {
      pickerBar.innerHTML = labs.map(lab => {
        const isActive = lab.id === activeLabId;
        const qCount = (lab.questions || []).length;
        const knownInLab = (lab.questions || []).filter(q => state.labDefenseStatus[q.id] === 'known').length;

        return `
          <button class="lab-chip-btn ${isActive ? 'active' : ''}" data-lab-id="${lab.id}" onclick="window.EXAM_APP.selectLab('${lab.id}')">
            <div class="lab-chip-top">
              <span class="lab-chip-num">Лаб. №${lab.number}</span>
              <span class="lab-chip-icon">${lab.icon}</span>
            </div>
            <div class="lab-chip-title">${lab.shortTitle}</div>
            <div class="lab-chip-badge">${knownInLab}/${qCount} сдано</div>
          </button>
        `;
      }).join('');
    }

    // 3. Рендеринг активной работы
    renderActiveLab();
  }

  function renderActiveLab() {
    const container = document.getElementById('active-lab-container');
    if (!container) return;

    const labs = window.LABS_DATA || [];
    const lab = labs.find(l => l.id === activeLabId) || labs[0];
    if (!lab) return;

    const questions = lab.questions || [];
    const circuits = lab.circuits || [];
    const tables = (lab.labData && lab.labData.tables) || [];

    // Фото стенда для цифровых лаб (Лаб 3, 6, 10)
    const isDigitalBench = ['lab3', 'lab6', 'lab10'].includes(lab.id);

    container.innerHTML = `
      <div class="lab-card-detail">
        <div class="lab-detail-header">
          <div class="lab-header-top">
            <span class="lab-num-badge">Лабораторная работа №${lab.number}</span>
            <span class="lab-category-badge">${lab.category}</span>
            <span class="lab-bench-badge">🔌 Стенд: ${lab.benchField}</span>
          </div>
          <h2 class="lab-main-title">${lab.title}</h2>
          <div class="lab-goal-callout">
            <strong>🎯 Цель работы:</strong> ${lab.goal}
          </div>
        </div>

        <!-- Подвкладки лабораторной -->
        <div class="lab-subtabs-nav">
          <button class="lab-subtab-btn ${activeLabSubtab === 'theory' ? 'active' : ''}" onclick="window.EXAM_APP.switchLabSubtab('theory')">
            <span>📖 Теория и формулы</span>
          </button>
          <button class="lab-subtab-btn ${activeLabSubtab === 'circuits' ? 'active' : ''}" onclick="window.EXAM_APP.switchLabSubtab('circuits')">
            <span>🔌 Схемы и стенд</span>
            <span class="subtab-count">${circuits.length}</span>
          </button>
          <button class="lab-subtab-btn ${activeLabSubtab === 'data' ? 'active' : ''}" onclick="window.EXAM_APP.switchLabSubtab('data')">
            <span>📊 Данные и таблицы</span>
            <span class="subtab-badge">Замеры</span>
          </button>
          <button class="lab-subtab-btn ${activeLabSubtab === 'defense' ? 'active' : ''}" onclick="window.EXAM_APP.switchLabSubtab('defense')">
            <span>🛡️ Вопросы к защите</span>
            <span class="subtab-count">${questions.length}</span>
          </button>
        </div>

        <!-- Контейнер вкладки 1: Теория -->
        <div class="lab-pane" id="lab-pane-theory" style="${activeLabSubtab === 'theory' ? 'display:flex;' : 'display:none;'}">
          <div class="lab-theory-card intro-card">
            <p><strong>Суть работы:</strong> ${lab.theory?.intro || ''}</p>
          </div>

          ${(lab.theory?.sections || []).map(sec => `
            <div class="lab-theory-card">
              <h3>⚡ ${sec.heading}</h3>
              <p>${sec.text.replace(/\\n/g, '<br>')}</p>
            </div>
          `).join('')}

          ${(lab.theory?.keyFormulas || []).length > 0 ? `
            <div class="lab-key-formulas-box">
              <h3>📐 Ключевые расчетные формулы работы</h3>
              <div class="lab-formulas-grid">
                ${lab.theory.keyFormulas.map(f => `
                  <div class="lab-formula-chip">
                    <div class="f-name">${f.name}</div>
                    <div class="f-val">$$${f.formula}$$</div>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>

        <!-- Контейнер вкладки 2: Схемы и стенд -->
        <div class="lab-pane" id="lab-pane-circuits" style="${activeLabSubtab === 'circuits' ? 'display:flex;' : 'display:none;'}">
          ${isDigitalBench ? `
            <div class="lab-bench-photo-card">
              <h4>📸 Фотография стенда «Учтех-Профи» (Основы цифровой техники)</h4>
              <img src="images/bench_digital.jpg" alt="Стенд Основы цифровой техники">
              <div class="bench-photo-caption">Реальный стенд кафедры «Основы цифровой техники» со смонтированными проводными перемычками</div>
            </div>
          ` : ''}

          ${circuits.map(c => `
            <div class="lab-circuit-card">
              <div class="lab-circuit-header">
                <h4>🔌 ${c.title}</h4>
                <p class="circuit-hint-text">${c.imageHint}</p>
              </div>
              <div class="lab-wiring-box">
                <strong>Схема соединений стенда:</strong><br>
                ${c.wiring}
              </div>
              ${c.note ? `
                <div class="lab-note-box">
                  <strong>💡 Особенность схемы:</strong> ${c.note}
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>

        <!-- Контейнер вкладки 3: Экспериментальные данные -->
        <div class="lab-pane" id="lab-pane-data" style="${activeLabSubtab === 'data' ? 'display:flex;' : 'display:none;'}">
          <div class="defense-intro-banner">
            <strong>📋 Реальные экспериментальные замеры:</strong> ${lab.labData?.description || ''}
          </div>

          ${tables.map(t => `
            <div class="lab-data-card">
              <h4>Таблица: ${t.name}</h4>
              <div class="lab-table-wrapper">
                <table class="lab-data-table">
                  <thead>
                    <tr>
                      ${t.columns.map(col => `<th>${col}</th>`).join('')}
                    </tr>
                  </thead>
                  <tbody>
                    ${t.rows.map(row => `
                      <tr>
                        ${row.map(cell => `<td>${cell}</td>`).join('')}
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
              ${t.comment ? `
                <div class="lab-comment-box">
                  <strong>Вывод и анализ данных:</strong> ${t.comment}
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>

        <!-- Контейнер вкладки 4: Вопросы к защите -->
        <div class="lab-pane" id="lab-pane-defense" style="${activeLabSubtab === 'defense' ? 'display:flex;' : 'display:none;'}">
          <div class="defense-intro-banner">
            <strong>🛡️ Тренажер защиты лабораторной:</strong> Нажмите на вопрос, чтобы открыть подсказку и развернутый образцовый ответ «на 5». Отмечайте статус подготовки («Знаю на 5» или «Повторить»), чтобы отслеживать готовность!
          </div>

          <div class="defense-questions-list">
            ${questions.map((q, idx) => {
              const status = state.labDefenseStatus[q.id] || 'none';
              return `
                <div class="defense-question-card ${status}" id="defense-card-${q.id}">
                  <div class="defense-q-header" onclick="window.EXAM_APP.toggleDefenseQuestion('${q.id}')">
                    <div class="defense-q-title-wrap">
                      <span class="defense-q-num">№${idx + 1}</span>
                      <h4 class="defense-q-title">${q.q}</h4>
                    </div>
                    <div class="defense-q-badges">
                      <span class="defense-toggle-icon">▼</span>
                    </div>
                  </div>

                  <div class="defense-q-body" id="defense-body-${q.id}">
                    ${q.hint ? `
                      <div class="defense-hint-box">
                        <strong>💡 Подсказка преподавателя:</strong> ${q.hint}
                      </div>
                    ` : ''}

                    <div class="defense-answer-box">
                      <strong>Ответ к защите:</strong><br>
                      ${q.a.replace(/\\n/g, '<br>')}
                    </div>

                    <div class="defense-actions-bar">
                      <span style="font-size:12px;color:#94a3b8;">Ваша готовность к вопросу:</span>
                      <div class="defense-status-group">
                        <button class="defense-status-btn btn-know ${status === 'known' ? 'active' : ''}" 
                                onclick="window.EXAM_APP.setDefenseQuestionStatus('${q.id}', 'known')">
                          ✓ Знаю на 5 (+10 XP)
                        </button>
                        <button class="defense-status-btn btn-repeat ${status === 'repeat' ? 'active' : ''}" 
                                onclick="window.EXAM_APP.setDefenseQuestionStatus('${q.id}', 'repeat')">
                          🤔 Повторить
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Нижняя навигация между лабами -->
        <div class="lab-bottom-nav">
          <button class="lab-nav-btn" onclick="window.EXAM_APP.navigateLab(-1)">← Предыдущая лаба</button>
          <button class="lab-nav-btn primary" onclick="window.EXAM_APP.navigateLab(1)">Следующая лаба →</button>
        </div>
      </div>
    `;

    renderMath(container);
  }

  function selectLab(labId) {
    activeLabId = labId;
    activeLabSubtab = 'theory';
    renderLabsView();
  }

  function switchLabSubtab(subtabName) {
    activeLabSubtab = subtabName;
    renderActiveLab();
  }

  function toggleDefenseQuestion(qId) {
    const card = document.getElementById(`defense-card-${qId}`);
    if (card) {
      card.classList.toggle('expanded');
      if (card.classList.contains('expanded')) {
        renderMath(card);
      }
    }
  }

  function setDefenseQuestionStatus(qId, status) {
    if (!state.labDefenseStatus) state.labDefenseStatus = {};
    if (state.labDefenseStatus[qId] === status) {
      delete state.labDefenseStatus[qId];
    } else {
      state.labDefenseStatus[qId] = status;
      if (status === 'known') {
        state.xp = (state.xp || 0) + 10;
        updateGamificationUI();
      }
    }
    saveState();
    renderLabsView();
  }

  function navigateLab(offset) {
    const labs = window.LABS_DATA || [];
    if (labs.length === 0) return;
    const currentIndex = labs.findIndex(l => l.id === activeLabId);
    let newIndex = (currentIndex + offset + labs.length) % labs.length;
    activeLabId = labs[newIndex].id;
    activeLabSubtab = 'theory';
    renderLabsView();
    const main = document.getElementById('main-content');
    if (main) main.scrollTo({ top: 0, behavior: 'smooth' });
  }

"""

if target_anchor in code:
    code = code.replace(target_anchor, labs_logic + "\n" + target_anchor)
    print("Injected labs logic before renderCourseView.")
else:
    print("Error: target_anchor not found.")

# 3. Добавляем методы в window.EXAM_APP
old_exam_app = "toggleLabCard\n  };"
new_exam_app = """toggleLabCard,
    selectLab,
    switchLabSubtab,
    toggleDefenseQuestion,
    setDefenseQuestionStatus,
    navigateLab
  };"""

if old_exam_app in code:
    code = code.replace(old_exam_app, new_exam_app)
    print("Exposed labs methods in window.EXAM_APP.")
else:
    print("Warning: old_exam_app not found.")

with open("app/app.js", "w", encoding="utf-8") as f:
    f.write(code)

print("app/app.js successfully updated.")
