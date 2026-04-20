import type { FillData, FormFieldInfo } from '@/shared/types';

/** 使用 crypto API 生成强随机整数，避免 Service Worker 中 Math.random 可能的缓存问题 */
function randInt(min: number, max: number): number {
  const range = max - min + 1;
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return min + (array[0] % range);
}

/** 从数组中随机选一个 */
const pickOne = <T>(arr: T[]): T => arr[randInt(0, arr.length - 1)];

/** 从数组中随机选 N 个不重复的 */
function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => randInt(0, 1) ? 1 : -1);
  return shuffled.slice(0, n);
}

/** 生成随机中文名（每次保证不同） */
function randomChineseName(): string {
  const surnames = [
    '赵', '钱', '孙', '李', '周', '吴', '郑', '王', '冯', '陈',
    '褚', '卫', '蒋', '沈', '韩', '杨', '朱', '秦', '尤', '许',
    '何', '吕', '施', '张', '孔', '曹', '严', '华', '金', '魏',
    '陶', '姜', '戚', '谢', '邹', '苏', '潘', '葛', '范', '彭',
    '鲁', '韦', '昌', '马', '苗', '凤', '花', '方', '俞', '任',
    '袁', '柳', '唐', '罗', '薛', '汤', '滕', '殷', '罗', '毕',
    '郝', '邬', '安', '常', '乐', '于', '时', '傅', '皮', '齐',
    '康', '伍', '余', '元', '卜', '顾', '孟', '黄', '穆', '萧',
    '尹', '姚', '邵', '湛', '汪', '祁', '毛', '禹', '狄', '贝',
    '臧', '宣', '丁', '贺', '邓', '郁', '单', '杭', '洪', '龚',
  ];
  const givenNames = [
    '伟', '芳', '敏', '静', '丽', '强', '磊', '洋', '勇', '艳',
    '杰', '娜', '明', '华', '飞', '平', '刚', '桂', '英', '辉',
    '超', '秀兰', '霞', '玲', '军', '波', '涛', '鑫', '文', '武',
    '亮', '宁', '浩', '琳', '鹏', '瑞', '锋', '欣', '颖', '雪',
    '萍', '博', '思', '雨', '泽', '凯', '晨', '婷', '宇', '佳',
    '俊', '悦', '昊', '天', '睿', '嘉', '煜', '航', '阳', '峰',
    '林', '松', '翔', '云', '龙', '虎', '鸣', '志', '建', '国',
    '海', '江', '河', '山', '岩', '柏', '桐', '枫', '竹', '梅',
  ];
  const surname = pickOne(surnames);
  const nameLen = randInt(1, 2);
  const given = nameLen === 1 ? pickOne(givenNames) : pickOne(givenNames) + pickOne(givenNames);
  return surname + given;
}

/** 生成随机手机号 */
function randomPhone(): string {
  const prefixes = [
    '130', '131', '132', '133', '134', '135', '136', '137', '138', '139',
    '150', '151', '152', '153', '155', '156', '157', '158', '159',
    '170', '171', '172', '173', '175', '176', '177', '178',
    '180', '181', '182', '183', '184', '185', '186', '187', '188', '189',
    '191', '193', '195', '196', '197', '198', '199',
  ];
  return pickOne(prefixes) + String(randInt(10000000, 99999999));
}

/** 生成随机邮箱 */
function randomEmail(): string {
  const domains = ['qq.com', '163.com', 'gmail.com', 'outlook.com', '126.com', 'sina.com', 'foxmail.com'];
  const prefix = `user${randInt(100, 99999)}_${Date.now().toString(36).slice(-4)}`;
  return `${prefix}@${pickOne(domains)}`;
}

/** 生成随机身份证号 */
function randomIdCard(): string {
  const areas = ['110101', '110105', '310101', '310115', '440106', '440305', '330102', '510104', '320102', '420106'];
  const year = randInt(1965, 2003);
  const month = String(randInt(1, 12)).padStart(2, '0');
  const day = String(randInt(1, 28)).padStart(2, '0');
  const seq = String(randInt(100, 999));
  const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  const checkChars = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];
  const base = `${pickOne(areas)}${year}${month}${day}${seq}`;
  let sum = 0;
  for (let i = 0; i < 17; i++) sum += parseInt(base[i]) * weights[i];
  return base + checkChars[sum % 11];
}

/** 生成随机地址 */
function randomAddress(): string {
  const cities = [
    '北京市朝阳区', '北京市海淀区', '上海市浦东新区', '上海市黄浦区',
    '广州市天河区', '广州市越秀区', '深圳市南山区', '深圳市福田区',
    '杭州市西湖区', '杭州市滨江区', '成都市武侯区', '南京市鼓楼区',
    '武汉市洪山区', '西安市雁塔区', '苏州市工业园区', '重庆市渝中区',
  ];
  const streets = [
    '中关村大街', '南京西路', '天河路', '科技园路', '文三路',
    '解放路', '人民路', '建设大道', '长安街', '和平路',
    '中山路', '新华路', '光华大道', '未来科技城', '创业大道',
  ];
  return `${pickOne(cities)}${pickOne(streets)}${randInt(1, 999)}号`;
}

/** 生成近期日期（基于当前时间戳，绝不重复） */
function randomRecentDate(): string {
  const now = new Date();
  now.setDate(now.getDate() + randInt(-90, 90));
  now.setHours(randInt(0, 23), randInt(0, 59));
  return now.toISOString().slice(0, 10);
}

/** 生成未来日期（用于有前置/禁用日期约束的执行时间类字段） */
function randomFutureDate(): string {
  const now = new Date();
  now.setDate(now.getDate() + randInt(1, 30));
  now.setHours(randInt(9, 20), randInt(0, 59), 0, 0);
  return now.toISOString().slice(0, 10);
}

/** 生成未来日期时间（YYYY-MM-DD HH:mm:ss） */
function randomFutureDateTime(): string {
  const now = new Date();
  now.setDate(now.getDate() + randInt(1, 30));
  now.setHours(randInt(9, 20), randInt(0, 59), randInt(0, 59), 0);
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mi = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

/** 生成随机公司名 */
function randomCompany(): string {
  const prefixes = [
    '鼎信', '华创', '中联', '信达', '恒通', '远大', '盛世', '天宇',
    '博瑞', '启明', '汇智', '融信', '泰和', '新锐', '众合', '嘉禾',
    '瑞达', '宏图', '创联', '智远', '天成', '金源', '利达', '恒丰',
  ];
  const types = ['科技', '信息', '网络', '数据', '金融', '商务', '传媒', '咨询', '服务', '贸易'];
  const suffixes = ['有限公司', '股份有限公司', '集团', '有限责任公司'];
  return `${pickOne(prefixes)}${pickOne(types)}${pickOne(suffixes)}`;
}

/** 生成随机编码（大写字母+数字组合，每次带时间戳确保唯一） */
function randomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const ts = Date.now().toString(36).toUpperCase().slice(-3);
  let code = '';
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
  const compact = text.replace(/\s+/g, '');
  const patterns = [
    /不超过(\d{1,4})个?字符/,
    /至多(\d{1,4})个?字符/,
    /最多(\d{1,4})个?字符/,
    /不大于(\d{1,4})个?字符/,
    /长度不超过(\d{1,4})/,
    /最长(\d{1,4})个?字符/,
    /≤\s*(\d{1,4})\s*个?字符/,
  ];
  for (const re of patterns) {
    const m = compact.match(re);
    if (m) return Number(m[1]);
  }
  return undefined;
}

/** 合并 ruleHints / extra / placeholder 为一段可匹配的提示文本 */
function combineFieldHints(field: FormFieldInfo): string {
  return [field.validationError, field.ruleHints, field.extra, field.placeholder].filter(Boolean).join(' ');
}

/** 是否要求「仅数字与英文字母」类输入 */
function wantsAlphanumeric(hints: string): boolean {
  const h = hints.replace(/\s+/g, '');
  // 仅匹配明确表达「数字 + 英文」的文案，避免误伤普通校验错误（如「请输入XXX」「格式不正确」）
  return /仅支持数字英文/.test(h)
    || /仅支持英文数字/.test(h)
    || /(仅|只)支持[0-9A-Za-z]/.test(h)
    || /数字和?英文/.test(h)
    || /英文和?数字/.test(h)
    || /alphanumeric/i.test(hints);
}

/** 生成指定长度的字母数字串（大写+数字，避免中文校验不通过） */
function randomAlphanumeric(len: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < len; i++) s += chars[randInt(0, chars.length - 1)];
  return s;
}

/** 从 Form.Item extra 文案中解析数字范围、小数位数等提示（通用，不绑定具体业务） */
function parseNumberHintsFromExtra(extra?: string): { min?: number; max?: number; decimals?: number } {
  if (!extra) return {};
  const compact = extra.replace(/\s+/g, ' ');
  const hints: { min?: number; max?: number; decimals?: number } = {};

  const rangeMatch = compact.match(/(\d+(?:\.\d+)?)\s*[-~～至]\s*(\d+(?:\.\d+)?)/);
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
  if (/整数|必须为整|只能为整/.test(extra) && hints.decimals === undefined) hints.decimals = 0;

  return hints;
}

/** 合并 DOM constraints 与 extra 提示，得到最终取值区间 */
function mergeNumberBounds(
  c: FormFieldInfo['constraints'],
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

/** 生成日期范围（开始日期 + 结束日期，逗号分隔） */
function randomDateRange(): string {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() + randInt(-30, 30));
  const end = new Date(start);
  end.setDate(end.getDate() + randInt(1, 60));
  return `${start.toISOString().slice(0, 10)},${end.toISOString().slice(0, 10)}`;
}

/** 关键词到生成函数的映射 */
const LABEL_RULES: [RegExp, () => string][] = [
  [/执行时间|生效时间|触发时间|运行时间|定时/i, randomFutureDateTime],
  [/开始时间|结束时间|截止时间|到期时间/i, randomFutureDate],
  [/姓名|联系人|用户名|客户名|处理人/i, randomChineseName],
  [/手机|电话|座机|联系方式|tel|phone/i, randomPhone],
  [/邮箱|email|邮件/i, randomEmail],
  [/身份证|证件号/i, randomIdCard],
  [/地址|住址|详细地址/i, randomAddress],
  [/公司|企业|单位|机构/i, randomCompany],
  [/日期|时间|date/i, randomRecentDate],
  [/备注|说明|描述|原因|详情/i, () => randomText('测试备注')],
  [/金额|价格|费用|amount/i, () => String(randInt(100, 99999))],
  [/数量|件数|个数|count|num/i, () => String(randInt(1, 500))],
  [/比例|百分比|占比/i, () => String(randInt(1, 100))],
  [/编号|编码|code|码值|码|id|号/i, randomCode],
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

    // 文本类：优先满足「仅数字英文 + 最大长度」等 DOM 推断规则
    if (field.type === 'input' || field.type === 'textarea') {
      if (wantsAlphanumeric(hints)) {
        const maxLen = field.constraints?.maxLength ?? inferMaxLenFromHints(hints);
        const len = maxLen !== undefined ? Math.max(1, Math.min(maxLen, 32)) : 8;
        data[field.id] = randomAlphanumeric(len);
        continue;
      }
    }

    // 有选项的字段，随机选一个
    if (field.options && field.options.length > 0) {
      data[field.id] = pickOne(field.options);
      continue;
    }

    // daterange 类型优先使用日期范围生成，避免被 label 规则匹配成单个日期
    if (field.type === 'daterange') {
      data[field.id] = randomDateRange();
      continue;
    }

    // InputNumber：只生成合法数字，优先用 extra + min/max 约束，不走「姓名」等文本类 label 规则
    if (field.type === 'number') {
      data[field.id] = generateNumberValue(field);
      continue;
    }

    // 通过 label 关键词匹配
    const matched = LABEL_RULES.find(([pattern]) => pattern.test(field.label));
    if (matched) {
      data[field.id] = matched[1]();
      continue;
    }

    // 按字段类型兜底
    switch (field.type) {
      case 'input':
        data[field.id] = randomText('测试');
        break;
      case 'textarea':
        data[field.id] = randomText('这是自动生成的测试数据');
        break;
      case 'date':
        data[field.id] = randomRecentDate();
        break;
      case 'checkbox':
        data[field.id] = 'true';
        break;
      case 'switch':
        data[field.id] = randInt(0, 1) ? 'true' : 'false';
        break;
      case 'cascader':
      case 'treeselect':
      case 'transfer':
        // 这些组件的填充不依赖生成的值，而是在页面上随机选择
        data[field.id] = 'random';
        break;
      default:
        break;
    }

    const v = data[field.id];
    const maxLen = field.constraints?.maxLength;
    if (typeof v === 'string' && maxLen !== undefined && maxLen > 0 && v.length > maxLen) {
      data[field.id] = v.slice(0, maxLen);
    }
  }

  console.log('[AI Form Copilot] 生成 Mock 数据:', JSON.stringify(data));
  return data;
}
