/* ===========================================================
   Часть 3: обработчики, экспорт, запуск приложения
   =========================================================== */
(function () {
'use strict';
var A = window.AppCore;
var V = window.AppViews;
var $ = A.$, $$ = A.$$, esc = A.esc;

var PAGE_INFO = {
  dashboard: ['Главная', 'Подопечные и их показатели за выбранный месяц'],
  metrics:   ['Показатели', 'Три предыдущих месяца и текущий по неделям'],
  plans:     ['План и результат', 'Согласование планов развития'],
  history:   ['История сотрудников', 'Кто, когда и с какими показателями работал'],
  users:     ['Пользователи', 'Доступы и роли'],
  log:       ['История изменений', 'Журнал правок системы']
};
var ROLE_NAME = { admin: 'Администратор', ro: 'Руководитель отдела', rg: 'Руководитель группы', vs: 'Ведущий специалист' };

/* ============ РЕНДЕР ============ */
function render() {
  if (!A.S.user) { renderAuth(); return; }
  $('#auth').style.display = 'none';
  $('#app').style.display = 'block';

  $('#uName').textContent = A.S.user.name;
  $('#uRole').textContent = ROLE_NAME[A.S.user.role] || A.S.user.role;
  $('#uAv').textContent = A.initials(A.S.user.name);

  fillMonthSelect();

  var info = PAGE_INFO[A.S.page] || PAGE_INFO.dashboard;
  $('#pageTitle').textContent = info[0];
  $('#pageSub').textContent = info[1];

  $$('.nav').forEach(function (b) {
    b.classList.toggle('on', b.getAttribute('data-page') === A.S.page);
  });

  var navUsers = $('#navUsers'), navLog = $('#navLog');
  if (navUsers) navUsers.style.display = A.canManageUsers() ? '' : 'none';
  if (navLog) navLog.style.display = A.isBoss() ? '' : 'none';

  var host = $('#view');
  if (A.S.page === 'dashboard') host.innerHTML = V.viewDashboard();
  else if (A.S.page === 'metrics') host.innerHTML = V.viewMetrics();
  else if (A.S.page === 'plans') {
    host.innerHTML = A.S.editPlan ? V.viewPlanForm(A.S.editPlan) : V.viewPlans();
  }
  else if (A.S.page === 'history') {
    host.innerHTML = A.S.openProfile ? V.viewProfile(A.S.openProfile) : V.viewHistory();
  }
  else if (A.S.page === 'users') host.innerHTML = V.viewUsers();
  else host.innerHTML = V.viewLog();

  bindView();
}

function fillMonthSelect() {
  var sel = $('#monthSel');
  var codes = A.allMonthCodes();
  var html = codes.map(function (c) {
    return '<option value="' + c + '"' + (c === A.S.month ? ' selected' : '') + '>' + esc(A.monthLabel(c)) + '</option>';
  }).join('');
  if (sel.innerHTML !== html) sel.innerHTML = html;
  sel.value = A.S.month;

  var fsel = $('#filterVS');
  if (fsel) {
    var vsAll = {};
    var m = A.M[A.S.month];
    if (m) m.employees.forEach(function (e) { if (e.vs) vsAll[e.vs] = 1; });
    var keys = Object.keys(vsAll).sort();
    var fhtml = '<option value="">Все ведущие</option>' + keys.map(function (k) {
      return '<option value="' + esc(k) + '"' + (k === A.S.filterVS ? ' selected' : '') + '>' + esc(k) + '</option>';
    }).join('');
    if (fsel.innerHTML !== fhtml) fsel.innerHTML = fhtml;
    fsel.value = A.S.filterVS;
  }
}

/* ============ АВТОРИЗАЦИЯ ============ */
function renderAuth() {
  $('#auth').style.display = 'flex';
  $('#app').style.display = 'none';
  var box = $('#demoAccounts');
  if (box && !box.innerHTML.trim()) {
    box.innerHTML = A.USERS.map(function (u) {
      return '<div class="demo-row"><span><b style="color:#4B3FA8">' + esc(u.title || ROLE_NAME[u.role]) + '</b></span>' +
        '<span><code>' + esc(u.login) + '</code> / <code>' + esc(u.pass) + '</code></span></div>';
    }).join('');
  }
}

function doLogin(login, pass) {
  login = (login || '').trim();
  pass = (pass || '').trim();
  var u = null;
  for (var i = 0; i < A.USERS.length; i++) {
    if (A.USERS[i].login === login && A.USERS[i].pass === pass) { u = A.USERS[i]; break; }
  }
  var box = $('#loginErr');
  if (!u) {
    box.textContent = 'Неверный логин или пароль';
    box.style.display = 'block';
    return;
  }
  box.style.display = 'none';
  A.S.user = { id: u.id, login: u.login, name: u.name, short: u.short, role: u.role, title: u.title };
  A.S.month = A.S.month || (A.allMonthCodes().slice(-1)[0] || '2026-09');
  A.S.page = 'dashboard';
  try { localStorage.setItem(A.LS_SESSION, JSON.stringify(A.S.user)); } catch (e) {}
  A.pushLog('вход в систему', u.name); A.save();
  render();
}

function doLogout() {
  A.pushLog('выход из системы', A.S.user ? A.S.user.name : ''); A.save();
  A.S.user = null;
  try { localStorage.removeItem(A.LS_SESSION); } catch (e) {}
  render();
}

/* ============ ЭКСПОРТ ============ */
function download(filename, content, mime) {
  var blob = new Blob([content], { type: mime || 'text/csv;charset=utf-8' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 400);
}
function csvCell(v) {
  if (v === null || v === undefined) return '';
  var s = String(v);
  if (/[";\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
  return s;
}
function toCSV(rows) {
  return '\ufeff' + rows.map(function (r) { return r.map(csvCell).join(';'); }).join('\r\n');
}

function exportMetricsCSV() {
  var code = A.S.month, prev = A.prevMonthsOf(code), cur = A.M[code];
  var head1 = ['Ведущий', 'Сотрудник'];
  prev.forEach(function (p) { head1.push(A.monthLabel(p) + ' качество', A.monthLabel(p) + ' эффективность', A.monthLabel(p) + ' жалобы', A.monthLabel(p) + ' залёты'); });
  (cur.weeks || []).forEach(function (w) { head1.push(w.week); });
  head1.push('Итог качество', 'Итог эффективность', 'Жалобы', 'Залёты', 'Сумма залётов');
  var rows = [head1];
  A.myEmployees().forEach(function (e) {
    var r = [e.vs || '', e.name];
    (e.prev || []).forEach(function (p) { r.push(p.quality, p.efficiency, p.complaints, p.incidents); });
    for (var k = (e.prev || []).length; k < 3; k++) r.push('', '', '', '');
    (cur.weeks || []).forEach(function (w) {
      var cw = null;
      (e.weeks || []).forEach(function (x) { if (x.week === w.week) cw = x; });
      r.push(cw && cw.quality !== null ? cw.quality : (cw && cw.note ? cw.note : ''));
    });
    var t = e.total || {};
    r.push(t.quality, t.efficiency, t.complaints, t.incidents, t.incidents_sum);
    rows.push(r);
  });
  download('pokazateli_' + code + '.csv', toCSV(rows));
  A.toast('Файл показателей выгружен');
  A.pushLog('экспорт показателей', A.monthLabel(code)); A.save();
}

function exportPlansCSV() {
  var rows = [['Ведущий', 'Сотрудник', 'Жалобы', 'Залёты', 'Компетенции', 'Ожидаемый результат', 'План работы', 'Итог', 'Статус']];
  A.myEmployees().forEach(function (e) {
    var p = A.getPlan(e.name, A.S.month);
    rows.push([
      e.vs || '', e.name,
      (p.complaints || []).join(' | '),
      p.incidents_sum || '',
      (p.competencies || []).join(', '),
      p.expected_result || '', p.action_plan || '', p.result || '',
      p.status === 'approved' ? 'Согласован' : p.status === 'sent' ? 'На согласовании' : p.status === 'rework' ? 'На доработке' : 'Черновик'
    ]);
  });
  download('plany_' + A.S.month + '.csv', toCSV(rows));
  A.toast('Файл планов выгружен');
  A.pushLog('экспорт планов', A.monthLabel(A.S.month)); A.save();
}

function exportHistoryCSV() {
  var idx = A.indexByName();
  var rows = [['Сотрудник', 'Ведущие', 'Месяцев', 'Среднее качество', 'Жалобы всего', 'Залёты всего', 'Период']];
  Object.keys(idx).forEach(function (n) {
    var o = idx[n], vals = [], comp = 0, inc = 0;
    o.months.forEach(function (c) {
      var e = A.empIn(n, c);
      if (e && e.total) {
        if (A.num(e.total.quality) !== null) vals.push(A.num(e.total.quality));
        comp += A.num(e.total.complaints) || 0;
        inc += A.num(e.total.incidents) || 0;
      }
    });
    var avg = vals.length ? vals.reduce(function (x, y) { return x + y; }, 0) / vals.length : '';
    rows.push([n, Object.keys(o.vs).filter(Boolean).join(', '), o.months.length,
      avg === '' ? '' : avg.toFixed(2), comp, inc,
      A.monthLabel(o.first) + ' — ' + A.monthLabel(o.last)]);
  });
  download('istoriya_sotrudnikov.csv', toCSV(rows));
  A.toast('История выгружена');
  A.pushLog('экспорт истории сотрудников', ''); A.save();
}

function exportMetricsXLSX() {
  // Формируем HTML-таблицу, Excel откроет её нативно
  var code = A.S.month, prev = A.prevMonthsOf(code), cur = A.M[code];
  var th = '<tr><th>Ведущий</th><th>Сотрудник</th>';
  prev.forEach(function (p) { th += '<th colspan="4">' + esc(A.monthLabel(p)) + '</th>'; });
  th += '<th colspan="' + ((cur.weeks || []).length + 4) + '">' + esc(A.monthLabel(code)) + '</th></tr><tr><th></th><th></th>';
  prev.forEach(function () { th += '<th>К</th><th>Э</th><th>Ж</th><th>З</th>'; });
  (cur.weeks || []).forEach(function (w) { th += '<th>' + esc(w.week) + '</th>'; });
  th += '<th>Итог К</th><th>Итог Э</th><th>Ж</th><th>З</th></tr>';

  var tb = A.myEmployees().map(function (e) {
    var r = '<tr><td>' + esc(e.vs || '') + '</td><td>' + esc(e.name) + '</td>';
    (e.prev || []).forEach(function (p) { r += '<td>' + (p.quality === null ? '' : p.quality) + '</td><td>' + (p.efficiency === null ? '' : p.efficiency) + '</td><td>' + p.complaints + '</td><td>' + p.incidents + '</td>'; });
    for (var k = (e.prev || []).length; k < 3; k++) r += '<td></td><td></td><td></td><td></td>';
    (cur.weeks || []).forEach(function (w) {
      var cw = null;
      (e.weeks || []).forEach(function (x) { if (x.week === w.week) cw = x; });
      r += '<td>' + (cw && cw.quality !== null ? cw.quality : (cw && cw.note ? cw.note : '')) + '</td>';
    });
    var t = e.total || {};
    r += '<td>' + (t.quality === null ? '' : t.quality) + '</td><td>' + (t.efficiency === null ? '' : t.efficiency) + '</td><td>' + (t.complaints || 0) + '</td><td>' + (t.incidents || 0) + '</td></tr>';
    return r;
  }).join('');

  var html = '<html><head><meta charset="utf-8"></head><body><table border="1">' + th + tb + '</table></body></html>';
  download('pokazateli_' + code + '.xls', html, 'application/vnd.ms-excel');
  A.toast('Файл для Excel выгружен');
  A.pushLog('экспорт показателей (Excel)', A.monthLabel(code)); A.save();
}

/* ============ МОДАЛКИ ============ */
function openModal(title, bodyHtml, footHtml, small) {
  var host = $('#modalHost');
  host.innerHTML = '<div class="overlay on" id="ov">' +
    '<div class="modal' + (small ? ' sm' : '') + '">' +
      '<div class="modal-head"><h3>' + esc(title) + '</h3>' +
        '<button class="close-x" data-act="close-modal"><svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M6 6l12 12M18 6L6 18"/></svg></button>' +
      '</div>' +
      '<div class="modal-body">' + bodyHtml + '</div>' +
      (footHtml ? '<div class="modal-foot">' + footHtml + '</div>' : '') +
    '</div></div>';
}
function closeModal() { $('#modalHost').innerHTML = ''; }

/* ============ СОБЫТИЯ ============ */
function bindView() {
  var host = $('#view');
  host.onclick = function (ev) {
    var btn = ev.target.closest('[data-act]');
    if (!btn) return;
    var act = btn.getAttribute('data-act');
    var emp = btn.getAttribute('data-emp');

    if (act === 'profile') { A.S.page = 'history'; A.S.openProfile = emp; render(); }
    else if (act === 'back-history') { A.S.openProfile = null; render(); }
    else if (act === 'goto-plan') { A.S.page = 'plans'; A.S.editPlan = null; render(); }
    else if (act === 'edit-plan') { A.S.page = 'plans'; A.S.editPlan = emp; render(); }
    else if (act === 'back-plans') { A.S.editPlan = null; render(); }
    else if (act === 'del-link') { handleDelLink(btn.getAttribute('data-idx')); }
    else if (act === 'add-link') { handleAddLink(); }
    else if (act === 'del-comp') { handleDelComp(btn.getAttribute('data-idx')); }
    else if (act === 'save-plan-draft') { savePlanForm(emp, false); }
    else if (act === 'save-plan-send') { savePlanForm(emp, true); }
    else if (act === 'send-plan') { setPlanStatus(emp, 'sent', 'план отправлен на согласование'); }
    else if (act === 'approve-plan') { setPlanStatus(emp, 'approved', 'план согласован'); }
    else if (act === 'return-plan') { setPlanStatus(emp, 'rework', 'план отправлен на доработку'); }
    else if (act === 'edit-week') { openWeekNote(btn.getAttribute('data-emp'), btn.getAttribute('data-code'), btn.getAttribute('data-week')); }
    else if (act === 'export-metrics-csv') { exportMetricsCSV(); }
    else if (act === 'export-metrics-xlsx') { exportMetricsXLSX(); }
    else if (act === 'export-plans-csv') { exportPlansCSV(); }
    else if (act === 'export-history-csv') { exportHistoryCSV(); }
    else if (act === 'add-user') { openAddUser(); }
    else if (act === 'del-user') { delUser(parseInt(btn.getAttribute('data-idx'), 10)); }
  };

  var compInput = $('#f-comp-new');
  if (compInput) {
    compInput.onkeydown = function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        var val = compInput.value.trim();
        if (!val) return;
        var box = $('#f-comps');
        var chip = document.createElement('span');
        chip.className = 'chip';
        chip.innerHTML = esc(val) + '<button data-act="del-comp" data-idx="new">×</button>';
        chip.setAttribute('data-val', val);
        box.insertBefore(chip, compInput);
        compInput.value = '';
      }
    };
  }
}

function handleAddLink() {
  var box = $('#f-links');
  var i = box.children.length;
  var div = document.createElement('div');
  div.className = 'link-row';
  div.innerHTML = '<input class="inp" type="text" data-link="' + i + '" placeholder="https://tracker.yandex.ru/CLAIM-000000">' +
    '<button class="x-btn" data-act="del-link" data-idx="' + i + '" title="Удалить">' +
    '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.9 12a2 2 0 01-2 1.9H7.9a2 2 0 01-2-1.9L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>';
  box.appendChild(div);
}
function handleDelLink(idx) {
  var box = $('#f-links');
  var rows = $$('.link-row', box);
  if (rows.length <= 1) { $$('input', rows[0])[0].value = ''; return; }
  rows[parseInt(idx, 10)] && rows[parseInt(idx, 10)].remove();
}
function handleDelComp(idx) {
  if (idx === 'new') return;
  var box = $('#f-comps');
  var chips = $$('.chip', box);
  if (chips[parseInt(idx, 10)]) chips[parseInt(idx, 10)].remove();
}

function savePlanForm(emp, send) {
  var linkInputs = $$('[data-link]', $('#f-links'));
  var complaints = linkInputs.map(function (i) { return i.value.trim(); }).filter(Boolean);
  var comps = $$('.chip', $('#f-comps')).map(function (c) {
    return c.getAttribute('data-val') || c.textContent.replace('×', '').trim();
  }).filter(Boolean);
  var inc = $('#f-inc').value;
  var p = {
    complaints: complaints,
    incidents_sum: A.num(inc),
    competencies: comps,
    expected_result: $('#f-expected').value.trim(),
    action_plan: $('#f-action').value.trim(),
    result: $('#f-result').value.trim(),
    status: send ? 'sent' : 'draft',
    updated: Date.now(),
    by: A.S.user.name
  };
  A.PLANS[A.planKey(emp, A.S.month)] = p;
  A.pushLog(send ? 'план отправлен на согласование' : 'план сохранён', emp + ' · ' + A.monthLabel(A.S.month));
  A.save();
  A.S.editPlan = null;
  render();
  A.toast(send ? 'План отправлен на согласование' : 'Черновик сохранён');
}

function setPlanStatus(emp, status, msg) {
  var k = A.planKey(emp, A.S.month);
  var p = A.PLANS[k] || A.getPlan(emp, A.S.month);
  p.status = status;
  p.updated = Date.now();
  p.by = A.S.user.name;
  A.PLANS[k] = p;
  A.pushLog(msg, emp + ' · ' + A.monthLabel(A.S.month));
  A.save();
  render();
  A.toast(msg.charAt(0).toUpperCase() + msg.slice(1));
}

function openWeekNote(emp, code, week) {
  var cur = A.getWeekNote(emp, code, week);
  var body = '<div class="field" style="margin:0"><label>' + esc(emp) + ' · ' + esc(week) + '</label>' +
    '<textarea id="wn-text" placeholder="Что произошло на неделе: успехи, сложности, договорённости">' + esc(cur) + '</textarea></div>';
  var foot = '<button class="btn btn-ghost" data-act="close-modal">Отмена</button>' +
    '<button class="btn btn-primary" id="wn-save">Сохранить итог</button>';
  openModal('Итог недели', body, foot, false);

  $('#wn-save').onclick = function () {
    A.setWeekNote(emp, code, week, $('#wn-text').value.trim());
    A.pushLog('итог недели сохранён', emp + ' · ' + week);
    A.save();
    closeModal();
    render();
    A.toast('Итог недели сохранён');
  };
}

function openAddUser() {
  var body = '' +
    '<div class="field"><label>Имя и фамилия</label><input class="inp" id="nu-name" placeholder="Иванова Мария"></div>' +
    '<div class="grid-2">' +
      '<div class="field" style="margin:0"><label>Логин</label><input class="inp" id="nu-login" placeholder="ivanova"></div>' +
      '<div class="field" style="margin:0"><label>Пароль</label><input class="inp" id="nu-pass" placeholder="пароль"></div>' +
    '</div>' +
    '<div class="field" style="margin:0"><label>Роль</label><select id="nu-role">' +
      '<option value="vs">Ведущий специалист</option>' +
      '<option value="rg">Руководитель группы</option>' +
      '<option value="ro">Руководитель отдела</option>' +
      '<option value="admin">Администратор</option>' +
    '</select></div>';
  var foot = '<button class="btn btn-ghost" data-act="close-modal">Отмена</button>' +
    '<button class="btn btn-primary" id="nu-save">Создать</button>';
  openModal('Новый пользователь', body, foot, true);

  $('#nu-save').onclick = function () {
    var name = $('#nu-name').value.trim(), login = $('#nu-login').value.trim();
    var pass = $('#nu-pass').value.trim(), role = $('#nu-role').value;
    if (!name || !login || !pass) { A.toast('Заполните все поля', 'err'); return; }
    for (var i = 0; i < A.USERS.length; i++) {
      if (A.USERS[i].login === login) { A.toast('Такой логин уже есть', 'err'); return; }
    }
    var titles = { admin: 'Администратор', ro: 'Руководитель отдела', rg: 'Руководитель группы', vs: 'Ведущий специалист' };
    A.USERS.push({
      id: Date.now(), login: login, pass: pass, name: name,
      short: name.split(' ')[0], role: role, title: titles[role]
    });
    A.pushLog('создан пользователь', name + ' (' + titles[role] + ')');
    A.save(); closeModal(); render();
    A.toast('Пользователь создан');
  };
}

function delUser(idx) {
  var u = A.USERS[idx];
  if (!u) return;
  if (u.role === 'admin') { A.toast('Нельзя удалить администратора', 'err'); return; }
  if (!confirm('Удалить пользователя «' + u.name + '»?')) return;
  A.USERS.splice(idx, 1);
  A.pushLog('удалён пользователь', u.name);
  A.save(); render();
  A.toast('Пользователь удалён');
}

/* ============ ЗАПУСК ============ */
function init() {
  A.restore();

  try {
    var raw = localStorage.getItem(A.LS_SESSION);
    if (raw) A.S.user = JSON.parse(raw);
  } catch (e) {}

  A.S.month = A.allMonthCodes().slice(-1)[0] || '2026-09';

  $('#loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    doLogin($('#login').value, $('#pass').value);
  });
  $('#logoutBtn').addEventListener('click', doLogout);

  $('#monthSel').addEventListener('change', function (e) {
    A.S.month = e.target.value;
    A.S.editPlan = null;
    render();
  });

  var fv = $('#filterVS');
  if (fv) fv.addEventListener('change', function (e) { A.S.filterVS = e.target.value; render(); });

  $$('.nav').forEach(function (b) {
    b.addEventListener('click', function () {
      A.S.page = b.getAttribute('data-page');
      A.S.editPlan = null;
      if (A.S.page !== 'history') A.S.openProfile = null;
      if (window.innerWidth <= 900) closeSide();
      render();
    });
  });

  $('#burger').addEventListener('click', function () {
    $('#side').classList.toggle('open');
    $('#scrim').classList.toggle('on', $('#side').classList.contains('open'));
  });
  var scrim = $('#scrim');
  if (scrim) scrim.addEventListener('click', closeSide);

  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-act="close-modal"]') || e.target.id === 'ov') closeModal();
  });

  window.addEventListener('storage', function (e) {
    if (e.key === A.LS_DATA) { A.restore(); render(); }
  });

  render();
}
function closeSide() {
  $('#side').classList.remove('open');
  $('#scrim').classList.remove('on');
}

document.addEventListener('DOMContentLoaded', init);
})();
