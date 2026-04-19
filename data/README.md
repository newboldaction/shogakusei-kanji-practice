# 教育漢字データ

## 収録内容

`kyoiku-kanji.json` は小学校で学習する教育漢字1026字のデータを収録しています。

| 学年 | 字数 |
|---|---|
| 小1 | 80 |
| 小2 | 160 |
| 小3 | 200 |
| 小4 | 202 |
| 小5 | 193 |
| 小6 | 191 |
| 合計 | 1026 |

## データ構造

```json
{
  "一": { "grade": 1, "on": ["イチ", "イツ"], "kun": ["ひと-", "ひと.つ"], "strokes": 1 }
}
```

## 出典

- **読み・画数**: [kanjiapi.dev](https://kanjiapi.dev/)（KANJIDIC2 派生、Creative Commons Attribution-ShareAlike 4.0）
- **書き順SVG (`data/kanjivg/`)**: [KanjiVG](https://kanjivg.tagaini.net/) © Ulrich Apel, [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/)
  - リリース: r20250816（main版を取得後、教育漢字1026字分を抽出）
  - 改変内容: ライセンスコメント・DOCTYPE・kvg属性を除去、書き順番号のサイズを大きく（font-size: 8 → 18）、色を赤＋白縁取りに変更
- **学年配当**: 文部科学省「学年別漢字配当表」（2017年[平成29年]告示・2020年度全面実施、1026字版）
  - 参照: Wikipedia日本語版「[学年別漢字配当表](https://ja.wikipedia.org/wiki/%E5%AD%A6%E5%B9%B4%E5%88%A5%E6%BC%A2%E5%AD%97%E9%85%8D%E5%BD%93%E8%A1%A8)」

## 備考

- kanjiapi.dev の `grade` 値は2020年改訂前の旧配当に基づいているため、本プロジェクトでは学年情報のみ文科省2020年版配当表で上書きしている（都道府県名由来の20字を含む）。
