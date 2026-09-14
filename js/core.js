/* ===========================================================
   Smartway Mentoring — приложение
   Часть 1: состояние, утилиты, хранилище, авторизация
   =========================================================== */
(function () {
'use strict';

var DATA = window.APP_DATA || { months:{}, plans:{}, users:[], thresholds:{} };
var LS_DATA = 'swm_data_v1';
var LS_SESSION = 'swm_session_v1';

var S = {
  user: null,
  page: 'dashboard',
  month: null,
  openProfile: null,
  filterVS: '',
  search: '',
  planStatus: 'all'
};
var M = {};       // месяцы (с учётом правок)
var PLANS = {};   // планы (с учётом правок)
var USERS = [];
var LOG = [];     // история изменений
var NOTES = {};   // заметки по неделям

/* ---------- утилиты ---------- */
function $(s, root) { return (root || document).querySelector(s); }
function $$(s, root) { return Array.prototype.slice.call((root || document).querySelectorAll(s)); }

function esc(v) {
  if (v === null || v === undefined) return '';
  return String(v).replace(/[&<>"']/g, function (c) {
    return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
  });
}
function num(v) {
  if (v === null || v === undefined || v === '') return null;
  var n = parseFloat(String(v).replace(',', '.'));
  return isNaN(n) ? null : n;
}
function fmt(v, dec) {
  var n = num(v);
  if (n === null) return '—';
  return n.toFixed(dec === undefined ? 2 : dec);
}
function money(v) {
  var n = num(v);
  if (!n) return null;
  return n.toLocaleString('ru-RU', { maximumFractionDigits: 2 }) + ' ₽';
}
function initials(name) {
  if (!name) return '?';
  var p = String(name).trim().split(/\s+/);
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
  return (p[0].charAt(0) + p[1].charAt(0)).toUpperCase();
}
function fullName(lastName, nameStr) {
  var parts = String(nameStr || '').split(/\s+/);
  if (parts.length >= 2) return parts[0] + ' ' + parts[1].charAt(0) + '.';
  return nameStr || '';
}
function monthLabel(code) {
  if (M[code] && M[code].label) return M[code].label;
  var names = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
  var p = String(code).split('-');
  return names[parseInt(p[1], 10) - 1] + ' ' + p[0];
}
function monthShort(code) {
  var names = ['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'];
  var p = String(code).split('-');
  return names[parseInt(p[1], 10) - 1];
}
function monthLabelShort(code) {
  var names = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
  var p = String(code).split('-');
  return names[parseInt(p[1], 10) - 1].slice(0, 3) + ' ' + p[0].slice(2);
}

/* ---------- цветовые оценки ---------- */
function qLevel(v) {
  var n = num(v);
  if (n === null) return 'none';
  if (n >= 90) return 'ok';
  if (n >= 85) return 'warn';
  return 'bad';
}
function eLevel(v) {
  var n = num(v);
  if (n === null) return 'none';
  if (n >= 4) return 'ok';
  if (n >= 3.5) return 'warn';
  return 'bad';
}
function lvlClass(l) { return 'v-' + l; }
function pill(v, type, dec) {
  var l = type === 'q' ? qLevel(v) : eLevel(v);
  var n = num(v);
  var txt = n === null ? '—' : fmt(v, dec === undefined ? 2 : dec);
  return '<span class="pill p-' + l + '">' + txt + '</span>';
}
function pillCnt(v) {
  var n = num(v) || 0;
  return '<span class="pill p-' + (n > 0 ? 'bad' : 'ok') + '">' + n + '</span>';
}
function dot(l) { return '<span class="dot dot-' + l + '"></span>'; }

/* ---------- хранилище ---------- */
function save() {
  try {
    localStorage.setItem(LS_DATA, JSON.stringify({
      months: M, plans: PLANS, users: USERS, log: LOG, notes: NOTES, ts: Date.now()
    }));
  } catch (e) { console.warn('save failed', e); }
}
function restore() {
  var raw = null;
  try { raw = localStorage.getItem(LS_DATA); } catch (e) {}
  if (!raw) {
    M = JSON.parse(JSON.stringify(DATA.months || {}));
    PLANS = JSON.parse(JSON.stringify(DATA.plans || {}));
    USERS = JSON.parse(JSON.stringify(DATA.users || []));
    LOG = []; NOTES = {};
    return;
  }
  try {
    var d = JSON.parse(raw);
    M = d.months || JSON.parse(JSON.stringify(DATA.months || {}));
    PLANS = d.plans || {};
    USERS = d.users || JSON.parse(JSON.stringify(DATA.users || []));
    LOG = d.log || [];
    NOTES = d.notes || {};
  } catch (e) {
    M = JSON.parse(JSON.stringify(DATA.months || {}));
    PLANS = {}; USERS = JSON.parse(JSON.stringify(DATA.users || [])); LOG = []; NOTES = {};
  }
}
function pushLog(action, target, extra) {
  LOG.unshift({
    ts: Date.now(),
    who: S.user ? S.user.name : '—',
    role: S.user ? S.user.role : '',
    action: action,
    target: target || '',
    extra: extra || ''
  });
  if (LOG.length > 400) LOG.length = 400;
}

/* ---------- права ---------- */
function isBoss() { return S.user && (S.user.role === 'admin' || S.user.role === 'ro' || S.user.role === 'rg'); }
function canEdit() { return S.user && (S.user.role === 'admin' || S.user.role === 'vs'); }
function canApprove() { return S.user && (S.user.role === 'admin' || S.user.role === 'ro' || S.user.role === 'rg'); }
function canManageUsers() { return S.user && (S.user.role === 'admin' || S.user.role === 'ro'); }

function myEmployees() {
  var m = M[S.month];
  if (!m) return [];
  var arr = m.employees.slice();
  if (S.user.role === 'vs') {
    var ln = (S.user.short || '').toLowerCase();
    arr = arr.filter(function (e) {
      return String(e.vs || '').toLowerCase().indexOf(ln) === 0;
    });
  }
  if (S.filterVS) {
    arr = arr.filter(function (e) { return e.vs === S.filterVS; });
  }
  if (S.search) {
    var q = S.search.toLowerCase();
    arr = arr.filter(function (e) {
      return String(e.name).toLowerCase().indexOf(q) >= 0 || String(e.vs || '').toLowerCase().indexOf(q) >= 0;
    });
  }
  return arr;
}
function allMonthCodes() {
  return Object.keys(M).sort();
}
function prevMonthsOf(code) {
  var all = allMonthCodes();
  var idx = all.indexOf(code);
  if (idx < 0) return [];
  return all.slice(Math.max(0, idx - 3), idx);
}
function indexByName() {
  var map = {};
  allMonthCodes().forEach(function (c) {
    (M[c].employees || []).forEach(function (e) {
      if (!map[e.name]) {
        map[e.name] = { name: e.name, vs: {}, months: [], first: c, last: c };
      }
      map[e.name].months.push(c);
      map[e.name].last = c;
      if (e.vs) map[e.name].vs[e.vs] = 1;
    });
  });
  return map;
}
function empIn(name, code) {
  var m = M[code];
  if (!m) return null;
  for (var i = 0; i < m.employees.length; i++) {
    if (m.employees[i].name === name) return m.employees[i];
  }
  return null;
}
function weekIdentity(empName, code, week) { return empName + '|' + code + '|' + week; }
function getWeekNote(empName, code, week) {
  var k = weekIdentity(empName, code, week);
  if (NOTES[k] !== undefined) return NOTES[k];
  var e = empIn(empName, code);
  if (e) {
    for (var i = 0; i < (e.weeks || []).length; i++) {
      if (e.weeks[i].week === week && e.weeks[i].note) return e.weeks[i].note;
    }
  }
  return '';
}
function setWeekNote(empName, code, week, text) {
  NOTES[weekIdentity(empName, code, week)] = text;
}
function planKey(name, code) { return name + '_' + code; }
function getPlan(name, code) {
  var p = PLANS[planKey(name, code)];
  if (!p) p = { complaints: [], incidents_sum: null, competencies: [], expected_result: '', action_plan: '', result: '', status: 'none' };
  return p;
}

/* ---------- тосты и модалки ---------- */
function toast(msg, kind) {
  var wrap = $('#toasts');
  var el = document.createElement('div');
  el.className = 'toast ' + (kind || 'ok');
  var icon = kind === 'err'
    ? '<svg fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path stroke-linecap="round" d="M12 8v5m0 3h.01"/></svg>'
    : '<svg fill="none" stroke="currentColor" stroke-width="2.4" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>';
  el.innerHTML = icon + '<span>' + esc(msg) + '</span>';
  wrap.appendChild(el);
  setTimeout(function () {
    el.style.transition = 'opacity .2s, transform .2s';
    el.style.opacity = '0';
    el.style.transform = 'translateY(8px)';
    setTimeout(function () { el.remove(); }, 220);
  }, 2800);
}

window.AppCore = {
  S: S, M: M, PLANS: PLANS, USERS: USERS, LOG: LOG, NOTES: NOTES,
  $: $, $$: $$, esc: esc, num: num, fmt: fmt, money: money,
  initials: initials, fullName: fullName,
  monthLabel: monthLabel, monthShort: monthShort, monthLabelShort: monthLabelShort,
  qLevel: qLevel, eLevel: eLevel, lvlClass: lvlClass, pill: pill, pillCnt: pillCnt, dot: dot,
  save: save, restore: restore, pushLog: pushLog,
  isBoss: isBoss, canEdit: canEdit, canApprove: canApprove, canManageUsers: canManageUsers,
  myEmployees: myEmployees, allMonthCodes: allMonthCodes, prevMonthsOf: prevMonthsOf,
  indexByName: indexByName, empIn: empIn, getWeekNote: getWeekNote, setWeekNote: setWeekNote,
  planKey: planKey, getPlan: getPlan, toast: toast,
  LS_SESSION: LS_SESSION, DATA: DATA
};
})();
