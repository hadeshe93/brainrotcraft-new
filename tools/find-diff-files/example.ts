/**
 * 示例：如何使用 findChangedFiles 核心函数
 */

import { findChangedFiles } from './index';

// 示例 1: 查找 src 目录下的所有改动文件
console.log('=== Example 1: Find all changed files in src/ ===');
const srcFiles = findChangedFiles('src');
console.log(`Total: ${srcFiles.length} files`);
srcFiles.forEach((file) => console.log(`  - ${file}`));

console.log('\n');

// 示例 2: 查找 src/components 目录下的改动文件
console.log('=== Example 2: Find changed files in src/components/ ===');
const componentFiles = findChangedFiles('src/components');
console.log(`Total: ${componentFiles.length} files`);
componentFiles.forEach((file) => console.log(`  - ${file}`));

console.log('\n');

// 示例 3: 查找 src/app 目录下的改动文件
console.log('=== Example 3: Find changed files in src/app/ ===');
const appFiles = findChangedFiles('src/app');
console.log(`Total: ${appFiles.length} files`);
appFiles.forEach((file) => console.log(`  - ${file}`));

console.log('\n');

// 示例 4: 按文件扩展名过滤
console.log('=== Example 4: Filter by extension (.tsx files in src/) ===');
const tsxFiles = srcFiles.filter((file) => file.endsWith('.tsx'));
console.log(`Total: ${tsxFiles.length} .tsx files`);
tsxFiles.forEach((file) => console.log(`  - ${file}`));

console.log('\n');

// 示例 5: 检查特定目录是否有改动
console.log('=== Example 5: Check if specific directories have changes ===');
const directories = ['src/app', 'src/components', 'src/services', 'src/types'];
directories.forEach((dir) => {
  const files = findChangedFiles(dir);
  console.log(`  ${dir}: ${files.length > 0 ? `✓ ${files.length} changed` : '✗ no changes'}`);
});
