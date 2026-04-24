/**
 * 识别客服管理 > 客诉 > 工单表单语境：以页面内 antd **面包屑**为准。
 * `document.title` 常为「工单详情」等，与模块路径不一致，故不依赖 title。
 * 条件：可见 `nav.ant-breadcrumb` / `.ant-breadcrumb` 文案中同时含「客服管理系统」「客诉管理」，
 * 且含典型工单末级「工单详情」「新增工单」「新建工单」之一，避免误伤客诉下其它菜单页。
 */
function isVisible(el: HTMLElement): boolean {
  const s = getComputedStyle(el);
  if (s.display === "none" || s.visibility === "hidden" || s.opacity === "0") return false;
  if (el.offsetWidth > 0 || el.offsetHeight > 0) return true;
  const r = el.getBoundingClientRect();
  return r.width > 0 || r.height > 0;
}

export function isCsComplaintTicketBreadcrumbContext(): boolean {
  const crumbs = document.querySelectorAll<HTMLElement>(
    "nav.ant-breadcrumb, .ant-breadcrumb",
  );
  for (const el of crumbs) {
    if (!isVisible(el)) continue;
    const compact = (el.textContent || "").replace(/\s+/g, "");
    if (!compact.includes("客服管理系统") || !compact.includes("客诉管理")) {
      continue;
    }
    if (
      compact.includes("工单详情") ||
      compact.includes("新增工单") ||
      compact.includes("新建工单")
    ) {
      return true;
    }
  }
  return false;
}
