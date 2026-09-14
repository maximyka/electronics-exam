/**
 * ЭЛЕКТРОНИКА И СХЕМОТЕХНИКА — ОСНОВНОЙ СКРИПТ ПРИЛОЖЕНИЯ
 * Логика PWA, роутинг, расчет процентов, конспекты, карточки, квизы, экзамен.
 */

(function() {
  'use strict';

  const CURRENT_APP_VERSION = '1.1.0';
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
    currentStatusFilter: 'all'
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

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Could not save state', e);
    }
    updateAllProgress();
  }

  // Текущее состояние вьюх
  let currentView = 'dashboard';
  let currentQuestionId = 1;
  let activeFlashcardIndex = 0;
  let activeFlashcardDeck = [];
  let isCardFlipped = false;
  
  // Квиз
  let currentQuizPartId = 1;
  let currentQuizStep = 0;
  let currentQuizScore = 0;

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

    // 5. Список формул
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

    switchView('detail');
  }

  /* ==========================================================================
     ФЛЕШ-КАРТОЧКИ
     ========================================================================== */
  function initFlashcardsDeck() {
    const filter = document.getElementById('fc-part-filter')?.value || 'all';
    
    if (filter === 'all') {
      activeFlashcardDeck = [...data.flashcards];
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
    const currentIdxEl = document.getElementById('fc-current-idx');
    const totalCountEl = document.getElementById('fc-total-count');
    const progressFillEl = document.getElementById('fc-progress-fill');

    if (frontEl) frontEl.textContent = card.front;
    if (backEl) backEl.textContent = card.back;
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
  }

  function rateFlashcard(rating) {
    if (activeFlashcardDeck.length === 0) return;
    const card = activeFlashcardDeck[activeFlashcardIndex];
    state.fcStatus[card.id] = rating;
    saveState();

    // Переход к следующей карточке
    activeFlashcardIndex = (activeFlashcardIndex + 1) % activeFlashcardDeck.length;
    renderCurrentFlashcard();
  }

  /* ==========================================================================
     КВИЗЫ И ТЕСТИРОВАНИЕ
     ========================================================================== */
  function renderQuizSelector() {
    const container = document.getElementById('quiz-parts-selector');
    const player = document.getElementById('quiz-player-container');
    const results = document.getElementById('quiz-result-container');

    if (player) player.style.display = 'none';
    if (results) results.style.display = 'none';
    if (!container) return;

    container.style.display = 'grid';
    container.innerHTML = data.modules.map(m => {
      const best = state.quizScores[m.id];
      let bestStr = 'Не пройден';
      if (best) bestStr = `Рекорд: ${best.score}/${best.total} (${best.pct}%)`;

      return `
        <div class="quiz-part-card" data-part-id="${m.id}">
          <div style="font-size:24px;margin-bottom:8px;">${m.icon}</div>
          <h3>${m.title}</h3>
          <div class="quiz-part-meta">
            <span>5 вопросов</span>
            <span style="color:${best && best.pct >= 80 ? 'var(--accent-green)' : 'var(--text-muted)'};font-weight:600;">${bestStr}</span>
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.quiz-part-card').forEach(card => {
      card.addEventListener('click', () => {
        const pid = parseInt(card.dataset.partId, 10);
        startQuizForPart(pid);
      });
    });
  }

  function startQuizForPart(partId) {
    currentQuizPartId = partId;
    currentQuizStep = 0;
    currentQuizScore = 0;

    const selector = document.getElementById('quiz-parts-selector');
    const player = document.getElementById('quiz-player-container');
    const results = document.getElementById('quiz-result-container');

    if (selector) selector.style.display = 'none';
    if (results) results.style.display = 'none';
    if (player) player.style.display = 'block';

    renderQuizStep();
  }

  function renderQuizStep() {
    const quizObj = data.quizzes.find(q => q.partId === currentQuizPartId);
    if (!quizObj || !quizObj.questions[currentQuizStep]) return;

    const q = quizObj.questions[currentQuizStep];
    const total = quizObj.questions.length;

    // Скрыть объяснение
    const expBox = document.getElementById('quiz-explanation-box');
    if (expBox) expBox.style.display = 'none';

    // Шаг и прогресс
    const stepNum = document.getElementById('quiz-step-num');
    const totalSteps = document.getElementById('quiz-total-steps');
    const fillBar = document.getElementById('quiz-progress-fill');
    const qText = document.getElementById('quiz-question-text');

    if (stepNum) stepNum.textContent = currentQuizStep + 1;
    if (totalSteps) totalSteps.textContent = total;
    if (fillBar) fillBar.style.width = `${Math.round(((currentQuizStep + 1) / total) * 100)}%`;
    if (qText) qText.textContent = q.text;

    // Опции
    const optionsContainer = document.getElementById('quiz-options-list');
    if (optionsContainer) {
      optionsContainer.innerHTML = q.options.map((opt, idx) => `
        <button class="quiz-option-btn" data-idx="${idx}">
          <span style="font-weight:700;color:var(--accent-blue);width:20px;">${['A', 'B', 'C', 'D'][idx]}</span>
          <span>${opt}</span>
        </button>
      `).join('');

      optionsContainer.querySelectorAll('.quiz-option-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const chosen = parseInt(btn.dataset.idx, 10);
          handleQuizAnswer(q, chosen, btn, optionsContainer);
        });
      });
    }
  }

  function handleQuizAnswer(q, chosenIdx, clickedBtn, container) {
    // Блокируем все кнопки
    container.querySelectorAll('.quiz-option-btn').forEach(b => b.disabled = true);

    const isCorrect = chosenIdx === q.correctIndex;
    if (isCorrect) {
      clickedBtn.classList.add('correct');
      currentQuizScore++;
    } else {
      clickedBtn.classList.add('wrong');
      // Подсветить правильный
      const correctBtn = container.querySelector(`[data-idx="${q.correctIndex}"]`);
      if (correctBtn) correctBtn.classList.add('correct');
    }

    // Показать объяснение
    const expBox = document.getElementById('quiz-explanation-box');
    const expTitle = document.getElementById('quiz-exp-title');
    const expText = document.getElementById('quiz-exp-text');
    const expBtn = document.getElementById('btn-quiz-next');

    if (expBox && expTitle && expText && expBtn) {
      expBox.style.display = 'block';
      expTitle.textContent = isCorrect ? '✅ Правильно!' : '❌ Неверно!';
      expTitle.style.color = isCorrect ? 'var(--accent-green)' : 'var(--accent-rose)';
      expText.textContent = q.explanation;

      const quizObj = data.quizzes.find(item => item.partId === currentQuizPartId);
      const isLast = currentQuizStep >= quizObj.questions.length - 1;
      expBtn.textContent = isLast ? 'Посмотреть результат 🏁' : 'Следующий вопрос →';
      expBtn.onclick = () => {
        if (isLast) {
          finishQuiz();
        } else {
          currentQuizStep++;
          renderQuizStep();
        }
      };
    }
  }

  function finishQuiz() {
    const quizObj = data.quizzes.find(q => q.partId === currentQuizPartId);
    const total = quizObj.questions.length;
    const pct = Math.round((currentQuizScore / total) * 100);

    // Сохранить лучший рекорд
    const oldBest = state.quizScores[currentQuizPartId];
    if (!oldBest || pct > oldBest.pct) {
      state.quizScores[currentQuizPartId] = { score: currentQuizScore, total, pct };
      saveState();
    }

    const player = document.getElementById('quiz-player-container');
    const results = document.getElementById('quiz-result-container');
    if (player) player.style.display = 'none';
    if (results) results.style.display = 'block';

    const scoreEl = document.getElementById('quiz-result-score');
    const pctEl = document.getElementById('quiz-result-pct');
    const badgeEl = document.getElementById('quiz-result-badge');
    const feedbackEl = document.getElementById('quiz-result-feedback');

    if (scoreEl) scoreEl.textContent = `${currentQuizScore} / ${total}`;
    if (pctEl) pctEl.textContent = `${pct}%`;

    if (pct >= 80) {
      if (badgeEl) badgeEl.textContent = '🏆 Отлично!';
      if (feedbackEl) feedbackEl.textContent = 'Превосходное знание темы! Вы готовы отвечать этот раздел на экзамене.';
    } else if (pct >= 60) {
      if (badgeEl) badgeEl.textContent = '👍 Хорошо!';
      if (feedbackEl) feedbackEl.textContent = 'Неплохой результат, но есть пробелы. Рекомендуем повторить конспект и карточки.';
    } else {
      if (badgeEl) badgeEl.textContent = '📚 Нужно повторить';
      if (feedbackEl) feedbackEl.textContent = 'Рекомендуется еще раз внимательно прочитать конспект темы перед экзаменом.';
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
          activeFlashcardIndex = (activeFlashcardIndex + 1) % activeFlashcardDeck.length;
          renderCurrentFlashcard();
        } else if (currentView === 'detail') {
          if (currentQuestionId < data.questions.length) openQuestionDetail(currentQuestionId + 1);
        }
      } else if (e.code === 'ArrowLeft') {
        if (currentView === 'flashcards') {
          activeFlashcardIndex = (activeFlashcardIndex - 1 + activeFlashcardDeck.length) % activeFlashcardDeck.length;
          renderCurrentFlashcard();
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

    // 11. Флеш-карточки клик и фильтр
    const flashcardEl = document.getElementById('active-flashcard');
    if (flashcardEl) {
      flashcardEl.addEventListener('click', flipFlashcard);
    }
    const fcPartFilter = document.getElementById('fc-part-filter');
    if (fcPartFilter) {
      fcPartFilter.addEventListener('change', initFlashcardsDeck);
    }
    const btnFcBad = document.getElementById('btn-fc-bad');
    const btnFcOk = document.getElementById('btn-fc-ok');
    const btnFcGood = document.getElementById('btn-fc-good');
    if (btnFcBad) btnFcBad.addEventListener('click', () => rateFlashcard('bad'));
    if (btnFcOk) btnFcOk.addEventListener('click', () => rateFlashcard('ok'));
    if (btnFcGood) btnFcGood.addEventListener('click', () => rateFlashcard('good'));

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
