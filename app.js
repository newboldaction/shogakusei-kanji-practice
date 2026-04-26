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

// ===== 履歴機能 =====
const HISTORY_PREFIX = 'kanji_history_';
const HISTORY_MAX = 5;
const LAST_USER_KEY = 'kanji_last_user';

function getHistoryKey(userName) {
  return HISTORY_PREFIX + (userName || '_default');
}

function getCurrentUser() {
  return document.getElementById('user-name').value.trim();
}

function loadHistory() {
  const key = getHistoryKey(getCurrentUser());
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch {
    return [];
  }
}

function saveToHistory(kanjiList) {
  const userName = getCurrentUser();
  const key = getHistoryKey(userName);
  const history = loadHistory();
  const entry = {
    kanji: kanjiList,
    date: new Date().toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
  };
  history.unshift(entry);
  if (history.length > HISTORY_MAX) history.length = HISTORY_MAX;
  localStorage.setItem(key, JSON.stringify(history));
  if (userName) localStorage.setItem(LAST_USER_KEY, userName);
}

function updatePrintDate() {
  const el = document.getElementById('print-date');
  const now = new Date();
  el.textContent = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;
}

function renderHistory(onSelect) {
  const history = loadHistory();
  const section = document.getElementById('history-section');
  const list = document.getElementById('history-list');

  if (history.length === 0) {
    section.classList.add('hidden');
    return;
  }

  section.classList.remove('hidden');
  list.innerHTML = '';

  history.forEach(entry => {
    const li = document.createElement('li');
    li.className = 'history-item';

    const wordsSpan = document.createElement('span');
    wordsSpan.className = 'history-words';
    const preview = entry.kanji.slice(0, 12).join('');
    const more = entry.kanji.length > 12 ? `…(${entry.kanji.length}字)` : '';
    wordsSpan.textContent = preview + more;

    const dateSpan = document.createElement('span');
    dateSpan.className = 'history-date';
    dateSpan.textContent = entry.date;

    li.appendChild(wordsSpan);
    li.appendChild(dateSpan);
    li.addEventListener('click', () => onSelect(entry.kanji));
    list.appendChild(li);
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

    saveToHistory(kanjiList);
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
  });

  userName.addEventListener('input', () => {
    renderHistory(selectFromHistory);
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
});
