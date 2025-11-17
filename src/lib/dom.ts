interface ToggleClassNameProps {
  dom: HTMLElement | null | undefined;
  className: string | string[];
  force?: boolean; // 可选：强制添加(true)或移除(false)类名
}

/**
 * 切换 DOM 元素的类名
 * @param props - 包含目标元素和类名的配置对象
 * @returns 操作是否成功
 */
export function toggleClassName(props: ToggleClassNameProps): boolean {
  const { dom, className, force } = props;

  // 边界情况检查：DOM 元素
  if (!dom || !(dom instanceof HTMLElement)) {
    console.warn('toggleClassName: Invalid DOM element provided');
    return false;
  }

  // 边界情况检查：类名
  if (!className || (Array.isArray(className) && className.length === 0)) {
    console.warn('toggleClassName: No className provided');
    return false;
  }

  try {
    // 处理单个类名或类名数组
    const classNames = Array.isArray(className) ? className : [className];
    let allSuccess = true;

    for (const cls of classNames) {
      // 跳过空字符串或无效类名
      if (!cls || typeof cls !== 'string' || cls.trim() === '') {
        console.warn(`toggleClassName: Invalid className "${cls}"`);
        allSuccess = false;
        continue;
      }

      const trimmedClass = cls.trim();

      // 优先使用现代 classList API
      if (dom.classList && typeof dom.classList.toggle === 'function') {
        try {
          if (force !== undefined) {
            // 强制模式：添加或移除
            if (force) {
              dom.classList.add(trimmedClass);
            } else {
              dom.classList.remove(trimmedClass);
            }
          } else {
            // 切换模式
            dom.classList.toggle(trimmedClass);
          }
        } catch (error) {
          console.error(`toggleClassName: Failed to toggle class "${trimmedClass}"`, error);
          allSuccess = false;
        }
      } else {
        // 降级处理：使用 className 属性
        try {
          const currentClasses = dom.className ? dom.className.split(/\s+/) : [];
          const hasClass = currentClasses.includes(trimmedClass);

          let newClasses: string[];

          if (force !== undefined) {
            // 强制模式
            if (force && !hasClass) {
              newClasses = [...currentClasses, trimmedClass];
            } else if (!force && hasClass) {
              newClasses = currentClasses.filter(c => c !== trimmedClass);
            } else {
              newClasses = currentClasses;
            }
          } else {
            // 切换模式
            if (hasClass) {
              newClasses = currentClasses.filter(c => c !== trimmedClass);
            } else {
              newClasses = [...currentClasses, trimmedClass];
            }
          }

          // 更新 className，去除多余空格
          dom.className = newClasses.filter(c => c.trim() !== '').join(' ');
        } catch (error) {
          console.error(`toggleClassName: Fallback failed for class "${trimmedClass}"`, error);
          allSuccess = false;
        }
      }
    }

    return allSuccess;
  } catch (error) {
    console.error('toggleClassName: Unexpected error', error);
    return false;
  }
}

/**
 * 检查 DOM 元素是否包含指定类名
 * @param dom - 目标 DOM 元素
 * @param className - 要检查的类名
 * @returns 是否包含该类名
 */
export function hasClassName(dom: HTMLElement | null | undefined, className: string): boolean {
  if (!dom || !className || typeof className !== 'string') {
    return false;
  }

  try {
    const trimmedClass = className.trim();
    
    // 优先使用 classList API
    if (dom.classList && typeof dom.classList.contains === 'function') {
      return dom.classList.contains(trimmedClass);
    }

    // 降级处理
    const currentClasses = dom.className ? dom.className.split(/\s+/) : [];
    return currentClasses.includes(trimmedClass);
  } catch (error) {
    console.error('hasClassName: Error checking class', error);
    return false;
  }
}

/**
 * 添加类名到 DOM 元素
 * @param dom - 目标 DOM 元素  
 * @param className - 要添加的类名
 * @returns 操作是否成功
 */
export function addClassName(dom: HTMLElement | null | undefined, className: string | string[]): boolean {
  return toggleClassName({ dom, className, force: true });
}

/**
 * 从 DOM 元素移除类名
 * @param dom - 目标 DOM 元素
 * @param className - 要移除的类名
 * @returns 操作是否成功
 */
export function removeClassName(dom: HTMLElement | null | undefined, className: string | string[]): boolean {
  return toggleClassName({ dom, className, force: false });
}