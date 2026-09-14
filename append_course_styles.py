# -*- coding: utf-8 -*-
"""
Добавление стилей для академического курса (14 лекций) и ридера в app/app.css
"""

course_css = r'''
/* ==========================================================================
   СТИЛИ: АКАДЕМИЧЕСКИЙ КУРС ЛЕКЦИЙ (14 ЛЕКЦИЙ) И РИДЕР
   ========================================================================== */

/* Баннер курса на Дашборде */
.course-hero-banner {
  background: linear-gradient(135deg, rgba(56, 189, 248, 0.12) 0%, rgba(99, 102, 241, 0.15) 50%, rgba(139, 92, 246, 0.10) 100%);
  border: 1px solid rgba(56, 189, 248, 0.28);
  border-radius: 20px;
  padding: 24px 28px;
  margin-bottom: 28px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 12px 32px -8px rgba(0, 0, 0, 0.35);
}

.course-hero-banner::before {
  content: '';
  position: absolute;
  top: -40px;
  right: -40px;
  width: 180px;
  height: 180px;
  background: radial-gradient(circle, rgba(56, 189, 248, 0.25) 0%, transparent 70%);
  pointer-events: none;
}

.course-hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: rgba(56, 189, 248, 0.18);
  color: #38bdf8;
  border: 1px solid rgba(56, 189, 248, 0.35);
  margin-bottom: 12px;
}

.course-hero-title {
  font-size: 24px;
  font-weight: 800;
  color: #f1f5f9;
  margin-bottom: 8px;
  letter-spacing: -0.02em;
}

.course-hero-desc {
  font-size: 15px;
  color: #cbd5e1;
  line-height: 1.6;
  max-width: 820px;
  margin-bottom: 18px;
}

.course-hero-meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 20px;
}

.hero-stat-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(18, 22, 32, 0.65);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  color: #f8fafc;
}

.course-hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

/* Верхний блок вкладки курса */
.course-header-banner {
  background: #1c2436;
  border: 1px solid rgba(255, 255, 255, 0.085);
  border-radius: 20px;
  padding: 26px 30px;
  margin-bottom: 24px;
}

.course-header-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  background: rgba(56, 189, 248, 0.15);
  color: #38bdf8;
  border: 1px solid rgba(56, 189, 248, 0.3);
  margin-bottom: 10px;
}

.course-header-title {
  font-size: 26px;
  font-weight: 800;
  color: #f1f5f9;
  margin-bottom: 8px;
}

.course-header-desc {
  font-size: 15px;
  color: #94a3b8;
  line-height: 1.55;
  margin-bottom: 20px;
}

.course-progress-panel {
  background: #121620;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 12px;
  padding: 14px 18px;
  margin-bottom: 20px;
}

.course-progress-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 13px;
}

.course-progress-top .progress-lbl {
  color: #94a3b8;
  font-weight: 500;
}

.course-progress-top .progress-pct-val {
  color: #38bdf8;
  font-weight: 700;
}

.course-progress-bar-bg {
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  overflow: hidden;
}

.course-progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #38bdf8, #34d399);
  border-radius: 999px;
  transition: width 0.4s ease;
}

.course-filter-bar {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.course-search-box input {
  width: 100%;
  background: #121620;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 12px 18px;
  color: #f1f5f9;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.course-search-box input:focus {
  border-color: #38bdf8;
  box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.15);
}

/* Сетка лекций курса */
.course-lectures-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
}

@media (min-width: 768px) {
  .course-lectures-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1200px) {
  .course-lectures-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.course-lecture-card {
  background: #1c2436;
  border: 1px solid rgba(255, 255, 255, 0.085);
  border-radius: 16px;
  padding: 22px;
  display: flex;
  flex-direction: column;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
  position: relative;
}

.course-lecture-card:hover {
  transform: translateY(-3px);
  border-color: rgba(56, 189, 248, 0.35);
  box-shadow: 0 12px 28px -6px rgba(0, 0, 0, 0.45);
}

.course-lecture-card.mastered {
  border-color: rgba(52, 211, 153, 0.3);
  background: linear-gradient(180deg, #1c2436 0%, rgba(52, 211, 153, 0.05) 100%);
}

.course-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 12px;
}

.course-card-number {
  background: rgba(56, 189, 248, 0.15);
  color: #38bdf8;
  padding: 3px 10px;
  border-radius: 999px;
  font-weight: 700;
}

.course-card-module {
  color: #94a3b8;
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 140px;
}

.course-card-time {
  color: #64748b;
  font-size: 12px;
}

.course-card-title {
  font-size: 17px;
  font-weight: 700;
  color: #f1f5f9;
  line-height: 1.35;
  margin-bottom: 6px;
}

.course-card-subtitle {
  font-size: 13px;
  color: #38bdf8;
  margin-bottom: 10px;
  line-height: 1.4;
  font-weight: 500;
}

.course-card-summary {
  font-size: 13px;
  color: #94a3b8;
  line-height: 1.5;
  margin-bottom: 16px;
  flex-grow: 1;
}

.course-card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 16px;
}

.course-concept-tag {
  background: #121620;
  border: 1px solid rgba(255, 255, 255, 0.06);
  color: #cbd5e1;
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 6px;
  transition: background 0.15s, color 0.15s;
}

.course-concept-tag:hover {
  background: rgba(56, 189, 248, 0.2);
  color: #38bdf8;
}

.course-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.status-badge.mastered {
  color: #34d399;
  font-size: 12px;
  font-weight: 600;
}

.status-badge.todo {
  color: #64748b;
  font-size: 12px;
}

.btn-card-read {
  background: #2563eb;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 7px 14px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-card-read:hover {
  background: #1d4ed8;
}

/* ==========================================================================
   ПОЛНОЭКРАННЫЙ РИДЕР ЛЕКЦИИ (Textbook Reader)
   ========================================================================== */
.lecture-reader-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: #0d111a;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.reader-header {
  height: 64px;
  background: rgba(18, 22, 32, 0.92);
  backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  gap: 16px;
  flex-shrink: 0;
}

.reader-btn-back {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #f1f5f9;
  border-radius: 8px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

.reader-header-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  overflow: hidden;
}

.reader-badge {
  background: rgba(56, 189, 248, 0.18);
  color: #38bdf8;
  font-size: 12px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 999px;
  white-space: nowrap;
}

.reader-header-title {
  font-size: 16px;
  font-weight: 700;
  color: #f1f5f9;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.reader-header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.btn-master-status {
  background: rgba(56, 189, 248, 0.12);
  color: #38bdf8;
  border: 1px solid rgba(56, 189, 248, 0.3);
  padding: 7px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.btn-master-status.mastered {
  background: rgba(52, 211, 153, 0.18);
  color: #34d399;
  border-color: rgba(52, 211, 153, 0.4);
}

.reader-close-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 20px;
  cursor: pointer;
  padding: 6px 10px;
  border-radius: 8px;
}

.reader-close-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.reader-body {
  display: flex;
  flex-grow: 1;
  overflow: hidden;
  height: calc(100vh - 64px);
}

.reader-toc-sidebar {
  width: 290px;
  flex-shrink: 0;
  background: #121620;
  border-right: 1px solid rgba(255, 255, 255, 0.07);
  padding: 20px;
  overflow-y: auto;
  display: none;
}

@media (min-width: 1024px) {
  .reader-toc-sidebar {
    display: block;
  }
}

.toc-title {
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  color: #94a3b8;
  letter-spacing: 0.05em;
  margin-bottom: 14px;
}

.toc-nav {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 24px;
}

.toc-link {
  color: #cbd5e1;
  text-decoration: none;
  font-size: 13px;
  line-height: 1.4;
  padding: 6px 10px;
  border-radius: 6px;
  transition: background 0.15s, color 0.15s;
}

.toc-link:hover {
  background: rgba(56, 189, 248, 0.12);
  color: #38bdf8;
}

.toc-quick-links .toc-links-title {
  font-size: 12px;
  color: #64748b;
  font-weight: 600;
  margin-bottom: 8px;
}

.related-chip {
  background: #1c2436;
  border: 1px solid rgba(255, 255, 255, 0.06);
  padding: 7px 10px;
  border-radius: 8px;
  font-size: 12px;
  color: #f1f5f9;
  margin-bottom: 6px;
  cursor: pointer;
  transition: border-color 0.2s;
}

.related-chip:hover {
  border-color: #38bdf8;
}

.reader-content-pane {
  flex-grow: 1;
  overflow-y: auto;
  padding: 30px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.reader-article {
  width: 100%;
  max-width: 860px;
}

.article-hero {
  margin-bottom: 34px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding-bottom: 28px;
}

.article-pre {
  color: #38bdf8;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 6px;
}

.article-title {
  font-size: 32px;
  font-weight: 800;
  color: #f8fafc;
  line-height: 1.25;
  margin-bottom: 10px;
  letter-spacing: -0.02em;
}

.article-subtitle {
  font-size: 17px;
  color: #94a3b8;
  line-height: 1.45;
  margin-bottom: 20px;
}

.article-summary-card {
  background: #161c2b;
  border-left: 4px solid #38bdf8;
  border-radius: 0 12px 12px 0;
  padding: 18px 22px;
}

.summary-card-title {
  font-size: 13px;
  font-weight: 700;
  color: #38bdf8;
  margin-bottom: 6px;
}

.article-summary-card p {
  color: #cbd5e1;
  font-size: 14px;
  line-height: 1.6;
  margin: 0;
}

/* Секции лекции */
.reader-section-block {
  margin-bottom: 40px;
}

.section-title {
  font-size: 22px;
  font-weight: 700;
  color: #f1f5f9;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.section-body {
  font-size: 16px;
  line-height: 1.7;
  color: #e2e8f0;
}

.section-body p {
  margin-bottom: 16px;
}

.section-body h4 {
  font-size: 17px;
  font-weight: 700;
  color: #38bdf8;
  margin: 22px 0 10px 0;
}

/* Callout врезки */
.reader-callout {
  border-radius: 12px;
  padding: 16px 20px;
  margin: 24px 0;
  border: 1px solid transparent;
}

.callout-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  margin-bottom: 8px;
}

.callout-body {
  font-size: 14px;
  line-height: 1.55;
}

.callout-physics {
  background: rgba(56, 189, 248, 0.08);
  border-color: rgba(56, 189, 248, 0.25);
  color: #e0f2fe;
}
.callout-physics .callout-header { color: #38bdf8; }

.callout-engineering {
  background: rgba(251, 191, 36, 0.08);
  border-color: rgba(251, 191, 36, 0.25);
  color: #fef3c7;
}
.callout-engineering .callout-header { color: #fbbf24; }

.callout-danger {
  background: rgba(248, 113, 113, 0.08);
  border-color: rgba(248, 113, 113, 0.25);
  color: #fee2e2;
}
.callout-danger .callout-header { color: #f87171; }

.callout-exam_tip {
  background: rgba(192, 132, 252, 0.08);
  border-color: rgba(192, 132, 252, 0.25);
  color: #f3e8ff;
}
.callout-exam_tip .callout-header { color: #c084fc; }

/* Формулы и карточки */
.reader-formulas-panel, .reader-table-panel, .reader-selftest-panel {
  margin: 40px 0;
  background: #161c2b;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 16px;
  padding: 24px;
}

.panel-heading {
  font-size: 19px;
  font-weight: 700;
  color: #f8fafc;
  margin-bottom: 18px;
}

.formulas-cards-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;
}

@media (min-width: 650px) {
  .formulas-cards-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.formula-card-item {
  background: #121620;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 16px;
}

.formula-latex-box {
  padding: 10px 0;
  overflow-x: auto;
  text-align: center;
}

.formula-name {
  color: #38bdf8;
  font-size: 14px;
  margin-top: 6px;
}

.formula-desc {
  color: #94a3b8;
  font-size: 12px;
  margin-top: 4px;
  line-height: 1.4;
}

/* Сравнительная таблица */
.table-responsive-box {
  overflow-x: auto;
}

.reader-data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  text-align: left;
}

.reader-data-table th {
  background: #121620;
  color: #38bdf8;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.reader-data-table td {
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  color: #e2e8f0;
}

/* Самоконтроль */
.selftest-questions-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.selftest-card {
  background: #121620;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 12px;
  overflow: hidden;
}

.selftest-q-header {
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  transition: background 0.15s;
}

.selftest-q-header:hover {
  background: rgba(255, 255, 255, 0.03);
}

.selftest-q-num {
  background: rgba(56, 189, 248, 0.15);
  color: #38bdf8;
  font-size: 11px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 6px;
  white-space: nowrap;
}

.selftest-q-title {
  flex-grow: 1;
  font-size: 15px;
  font-weight: 600;
  color: #f1f5f9;
  margin: 0;
}

.selftest-arrow {
  color: #64748b;
  font-size: 12px;
  transition: transform 0.2s;
}

.selftest-card.expanded .selftest-arrow {
  transform: rotate(180deg);
}

.selftest-answer-pane {
  padding: 0 20px 18px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.selftest-hint {
  background: rgba(251, 191, 36, 0.08);
  border: 1px solid rgba(251, 191, 36, 0.2);
  color: #fef3c7;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
  margin: 14px 0;
}

.selftest-answer-text {
  font-size: 14px;
  line-height: 1.6;
  color: #cbd5e1;
  margin-top: 10px;
}

.selftest-answer-text strong {
  color: #34d399;
}

/* Нижняя навигация лекции */
.reader-bottom-nav {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-top: 30px;
  padding-top: 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.reader-nav-btn {
  background: #1c2436;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #f1f5f9;
  padding: 10px 18px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.reader-nav-btn:hover {
  background: #2563eb;
  border-color: #2563eb;
}

/* ==========================================================================
   ПЕРЕКЛЮЧАТЕЛЬ РЕЖИМА ВНУТРИ БИЛЕТА (Билет vs Лекция)
   ========================================================================== */
.detail-mode-tabs-bar {
  display: flex;
  background: #121620;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 4px;
  margin-bottom: 20px;
  gap: 6px;
}

.detail-mode-tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px;
  border: none;
  background: transparent;
  color: #94a3b8;
  font-size: 14px;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.detail-mode-tab-btn.active {
  background: #1c2436;
  color: #f8fafc;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.detail-lecture-header-box {
  background: #1c2436;
  border: 1px solid rgba(255, 255, 255, 0.085);
  border-radius: 16px;
  padding: 20px 24px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
}

.lecture-badge-pill {
  background: rgba(56, 189, 248, 0.15);
  color: #38bdf8;
  font-size: 12px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 999px;
  display: inline-block;
  margin-bottom: 6px;
}

.detail-lecture-header-box h2 {
  font-size: 20px;
  font-weight: 700;
  color: #f8fafc;
  margin: 0 0 4px 0;
}

.detail-lecture-header-box p {
  font-size: 13px;
  color: #94a3b8;
  margin: 0;
}

.subpane-section-box {
  background: #1c2436;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 14px;
  padding: 20px;
  margin-bottom: 18px;
}

.subpane-section-box h4 {
  font-size: 17px;
  color: #38bdf8;
  margin-bottom: 12px;
}
'''

with open('app/app.css', 'a', encoding='utf-8') as f:
    f.write(course_css)

print("app/app.css updated with course styles!")
