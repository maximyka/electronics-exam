/**
 * ЭЛЕКТРОНИКА И СХЕМОТЕХНИКА — ОСНОВНОЙ СКРИПТ ПРИЛОЖЕНИЯ
 * Логика PWA, роутинг, расчет процентов, конспекты, карточки, квизы, экзамен.
 */

(function() {
  'use strict';

  const CURRENT_APP_VERSION = '1.6.0';
  let swRegistration = null;

  // Регистрация Service Worker для PWA с поддержкой мгновенных обновлений
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').then((reg) => {
        swRegistration = reg;
        
        // Слушаем обнаружение новой версии Service Worker
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                showUpdateBanner('Доступно обновление конспекта! Нажмите обновить.');
              }
            });
          }
        });
      }).catch(err => {
        console.log('SW registration skipped:', err);
      });

      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });

      // Фоновая проверка обновлений
      checkForAppUpdates(false);
      // Периодическая проверка каждые 5 минут
      setInterval(() => checkForAppUpdates(false), 5 * 60 * 1000);
    });

    // Проверка при возвращении пользователя в приложение
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        checkForAppUpdates(false);
      }
    });
  }

  // Функция проверки обновлений через version.json
  function checkForAppUpdates(manual = false) {
    const btnCheck = document.getElementById('btn-check-updates');
    if (manual && btnCheck) {
      btnCheck.style.transform = 'rotate(360deg)';
      setTimeout(() => { btnCheck.style.transform = 'none'; }, 600);
    }

    fetch('./version.json?_t=' + Date.now(), { cache: 'no-store' })
      .then(r => r.json())
      .then(info => {
        if (info && info.version && info.version !== CURRENT_APP_VERSION) {
          showUpdateBanner(info.notes || `Вышла новая версия v${info.version}`);
        } else if (manual) {
          alert(`У вас самая свежая версия (v${CURRENT_APP_VERSION}). Все 36 вопросов актуальны!`);
        }
      })
      .catch(err => {
        if (manual) {
          alert('Не удалось связаться с сервером обновлений. Проверьте интернет.');
        }
      });
  }

  function showUpdateBanner(text) {
    const banner = document.getElementById('update-toast');
    const desc = document.getElementById('update-toast-desc');
    if (banner) {
      if (desc && text) desc.textContent = text;
      banner.style.display = 'flex';
    }
  }

  function applyAppUpdate() {
    const btn = document.getElementById('btn-update-now');
    if (btn) {
      btn.textContent = 'Обновление...';
      btn.disabled = true;
    }
    
    // Очищаем кэш и перезагружаем страницу
    if ('caches' in window) {
      caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))).then(() => {
        if (swRegistration && swRegistration.waiting) {
          swRegistration.waiting.postMessage({ action: 'skipWaiting' });
        }
        window.location.reload();
      }).catch(() => {
        window.location.reload();
      });
    } else {
      window.location.reload();
    }
  }

  // Данные приложения
  const data = window.EXAM_DATA;
  if (!data) {
    console.error('EXAM_DATA not found!');
    return;
  }

  // Состояние приложения (сохраняется в LocalStorage)
  const STORAGE_KEY = 'electronics_exam_state_v1';
  let state = {
    questionStatus: {}, // { [id]: 'untouched' | 'learning' | 'repeat' | 'learned' }
    favorites: [],      // [qId, ...]
    fcStatus: {},       // { [fcId]: 'bad' | 'ok' | 'good' }
    quizScores: {},     // { [partId]: { score, total, pct } }
    examHistory: [],    // [{ date, ticketNum, grade }, ...]
    checklist: {},      // { [qId + '_' + idx]: boolean }
    theme: 'dark',
    currentPartFilter: 'all',
    currentStatusFilter: 'all',
    xp: 0,
    streak: 1,
    lastActiveDate: new Date().toISOString().slice(0, 10),
    mistakes: [],       // [questionId, ...]
    labDefenseStatus: {} // { [qId]: 'known' | 'repeat' }
  };

  // Загрузка состояния
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      state = Object.assign(state, JSON.parse(saved));
    }
  } catch (e) {
    console.warn('Could not load state from localStorage', e);
  }

  // Расчет серии занятий
  const todayStr = new Date().toISOString().slice(0, 10);
  if (state.lastActiveDate && state.lastActiveDate !== todayStr) {
    const d1 = new Date(todayStr);
    const d0 = new Date(state.lastActiveDate);
    const diffDays = Math.round((d1 - d0) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      state.streak += 1;
    } else if (diffDays > 1) {
      state.streak = 1;
    }
  }
  state.lastActiveDate = todayStr;
  if (!Array.isArray(state.mistakes)) state.mistakes = [];

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Could not save state', e);
    }
    updateAllProgress();
    updateGamificationUI();
  }

  // Рендерер KaTeX формул
  function renderMath(element) {
    if (!element) return;
    if (window.renderMathInElement) {
      try {
        window.renderMathInElement(element, {
          delimiters: [
            {left: '$$', right: '$$', display: true},
            {left: '$', right: '$', display: false}
          ],
          throwOnError: false
        });
      } catch (err) {
        // Игнорируем предупреждения парсера
      }
    }
  }

  // Обновление элементов геймификации в интерфейсе
  function updateGamificationUI() {
    const sidebarStreak = document.getElementById('sidebar-streak-count');
    const sidebarXp = document.getElementById('sidebar-xp-count');
    const sidebarMistakesPill = document.getElementById('sidebar-mistakes-pill');
    const sidebarMistakesCount = document.getElementById('sidebar-mistakes-count');
    const badgeMistakes = document.getElementById('badge-mistakes-counter');
    const mStreak = document.getElementById('m-streak-val');
    const mXp = document.getElementById('m-xp-val');

    if (sidebarStreak) sidebarStreak.textContent = `${state.streak} дн.`;
    if (sidebarXp) sidebarXp.textContent = `${state.xp} XP`;
    if (mStreak) mStreak.textContent = state.streak;
    if (mXp) mXp.textContent = state.xp;

    const mistakesLen = state.mistakes.length;
    if (sidebarMistakesPill) sidebarMistakesPill.style.display = mistakesLen > 0 ? 'flex' : 'none';
    if (sidebarMistakesCount) sidebarMistakesCount.textContent = mistakesLen;
    if (badgeMistakes) badgeMistakes.textContent = `${mistakesLen} ошибок`;
  }

  // Текущее состояние вьюх
  let currentView = 'dashboard';
  let currentQuestionId = 1;
  let activeFlashcardIndex = 0;
  let activeFlashcardDeck = [];
  let isCardFlipped = false;
  
  // Квиз & Тренажер в стиле Duolingo / Хочу Водить
  let activeQuizMode = 'topics'; // 'topics' | 'marathon' | 'mistakes' | 'exam' | 'express'
  let currentQuizPartId = 1;
  let activeQuestions = [];
  let currentQuizStep = 0;
  let currentQuizScore = 0;
  let currentQuizXpGained = 0;
  let currentExamLives = 2;

  // Экзамен
  let examTimerSeconds = 20 * 60;
  let examTimerInterval = null;
  let examTimerRunning = false;
  let currentTicket = null;

  // Речь
  let speechSynth = window.speechSynthesis;
  let isSpeaking = false;

  // Deferred prompt для PWA
  let deferredPrompt = null;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const btn = document.getElementById('btn-install-pwa');
    if (btn) btn.style.display = 'flex';
  });

  /* ==========================================================================
     РАСЧЕТ ПРОГРЕССА И ПРОЦЕНТОВ
     ========================================================================== */
  function calculateQuestionWeight(status) {
    switch (status) {
      case 'learned': return 1.0;
      case 'learning': return 0.5;
      case 'repeat': return 0.25;
      default: return 0.0;
    }
  }

  function getProgress() {
    const total = data.questions.length;
    let scoreSum = 0;
    let counts = { learned: 0, learning: 0, repeat: 0, untouched: 0 };

    data.questions.forEach(q => {
      const st = state.questionStatus[q.id] || 'untouched';
      counts[st] = (counts[st] || 0) + 1;
      scoreSum += calculateQuestionWeight(st);
    });

    const totalPct = Math.round((scoreSum / total) * 100);

    // Прогресс по каждой из 7 частей
    const modulesProgress = {};
    data.modules.forEach(m => {
      let mScore = 0;
      m.questionIds.forEach(qid => {
        const st = state.questionStatus[qid] || 'untouched';
        mScore += calculateQuestionWeight(st);
      });
      modulesProgress[m.id] = Math.round((mScore / m.questionIds.length) * 100);
    });

    return {
      total,
      totalPct,
      scoreSum,
      counts,
      modulesProgress
    };
  }

  function updateAllProgress() {
    const p = getProgress();

    // 1. Тексты процентов
    const heroPctEl = document.getElementById('hero-progress-pct');
    if (heroPctEl) heroPctEl.textContent = `${p.totalPct}%`;

    const sidebarTextEl = document.getElementById('sidebar-progress-text');
    if (sidebarTextEl) sidebarTextEl.textContent = `${p.totalPct}%`;

    const mobilePillEl = document.getElementById('mobile-pill-text');
    if (mobilePillEl) mobilePillEl.textContent = `${p.totalPct}% готово`;

    const badgeTotalEl = document.getElementById('badge-total-pct');
    if (badgeTotalEl) badgeTotalEl.textContent = `${p.totalPct}%`;

    const learnedCountEl = document.getElementById('sidebar-learned-count');
    if (learnedCountEl) learnedCountEl.textContent = `${p.counts.learned} из ${p.total} тем`;

    // 2. Статистические карточки
    const statLearned = document.getElementById('stat-learned');
    if (statLearned) statLearned.textContent = p.counts.learned;
    const statRepeat = document.getElementById('stat-repeat');
    if (statRepeat) statRepeat.textContent = p.counts.repeat;
    const statLearning = document.getElementById('stat-learning');
    if (statLearning) statLearning.textContent = p.counts.learning;
    const statUntouched = document.getElementById('stat-untouched');
    if (statUntouched) statUntouched.textContent = p.counts.untouched;

    // 3. Фильтры
    const fLearned = document.getElementById('filter-count-learned');
    if (fLearned) fLearned.textContent = p.counts.learned;
    const fLearning = document.getElementById('filter-count-learning');
    if (fLearning) fLearning.textContent = p.counts.learning;
    const fRepeat = document.getElementById('filter-count-repeat');
    if (fRepeat) fRepeat.textContent = p.counts.repeat;
    const fUntouched = document.getElementById('filter-count-untouched');
    if (fUntouched) fUntouched.textContent = p.counts.untouched;
    const fFav = document.getElementById('filter-count-fav');
    if (fFav) fFav.textContent = state.favorites.length;

    // 4. SVG Ring анимации
    const heroCircle = document.getElementById('hero-progress-circle');
    if (heroCircle) {
      const radius = 54;
      const circumference = 2 * Math.PI * radius;
      heroCircle.style.strokeDasharray = `${circumference} ${circumference}`;
      const offset = circumference - (p.totalPct / 100) * circumference;
      heroCircle.style.strokeDashoffset = offset;
    }

    const sidebarCircle = document.getElementById('sidebar-progress-circle');
    if (sidebarCircle) {
      const radius = 26;
      const circumference = 2 * Math.PI * radius;
      sidebarCircle.style.strokeDasharray = `${circumference} ${circumference}`;
      const offset = circumference - (p.totalPct / 100) * circumference;
      sidebarCircle.style.strokeDashoffset = offset;
    }

    // 5. Обновление прогресс-баров модулей на дашборде
    data.modules.forEach(m => {
      const pct = p.modulesProgress[m.id] || 0;
      const bar = document.getElementById(`mod-progress-bar-${m.id}`);
      const pctTxt = document.getElementById(`mod-progress-pct-${m.id}`);
      if (bar) bar.style.width = `${pct}%`;
      if (pctTxt) pctTxt.textContent = `${pct}%`;
    });

    // 6. Умная рекомендация
    updateSmartRecommendation();
  }

  function updateSmartRecommendation() {
    // Находим первый вопрос, который не выучен или требует повторения
    let candidate = data.questions.find(q => {
      const st = state.questionStatus[q.id] || 'untouched';
      return st === 'repeat';
    });
    if (!candidate) {
      candidate = data.questions.find(q => {
        const st = state.questionStatus[q.id] || 'untouched';
        return st === 'learning';
      });
    }
    if (!candidate) {
      candidate = data.questions.find(q => {
        const st = state.questionStatus[q.id] || 'untouched';
        return st === 'untouched';
      });
    }

    const titleEl = document.getElementById('rec-question-title');
    const descEl = document.getElementById('rec-question-desc');
    const btnEl = document.getElementById('btn-open-recommended');

    if (candidate) {
      if (titleEl) titleEl.textContent = `${candidate.id}. ${candidate.title}`;
      if (descEl) descEl.textContent = candidate.fullQuestion.slice(0, 140) + '...';
      if (btnEl) {
        btnEl.onclick = () => openQuestionDetail(candidate.id);
      }
    } else {
      if (titleEl) titleEl.textContent = '🎉 Все 36 тем выучены!';
      if (descEl) descEl.textContent = 'Вы изучили весь курс программы. Рекомендуем пройти симулятор экзамена или проверить себя тестами.';
      if (btnEl) {
        btnEl.textContent = 'Пройти пробный экзамен →';
        btnEl.onclick = () => switchView('exam');
      }
    }
  }

  /* ==========================================================================
     РОУТИНГ И ПЕРЕКЛЮЧЕНИЕ ЭКРАНОВ
     ========================================================================== */
  function switchView(viewName) {
    currentView = viewName;

    // Скрыть все вьюхи
    document.querySelectorAll('.app-view').forEach(el => el.classList.remove('active'));
    
    // Активировать нужную
    const target = document.getElementById(`view-${viewName}`);
    if (target) {
      target.classList.add('active');
      // Скролл вверх
      const main = document.getElementById('main-content');
      if (main) main.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Подсветка кнопок в десктоп сайдбаре
    document.querySelectorAll('#desktop-sidebar .nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === viewName);
    });

    // Подсветка кнопок в мобильном таббаре
    document.querySelectorAll('#mobile-tabbar .tabbar-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === viewName);
    });

    // Инициализация специфичных вьюх
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
    } else if (viewName === 'labs') {
      renderLabsView();
    } else if (viewName === 'practice') {
      renderPracticeView();
    } else if (viewName === 'course') {
      renderCourseView();
    }
  }

  /* ==========================================================================
     РЕНДЕРИНГ ДАШБОРДА
     ========================================================================== */
  function renderDashboardModules() {
    const container = document.getElementById('dashboard-modules-grid');
    if (!container) return;

    container.innerHTML = data.modules.map(m => {
      return `
        <div class="module-card" data-module-id="${m.id}">
          <div class="module-top-row">
            <div class="module-icon-badge">
              <span class="module-icon">${m.icon}</span>
              <span class="module-range">${m.questionsRange}</span>
            </div>
            <span class="module-pct-badge" id="mod-progress-pct-${m.id}">0%</span>
          </div>
          <h3>${m.title}</h3>
          <p class="module-desc">${m.description}</p>
          <div class="module-progress-track">
            <div class="module-progress-bar" id="mod-progress-bar-${m.id}" style="width: 0%;"></div>
          </div>
          <div class="module-bottom-info">
            <span>Вопросов: ${m.questionIds.length}</span>
            <span style="color:var(--accent-blue);">Открыть темы →</span>
          </div>
        </div>
      `;
    }).join('');

    // Клик по модулю открывает каталог с фильтром
    container.querySelectorAll('.module-card').forEach(card => {
      card.addEventListener('click', () => {
        const mid = parseInt(card.dataset.moduleId, 10);
        state.currentPartFilter = mid;
        switchView('catalog');
        renderCatalog();
      });
    });
  }

  /* ==========================================================================
     РЕНДЕРИНГ КАТАЛОГА 36 ВОПРОСОВ
     ========================================================================== */
  function renderCatalog() {
    const container = document.getElementById('catalog-questions-container');
    if (!container) return;

    const query = (document.getElementById('catalog-search-input')?.value || '').trim().toLowerCase();
    const statusFilter = state.currentStatusFilter || 'all';

    let html = '';

    data.modules.forEach(m => {
      // Вопросы модуля
      const moduleQuestions = data.questions.filter(q => m.questionIds.includes(q.id));
      
      // Фильтрация
      const filtered = moduleQuestions.filter(q => {
        const st = state.questionStatus[q.id] || 'untouched';
        const isFav = state.favorites.includes(q.id);

        if (statusFilter === 'learned' && st !== 'learned') return false;
        if (statusFilter === 'learning' && st !== 'learning') return false;
        if (statusFilter === 'repeat' && st !== 'repeat') return false;
        if (statusFilter === 'untouched' && st !== 'untouched') return false;
        if (statusFilter === 'favorites' && !isFav) return false;

        if (query) {
          const matchTitle = q.title.toLowerCase().includes(query);
          const matchFull = q.fullQuestion.toLowerCase().includes(query);
          const matchTags = q.tags.some(t => t.toLowerCase().includes(query));
          return matchTitle || matchFull || matchTags;
        }
        return true;
      });

      if (filtered.length === 0) return;

      html += `
        <div class="part-group">
          <div class="part-group-header">
            <h3><span>${m.icon}</span> ${m.title}</h3>
            <span class="part-group-progress">${filtered.length} из ${moduleQuestions.length}</span>
          </div>
          <div class="questions-list">
            ${filtered.map(q => {
              const st = state.questionStatus[q.id] || 'untouched';
              const isFav = state.favorites.includes(q.id);
              let statusLabel = '⚪️ Не начато';
              if (st === 'learned') statusLabel = '✅ Выучено';
              if (st === 'learning') statusLabel = '⏳ В процессе';
              if (st === 'repeat') statusLabel = '🔄 Повторить';

              return `
                <div class="question-row-card" data-qid="${q.id}">
                  <div class="q-num-badge">${q.id}</div>
                  <div class="q-info">
                    <h4>${isFav ? '⭐️ ' : ''}${q.title}</h4>
                    <div class="q-tags">
                      ${q.tags.slice(0, 3).map(t => `<span class="q-tag">${t}</span>`).join('')}
                    </div>
                  </div>
                  <span class="q-status-badge ${st}">${statusLabel}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    });

    if (!html) {
      container.innerHTML = `
        <div class="empty-hint">
          Ничего не найдено по текущему фильтру или поисковому запросу.
        </div>
      `;
    } else {
      container.innerHTML = html;
      container.querySelectorAll('.question-row-card').forEach(card => {
        card.addEventListener('click', () => {
          const qid = parseInt(card.dataset.qid, 10);
          openQuestionDetail(qid);
        });
      });
    }
  }

  /* ==========================================================================
     ДЕТАЛЬНЫЙ КОНСПЕКТ ВОПРОСА
     ========================================================================== */
  function openQuestionDetail(qid) {
    currentQuestionId = qid;
    const q = data.questions.find(item => item.id === qid);
    if (!q) return;

    // 1. Метаданные
    const partBadge = document.getElementById('detail-part-badge');
    const qnumBadge = document.getElementById('detail-qnum-badge');
    const titleEl = document.getElementById('detail-title');
    const fullQEl = document.getElementById('detail-full-question');
    const tagsContainer = document.getElementById('detail-tags-container');

    if (partBadge) partBadge.textContent = `Часть ${q.partId}`;
    if (qnumBadge) qnumBadge.textContent = `Вопрос №${q.id}`;
    if (titleEl) titleEl.textContent = q.title;
    if (fullQEl) fullQEl.textContent = q.fullQuestion;

    if (tagsContainer) {
      tagsContainer.innerHTML = q.tags.map(t => `<span class="q-tag">#${t}</span>`).join('');
    }

    // 2. Статус вопроса
    const currentStatus = state.questionStatus[q.id] || 'untouched';
    document.querySelectorAll('.status-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.status === currentStatus);
    });

    // 3. Избранное
    const favBtn = document.getElementById('btn-toggle-favorite');
    if (favBtn) {
      const isFav = state.favorites.includes(q.id);
      favBtn.classList.toggle('active', isFav);
      favBtn.textContent = isFav ? '★ В избранном' : '☆ В избранное';
    }

    // 4. SVG схема
    const svgContainer = document.getElementById('detail-svg-container');
    if (svgContainer) {
      svgContainer.innerHTML = q.svg || '<p>Схема отсутствует</p>';
    }

    // 5. Список формул (с KaTeX рендерингом)
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
    }

    // 7. Ловушки экзаменатора
    const trapsContainer = document.getElementById('detail-traps-list');
    if (trapsContainer) {
      if (q.examTips && q.examTips.length > 0) {
        trapsContainer.innerHTML = q.examTips.map(tip => `<li>💡 ${tip}</li>`).join('');
      } else {
        trapsContainer.innerHTML = '<li>Стандартные теоретические вопросы по программе.</li>';
      }
    }

    // 8. Чеклист
    const checklistContainer = document.getElementById('detail-checklist-container');
    if (checklistContainer) {
      if (q.checklist && q.checklist.length > 0) {
        checklistContainer.innerHTML = q.checklist.map((item, idx) => {
          const key = `q${q.id}_c${idx}`;
          const isChecked = !!state.checklist[key];
          return `
            <label class="checklist-item">
              <input type="checkbox" data-key="${key}" ${isChecked ? 'checked' : ''}>
              <span>${item}</span>
            </label>
          `;
        }).join('');

        checklistContainer.querySelectorAll('input[type="checkbox"]').forEach(ch => {
          ch.addEventListener('change', (e) => {
            state.checklist[e.target.dataset.key] = e.target.checked;
            saveState();
          });
        });
      }
    }

    // 9. Кнопки След/Пред
    const prevBtn = document.getElementById('btn-prev-question');
    const nextBtn = document.getElementById('btn-next-question');
    if (prevBtn) {
      prevBtn.disabled = q.id <= 1;
      prevBtn.onclick = () => openQuestionDetail(q.id - 1);
    }
    if (nextBtn) {
      nextBtn.disabled = q.id >= data.questions.length;
      nextBtn.onclick = () => openQuestionDetail(q.id + 1);
    }

    // Рендерим формулы KaTeX
    renderMath(summaryContainer);
    renderMath(formulasContainer);
    renderMath(titleEl);

    switchView('detail');
    setupDetailModeTabs(q.id);
  }

  /* ==========================================================================
     ФЛЕШ-КАРТОЧКИ (СВАЙПЫ, ЛИСТАНИЕ, ОПРЕДЕЛЕНИЯ И КВИЗ)
     ========================================================================== */
  function formatCardContent(content) {
    if (!content) return '';
    let str = String(content);

    const mathPlaceholders = [];

    // 1. Блочные формулы $$...$$
    str = str.replace(/\$\$([\s\S]+?)\$\$/g, (match, formula) => {
      let rendered = match;
      if (window.katex) {
        try {
          rendered = `<div class="katex-display">${window.katex.renderToString(formula.trim(), {
            displayMode: true,
            throwOnError: false,
            strict: false
          })}</div>`;
        } catch (e) {
          rendered = match;
        }
      }
      const idx = mathPlaceholders.push(rendered) - 1;
      return `@@FC_MATH_BLOCK_${idx}@@`;
    });

    // 2. Строчные формулы $...$
    str = str.replace(/\$([^\$\n\r]+?)\$/g, (match, formula) => {
      let rendered = match;
      if (window.katex) {
        try {
          rendered = window.katex.renderToString(formula.trim(), {
            displayMode: false,
            throwOnError: false,
            strict: false
          });
        } catch (e) {
          rendered = match;
        }
      }
      const idx = mathPlaceholders.push(rendered) - 1;
      return `@@FC_MATH_INLINE_${idx}@@`;
    });

    // 3. Безопасный перевод строк вне формул (формулы защищены плейсхолдерами)
    str = str.replace(/\n/g, '<br>');

    // 4. Восстановление исходных/отрендеренных формул
    str = str.replace(/@@FC_MATH_BLOCK_(\d+)@@/g, (_, i) => mathPlaceholders[Number(i)]);
    str = str.replace(/@@FC_MATH_INLINE_(\d+)@@/g, (_, i) => mathPlaceholders[Number(i)]);

    return str;
  }

  function getDefinitionCards() {
    return (data.glossary || []).map(g => {
      let formulaBlock = '';
      if (g.formula && g.formula.trim()) {
        formulaBlock = `$$${g.formula.trim()}$$\n\n`;
      }
      return {
        id: 'def_' + g.id,
        partId: 'definitions',
        isDefinition: true,
        front: `<div class="fc-def-category">${g.category || 'Определение'}</div><div class="fc-def-term">${g.term}</div><div class="fc-def-hint">Назовите точное физическое определение и формулу</div>`,
        back: `<div class="fc-def-back-header">${g.term}</div><strong>Определение:</strong>\n${g.shortDef}\n\n${formulaBlock}<strong>Физический смысл:</strong>\n${g.fullDef}`
      };
    });
  }

  function initFlashcardsDeck() {
    const filter = document.getElementById('fc-part-filter')?.value || 'all';
    
    if (filter === 'all') {
      activeFlashcardDeck = [...data.flashcards];
    } else if (filter === 'definitions') {
      activeFlashcardDeck = getDefinitionCards();
    } else if (filter === 'all_with_defs') {
      activeFlashcardDeck = [...data.flashcards, ...getDefinitionCards()];
    } else {
      const partId = parseInt(filter, 10);
      activeFlashcardDeck = data.flashcards.filter(fc => fc.partId === partId);
    }

    activeFlashcardIndex = 0;
    renderCurrentFlashcard();
  }

  function renderCurrentFlashcard() {
    if (activeFlashcardDeck.length === 0) return;
    const card = activeFlashcardDeck[activeFlashcardIndex];
    if (!card) return;

    isCardFlipped = false;
    const cardEl = document.getElementById('active-flashcard');
    if (cardEl) {
      cardEl.classList.remove('flipped');
    }

    const frontEl = document.getElementById('fc-front-text');
    const backEl = document.getElementById('fc-back-text');
    const frontTagEl = document.getElementById('fc-front-tag');
    const backTagEl = document.getElementById('fc-back-tag');
    const currentIdxEl = document.getElementById('fc-current-idx');
    const totalCountEl = document.getElementById('fc-total-count');
    const progressFillEl = document.getElementById('fc-progress-fill');

    if (frontTagEl) {
      frontTagEl.textContent = card.isDefinition ? 'ТЕРМИН / ОПРЕДЕЛЕНИЕ' : 'ВОПРОС / ТЕРМИН';
    }
    if (backTagEl) {
      backTagEl.textContent = card.isDefinition ? 'ОПРЕДЕЛЕНИЕ И ФОРМУЛА' : 'ОТВЕТ / СУТЬ';
    }

    if (frontEl) {
      frontEl.innerHTML = formatCardContent(card.front);
      renderMath(frontEl);
    }
    if (backEl) {
      backEl.innerHTML = formatCardContent(card.back);
      renderMath(backEl);
    }
    if (currentIdxEl) currentIdxEl.textContent = activeFlashcardIndex + 1;
    if (totalCountEl) totalCountEl.textContent = activeFlashcardDeck.length;

    if (progressFillEl) {
      const pct = Math.round(((activeFlashcardIndex + 1) / activeFlashcardDeck.length) * 100);
      progressFillEl.style.width = `${pct}%`;
    }
  }

  function flipFlashcard() {
    isCardFlipped = !isCardFlipped;
    const cardEl = document.getElementById('active-flashcard');
    if (cardEl) cardEl.classList.toggle('flipped', isCardFlipped);
    if (isCardFlipped) {
      const backEl = document.getElementById('fc-back-text');
      if (backEl) renderMath(backEl);
    }
  }

  let isCardTransitioning = false;

  function triggerCardTransition(direction, callback) {
    if (isCardTransitioning) return;
    isCardTransitioning = true;

    const trackEl = document.getElementById('fc-card-track');
    const cardEl = document.getElementById('active-flashcard');
    
    if (!trackEl || !cardEl) {
      if (callback) callback();
      isCardTransitioning = false;
      return;
    }

    const outClass = direction === 'left' ? 'slide-out-left' : 'slide-out-right';
    const inClass = direction === 'left' ? 'slide-in-right' : 'slide-in-left';
    
    // Мгновенно отключаем 3D-анимацию на самой карточке, чтобы она не раскручивалась на глазах у пользователя
    cardEl.style.transition = 'none';
    trackEl.classList.add(outClass);

    setTimeout(() => {
      // Пока трек скрыт за экраном: меняем контент карточки и сбрасываем переворот без анимации
      if (callback) callback();
      
      isCardFlipped = false;
      cardEl.classList.remove('flipped');
      void cardEl.offsetHeight; // Принудительный reflow

      // Восстанавливаем плавную анимацию для обычного клика/переворота
      cardEl.style.transition = '';

      trackEl.classList.remove(outClass);
      trackEl.classList.add(inClass);

      setTimeout(() => {
        trackEl.classList.remove(inClass);
        isCardTransitioning = false;
      }, 230);
    }, 160);
  }

  function nextFlashcard() {
    if (activeFlashcardDeck.length === 0) return;
    activeFlashcardIndex = (activeFlashcardIndex + 1) % activeFlashcardDeck.length;
    renderCurrentFlashcard();
  }

  function prevFlashcard() {
    if (activeFlashcardDeck.length === 0) return;
    activeFlashcardIndex = (activeFlashcardIndex - 1 + activeFlashcardDeck.length) % activeFlashcardDeck.length;
    renderCurrentFlashcard();
  }

  function rateFlashcard(rating) {
    if (activeFlashcardDeck.length === 0) return;
    const card = activeFlashcardDeck[activeFlashcardIndex];
    if (card && card.id) {
      state.fcStatus[card.id] = rating;
      saveState();
    }
    triggerCardTransition('left', nextFlashcard);
  }

  /* ==========================================================================
     ТРЕНАЖЕР БИЛЕТОВ (DUOLINGO & ХОЧУ ВОДИТЬ СТИЛЬ)
     ========================================================================== */
  function renderQuizSelector() {
    const hub = document.getElementById('quiz-hub-container');
    const selector = document.getElementById('quiz-parts-selector');
    const player = document.getElementById('quiz-player-container');
    const results = document.getElementById('quiz-result-container');
    const sheet = document.getElementById('duo-sheet');

    if (player) player.style.display = 'none';
    if (results) results.style.display = 'none';
    if (sheet) sheet.style.display = 'none';
    if (hub) hub.style.display = 'block';

    updateGamificationUI();

    // Обновляем бейдж общего числа вопросов в сайдбаре
    const totalBankQuestions = data.quizzes.reduce((acc, q) => acc + q.questions.length, 0);
    const badgeTotal = document.getElementById('badge-quiz-total');
    if (badgeTotal) badgeTotal.textContent = `${totalBankQuestions} билетов`;

    // 1. Инициализируем карточки режимов (Хочу Водить)
    document.querySelectorAll('.training-mode-card').forEach(card => {
      card.onclick = () => {
        const mode = card.dataset.mode;
        startTrainingMode(mode);
      };
    });

    // 2. Рендерим список тем с количеством вопросов и звездами
    if (selector) {
      selector.innerHTML = data.modules.map(m => {
        const quizObj = data.quizzes.find(q => q.partId === m.id);
        const qCount = quizObj ? quizObj.questions.length : 0;
        const best = state.quizScores[m.id];
        
        let starStr = '☆☆☆';
        let bestStr = 'Не пройден';
        if (best) {
          bestStr = `Рекорд: ${best.score}/${best.total} (${best.pct}%)`;
          if (best.pct >= 90) starStr = '⭐⭐⭐';
          else if (best.pct >= 70) starStr = '⭐⭐☆';
          else if (best.pct >= 50) starStr = '⭐☆☆';
        }

        return `
          <div class="quiz-part-card" data-part-id="${m.id}">
            <div style="font-size:26px;margin-bottom:8px;">${m.icon}</div>
            <h3>${m.title}</h3>
            <div class="quiz-part-meta">
              <span><b>${qCount}</b> вопросов</span>
              <span style="font-size:14px;letter-spacing:2px;">${starStr}</span>
            </div>
            <div style="margin-top:6px;font-size:11px;color:${best && best.pct >= 70 ? 'var(--accent-green)' : 'var(--text-muted)'};font-weight:600;">
              ${bestStr}
            </div>
          </div>
        `;
      }).join('');

      selector.querySelectorAll('.quiz-part-card').forEach(card => {
        card.addEventListener('click', (e) => {
          e.stopPropagation();
          const pid = parseInt(card.dataset.partId, 10);
          startTrainingMode('topics', pid);
        });
      });
    }
  }

  function startTrainingMode(mode, partId = 1) {
    activeQuizMode = mode;
    currentQuizPartId = partId;
    currentQuizStep = 0;
    currentQuizScore = 0;
    currentQuizXpGained = 0;

    const allQuizzesQuestions = data.quizzes.flatMap(q => q.questions);

    if (mode === 'topics') {
      const quizObj = data.quizzes.find(q => q.partId === partId);
      activeQuestions = quizObj ? [...quizObj.questions] : [];
    } else if (mode === 'marathon') {
      activeQuestions = [...allQuizzesQuestions].sort(() => Math.random() - 0.5);
    } else if (mode === 'mistakes') {
      activeQuestions = allQuizzesQuestions.filter(q => state.mistakes.includes(q.id));
      if (activeQuestions.length === 0) {
        alert('🎉 Отлично! У вас нет активных ошибок. Выберите тему или Марафон для тренировки!');
        return;
      }
      activeQuestions.sort(() => Math.random() - 0.5);
    } else if (mode === 'exam') {
      currentExamLives = 2; // Максимум 2 ошибки!
      activeQuestions = [...allQuizzesQuestions].sort(() => Math.random() - 0.5).slice(0, 20);
    } else if (mode === 'express') {
      activeQuestions = [...allQuizzesQuestions].sort(() => Math.random() - 0.5).slice(0, 10);
    }

    if (activeQuestions.length === 0) {
      alert('Вопросы для выбранного режима не найдены.');
      return;
    }

    const hub = document.getElementById('quiz-hub-container');
    const player = document.getElementById('quiz-player-container');
    const results = document.getElementById('quiz-result-container');
    const sheet = document.getElementById('duo-sheet');

    if (hub) hub.style.display = 'none';
    if (results) results.style.display = 'none';
    if (sheet) sheet.style.display = 'none';
    if (player) player.style.display = 'block';

    renderQuizStep();
  }

  function renderQuizStep() {
    if (!activeQuestions[currentQuizStep]) {
      finishQuiz();
      return;
    }

    const q = activeQuestions[currentQuizStep];
    const total = activeQuestions.length;

    // Скрыть всплывающий нижний баннер Duolingo
    const sheet = document.getElementById('duo-sheet');
    if (sheet) sheet.style.display = 'none';

    // Шаг и прогресс
    const stepCounter = document.getElementById('duo-step-counter');
    const fillBar = document.getElementById('quiz-progress-fill');
    const topicBadge = document.getElementById('quiz-topic-badge');
    const qText = document.getElementById('quiz-question-text');
    const heartsBox = document.getElementById('duo-hearts-box');
    const heartsText = document.getElementById('duo-hearts-text');

    if (stepCounter) stepCounter.textContent = `${currentQuizStep + 1} / ${total}`;
    if (fillBar) fillBar.style.width = `${Math.round((currentQuizStep / total) * 100)}%`;

    if (topicBadge) {
      if (activeQuizMode === 'topics') {
        const mod = data.modules.find(m => m.id === currentQuizPartId);
        topicBadge.textContent = mod ? mod.title : 'Тема';
      } else if (activeQuizMode === 'marathon') {
        topicBadge.textContent = `🏎️ Марафон • Вопрос ${currentQuizStep + 1} из ${total}`;
      } else if (activeQuizMode === 'mistakes') {
        topicBadge.textContent = `🛠️ Работа над ошибками • Вопрос ${currentQuizStep + 1} из ${total}`;
      } else if (activeQuizMode === 'exam') {
        topicBadge.textContent = `🏆 Экзамен ГАИ / Сессия • Билет ${currentQuizStep + 1} из 20`;
      } else if (activeQuizMode === 'express') {
        topicBadge.textContent = `⚡ Экспресс • Вопрос ${currentQuizStep + 1} из 10`;
      }
    }

    if (heartsBox && heartsText) {
      if (activeQuizMode === 'exam') {
        heartsBox.style.display = 'flex';
        heartsText.textContent = currentExamLives;
      } else {
        heartsBox.style.display = 'none';
      }
    }

    if (qText) {
      qText.textContent = q.text;
      renderMath(qText);
    }

    // Опции ответов (Duolingo 3D стиль)
    const optionsContainer = document.getElementById('quiz-options-list');
    if (optionsContainer) {
      optionsContainer.innerHTML = q.options.map((opt, idx) => `
        <button class="duo-option-btn" data-idx="${idx}">
          <span class="duo-num-badge">${idx + 1}</span>
          <span class="duo-opt-text">${opt}</span>
        </button>
      `).join('');

      renderMath(optionsContainer);

      optionsContainer.querySelectorAll('.duo-option-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const chosen = parseInt(btn.dataset.idx, 10);
          handleQuizAnswer(q, chosen, btn, optionsContainer);
        });
      });
    }
  }

  function handleQuizAnswer(q, chosenIdx, clickedBtn, container) {
    // Блокируем все варианты
    container.querySelectorAll('.duo-option-btn').forEach(b => b.classList.add('disabled'));

    const isCorrect = (chosenIdx === q.correctIndex);
    const sheet = document.getElementById('duo-sheet');
    const sheetIcon = document.getElementById('duo-sheet-icon');
    const sheetTitle = document.getElementById('duo-sheet-title');
    const sheetMsg = document.getElementById('duo-sheet-msg');
    const sheetBtn = document.getElementById('btn-quiz-next');

    if (isCorrect) {
      clickedBtn.classList.add('correct');
      currentQuizScore++;
      currentQuizXpGained += 10;
      state.xp += 10;

      // Если был в ошибках — убираем его
      const errIdx = state.mistakes.indexOf(q.id);
      if (errIdx !== -1) {
        state.mistakes.splice(errIdx, 1);
      }

      if (sheet) {
        sheet.className = 'duo-action-sheet sheet-correct';
        if (sheetIcon) sheetIcon.textContent = '🎉';
        if (sheetTitle) sheetTitle.textContent = 'Великолепно! +10 XP';
        if (sheetMsg) {
          sheetMsg.innerHTML = q.explanation;
          renderMath(sheetMsg);
        }
      }
    } else {
      clickedBtn.classList.add('wrong');
      const correctBtn = container.querySelector(`[data-idx="${q.correctIndex}"]`);
      if (correctBtn) correctBtn.classList.add('correct');

      // Добавляем в ошибки
      if (!state.mistakes.includes(q.id)) {
        state.mistakes.push(q.id);
      }

      if (activeQuizMode === 'exam') {
        currentExamLives--;
        const heartsText = document.getElementById('duo-hearts-text');
        if (heartsText) heartsText.textContent = Math.max(0, currentExamLives);
      }

      if (sheet) {
        sheet.className = 'duo-action-sheet sheet-wrong';
        if (sheetIcon) sheetIcon.textContent = '❌';
        if (sheetTitle) {
          if (activeQuizMode === 'exam' && currentExamLives < 0) {
            sheetTitle.textContent = 'Экзамен провален! Превышен лимит ошибок.';
          } else {
            sheetTitle.textContent = 'Неверно!';
          }
        }
        if (sheetMsg) {
          sheetMsg.innerHTML = `<b>Правильный ответ:</b> ${q.options[q.correctIndex]}<br><br>${q.explanation}`;
          renderMath(sheetMsg);
        }
      }
    }

    saveState();

    // Настраиваем кнопку в нижней шторке Duolingo
    const isLast = (currentQuizStep >= activeQuestions.length - 1) || (activeQuizMode === 'exam' && currentExamLives < 0);
    if (sheetBtn) {
      sheetBtn.textContent = isLast ? 'Посмотреть результаты 🏁' : 'Продолжить →';
      sheetBtn.onclick = () => {
        if (isLast) {
          finishQuiz();
        } else {
          currentQuizStep++;
          renderQuizStep();
        }
      };
    }

    if (sheet) sheet.style.display = 'block';
  }

  function finishQuiz() {
    const total = activeQuestions.length;
    const pct = total > 0 ? Math.round((currentQuizScore / total) * 100) : 0;

    // Если был режим темы, сохраняем лучший результат
    if (activeQuizMode === 'topics') {
      const oldBest = state.quizScores[currentQuizPartId];
      if (!oldBest || pct > oldBest.pct) {
        state.quizScores[currentQuizPartId] = { score: currentQuizScore, total, pct };
        saveState();
      }
    }

    const player = document.getElementById('quiz-player-container');
    const sheet = document.getElementById('duo-sheet');
    const results = document.getElementById('quiz-result-container');

    if (player) player.style.display = 'none';
    if (sheet) sheet.style.display = 'none';
    if (results) results.style.display = 'block';

    const scoreEl = document.getElementById('quiz-result-score');
    const pctEl = document.getElementById('quiz-result-pct');
    const badgeEl = document.getElementById('quiz-result-badge');
    const titleEl = document.getElementById('quiz-result-title');
    const feedbackEl = document.getElementById('quiz-result-feedback');
    const xpGainedEl = document.getElementById('quiz-xp-gained');
    const starsEl = document.getElementById('quiz-stars-display');
    const fixErrorsBtn = document.getElementById('btn-quiz-fix-errors');

    if (scoreEl) scoreEl.textContent = `${currentQuizScore} / ${total}`;
    if (pctEl) pctEl.textContent = `${pct}%`;
    if (xpGainedEl) xpGainedEl.textContent = currentQuizXpGained;

    let starStr = '☆☆☆';
    if (pct >= 90) starStr = '⭐⭐⭐';
    else if (pct >= 70) starStr = '⭐⭐☆';
    else if (pct >= 50) starStr = '⭐☆☆';
    if (starsEl) starsEl.textContent = starStr;

    if (activeQuizMode === 'exam') {
      const passed = (currentExamLives >= 0) && (pct >= 70);
      if (titleEl) titleEl.textContent = passed ? '🎉 Экзамен успешно сдан!' : '⚠️ Экзамен не сдан';
      if (badgeEl) badgeEl.textContent = passed ? '🎓' : '❌';
      if (feedbackEl) {
        feedbackEl.textContent = passed
          ? `Отличная работа! Допущено ошибок: ${2 - currentExamLives}. Вы полностью готовы к реальному экзамену на кафедре!`
          : `К сожалению, лимит ошибок исчерпан (${2 - currentExamLives} ошибок). Рекомендуем потренировать сложные вопросы в «Работе над ошибками».`;
      }
    } else {
      if (pct >= 85) {
        if (titleEl) titleEl.textContent = 'Блестящая победа!';
        if (badgeEl) badgeEl.textContent = '🏆';
        if (feedbackEl) feedbackEl.textContent = 'Вы продемонстрировали великолепное знание физики и схемотехники!';
      } else if (pct >= 65) {
        if (titleEl) titleEl.textContent = 'Хороший результат!';
        if (badgeEl) badgeEl.textContent = '👍';
        if (feedbackEl) feedbackEl.textContent = 'Материал освоен, но есть мелкие неточности. Повторите ошибки для закрепления на 100%.';
      } else {
        if (titleEl) titleEl.textContent = 'Нужно потренироваться';
        if (badgeEl) badgeEl.textContent = '📚';
        if (feedbackEl) feedbackEl.textContent = 'Рекомендуется еще раз изучить конспект темы и повторить флеш-карты.';
      }
    }

    if (fixErrorsBtn) {
      fixErrorsBtn.style.display = state.mistakes.length > 0 ? 'inline-block' : 'none';
      fixErrorsBtn.onclick = () => startTrainingMode('mistakes');
    }

    const retryBtn = document.getElementById('btn-quiz-retry');
    if (retryBtn) {
      retryBtn.onclick = () => startTrainingMode(activeQuizMode, currentQuizPartId);
    }

    const finishBtn = document.getElementById('btn-quiz-finish');
    if (finishBtn) {
      finishBtn.onclick = () => renderQuizSelector();
    }
  }

  /* ==========================================================================
     СИМУЛЯТОР ЭКЗАМЕНА
     ========================================================================== */
  function generateNewTicket() {
    // Случайный билет из пула или случайная комбинация вопросов
    const randIdx = Math.floor(Math.random() * data.examTickets.length);
    currentTicket = data.examTickets[randIdx];

    const q1 = data.questions.find(q => q.id === currentTicket.q1_id);
    const q2 = data.questions.find(q => q.id === currentTicket.q2_id);

    const badgeEl = document.getElementById('ticket-number-badge');
    const q1TitleEl = document.getElementById('ticket-q1-title');
    const q2TitleEl = document.getElementById('ticket-q2-title');
    const q3TaskEl = document.getElementById('ticket-q3-task');
    const solTextEl = document.getElementById('ticket-solution-text');
    const solBox = document.getElementById('ticket-solution-box');

    if (badgeEl) badgeEl.textContent = currentTicket.title;
    if (q1TitleEl) q1TitleEl.textContent = `${q1.id}. ${q1.title}`;
    if (q2TitleEl) q2TitleEl.textContent = `${q2.id}. ${q2.title}`;
    if (q3TaskEl) q3TaskEl.textContent = currentTicket.practical;
    if (solTextEl) solTextEl.textContent = currentTicket.solution;
    if (solBox) solBox.style.display = 'none';

    // Кнопки ссылок на конспекты
    document.querySelectorAll('.hint-btn').forEach(btn => {
      btn.onclick = () => {
        const target = btn.dataset.target === 'q1' ? q1.id : q2.id;
        openQuestionDetail(target);
      };
    });

    // Сброс таймера на 20 минут
    resetExamTimer();
  }

  function resetExamTimer() {
    clearInterval(examTimerInterval);
    examTimerRunning = false;
    examTimerSeconds = 20 * 60;
    updateTimerDisplay();
    const btn = document.getElementById('btn-timer-toggle');
    if (btn) btn.textContent = 'Старт таймера';
  }

  function toggleExamTimer() {
    if (examTimerRunning) {
      clearInterval(examTimerInterval);
      examTimerRunning = false;
      const btn = document.getElementById('btn-timer-toggle');
      if (btn) btn.textContent = 'Продолжить';
    } else {
      examTimerRunning = true;
      const btn = document.getElementById('btn-timer-toggle');
      if (btn) btn.textContent = 'Пауза';

      examTimerInterval = setInterval(() => {
        examTimerSeconds--;
        if (examTimerSeconds <= 0) {
          clearInterval(examTimerInterval);
          examTimerRunning = false;
          examTimerSeconds = 0;
          alert('⏰ Время подготовки к ответу на билет истекло! Пора отвечать.');
        }
        updateTimerDisplay();
      }, 1000);
    }
  }

  function updateTimerDisplay() {
    const mins = Math.floor(examTimerSeconds / 60);
    const secs = examTimerSeconds % 60;
    const str = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    const el = document.getElementById('exam-timer-digits');
    if (el) el.textContent = str;
  }

  function recordExamGrade(grade) {
    if (!currentTicket) return;
    const record = {
      date: new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
      ticketNum: currentTicket.num,
      grade: grade
    };
    state.examHistory.unshift(record);
    if (state.examHistory.length > 10) state.examHistory.pop();
    saveState();
    renderExamHistory();

    alert(`Оценка ${grade} зафиксирована в журнале сдачи!`);
  }

  function renderExamHistory() {
    const container = document.getElementById('exam-history-list');
    if (!container) return;

    if (state.examHistory.length === 0) {
      container.innerHTML = '<div class="empty-hint">Вы еще не сдали ни одного пробного билета.</div>';
      return;
    }

    container.innerHTML = state.examHistory.map(item => `
      <div class="history-item">
        <span><b>Билет №${item.ticketNum}</b> (${item.date})</span>
        <span class="grade-btn g${item.grade}" style="padding:4px 10px;font-size:12px;">Оценка: ${item.grade}</span>
      </div>
    `).join('');
  }

  /* ==========================================================================
     ШПАРГАЛКА
     ========================================================================== */
  function renderCheatsheet() {
    const container = document.getElementById('cheatsheet-cards-grid');
    if (!container) return;

    const query = (document.getElementById('cheat-search-input')?.value || '').trim().toLowerCase();

    const filtered = data.questions.filter(q => {
      if (!query) return true;
      const matchTitle = q.title.toLowerCase().includes(query);
      const matchFull = q.fullQuestion.toLowerCase().includes(query);
      const matchFormulas = q.formulas?.some(f => f.formula.toLowerCase().includes(query) || f.name.toLowerCase().includes(query));
      return matchTitle || matchFull || matchFormulas;
    });

    if (filtered.length === 0) {
      container.innerHTML = '<div class="empty-hint">По данному запросу ничего не найдено.</div>';
      return;
    }

    container.innerHTML = filtered.map(q => {
      const topFormulas = (q.formulas || []).slice(0, 2);
      return `
        <div class="cheat-card" onclick="window.openDetailFromCheat(${q.id})">
          <div class="cheat-card-top">
            <span class="q-tag">Часть ${q.partId} • №${q.id}</span>
            <span style="font-size:11px;color:var(--accent-blue);font-weight:600;">Конспект →</span>
          </div>
          <div class="cheat-q-title">${q.title}</div>
          ${topFormulas.map(f => `
            <div class="cheat-formula-row">
              <b>${f.name}:</b> ${f.formula}
            </div>
          `).join('')}
          <p class="cheat-summary-snippet">${q.fullQuestion.slice(0, 110)}...</p>
        </div>
      `;
    }).join('');
  }

  window.openDetailFromCheat = function(qid) {
    openQuestionDetail(qid);
  };

  /* ==========================================================================
     ТЕМА (Светлая / Темная)
     ========================================================================== */
  function initTheme() {
    applyTheme(state.theme);

    const toggleBtn = document.getElementById('btn-theme-toggle');
    const mobileBtn = document.getElementById('btn-mobile-theme');

    function toggle() {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      applyTheme(state.theme);
      saveState();
    }

    if (toggleBtn) toggleBtn.addEventListener('click', toggle);
    if (mobileBtn) mobileBtn.addEventListener('click', toggle);
  }

  function applyTheme(theme) {
    if (theme === 'light') {
      document.body.classList.remove('dark-theme');
      document.body.classList.add('light-theme');
      const actionText = document.querySelector('.sidebar-action-btn .action-text');
      if (actionText) actionText.textContent = 'Светлая тема';
      const themeIcon = document.querySelector('.sidebar-action-btn .theme-icon');
      if (themeIcon) themeIcon.textContent = '☀️';
      const mobIcon = document.getElementById('btn-mobile-theme');
      if (mobIcon) mobIcon.textContent = '☀️';
    } else {
      document.body.classList.remove('light-theme');
      document.body.classList.add('dark-theme');
      const actionText = document.querySelector('.sidebar-action-btn .action-text');
      if (actionText) actionText.textContent = 'Темная тема';
      const themeIcon = document.querySelector('.sidebar-action-btn .theme-icon');
      if (themeIcon) themeIcon.textContent = '🌙';
      const mobIcon = document.getElementById('btn-mobile-theme');
      if (mobIcon) mobIcon.textContent = '🌙';
    }
  }

  /* ==========================================================================
     ГОЛОСОВОЙ ДВИЖОК (Чтение конспекта вслух)
     ========================================================================== */
  function toggleSpeech() {
    if (!speechSynth) {
      alert('Голосовой движок не поддерживается в этом браузере.');
      return;
    }

    const btn = document.getElementById('btn-read-aloud');

    if (isSpeaking) {
      speechSynth.cancel();
      isSpeaking = false;
      if (btn) btn.textContent = '🔊 Голос';
      return;
    }

    const q = data.questions.find(item => item.id === currentQuestionId);
    if (!q) return;

    // Извлечение чистого текста из summary
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = q.summary;
    const textToRead = `${q.title}. ${tempDiv.innerText}`;

    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = 'ru-RU';
    utterance.rate = 1.05;

    utterance.onend = () => {
      isSpeaking = false;
      if (btn) btn.textContent = '🔊 Голос';
    };

    utterance.onerror = () => {
      isSpeaking = false;
      if (btn) btn.textContent = '🔊 Голос';
    };

    speechSynth.speak(utterance);
    isSpeaking = true;
    if (btn) btn.textContent = '⏹ Стоп';
  }

  /* ==========================================================================
     МОДАЛКА УСТАНОВКИ PWA
     ========================================================================== */
  function setupInstallModal() {
    const modal = document.getElementById('install-modal');
    const openBtn1 = document.getElementById('btn-install-pwa');
    const openBtn2 = document.getElementById('btn-mobile-install');
    const closeBtn = document.getElementById('btn-close-modal');
    const doneBtn = document.getElementById('btn-modal-done');

    function openModal() {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choice) => {
          if (choice.outcome === 'accepted') {
            console.log('User installed PWA');
          }
          deferredPrompt = null;
        });
      } else {
        if (modal) modal.style.display = 'flex';
      }
    }

    function closeModal() {
      if (modal) modal.style.display = 'none';
    }

    if (openBtn1) openBtn1.addEventListener('click', openModal);
    if (openBtn2) openBtn2.addEventListener('click', openModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (doneBtn) doneBtn.addEventListener('click', closeModal);
  }

  /* ==========================================================================
     ГОРЯЧИЕ КЛАВИШИ (Keyboard Shortcuts)
     ========================================================================== */
  function setupKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Игнорируем если фокус в инпуте
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;

      if (e.code === 'Space') {
        if (currentView === 'flashcards') {
          e.preventDefault();
          flipFlashcard();
        }
      } else if (e.code === 'ArrowRight') {
        if (currentView === 'flashcards') {
          triggerCardTransition('left', nextFlashcard);
        } else if (currentView === 'detail') {
          if (currentQuestionId < data.questions.length) openQuestionDetail(currentQuestionId + 1);
        }
      } else if (e.code === 'ArrowLeft') {
        if (currentView === 'flashcards') {
          triggerCardTransition('right', prevFlashcard);
        } else if (currentView === 'detail') {
          if (currentQuestionId > 1) openQuestionDetail(currentQuestionId - 1);
        }
      } else if (e.key === '1') {
        if (currentView === 'flashcards') rateFlashcard('bad');
      } else if (e.key === '2') {
        if (currentView === 'flashcards') rateFlashcard('ok');
      } else if (e.key === '3') {
        if (currentView === 'flashcards') rateFlashcard('good');
      } else if (e.key === 'Escape') {
        const modal = document.getElementById('install-modal');
        if (modal) modal.style.display = 'none';
      }
    });
  }

  /* ==========================================================================
     ИНИЦИАЛИЗАЦИЯ И ОБРАБОТЧИКИ СОБЫТИЙ
     ========================================================================== */
  function initEvents() {
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

    // 1. Сайдбар клики
    document.querySelectorAll('#desktop-sidebar .nav-item').forEach(btn => {
      btn.addEventListener('click', () => switchView(btn.dataset.view));
    });

    // 2. Мобильный таббар клики
    document.querySelectorAll('#mobile-tabbar .tabbar-item').forEach(btn => {
      btn.addEventListener('click', () => switchView(btn.dataset.view));
    });

    // 3. Быстрые действия на дашборде
    document.querySelectorAll('.action-card').forEach(card => {
      card.addEventListener('click', () => {
        const action = card.dataset.action;
        if (action === 'cards') switchView('flashcards');
        if (action === 'quiz') switchView('quiz');
        if (action === 'exam') switchView('exam');
      });
    });

    // 4. Поиск в каталоге
    const searchInput = document.getElementById('catalog-search-input');
    const searchClear = document.getElementById('catalog-search-clear');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        if (searchClear) searchClear.style.display = searchInput.value ? 'block' : 'none';
        renderCatalog();
      });
    }
    if (searchClear) {
      searchClear.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        searchClear.style.display = 'none';
        renderCatalog();
      });
    }

    // 5. Фильтры статуса в каталоге
    document.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        state.currentStatusFilter = chip.dataset.filter;
        renderCatalog();
      });
    });

    // 6. Кнопка Назад в деталях
    const backBtn = document.getElementById('btn-detail-back');
    if (backBtn) {
      backBtn.addEventListener('click', () => switchView('catalog'));
    }

    // 7. Кнопки статуса вопроса в деталях
    document.querySelectorAll('.status-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.status-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.questionStatus[currentQuestionId] = btn.dataset.status;
        saveState();
        renderCatalog();
      });
    });

    // 8. Кнопка избранного в деталях
    const favBtn = document.getElementById('btn-toggle-favorite');
    if (favBtn) {
      favBtn.addEventListener('click', () => {
        const idx = state.favorites.indexOf(currentQuestionId);
        if (idx === -1) {
          state.favorites.push(currentQuestionId);
        } else {
          state.favorites.splice(idx, 1);
        }
        favBtn.classList.toggle('active', state.favorites.includes(currentQuestionId));
        favBtn.textContent = state.favorites.includes(currentQuestionId) ? '★ В избранном' : '☆ В избранное';
        saveState();
      });
    }

    // 9. Озвучка
    const readAloudBtn = document.getElementById('btn-read-aloud');
    if (readAloudBtn) readAloudBtn.addEventListener('click', toggleSpeech);

    // 10. Поделиться
    const shareBtn = document.getElementById('btn-share-question');
    if (shareBtn) {
      shareBtn.addEventListener('click', () => {
        const q = data.questions.find(item => item.id === currentQuestionId);
        if (navigator.share && q) {
          navigator.share({
            title: `Вопрос №${q.id}: ${q.title}`,
            text: q.fullQuestion,
            url: window.location.href
          }).catch(() => {});
        } else {
          navigator.clipboard.writeText(window.location.href);
          alert('Ссылка на вопрос скопирована в буфер обмена!');
        }
      });
    }

    // 11. Флеш-карточки: клики, свайпы, навигация и фильтр
    const flashcardEl = document.getElementById('active-flashcard');
    const trackEl = document.getElementById('fc-card-track');
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;
    let gestureMode = null; // null | 'vertical' | 'horizontal'
    let lastTouchEndTime = 0;

    if (flashcardEl) {
      flashcardEl.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) return;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchStartTime = Date.now();
        gestureMode = null;
      }, { passive: true });

      flashcardEl.addEventListener('touchmove', (e) => {
        if (e.touches.length !== 1 || !touchStartX) return;
        const currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;
        const diffX = currentX - touchStartX;
        const diffY = currentY - touchStartY;
        const absX = Math.abs(diffX);
        const absY = Math.abs(diffY);

        // Определяем направление жеста при превышении порога в 8px
        if (!gestureMode && (absX > 8 || absY > 8)) {
          if (absY >= absX) {
            gestureMode = 'vertical'; // Пользователь скроллит текст карточки
          } else {
            gestureMode = 'horizontal'; // Пользователь листает карточку
          }
        }

        if (gestureMode === 'horizontal') {
          const activeTrack = trackEl || flashcardEl;
          const rot = diffX * 0.035;
          activeTrack.style.transition = 'none';
          activeTrack.style.transform = `translateX(${diffX}px) rotate(${rot}deg)`;
        }
      }, { passive: true });

      flashcardEl.addEventListener('touchend', (e) => {
        lastTouchEndTime = Date.now();
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const diffX = touchEndX - touchStartX;
        const diffY = touchEndY - touchStartY;
        const elapsed = Date.now() - touchStartTime;
        const totalMovement = Math.hypot(diffX, diffY);

        const activeTrack = trackEl || flashcardEl;
        activeTrack.style.transition = '';
        activeTrack.style.transform = '';

        // 1. Если был вертикальный скролл — НИ В КОЕМ СЛУЧАЕ НЕ ПЕРЕВОРАЧИВАЕМ КАРТОЧКУ!
        if (gestureMode === 'vertical' || Math.abs(diffY) > 16) {
          gestureMode = null;
          return;
        }

        // 2. Если был горизонтальный свайп
        if (gestureMode === 'horizontal' || (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY))) {
          gestureMode = null;
          if (diffX < -45 || (diffX < -25 && elapsed < 320)) {
            triggerCardTransition('left', nextFlashcard);
          } else if (diffX > 45 || (diffX > 25 && elapsed < 320)) {
            triggerCardTransition('right', prevFlashcard);
          }
          return;
        }

        // 3. Короткий точный тап (переворот карточки)
        if (totalMovement < 12 && elapsed < 380) {
          flipFlashcard();
        }
        gestureMode = null;
      });

      flashcardEl.addEventListener('click', () => {
        // Подавляем эмулированный браузером клик после тача, чтобы не было двойного переворота
        if (Date.now() - lastTouchEndTime < 450) return;
        flipFlashcard();
      });
    }

    const fcPartFilter = document.getElementById('fc-part-filter');
    if (fcPartFilter) {
      fcPartFilter.addEventListener('change', initFlashcardsDeck);
    }

    const btnFcPrev = document.getElementById('btn-fc-prev');
    const btnFcNext = document.getElementById('btn-fc-next');
    const btnFcFlip = document.getElementById('btn-fc-flip');
    const btnFcArrowPrev = document.getElementById('btn-fc-arrow-prev');
    const btnFcArrowNext = document.getElementById('btn-fc-arrow-next');

    if (btnFcPrev) btnFcPrev.addEventListener('click', () => triggerCardTransition('right', prevFlashcard));
    if (btnFcNext) btnFcNext.addEventListener('click', () => triggerCardTransition('left', nextFlashcard));
    if (btnFcFlip) btnFcFlip.addEventListener('click', flipFlashcard);
    if (btnFcArrowPrev) btnFcArrowPrev.addEventListener('click', () => triggerCardTransition('right', prevFlashcard));
    if (btnFcArrowNext) btnFcArrowNext.addEventListener('click', () => triggerCardTransition('left', nextFlashcard));

    const btnFcBad = document.getElementById('btn-fc-bad');
    const btnFcOk = document.getElementById('btn-fc-ok');
    const btnFcGood = document.getElementById('btn-fc-good');
    if (btnFcBad) btnFcBad.addEventListener('click', () => rateFlashcard('bad'));
    if (btnFcOk) btnFcOk.addEventListener('click', () => rateFlashcard('ok'));
    if (btnFcGood) btnFcGood.addEventListener('click', () => rateFlashcard('good'));

    const btnPracticeGlossary = document.getElementById('btn-practice-glossary-cards');
    if (btnPracticeGlossary) {
      btnPracticeGlossary.addEventListener('click', () => {
        switchView('flashcards');
        const filterEl = document.getElementById('fc-part-filter');
        if (filterEl) {
          filterEl.value = 'definitions';
          initFlashcardsDeck();
        }
      });
    }

    // 12. Квиз кнопки
    const exitQuizBtn = document.getElementById('btn-quiz-exit');
    const retryQuizBtn = document.getElementById('btn-quiz-retry');
    const finishQuizBtn = document.getElementById('btn-quiz-finish');
    if (exitQuizBtn) exitQuizBtn.addEventListener('click', renderQuizSelector);
    if (retryQuizBtn) retryQuizBtn.addEventListener('click', () => startQuizForPart(currentQuizPartId));
    if (finishQuizBtn) finishQuizBtn.addEventListener('click', renderQuizSelector);

    // 13. Экзамен
    const genTicketBtn = document.getElementById('btn-generate-ticket');
    const toggleTimerBtn = document.getElementById('btn-timer-toggle');
    const resetTimerBtn = document.getElementById('btn-timer-reset');
    const revealSolBtn = document.getElementById('btn-reveal-solution');

    if (genTicketBtn) genTicketBtn.addEventListener('click', generateNewTicket);
    if (toggleTimerBtn) toggleTimerBtn.addEventListener('click', toggleExamTimer);
    if (resetTimerBtn) resetTimerBtn.addEventListener('click', resetExamTimer);
    if (revealSolBtn) {
      revealSolBtn.addEventListener('click', () => {
        const box = document.getElementById('ticket-solution-box');
        if (box) box.style.display = box.style.display === 'none' ? 'block' : 'none';
      });
    }

    document.querySelectorAll('.grade-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const grade = parseInt(btn.dataset.grade, 10);
        recordExamGrade(grade);
      });
    });

    // 14. Шпаргалка поиск
    const cheatInput = document.getElementById('cheat-search-input');
    if (cheatInput) {
      cheatInput.addEventListener('input', renderCheatsheet);
    }

    // 15. Кнопки обновления приложения
    const updateNowBtn = document.getElementById('btn-update-now');
    const updateDismissBtn = document.getElementById('btn-update-dismiss');
    const checkUpdatesBtn = document.getElementById('btn-check-updates');

    if (updateNowBtn) updateNowBtn.addEventListener('click', applyAppUpdate);
    if (updateDismissBtn) updateDismissBtn.addEventListener('click', () => {
      const banner = document.getElementById('update-toast');
      if (banner) banner.style.display = 'none';
    });
    if (checkUpdatesBtn) checkUpdatesBtn.addEventListener('click', () => checkForAppUpdates(true));
  }

  // Запуск при загрузке страницы

  /* ==========================================================================
     ПОДСВЕТКА ТЕРМИНОВ В КОНСПЕКТЕ И ВСПЛЫВАЮЩИЙ ПОПОВЕР
     ========================================================================== */
  function linkifyGlossaryTerms(htmlText) {
    if (!data.glossary || !htmlText) return htmlText;

    const tokens = [];
    // Защищаем теги HTML и математические блоки KaTeX
    let safe = htmlText.replace(/(<[^>]+>|\$\$[^\$]+\$\$|\$[^\$]+\$)/g, (match) => {
      const placeholder = `___TOK_${tokens.length}___`;
      tokens.push(match);
      return placeholder;
    });

    // Сортируем термины по длине от длинных к коротким
    const sorted = [...data.glossary].sort((a, b) => b.term.length - a.term.length);
    for (const t of sorted) {
      const cleanTerm = t.term.split('(')[0].trim();
      if (cleanTerm.length < 3) continue;
      const escaped = cleanTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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


  /* ==========================================================================
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
              <p>${sec.text.replace(/\n/g, '<br>')}</p>
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
                      ${q.a.replace(/\n/g, '<br>')}
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

  // Глобальный интерфейс приложения для инлайн вызовов
  window.EXAM_APP = {
    openQuestion: openQuestionDetail,
    openTermPopover: openDefinitionPopover,
    openLecture: openLectureReader,
    closeReader: closeLectureReader,
    toggleLectureMastered,
    toggleSelfTest: toggleSelfTestAnswer,
    checkTaskAnswer,
    toggleTaskHint,
    toggleTaskSolution,
    toggleLabCard,
    selectLab,
    switchLabSubtab,
    toggleDefenseQuestion,
    setDefenseQuestionStatus,
    navigateLab
  };

  window.addEventListener('DOMContentLoaded', () => {
    initTheme();
    renderDashboardModules();
    renderCatalog();
    updateAllProgress();
    renderExamHistory();
    initEvents();
    setupInstallModal();
    setupKeyboardShortcuts();
    switchView('dashboard');
  });

})();
