/**
 * 格式化文件大小
 * - 省略最后一位为0的小数
 * @param size 文件大小
 * @returns 格式化后的文件大小
 */
export function formatFileSize(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }
  const formatNumber = (n: number) => {
    const str = n.toFixed(2);
    return str.includes('.') ? str.replace(/\.?0+$/, '') : str;
  };
  if (size < 1024 * 1024) {
    return `${formatNumber(size / 1024)} KB`;
  }
  return `${formatNumber(size / 1024 / 1024)} MB`;
}