#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Стили для раздела «Лабораторный практикум» (view-labs)
"""

LABS_CSS = """

/* ==========================================================================
   РАЗДЕЛ ЛАБОРАТОРНЫХ РАБОТ (VIEW-LABS)
   ========================================================================== */
.labs-inner {
  max-width: 1180px;
  margin: 0 auto;
  padding: 24px 20px 80px 20px;
}

.labs-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 20px;
  margin-bottom: 24px;
  background: linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.85) 100%);
  border: 1px solid rgba(56, 189, 248, 0.2);
  border-radius: var(--radius-xl);
  padding: 24px 28px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
}

.labs-title-group {
  flex: 1 1 500px;
}

.labs-badge-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 999px;
  background: rgba(56, 189, 248, 0.15);
  border: 1px solid rgba(56, 189, 248, 0.35);
  color: #38bdf8;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  margin-bottom: 10px;
}

.labs-header h1 {
  font-size: 28px;
  font-weight: 800;
  color: #f8fafc;
  margin: 0 0 8px 0;
  letter-spacing: -0.02em;
}

.labs-stats-summary {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.lab-stat-box {
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 12px 18px;
  text-align: center;
  min-width: 105px;
}

.lab-stat-box.highlight {
  border-color: rgba(34, 197, 94, 0.35);
  background: rgba(34, 197, 94, 0.08);
}

.lab-stat-box .stat-num {
  display: block;
  font-size: 24px;
  font-weight: 800;
  color: #38bdf8;
  line-height: 1.1;
}

.lab-stat-box.highlight .stat-num {
  color: #4ade80;
}

.lab-stat-box .stat-lbl {
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
  margin-top: 4px;
}

/* Панель выбора лабораторной работы (Chips / Карточки) */
.labs-picker-bar {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 10px;
  margin-bottom: 24px;
}

.lab-chip-btn {
  background: #1e293b;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 14px 14px;
  cursor: pointer;
  text-align: left;
  transition: all 0.22s cubic-bezier(0.2, 0.9, 0.3, 1);
  display: flex;
  flex-direction: column;
  gap: 6px;
  position: relative;
  overflow: hidden;
}

.lab-chip-btn:hover {
  border-color: rgba(56, 189, 248, 0.4);
  transform: translateY(-2px);
  background: #243247;
}

.lab-chip-btn.active {
  background: linear-gradient(145deg, rgba(30, 58, 138, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%);
  border-color: #38bdf8;
  box-shadow: 0 0 0 1px #38bdf8, 0 8px 20px -4px rgba(56, 189, 248, 0.25);
}

.lab-chip-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.lab-chip-num {
  font-size: 11px;
  font-weight: 800;
  color: #38bdf8;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.lab-chip-icon {
  font-size: 18px;
}

.lab-chip-title {
  font-size: 13px;
  font-weight: 700;
  color: #f1f5f9;
  line-height: 1.35;
}

.lab-chip-badge {
  font-size: 10px;
  color: #94a3b8;
  font-weight: 500;
}

/* Карточка активной лабораторной */
.active-lab-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.lab-card-detail {
  background: #0f172a;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-xl);
  overflow: hidden;
  box-shadow: 0 12px 30px -8px rgba(0, 0, 0, 0.4);
}

.lab-detail-header {
  padding: 26px 28px;
  background: linear-gradient(135deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.8) 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.lab-header-top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.lab-num-badge {
  background: #38bdf8;
  color: #0f172a;
  font-size: 11px;
  font-weight: 800;
  padding: 4px 10px;
  border-radius: 6px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.lab-category-badge {
  background: rgba(168, 85, 247, 0.18);
  color: #c084fc;
  border: 1px solid rgba(168, 85, 247, 0.35);
  font-size: 11px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 6px;
}

.lab-bench-badge {
  background: rgba(245, 158, 11, 0.15);
  color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.3);
  font-size: 11px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 6px;
}

.lab-main-title {
  font-size: 24px;
  font-weight: 800;
  color: #fff;
  margin: 0 0 14px 0;
  line-height: 1.3;
}

.lab-goal-callout {
  background: rgba(56, 189, 248, 0.08);
  border-left: 4px solid #38bdf8;
  padding: 12px 16px;
  border-radius: 0 10px 10px 0;
  font-size: 14px;
  color: #cbd5e1;
  line-height: 1.55;
}

/* Навигация по подвкладкам лабы */
.lab-subtabs-nav {
  display: flex;
  background: #1e293b;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding: 8px 16px;
  gap: 8px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.lab-subtab-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 13.5px;
  font-weight: 700;
  padding: 10px 16px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 8px;
}

.lab-subtab-btn:hover {
  color: #f1f5f9;
  background: rgba(255, 255, 255, 0.05);
}

.lab-subtab-btn.active {
  color: #38bdf8;
  background: rgba(56, 189, 248, 0.14);
}

.subtab-count {
  font-size: 11px;
  background: rgba(255, 255, 255, 0.1);
  padding: 2px 7px;
  border-radius: 999px;
  color: #cbd5e1;
}

.lab-subtab-btn.active .subtab-count {
  background: rgba(56, 189, 248, 0.25);
  color: #38bdf8;
}

/* Содержимое подвкладок */
.lab-pane {
  padding: 26px 28px;
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.lab-theory-card {
  background: rgba(30, 41, 59, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  padding: 20px 22px;
}

.lab-theory-card h3 {
  font-size: 17px;
  font-weight: 700;
  color: #38bdf8;
  margin: 0 0 10px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.lab-theory-card p {
  font-size: 14.5px;
  line-height: 1.65;
  color: #e2e8f0;
  margin: 0;
}

.lab-key-formulas-box {
  background: linear-gradient(145deg, rgba(30, 58, 138, 0.25), rgba(15, 23, 42, 0.6));
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: 14px;
  padding: 20px 22px;
}

.lab-key-formulas-box h3 {
  font-size: 16px;
  font-weight: 700;
  color: #a5b4fc;
  margin: 0 0 14px 0;
}

.lab-formulas-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 12px;
}

.lab-formula-chip {
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 12px 14px;
}

.lab-formula-chip .f-name {
  font-size: 11px;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
  margin-bottom: 6px;
}

.lab-formula-chip .f-val {
  font-size: 15px;
  color: #f8fafc;
  overflow-x: auto;
}

/* Схемы и стенд */
.lab-circuit-card {
  background: rgba(30, 41, 59, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 22px 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.lab-circuit-header h4 {
  font-size: 16px;
  font-weight: 700;
  color: #f8fafc;
  margin: 0 0 6px 0;
}

.circuit-hint-text {
  font-size: 13.5px;
  color: #94a3b8;
  margin: 0;
}

.lab-wiring-box {
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid rgba(56, 189, 248, 0.25);
  border-radius: 10px;
  padding: 14px 16px;
  font-size: 13.5px;
  color: #cbd5e1;
  line-height: 1.55;
}

.lab-wiring-box strong {
  color: #38bdf8;
}

.lab-note-box {
  background: rgba(234, 179, 8, 0.08);
  border-left: 3px solid #eab308;
  padding: 10px 14px;
  border-radius: 0 8px 8px 0;
  font-size: 13px;
  color: #fef08a;
  line-height: 1.5;
}

.lab-bench-photo-card {
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  padding: 18px 20px;
  text-align: center;
}

.lab-bench-photo-card img {
  max-width: 100%;
  max-height: 480px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.5);
}

.bench-photo-caption {
  margin-top: 10px;
  font-size: 12px;
  color: #94a3b8;
}

/* Экспериментальные данные и таблицы */
.lab-data-card {
  background: rgba(30, 41, 59, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 20px 22px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.lab-data-card h4 {
  font-size: 16px;
  font-weight: 700;
  color: #38bdf8;
  margin: 0;
}

.lab-table-wrapper {
  overflow-x: auto;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: #0b1120;
}

.lab-data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  text-align: left;
}

.lab-data-table th {
  background: #1e293b;
  color: #94a3b8;
  font-weight: 700;
  padding: 10px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  white-space: nowrap;
}

.lab-data-table td {
  padding: 9px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  color: #f1f5f9;
}

.lab-data-table tr:hover td {
  background: rgba(56, 189, 248, 0.04);
}

.lab-comment-box {
  background: rgba(34, 197, 94, 0.08);
  border-left: 3px solid #22c55e;
  padding: 10px 14px;
  border-radius: 0 8px 8px 0;
  font-size: 13px;
  color: #86efac;
  line-height: 1.5;
}

/* Вопросы к защите (Интерактивный тренажер) */
.defense-intro-banner {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(30, 41, 59, 0.7));
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: 12px;
  padding: 16px 20px;
  font-size: 13.5px;
  color: #cbd5e1;
  line-height: 1.55;
}

.defense-questions-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.defense-question-card {
  background: rgba(30, 41, 59, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  overflow: hidden;
  transition: all 0.2s ease;
}

.defense-question-card.known {
  border-color: rgba(34, 197, 94, 0.4);
  background: rgba(34, 197, 94, 0.04);
}

.defense-question-card.repeat {
  border-color: rgba(239, 68, 68, 0.4);
  background: rgba(239, 68, 68, 0.04);
}

.defense-q-header {
  padding: 16px 20px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  cursor: pointer;
  user-select: none;
}

.defense-q-title-wrap {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  flex: 1;
}

.defense-q-num {
  background: rgba(56, 189, 248, 0.15);
  color: #38bdf8;
  font-size: 12px;
  font-weight: 800;
  padding: 4px 9px;
  border-radius: 6px;
  flex-shrink: 0;
  margin-top: 1px;
}

.defense-question-card.known .defense-q-num {
  background: rgba(34, 197, 94, 0.2);
  color: #4ade80;
}

.defense-question-card.repeat .defense-q-num {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
}

.defense-q-title {
  font-size: 15px;
  font-weight: 700;
  color: #f8fafc;
  line-height: 1.45;
  margin: 0;
}

.defense-q-badges {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.defense-toggle-icon {
  font-size: 14px;
  color: #94a3b8;
  transition: transform 0.2s ease;
}

.defense-question-card.expanded .defense-toggle-icon {
  transform: rotate(180deg);
}

.defense-q-body {
  padding: 0 20px 20px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  padding-top: 16px;
  display: none;
  flex-direction: column;
  gap: 14px;
}

.defense-question-card.expanded .defense-q-body {
  display: flex;
}

.defense-hint-box {
  background: rgba(234, 179, 8, 0.08);
  border-left: 3px solid #eab308;
  padding: 10px 14px;
  border-radius: 0 8px 8px 0;
  font-size: 13px;
  color: #fef08a;
  line-height: 1.5;
}

.defense-answer-box {
  background: rgba(15, 23, 42, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 16px 18px;
  font-size: 14px;
  color: #f1f5f9;
  line-height: 1.65;
}

.defense-answer-box strong {
  color: #38bdf8;
}

.defense-actions-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  padding-top: 6px;
}

.defense-status-group {
  display: flex;
  gap: 8px;
}

.defense-status-btn {
  background: #1e293b;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #94a3b8;
  font-size: 12px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.defense-status-btn.btn-know:hover,
.defense-status-btn.btn-know.active {
  background: rgba(34, 197, 94, 0.2);
  color: #4ade80;
  border-color: #22c55e;
}

.defense-status-btn.btn-repeat:hover,
.defense-status-btn.btn-repeat.active {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
  border-color: #ef4444;
}

/* Нижняя навигация между лабами */
.lab-bottom-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  padding: 20px 28px;
  background: #1e293b;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.lab-nav-btn {
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #f1f5f9;
  font-size: 14px;
  font-weight: 600;
  padding: 10px 18px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.lab-nav-btn:hover {
  background: rgba(255, 255, 255, 0.08);
}

.lab-nav-btn.primary {
  background: #38bdf8;
  color: #0f172a;
  border-color: #38bdf8;
  font-weight: 700;
}

.lab-nav-btn.primary:hover {
  background: #7dd3fc;
}

@media (max-width: 768px) {
  .labs-inner {
    padding: 16px 12px 90px 12px;
  }
  .labs-header {
    padding: 18px 16px;
  }
  .labs-header h1 {
    font-size: 22px;
  }
  .labs-picker-bar {
    grid-template-columns: repeat(2, 1fr);
  }
  .lab-detail-header {
    padding: 18px 16px;
  }
  .lab-main-title {
    font-size: 20px;
  }
  .lab-pane {
    padding: 18px 16px;
  }
  .lab-bottom-nav {
    padding: 16px;
    flex-direction: column;
  }
  .lab-nav-btn {
    width: 100%;
    text-align: center;
  }
}
"""

with open("app/app.css", "a", encoding="utf-8") as f:
    f.write(LABS_CSS)

print(f"Appended {len(LABS_CSS)} bytes of labs styles to app/app.css")
