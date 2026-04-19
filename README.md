# 小学生 漢字練習シート

小学生向けの漢字練習ワークシートをブラウザ上で作って印刷できる静的サイトです。学年（小1〜小6）から選ぶか、自由に漢字を入力するだけで、お手本＋なぞり書き＋空マスの練習用プリントが生成できます。

幼稚園生向けの[ひらがな練習シート](https://github.com/newboldaction/kindergarten-hiragana-practice)の姉妹プロジェクトです。

## 特徴

- **学年別の漢字選択**: 小1〜小6の教育漢字1026字からクリックで選ぶだけ
- **自由入力**: 学年リストにない漢字も直接テキスト入力で追加可能
- **読み仮名・画数トグル**: お手本マスに音訓の読みや画数を表示（ON/OFF切替）
- **履歴機能**: お子さん（お名前）ごとに直近5件の練習内容をブラウザに保存
- **印刷最適化**: 「印刷する」ボタンからそのままA4に印刷可能（推奨: A4横向き）
- **完全クライアント動作**: データはすべてブラウザ内、サーバー送信なし

## データの根拠

- **学年配当**: 文部科学省「学年別漢字配当表」（2017年[平成29年]告示・2020年度全面実施、**1026字**版）
- **読み・画数**: [kanjiapi.dev](https://kanjiapi.dev/)（KANJIDIC2派生、CC BY-SA 4.0）
- **書き順SVG**: [KanjiVG](https://kanjivg.tagaini.net/) © Ulrich Apel（CC BY-SA 3.0）

都道府県名由来の20字（茨・媛・岡・潟・岐・熊・香・佐・埼・崎・滋・鹿・縄・井・沖・栃・奈・梨・阪・阜）も2020年改訂どおり小4に配置しています。

## 使い方（ローカル起動）

```bash
git clone https://github.com/newboldaction/shogakusei-kanji-practice.git
cd shogakusei-kanji-practice
python3 -m http.server 8080
# http://localhost:8080 をブラウザで開く
```

## 公開版

GitHub Pages で公開中: https://newboldaction.github.io/shogakusei-kanji-practice/

## ディレクトリ構成

```
shogakusei-kanji-practice/
├── index.html          メイン画面（入力フォーム＋シート表示）
├── app.js              ロジック（漢字抽出・シート生成・履歴）
├── style.css           スタイル（グリーン系＋印刷CSS）
└── data/
    ├── kyoiku-kanji.json   教育漢字1026字の読み・画数・学年データ
    └── README.md           データ出典・ライセンス
```

## ライセンス

- 本プロジェクトのソースコード: MIT License
- 同梱の漢字データ（`data/kyoiku-kanji.json`）: KANJIDIC2 に由来するため [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) に従います
- 同梱の書き順SVG（`data/kanjivg/*.svg`）: KanjiVG © Ulrich Apel に由来するため [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) に従います
