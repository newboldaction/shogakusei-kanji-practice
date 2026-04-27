// ===== 教育漢字データ =====
let KANJI_DATA = {};
const GRADES = [1, 2, 3, 4, 5, 6];

async function loadKanjiData() {
  const res = await fetch('data/kyoiku-kanji.json');
  KANJI_DATA = await res.json();
}

/**
 * 漢字1文字かどうか判定（CJK統合漢字）
 */
function isKanji(ch) {
  return /^[\u4E00-\u9FFF]$/.test(ch);
}

/**
 * テキスト入力から漢字のみを抽出（重複排除、入力順を保持）
 */
function extractKanji(text) {
  const seen = new Set();
  const result = [];
  for (const ch of text.normalize('NFC')) {
    if (isKanji(ch) && !seen.has(ch)) {
      seen.add(ch);
      result.push(ch);
    }
  }
  return result;
}

/**
 * マス目を1つ生成
 */
function createSquare(char, type, opts = {}) {
  const sq = document.createElement('div');
  sq.className = `square ${type}`;
  if (char) {
    const main = document.createElement('span');
    main.className = 'square-char';
    main.textContent = char;
    sq.appendChild(main);

    if (opts.showReading && type === 'model') {
      const info = KANJI_DATA[char];
      if (info) {
        const reading = formatReading(info);
        if (reading) {
          const r = document.createElement('span');
          r.className = 'square-reading';
          r.textContent = reading;
          sq.appendChild(r);
        }
      }
    }
    if (opts.showStrokes && type === 'model') {
      const info = KANJI_DATA[char];
      if (info && info.strokes) {
        const s = document.createElement('span');
        s.className = 'square-strokes';
        s.textContent = `${info.strokes}画`;
        sq.appendChild(s);
      }
    }
  }
  return sq;
}

/**
 * 読み仮名表示用の整形（音1つ・訓1つを優先）
 */
function formatReading(info) {
  const on = (info.on || [])[0] || '';
  const kun = (info.kun || [])[0] || '';
  const cleanKun = kun.replace(/[-.].*$/, '');
  if (on && cleanKun) return `${on}・${cleanKun}`;
  return on || cleanKun;
}

/**
 * 1文字分の練習行を生成
 * お手本(1) + なぞり(2) + 空マス(3) = 6マス
 */
function createPracticeRow(char, opts) {
  const row = document.createElement('div');
  row.className = 'practice-row';

  const label = document.createElement('div');
  label.className = 'row-label';
  const hex = char.codePointAt(0).toString(16).padStart(5, '0');
  const img = document.createElement('img');
  img.className = 'stroke-order';
  img.alt = char;
  // 書き順データが無い場合（常用漢字外）はお手本＋「書き順未収録」を表示
  // ※ src 設定前にリスナーを付ける（ブラウザキャッシュ時の取りこぼし防止）
  img.addEventListener('error', () => {
    label.classList.add('no-stroke-order');
    label.innerHTML = '';
    const fallback = document.createElement('div');
    fallback.className = 'stroke-order-fallback';
    const big = document.createElement('span');
    big.className = 'stroke-order-fallback-char';
    big.textContent = char;
    const note = document.createElement('span');
    note.className = 'stroke-order-fallback-note';
    note.textContent = '書き順未収録';
    fallback.appendChild(big);
    fallback.appendChild(note);
    label.appendChild(fallback);
  });
  img.src = `data/kanjivg/${hex}.svg`;
  label.appendChild(img);
  row.appendChild(label);

  const squares = document.createElement('div');
  squares.className = 'practice-squares';

  squares.appendChild(createSquare(char, 'model', opts));
  squares.appendChild(createSquare(char, 'tracing'));
  squares.appendChild(createSquare(char, 'tracing'));
  squares.appendChild(createSquare('', 'empty'));
  squares.appendChild(createSquare('', 'empty'));
  squares.appendChild(createSquare('', 'empty'));

  row.appendChild(squares);
  return row;
}

/**
 * 練習シート全体を生成
 */
function generateSheet(kanjiList, opts) {
  const content = document.getElementById('sheet-content');
  content.innerHTML = '';

  // セクション見出し（学年別ではなくシンプルに「練習する漢字」）
  const section = document.createElement('section');
  section.className = 'word-section';
  const header = document.createElement('div');
  header.className = 'word-header';
  header.textContent = `れんしゅう漢字（${kanjiList.length}字）`;
  section.appendChild(header);

  kanjiList.forEach(ch => {
    section.appendChild(createPracticeRow(ch, opts));
  });

  content.appendChild(section);
}

function showError(msg) {
  const el = document.getElementById('error-message');
  el.textContent = msg;
  el.classList.remove('hidden');
}

function hideError() {
  document.getElementById('error-message').classList.add('hidden');
}

// ===== 学習ログ（旧「履歴」を全件保存に格上げ） =====
const LOG_PREFIX = 'kanji_log_';        // 全件保存
const HISTORY_PREFIX = 'kanji_history_'; // 旧キー（マイグレーション用）
const RECENT_LIST_MAX = 5;               // 履歴UIに出す件数（ログから抽出）
const LAST_USER_KEY = 'kanji_last_user';

function getLogKey(userName) {
  return LOG_PREFIX + (userName || '_default');
}

function getCurrentUser() {
  return document.getElementById('user-name').value.trim();
}

/**
 * 旧 history (最新5件) → 新 log (全件) へ移行（1回限り）
 */
function migrateHistoryIfNeeded(userName) {
  const oldKey = HISTORY_PREFIX + (userName || '_default');
  const newKey = getLogKey(userName);
  if (localStorage.getItem(newKey) !== null) return;
  const old = localStorage.getItem(oldKey);
  if (!old) return;
  try {
    const oldEntries = JSON.parse(old) || [];
    // 旧 date は表示用文字列なので、ログに変換時はISOにできない → date は今日扱い
    const today = jstDateString(new Date());
    const migrated = oldEntries.map((e, i) => ({
      id: `migrated-${i}`,
      isoDate: today,
      ts: Date.now() - i * 60000,
      kanji: e.kanji || [],
      label: e.date || '',
    })).reverse(); // 旧は新しい順、新は古い順で push したい
    localStorage.setItem(newKey, JSON.stringify(migrated));
  } catch {}
}

function loadLog() {
  const userName = getCurrentUser();
  migrateHistoryIfNeeded(userName);
  try {
    return JSON.parse(localStorage.getItem(getLogKey(userName))) || [];
  } catch {
    return [];
  }
}

function appendLog(kanjiList, settings) {
  const userName = getCurrentUser();
  const log = loadLog();
  const now = new Date();
  log.push({
    id: `${now.getTime()}-${Math.random().toString(36).slice(2, 6)}`,
    isoDate: jstDateString(now),
    ts: now.getTime(),
    kanji: kanjiList,
    settings: settings || {},
  });
  localStorage.setItem(getLogKey(userName), JSON.stringify(log));
  if (userName) localStorage.setItem(LAST_USER_KEY, userName);
}

// ===== 集計ロジック =====
function jstDateString(date) {
  // JST (UTC+9) の YYYY-MM-DD
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}

function jstDate(isoDate) {
  // 'YYYY-MM-DD' をJST 0時として返す
  return new Date(isoDate + 'T00:00:00+09:00');
}

function thisWeekRange(now = new Date()) {
  // 月曜始まり
  const today = jstDateString(now);
  const d = jstDate(today);
  const dow = d.getUTCDay(); // JST 0時の曜日: 0=日, 1=月...
  const offset = dow === 0 ? 6 : dow - 1;
  const start = new Date(d.getTime() - offset * 86400000);
  return { start: jstDateString(start), end: today };
}

function thisMonthRange(now = new Date()) {
  const today = jstDateString(now);
  const start = today.slice(0, 8) + '01';
  return { start, end: today };
}

function aggregateDaily(log, fromIso, toIso) {
  // fromIso〜toIso の各日: シート作成回数
  const map = {};
  let cur = jstDate(fromIso);
  const end = jstDate(toIso);
  while (cur <= end) {
    map[jstDateString(cur)] = 0;
    cur = new Date(cur.getTime() + 86400000);
  }
  log.forEach(e => {
    if (e.isoDate >= fromIso && e.isoDate <= toIso) {
      map[e.isoDate] = (map[e.isoDate] || 0) + 1;
    }
  });
  return map;
}

function currentStreak(log, now = new Date()) {
  // 今日 or 昨日からさかのぼって連続している日数
  if (log.length === 0) return 0;
  const days = new Set(log.map(e => e.isoDate));
  let count = 0;
  let cursor = jstDate(jstDateString(now));
  // 今日に記録がなければ、昨日から数える（今日まだ取り組んでなくても連続を維持）
  if (!days.has(jstDateString(cursor))) {
    cursor = new Date(cursor.getTime() - 86400000);
  }
  while (days.has(jstDateString(cursor))) {
    count++;
    cursor = new Date(cursor.getTime() - 86400000);
  }
  return count;
}

function totalKanjiCount(log) {
  // ログ内に出現したユニーク漢字の数
  const set = new Set();
  log.forEach(e => e.kanji.forEach(k => set.add(k)));
  return set.size;
}

function updatePrintDate() {
  const el = document.getElementById('print-date');
  const now = new Date();
  el.textContent = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;
}

function formatLogDate(ts) {
  const d = new Date(ts);
  const pad = n => String(n).padStart(2, '0');
  const today = jstDateString(new Date());
  const iso = jstDateString(d);
  const wd = ['日','月','火','水','木','金','土'][new Date(iso + 'T00:00:00+09:00').getUTCDay()];
  if (iso === today) return `今日 ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const diffDays = Math.round((jstDate(today) - jstDate(iso)) / 86400000);
  if (diffDays === 1) return `きのう ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return `${d.getMonth()+1}/${d.getDate()}(${wd})`;
}

function renderHistory(onSelect) {
  const log = loadLog();
  const section = document.getElementById('history-section');
  const list = document.getElementById('history-list');

  if (log.length === 0) {
    section.classList.add('hidden');
    return;
  }

  section.classList.remove('hidden');
  list.innerHTML = '';

  // 直近 RECENT_LIST_MAX 件を新しい順で
  const recent = log.slice(-RECENT_LIST_MAX).reverse();
  recent.forEach(entry => {
    const li = document.createElement('li');
    li.className = 'history-item';

    const wordsSpan = document.createElement('span');
    wordsSpan.className = 'history-words';
    const preview = entry.kanji.slice(0, 12).join('');
    const more = entry.kanji.length > 12 ? `…(${entry.kanji.length}字)` : '';
    wordsSpan.textContent = preview + more;

    const dateSpan = document.createElement('span');
    dateSpan.className = 'history-date';
    dateSpan.textContent = entry.ts ? formatLogDate(entry.ts) : (entry.label || '');

    li.appendChild(wordsSpan);
    li.appendChild(dateSpan);
    li.addEventListener('click', () => onSelect(entry.kanji));
    list.appendChild(li);
  });
}

// ===== ミニダッシュボード =====
function renderDashboard() {
  const log = loadLog();
  const section = document.getElementById('dashboard-section');
  if (!section) return;

  if (log.length === 0) {
    section.classList.add('hidden');
    return;
  }
  section.classList.remove('hidden');

  const now = new Date();
  const week = thisWeekRange(now);
  const month = thisMonthRange(now);
  const weekDaily = aggregateDaily(log, week.start, week.end);
  const monthDaily = aggregateDaily(log, month.start, month.end);
  const weekCount = Object.values(weekDaily).reduce((a,b)=>a+b, 0);
  const monthCount = Object.values(monthDaily).reduce((a,b)=>a+b, 0);
  const weekActive = Object.values(weekDaily).filter(v => v > 0).length;
  const streak = currentStreak(log, now);
  const uniqueKanji = totalKanjiCount(log);

  // 統計カード
  document.getElementById('stat-week').textContent = `${weekCount}回`;
  document.getElementById('stat-week-days').textContent = `${weekActive}日`;
  document.getElementById('stat-month').textContent = `${monthCount}回`;
  document.getElementById('stat-streak').textContent = `${streak}日`;
  document.getElementById('stat-kanji').textContent = `${uniqueKanji}字`;

  // 直近7日のミニ棒グラフ
  drawWeeklyChart(now, log);
}

function drawWeeklyChart(now, log) {
  const chart = document.getElementById('weekly-chart');
  if (!chart) return;
  // 直近7日（今日含む）の日別件数
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const iso = jstDateString(d);
    days.push({ iso, label: ['日','月','火','水','木','金','土'][new Date(iso + 'T00:00:00+09:00').getUTCDay()], count: 0 });
  }
  log.forEach(e => {
    const found = days.find(d => d.iso === e.isoDate);
    if (found) found.count++;
  });
  const max = Math.max(1, ...days.map(d => d.count));
  chart.innerHTML = '';
  days.forEach(d => {
    const col = document.createElement('div');
    col.className = 'chart-col';
    const bar = document.createElement('div');
    bar.className = 'chart-bar' + (d.count > 0 ? ' has-value' : '');
    bar.style.height = `${(d.count / max) * 100}%`;
    bar.title = `${d.iso}: ${d.count}回`;
    if (d.count > 0) {
      const val = document.createElement('span');
      val.className = 'chart-bar-value';
      val.textContent = d.count;
      bar.appendChild(val);
    }
    const lbl = document.createElement('span');
    lbl.className = 'chart-label' + (d.iso === jstDateString(now) ? ' today' : '');
    lbl.textContent = d.label;
    col.appendChild(bar);
    col.appendChild(lbl);
    chart.appendChild(col);
  });
}

// ===== 学年タブと漢字グリッド =====
const selectedKanji = new Set();
let currentGrade = 1;

function renderGradeTabs() {
  const tabs = document.getElementById('grade-tabs');
  tabs.innerHTML = '';
  GRADES.forEach(g => {
    const btn = document.createElement('button');
    btn.className = 'grade-tab' + (g === currentGrade ? ' active' : '');
    btn.textContent = `小${g}`;
    btn.addEventListener('click', () => {
      currentGrade = g;
      renderGradeTabs();
      renderKanjiGrid();
    });
    tabs.appendChild(btn);
  });
}

function renderKanjiGrid() {
  const grid = document.getElementById('kanji-grid');
  grid.innerHTML = '';
  const kanjiOfGrade = Object.entries(KANJI_DATA)
    .filter(([, v]) => v.grade === currentGrade)
    .map(([k]) => k);

  kanjiOfGrade.forEach(ch => {
    const cell = document.createElement('button');
    cell.className = 'kanji-cell' + (selectedKanji.has(ch) ? ' selected' : '');
    cell.textContent = ch;
    cell.addEventListener('click', () => {
      if (selectedKanji.has(ch)) {
        selectedKanji.delete(ch);
      } else {
        selectedKanji.add(ch);
      }
      cell.classList.toggle('selected');
      updateSelectedCount();
    });
    grid.appendChild(cell);
  });
  updateSelectedCount();
}

function updateSelectedCount() {
  document.getElementById('selected-count').textContent = `${selectedKanji.size}字 選択中`;
}

function selectAllInGrade() {
  Object.entries(KANJI_DATA)
    .filter(([, v]) => v.grade === currentGrade)
    .forEach(([k]) => selectedKanji.add(k));
  renderKanjiGrid();
}

function clearSelection() {
  selectedKanji.clear();
  renderKanjiGrid();
}

/**
 * 選択された漢字 + 自由入力のテキストから漢字を抽出してマージ
 */
function collectKanjiList() {
  const result = [];
  const seen = new Set();
  // 選択順は不要、教育漢字の学年順 → 学年内は元の順
  const ordered = Object.entries(KANJI_DATA)
    .sort((a, b) => a[1].grade - b[1].grade)
    .map(([k]) => k);
  ordered.forEach(k => {
    if (selectedKanji.has(k)) {
      seen.add(k);
      result.push(k);
    }
  });
  // 自由入力からの漢字（重複なら追加しない）
  const freeText = document.getElementById('free-input').value;
  extractKanji(freeText).forEach(k => {
    if (!seen.has(k)) {
      seen.add(k);
      result.push(k);
    }
  });
  return result;
}

// ===== イベントリスナー =====
document.addEventListener('DOMContentLoaded', async () => {
  await loadKanjiData();

  const userName = document.getElementById('user-name');
  const generateBtn = document.getElementById('generate-btn');
  const printBtn = document.getElementById('print-btn');
  const backBtn = document.getElementById('back-btn');
  const inputScreen = document.getElementById('input-screen');
  const practiceSheet = document.getElementById('practice-sheet');
  const selectAllBtn = document.getElementById('select-all-btn');
  const clearBtn = document.getElementById('clear-btn');

  // 前回の名前を復元
  const lastUser = localStorage.getItem(LAST_USER_KEY);
  if (lastUser) userName.value = lastUser;

  renderGradeTabs();
  renderKanjiGrid();

  selectAllBtn.addEventListener('click', selectAllInGrade);
  clearBtn.addEventListener('click', clearSelection);

  generateBtn.addEventListener('click', () => {
    hideError();
    const kanjiList = collectKanjiList();

    if (kanjiList.length === 0) {
      showError('漢字を選ぶか、直接入力してください');
      return;
    }

    const opts = {
      showReading: document.getElementById('opt-reading').checked,
      showStrokes: document.getElementById('opt-strokes').checked,
    };

    appendLog(kanjiList, opts);
    updatePrintDate();
    generateSheet(kanjiList, opts);
    inputScreen.classList.add('hidden');
    practiceSheet.classList.remove('hidden');
  });

  printBtn.addEventListener('click', () => {
    updatePrintDate();
    window.print();
  });

  backBtn.addEventListener('click', () => {
    practiceSheet.classList.add('hidden');
    inputScreen.classList.remove('hidden');
    renderHistory(selectFromHistory);
    renderDashboard();
  });

  userName.addEventListener('input', () => {
    renderHistory(selectFromHistory);
    renderDashboard();
  });

  function selectFromHistory(kanjiList) {
    const opts = {
      showReading: document.getElementById('opt-reading').checked,
      showStrokes: document.getElementById('opt-strokes').checked,
    };
    updatePrintDate();
    generateSheet(kanjiList, opts);
    inputScreen.classList.add('hidden');
    practiceSheet.classList.remove('hidden');
  }

  renderHistory(selectFromHistory);
  renderDashboard();
});
