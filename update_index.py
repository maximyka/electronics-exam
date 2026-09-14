# -*- coding: utf-8 -*-
"""
Скрипт интеграции полного университетского курса (14 лекций) в app/index.html и app/app.js
"""
import re

# 1. Обновление app/index.html
with open('app/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# А. Добавление пункта "Курс лекций" в десктоп сайдбар
old_sidebar_part = '''        <button class="nav-item active" data-view="dashboard">
          <span class="nav-icon">📊</span>
          <span class="nav-label">Обзор и прогресс</span>
          <span class="nav-badge" id="badge-total-pct">0%</span>
        </button>
        <button class="nav-item" data-view="catalog">
          <span class="nav-icon">📚</span>
          <span class="nav-label">36 Вопросов</span>
          <span class="nav-count">36</span>
        </button>'''

new_sidebar_part = '''        <button class="nav-item active" data-view="dashboard">
          <span class="nav-icon">📊</span>
          <span class="nav-label">Обзор и прогресс</span>
          <span class="nav-badge" id="badge-total-pct">0%</span>
        </button>
        <button class="nav-item" data-view="course">
          <span class="nav-icon">🎓</span>
          <span class="nav-label">Курс лекций</span>
          <span class="nav-badge highlight" id="badge-course-count">14 тем</span>
        </button>
        <button class="nav-item" data-view="catalog">
          <span class="nav-icon">📝</span>
          <span class="nav-label">36 Билетов</span>
          <span class="nav-count">36</span>
        </button>'''

if old_sidebar_part in html:
    html = html.replace(old_sidebar_part, new_sidebar_part)
    print("Sidebar nav updated.")
else:
    print("Sidebar nav already updated or match not found.")

# Б. Добавление кнопки в мобильный таббар
old_mobile_tabbar = '''      <button class="tabbar-item active" data-view="dashboard">
        <span class="tabbar-icon">📊</span>
        <span class="tabbar-label">Обзор</span>
      </button>
      <button class="tabbar-item" data-view="catalog">
        <span class="tabbar-icon">📚</span>
        <span class="tabbar-label">Темы</span>
      </button>'''

new_mobile_tabbar = '''      <button class="tabbar-item active" data-view="dashboard">
        <span class="tabbar-icon">📊</span>
        <span class="tabbar-label">Обзор</span>
      </button>
      <button class="tabbar-item" data-view="course">
        <span class="tabbar-icon">🎓</span>
        <span class="tabbar-label">Курс</span>
      </button>
      <button class="tabbar-item" data-view="catalog">
        <span class="tabbar-icon">📝</span>
        <span class="tabbar-label">Билеты</span>
      </button>'''

if old_mobile_tabbar in html:
    html = html.replace(old_mobile_tabbar, new_mobile_tabbar)
    print("Mobile tabbar updated.")

# В. Добавление карточки семестрового курса на Дашборде
hero_marker = '<div class="dashboard-hero">'
course_dashboard_card = '''        <!-- Баннер глубокого семестрового курса -->
        <div class="course-hero-banner" id="course-hero-banner">
          <div class="course-hero-badge">🎓 Семестровая программа (14 лекций)</div>
          <h2 class="course-hero-title">Академический курс: Электроника и схемотехника</h2>
          <p class="course-hero-desc">Изучайте курс последовательно и фундаментально — 14 подробнейших университетских лекций от физики p-n перехода до ЦОС и микросхем памяти с выводами формул, схемами, лабораторными и расчетными задачами.</p>
          <div class="course-hero-meta-row">
            <div class="hero-stat-pill">
              <span class="hero-stat-icon">📚</span>
              <span class="hero-stat-text" id="dash-course-lectures-status">14 лекций курса</span>
            </div>
            <div class="hero-stat-pill">
              <span class="hero-stat-icon">⚡</span>
              <span class="hero-stat-text" id="dash-course-xp-val">+50 XP за лекцию</span>
            </div>
          </div>
          <div class="course-hero-actions">
            <button class="btn btn-primary" id="btn-dash-open-course">📖 Открыть полный курс лекций</button>
            <button class="btn btn-secondary" id="btn-dash-open-catalog">📝 36 Билетов к экзамену</button>
          </div>
        </div>

        '''

if hero_marker in html and 'id="course-hero-banner"' not in html:
    html = html.replace(hero_marker, course_dashboard_card + hero_marker)
    print("Course hero banner added to dashboard.")

# Г. Добавление секции <section id="view-course" class="app-view"> перед <section id="view-catalog"
view_course_html = '''      <!-- ======================================================================
           ЭКРАН: ПОЛНЫЙ АКАДЕМИЧЕСКИЙ КУРС (14 ЛЕКЦИЙ)
           ====================================================================== -->
      <section id="view-course" class="app-view">
        <div class="view-inner course-view-inner">
          <div class="course-header-banner">
            <div class="course-header-badge">🎓 Семестровая университетская программа</div>
            <h1 class="course-header-title">Полный курс: Электроника и схемотехника</h1>
            <p class="course-header-desc">Комплексный электронный учебник для глубокого освоения всей дисциплины. Каждая лекция подробно разбирает физику процессов, математические выводы, схемотехнику, практическое применение, лабораторные работы и вопросы самоконтроля.</p>
            
            <div class="course-progress-panel">
              <div class="course-progress-top">
                <span class="progress-lbl">Прогресс освоения семестрового курса:</span>
                <span class="progress-pct-val" id="course-progress-text">0 из 14 лекций освоено (0%)</span>
              </div>
              <div class="course-progress-bar-bg">
                <div class="course-progress-bar-fill" id="course-progress-bar-fill" style="width: 0%;"></div>
              </div>
            </div>

            <!-- Фильтры по модулям курса -->
            <div class="course-filter-bar">
              <div class="filter-chips-scroll" id="course-filter-chips">
                <button class="filter-chip active" data-mod="all">Все 14 лекций</button>
                <button class="filter-chip" data-mod="1">⚡ 1. Полупроводники и диоды</button>
                <button class="filter-chip" data-mod="2">🎛 2. Транзисторы и тиристоры</button>
                <button class="filter-chip" data-mod="3">🔊 3. Усилители, ОУ и фильтры</button>
                <button class="filter-chip" data-mod="4">📡 4. Генераторы и модуляция</button>
                <button class="filter-chip" data-mod="5">🔋 5. Питание, ЦАП и АЦП</button>
                <button class="filter-chip" data-mod="6">💾 6. Комбинационная логика</button>
                <button class="filter-chip" data-mod="7">⏱ 7. Триггеры, память и фильтры</button>
              </div>
              
              <div class="course-search-box">
                <input type="text" id="course-search-input" placeholder="🔍 Поиск по темам, формулам и терминам курса...">
              </div>
            </div>
          </div>

          <!-- Сетка лекций курса -->
          <div class="course-lectures-grid" id="course-lectures-grid">
            <!-- Заполняется функцией renderCourseView() -->
          </div>
        </div>
      </section>

      '''

if 'id="view-course"' not in html:
    html = html.replace('<section id="view-catalog" class="app-view">', view_course_html + '<section id="view-catalog" class="app-view">')
    print("view-course section added.")

# Д. Добавление полноэкранного ридера лекций перед закрывающим тегом </body>
reader_modal_html = '''    <!-- ======================================================================
         ПОЛНОЭКРАННЫЙ РИДЕР ЛЕКЦИИ (Textbook Reader)
         ====================================================================== -->
    <div id="lecture-reader-modal" class="lecture-reader-backdrop" style="display:none;">
      <div class="lecture-reader-container">
        <!-- Верхний бар ридера -->
        <header class="reader-header">
          <button id="btn-close-reader" class="reader-btn-back">← К списку лекций</button>
          <div class="reader-header-meta">
            <span id="reader-lecture-badge" class="reader-badge">Лекция 1</span>
            <h2 id="reader-header-title" class="reader-header-title">Название лекции</h2>
          </div>
          <div class="reader-header-actions">
            <button id="btn-reader-toggle-mastered" class="btn-master-status">
              <span class="btn-icon">✓</span>
              <span class="btn-text">Отметить как освоенную (+50 XP)</span>
            </button>
            <button id="btn-reader-close-x" class="reader-close-btn" title="Закрыть">✕</button>
          </div>
        </header>

        <!-- Тело ридера -->
        <div class="reader-body">
          <!-- Боковое оглавление лекции -->
          <aside class="reader-toc-sidebar" id="reader-toc-sidebar">
            <div class="toc-title">📑 Содержание лекции</div>
            <nav class="toc-nav" id="reader-toc-nav">
              <!-- Ссылки на секции -->
            </nav>
            <div class="toc-quick-links">
              <div class="toc-links-title">Связанные материалы:</div>
              <div id="reader-related-links">
                <!-- Ссылки -->
              </div>
            </div>
          </aside>

          <!-- Основное полотно лекции -->
          <main class="reader-content-pane" id="reader-content-pane">
            <div class="reader-article" id="reader-article">
              <!-- Контент лекции -->
            </div>

            <!-- Нижняя навигация между лекциями -->
            <div class="reader-bottom-nav">
              <button id="btn-reader-prev" class="reader-nav-btn prev">← Предыдущая лекция</button>
              <button id="btn-reader-next" class="reader-nav-btn next">Следующая лекция →</button>
            </div>
          </main>
        </div>
      </div>
    </div>
'''

if 'id="lecture-reader-modal"' not in html:
    html = html.replace('<!-- Модальное окно установки PWA', reader_modal_html + '\n    <!-- Модальное окно установки PWA')
    print("lecture-reader-modal added.")

# Е. Добавление табов режима в view-detail
old_detail_start = '''          <!-- Заголовок вопроса -->
          <div class="detail-header-card">'''

new_detail_start = '''          <!-- Переключатель режима: Билет экзамена vs Полная лекция -->
          <div class="detail-mode-tabs-bar" id="detail-mode-tabs-bar">
            <button class="detail-mode-tab-btn active" id="tab-btn-detail-ticket" data-pane="ticket">
              <span class="tab-btn-icon">⚡</span>
              <span class="tab-btn-text">Билет к экзамену (Краткий конспект)</span>
            </button>
            <button class="detail-mode-tab-btn" id="tab-btn-detail-lecture" data-pane="lecture">
              <span class="tab-btn-icon">🎓</span>
              <span class="tab-btn-text" id="tab-btn-lecture-lbl">Полная университетская лекция</span>
            </button>
          </div>

          <!-- Заголовок вопроса -->
          <div class="detail-header-card">'''

if old_detail_start in html and 'id="detail-mode-tabs-bar"' not in html:
    html = html.replace(old_detail_start, new_detail_start)
    print("Detail mode tabs added.")

# Добавление контейнера detail-lecture-pane в view-detail перед закрывающим тегом view-inner
detail_view_end_marker = '<!-- Панель навигации между вопросами -->'
lecture_pane_html = '''          <!-- Контейнер полной лекции внутри билета -->
          <div id="detail-lecture-pane" class="detail-subpane" style="display:none;">
            <div class="detail-lecture-header-box">
              <div class="lecture-header-info">
                <span class="lecture-badge-pill" id="subpane-lecture-num">Лекция 1</span>
                <h2 id="subpane-lecture-title">Название лекции</h2>
                <p id="subpane-lecture-desc">Описание лекции</p>
              </div>
              <button class="btn btn-primary" id="btn-open-lecture-fullscreen">📖 Читать на весь экран</button>
            </div>
            <div id="subpane-lecture-content" class="detail-lecture-body"></div>
          </div>

          <!-- Панель навигации между вопросами -->'''

if detail_view_end_marker in html and 'id="detail-lecture-pane"' not in html:
    html = html.replace(detail_view_end_marker, lecture_pane_html)
    print("detail-lecture-pane added to view-detail.")

with open('app/index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("app/index.html successfully updated!")
