/**
 * 将构建产物 dist/ 压缩为 `releases/ai-form-copilot@<version>-<YYYYMMDD-HHmmss>.zip`。
 * 版本号从 package.json 读（应在调用前完成 `npm version patch --no-git-tag-version`）。
 *
 * 设计要点：
 *   - 以 `cd dist && zip -r <tmp> .` 打包，压缩包内不会多一层 dist/ 目录（解压即 Chrome 扩展目录）；
 *   - 先把 zip 写到仓库根的临时文件，再 rename 进 releases/，避免与构建产物或 zip 自身冲突；
 *   - releases/ 独立于 dist/，`npm run build` 不会清理；同一版本多次打包会按时间戳累积，便于比对历史产物。
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(resolve(repoRoot, 'package.json'), 'utf8'));
const distDir = resolve(repoRoot, 'dist');
const releasesDir = resolve(repoRoot, 'releases');

if (!existsSync(distDir) || readdirSync(distDir).length === 0) {
  console.error('[pack-dist] dist/ 不存在或为空，请先执行 `npm run build`');
  process.exit(1);
}

mkdirSync(releasesDir, { recursive: true });

/** 本地时间 YYYYMMDD-HHmmss（避开冒号，跨平台文件名安全） */
const pad = (n) => String(n).padStart(2, '0');
const now = new Date();
const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

const zipName = `ai-form-copilot@${pkg.version}-${stamp}.zip`;
const zipFinal = resolve(releasesDir, zipName);
const zipTmp = resolve(repoRoot, `.${zipName}.tmp`);

if (existsSync(zipTmp)) rmSync(zipTmp);

execSync(`zip -r "${zipTmp}" .`, { cwd: distDir, stdio: 'inherit' });
renameSync(zipTmp, zipFinal);
console.log(`[pack-dist] 已生成 releases/${zipName}`);
