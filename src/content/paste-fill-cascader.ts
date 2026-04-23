function normalizeLabel(text: string): string {
  return text.replace(/\s+/g, '').replace(/[：:]/g, '').trim();
}

function splitPath(value: string): string[] {
  return value
    .split(/\s*>\s*|\s*\/\s*|\s*>\s*|\s*-\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function clickNode(element: HTMLElement): void {
  element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
  element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  if (typeof element.click === 'function') element.click();
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getVisibleMenus(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(
    '.ant-cascader-dropdown:not(.ant-cascader-dropdown-hidden) .ant-cascader-menu, ' +
      '.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-cascader-menu, ' +
      '.ant-cascader-menus .ant-cascader-menu',
  ));
}

export async function fillCascaderWithPath(value: string): Promise<boolean> {
  const tokens = splitPath(value);
  if (tokens.length === 0) return false;

  for (let level = 0; level < tokens.length; level++) {
    const menus = getVisibleMenus();
    if (menus.length === 0) return false;
    const currentMenu = menus[Math.min(level, menus.length - 1)];
    if (!currentMenu) return false;

    const options = Array.from(
      currentMenu.querySelectorAll<HTMLElement>(
        '.ant-cascader-menu-item:not(.ant-cascader-menu-item-disabled)',
      ),
    );
    if (options.length === 0) return false;

    const targetToken = normalizeLabel(tokens[level]);
    const matched = options.find((option) => {
      const optionText = normalizeLabel(option.textContent ?? '');
      return optionText === targetToken || optionText.includes(targetToken) || targetToken.includes(optionText);
    });
    if (!matched) return false;

    clickNode(matched);
    await wait(280);
  }

  return true;
}
