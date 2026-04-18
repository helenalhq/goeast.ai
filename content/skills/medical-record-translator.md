---
slug: medical-record-translator
title: Medical Record Translator
title_zh: 病历翻译器
category: medical
tags: [medical, translation, records, pdf, bilingual, ocr]
source: github
source_url: https://github.com/helenalhq/chinamed-skills/tree/main/skills/medical-record-translator
skill_url: https://github.com/helenalhq/chinamed-skills/tree/main/skills/medical-record-translator
featured: false
updated_at: 2026-04-17
---

## Description

Structure-preserving medical record translation between Chinese and English. Handles complex medical terminology, lab results, imaging reports, prescriptions, and discharge summaries with high accuracy. Supports scanned PDF documents with OCR processing. Maintains the original document structure including tables, charts, and formatted sections for easy reference by healthcare providers on both sides.

## Description (中文)

中英双语病历翻译，保持原始文档结构。处理复杂医学术语、化验结果、影像报告、处方和出院小结，准确度高。支持通过 OCR 处理扫描版 PDF 文件。保留原始文档结构，包括表格、图表和格式化段落，方便两国医护人员查阅。

## Install

```bash
npx skills add helenalhq/chinamed-skills --skill medical-record-translator
```

## How to Use

1. Upload your medical record (PDF, image, or text)
2. Specify the translation direction (Chinese to English or English to Chinese)
3. Receive a structure-preserving translation maintaining original formatting

## 适用场景

- Translating Chinese medical records for overseas doctors
- Converting English medical records for Chinese hospitals
- Handling scanned PDF medical documents with OCR
- Preparing medical history documentation for cross-border treatment
