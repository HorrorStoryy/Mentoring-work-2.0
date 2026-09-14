/* ===========================================================
   Часть 2: представления (экраны)
   =========================================================== */
(function () {
'use strict';
var A = window.AppCore;
var $ = A.$, $$ = A.$$, esc = A.esc, num = A.num, fmt = A.fmt, money = A.money;

function S() { return A.S; }
function M() { return A.M; }
function PLANS() { return A.PLANS; }

/* ---------- пустое состояние ---------- */
function emptyState(title, sub, icon) {
  return '<div class="empty">' +
    (icon || '<svg fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 17V9m4 8V5m4 12v-4M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>') +
    '<h4>' + esc(title) + '</h4>' +
    (sub ? '<p>' + esc(sub) + '</p>' : '') +
    '</div>';
}

/* ================= ДАШБОРД ================= */
function viewDashboard() {
  var emps = A.myEmployees();
  var code = S().month;
  if (!emps.length) return emptyState('Нет подопечных за этот месяц', 'Выберите другой месяц в меню слева');

  var cards = emps.map(function (e) {
    var t = e.total || {};
    var ql = A.qLevel(t.quality);
    var el = A.eLevel(t.efficiency);
    var wq = num(t.quality) || 0;
    var doneWeeks = (e.weeks || []).filter(function (w) { return num(w.quality) !== null; }).length;
    var plan = A.getPlan(e.name, code);
    var hasPlan = (plan.competencies && plan.competencies.length) || plan.expected_result || plan.action_plan;

    return '' +
      '<div class="emp">' +
        '<div class="emp-head">' +
          '<div class="av">' + esc(A.initials(e.name)) + '</div>' +
          '<div class="who">' +
            '<div class="nm">' + esc(e.name) + '</div>' +
            '<div class="meta">' + esc(e.position || 'Специалист') + ' · ВС: ' + esc(e.vs || '—') + '</div>' +
          '</div>' +
          '<span class="badge ' + (hasPlan ? 'b-brand' : 'b-grey') + '">' + (hasPlan ? 'План заполнен' : 'Нет плана') + '</span>' +
        '</div>' +
        '<div class="emp-metrics">' +
          '<div class="mt">' +
            '<div class="lb">Качество</div>' +
            '<div class="vl ' + A.lvlClass(ql) + '">' + fmt(t.quality, 1) + '<small>%</small></div>' +
            '<div class="bar"><i class="' + ql + '" style="width:' + Math.min(wq, 100) + '%"></i></div>' +
          '</div>' +
          '<div class="mt">' +
            '<div class="lb">Эффективность</div>' +
            '<div class="vl ' + A.lvlClass(el) + '">' + fmt(t.efficiency, 2) + '</div>' +
            '<div class="hint">из 5.00</div>' +
          '</div>' +
          '<div class="mt">' +
            '<div class="lb">Жалобы / залёты</div>' +
            '<div class="vl ' + ((num(t.complaints) || 0) + (num(t.incidents) || 0) > 0 ? 'v-bad' : 'v-ok') + '">' +
              (num(t.complaints) || 0) + '<small>/</small>' + (num(t.incidents) || 0) +
            '</div>' +
            (money(t.incidents_sum) ? '<div class="hint">' + money(t.incidents_sum) + '</div>' : '<div class="hint">сумма залётов: 0</div>') +
          '</div>' +
          '<div class="mt">' +
            '<div class="lb">Недель закрыто</div>' +
            '<div class="vl ' + (doneWeeks ? 'v-none' : 'v-none') + '">' + doneWeeks + '<small>из ' + (e.weeks || []).length + '</small></div>' +
            '<div class="hint">по данным месяцев</div>' +
          '</div>' +
        '</div>' +
        '<div class="emp-foot">' +
          '<button class="btn btn-ghost btn-sm" data-act="profile" data-emp="' + esc(e.name) + '">История</button>' +
          '<button class="btn btn-soft btn-sm" data-act="goto-plan" data-emp="' + esc(e.name) + '">План и результат</button>' +
        '</div>' +
      '</div>';
  }).join('');

  return '' +
    '<div class="row-between" style="margin-bottom:16px">' +
      '<div>' +
        '<div class="section-cap" style="margin:0">Подопечные на ' + esc(A.monthLabel(code)) + '</div>' +
      '</div>' +
      '<div class="row">' +
        '<span class="badge b-brand">' + emps.length + ' сотрудника</span>' +
      '</div>' +
    '</div>' +
    '<div class="grid-cards">' + cards + '</div>' +
    summaryStrip(emps);
}

function summaryStrip(emps) {
  var qs = [], es = [], comp = 0, inc = 0, incSum = 0, comps = 0;
  emps.forEach(function (e) {
    var t = e.total || {};
    if (num(t.quality) !== null) qs.push(num(t.quality));
    if (num(t.efficiency) !== null) es.push(num(t.efficiency));
    comp += num(t.complaints) || 0;
    inc += num(t.incidents) || 0;
    incSum += num(t.incidents_sum) || 0;
    var p = A.getPlan(e.name, S().month);
    comps += (p.competencies || []).length;
  });
  function avg(a) { return a.length ? a.reduce(function (x, y) { return x + y; }, 0) / a.length : null; }
  var avgQ = avg(qs), avgE = avg(es);

  function stat(label, val, sub, cls) {
    return '<div class="stat">' +
      '<div class="lb">' + esc(label) + '</div>' +
      '<div class="vl ' + (cls || '') + '">' + val + '</div>' +
      (sub ? '<div class="sub">' + esc(sub) + '</div>' : '') +
      '</div>';
  }

  return '' +
    '<div class="section-cap" style="margin:26px 0 11px">Сводка по месяцу</div>' +
    '<div class="grid-stat">' +
      stat('Среднее качество', fmt(avgQ, 1) + '%', qs.length + ' сотр. с данными', A.lvlClass(A.qLevel(avgQ))) +
      stat('Средняя эффективность', fmt(avgE, 2), 'из 5.00', A.lvlClass(A.eLevel(avgE))) +
      stat('Жалобы', comp, 'за месяц', comp > 0 ? 'v-bad' : 'v-ok') +
      stat('Залёты', inc, incSum ? money(incSum) : 'сумма 0', inc > 0 ? 'v-bad' : 'v-ok') +
      stat('Компетенций в работе', comps, 'во всех планах') +
    '</div>';
}

/* ================= ПОКАЗАТЕЛИ ================= */
function viewMetrics() {
  var emps = A.myEmployees();
  var code = S().month;
  if (!emps.length) return emptyState('Нет данных за этот месяц', 'Выберите другой месяц');

  var prev = A.prevMonthsOf(code);
  var cur = M()[code];

  var head = '<tr class="grp">' +
    '<th class="stick stick-1" rowspan="2" style="vertical-align:bottom">Ведущий</th>' +
    '<th class="stick stick-2" rowspan="2" style="vertical-align:bottom">Сотрудник</th>';
  prev.forEach(function (p) {
    head += '<th colspan="4" class="c">' + esc(A.monthLabelShort(p)) + '</th>';
  });
  head += '<th colspan="' + ((cur.weeks || []).length + 4) + '" class="c" style="background:#EFEBFD;color:#5A3BD6">' +
          esc(A.monthLabelShort(code)) + ' — текущий</th></tr><tr class="sub">';
  prev.forEach(function () {
    head += '<th class="c">К</th><th class="c">Э</th><th class="c">Ж</th><th class="c">З</th>';
  });
  (cur.weeks || []).forEach(function (w) {
    head += '<th class="c">' + esc(String(w.week).replace(/\s/g, '')) + '</th>';
  });
  head += '<th class="c" style="background:#F3F4F8">Итог К</th><th class="c" style="background:#F3F4F8">Итог Э</th>' +
          '<th class="c" style="background:#F3F4F8">Ж</th><th class="c" style="background:#F3F4F8">З</th></tr>';

  var body = emps.map(function (e) {
    var prevData = e.prev || [];
    var row = '<tr>' +
      '<td class="stick stick-1">' + esc(e.vs || '—') + '</td>' +
      '<td class="stick stick-2">' + esc(e.name) + '</td>';

    prevData.forEach(function (p) {
      row += '<td class="c">' + A.pill(p.quality, 'q', 2) + '</td>' +
             '<td class="c">' + A.pill(p.efficiency, 'e', 2) + '</td>' +
             '<td class="c">' + A.pillCnt(p.complaints) + '</td>' +
             '<td class="c">' + A.pillCnt(p.incidents) + '</td>';
    });
    var missPrev = 3 - prevData.length;
    for (var i = 0; i < missPrev; i++) row += '<td class="c">—</td><td class="c">—</td><td class="c">—</td><td class="c">—</td>';

    (cur.weeks || []).forEach(function (w) {
      var curW = null;
      for (var k = 0; k < (e.weeks || []).length; k++) {
        if (e.weeks[k].week === w.week) { curW = e.weeks[k]; break; }
      }
      if (curW && num(curW.quality) !== null) {
        row += '<td class="c">' + A.pill(curW.quality, 'q', 2) + '</td>';
      } else if (curW && curW.note) {
        row += '<td class="c"><span class="badge b-grey">' + esc(curW.note) + '</span></td>';
      } else {
        row += '<td class="c faint">—</td>';
      }
    });

    var t = e.total || {};
    row += '<td class="c" style="background:#FBFBFC">' + A.pill(t.quality, 'q', 2) + '</td>' +
           '<td class="c" style="background:#FBFBFC">' + A.pill(t.efficiency, 'e', 2) + '</td>' +
           '<td class="c" style="background:#FBFBFC">' + A.pillCnt(t.complaints) + '</td>' +
           '<td class="c" style="background:#FBFBFC">' + A.pillCnt(t.incidents) + '</td></tr>';
    return row;
  }).join('');

  return '' +
    '<div class="card">' +
      '<div class="card-head">' +
        '<div><h3>Показатели сотрудников</h3>' +
        '<div class="sub">Три предыдущих месяца для сравнения и текущий месяц по неделям</div></div>' +
        '<div class="row">' +
          '<button class="btn btn-ghost btn-sm" data-act="export-metrics-xlsx">' +
            '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v13m0 0l-4-4m4 4l4-4M4 19h16"/></svg>Excel</button>' +
          '<button class="btn btn-ghost btn-sm" data-act="export-metrics-csv">' +
            '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6M8 3h8l4 4v14H4V3z"/></svg>CSV</button>' +
        '</div>' +
      '</div>' +
      '<div class="tw"><table class="data"><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div>' +
      '<div class="legend">' +
        '<span><b>К</b> — качество, %</span>' +
        '<span><b>Э</b> — эффективность</span>' +
        '<span><b>Ж</b> — жалобы</span>' +
        '<span><b>З</b> — залёты</span>' +
        '<span style="margin-left:auto">' + A.dot('ok') + ' норма · ' + A.dot('warn') + ' внимание · ' + A.dot('bad') + ' ниже нормы</span>' +
      '</div>' +
    '</div>';
}

/* ================= ПЛАН И РЕЗУЛЬТАТ ================= */
function planStatusBadge(st) {
  if (st === 'approved') return '<span class="badge b-ok">Согласован</span>';
  if (st === 'sent') return '<span class="badge b-warn">На согласовании</span>';
  if (st === 'rework') return '<span class="badge b-bad">На доработке</span>';
  return '<span class="badge b-grey">Черновик</span>';
}

function viewPlans() {
  var emps = A.myEmployees();
  var code = S().month;
  if (!emps.length) return emptyState('Нет подопечных за этот месяц', 'Выберите другой месяц');

  var list = emps.map(function (e) {
    var p = A.getPlan(e.name, code);
    var t = e.total || {};
    var has = (p.competencies || []).length || p.expected_result || p.action_plan || (p.complaints || []).length;

    var complaintsHtml = (p.complaints || []).length
      ? '<div class="links">' + p.complaints.map(function (c) {
          return '<a href="' + esc(c) + '" target="_blank" rel="noopener" style="font-size:13px">' + esc(c) + '</a>';
        }).join('') + '</div>'
      : '<div class="txt muted">жалоб не зафиксировано</div>';

    var compsHtml = (p.competencies || []).length
      ? '<div class="chip-list">' + p.competencies.map(function (c) { return '<span class="tag">' + esc(c) + '</span>'; }).join('') + '</div>'
      : '<div class="txt muted">не указаны</div>';

    if (!has) {
      return '' +
        '<div class="plan">' +
          '<div class="plan-head">' +
            '<div class="av">' + esc(A.initials(e.name)) + '</div>' +
            '<div class="who"><h3>' + esc(e.name) + '</h3>' +
              '<div class="meta">' + esc(e.position || '') + ' · ВС: ' + esc(e.vs || '') + '</div></div>' +
            planStatusBadge(p.status) +
          '</div>' +
          '<div class="card-body">' +
            '<div class="txt muted">План на ' + esc(A.monthLabel(code)) + ' ещё не заполнен.</div>' +
          '</div>' +
          (A.canEdit() ? '<div class="card-foot">' +
            '<button class="btn btn-primary btn-sm" data-act="edit-plan" data-emp="' + esc(e.name) + '">Заполнить план</button>' +
          '</div>' : '') +
        '</div>';
    }

    return '' +
      '<div class="plan">' +
        '<div class="plan-head">' +
          '<div class="av">' + esc(A.initials(e.name)) + '</div>' +
          '<div class="who"><h3>' + esc(e.name) + '</h3>' +
            '<div class="meta">' + esc(e.position || '') + ' · ВС: ' + esc(e.vs || '') + ' · ' + esc(A.monthLabel(code)) + '</div></div>' +
          '<div class="row">' +
            planStatusBadge(p.status) +
            '<span class="pill p-' + A.qLevel(t.quality) + '">К ' + fmt(t.quality, 1) + '</span>' +
            '<span class="pill p-' + A.eLevel(t.efficiency) + '">Э ' + fmt(t.efficiency, 2) + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="plan-body">' +
          '<div class="grid-2">' +
            '<div class="blk"><div class="lb">Жалобы / инциденты</div>' + complaintsHtml + '</div>' +
            '<div class="blk"><div class="lb">Залёты</div>' +
              '<div class="txt">' + (money(p.incidents_sum) ? '<span class="badge b-bad">' + money(p.incidents_sum) + '</span>' : (num(t.incidents) ? '<span class="badge b-bad">' + t.incidents + ' шт.</span>' : '<span class="badge b-ok">нет залётов</span>')) + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="blk"><div class="lb">Компетенции</div>' + compsHtml + '</div>' +
          '<div class="blk"><div class="lb">Ожидаемый результат</div>' +
            '<div class="txt' + (p.expected_result ? '' : ' muted') + '">' + esc(p.expected_result || 'не указан') + '</div></div>' +
          '<div class="blk"><div class="lb">План работы</div>' +
            '<div class="txt' + (p.action_plan ? '' : ' muted') + '">' + esc(p.action_plan || 'не указан') + '</div></div>' +
          '<div class="blk"><div class="lb">Итог</div>' +
            '<div class="txt' + (p.result ? '' : ' muted') + '">' + esc(p.result || 'заполняется по окончании месяца') + '</div></div>' +
        '</div>' +
        '<div class="card-foot">' +
          (A.canEdit() ? '<button class="btn btn-ghost btn-sm" data-act="edit-plan" data-emp="' + esc(e.name) + '">Редактировать</button>' : '') +
          (A.canEdit() && p.status !== 'sent' && p.status !== 'approved' ? '<button class="btn btn-soft btn-sm" data-act="send-plan" data-emp="' + esc(e.name) + '">Отправить на согласование</button>' : '') +
          (A.canApprove() && p.status === 'sent' ? '<button class="btn btn-ghost btn-sm" data-act="return-plan" data-emp="' + esc(e.name) + '">На доработку</button><button class="btn btn-primary btn-sm" data-act="approve-plan" data-emp="' + esc(e.name) + '">Согласовать</button>' : '') +
        '</div>' +
      '</div>';
  }).join('');

  return '' +
    '<div class="row-between" style="margin-bottom:14px">' +
      '<div class="section-cap" style="margin:0">Планы на ' + esc(A.monthLabel(code)) + '</div>' +
      '<button class="btn btn-ghost btn-sm" data-act="export-plans-csv">' +
        '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6M8 3h8l4 4v14H4V3z"/></svg>CSV</button>' +
    '</div>' +
    list;
}

/* ---------- форма плана ---------- */
function viewPlanForm(empName) {
  var code = S().month;
  var e = A.empIn(empName, code);
  if (!e) return emptyState('Сотрудник не найден', '');
  var p = A.getPlan(empName, code);

  var links = (p.complaints || []).length ? p.complaints : [''];
  var linksHtml = links.map(function (c, i) {
    return '<div class="link-row">' +
      '<input class="inp" type="text" data-link="' + i + '" value="' + esc(c) + '" placeholder="https://tracker.yandex.ru/CLAIM-000000">' +
      '<button class="x-btn" data-act="del-link" data-idx="' + i + '" title="Удалить">' +
        '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.9 12a2 2 0 01-2 1.9H7.9a2 2 0 01-2-1.9L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>' +
      '</button></div>';
  }).join('');

  var chips = (p.competencies || []).map(function (c, i) {
    return '<span class="chip">' + esc(c) + '<button data-act="del-comp" data-idx="' + i + '" title="Убрать">×</button></span>';
  }).join('');

  return '' +
    '<div class="card">' +
      '<div class="card-head">' +
        '<div><h3>План: ' + esc(empName) + '</h3>' +
        '<div class="sub">' + esc(A.monthLabel(code)) + ' · ' + esc(e.position || '') + ' · ВС: ' + esc(e.vs || '') + '</div></div>' +
        '<button class="btn btn-ghost btn-sm" data-act="back-plans">Назад</button>' +
      '</div>' +
      '<div class="card-body">' +
        '<div class="grid-2" style="margin-bottom:16px">' +
          '<div class="field" style="margin:0">' +
            '<label>Жалобы / инциденты (ссылки)</label>' +
            '<div class="links" id="f-links">' + linksHtml + '</div>' +
            '<button class="add-dash" data-act="add-link">+ добавить ссылку</button>' +
          '</div>' +
          '<div class="field" style="margin:0">' +
            '<label>Сумма залётов, ₽</label>' +
            '<input class="inp" type="number" step="0.01" id="f-inc" value="' + (p.incidents_sum || '') + '" placeholder="0">' +
          '</div>' +
        '</div>' +
        '<div class="field">' +
          '<label>Компетенции</label>' +
          '<div class="chip-list" id="f-comps">' + chips +
            '<input class="chip-input" id="f-comp-new" placeholder="введите и нажмите Enter">' +
          '</div>' +
        '</div>' +
        '<div class="field">' +
          '<label>Ожидаемый результат</label>' +
          '<textarea id="f-expected" placeholder="Что должно измениться к концу месяца">' + esc(p.expected_result || '') + '</textarea>' +
        '</div>' +
        '<div class="field">' +
          '<label>План работы</label>' +
          '<textarea id="f-action" placeholder="Конкретные шаги наставника и сотрудника">' + esc(p.action_plan || '') + '</textarea>' +
        '</div>' +
        '<div class="field" style="margin:0">' +
          '<label>Итог</label>' +
          '<textarea id="f-result" placeholder="Заполняется по окончании месяца">' + esc(p.result || '') + '</textarea>' +
        '</div>' +
      '</div>' +
      '<div class="card-foot">' +
        '<button class="btn btn-ghost" data-act="back-plans">Отмена</button>' +
        '<button class="btn btn-ghost" data-act="save-plan-draft" data-emp="' + esc(empName) + '">Сохранить черновик</button>' +
        '<button class="btn btn-primary" data-act="save-plan-send" data-emp="' + esc(empName) + '">Сохранить и отправить</button>' +
      '</div>' +
    '</div>';
}

/* ================= ИСТОРИЯ ================= */
function viewHistory() {
  var idx = A.indexByName();
  var names = Object.keys(idx).sort(function (a, b) { return idx[b].months.length - idx[a].months.length; });

  var cards = names.map(function (n) {
    var o = idx[n];
    var months = o.months.slice().sort();
    var vals = [], comp = 0, inc = 0;
    months.forEach(function (c) {
      var e = A.empIn(n, c);
      if (e && e.total) {
        if (num(e.total.quality) !== null) vals.push(num(e.total.quality));
        comp += num(e.total.complaints) || 0;
        inc += num(e.total.incidents) || 0;
      }
    });
    var avgQ = vals.length ? vals.reduce(function (x, y) { return x + y; }, 0) / vals.length : null;
    var vsList = Object.keys(o.vs).filter(Boolean).join(', ');

    return '' +
      '<div class="emp">' +
        '<div class="emp-head">' +
          '<div class="av">' + esc(A.initials(n)) + '</div>' +
          '<div class="who">' +
            '<div class="nm">' + esc(n) + '</div>' +
            '<div class="meta">ВС: ' + esc(vsList || '—') + '</div>' +
          '</div>' +
          '<span class="badge b-brand">' + months.length + ' мес.</span>' +
        '</div>' +
        '<div class="emp-metrics">' +
          '<div class="mt"><div class="lb">Среднее качество</div>' +
            '<div class="vl ' + A.lvlClass(A.qLevel(avgQ)) + '">' + fmt(avgQ, 1) + '<small>%</small></div></div>' +
          '<div class="mt"><div class="lb">Жалоб / залётов</div>' +
            '<div class="vl ' + ((comp + inc) > 0 ? 'v-bad' : 'v-ok') + '">' + comp + '<small>/</small>' + inc + '</div></div>' +
        '</div>' +
        '<div class="card-body" style="padding:12px 19px;border-top:1px solid var(--border)">' +
          '<div class="chip-list">' + months.map(function (c) {
            return '<span class="badge b-grey">' + esc(A.monthLabelShort(c)) + '</span>';
          }).join('') + '</div>' +
        '</div>' +
        '<div class="emp-foot">' +
          '<button class="btn btn-soft btn-sm" data-act="profile" data-emp="' + esc(n) + '">Открыть профиль</button>' +
        '</div>' +
      '</div>';
  }).join('');

  return '' +
    '<div class="row-between" style="margin-bottom:14px">' +
      '<div class="section-cap" style="margin:0">Все сотрудники за всё время</div>' +
      '<button class="btn btn-ghost btn-sm" data-act="export-history-csv">' +
        '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6M8 3h8l4 4v14H4V3z"/></svg>CSV</button>' +
    '</div>' +
    '<div class="grid-cards">' + cards + '</div>';
}

/* ---------- профиль сотрудника ---------- */
function viewProfile(name) {
  var idx = A.indexByName();
  var o = idx[name];
  if (!o) return emptyState('Сотрудник не найден', '');

  var codes = o.months.slice().sort().reverse();
  var vsList = Object.keys(o.vs).filter(Boolean).join(', ');

  var qs = [], es = [], comp = 0, inc = 0, incSum = 0;
  codes.forEach(function (c) {
    var e = A.empIn(name, c);
    if (!e || !e.total) return;
    if (num(e.total.quality) !== null) qs.push(num(e.total.quality));
    if (num(e.total.efficiency) !== null) es.push(num(e.total.efficiency));
    comp += num(e.total.complaints) || 0;
    inc += num(e.total.incidents) || 0;
    incSum += num(e.total.incidents_sum) || 0;
  });
  function avg(a) { return a.length ? a.reduce(function (x, y) { return x + y; }, 0) / a.length : null; }
  var avgQ = avg(qs), avgE = avg(es);
  var best = qs.length ? Math.max.apply(null, qs) : null;

  var timeline = codes.map(function (c) {
    var e = A.empIn(name, c);
    if (!e) return '';
    var t = e.total || {};
    var isCur = c === S().month;

    var weeksHtml = (e.weeks || []).length ? '<div class="weeks">' +
      '<div class="weeks-cap">Итоги недель</div>' +
      (e.weeks || []).map(function (w) {
        var note = A.getWeekNote(name, c, w.week);
        var hasData = num(w.quality) !== null || num(w.efficiency) !== null;
        var vals = '<div class="wk-vals">' +
          '<span>К <b>' + (num(w.quality) !== null ? fmt(w.quality, 1) + '%' : '—') + '</b></span>' +
          '<span>Э <b>' + (num(w.efficiency) !== null ? fmt(w.efficiency, 2) : '—') + '</b></span>' +
          '<span>Ж <b>' + (num(w.complaints) || 0) + '</b></span>' +
          '<span>З <b>' + (num(w.incidents) || 0) + '</b></span>' +
        '</div>';
        return '<div class="wk">' +
          '<div class="wk-top"><span class="wk-date">' + esc(w.week) + '</span>' +
            (w.note ? '<span class="badge b-grey">' + esc(w.note) + '</span>' : '') +
          '</div>' +
          vals +
          (note ? '<div class="wk-note">' + esc(note) + '</div>' : '<div class="wk-note none">итог недели не заполнен</div>') +
          (A.canEdit() ? '<div class="wk-actions">' +
            '<button class="btn btn-ghost btn-sm" data-act="edit-week" data-emp="' + esc(name) + '" data-code="' + esc(c) + '" data-week="' + esc(w.week) + '">' +
            (note ? 'Изменить итог недели' : 'Написать итог недели') + '</button></div>' : '') +
        '</div>';
      }).join('') +
    '</div>' : '';

    return '' +
      '<div class="tl-item' + (isCur ? ' now' : '') + '">' +
        '<div class="tl-card">' +
          '<div class="tl-head">' +
            '<h4>' + esc(A.monthLabel(c)) + '</h4>' +
            '<div class="sp">' +
              (money(t.incidents_sum) ? '<span class="badge b-bad">залёты ' + money(t.incidents_sum) + '</span>' : '') +
              (num(t.complaints) ? '<span class="badge b-warn">жалоб ' + t.complaints + '</span>' : '') +
            '</div>' +
          '</div>' +
          '<div class="tl-body">' +
            '<div class="tl-m"><div class="lb">Качество</div><div class="vl ' + A.lvlClass(A.qLevel(t.quality)) + '">' + (num(t.quality) !== null ? fmt(t.quality, 1) + '%' : '—') + '</div></div>' +
            '<div class="tl-m"><div class="lb">Эффективность</div><div class="vl ' + A.lvlClass(A.eLevel(t.efficiency)) + '">' + (num(t.efficiency) !== null ? fmt(t.efficiency, 2) : '—') + '</div></div>' +
            '<div class="tl-m"><div class="lb">Жалобы</div><div class="vl ' + ((num(t.complaints) || 0) > 0 ? 'v-bad' : 'v-ok') + '">' + (num(t.complaints) || 0) + '</div></div>' +
            '<div class="tl-m"><div class="lb">Залёты</div><div class="vl ' + ((num(t.incidents) || 0) > 0 ? 'v-bad' : 'v-ok') + '">' + (num(t.incidents) || 0) + '</div></div>' +
            '<div class="tl-m"><div class="lb">Позиция</div><div class="vl" style="font-size:13px;font-weight:550">' + esc(e.position || '—') + '</div></div>' +
          '</div>' +
          weeksHtml +
        '</div>' +
      '</div>';
  }).join('');

  return '' +
    '<div class="row" style="margin-bottom:16px">' +
      '<button class="btn btn-ghost btn-sm" data-act="back-history">← К списку</button>' +
    '</div>' +
    '<div class="profile" style="margin-bottom:22px">' +
      '<div class="av av-lg">' + esc(A.initials(name)) + '</div>' +
      '<div class="info">' +
        '<h3>' + esc(name) + '</h3>' +
        '<div class="meta">' +
          '<span class="badge b-grey">' + esc(vsList || '—') + '</span>' +
          '<span class="badge b-brand">' + codes.length + ' мес. в работе</span>' +
          '<span class="badge b-grey">' + esc(A.monthLabel(o.first)) + ' → ' + esc(A.monthLabel(o.last)) + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="grid-stat" style="width:100%">' +
        '<div class="stat"><div class="lb">Среднее качество</div><div class="vl ' + A.lvlClass(A.qLevel(avgQ)) + '">' + fmt(avgQ, 1) + '%</div><div class="sub">лучший: ' + fmt(best, 1) + '%</div></div>' +
        '<div class="stat"><div class="lb">Средняя эффективность</div><div class="vl ' + A.lvlClass(A.eLevel(avgE)) + '">' + fmt(avgE, 2) + '</div><div class="sub">из 5.00</div></div>' +
        '<div class="stat"><div class="lb">Жалобы всего</div><div class="vl ' + (comp > 0 ? 'v-bad' : 'v-ok') + '">' + comp + '</div></div>' +
        '<div class="stat"><div class="lb">Залёты всего</div><div class="vl ' + (inc > 0 ? 'v-bad' : 'v-ok') + '">' + inc + '</div><div class="sub">' + (incSum ? money(incSum) : 'сумма 0') + '</div></div>' +
      '</div>' +
    '</div>' +
    '<div class="section-cap">Динамика по месяцам</div>' +
    '<div class="timeline">' + timeline + '</div>';
}

/* ================= ПОЛЬЗОВАТЕЛИ ================= */
function viewUsers() {
  if (!A.canManageUsers()) return emptyState('Раздел недоступен', 'Управление пользователями доступно администратору и РО');

  var rows = A.USERS.map(function (u, i) {
    return '<tr>' +
      '<td>' + esc(u.name) + '</td>' +
      '<td><code style="background:var(--bg);padding:2px 7px;border-radius:5px;font-size:12.5px">' + esc(u.login) + '</code></td>' +
      '<td><span class="badge ' + (u.role === 'admin' ? 'b-brand' : u.role === 'vs' ? 'b-grey' : 'b-ok') + '">' + esc(u.title || u.role) + '</span></td>' +
      '<td class="c">' + (u.role === 'admin' ? '<span class="faint">—</span>' :
        '<button class="x-btn" data-act="del-user" data-idx="' + i + '" title="Удалить">' +
        '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.9 12a2 2 0 01-2 1.9H7.9a2 2 0 01-2-1.9L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>') + '</td>' +
    '</tr>';
  }).join('');

  return '' +
    '<div class="card">' +
      '<div class="card-head">' +
        '<div><h3>Пользователи системы</h3><div class="sub">Учётные записи и роли доступа</div></div>' +
        '<button class="btn btn-primary btn-sm" data-act="add-user">+ Добавить пользователя</button>' +
      '</div>' +
      '<div class="tw"><table class="data"><thead><tr>' +
        '<th>Имя</th><th>Логин</th><th>Роль</th><th class="c">Действие</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
    '</div>';
}

/* ================= ЖУРНАЛ ================= */
function viewLog() {
  if (!A.LOG.length) return emptyState('Изменений пока нет', 'Здесь будет история правок');

  var rows = A.LOG.map(function (l) {
    var d = new Date(l.ts);
    var when = d.toLocaleDateString('ru-RU') + ' ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    return '<tr>' +
      '<td class="mono" style="white-space:nowrap">' + esc(when) + '</td>' +
      '<td>' + esc(l.who) + '</td>' +
      '<td>' + esc(l.action) + '</td>' +
      '<td>' + esc(l.target) + '</td>' +
    '</tr>';
  }).join('');

  return '' +
    '<div class="card">' +
      '<div class="card-head"><div><h3>История изменений</h3>' +
      '<div class="sub">Кто, когда и что изменил — последние ' + A.LOG.length + ' записей</div></div></div>' +
      '<div class="tw scroll"><table class="data"><thead><tr>' +
        '<th>Когда</th><th>Кто</th><th>Действие</th><th>Объект</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
    '</div>';
}

window.AppViews = {
  emptyState: emptyState,
  viewDashboard: viewDashboard,
  viewMetrics: viewMetrics,
  viewPlans: viewPlans,
  viewPlanForm: viewPlanForm,
  viewHistory: viewHistory,
  viewProfile: viewProfile,
  viewUsers: viewUsers,
  viewLog: viewLog,
  summaryStrip: summaryStrip
};
})();
