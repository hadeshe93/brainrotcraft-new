interface Window {
  turnstile: {
    render: (element: HTMLElement, options: { sitekey: string, callback: (token: string) => void, ['error-callback']: (error: string) => void, size?: 'normal' | 'flexible' | 'compact', theme?: 'auto' | 'light' | 'dark' }) => string;
    remove: (id: string) => void;
  };
  __twttr: any;
  onloadTurnstileCallback: () => void;
  gtag?: (reportType: string, ...reportParams: any[]) => void;
}

