import { useEffect, useRef } from 'react';
import throttle from 'lodash/throttle';

/**
 * 监听浏览器窗口的尺寸变化，并在尺寸变化时调用回调函数，回调函数传入窗口的宽和高
 * - 注意保证最优的性能
 * - 如果有必要请考虑使用截流函数，本项目已经安装了 lodash 库
 */

interface UseResizeOptions {
  /**
   * 截流时间，默认 200ms
   */
  throttleDelay?: number;
}

interface CallbackOptions {
  width: number;
  height: number;
}

export function useResize(
  callback: (options: CallbackOptions) => void,
  options?: UseResizeOptions
) {
  const callbackRef = useRef(callback);

  // 保持 callback ref 最新
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const { throttleDelay = 200 } = options || {};

    // 创建截流的 resize 处理函数
    const handleResize = throttle(() => {
      callbackRef.current({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }, throttleDelay);

    // 初始调用一次，确保首次渲染时也能获取尺寸
    callbackRef.current({
      width: window.innerWidth,
      height: window.innerHeight,
    });

    // 添加事件监听
    window.addEventListener('resize', handleResize);

    // 清理函数
    return () => {
      window.removeEventListener('resize', handleResize);
      handleResize.cancel(); // 取消未执行的截流函数
    };
  }, [options?.throttleDelay]);
}

export default useResize;