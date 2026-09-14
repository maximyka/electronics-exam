# -*- coding: utf-8 -*-
"""
Инжекция логики академического курса лекций в app/app.js
"""

with open('app/app.js', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Добавление state.masteredLectures в состояние (если нет)
old_state_init = 'completedTasks: []'
new_state_init = 'completedTasks: [],\n    masteredLectures: []'

if old_state_init in code and 'masteredLectures: []' not in code:
    code = code.replace(old_state_init, new_state_init)
    print("Added masteredLectures to default state.")

# 2. Добавление вызова renderCourseView() в switchView(viewName)
old_switch = '''    } else if (viewName === 'practice') {
      renderPracticeView();
    }'''

new_switch = '''    } else if (viewName === 'practice') {
      renderPracticeView();
    } else if (viewName === 'course') {
      renderCourseView();
    }'''

if old_switch in code and "viewName === 'course'" not in code:
    code = code.replace(old_switch, new_switch)
    print("Added course view trigger in switchView.")

# 3. Добавление функций работы с курсом
course_logic_code = r'''
  /* ==========================================================================
     АКАДЕМИЧЕСКИЙ КУРС ЛЕКЦИЙ (14 ЛЕКЦИЙ)
     ========================================================================== */
  let currentLectureId = 1;
  let activeCourseModuleFilter = 'all';

  function renderCourseView() {
    const grid = document.getElementById('course-lectures-grid');
    if (!grid) return;

    const lectures = window.EXAM_DATA?.lectures || [];
    if (!lectures.length) {
      grid.innerHTML = '<div class="empty-state">Лекции курса формируются...</div>';
      return;
    }

    if (!state.masteredLectures) state.masteredLectures = [];

    // Обновление прогресс-бара
    const masteredCount = state.masteredLectures.length;
    const totalLectures = lectures.length;
    const pct = Math.round((masteredCount / totalLectures) * 100);

    const txtElem = document.getElementById('course-progress-text');
    if (txtElem) txtElem.textContent = `${masteredCount} из ${totalLectures} лекций освоено (${pct}%)`;

    const barFill = document.getElementById('course-progress-bar-fill');
    if (barFill) barFill.style.width = `${pct}%`;

    const badgeSidebar = document.getElementById('badge-course-count');
    if (badgeSidebar) badgeSidebar.textContent = `${masteredCount}/${totalLectures}`;

    // Дашборд статистика
    const dashStatus = document.getElementById('dash-course-lectures-status');
    if (dashStatus) dashStatus.textContent = `${masteredCount} из 14 лекций освоено (${pct}%)`;

    // Фильтрация
    const searchVal = (document.getElementById('course-search-input')?.value || '').trim().toLowerCase();

    const filtered = lectures.filter(lec => {
      if (activeCourseModuleFilter !== 'all' && String(lec.moduleId) !== String(activeCourseModuleFilter)) {
        return false;
      }
      if (searchVal) {
        const text = (lec.number + ' ' + lec.title + ' ' + lec.subtitle + ' ' + lec.summary + ' ' + (lec.keyConcepts || []).join(' ')).toLowerCase();
        if (!text.includes(searchVal)) return false;
      }
      return true;
    });

    if (!filtered.length) {
      grid.innerHTML = '<div class="empty-state">По данному запросу лекций не найдено.</div>';
      return;
    }

    grid.innerHTML = filtered.map(lec => {
      const isMastered = state.masteredLectures.includes(lec.id);
      const moduleInfo = window.EXAM_DATA?.modules?.find(m => m.id === lec.moduleId);
      const modName = moduleInfo ? moduleInfo.shortTitle || moduleInfo.title : `Модуль ${lec.moduleId}`;

      const tagsHtml = (lec.keyConcepts || []).slice(0, 5).map(c => `
        <span class="course-concept-tag" onclick="event.stopPropagation(); window.EXAM_APP.openTermPopover('${c.replace(/'/g, "\\'")}', event)">${c}</span>
      `).join('');

      return `
        <div class="course-lecture-card ${isMastered ? 'mastered' : ''}" onclick="window.EXAM_APP.openLecture(${lec.id})">
          <div class="course-card-header">
            <span class="course-card-number">${lec.number}</span>
            <span class="course-card-module">${modName}</span>
            <span class="course-card-time">⏱ ${lec.readTime || '45 мин'}</span>
          </div>

          <h3 class="course-card-title">${lec.title}</h3>
          <p class="course-card-subtitle">${lec.subtitle || ''}</p>
          <p class="course-card-summary">${lec.summary ? lec.summary.slice(0, 190) + '...' : ''}</p>

          <div class="course-card-tags">
            ${tagsHtml}
          </div>

          <div class="course-card-footer">
            <div class="course-card-status">
              ${isMastered 
                ? '<span class="status-badge mastered">✓ Освоено</span>' 
                : '<span class="status-badge todo">⚪️ Не изучено</span>'}
            </div>

            <div class="course-card-actions">
              <button class="btn-card-read" onclick="event.stopPropagation(); window.EXAM_APP.openLecture(${lec.id})">
                📖 Читать лекцию
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  /* ==========================================================================
     ПОЛНОЭКРАННЫЙ РИДЕР ЛЕКЦИИ (Textbook Reader)
     ========================================================================== */
  function openLectureReader(lectureId) {
    const lectures = window.EXAM_DATA?.lectures || [];
    const lec = lectures.find(l => l.id === lectureId) || lectures[0];
    if (!lec) return;

    currentLectureId = lec.id;
    const modal = document.getElementById('lecture-reader-modal');
    if (!modal) return;

    // Мета в шапке
    const badge = document.getElementById('reader-lecture-badge');
    if (badge) badge.textContent = lec.number;
    const title = document.getElementById('reader-header-title');
    if (title) title.textContent = lec.title;

    // Кнопка статуса освоения
    updateReaderMasterButton(lec.id);

    // Оглавление лекции (TOC)
    const tocNav = document.getElementById('reader-toc-nav');
    if (tocNav && lec.sections) {
      tocNav.innerHTML = lec.sections.map(sec => `
        <a href="#${sec.id}" class="toc-link" onclick="event.preventDefault(); document.getElementById('${sec.id}')?.scrollIntoView({behavior:'smooth'});">
          ${sec.title}
        </a>
      `).join('');
    }

    // Связанные материалы
    const relatedBox = document.getElementById('reader-related-links');
    if (relatedBox) {
      let relHtml = '';
      if (lec.relatedLabIds && lec.relatedLabIds.length) {
        relHtml += `<div class="related-chip" onclick="window.EXAM_APP.closeReader(); switchView('practice');">🔬 Лабораторная №${lec.relatedLabIds.join(', ')}</div>`;
      }
      if (lec.relatedTaskIds && lec.relatedTaskIds.length) {
        relHtml += `<div class="related-chip" onclick="window.EXAM_APP.closeReader(); switchView('practice');">🧮 Задачи №${lec.relatedTaskIds.join(', ')}</div>`;
      }
      if (lec.relatedQuestionIds && lec.relatedQuestionIds.length) {
        relHtml += `<div class="related-chip" onclick="window.EXAM_APP.closeReader(); window.EXAM_APP.openQuestion(${lec.relatedQuestionIds[0]});">📝 Билет №${lec.relatedQuestionIds.join(', ')}</div>`;
      }
      relatedBox.innerHTML = relHtml || '<span class="text-muted">Материалы прикреплены</span>';
    }

    // Генерация контента лекции
    const article = document.getElementById('reader-article');
    if (article) {
      let contentHtml = `
        <header class="article-hero">
          <div class="article-pre">${lec.number} • ${lec.readTime || '45 мин'} изучения</div>
          <h1 class="article-title">${lec.title}</h1>
          <p class="article-subtitle">${lec.subtitle || ''}</p>
          <div class="article-summary-card">
            <div class="summary-card-title">📌 Краткая аннотация лекции:</div>
            <p>${linkifyGlossaryTerms(lec.summary || '')}</p>
          </div>
        </header>
      `;

      // Секции лекции
      if (lec.sections) {
        lec.sections.forEach(sec => {
          let calloutHtml = '';
          if (sec.callout) {
            const icons = { physics: '⚛️', engineering: '🛠️', danger: '⚠️', exam_tip: '🎯' };
            calloutHtml = `
              <div class="reader-callout callout-${sec.callout.type || 'physics'}">
                <div class="callout-header">
                  <span class="callout-icon">${icons[sec.callout.type] || '💡'}</span>
                  <strong>${sec.callout.title}</strong>
                </div>
                <div class="callout-body">${linkifyGlossaryTerms(sec.callout.text)}</div>
              </div>
            `;
          }

          // Форматирование параграфов
          const formattedText = sec.content.split('\n\n').map(p => {
            if (p.startsWith('### ')) return `<h4>${p.replace('### ', '')}</h4>`;
            if (p.startsWith('**') && p.includes(':**')) return `<p class="paragraph-lead">${p}</p>`;
            return `<p>${linkifyGlossaryTerms(p.replace(/\n/g, '<br>'))}</p>`;
          }).join('');

          contentHtml += `
            <section class="reader-section-block" id="${sec.id}">
              <h2 class="section-title">${sec.title}</h2>
              <div class="section-body typography">
                ${formattedText}
              </div>
              ${calloutHtml}
            </section>
          `;
        });
      }

      // Ключевые формулы
      if (lec.formulas && lec.formulas.length) {
        contentHtml += `
          <div class="reader-formulas-panel">
            <h3 class="panel-heading">🧮 Главные формулы лекции</h3>
            <div class="formulas-cards-grid">
              ${lec.formulas.map(f => `
                <div class="formula-card-item">
                  <div class="formula-latex-box" data-math="${f.latex.replace(/"/g, '&quot;')}">$$${f.latex}$$</div>
                  <div class="formula-name"><strong>${f.name}</strong></div>
                  <div class="formula-desc">${f.description}</div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }

      // Сравнительная таблица
      if (lec.comparisonTable) {
        const t = lec.comparisonTable;
        contentHtml += `
          <div class="reader-table-panel">
            <h3 class="panel-heading">📊 ${t.title}</h3>
            <div class="table-responsive-box">
              <table class="reader-data-table">
                <thead>
                  <tr>${t.headers.map(h => `<th>${h}</th>`).join('')}</tr>
                </thead>
                <tbody>
                  ${t.rows.map(row => `<tr>${row.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `;
      }

      // Вопросы для самоконтроля
      if (lec.selfTestQuestions && lec.selfTestQuestions.length) {
        contentHtml += `
          <div class="reader-selftest-panel">
            <h3 class="panel-heading">❓ Контрольные вопросы для самопроверки</h3>
            <div class="selftest-questions-list">
              ${lec.selfTestQuestions.map((q, qidx) => `
                <div class="selftest-card" id="selftest-card-${lec.id}-${qidx}">
                  <div class="selftest-q-header" onclick="window.EXAM_APP.toggleSelfTest('${lec.id}-${qidx}')">
                    <span class="selftest-q-num">Вопрос ${qidx + 1}</span>
                    <h4 class="selftest-q-title">${q.question}</h4>
                    <span class="selftest-arrow">▼</span>
                  </div>
                  <div class="selftest-answer-pane" id="selftest-ans-${lec.id}-${qidx}" style="display:none;">
                    ${q.hint ? `<div class="selftest-hint">💡 <strong>Подсказка:</strong> ${q.hint}</div>` : ''}
                    <div class="selftest-answer-text">
                      <strong>Ответ преподавателя:</strong>
                      <p>${linkifyGlossaryTerms(q.detailedAnswer)}</p>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }

      article.innerHTML = contentHtml;
      renderMath(article);
    }

    // Кнопки Предыдущая / Следующая лекция
    const prevBtn = document.getElementById('btn-reader-prev');
    const nextBtn = document.getElementById('btn-reader-next');
    if (prevBtn) {
      prevBtn.style.display = lec.id > 1 ? 'inline-flex' : 'none';
      prevBtn.onclick = () => openLectureReader(lec.id - 1);
    }
    if (nextBtn) {
      nextBtn.style.display = lec.id < lectures.length ? 'inline-flex' : 'none';
      nextBtn.onclick = () => openLectureReader(lec.id + 1);
    }

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    modal.scrollTo({ top: 0, behavior: 'instant' });
  }

  function closeLectureReader() {
    const modal = document.getElementById('lecture-reader-modal');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = '';
  }

  function updateReaderMasterButton(lectureId) {
    const btn = document.getElementById('btn-reader-toggle-mastered');
    if (!btn) return;

    if (!state.masteredLectures) state.masteredLectures = [];
    const isMastered = state.masteredLectures.includes(lectureId);

    if (isMastered) {
      btn.className = 'btn-master-status mastered';
      btn.innerHTML = '<span class="btn-icon">✅</span> <span class="btn-text">Лекция освоена</span>';
    } else {
      btn.className = 'btn-master-status';
      btn.innerHTML = '<span class="btn-icon">✓</span> <span class="btn-text">Отметить как освоенную (+50 XP)</span>';
    }

    btn.onclick = () => toggleLectureMastered(lectureId);
  }

  function toggleLectureMastered(lectureId) {
    if (!state.masteredLectures) state.masteredLectures = [];
    const idx = state.masteredLectures.indexOf(lectureId);

    if (idx === -1) {
      state.masteredLectures.push(lectureId);
      state.xp += 50;
      saveState();
      showToast('🎉 Лекция освоена! Начислено +50 XP!');
    } else {
      state.masteredLectures.splice(idx, 1);
      saveState();
      showToast('Статус лекции сброшен');
    }

    updateReaderMasterButton(lectureId);
    renderCourseView();
  }

  function toggleSelfTestAnswer(id) {
    const pane = document.getElementById(`selftest-ans-${id}`);
    const card = document.getElementById(`selftest-card-${id}`);
    if (pane && card) {
      const isVisible = pane.style.display === 'block';
      pane.style.display = isVisible ? 'none' : 'block';
      card.classList.toggle('expanded', !isVisible);
      if (!isVisible) renderMath(pane);
    }
  }

  function setupDetailModeTabs(questionId) {
    const q = (window.EXAM_DATA?.questions || []).find(item => item.id === questionId);
    if (!q) return;

    // Найти соответствующую лекцию (по PartId)
    const lectures = window.EXAM_DATA?.lectures || [];
    // Сопоставление тем экзамена с лекциями
    const partToLectureMap = {
      1: 1, // Полупроводники и диоды -> Лекция 1
      2: (q.id <= 6 ? 2 : 3), // Транзисторы БТ -> Лекция 2, ПТ и тиристоры -> Лекция 3
      3: (q.id <= 14 ? 4 : 5), // Усилители и ОС -> Лекция 4, ОУ и фильтры -> Лекция 5
      4: (q.id <= 19 ? 6 : 7), // Генераторы и линии -> Лекция 6, Модуляция -> Лекция 7
      5: 8, // Выпрямители, ЦАП и АЦП -> Лекция 8
      6: (q.id <= 28 ? 9 : 10), // Базисы и логика -> Лекция 9, КЦУ -> Лекция 10
      7: (q.id <= 32 ? 11 : (q.id <= 34 ? 12 : (q.id <= 35 ? 13 : 14))) // Триггеры, регистры, память, ключи
    };

    const targetLectureId = partToLectureMap[q.partId] || 1;
    const lec = lectures.find(l => l.id === targetLectureId) || lectures[0];

    const tabLbl = document.getElementById('tab-btn-lecture-lbl');
    if (tabLbl && lec) tabLbl.textContent = `🎓 ${lec.number}: ${lec.title.slice(0, 30)}...`;

    const subpaneNum = document.getElementById('subpane-lecture-num');
    if (subpaneNum && lec) subpaneNum.textContent = lec.number;

    const subpaneTitle = document.getElementById('subpane-lecture-title');
    if (subpaneTitle && lec) subpaneTitle.textContent = lec.title;

    const subpaneDesc = document.getElementById('subpane-lecture-desc');
    if (subpaneDesc && lec) subpaneDesc.textContent = lec.subtitle || lec.summary;

    const btnFs = document.getElementById('btn-open-lecture-fullscreen');
    if (btnFs && lec) btnFs.onclick = () => openLectureReader(lec.id);

    // Рендеринг конспекта лекции внутри билета
    const subpaneContent = document.getElementById('subpane-lecture-content');
    if (subpaneContent && lec && lec.sections) {
      subpaneContent.innerHTML = lec.sections.map(sec => `
        <div class="subpane-section-box">
          <h4>${sec.title}</h4>
          <div class="typography">${linkifyGlossaryTerms(sec.content.replace(/\n\n/g, '<br><br>'))}</div>
          ${sec.callout ? `<div class="reader-callout callout-${sec.callout.type || 'physics'}"><strong>${sec.callout.title}</strong>: ${sec.callout.text}</div>` : ''}
        </div>
      `).join('');
      renderMath(subpaneContent);
    }

    // Слушатели переключения табов
    const btnTicket = document.getElementById('tab-btn-detail-ticket');
    const btnLecture = document.getElementById('tab-btn-detail-lecture');
    const lecturePane = document.getElementById('detail-lecture-pane');

    function showTab(tabName) {
      if (tabName === 'ticket') {
        if (btnTicket) btnTicket.classList.add('active');
        if (btnLecture) btnLecture.classList.remove('active');
        document.querySelectorAll('.detail-card').forEach(c => c.style.display = '');
        if (lecturePane) lecturePane.style.display = 'none';
      } else {
        if (btnTicket) btnTicket.classList.remove('active');
        if (btnLecture) btnLecture.classList.add('active');
        document.querySelectorAll('.detail-card').forEach(c => c.style.display = 'none');
        if (lecturePane) lecturePane.style.display = 'block';
      }
    }

    if (btnTicket) btnTicket.onclick = () => showTab('ticket');
    if (btnLecture) btnLecture.onclick = () => showTab('lecture');
    showTab('ticket');
  }
'''

# 4. Вставка функций в app/app.js перед window.EXAM_APP
marker = '  // Глобальный интерфейс приложения для инлайн вызовов'
if marker in code and 'function renderCourseView()' not in code:
    code = code.replace(marker, course_logic_code + '\n' + marker)
    print("Inserted course logic before EXAM_APP.")

# 5. Обновление window.EXAM_APP
old_exam_app = '''  window.EXAM_APP = {
    openQuestion: openQuestionDetail,
    openTermPopover: openDefinitionPopover,
    checkTaskAnswer,
    toggleTaskHint,
    toggleTaskSolution,
    toggleLabCard
  };'''

new_exam_app = '''  window.EXAM_APP = {
    openQuestion: openQuestionDetail,
    openTermPopover: openDefinitionPopover,
    openLecture: openLectureReader,
    closeReader: closeLectureReader,
    toggleLectureMastered,
    toggleSelfTest: toggleSelfTestAnswer,
    checkTaskAnswer,
    toggleTaskHint,
    toggleTaskSolution,
    toggleLabCard
  };'''

if old_exam_app in code:
    code = code.replace(old_exam_app, new_exam_app)
    print("Exposed course functions in EXAM_APP.")

# 6. Вызов setupDetailModeTabs(q.id) внутри openQuestionDetail(id)
detail_call_marker = 'renderMath(detailSummary);'
if detail_call_marker in code and 'setupDetailModeTabs(q.id);' not in code:
    code = code.replace(detail_call_marker, detail_call_marker + '\n    setupDetailModeTabs(q.id);')
    print("Connected setupDetailModeTabs in openQuestionDetail.")

# 7. Добавление слушателей кнопок курса в initEvents()
init_events_marker = 'function initEvents() {'
events_code = '''function initEvents() {
    // Кнопки курса на Дашборде
    document.getElementById('btn-dash-open-course')?.addEventListener('click', () => switchView('course'));
    document.getElementById('btn-dash-open-catalog')?.addEventListener('click', () => switchView('catalog'));

    // Фильтры лекций курса
    document.querySelectorAll('#course-filter-chips .filter-chip').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('#course-filter-chips .filter-chip').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeCourseModuleFilter = btn.dataset.mod || 'all';
        renderCourseView();
      });
    });

    // Живой поиск лекций
    document.getElementById('course-search-input')?.addEventListener('input', () => {
      renderCourseView();
    });

    // Закрытие ридера
    document.getElementById('btn-close-reader')?.addEventListener('click', closeLectureReader);
    document.getElementById('btn-reader-close-x')?.addEventListener('click', closeLectureReader);
'''

if init_events_marker in code and 'btn-dash-open-course' not in code:
    code = code.replace(init_events_marker, events_code)
    print("Added course event listeners in initEvents().")

with open('app/app.js', 'w', encoding='utf-8') as f:
    f.write(code)

print("app/app.js successfully updated with course logic!")
