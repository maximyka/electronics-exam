# -*- coding: utf-8 -*-
"""
Script to safely inject Glossary, Practice & Labs, KaTeX formula formatting, 
and In-text definition popovers into app/app.js
"""

with open("app/app.js", "r", encoding="utf-8") as f:
    js_content = f.read()

# 1. Update switchView to handle 'glossary' and 'practice'
old_switch = """    // Инициализация специфичных вьюх
    if (viewName === 'flashcards') {
      initFlashcardsDeck();
    } else if (viewName === 'quiz') {
      renderQuizSelector();
    } else if (viewName === 'exam') {
      if (!currentTicket) generateNewTicket();
    } else if (viewName === 'cheatsheet') {
      renderCheatsheet();
    }
  }"""

new_switch = """    // Инициализация специфичных вьюх
    if (viewName === 'flashcards') {
      initFlashcardsDeck();
    } else if (viewName === 'quiz') {
      renderQuizSelector();
    } else if (viewName === 'exam') {
      if (!currentTicket) generateNewTicket();
    } else if (viewName === 'cheatsheet') {
      renderCheatsheet();
    } else if (viewName === 'glossary') {
      renderGlossaryView();
    } else if (viewName === 'practice') {
      renderPracticeView();
    }
  }"""

assert old_switch in js_content, "Could not find old_switch in app.js"
js_content = js_content.replace(old_switch, new_switch)

# 2. Update renderQuestionDetail formulas and summary
old_formulas_summary = """    // 5. Список формул
    const formulasContainer = document.getElementById('detail-formulas-list');
    if (formulasContainer) {
      if (q.formulas && q.formulas.length > 0) {
        formulasContainer.innerHTML = q.formulas.map(f => `
          <div class="formula-card-item">
            <span class="formula-name">${f.name}</span>
            <span class="formula-math">${f.formula}</span>
            <span class="formula-note">${f.note || ''}</span>
          </div>
        `).join('');
      } else {
        formulasContainer.innerHTML = '<p class="formula-note">Формулы приведены в тексте конспекта.</p>';
      }
    }

    // 6. Конспект
    const summaryContainer = document.getElementById('detail-summary-content');
    if (summaryContainer) {
      summaryContainer.innerHTML = q.summary;
    }"""

new_formulas_summary = """    // 5. Список формул (с KaTeX рендерингом)
    const formulasContainer = document.getElementById('detail-formulas-list');
    if (formulasContainer) {
      if (q.formulas && q.formulas.length > 0) {
        formulasContainer.innerHTML = q.formulas.map(f => {
          let mathExpr = f.formula.trim();
          if (!mathExpr.startsWith('$')) {
            mathExpr = `$$${mathExpr}$$`;
          }
          return `
            <div class="formula-card-item">
              <span class="formula-name">${f.name}</span>
              <span class="formula-math">${mathExpr}</span>
              <span class="formula-note">${f.note || ''}</span>
            </div>
          `;
        }).join('');
      } else {
        formulasContainer.innerHTML = '<p class="formula-note">Формулы приведены в тексте конспекта.</p>';
      }
    }

    // 6. Конспект с интерактивными ссылками на определения
    const summaryContainer = document.getElementById('detail-summary-content');
    if (summaryContainer) {
      summaryContainer.innerHTML = linkifyGlossaryTerms(q.summary);
    }"""

assert old_formulas_summary in js_content, "Could not find old_formulas_summary in app.js"
js_content = js_content.replace(old_formulas_summary, new_formulas_summary)

# 3. Add new functions for Glossary, Practice, In-text Popover before the DOMContentLoaded listener
new_code_block = """
  /* ==========================================================================
     ПОДСВЕТКА ТЕРМИНОВ В КОНСПЕКТЕ И ВСПЛЫВАЮЩИЙ ПОПОВЕР
     ========================================================================== */
  function linkifyGlossaryTerms(htmlText) {
    if (!data.glossary || !htmlText) return htmlText;

    const tokens = [];
    // Защищаем теги HTML и математические блоки KaTeX
    let safe = htmlText.replace(/(<[^>]+>|\\$\\$[^\\$]+\\$\\$|\\$[^\\$]+\\$)/g, (match) => {
      const placeholder = `___TOK_${tokens.length}___`;
      tokens.push(match);
      return placeholder;
    });

    // Сортируем термины по длине от длинных к коротким
    const sorted = [...data.glossary].sort((a, b) => b.term.length - a.term.length);
    for (const t of sorted) {
      const cleanTerm = t.term.split('(')[0].trim();
      if (cleanTerm.length < 3) continue;
      const escaped = cleanTerm.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');
      // Используем Unicode lookaround для точного совпадения границ слов в кириллице
      const re = new RegExp('(?<![а-яА-ЯёЁa-zA-Z0-9_])' + escaped + '(?![а-яА-ЯёЁa-zA-Z0-9_])', 'gi');
      safe = safe.replace(re, (match) => {
        return `<a href="javascript:void(0)" class="glossary-inline-link" data-term-id="${t.id}">${match}</a>`;
      });
    }

    tokens.forEach((tok, i) => {
      safe = safe.replace(`___TOK_${i}___`, tok);
    });

    return safe;
  }

  function openDefinitionPopover(termId) {
    if (!data.glossary) return;
    const term = data.glossary.find(t => t.id === termId);
    if (!term) return;

    const overlay = document.getElementById('definition-popover-overlay');
    const titleEl = document.getElementById('def-popover-title');
    const catEl = document.getElementById('def-popover-cat');
    const shortEl = document.getElementById('def-popover-short');
    const fullEl = document.getElementById('def-popover-full');
    const formulaBox = document.getElementById('def-popover-formula-box');
    const formulaEl = document.getElementById('def-popover-formula');
    const gotoQBtn = document.getElementById('def-popover-goto-q');
    const gotoGlossaryBtn = document.getElementById('def-popover-goto-glossary');
    const closeBtn = document.getElementById('def-popover-close');

    if (!overlay) return;

    if (titleEl) titleEl.textContent = term.term;
    if (catEl) catEl.textContent = term.category;
    if (shortEl) shortEl.textContent = term.shortDef || '';
    if (fullEl) fullEl.innerHTML = term.fullDef ? `<p>${term.fullDef}</p>` : '';

    if (formulaBox && formulaEl) {
      if (term.formula) {
        formulaBox.style.display = 'block';
        formulaEl.innerHTML = `$$${term.formula}$$`;
        renderMath(formulaEl);
      } else {
        formulaBox.style.display = 'none';
      }
    }

    if (gotoQBtn) {
      gotoQBtn.onclick = () => {
        overlay.style.display = 'none';
        openQuestionDetail(term.questionId);
      };
    }

    if (gotoGlossaryBtn) {
      gotoGlossaryBtn.onclick = () => {
        overlay.style.display = 'none';
        switchView('glossary');
        setTimeout(() => {
          const el = document.getElementById(`glossary-card-${term.id}`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 200);
      };
    }

    if (closeBtn) {
      closeBtn.onclick = () => {
        overlay.style.display = 'none';
      };
    }

    overlay.onclick = (e) => {
      if (e.target === overlay) overlay.style.display = 'none';
    };

    overlay.style.display = 'flex';
  }

  // Делегирование кликов по терминам в конспекте
  document.addEventListener('click', (e) => {
    const termLink = e.target.closest('.glossary-inline-link');
    if (termLink) {
      e.preventDefault();
      const termId = termLink.dataset.termId;
      openDefinitionPopover(termId);
    }
  });

  /* ==========================================================================
     СЛОВАРЬ ТЕРМИНОВ (GLOSSARY VIEW)
     ========================================================================== */
  let activeGlossaryCategory = 'all';
  let activeGlossaryLetter = null;
  let glossarySearchQuery = '';

  function renderGlossaryView() {
    const listContainer = document.getElementById('glossary-cards-grid');
    const searchInput = document.getElementById('glossary-search-input');
    const catChips = document.getElementById('glossary-category-filters');
    if (!listContainer || !data.glossary) return;

    if (searchInput && !searchInput.dataset.initialized) {
      searchInput.dataset.initialized = 'true';
      searchInput.addEventListener('input', (e) => {
        glossarySearchQuery = e.target.value.trim().toLowerCase();
        renderGlossaryCards();
      });
    }

    if (catChips && !catChips.dataset.initialized) {
      catChips.dataset.initialized = 'true';
      catChips.querySelectorAll('.cat-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          catChips.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
          activeGlossaryCategory = chip.dataset.cat;
          activeGlossaryLetter = null;
          renderAlphaBar();
          renderGlossaryCards();
        });
      });
    }

    renderAlphaBar();
    renderGlossaryCards();
  }

  function renderAlphaBar() {
    const alphaBar = document.getElementById('glossary-alpha-bar');
    if (!alphaBar || !data.glossary) return;

    const letters = new Set();
    data.glossary.forEach(item => {
      const first = item.term.trim().charAt(0).toUpperCase();
      if (/[А-ЯЁA-Z]/i.test(first)) letters.add(first);
    });
    const sortedLetters = Array.from(letters).sort((a, b) => a.localeCompare(b, 'ru'));

    alphaBar.innerHTML = `
      <button class="alpha-btn ${activeGlossaryLetter === null ? 'active' : ''}" data-letter="all">Все</button>
      ${sortedLetters.map(letter => `
        <button class="alpha-btn ${activeGlossaryLetter === letter ? 'active' : ''}" data-letter="${letter}">${letter}</button>
      `).join('')}
    `;

    alphaBar.querySelectorAll('.alpha-btn').forEach(btn => {
      btn.onclick = () => {
        alphaBar.querySelectorAll('.alpha-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeGlossaryLetter = btn.dataset.letter === 'all' ? null : btn.dataset.letter;
        renderGlossaryCards();
      };
    });
  }

  function renderGlossaryCards() {
    const container = document.getElementById('glossary-cards-grid');
    if (!container || !data.glossary) return;

    const filtered = data.glossary.filter(item => {
      if (activeGlossaryCategory !== 'all' && item.category !== activeGlossaryCategory) {
        return false;
      }
      if (activeGlossaryLetter) {
        const first = item.term.trim().charAt(0).toUpperCase();
        if (first !== activeGlossaryLetter) return false;
      }
      if (glossarySearchQuery) {
        const term = item.term.toLowerCase();
        const shortDef = (item.shortDef || '').toLowerCase();
        const fullDef = (item.fullDef || '').toLowerCase();
        const cat = (item.category || '').toLowerCase();
        if (!term.includes(glossarySearchQuery) && !shortDef.includes(glossarySearchQuery) && !fullDef.includes(glossarySearchQuery) && !cat.includes(glossarySearchQuery)) {
          return false;
        }
      }
      return true;
    });

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted);">
          <div style="font-size: 32px; margin-bottom: 8px;">🔍</div>
          <p>Ничего не найдено. Попробуйте изменить фильтр или категорию.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(item => `
      <div class="glossary-card" id="glossary-card-${item.id}">
        <div class="glossary-card-top">
          <h3 class="glossary-term-title">${item.term}</h3>
          <span class="glossary-cat-badge">${item.category}</span>
        </div>
        ${item.formula ? `
          <div class="glossary-formula-badge">
            <span class="math-expr">$$${item.formula}$$</span>
          </div>
        ` : ''}
        <div class="glossary-card-def">
          <p>${item.shortDef || item.fullDef}</p>
        </div>
        <div class="glossary-card-actions">
          <button class="glossary-goto-btn" onclick="window.EXAM_APP.openQuestion(${item.questionId})">
            <span>📚 Вопрос №${item.questionId} →</span>
          </button>
          <button class="glossary-goto-btn" onclick="window.EXAM_APP.openTermPopover('${item.id}')">
            <span>Подробнее ↗</span>
          </button>
        </div>
      </div>
    `).join('');

    renderMath(container);
  }

  /* ==========================================================================
     ЛАБОРАТОРНЫЕ И ПРАКТИКА (PRACTICE & LABS)
     ========================================================================== */
  let activePracticeSubtab = 'tasks';

  function renderPracticeView() {
    const tasksBtn = document.getElementById('btn-subtab-tasks');
    const labsBtn = document.getElementById('btn-subtab-labs');
    const tasksPane = document.getElementById('subview-tasks-pane');
    const labsPane = document.getElementById('subview-labs-pane');
    const badge = document.getElementById('tasks-solved-badge');

    if (!state.completedTasks) state.completedTasks = [];

    if (badge && data.practice_labs && data.practice_labs.tasks) {
      badge.textContent = `${state.completedTasks.length} / ${data.practice_labs.tasks.length}`;
    }

    if (tasksBtn && !tasksBtn.dataset.initialized) {
      tasksBtn.dataset.initialized = 'true';
      tasksBtn.onclick = () => {
        tasksBtn.classList.add('active');
        labsBtn.classList.remove('active');
        tasksPane.style.display = 'flex';
        labsPane.style.display = 'none';
        activePracticeSubtab = 'tasks';
      };
    }

    if (labsBtn && !labsBtn.dataset.initialized) {
      labsBtn.dataset.initialized = 'true';
      labsBtn.onclick = () => {
        labsBtn.classList.add('active');
        tasksBtn.classList.remove('active');
        labsPane.style.display = 'flex';
        tasksPane.style.display = 'none';
        activePracticeSubtab = 'labs';
      };
    }

    renderPracticeTasks();
    renderPracticeLabs();
  }

  function renderPracticeTasks() {
    const container = document.getElementById('practice-tasks-grid');
    if (!container || !data.practice_labs || !data.practice_labs.tasks) return;

    container.innerHTML = data.practice_labs.tasks.map(task => {
      const isSolved = state.completedTasks.includes(task.id);
      return `
        <div class="practice-task-card ${isSolved ? 'solved' : ''}" id="task-card-${task.id}">
          <div class="task-card-header">
            <h3 class="task-title">${task.title}</h3>
            <span class="task-cat-pill">${task.category}</span>
          </div>
          <div class="task-condition-text">
            ${task.condition}
          </div>
          <div class="task-input-row">
            <div class="task-input-wrapper">
              <input type="text" class="task-num-input" id="task-input-${task.id}" 
                     placeholder="Введите число..." ${isSolved ? `value="${task.expectedAnswer}" disabled` : ''}>
              <span class="task-unit-label">${task.unit}</span>
            </div>
            <button class="task-check-btn" id="task-btn-${task.id}" 
                    onclick="window.EXAM_APP.checkTaskAnswer(${task.id})" ${isSolved ? 'disabled' : ''}>
              ${isSolved ? '✓ Решено (+25 XP)' : 'Проверить ответ'}
            </button>
          </div>
          <div class="task-feedback-box ${isSolved ? 'correct' : ''}" id="task-feedback-${task.id}" ${isSolved ? 'style="display:flex;"' : ''}>
            ${isSolved ? '🎉 Отлично! Задача решена верно (+25 XP ⚡)' : ''}
          </div>
          <div class="task-actions-row">
            <button class="task-hint-toggle-btn" onclick="window.EXAM_APP.toggleTaskHint(${task.id})">💡 Подсказка</button>
            <button class="task-solution-toggle-btn" onclick="window.EXAM_APP.toggleTaskSolution(${task.id})">📖 Пошаговое решение</button>
          </div>
          <div class="task-hint-pane" id="task-hint-${task.id}">
            <b>💡 Подсказка:</b> ${task.hint}
          </div>
          <div class="task-solution-pane" id="task-solution-${task.id}">
            <b style="color:var(--accent-blue);">Пошаговое решение:</b>
            <div style="margin-top:8px;">${task.solution}</div>
          </div>
        </div>
      `;
    }).join('');

    renderMath(container);
  }

  function renderPracticeLabs() {
    const container = document.getElementById('practice-labs-accordion');
    if (!container || !data.practice_labs || !data.practice_labs.labs) return;

    container.innerHTML = data.practice_labs.labs.map(lab => `
      <div class="lab-card" id="lab-card-${lab.id}">
        <div class="lab-card-header" onclick="window.EXAM_APP.toggleLabCard(${lab.id})">
          <span class="lab-title-text">${lab.title}</span>
          <span class="lab-expand-arrow">▼</span>
        </div>
        <div class="lab-card-body">
          <div class="lab-section-title">🎯 Цель работы</div>
          <div class="lab-text-block">${lab.goal}</div>

          <div class="lab-section-title">🧰 Оборудование и приборы</div>
          <div class="lab-text-block">${lab.equipment}</div>

          <div class="lab-section-title">📋 Порядок выполнения</div>
          <ol class="lab-steps-ordered">
            ${lab.steps.map(step => `<li>${step}</li>`).join('')}
          </ol>

          <div class="lab-section-title">📐 Расчетные формулы</div>
          <div class="lab-formulas-strip">
            ${lab.formulas.map(formula => `
              <div class="lab-formula-chip">$$${formula}$$</div>
            `).join('')}
          </div>

          <div class="lab-section-title">❓ Контрольные вопросы для допуска и защиты</div>
          <ul class="lab-questions-list">
            ${lab.questions.map(q => `<li>• ${q}</li>`).join('')}
          </ul>
        </div>
      </div>
    `).join('');

    renderMath(container);
  }

  function checkTaskAnswer(taskId) {
    if (!data.practice_labs || !data.practice_labs.tasks) return;
    const task = data.practice_labs.tasks.find(t => t.id === taskId);
    if (!task) return;

    const input = document.getElementById(`task-input-${taskId}`);
    const feedback = document.getElementById(`task-feedback-${taskId}`);
    const card = document.getElementById(`task-card-${taskId}`);
    const btn = document.getElementById(`task-btn-${taskId}`);
    if (!input || !feedback) return;

    const valStr = input.value.trim().replace(',', '.');
    const userVal = parseFloat(valStr);

    if (isNaN(userVal)) {
      feedback.className = 'task-feedback-box wrong';
      feedback.textContent = '⚠️ Пожалуйста, введите числовой ответ!';
      feedback.style.display = 'flex';
      return;
    }

    const diff = Math.abs(userVal - task.expectedAnswer);
    const tolerance = task.tolerance !== undefined ? task.tolerance : 0.05;

    if (diff <= tolerance) {
      feedback.className = 'task-feedback-box correct';
      feedback.innerHTML = '🎉 Отлично! Ответ абсолютно верный! (+25 XP ⚡)';
      feedback.style.display = 'flex';
      if (card) card.classList.add('solved');
      if (btn) {
        btn.disabled = true;
        btn.textContent = '✓ Решено (+25 XP)';
      }
      input.disabled = true;

      if (!state.completedTasks.includes(taskId)) {
        state.completedTasks.push(taskId);
        state.xp += 25;
        saveState();
        renderPracticeView();
      }
    } else {
      feedback.className = 'task-feedback-box wrong';
      feedback.innerHTML = '❌ Ответ не совпадает. Проверьте размерность или нажмите «Подсказка»!';
      feedback.style.display = 'flex';
    }
  }

  function toggleTaskHint(taskId) {
    const pane = document.getElementById(`task-hint-${taskId}`);
    if (pane) {
      pane.style.display = pane.style.display === 'block' ? 'none' : 'block';
    }
  }

  function toggleTaskSolution(taskId) {
    const pane = document.getElementById(`task-solution-${taskId}`);
    if (pane) {
      const isVisible = pane.style.display === 'block';
      pane.style.display = isVisible ? 'none' : 'block';
      if (!isVisible) renderMath(pane);
    }
  }

  function toggleLabCard(labId) {
    const card = document.getElementById(`lab-card-${labId}`);
    if (card) {
      card.classList.toggle('active');
    }
  }

  // Глобальный интерфейс приложения для инлайн вызовов
  window.EXAM_APP = {
    openQuestion: openQuestionDetail,
    openTermPopover: openDefinitionPopover,
    checkTaskAnswer,
    toggleTaskHint,
    toggleTaskSolution,
    toggleLabCard
  };
"""

target_pos = js_content.rfind("  window.addEventListener('DOMContentLoaded', () => {")
assert target_pos != -1, "Could not find DOMContentLoaded in app.js"
js_content = js_content[:target_pos] + new_code_block + "\n" + js_content[target_pos:]

with open("app/app.js", "w", encoding="utf-8") as f:
    f.write(js_content)

print("Updated app/app.js successfully!")
