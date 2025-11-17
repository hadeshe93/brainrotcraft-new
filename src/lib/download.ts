/**
 * 从 URL 下载文件的通用工具函数
 */

interface DownloadOptions {
  /** 文件 URL */
  url: string;
  /** 下载的文件名，如果不提供则从 URL 中提取 */
  filename?: string;
  /** 是否在新窗口中打开（备用方案） */
  openInNewTab?: boolean;
}

/**
 * 从 URL 下载文件
 * @param options 下载选项
 * @returns Promise<boolean> 下载是否成功触发
 */
export async function downloadFromUrl(options: DownloadOptions): Promise<boolean> {
  const { url, filename, openInNewTab = true } = options;

  try {
    // 获取文件名
    const finalFilename = filename || extractFilenameFromUrl(url);

    // 尝试使用 fetch 下载（支持跨域和更好的错误处理）
    const response = await fetch(url);
    
    if (!response.ok) {
      console.warn('Fetch failed, falling back to direct download');
      return directDownload(url, finalFilename, openInNewTab);
    }

    const blob = await response.blob();
    return downloadBlob(blob, finalFilename);
    
  } catch (error) {
    console.warn('Download with fetch failed, trying direct download:', error);
    return directDownload(url, filename || extractFilenameFromUrl(url), openInNewTab);
  }
}

/**
 * 下载 Blob 对象
 * @param blob Blob 对象
 * @param filename 文件名
 * @returns boolean 下载是否成功触发
 */
export function downloadBlob(blob: Blob, filename: string): boolean {
  try {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    
    // 添加到文档中（某些浏览器需要）
    document.body.appendChild(link);
    link.click();
    
    // 清理
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    return true;
  } catch (error) {
    console.error('Download blob failed:', error);
    return false;
  }
}

/**
 * 直接下载（备用方案）
 * @param url 文件 URL
 * @param filename 文件名
 * @param openInNewTab 是否在新窗口打开
 * @returns boolean 下载是否成功触发
 */
function directDownload(url: string, filename: string, openInNewTab: boolean): boolean {
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    
    if (openInNewTab) {
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    }
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    return true;
  } catch (error) {
    console.error('Direct download failed:', error);
    return false;
  }
}

/**
 * 从 URL 中提取文件名
 * @param url 文件 URL
 * @returns string 文件名
 */
function extractFilenameFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const filename = pathname.split('/').pop() || 'download';
    
    // 如果没有扩展名，尝试从 URL 推断或添加默认扩展名
    if (!filename.includes('.')) {
      return `${filename}.png`; // 默认为图片格式
    }
    
    return filename;
  } catch (error) {
    console.warn('Failed to extract filename from URL:', error);
    return `download_${Date.now()}.png`;
  }
}

/**
 * 生成友好的文件名
 * @param prefix 文件名前缀
 * @param extension 文件扩展名（不含点）
 * @returns string 生成的文件名
 */
export function generateFriendlyFilename(prefix: string, extension: string = 'png'): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const cleanPrefix = prefix.replace(/[^a-zA-Z0-9\-_]/g, '_');
  return `${cleanPrefix}_${timestamp}.${extension}`;
}

/**
 * 检查浏览器是否支持下载功能
 * @returns boolean 是否支持
 */
export function isDownloadSupported(): boolean {
  return typeof document !== 'undefined' && 'download' in document.createElement('a');
} 