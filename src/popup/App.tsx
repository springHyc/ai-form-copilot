import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MessageType } from '@/shared/messages';
import type { AIConfig, FillData, FormFieldInfo, Settings } from '@/shared/types';
import { DEFAULT_SETTINGS } from '@/shared/types';
import { MOONSHOT_CN_CHAT_BASE, moonshotCnBaseUrlForKimiModel } from '@/shared/moonshot-kimi';
import { generateMockData } from '@/utils/mock-rules';

import './style.css';

/* ========== Toast 消息系统 ========== */

interface ToastItem {
  id: number;
  text: string;
  type: 'success' | 'error' | 'warning';
}

let toastId = 0;

function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const show = useCallback((text: string, type: ToastItem['type'] = 'success') => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 2000);
  }, []);

  const ToastContainer = () =>
    toasts.length > 0 ? (
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>{t.text}</div>
        ))}
      </div>
    ) : null;

  return {
    success: (text: string) => show(text, 'success'),
    error: (text: string) => show(text, 'error'),
    warning: (text: string) => show(text, 'warning'),
    ToastContainer,
  };
}

/* ========== Tag 颜色映射 ========== */

const TYPE_COLORS: Record<string, string> = {
  input: 'blue', textarea: 'cyan', select: 'purple',
  radio: 'orange', checkbox: 'green', date: 'magenta',
  daterange: 'magenta', number: 'gold', cascader: 'geekblue',
  treeselect: 'volcano', switch: 'lime', transfer: 'processing',
  custom: 'default',
};

/* ========== 模型预设 ========== */

const MODEL_PRESETS: Record<string, { label: string; value: string }[]> = {
  openai: [
    { label: 'GPT-4o-mini', value: 'gpt-4o-mini' },
    { label: 'GPT-4o', value: 'gpt-4o' },
    { label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' },
  ],
  deepseek: [
    { label: 'DeepSeek V3', value: 'deepseek-chat' },
    { label: 'DeepSeek R1', value: 'deepseek-reasoner' },
  ],
  /** Kimi（月之暗面 Moonshot），与 OpenAI Chat Completions 兼容 */
  kimi: [
    { label: 'Kimi K2.5', value: 'kimi-k2.5' },
    { label: 'moonshot-v1-8k', value: 'moonshot-v1-8k' },
    { label: 'moonshot-v1-32k', value: 'moonshot-v1-32k' },
    { label: 'moonshot-v1-128k', value: 'moonshot-v1-128k' },
  ],
  custom: [],
};

const PROVIDER_URLS: Record<string, string> = {
  openai: 'https://api.openai.com/v1',
  deepseek: 'https://api.deepseek.com',
  /** Kimi 默认入口；选中具体模型后再按 kimi-k2.5 / 其它模型切到 anthropic 或 v1 */
  kimi: MOONSHOT_CN_CHAT_BASE,
  custom: '',
};

/* ========== 密码输入框组件 ========== */

const PasswordInput: React.FC<{
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}> = ({ value, onChange, placeholder }) => {
  const [visible, setVisible] = useState(false);
  return (
    <div className="password-wrapper">
      <input
        className="form-input"
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      <button
        className="password-toggle"
        type="button"
        onClick={() => setVisible(!visible)}
        title={visible ? '隐藏' : '显示'}
      >
        {visible ? '🙈' : '👁'}
      </button>
    </div>
  );
};

/* ========== SVG 图标 ========== */

const Icon = {
  Rocket: () => (
    <svg viewBox="64 64 896 896" width="1em" height="1em" fill="currentColor">
      <path d="M864 736c0-111.6-65.4-208-160-252.9V317.3c0-15.1-5.3-29.7-15.1-41.2L536.5 95.4C530.1 87.8 521 84 512 84s-18.1 3.8-24.5 11.4L335.1 276.1a56.7 56.7 0 00-15.1 41.2v165.8C225.4 528 160 624.4 160 736h156.5c4.2 37.6 19.7 72.3 44.2 100.8l-85.5 85.5c-3.1 3.1-3.1 8.2 0 11.3l28.3 28.3c3.1 3.1 8.2 3.1 11.3 0l85.5-85.5c28.5 24.5 63.2 40 100.8 44.2V984c0 4.4 3.6 8 8 8h16c4.4 0 8-3.6 8-8v-63.4c37.6-4.2 72.3-19.7 100.8-44.2l85.5 85.5c3.1 3.1 8.2 3.1 11.3 0l28.3-28.3c3.1-3.1 3.1-8.2 0-11.3l-85.5-85.5c24.5-28.5 40-63.2 44.2-100.8H864zM512 868c-72.9 0-132-59.1-132-132s59.1-132 132-132 132 59.1 132 132-59.1 132-132 132z" />
    </svg>
  ),
  Scan: () => (
    <svg viewBox="64 64 896 896" width="1em" height="1em" fill="currentColor">
      <path d="M136 384h56c4.4 0 8-3.6 8-8V200h176c4.4 0 8-3.6 8-8v-56c0-4.4-3.6-8-8-8H196c-37.6 0-68 30.4-68 68v180c0 4.4 3.6 8 8 8zm512-184h176v176c0 4.4 3.6 8 8 8h56c4.4 0 8-3.6 8-8V196c0-37.6-30.4-68-68-68H648c-4.4 0-8 3.6-8 8v56c0 4.4 3.6 8 8 8zM376 824H200V648c0-4.4-3.6-8-8-8h-56c-4.4 0-8 3.6-8 8v180c0 37.6 30.4 68 68 68h180c4.4 0 8-3.6 8-8v-56c0-4.4-3.6-8-8-8zm512-184h-56c-4.4 0-8 3.6-8 8v176H648c-4.4 0-8 3.6-8 8v56c0 4.4 3.6 8 8 8h180c37.6 0 68-30.4 68-68V648c0-4.4-3.6-8-8-8zm-68 96H204v-64h616v64z" />
    </svg>
  ),
  Edit: () => (
    <svg viewBox="64 64 896 896" width="1em" height="1em" fill="currentColor">
      <path d="M257.7 752c2 0 4-.2 6-.5L431.9 722c2-.4 3.9-1.3 5.3-2.8l423.9-423.9a9.96 9.96 0 000-14.1L694.9 114.9c-1.9-1.9-4.4-2.9-7.1-2.9s-5.2 1-7.1 2.9L256.8 538.8c-1.5 1.5-2.4 3.3-2.8 5.3l-29.5 168.2a33.5 33.5 0 009.4 29.8c6.6 6.4 14.9 9.9 23.8 9.9z" />
    </svg>
  ),
  Reload: () => (
    <svg viewBox="64 64 896 896" width="1em" height="1em" fill="currentColor">
      <path d="M909.1 209.3l-56.4 44.1C775.8 155.1 656.2 92 521.9 92 290 92 beckton101.3 279.5 100 512c-1.3 232.8 186.5 422.3 419.3 423.7 197.4 1.1 365-130.4 412.3-320.8 2.5-10-4.5-20-14.7-22.1l-55.7-11.6c-9.7-2-19.6 4.1-22 13.9C800.5 740.2 668.3 836 512 835c-178.8 0-324.5-145-325-323.8-.5-178.6 143.9-323.8 322.6-324.2 103 0 195 48.2 254.7 123.2l-63.6 49.7c-5.3 4.1-3.5 12.5 3.2 14.2l191 44.7c2 .5 4.1-.2 5.5-1.7 1.5-1.5 2.1-3.6 1.6-5.6l-47.3-190c-1.8-7.3-11.5-9.4-16-3.5z" />
    </svg>
  ),
  Setting: () => (
    <svg viewBox="64 64 896 896" width="1em" height="1em" fill="currentColor">
      <path d="M924.8 625.7l-65.5-56c3.1-19 4.7-38.4 4.7-57.8s-1.6-38.8-4.7-57.8l65.5-56a32.03 32.03 0 009.3-35.2l-.9-2.6a443.74 443.74 0 00-79.7-137.9l-1.8-2.1a32.12 32.12 0 00-35.1-9.5l-81.3 28.9c-30-24.6-63.5-44-99.7-57.6l-15.7-85a32.05 32.05 0 00-25.8-25.7l-2.7-.5c-52.1-9.4-106.9-9.4-159 0l-2.7.5a32.05 32.05 0 00-25.8 25.7l-15.8 85.4a351.86 351.86 0 00-99 57.4l-81.9-29.1a32 32 0 00-35.1 9.5l-1.8 2.1a446.02 446.02 0 00-79.7 137.9l-.9 2.6c-4.5 12.5-.8 26.5 9.3 35.2l66.3 56.6c-3.1 18.8-4.6 38-4.6 57.1 0 19.2 1.5 38.4 4.6 57.1L99 625.5a32.03 32.03 0 00-9.3 35.2l.9 2.6c18.1 50.4 44.9 96.9 79.7 137.9l1.8 2.1c9.8 11.7 25.1 16.7 39.4 12.8l76.8-27.2c29.5 24.4 63 43.6 98.5 57.2l15.4 83.1c2.2 12 10.4 21.8 22 25.7l2.7.5c52.1 9.4 106.9 9.4 159 0l2.7-.5c11.6-3.9 19.8-13.7 22-25.7l15.4-83.1c35.5-13.5 69-32.8 98.5-57.2l76.8 27.2c14.3 5.1 30.4 1.7 40.2-9.5l1.8-2.1c34.8-41.1 61.6-87.5 79.7-137.9l.9-2.6c4.5-12.3.8-26.3-9.3-35zM512 680c-93.7 0-170-76.3-170-170s76.3-170 170-170 170 76.3 170 170-76.3 170-170 170z" />
    </svg>
  ),
};

/* ========== 主应用 ========== */

const App: React.FC = () => {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [fields, setFields] = useState<FormFieldInfo[]>([]);
  const [fillData, setFillData] = useState<FillData>({});
  const [scanning, setScanning] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [filling, setFilling] = useState(false);
  const [activeTab, setActiveTab] = useState<'main' | 'settings'>('main');

  const toast = useToast();
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  /** 同一次「生成 / 一键填充」流程内，AI 限流提示只弹一次，避免多轮扫描刷屏 */
  const aiRateLimitHintShownRef = useRef(false);

  // 加载保存的设置
  useEffect(() => {
    chrome.storage.local.get('settings').then((result) => {
      if (!result.settings) return;
      let s = result.settings as Settings;
      const ac = s.aiConfig;
      // 已保存的 Kimi 配置按模型纠正 baseUrl（如 kimi-k2.5 需走 /anthropic）
      if (ac.provider === 'kimi') {
        const expected = moonshotCnBaseUrlForKimiModel(ac.model);
        const cur = (ac.baseUrl ?? '').replace(/\/$/, '');
        if (cur !== expected.replace(/\/$/, '')) {
          s = { ...s, aiConfig: { ...ac, baseUrl: expected } };
          chrome.storage.local.set({ settings: s });
        }
      }
      setSettings(s);
    });
  }, []);

  // 保存设置
  const saveSettings = useCallback((newSettings: Settings) => {
    setSettings(newSettings);
    chrome.storage.local.set({ settings: newSettings });
    toast.success('设置已保存');
  }, [toast]);

  // 更新 AI 配置
  const updateAIConfig = useCallback((partial: Partial<AIConfig>) => {
    const cur = settingsRef.current;
    const newConfig = { ...cur.aiConfig, ...partial };
    if (partial.provider) {
      const presets = MODEL_PRESETS[partial.provider];
      if (presets.length > 0) newConfig.model = presets[0].value;
      if (partial.provider === 'kimi') {
        newConfig.baseUrl = moonshotCnBaseUrlForKimiModel(newConfig.model);
      } else {
        newConfig.baseUrl = PROVIDER_URLS[partial.provider] || '';
      }
    }
    if (partial.model !== undefined && newConfig.provider === 'kimi') {
      newConfig.baseUrl = moonshotCnBaseUrlForKimiModel(partial.model);
    }
    saveSettings({ ...cur, aiConfig: newConfig });
  }, [saveSettings]);

  const notifyAiRateLimitedOnce = useCallback(() => {
    if (aiRateLimitHintShownRef.current) return;
    aiRateLimitHintShownRef.current = true;
    toast.warning('AI 接口限流（429），已改用内置规则生成数据，或者更换AI 服务商');
  }, [toast]);

  // 生成数据
  const generateData = useCallback(async (targetFields: FormFieldInfo[]): Promise<FillData> => {
    const { aiConfig, useMockFallback } = settingsRef.current;

    // 未配置 Key：只能走 Mock
    if (!aiConfig.apiKey) {
      return generateMockData(targetFields);
    }

    // 用户显式选择「无 AI 时用内置规则」：不发起 AI 请求
    if (useMockFallback) {
      return generateMockData(targetFields);
    }

    try {
      const response = await chrome.runtime.sendMessage({
        type: MessageType.GENERATE_DATA,
        fields: targetFields,
        aiConfig,
      });
      if (!response) {
        console.error('[AI Form Copilot] Popup -> Background GENERATE_DATA 无响应，降级为 Mock');
        return generateMockData(targetFields);
      }
      if (response.type === MessageType.ERROR) {
        const msg = String(response.error ?? '');
        // AI 限流 / 服务端错误：自动降级为 Mock，避免一键填充直接中断
        if (
          /AI API 调用失败 \((429|500|502|503|504)\)/.test(msg)
          || /rate_limit/i.test(msg)
        ) {
          console.warn('[AI Form Copilot] AI 生成失败，已降级为 Mock:', msg);
          if (/AI API 调用失败 \(429\)/.test(msg) || /rate_limit/i.test(msg)) {
            notifyAiRateLimitedOnce();
          }
          return generateMockData(targetFields);
        }
        console.error('[AI Form Copilot] Popup -> Background GENERATE_DATA 失败:', response.error);
        throw new Error(response.error);
      }
      return response.data || {};
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/AI API 调用失败 \((429|500|502|503|504)\)/.test(msg) || /rate_limit/i.test(msg)) {
        console.warn('[AI Form Copilot] AI 生成异常，已降级为 Mock:', e);
        if (/AI API 调用失败 \(429\)/.test(msg) || /rate_limit/i.test(msg)) {
          notifyAiRateLimitedOnce();
        }
        return generateMockData(targetFields);
      }
      console.error('[AI Form Copilot] Popup -> Background GENERATE_DATA 异常:', e);
      throw e;
    }
  }, [notifyAiRateLimitedOnce]);

  const hasFieldValue = (field: FormFieldInfo): boolean => {
    if (field.currentValue === undefined || field.currentValue === null) return false;
    return field.currentValue.trim().length > 0;
  };

  // 扫描表单
  const handleScan = useCallback(async () => {
    setScanning(true);
    try {
      const response = await chrome.runtime.sendMessage({ type: MessageType.SCAN_FORM });
      if (!response) {
        console.error('[AI Form Copilot] Popup -> Background SCAN_FORM 无响应');
        toast.error('扫描失败：无响应');
        return;
      }
      if (response.type === MessageType.ERROR) {
        console.error('[AI Form Copilot] Popup -> Background SCAN_FORM 失败:', response.error);
        toast.error(response.error);
        return;
      }
      setFields(response.fields || []);
      if (response.fields?.length > 0) {
        toast.success(`发现 ${response.fields.length} 个表单字段`);
      } else {
        toast.warning('未发现 Ant Design 表单字段');
      }
    } catch (e) {
      console.error('[AI Form Copilot] Popup 扫描异常:', e);
      toast.error('扫描失败，请确保页面已加载完成');
    } finally {
      setScanning(false);
    }
  }, [toast]);

  // 生成数据按钮
  const handleGenerate = useCallback(async () => {
    if (fields.length === 0) { toast.warning('请先扫描表单'); return; }
    aiRateLimitHintShownRef.current = false;
    setGenerating(true);
    try {
      const data = await generateData(fields);
      setFillData(data);
      toast.success('数据生成完成');
    } catch (error) {
      console.error('[AI Form Copilot] Popup 生成数据失败:', error);
      toast.error(error instanceof Error ? error.message : '数据生成失败');
    } finally {
      setGenerating(false);
    }
  }, [fields, generateData, toast]);

  // 填充表单
  const handleFill = useCallback(async () => {
    if (Object.keys(fillData).length === 0) { toast.warning('请先生成数据'); return; }
    setFilling(true);
    try {
      const response = await chrome.runtime.sendMessage({ type: MessageType.FILL_FORM, data: fillData });
      if (!response) {
        console.error('[AI Form Copilot] Popup -> Background FILL_FORM 无响应');
        toast.error('填充失败：无响应');
        return;
      }
      if (response.type === MessageType.ERROR) {
        console.error('[AI Form Copilot] Popup -> Background FILL_FORM 失败:', response.error);
        toast.error(response.error);
        return;
      }
      toast.success(`成功填充 ${response.filledCount} 个字段`);
    } catch (e) {
      console.error('[AI Form Copilot] Popup 填充异常:', e);
      toast.error('填充失败');
    } finally {
      setFilling(false);
    }
  }, [fillData, toast]);

  // 一键完成
  const handleOneClick = useCallback(async () => {
    aiRateLimitHintShownRef.current = false;
    setScanning(true);
    try {
      let totalFilled = 0;
      let mergedData: FillData = {};
      let previousFieldCount = -1;
      const maxPasses = 3;

      for (let pass = 1; pass <= maxPasses; pass++) {
        const scanResponse = await chrome.runtime.sendMessage({ type: MessageType.SCAN_FORM });
        if (!scanResponse) {
          console.error(`[AI Form Copilot] Popup 一键填充 pass=${pass} SCAN_FORM 无响应`);
          toast.error('扫描失败：无响应');
          setScanning(false);
          return;
        }
        if (scanResponse.type === MessageType.ERROR) {
          console.error(`[AI Form Copilot] Popup 一键填充 pass=${pass} SCAN_FORM 失败:`, scanResponse.error);
          toast.error(scanResponse.error);
          setScanning(false);
          return;
        }

        const scannedFields = (scanResponse.fields || []) as FormFieldInfo[];
        setFields(scannedFields);
        if (scannedFields.length === 0) {
          if (pass === 1) toast.warning('未发现表单字段');
          break;
        }

        const needFillFields = scannedFields.filter((field) => !hasFieldValue(field));
        if (needFillFields.length === 0) break;

        setScanning(false);
        setGenerating(true);
        let passData: FillData;
        try {
          passData = await generateData(needFillFields);
        } catch (error) {
          console.error(`[AI Form Copilot] Popup 一键填充 pass=${pass} 生成数据失败:`, error);
          toast.error(error instanceof Error ? error.message : '数据生成失败');
          setGenerating(false);
          return;
        }
        setGenerating(false);

        mergedData = { ...mergedData, ...passData };
        setFillData(mergedData);

        setFilling(true);
        const fillResponse = await chrome.runtime.sendMessage({
          type: MessageType.FILL_FORM,
          data: passData,
        });
        setFilling(false);

        if (!fillResponse) {
          console.error(`[AI Form Copilot] Popup 一键填充 pass=${pass} FILL_FORM 无响应`);
          toast.error('填充失败：无响应');
          return;
        }
        if (fillResponse.type === MessageType.ERROR) {
          console.error(`[AI Form Copilot] Popup 一键填充 pass=${pass} FILL_FORM 失败:`, fillResponse.error);
          toast.error(fillResponse.error);
          return;
        }

        totalFilled += fillResponse.filledCount || 0;

        // 如果字段数量没有增加，且本轮没有新填充，说明已趋于稳定，提前结束
        if (
          previousFieldCount === scannedFields.length
          && (fillResponse.filledCount || 0) === 0
        ) {
          break;
        }
        previousFieldCount = scannedFields.length;

        // 给 ProFormDependency / 异步请求一点渲染时间
        if (pass < maxPasses) {
          await new Promise((resolve) => setTimeout(resolve, 450));
          setScanning(true);
        }
      }

      setScanning(false);
      toast.success(`完成！累计成功填充 ${totalFilled} 个字段`);
    } catch (e) {
      console.error('[AI Form Copilot] Popup 一键填充异常:', e);
      toast.error('操作失败，请重试');
      setScanning(false);
      setGenerating(false);
      setFilling(false);
    }
  }, [generateData, toast]);

  const isLoading = scanning || generating || filling;
  const loadingText = scanning ? '扫描中...' : generating ? '生成中...' : filling ? '填充中...' : '';

  return (
    <>
      <toast.ToastContainer />
      <div className="app-container">
        {/* 头部 */}
        <div className="app-header">
          <h1>🤖 AI Form Copilot</h1>
        </div>

        {/* Tabs 导航 */}
        <div className="tabs-nav">
          <button
            className={`tab-btn ${activeTab === 'main' ? 'active' : ''}`}
            onClick={() => setActiveTab('main')}
          >
            <Icon.Rocket /> 填充
          </button>
          <button
            className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <Icon.Setting /> 设置
          </button>
        </div>

        {/* 填充面板 */}
        {activeTab === 'main' && (
          <div className="tab-content">
            <div className="stack">
              {/* 一键填充 */}
              <button
                className="btn btn-primary btn-lg"
                onClick={handleOneClick}
                disabled={isLoading}
              >
                {isLoading ? <><span className="spinner" /> {loadingText}</> : <><Icon.Rocket /> 一键智能填充</>}
              </button>

              {/* 分步操作 */}
              <div className="btn-group">
                <button className="btn btn-sm" onClick={handleScan} disabled={scanning}>
                  {scanning ? <span className="spinner" /> : <Icon.Scan />} 扫描
                </button>
                <button className="btn btn-sm" onClick={handleGenerate} disabled={generating || fields.length === 0}>
                  {generating ? <span className="spinner" /> : <Icon.Edit />} 生成数据
                </button>
                <button className="btn btn-sm" onClick={handleFill} disabled={filling || Object.keys(fillData).length === 0}>
                  {filling ? <span className="spinner" /> : <Icon.Reload />} 填充
                </button>
              </div>

              {/* 字段列表 */}
              {fields.length > 0 && (
                <div className="card">
                  <div className="card-header">识别到 {fields.length} 个字段</div>
                  <div className="card-body">
                    {fields.map((field) => (
                      <div key={field.id} className="field-item">
                        <div className="field-info">
                          <span className={`tag tag-${TYPE_COLORS[field.type] || 'default'}`}>{field.type}</span>
                          <span className="field-label">{field.label}</span>
                          {field.required && <span className="tag tag-red">必填</span>}
                        </div>
                        {fillData[field.id] !== undefined && (
                          <span className="field-value">{String(fillData[field.id])}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 提示 */}
              {!settings.aiConfig.apiKey && (
                <div className="hint">未配置 API Key，将使用内置规则生成数据</div>
              )}
            </div>
          </div>
        )}

        {/* 设置面板 */}
        {activeTab === 'settings' && (
          <div className="tab-content">
            <div className="form-item">
              <label className="form-label">AI 服务商</label>
              <select
                className="form-select"
                value={settings.aiConfig.provider}
                onChange={(e) => updateAIConfig({ provider: e.target.value as AIConfig['provider'] })}
              >
                <option value="openai">OpenAI</option>
                <option value="deepseek">DeepSeek</option>
                <option value="kimi">Kimi（月之暗面）</option>
                <option value="custom">自定义</option>
              </select>
            </div>

            <div className="form-item">
              <label className="form-label">API Key</label>
              <PasswordInput
                value={settings.aiConfig.apiKey}
                onChange={(val) => updateAIConfig({ apiKey: val })}
                placeholder="输入 API Key（留空使用内置规则）"
              />
            </div>

            <div className="form-item">
              <label className="form-label">模型</label>
              {MODEL_PRESETS[settings.aiConfig.provider].length > 0 ? (
                <select
                  className="form-select"
                  value={settings.aiConfig.model}
                  onChange={(e) => updateAIConfig({ model: e.target.value })}
                >
                  {MODEL_PRESETS[settings.aiConfig.provider].map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              ) : (
                <input
                  className="form-input"
                  value={settings.aiConfig.model}
                  onChange={(e) => updateAIConfig({ model: e.target.value })}
                  placeholder="输入模型名称"
                />
              )}
            </div>

            <div className="form-item">
              <label className="form-label">API 地址</label>
              <input
                className="form-input"
                value={settings.aiConfig.baseUrl}
                onChange={(e) => updateAIConfig({ baseUrl: e.target.value })}
                placeholder="https://api.openai.com/v1"
              />
            </div>

            <div className="form-item">
              <label className="form-label">无 AI 时使用内置规则</label>
              <button
                className={`toggle ${settings.useMockFallback ? 'checked' : ''}`}
                type="button"
                onClick={() => saveSettings({ ...settings, useMockFallback: !settings.useMockFallback })}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default App;
