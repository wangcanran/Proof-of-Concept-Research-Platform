/**
 * 从 .docx 导入项目申报草稿：仅支持「概念验证平台项目征集表」版式（章节一、二、三…）+ word/media 内嵌图片。
 */
import mammoth from 'mammoth'
import JSZip from 'jszip'

export type ResearchDomainLite = { id: string; name: string; code?: string }

/** 从 docx 的 word/media 解压出的图片（二进制为 ArrayBuffer，便于再封装为 File 上传） */
export type ExtractedWordImage = { fileName: string; mimeType: string; data: ArrayBuffer }

export type WordImportPatches = {
  title?: string
  project_domain_other_text?: string
  keywords?: string
  abstract?: string
  detailed_introduction_part1?: string
  detailed_introduction_part2?: string
  detailed_introduction_part3?: string
  implementation_plan?: string
  supplementary_info?: string
  tech_maturity?: string
  achievement_transform_other_text?: string
  poc_multi_stage_note?: string
}

export type WordImportResult = {
  patches: WordImportPatches
  selectedDomainIds: string[]
  achievementTransform: string[]
  pocStageRequirement: string[]
  filledKeys: string[]
  warnings: string[]
  extractedImages: ExtractedWordImage[]
}

const TECH_MATURITY_PHRASES: { keys: string[]; value: string }[] = [
  { keys: ['研发阶段', '理论模型', '未形成样机'], value: 'rd' },
  { keys: ['小试', '原理样机'], value: 'pilot' },
  { keys: ['中试', '小批量样品', '达标率'], value: 'intermediate_trial' },
  { keys: ['小批量生产', '量产工艺'], value: 'small_batch_prod' },
]

/** 成果转化多选：界面 label -> 表单 value */
const TRANSFORM_LABELS: { label: string; value: string }[] = [
  { label: '技术转让', value: 'tech_transfer' },
  { label: '技术许可', value: 'tech_license' },
  { label: '作价投资', value: 'equity_investment' },
  { label: '联合开发', value: 'joint_dev' },
  { label: '其他', value: 'other' },
]

const POC_LABELS: { label: string; value: string }[] = [
  { label: '创意性验证', value: 'creative_verify' },
  { label: '可行性验证', value: 'feasibility_verify' },
  { label: '商业化验证', value: 'commercial_verify' },
  { label: '多阶段组合', value: 'multi_stage_combo' },
]

/** word/media 常见扩展名 -> MIME（不含前导点，供 extractDocxImages 使用） */
export const EXT_TO_MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
}

function mammothInput(arrayBuffer: ArrayBuffer) {
  const zipInput = new Uint8Array(arrayBuffer)
  return {
    arrayBuffer,
    buffer: zipInput as unknown as Buffer,
  }
}

/** 去掉行首编号：第X章、（一）、一、1. 等 */
function stripLeadingEnumeration(line: string): string {
  let s = line.trim()
  s = s.replace(/^第[一二三四五六七八九十百千\d]+[章节部分篇项]\s*/, '')
  s = s.replace(/^[（(][一二三四五六七八九十百千万\d]+[）)]\s*/, '')
  s = s.replace(/^[（(]\d+[)）]\s*/, '')
  s = s.replace(/^\d+[\.、．]\s*/, '')
  s = s.replace(/^[一二三四五六七八九十百千〇零]{1,4}[、．.]\s*/, '')
  return s.trim()
}

function parseResearchDomainsText(
  text: string,
  domains: ResearchDomainLite[],
): { ids: string[]; warnings: string[] } {
  const warnings: string[] = []
  const parts = text.split(/[,，、\n]/).map((s) => s.trim()).filter(Boolean)
  const ids: string[] = []
  for (const p of parts) {
    const d = domains.find(
      (x) => x.name === p || x.name.includes(p) || p.includes(x.name) || x.id === p,
    )
    if (d && !ids.includes(d.id)) ids.push(d.id)
    else if (p) warnings.push(`未识别研究领域：「${p}」`)
  }
  return { ids, warnings }
}

/**
 * 统一 Word/mammoth 可能出现的勾选符号，便于按 ☑ 分段解析。
 * 未勾选项里的文字（如 □技术转让）不得参与匹配。
 * √（U+221A）在 Word 表格中常作「已勾选」，与 Unicode ☑ 等价处理。
 */
function normalizeCheckboxUnicode(s: string): string {
  return s
    .replace(/\u221A/g, '☑')
    .replace(/[\u2713\u2714]/g, '☑')
    .replace(/\u2705/g, '☑')
    .replace(/[\u2610\u25AB\u25FB\u25FD\u2B1C]/g, '□')
}

/**
 * 仅提取 ☑（及 ✓✔✅ 归一后）之后的选项片段，忽略所有 □ 项。
 */
function extractCheckedChunks(line: string): string[] {
  const norm = normalizeCheckboxUnicode(line)
  const parts = norm.split('☑')
  const out: string[] = []
  for (let i = 1; i < parts.length; i++) {
    let seg = parts[i] ?? ''
    const cut = seg.search(/[□☑]/)
    if (cut >= 0) seg = seg.slice(0, cut)
    seg = seg.trim()
    if (seg) out.push(seg)
  }
  return out
}

/** 将勾选片段与表单项 label 匹配（长 label 优先，避免「技术」误匹配） */
function matchDefValuesFromChunks(
  chunks: string[],
  defs: { label: string; value: string }[],
): string[] {
  const sorted = [...defs].sort((a, b) => b.label.length - a.label.length)
  const out: string[] = []
  for (const raw of chunks) {
    const chunk = raw.trim()
    if (!chunk) continue
    const compact = chunk.replace(/\s/g, '')
    for (const { label, value } of sorted) {
      const lc = label.replace(/\s/g, '')
      if (compact.startsWith(lc) || chunk.startsWith(label.trim())) {
        out.push(value)
        break
      }
    }
  }
  return [...new Set(out)]
}

function collectCheckedChunksInText(block: string): string[] {
  const acc: string[] = []
  for (const line of block.split(/\r?\n/)) {
    if (!/[☑\u221A\u2713\u2714\u2705]/.test(line)) continue
    acc.push(...extractCheckedChunks(line))
  }
  return acc
}

function sliceBetween(text: string, startRe: RegExp, endRe: RegExp): string {
  const m1 = text.match(startRe)
  if (!m1 || m1.index === undefined) return ''
  const start = m1.index + m1[0].length
  const tail = text.slice(start)
  const m2 = tail.match(endRe)
  const end = m2 && m2.index !== undefined ? m2.index : tail.length
  return tail.slice(0, end).trim()
}

/** 征集表「所属领域」：仅 ☑ 后的领域名称 */
function extractCheckedFieldLabels(line: string): string[] {
  const out: string[] = []
  for (const raw of extractCheckedChunks(line)) {
    let s = raw.trim()
    const otherIdx = s.indexOf('其他')
    if (otherIdx !== -1 && /^其他[（(]/.test(s.slice(otherIdx))) continue
    s = s.replace(/（[^）]*$/, '').replace(/\s+$/, '').trim()
    if (s) out.push(s)
  }
  return out
}

function matchTechMaturityFromLine(line: string): string {
  for (const row of TECH_MATURITY_PHRASES) {
    if (row.keys.some((k) => line.includes(k))) return row.value
  }
  return ''
}

function guessTitleFromProductName(text: string): string {
  const mc = text.match(/MyCoach[^\s\n]*/i)
  if (mc) return mc[0].slice(0, 200)
  const zl = text.match(/([\u4e00-\u9fffA-Za-z0-9·－-]{2,40}智练)/)
  if (zl?.[1]) return zl[1].slice(0, 200)
  return ''
}

/** 标题仍为空时：产品名推断 → 首条像样的正文行 */
function guessTitleFromFirstLine(text: string, patches: WordImportPatches): void {
  if (patches.title?.trim()) return
  const g = guessTitleFromProductName(text)
  if (g) {
    patches.title = g
    return
  }
  const lines = text.split(/\r?\n/)
  for (const line of lines) {
    const t = line.trim()
    if (!t) continue
    const stripped = stripLeadingEnumeration(t)
    if (!stripped) continue
    if (/^(附件|概念验证平台项目征集表)$/.test(stripped)) continue
    if (/^关键词\s*[:：]/.test(stripped)) continue
    if (/^[一二三四五六七八九十百千]{1,3}[、．.].{0,30}$/.test(stripped)) continue
    if (stripped.length < 2 || stripped.length > 200) continue
    patches.title = stripped.slice(0, 200)
    return
  }
}

/**
 * 「概念验证平台项目征集表」：二、项目基本信息 / 三、项目详细介绍 / 四、实施计划 / 七、补充说明。
 */
function parsePlatformCollectionForm(
  text: string,
  domains: ResearchDomainLite[],
): {
  patches: WordImportPatches
  filledKeys: string[]
  selectedDomainIds: string[]
  achievementTransform: string[]
  pocStageRequirement: string[]
  warnings: string[]
} {
  const patches: WordImportPatches = {}
  const filledKeys: string[] = []
  const warnings: string[] = []
  let selectedDomainIds: string[] = []
  let achievementTransform: string[] = []
  let pocStageRequirement: string[] = []

  if (!/项目基本信息/.test(text) || !/项目详细介绍/.test(text)) {
    return { patches, filledKeys, selectedDomainIds, achievementTransform, pocStageRequirement, warnings }
  }

  const sec2 = sliceBetween(
    text,
    /二[、,，.\s]*项目基本信息\s*\n/i,
    /三[、,，.\s]*项目详细介绍\s*\n/i,
  )
  const sec3 = sliceBetween(
    text,
    /三[、,，.\s]*项目详细介绍\s*\n/i,
    /四[、,，.\s]*概念验证实施计划\s*\n/i,
  )
  const sec4 = sliceBetween(
    text,
    /四[、,，.\s]*概念验证实施计划\s*\n/i,
    /六[、,，.\s]*项目预算\s*\n/i,
  )
  const sec7m = text.match(/七[、,，.\s]*其他补充说明\s*\n+([\s\S]*)$/im)
  const sec7 = sec7m?.[1]?.trim() ?? ''

  if (sec2) {
    // 表格导出：可能是「名称」后换行，或「名称」与正文同一行；也支持直到「所属领域」整块
    const titleBetween = sec2.match(/项目名称\s*([\s\S]*?)(?=所属领域)/i)
    if (titleBetween?.[1]) {
      const firstLine = titleBetween[1]
        .split(/\n/)
        .map((l) => l.trim())
        .find((l) => l && !/^所属领域/.test(l))
      if (firstLine) {
        const t = firstLine.replace(/^[：:]\s*/, '').trim()
        if (t) {
          patches.title = t.slice(0, 200)
          filledKeys.push('title')
        }
      }
    }
    if (!patches.title?.trim()) {
      const g = guessTitleFromProductName(text)
      if (g) {
        patches.title = g
        filledKeys.push('title')
      }
    }

    // 所属领域：表格中常与 √/□ 同一行；下一大行常见为「成果水平」
    let domainTextRaw = ''
    const domainTabled = sec2.match(/所属领域\s*([\s\S]*?)(?=\n\s*成果水平|成果水平)/i)
    if (domainTabled?.[1]) {
      domainTextRaw = domainTabled[1].replace(/\r?\n/g, ' ').trim()
    }
    if (!domainTextRaw) {
      const domainOneLine = sec2.match(/所属领域\s*[\n\t]*([^\n]+)/i)
        || sec2.match(/所属领域\s*([^\n]+)/i)
      domainTextRaw = domainOneLine?.[1]?.trim() ?? ''
    }
    if (domainTextRaw) {
      const labels = extractCheckedFieldLabels(domainTextRaw)
      const domainText = labels.join('，')
      if (domainText) {
        const { ids, warnings: dw } = parseResearchDomainsText(domainText, domains)
        selectedDomainIds = ids
        warnings.push(...dw)
      }
      if (labels.some((l) => /^其他/.test(l) || l.includes('其他（'))) {
        warnings.push('文档中「其他」研究领域需在系统中手动勾选「其他」并填写说明。')
      }
    }

    // 技术成熟度：单独一行，或与 □/√ 同一行
    const tmLine =
      sec2.match(/技术成熟度(?!说明)\s*[\n\t]+([^\n]+)/i)
      || sec2.match(/技术成熟度(?!说明)\s*([^\n]+)/i)
    if (tmLine?.[1]) {
      const line = normalizeCheckboxUnicode(tmLine[1])
      const tmChunks = extractCheckedChunks(line)
      let hit = ''
      for (const ch of tmChunks) {
        hit = matchTechMaturityFromLine(ch)
        if (hit) break
      }
      if (hit) {
        patches.tech_maturity = hit
        filledKeys.push('tech_maturity')
      } else if (line.trim()) {
        warnings.push(`「技术成熟度」未匹配到系统选项，请手动选择：${line.trim().slice(0, 48)}…`)
      }
    }

    const tfLine =
      sec2.match(/预期成果转化形式\s*[\n\t]+([^\n]+)/i)
      || sec2.match(/预期成果转化形式\s*([^\n]+)/i)
    if (tfLine?.[1]) {
      const line = normalizeCheckboxUnicode(tfLine[1])
      achievementTransform = matchDefValuesFromChunks(extractCheckedChunks(line), TRANSFORM_LABELS)
    }

    const pocLine =
      sec2.match(/概念验证阶段需求\s*[\n\t]+([^\n]+)/i)
      || sec2.match(/概念验证阶段需求\s*([^\n]+)/i)
    if (pocLine?.[1]) {
      const line = normalizeCheckboxUnicode(pocLine[1])
      pocStageRequirement = matchDefValuesFromChunks(extractCheckedChunks(line), POC_LABELS)
    }

    const tmNote = sec2.match(
      /技术成熟度说明\s*\n+([\s\S]*?)(?=\n\s*预期成果转化形式)/i,
    )
    if (tmNote && tmNote[1]?.trim()) {
      const note = tmNote[1].trim()
      patches.supplementary_info = patches.supplementary_info
        ? `${patches.supplementary_info}\n\n技术成熟度说明\n${note}`
        : `技术成熟度说明\n${note}`
      filledKeys.push('supplementary_info')
    }
  }

  if (sec3) {
    const body = sec3.replace(/^成果简介精炼说明[^\n]*\n+/i, '').trim()
    const ip = body.split(/2[\.．]\s*知识产权情况/)
    const part1 = (ip[0] ?? '').trim()
    const rest2 = ip.slice(1).join('2. 知识产权情况').trim()
    const ia = rest2.split(/已有应用情况[^\n]*/)
    const part2 = (ia[0] ?? '').trim()
    let part3 = ia.slice(1).join('').trim()
    part3 = part3.split(/\n\s*市场状况及效益分析/i)[0]?.split(/6[\.．]\s*图片/i)[0]?.trim() ?? ''

    if (part1) {
      patches.detailed_introduction_part1 = part1
      filledKeys.push('detailed_introduction_part1')
      const abs = part1.replace(/\s+/g, ' ').trim().slice(0, 500)
      if (abs) {
        patches.abstract = abs
        filledKeys.push('abstract')
      }
    }
    if (part2) {
      patches.detailed_introduction_part2 = part2
      filledKeys.push('detailed_introduction_part2')
    }
    if (part3) {
      patches.detailed_introduction_part3 = part3
      filledKeys.push('detailed_introduction_part3')
    }
  }

  if (sec4) {
    patches.implementation_plan = sec4.trim()
    filledKeys.push('implementation_plan')
  }

  if (sec7) {
    patches.supplementary_info = patches.supplementary_info
      ? `${patches.supplementary_info}\n\n${sec7}`
      : sec7
    filledKeys.push('supplementary_info')
  }

  const kw = text.match(/关键词[：:\s]*\s*([^\n]+)/i)
  if (kw?.[1]?.trim()) {
    patches.keywords = kw[1].trim().slice(0, 500)
    filledKeys.push('keywords')
  }

  if (achievementTransform.length) filledKeys.push('achievement_transform')
  if (pocStageRequirement.length) filledKeys.push('poc_stage_requirement')
  if (selectedDomainIds.length) filledKeys.push('research_domains')

  return {
    patches,
    filledKeys: [...new Set(filledKeys)],
    selectedDomainIds,
    achievementTransform,
    pocStageRequirement,
    warnings,
  }
}

/** 从 docx 的 word/media/* 解压图片为 ArrayBuffer（按文件名排序） */
export async function extractDocxImages(arrayBuffer: ArrayBuffer): Promise<ExtractedWordImage[]> {
  const zip = await JSZip.loadAsync(arrayBuffer)
  const paths: string[] = []
  zip.forEach((relPath, file) => {
    if (file.dir) return
    const p = relPath.replace(/\\/g, '/')
    if (!/^word\/media\//i.test(p)) return
    const base = p.split('/').pop() || ''
    const ext = (base.match(/\.([a-z0-9]+)$/i) || [])[1]?.toLowerCase()
    if (!ext || !EXT_TO_MIME[ext]) return
    paths.push(p)
  })
  paths.sort((a, b) => a.localeCompare(b, 'en'))
  const out: ExtractedWordImage[] = []
  for (const p of paths) {
    const base = p.split('/').pop() || ''
    const ext = (base.match(/\.([a-z0-9]+)$/i) || [])[1]?.toLowerCase()
    if (!ext || !EXT_TO_MIME[ext]) continue
    const entry = zip.file(p)
    if (!entry) continue
    const data = await entry.async('arraybuffer')
    out.push({ fileName: base, mimeType: EXT_TO_MIME[ext], data })
  }
  return out
}

export function getWordImportTemplateHint(): string {
  return [
    '请使用平台提供的「概念验证平台项目征集表」模板，另存为 .docx 后上传。',
    '系统按章节识别：二、项目基本信息；三、项目详细介绍；四、概念验证实施计划；六、项目预算；七、其他补充说明。',
    '「所属领域」「技术成熟度」「预期成果转化形式」「概念验证阶段需求」等请按表中 ☑ 勾选行填写（导出为文本后仍可识别）。',
    '文档内嵌入的图片（嵌入在 Word 正文中）会从压缩包内提取并上传到「图片展示」步骤。',
    '项目名称若留空，将尝试从正文中的产品名推断；研究领域名称需与系统选项一致。',
  ].join('\n')
}

export async function parseProjectWordDocx(
  arrayBuffer: ArrayBuffer,
  researchDomains: ResearchDomainLite[],
): Promise<WordImportResult> {
  const mi = mammothInput(arrayBuffer)
  const [{ value: rawText }, extractedImages] = await Promise.all([
    mammoth.extractRawText(mi),
    extractDocxImages(arrayBuffer),
  ])
  const text = rawText.replace(/\u00a0/g, ' ')

  const platform = parsePlatformCollectionForm(text, researchDomains)
  const patches: WordImportPatches = { ...platform.patches }
  const allWarnings: string[] = [...platform.warnings]
  const filledKeys: string[] = [...platform.filledKeys]

  guessTitleFromFirstLine(text, patches)
  if (patches.title?.trim() && !filledKeys.includes('title')) filledKeys.push('title')

  let achievementTransform = [...platform.achievementTransform]
  let pocStageRequirement = [...platform.pocStageRequirement]

  if (!achievementTransform.length) {
    const sec2only = sliceBetween(
      text,
      /二[、,，.\s]*项目基本信息\s*\n/i,
      /三[、,，.\s]*项目详细介绍\s*\n/i,
    )
    achievementTransform = matchDefValuesFromChunks(
      collectCheckedChunksInText(sec2only || text),
      TRANSFORM_LABELS,
    )
    if (achievementTransform.length && !filledKeys.includes('achievement_transform')) {
      filledKeys.push('achievement_transform')
    }
  }
  if (!pocStageRequirement.length) {
    const sec2only = sliceBetween(
      text,
      /二[、,，.\s]*项目基本信息\s*\n/i,
      /三[、,，.\s]*项目详细介绍\s*\n/i,
    )
    pocStageRequirement = matchDefValuesFromChunks(
      collectCheckedChunksInText(sec2only || text),
      POC_LABELS,
    )
    if (pocStageRequirement.length && !filledKeys.includes('poc_stage_requirement')) {
      filledKeys.push('poc_stage_requirement')
    }
  }

  const selectedDomainIds = [...platform.selectedDomainIds]

  if (extractedImages.length && !filledKeys.includes('images')) {
    filledKeys.push('images')
  }

  const hasTextFields =
    filledKeys.filter((k) => k !== 'images').length > 0 ||
    selectedDomainIds.length > 0 ||
    achievementTransform.length > 0 ||
    pocStageRequirement.length > 0

  if (!hasTextFields && extractedImages.length === 0) {
    allWarnings.push(
      '未能识别征集表结构（需包含「二、项目基本信息」「三、项目详细介绍」等章节标题）。请使用标准征集表模板。',
    )
  } else if (!hasTextFields && extractedImages.length > 0) {
    allWarnings.push('仅识别到文档内图片，未匹配到征集表文字字段，请检查章节标题是否与模板一致。')
  }

  return {
    patches,
    selectedDomainIds,
    achievementTransform,
    pocStageRequirement,
    filledKeys: [...new Set(filledKeys)],
    warnings: allWarnings,
    extractedImages,
  }
}
