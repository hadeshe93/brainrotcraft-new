interface LoadScriptProps {
  src: string;
  async?: boolean;
  defer?: boolean;
  crossOrigin?: string;
}

export const loadScript = ({ src, async = true, defer = true, crossOrigin = 'anonymous' }: LoadScriptProps) => {
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    if (async) {
      script.async = async;
    }
    if (defer) {
      script.defer = defer;
    }
    if (crossOrigin) {
      script.crossOrigin = crossOrigin;
    }
    script.onload = () => resolve(void 0);
    script.onerror = () => {
      document.head.removeChild(script);
      reject(new Error('Failed to load script'));
    };
    document.head.appendChild(script);
  });
};
