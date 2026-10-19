# 需要下载的数据文件

插件的词库由开源数据生成（`scripts/pipeline.mjs`）。**绝大多数数据脚本能自己下载**，只有一个 23.8 MB 的文件在当前网络下太慢，可选手动下载。

下载后放到 **`D:\Projects\news\.data-cache\`**（目录已存在），然后运行：

```powershell
cd D:\Projects\news\dsh-english-learn
node scripts/import-data.mjs                            # 校验 + 解压
node --max-old-space-size=6144 scripts/pipeline.mjs     # 重新生成词库
```

---

## 脚本自动下载（通常不用管）

| 数据 | 来源 | 大小 | 许可 |
| --- | --- | --- | --- |
| **四六级大纲单词表** | jsDelivr（mahavivo/english-wordlists） | 125 + 103 KB | 公开词表 |
| ECDICT | `registry.npmjs.org/ecdict` | 22.4 MB | MIT |
| ipa-dict (en_UK) | jsDelivr | 1.6 MB | MIT |
| Tatoeba 中英句对索引 | downloads.tatoeba.org | 1.7 MB | CC-BY 2.0 |
| Tatoeba cmn-eng 子集 | manythings.org | 1.3 MB | CC-BY 2.0 |
| OpenCC | `registry.npmjs.org/opencc-js` | 2.5 MB | Apache-2.0 |

---

## ❗ 可选：手动下载（不下载也能跑）

| 文件 | 下载地址 | 大小 |
| --- | --- | --- |
| `eng_sentences.tsv.bz2` | https://downloads.tatoeba.org/exports/per_language/eng/eng_sentences.tsv.bz2 | 23.8 MB |

**它做什么**：Tatoeba 英文句子全量导出（约 190 万句）。用来：

1. 和中文句子配对，给单词找**真人翻译的例句**；
2. 验证一个短语搭配是不是真实英语（避免 `hard rush`＝灯心草 这种词典词条被当成搭配）。

**没有它也能构建**：脚本会回退到 32k 句对 + 流式 OPUS 语料（`object.pouta.csc.fi`，22 MB，读 30 万句后中断）。有本地文件时优先用本地的，更快也更全。

实测差别：

| | 中英句对 | 可覆盖词数 | 例句覆盖率 |
| --- | --- | --- | --- |
| 有全量文件 | 78k | 13,415 | 73% |
| 只有子集 | 32k | 6,738 | 约 60% |

放 `.bz2` 原文件即可，`import-data.mjs` 会自动解压。

---

## 生成结果

| 词库 | 词数 | 组数（每组 20） |
| --- | --- | --- |
| 四级核心 | 4,195 | 210 |
| 六级进阶 | 1,176 | 59 |

字段覆盖率：音标 99.9%、中文释义 99.4%、例句 73%、短语搭配 20%。
