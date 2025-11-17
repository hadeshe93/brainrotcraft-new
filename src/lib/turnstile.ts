import { loadScript } from './script';

let loadCfTurnstilePromise: Promise<void> | null = null;
export const loadCfTurnstile = () => {
  if (!loadCfTurnstilePromise) {
    loadCfTurnstilePromise = new Promise<void>((resolve, reject) => {
      if (typeof window === 'undefined' || window.turnstile) {
        return resolve(void 0);
      }
      if (!window.onloadTurnstileCallback) {
        window.onloadTurnstileCallback = () => {
          resolve(void 0);
        };
      }
      loadScript({ src: 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onloadTurnstileCallback' }).catch(reject);
    });
  }
  return loadCfTurnstilePromise;
};

interface RenderTurnstileWidgetProps {
  widgetSelector: string;
  sitekey: string;
  theme?: 'auto' | 'light' | 'dark';
  onSuccess?: (token: string) => void;
  onError?: (error: string) => void;
}
export const renderTurnstileWidget = async (props: RenderTurnstileWidgetProps) => {
  await loadCfTurnstile();
  return await new Promise<string>((resolve, reject) => {
    try {
      const id = window.turnstile.render(document.querySelector(props.widgetSelector) as HTMLElement, {
        sitekey: props.sitekey,
        theme: props.theme || 'auto',
        // size: 'compact',
        callback: (token: string) => {
          console.log('[Raw] token:', token);
          props.onSuccess?.(token);
        },
        ['error-callback']: (error: string) => {
          console.error('[Raw] error-callback:', error);
          props.onError?.(error);
        },
      });
      resolve(id);
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * 服务端验证 Turnstile token
 * @param token - 客户端获取的 Turnstile token
 * @param remoteip - 用户的 IP 地址（可选）
 * @returns 验证结果
 */
export interface TurnstileVerifyResult {
  success: boolean;
  'error-codes'?: string[];
  challenge_ts?: string;
  hostname?: string;
}

export async function verifyTurnstileToken(
  token: string, 
  remoteip?: string
): Promise<TurnstileVerifyResult> {
  const secretKey = process.env.CF_TURNSTILE_SECRET_KEY;
  
  if (!secretKey) {
    console.warn('⚠️ CF_TURNSTILE_SECRET_KEY 未配置，跳过 Turnstile 验证');
    return { success: true }; // 开发环境可能没有配置，允许通过
  }

  const formData = new FormData();
  formData.append('secret', secretKey);
  formData.append('response', token);
  if (remoteip) {
    formData.append('remoteip', remoteip);
  }

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      console.error('Turnstile API 响应错误:', response.status, response.statusText);
      return { success: false, 'error-codes': ['api-error'] };
    }

    const result: TurnstileVerifyResult = await response.json();
    
    if (!result.success) {
      console.warn('Turnstile 验证失败:', result['error-codes']);
    }
    
    return result;
  } catch (error) {
    console.error('Turnstile 验证网络错误:', error);
    return { success: false, 'error-codes': ['network-error'] };
  }
};
