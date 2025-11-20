import { execSync } from 'child_process';
import * as path from 'path';

/**
 * 核心函数：查找指定目录下存在 Git 改动的文件
 * @param targetPath - 目标目录的相对路径（相对于项目根目录）
 * @returns 改动文件的相对路径数组
 */
export function findChangedFiles(targetPath: string): string[] {
  try {
    // 获取项目根目录
    const projectRoot = execSync('git rev-parse --show-toplevel', {
      encoding: 'utf-8',
    }).trim();

    // 规范化目标路径
    const normalizedTargetPath = targetPath.replace(/^[@\/]+/, '').replace(/\/$/, '');

    // 执行 git status --porcelain 获取所有改动的文件
    // 格式: XY PATH 或 XY PATH -> NEW_PATH (重命名情况)
    const gitStatus = execSync('git status --porcelain', {
      encoding: 'utf-8',
      cwd: projectRoot,
    });

    const changedFiles: string[] = [];

    // 解析 git status 输出
    const lines = gitStatus.split('\n').filter((line) => line.trim());

    for (const line of lines) {
      // git status --porcelain 格式:
      // XY PATH 或 XY ORIG -> RENAMED
      // X 和 Y 是状态码，例如 M (修改), A (新增), D (删除), R (重命名), ?? (未跟踪)
      const match = line.match(/^(.{2})\s+(.+?)(?:\s+->\s+(.+))?$/);

      if (!match) continue;

      const [, , originalPath, renamedPath] = match;

      // 对于重命名的文件，使用新路径；否则使用原路径
      const filePath = renamedPath || originalPath;

      // 检查文件是否在目标路径下
      if (filePath.startsWith(normalizedTargetPath + '/') || filePath === normalizedTargetPath) {
        changedFiles.push(filePath);
      }
    }

    return changedFiles;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to find changed files: ${error.message}`);
    }
    throw error;
  }
}

/**
 * 应用层函数：查找 src 目录下的改动文件并输出到控制台
 */
export function main() {
  const targetPath = 'src';

  try {
    const changedFiles = findChangedFiles(targetPath);

    if (changedFiles.length === 0) {
      console.log(`No changed files found in ${targetPath}/`);
      return;
    }

    console.log(`Found ${changedFiles.length} changed file(s) in ${targetPath}/:\n`);

    // 每行输出一个文件路径
    changedFiles.forEach((file) => {
      console.log(file);
    });
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// 如果直接运行此脚本，则执行 main 函数
if (require.main === module) {
  main();
}
