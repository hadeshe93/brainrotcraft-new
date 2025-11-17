'use client';

import { ReactNode, createContext, useContext, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

import { AppContextValue, SignModalConfig } from '@/types/context';
import { User } from '@/types/user';
import useOneTapLogin from '@/hooks/use-one-tap-login';
import { useSession } from 'next-auth/react';
import { AUTH_GOOGLE_ID, AUTH_GOOGLE_ONE_TAP_ENABLED } from '@/constants/config';
import { DEFAULT_THEME } from '@/constants/theme';
import { toggleClassName } from "@/lib/dom";
import { saveTheme, getTheme } from "@/lib/storage";
import { ThemeTypes } from '@/types/theme';
import SignModal from '@/components/sign/modal';
import { useRedirectSearchParams } from '@/hooks/use-redirect-search-params';

const AppContext = createContext<AppContextValue>({
  theme: DEFAULT_THEME,
  setTheme: () => {},
  toggleTheme: () => {},
  showSignModal: false,
  setShowSignModal: () => {},
  signModalConfig: {
    title: '',
    description: '',
  },
  setSignModalConfig: () => {},
  user: null,
  setUser: () => {},
});

export const useAppContext = () => useContext(AppContext);

export const AppContextProvider = ({ children }: { children: ReactNode }) => {
  if (AUTH_GOOGLE_ONE_TAP_ENABLED && AUTH_GOOGLE_ID) {
    useOneTapLogin();
  }
  const tSignModal = useTranslations('sign_modal');

  // 登录会话
  const { data: session } = useSession();
  // 用户信息
  const [user, setUser] = useState<User | null>(null);
  // 主题
  const [theme, setTheme] = useState<ThemeTypes>(DEFAULT_THEME);
  // 登录模态框
  const [showSignModal, setShowSignModalRaw] = useState<boolean>(false);
  // 登录模态框配置
  const [signModalConfig, setSignModalConfigRaw] = useState<SignModalConfig>({
    title: tSignModal('sign_in_title'),
    description: tSignModal('sign_in_description'),
  });

  const setShowSignModal = (show: boolean) => {
    setShowSignModalRaw(show);
    if (!show) {
      setSignModalConfig({
        title: tSignModal('sign_in_title'),
        description: tSignModal('sign_in_description'),
      });
    }
  }

  const setSignModalConfig = (config: Partial<SignModalConfig>) => {
    setSignModalConfigRaw({
      ...signModalConfig,
      ...config,
    });
  }

  // [工具函数] 切换主题
  const toggleTheme = () => {
    setTheme(theme === ThemeTypes.Light ? ThemeTypes.Dark : ThemeTypes.Light);
  }
  // [工具函数]初始化主题
  const initTheme = async () => {
    const theme = await getTheme();
    if (theme) {
      setTheme(theme as ThemeTypes);
    }
  }
  
  // [回调] 会话变更
  useEffect(() => {
    if (session && session.user) {
      // @ts-ignore
      setUser(session.user);
    }
  }, [session]);

  // [回调] 主题变更
  useEffect(() => {
    const htmlElement = document.documentElement;
    // 数据属性
    htmlElement.setAttribute('data-theme', theme);
    // 样式属性
    toggleClassName({
      dom: htmlElement,
      className: 'dark',
      force: theme === ThemeTypes.Dark,
    });
    saveTheme(theme);
  }, [theme]);

  // [挂载回调] 主题初始化
  useEffect(() => {
    initTheme();
  }, []);

  useRedirectSearchParams();

  return (
    <AppContext.Provider
      value={{
        // 主题
        theme,
        setTheme,
        toggleTheme,
        // 登录模态框
        showSignModal,
        setShowSignModal,
        signModalConfig,
        setSignModalConfig,
        // 用户信息
        user,
        setUser,
      }}
    >
      {children}
      <SignModal />
    </AppContext.Provider>
  );
};
