# -*- coding: utf-8 -*-
"""
Script to prepare and upgrade exam_data.js:
1. Fix all LaTeX escaping errors (KaTeX compatibility).
2. Redraw Question 1 SVG (spacious, zero overlaps).
3. Insert 84 Glossary terms.
4. Insert 5 Laboratory works + 10 Interactive calculation tasks.
5. Expand quiz questions from 124 to 190 questions.
"""
import json
import re

# Question 1 Redesigned SVG: 640x360, spacious, zero overlap, high-contrast badges
Q1_NEW_SVG = """<svg viewBox="0 0 640 360" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:640px;margin:auto;display:block;border-radius:12px;background:#161c2b;">
  <defs>
    <linearGradient id="pGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#3b82f6" stop-opacity="0.12"/>
    </linearGradient>
    <linearGradient id="nGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#10b981" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#10b981" stop-opacity="0.35"/>
    </linearGradient>
    <linearGradient id="ozGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="#f59e0b" stop-opacity="0.08"/>
    </linearGradient>
    <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#94a3b8"/>
    </marker>
    <marker id="arrow-blue" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#38bdf8"/>
    </marker>
    <marker id="arrow-amber" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#fbbf24"/>
    </marker>
  </defs>

  <!-- ==================== ЧАСТЬ 1: СТРУКТУРА P-N ПЕРЕХОДА (ВЕРХ) ==================== -->
  <g transform="translate(20, 18)">
    <rect x="0" y="0" width="600" height="125" rx="10" fill="#1b2336" stroke="#2b364e" stroke-width="1.2"/>
    
    <!-- Вывод Анода (+) слева -->
    <line x1="-15" y1="62" x2="20" y2="62" stroke="#60a5fa" stroke-width="2.5"/>
    <circle cx="-15" cy="62" r="4" fill="#60a5fa"/>
    <text x="-5" y="52" fill="#60a5fa" font-size="11" font-weight="bold">А (+)</text>

    <!-- P-область -->
    <rect x="20" y="15" width="165" height="95" rx="8" fill="url(#pGrad)" stroke="#3b82f6" stroke-width="1.8"/>
    <rect x="30" y="23" width="145" height="22" rx="11" fill="#1e293b" stroke="#3b82f6" stroke-opacity="0.4"/>
    <text x="102" y="38" fill="#60a5fa" font-size="12" font-weight="bold" text-anchor="middle">p-область (дырочная)</text>
    <text x="102" y="65" fill="#94a3b8" font-size="11" text-anchor="middle">Акцепторы: B, In (III вал.)</text>
    <rect x="32" y="78" width="141" height="20" rx="4" fill="#0f172a" fill-opacity="0.7"/>
    <text x="102" y="92" fill="#38bdf8" font-size="10" font-weight="600" text-anchor="middle">Основные: h⁺ | Неосн: e⁻</text>

    <!-- Слой объемного заряда (ОЗ / Depletion Layer) -->
    <rect x="195" y="15" width="210" height="95" rx="6" fill="url(#ozGrad)" stroke="#f59e0b" stroke-dasharray="4,3" stroke-width="1.5"/>
    <rect x="210" y="23" width="180" height="22" rx="11" fill="#1e293b" stroke="#f59e0b" stroke-opacity="0.5"/>
    <text x="300" y="38" fill="#fbbf24" font-size="11" font-weight="bold" text-anchor="middle">Обедненный слой (ОЗ)</text>
    
    <!-- Неподвижные ионы примесей -->
    <g transform="translate(205, 50)">
      <rect x="5" y="2" width="85" height="22" rx="4" fill="#3b82f6" fill-opacity="0.2"/>
      <text x="47" y="17" fill="#93c5fd" font-size="11" font-weight="bold" text-anchor="middle">- Ионы B⁻</text>
      
      <rect x="100" y="2" width="85" height="22" rx="4" fill="#10b981" fill-opacity="0.2"/>
      <text x="142" y="17" fill="#6ee7b7" font-size="11" font-weight="bold" text-anchor="middle">+ Ионы P⁺</text>
    </g>
    
    <!-- Поле E0 и барьер -->
    <line x1="365" y1="92" x2="235" y2="92" stroke="#fbbf24" stroke-width="1.8" marker-end="url(#arrow-amber)"/>
    <text x="300" y="87" fill="#fde68a" font-size="10" font-weight="bold" text-anchor="middle">Барьер E₀ (φ₀ ≈ 0.6–0.7 В)</text>

    <!-- N-область -->
    <rect x="415" y="15" width="165" height="95" rx="8" fill="url(#nGrad)" stroke="#10b981" stroke-width="1.8"/>
    <rect x="425" y="23" width="145" height="22" rx="11" fill="#1e293b" stroke="#10b981" stroke-opacity="0.4"/>
    <text x="497" y="38" fill="#34d399" font-size="12" font-weight="bold" text-anchor="middle">n-область (электронная)</text>
    <text x="497" y="65" fill="#94a3b8" font-size="11" text-anchor="middle">Доноры: P, As, Sb (V вал.)</text>
    <rect x="427" y="78" width="141" height="20" rx="4" fill="#0f172a" fill-opacity="0.7"/>
    <text x="497" y="92" fill="#34d399" font-size="10" font-weight="600" text-anchor="middle">Основные: e⁻ | Неосн: h⁺</text>

    <!-- Вывод Катода (-) справа -->
    <line x1="580" y1="62" x2="615" y2="62" stroke="#34d399" stroke-width="2.5"/>
    <circle cx="615" cy="62" r="4" fill="#34d399"/>
    <text x="595" y="52" fill="#34d399" font-size="11" font-weight="bold">К (−)</text>
  </g>

  <!-- ==================== ЧАСТЬ 2: ГРАФИК ВАХ (НИЗ) ==================== -->
  <g transform="translate(20, 155)">
    <rect x="0" y="0" width="600" height="190" rx="10" fill="#1b2336" stroke="#2b364e" stroke-width="1.2"/>
    
    <!-- Заголовок графика -->
    <text x="25" y="22" fill="#cbd5e1" font-size="12" font-weight="bold">Вольт-амперная характеристика (ВАХ) p-n перехода</text>

    <!-- Оси координат -->
    <!-- Ось Напряжения U: y = 115 -->
    <line x1="45" y1="115" x2="550" y2="115" stroke="#64748b" stroke-width="1.5" marker-end="url(#arrow)"/>
    <text x="555" y="119" fill="#cbd5e1" font-size="12" font-weight="bold">U, В</text>

    <!-- Ось Тока I: x = 240 -->
    <line x1="240" y1="175" x2="240" y2="25" stroke="#64748b" stroke-width="1.5" marker-end="url(#arrow)"/>
    <text x="248" y="32" fill="#cbd5e1" font-size="12" font-weight="bold">I, мА</text>
    <text x="228" y="128" fill="#94a3b8" font-size="11">0</text>

    <!-- Сетка пунктирная -->
    <line x1="100" y1="35" x2="100" y2="165" stroke="#334155" stroke-dasharray="2,3" stroke-width="0.8"/>
    <line x1="380" y1="35" x2="380" y2="165" stroke="#334155" stroke-dasharray="2,3" stroke-width="0.8"/>

    <!-- Прямая ветвь (U > 0, Экспонента Шокли) -->
    <path d="M 240 115 Q 320 114 360 102 Q 380 92 410 40" fill="none" stroke="#38bdf8" stroke-width="3" stroke-linecap="round"/>
    
    <!-- Точка порога U_пор ≈ 0.6 В -->
    <circle cx="365" cy="100" r="4" fill="#fbbf24"/>
    <rect x="325" y="125" width="115" height="20" rx="10" fill="#1e293b" stroke="#38bdf8" stroke-width="1"/>
    <text x="382" y="139" fill="#38bdf8" font-size="10" font-weight="bold" text-anchor="middle">Uпор ≈ 0.6 В (Si)</text>
    <line x1="365" y1="104" x2="365" y2="125" stroke="#38bdf8" stroke-dasharray="2,2"/>

    <!-- Формула прямой ветви -->
    <rect x="425" y="42" width="155" height="24" rx="6" fill="#0f172a" stroke="#38bdf8" stroke-opacity="0.6"/>
    <text x="502" y="58" fill="#38bdf8" font-size="11" font-weight="bold" text-anchor="middle">I ≈ I₀ · e^(U / φ_T)</text>

    <!-- Обратная ветвь (U < 0) -->
    <!-- Ток насыщения I0 и пробой -->
    <path d="M 240 115 L 120 118 L 90 168" fill="none" stroke="#f43f5e" stroke-width="2.4" stroke-linecap="round"/>
    
    <!-- Бейдж обратного тока I_0 -->
    <rect x="125" y="85" width="105" height="20" rx="10" fill="#1e293b" stroke="#f43f5e" stroke-width="1"/>
    <text x="177" y="99" fill="#f43f5e" font-size="10" font-weight="bold" text-anchor="middle">I₀ (доли мкА)</text>
    <line x1="177" y1="105" x2="177" y2="117" stroke="#f43f5e" stroke-dasharray="2,2"/>

    <!-- Бейдж Пробоя -->
    <rect x="35" y="135" width="85" height="20" rx="10" fill="#1e293b" stroke="#ef4444" stroke-width="1"/>
    <text x="77" y="149" fill="#ef4444" font-size="10" font-weight="bold" text-anchor="middle">Пробой Uпр</text>
    <circle cx="95" cy="155" r="3.5" fill="#ef4444"/>

    <!-- Легенда справа внизу -->
    <g transform="translate(435, 140)">
      <circle cx="6" cy="6" r="4" fill="#38bdf8"/>
      <text x="16" y="10" fill="#cbd5e1" font-size="10">Прямое включение (+ p, − n)</text>
      <circle cx="6" cy="24" r="4" fill="#f43f5e"/>
      <text x="16" y="28" fill="#cbd5e1" font-size="10">Обратное включение (+ n, − p)</text>
    </g>
  </g>
</svg>"""

print("Q1 SVG prepared, length:", len(Q1_NEW_SVG))
