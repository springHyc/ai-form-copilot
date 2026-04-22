import type { FillData, FormFieldInfo } from "@/shared/types";

/** 使用 crypto API 生成强随机整数，避免 Service Worker 中 Math.random 可能的缓存问题 */
function randInt(min: number, max: number): number {
  const range = max - min + 1;
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return min + (array[0] % range);
}

/** 从数组中随机选一个 */
const pickOne = <T>(arr: T[]): T => arr[randInt(0, arr.length - 1)];

/** 本地日历 YYYY-MM-DD（避免 toISOString 的 UTC 换日导致与页面 disabledDate 不一致） */
function formatLocalYmd(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** 从数组中随机选 N 个不重复的 */
function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => (randInt(0, 1) ? 1 : -1));
  return shuffled.slice(0, n);
}

/** 生成随机中文名（每次保证不同） */
function randomChineseName(): string {
  const surnames = [
    "赵",
    "钱",
    "孙",
    "李",
    "周",
    "吴",
    "郑",
    "王",
    "冯",
    "陈",
    "褚",
    "卫",
    "蒋",
    "沈",
    "韩",
    "杨",
    "朱",
    "秦",
    "尤",
    "许",
    "何",
    "吕",
    "施",
    "张",
    "孔",
    "曹",
    "严",
    "华",
    "金",
    "魏",
    "陶",
    "姜",
    "戚",
    "谢",
    "邹",
    "苏",
    "潘",
    "葛",
    "范",
    "彭",
    "鲁",
    "韦",
    "昌",
    "马",
    "苗",
    "凤",
    "花",
    "方",
    "俞",
    "任",
    "袁",
    "柳",
    "唐",
    "罗",
    "薛",
    "汤",
    "滕",
    "殷",
    "罗",
    "毕",
    "郝",
    "邬",
    "安",
    "常",
    "乐",
    "于",
    "时",
    "傅",
    "皮",
    "齐",
    "康",
    "伍",
    "余",
    "元",
    "卜",
    "顾",
    "孟",
    "黄",
    "穆",
    "萧",
    "尹",
    "姚",
    "邵",
    "湛",
    "汪",
    "祁",
    "毛",
    "禹",
    "狄",
    "贝",
    "臧",
    "宣",
    "丁",
    "贺",
    "邓",
    "郁",
    "单",
    "杭",
    "洪",
    "龚",
  ];
  const givenNames = [
    "伟",
    "芳",
    "敏",
    "静",
    "丽",
    "强",
    "磊",
    "洋",
    "勇",
    "艳",
    "杰",
    "娜",
    "明",
    "华",
    "飞",
    "平",
    "刚",
    "桂",
    "英",
    "辉",
    "超",
    "秀兰",
    "霞",
    "玲",
    "军",
    "波",
    "涛",
    "鑫",
    "文",
    "武",
    "亮",
    "宁",
    "浩",
    "琳",
    "鹏",
    "瑞",
    "锋",
    "欣",
    "颖",
    "雪",
    "萍",
    "博",
    "思",
    "雨",
    "泽",
    "凯",
    "晨",
    "婷",
    "宇",
    "佳",
    "俊",
    "悦",
    "昊",
    "天",
    "睿",
    "嘉",
    "煜",
    "航",
    "阳",
    "峰",
    "林",
    "松",
    "翔",
    "云",
    "龙",
    "虎",
    "鸣",
    "志",
    "建",
    "国",
    "海",
    "江",
    "河",
    "山",
    "岩",
    "柏",
    "桐",
    "枫",
    "竹",
    "梅",
  ];
  const surname = pickOne(surnames);
  const nameLen = randInt(1, 2);
  const given =
    nameLen === 1
      ? pickOne(givenNames)
      : pickOne(givenNames) + pickOne(givenNames);
  return surname + given;
}

/** 生成随机手机号 */
function randomPhone(): string {
  const prefixes = [
    "130",
    "131",
    "132",
    "133",
    "134",
    "135",
    "136",
    "137",
    "138",
    "139",
    "150",
    "151",
    "152",
    "153",
    "155",
    "156",
    "157",
    "158",
    "159",
    "170",
    "171",
    "172",
    "173",
    "175",
    "176",
    "177",
    "178",
    "180",
    "181",
    "182",
    "183",
    "184",
    "185",
    "186",
    "187",
    "188",
    "189",
    "191",
    "193",
    "195",
    "196",
    "197",
    "198",
    "199",
  ];
  return pickOne(prefixes) + String(randInt(10000000, 99999999));
}

/** 生成随机邮箱 */
function randomEmail(): string {
  const domains = [
    "qq.com",
    "163.com",
    "gmail.com",
    "outlook.com",
    "126.com",
    "sina.com",
    "foxmail.com",
  ];
  const prefix = `user${randInt(100, 99999)}_${Date.now().toString(36).slice(-4)}`;
  return `${prefix}@${pickOne(domains)}`;
}

/** 生成随机身份证号 */
function randomIdCard(): string {
  const areas = [
    "110101",
    "110105",
    "310101",
    "310115",
    "440106",
    "440305",
    "330102",
    "510104",
    "320102",
    "420106",
  ];
  const year = randInt(1965, 2003);
  const month = String(randInt(1, 12)).padStart(2, "0");
  const day = String(randInt(1, 28)).padStart(2, "0");
  const seq = String(randInt(100, 999));
  const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  const checkChars = ["1", "0", "X", "9", "8", "7", "6", "5", "4", "3", "2"];
  const base = `${pickOne(areas)}${year}${month}${day}${seq}`;
  let sum = 0;
  for (let i = 0; i < 17; i++) sum += parseInt(base[i]) * weights[i];
  return base + checkChars[sum % 11];
}

/** 生成随机地址 */
function randomAddress(): string {
  const cities = [
    "北京市朝阳区",
    "北京市海淀区",
    "上海市浦东新区",
    "上海市黄浦区",
    "广州市天河区",
    "广州市越秀区",
    "深圳市南山区",
    "深圳市福田区",
    "杭州市西湖区",
    "杭州市滨江区",
    "成都市武侯区",
    "南京市鼓楼区",
    "武汉市洪山区",
    "西安市雁塔区",
    "苏州市工业园区",
    "重庆市渝中区",
  ];
  const streets = [
    "中关村大街",
    "南京西路",
    "天河路",
    "科技园路",
    "文三路",
    "解放路",
    "人民路",
    "建设大道",
    "长安街",
    "和平路",
    "中山路",
    "新华路",
    "光华大道",
    "未来科技城",
    "创业大道",
  ];
  return `${pickOne(cities)}${pickOne(streets)}${randInt(1, 999)}号`;
}

/** 生成近期日期（基于当前时间戳，绝不重复） */
function randomRecentDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + randInt(-90, 90));
  return formatLocalYmd(d);
}

/** 生成未来日期（用于有前置/禁用日期约束的执行时间类字段；贴近今天，避免跑出很远） */
function randomFutureDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + randInt(1, 10));
  return formatLocalYmd(d);
}

/**
 * 生成未来日期时间（YYYY-MM-DD HH:mm:ss）。
 * 使用本地日历日 + 正午为基准，避免跨日/时区边界与 antd disabledDate（常见：昨天及之前不可选）冲突。
 * hints 中含名单包/需晚于等业务文案时，略抬高下限日，减少贴业务动态下限。
 */
function randomFutureDateTime(hints = ""): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  const heavy =
    /需晚于|不得早于|不能早于昨天|名单包|计划.*晚于|重复析出|单次型/i.test(
      hints,
    );
  let minAdd = 1;
  if (heavy) minAdd = 2;
  // 首选「今天往后几天～约两周」，避免 1～30 天跑得远、也不像真实排期
  const spread = heavy ? 12 : 6;
  const maxAdd = minAdd + spread;
  d.setDate(d.getDate() + randInt(minAdd, maxAdd));
  // antd@4 常见 disabledTime 仅放开整点/半点（如 scenesf 短信任务执行时间）；与 hideDisabledOptions 组合后列里往往只有 :00、:30
  const minute = pickOne([0, 30]);
  d.setHours(randInt(10, 17), minute, 0, 0);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

/** ProFormTimePicker / TimePicker：仅 HH:mm:ss（与 DatePicker 的 date 类型区分） */
function randomTimeHms(): string {
  const h = randInt(10, 17);
  const m = pickOne([0, 30]);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
}

/** extra/ruleHints 暗示不可选过去日（与 disabledDate 常见写法对齐，不解析 JS） */
function hintsSuggestNoPastDate(hints: string): boolean {
  return /需晚于|不得早于|不能早于|昨天|前天|名单包|计划.*时间|执行时间|生效时间|disabledDate|不可选.*过去/i.test(
    hints,
  );
}

/** 生成随机公司名 */
function randomCompany(): string {
  const prefixes = [
    "鼎信",
    "华创",
    "中联",
    "信达",
    "恒通",
    "远大",
    "盛世",
    "天宇",
    "博瑞",
    "启明",
    "汇智",
    "融信",
    "泰和",
    "新锐",
    "众合",
    "嘉禾",
    "瑞达",
    "宏图",
    "创联",
    "智远",
    "天成",
    "金源",
    "利达",
    "恒丰",
  ];
  const types = [
    "科技",
    "信息",
    "网络",
    "数据",
    "金融",
    "商务",
    "传媒",
    "咨询",
    "服务",
    "贸易",
  ];
  const suffixes = ["有限公司", "股份有限公司", "集团", "有限责任公司"];
  return `${pickOne(prefixes)}${pickOne(types)}${pickOne(suffixes)}`;
}

/** 生成随机编码（大写字母+数字组合，每次带时间戳确保唯一） */
function randomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const ts = Date.now().toString(36).toUpperCase().slice(-3);
  let code = "";
  for (let i = 0; i < 2; i++) code += chars[randInt(0, chars.length - 1)];
  code += ts;
  code += String(randInt(10, 99));
  return code;
}

/** 生成随机文本（带时间戳确保唯一） */
function randomText(prefix: string): string {
  const ts = Date.now().toString(36).slice(-4);
  return `${prefix}_${ts}_${randInt(100, 999)}`;
}

/** 从文案中推断「最大字符数」（与 scanner 中逻辑保持一致） */
function inferMaxLenFromHints(text: string): number | undefined {
  const compact = text.replace(/\s+/g, "");
  const patterns = [
    /不超过(\d{1,4})个?字符/,
    /至多(\d{1,4})个?字符/,
    /最多(\d{1,4})个?字符/,
    /不大于(\d{1,4})个?字符/,
    /长度不超过(\d{1,4})/,
    /最长(\d{1,4})个?字符/,
    /≤\s*(\d{1,4})\s*个?字符/,
    /不能超过(\d{1,4})个?字/,
    /不超过(\d{1,4})个?字/,
    /至多(\d{1,4})个?字/,
    /最多(\d{1,4})个?字/,
    /长度为(\d{1,4})个?字以内/,
  ];
  for (const re of patterns) {
    const m = compact.match(re);
    if (m) return Number(m[1]);
  }
  return undefined;
}

/** 合并 ruleHints / extra / placeholder 为一段可匹配的提示文本 */
function combineFieldHints(field: FormFieldInfo): string {
  return [
    field.validationError,
    field.ruleHints,
    field.extra,
    field.placeholder,
  ]
    .filter(Boolean)
    .join(" ");
}

/** 去重并保持稳定顺序（便于单测） */
function dedupeCharset(s: string): string {
  return [...new Set([...s])].join("");
}

/**
 * 将简单正则字符类展开为字面量字符表（不支持嵌套类、前瞻、Unicode 属性）。
 * 含中文范围则放弃，交给其它规则。
 */
function expandRegexCharClassInner(inner: string): string | null {
  if (/\\p{|\\u{|\\[dDsSwW]|\(\?/.test(inner)) return null;
  const out: string[] = [];
  for (let i = 0; i < inner.length; i++) {
    const c = inner[i];
    if (c === "\\" && i + 1 < inner.length) {
      const e = inner[++i];
      if (e === "d") out.push(..."0123456789");
      else if (e === "n") out.push("\n");
      else if (e === "t") out.push("\t");
      else if (e === "r") out.push("\r");
      else out.push(e);
      continue;
    }
    if (i + 2 < inner.length && inner[i + 1] === "-" && inner[i + 2] !== "]") {
      const a = inner.charCodeAt(i);
      const b = inner.charCodeAt(i + 2);
      if (a <= b && b - a < 2000) {
        for (let code = a; code <= b; code++) {
          if (code >= 0x4e00 && code <= 0x9fff) return null;
          out.push(String.fromCodePoint(code));
        }
        i += 2;
        continue;
      }
    }
    const code = c.codePointAt(0)!;
    if (code >= 0x4e00 && code <= 0x9fff) return null;
    out.push(c);
  }
  const flat = dedupeCharset(out.join(""));
  return flat.length > 0 ? flat : null;
}

/**
 * 解析常见 HTML pattern：`^[...]+$` / `^[...]*$` 等，得到允许字符集。
 */
function charsetFromHtmlPattern(
  pattern: string | undefined | null,
): string | null {
  if (!pattern?.trim()) return null;
  const p = pattern.trim();
  let m =
    p.match(/^\^\[([\s\S]+?)\]\+\$$/) ||
    p.match(/^\^\[([\s\S]+?)\]\*$$/) ||
    p.match(/^\^\[([\s\S]+?)\]\?$$/) ||
    p.match(/^\^\[([\s\S]+?)\]$$/);
  if (!m) {
    // 从 RegExp.source 或手写常见形态：仅字符类 + 量词，无 ^$
    m = p.match(/^\[([^\]]+)\](?:\+|\*|\?)?$/);
  }
  if (!m) return null;
  const inner = m[1];
  if (/\[[\s\S]*\[/.test(inner) || /\|/.test(inner)) return null;
  return expandRegexCharClassInner(inner);
}

/**
 * 从「只能包含…」「仅允许包含…」等中文枚举句解析允许字符（与 antd rules.message 常见写法对齐）。
 */
function charsetFromRestrictionHints(hints: string): string | null {
  const m = hints.match(/(?:只能包含|仅允许包含|只允许输入)([^。；;\r\n]+)/);
  if (!m) return null;
  let tail = m[1]
    .trim()
    .replace(/等[^。；;]*$/, "")
    .replace(/不允许.*$/, "")
    .replace(/不可.*$/, "");
  tail = tail.replace(/\s+/g, "");
  const raw = tail
    .split(/[,，、]/)
    .map((x) => x.trim())
    .filter(Boolean);
  const segs: string[] = [];
  for (const x of raw) {
    if (x.includes("及"))
      segs.push(
        ...x
          .split("及")
          .map((y) => y.trim())
          .filter(Boolean),
      );
    else segs.push(x);
  }
  let charset = "";
  for (const seg of segs) {
    if (!seg) continue;
    if (/^字母$|^英文字母$/i.test(seg) || /^大小写字母$/i.test(seg)) {
      charset += "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    } else if (/^数字$|^阿拉伯数字$/i.test(seg)) {
      charset += "0123456789";
    } else if (seg === "＆" || seg === "&") charset += "&";
    else if (seg === "＝" || seg === "=") charset += "=";
    else if (seg === "-" || seg === "－" || /^横线$|^连字符$|^减号$/i.test(seg))
      charset += "-";
    else if (seg === "_" || /^下划线$/i.test(seg)) charset += "_";
    else if (seg === ".") charset += ".";
    else if (seg === " ") charset += " ";
    else if (/字母.*数字|数字.*字母/.test(seg) && seg.length <= 16) {
      charset += "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    } else if (/[\u4e00-\u9fff]{2,}/.test(seg)) {
      return null;
    } else if (seg.length === 1 && seg.charCodeAt(0) < 0x80) {
      charset += seg;
    } else {
      return null;
    }
  }
  return charset.length > 0 ? dedupeCharset(charset) : null;
}

/** 在允许字符集内随机生成字符串 */
function randomFromCharset(charset: string, maxLen: number): string {
  const n = Math.max(2, Math.min(maxLen, 100));
  const hi = Math.max(2, Math.min(32, n));
  const len = randInt(Math.min(4, hi), hi);
  let s = "";
  for (let i = 0; i < len; i++) s += charset[randInt(0, charset.length - 1)];
  return s.slice(0, n);
}

/** 从提示文案中解析「固定 N 位数字」约束（如「长度为11位的数字」） */
function fixedDigitsLengthFromHints(hints: string): number | undefined {
  const compact = hints.replace(/\s+/g, "");
  const patterns = [
    /长度为(\d{1,3})位(?:的)?数字/,
    /只能输入长度为(\d{1,3})位(?:的)?数字/,
    /请输入(\d{1,3})位(?:的)?数字/,
    /(\d{1,3})位(?:纯)?数字/,
  ];
  for (const re of patterns) {
    const m = compact.match(re);
    if (!m) continue;
    const len = Number(m[1]);
    if (Number.isInteger(len) && len > 0) return len;
  }
  return undefined;
}

/** 生成固定长度数字串（用于「N 位数字」类字段） */
function randomDigits(len: number): string {
  const n = Math.max(1, Math.min(len, 64));
  let s = "";
  for (let i = 0; i < n; i++) s += String(randInt(0, 9));
  return s;
}

/** 是否要求「仅数字与英文字母」类输入 */
function wantsAlphanumeric(hints: string): boolean {
  const h = hints.replace(/\s+/g, "");
  // 含 antd 常见 rules.message：「请输入字母或数字」等；避免仅凭「格式不正确」误判
  return (
    /仅支持数字英文/.test(h) ||
    /仅支持英文数字/.test(h) ||
    /(仅|只)支持[0-9A-Za-z]/.test(h) ||
    /数字和?英文/.test(h) ||
    /英文和?数字/.test(h) ||
    /字母或数字|数字或字母|字母和数字|字母与数字/.test(h) ||
    /只能为?字母数字|只能输入字母数字|请输入字母数字/.test(h) ||
    /alphanumeric/i.test(hints)
  );
}

/** 生成指定长度的字母数字串（大写+数字，避免中文校验不通过） */
function randomAlphanumeric(len: number): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < len; i++) s += chars[randInt(0, chars.length - 1)];
  return s;
}

/** 从 Form.Item extra 文案中解析数字范围、小数位数等提示（通用，不绑定具体业务） */
function parseNumberHintsFromExtra(extra?: string): {
  min?: number;
  max?: number;
  decimals?: number;
} {
  if (!extra) return {};
  const compact = extra.replace(/\s+/g, " ");
  const hints: { min?: number; max?: number; decimals?: number } = {};

  const rangeMatch = compact.match(
    /(\d+(?:\.\d+)?)\s*[-~～至]\s*(\d+(?:\.\d+)?)/,
  );
  if (rangeMatch) {
    hints.min = Number(rangeMatch[1]);
    hints.max = Number(rangeMatch[2]);
  }

  const maxPatterns = [
    /(?:不超过|不大于|至多|最多|≤|<=)\s*(\d+(?:\.\d+)?)/,
    /(\d+(?:\.\d+)?)\s*(?:以内|以下)/,
  ];
  for (const re of maxPatterns) {
    const m = compact.match(re);
    if (m) {
      hints.max = Number(m[1]);
      break;
    }
  }

  const minPatterns = [
    /(?:不少于|不小于|至少|最少|≥|>=)\s*(\d+(?:\.\d+)?)/,
    /(\d+(?:\.\d+)?)\s*(?:以上|起)/,
  ];
  for (const re of minPatterns) {
    const m = compact.match(re);
    if (m) {
      hints.min = Number(m[1]);
      break;
    }
  }

  if (/两位小数|保留两位|最多两位/.test(extra)) hints.decimals = 2;
  else if (/一位小数|保留一位/.test(extra)) hints.decimals = 1;
  if (/整数|必须为整|只能为整/.test(extra) && hints.decimals === undefined)
    hints.decimals = 0;

  return hints;
}

/** 合并 DOM constraints 与 extra 提示，得到最终取值区间 */
function mergeNumberBounds(
  c: FormFieldInfo["constraints"],
  hints: ReturnType<typeof parseNumberHintsFromExtra>,
): { min: number; max: number; decimals: number } {
  let min = 1;
  let max = 1000;
  if (c?.min !== undefined) min = c.min;
  if (c?.max !== undefined) max = c.max;
  if (hints.min !== undefined) min = Math.max(min, hints.min);
  if (hints.max !== undefined) max = Math.min(max, hints.max);
  if (min > max) {
    if (c?.min !== undefined && c?.max !== undefined && c.min <= c.max) {
      return { min: c.min, max: c.max, decimals: hints.decimals ?? 0 };
    }
    return { min: 1, max: 1000, decimals: hints.decimals ?? 0 };
  }
  const decimals = hints.decimals ?? 0;
  return { min, max, decimals };
}

/** 在区间内生成随机数字符串（InputNumber 仅填合法数字） */
function generateNumberValue(field: FormFieldInfo): string {
  const hints = parseNumberHintsFromExtra(field.extra);
  const { min, max, decimals } = mergeNumberBounds(field.constraints, hints);
  if (decimals > 0) {
    const r = min + Math.random() * (max - min);
    return r.toFixed(decimals);
  }
  return String(randInt(Math.ceil(min), Math.floor(max)));
}

/**
 * 生成日期范围（开始 + 结束，英文逗号分隔）。
 * 始终带 HH:mm:ss（分钟仅 :00/:30，时段 10–17）：
 *   - RangePicker 若 `showTime`（如 new-market 首页弹窗「有效时间」`format='YYYY-MM-DD HH:mm:ss'`），
 *     无时分秒则 Mock 只能写到年月日，页面会卡在「请选择有效时间」。
 *   - RangePicker 若未开 showTime，antd-adapter `fillDateRange` 会在面板中仅点日期跳过时间列，
 *     或在直写兜底时按 placeholder 回退为纯 YYYY-MM-DD，不会把冗余时间抛给 rc-picker。
 */
function randomDateRange(): string {
  const start = new Date();
  start.setDate(start.getDate() + randInt(-30, 30));
  const end = new Date(start);
  end.setDate(end.getDate() + randInt(1, 60));
  const pickHms = () => {
    const h = String(randInt(10, 17)).padStart(2, "0");
    const m = pickOne([0, 30]);
    return `${h}:${String(m).padStart(2, "0")}:00`;
  };
  return `${formatLocalYmd(start)} ${pickHms()},${formatLocalYmd(end)} ${pickHms()}`;
}

/** 关键词到生成函数的映射（顺序敏感：更具体的规则须排在宽泛规则之前） */
const LABEL_RULES: [RegExp, () => string][] = [
  [/开始时间|结束时间|截止时间|到期时间/i, randomFutureDate],
  // 须在「姓名|…|处理人」之前：否则「处理人手机号」会先被 处理人 命中成中文名
  [/手机|电话|座机|联系方式|tel|phone/i, randomPhone],
  [/姓名|联系人|用户名|客户名|处理人/i, randomChineseName],
  [/邮箱|email|邮件/i, randomEmail],
  [/身份证|证件号/i, randomIdCard],
  [/地址|住址|详细地址/i, randomAddress],
  // 「渠道代码（企业金融）」等：label 括号内含「企业」若排在「编码/代码」前会误命中公司名，故编码类须在前
  [
    /编号|编码|代码|码值|条码|二维码|邀请码|兑换码|验证码|取件码|渠道码|code|id|号/i,
    randomCode,
  ],
  [/公司|企业|单位|机构/i, randomCompany],
  [/日期|时间|date/i, randomRecentDate],
  [/备注|说明|描述|原因|详情/i, () => randomText("测试备注")],
  [/金额|价格|费用|amount/i, () => String(randInt(100, 99999))],
  [/数量|件数|个数|count|num/i, () => String(randInt(1, 500))],
  [/比例|百分比|占比/i, () => String(randInt(1, 100))],
  [/年龄/i, () => String(randInt(18, 65))],
  [/密码|password/i, () => `Pwd${randInt(10000, 99999)}!`],
  [/名称|名字/i, () => (randInt(0, 1) ? randomCompany() : randomChineseName())],
];

/**
 * 基于规则生成 Mock 数据。
 * 使用 crypto.getRandomValues 确保每次调用都产生不同的数据。
 */
export function generateMockData(fields: FormFieldInfo[]): FillData {
  const data: FillData = {};

  for (const field of fields) {
    const hints = combineFieldHints(field);

    // 文本类：优先 HTML pattern / 中文「只能包含…」枚举 → 字符集随机；再字母数字类 hint
    if (field.type === "input" || field.type === "textarea") {
      const fromPattern = charsetFromHtmlPattern(field.constraints?.pattern);
      const fromMsg = charsetFromRestrictionHints(hints);
      const charset =
        (fromPattern && fromPattern.length > 0 ? fromPattern : null) ??
        (fromMsg && fromMsg.length > 0 ? fromMsg : null);
      if (charset) {
        const maxLen =
          field.constraints?.maxLength ?? inferMaxLenFromHints(hints) ?? 100;
        const cap = Math.max(2, Math.min(maxLen, 100));
        data[field.id] = randomFromCharset(charset, cap);
        continue;
      }
      // 先吃「固定 N 位数字」约束，避免 label 含「号码/编号」时误走 randomCode。
      const fixedDigitsLen = fixedDigitsLengthFromHints(hints);
      if (fixedDigitsLen !== undefined) {
        data[field.id] = randomDigits(fixedDigitsLen);
        continue;
      }
      if (wantsAlphanumeric(hints)) {
        const maxLen =
          field.constraints?.maxLength ?? inferMaxLenFromHints(hints);
        const len =
          maxLen !== undefined ? Math.max(1, Math.min(maxLen, 32)) : 8;
        data[field.id] = randomAlphanumeric(len);
        continue;
      }
    }

    // Select 家族短路：不走 LABEL_RULES / wantsAlphanumeric 等文本规则。
    // 这些字段的值必须与真实下拉 option 文案对齐，随机字符串（如 randomCode 对「提额机构pid」里的 "id"）
    // 几乎不可能命中 → 导致 fillSelect 找不到 option、填不进。
    //   有 options → 从 options 挑一条；
    //   无 options（异步下拉）→ "random"，交给 fillSelect 在真实下拉里随机点选。
    if (
      field.type === "select" ||
      field.type === "cascader" ||
      field.type === "treeselect" ||
      field.type === "transfer"
    ) {
      data[field.id] =
        field.options && field.options.length > 0
          ? pickOne(field.options)
          : "random";
      continue;
    }

    // 有选项的字段（radio / checkbox 等），随机选一个
    if (field.options && field.options.length > 0) {
      data[field.id] = pickOne(field.options);
      continue;
    }

    // daterange 类型优先使用日期范围生成，避免被 label 规则匹配成单个日期
    if (field.type === "daterange") {
      data[field.id] = randomDateRange();
      continue;
    }

    // InputNumber：只生成合法数字，优先用 extra + min/max 约束，不走「姓名」等文本类 label 规则
    if (field.type === "number") {
      data[field.id] = generateNumberValue(field);
      continue;
    }

    if (field.type === "time") {
      data[field.id] = randomTimeHms();
      continue;
    }

    /*
     * DatePicker / DateTime（scanner 多为 type=date；Pro 系同理）
     * Mock 决策顺序（须与 antd-adapter fillDate、AI 规则 5 一起看）：
     * 1) 本分支：label 含 执行/生效/触发/运行/定时(非「定时器」) 或 combineFieldHints 命中 hintsSuggestNoPastDate
     *    → randomFutureDateTime：本地日 +1～+7 天（heavy hints +2～+14）、分仅 00/30、时 10–17。
     * 2) LABEL_RULES：开始|结束|截止|到期 → randomFutureDate（仅 YMD，+1～+10 天）；宽泛 /日期|时间|date/ → randomRecentDate（±90 天，易与「仅未来可选」页面冲突，见下方「已知缺口」）。
     * 3) switch type=date：hintsSuggestNoPastDate → randomFutureDateTime，否则 randomRecentDate。
     * 填充侧：fillSingleDate 打开下拉后，以本机「今天」为中心按 0、+1、-1… 日尝试点到第一个非禁选日，再不行才用 Mock/AI 的日期；然后 tryPickTimeInDropdown（仍用字符串里的时刻）+ OK，失败则回退改 input。
     */
    // 执行/定时类 + 日期时间：须晚于「昨天」等常见 disabledDate，并吃 extra 里名单包等提示
    if (
      field.type === "date" &&
      (/执行时间|生效时间|触发时间|运行时间|定时(?!器)/i.test(field.label) ||
        hintsSuggestNoPastDate(hints))
    ) {
      data[field.id] = randomFutureDateTime(hints);
      continue;
    }

    // 通过 label 关键词匹配
    const matched = LABEL_RULES.find(([pattern]) => pattern.test(field.label));
    if (matched) {
      const generated = matched[1]();
      const maxLen = field.constraints?.maxLength ?? inferMaxLenFromHints(hints);
      if (
        typeof generated === "string" &&
        maxLen !== undefined &&
        maxLen > 0 &&
        generated.length > maxLen
      ) {
        data[field.id] = generated.slice(0, maxLen);
      } else {
        data[field.id] = generated;
      }
      continue;
    }

    // 按字段类型兜底
    switch (field.type) {
      case "input":
        data[field.id] = randomText("测试");
        break;
      case "textarea":
        data[field.id] = randomText("这是自动生成的测试数据");
        break;
      case "date":
        data[field.id] = hintsSuggestNoPastDate(hints)
          ? randomFutureDateTime(hints)
          : randomRecentDate();
        break;
      case "checkbox":
        data[field.id] = "true";
        break;
      case "switch":
        data[field.id] = randInt(0, 1) ? "true" : "false";
        break;
      default:
        // select/cascader/treeselect/transfer 已在循环前的「Select 家族短路」分支处理，不会走到这里
        break;
    }

    const v = data[field.id];
    // 兜底：若 DOM 未给出 maxlength，也要吃到 validationError/ruleHints 里的长度约束（如「不能超过10个字」）。
    const maxLen = field.constraints?.maxLength ?? inferMaxLenFromHints(hints);
    if (
      typeof v === "string" &&
      maxLen !== undefined &&
      maxLen > 0 &&
      v.length > maxLen
    ) {
      data[field.id] = v.slice(0, maxLen);
    }
  }

  console.log("[AI Form Copilot] 生成 Mock 数据:", JSON.stringify(data));
  return data;
}
