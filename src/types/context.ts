import { ThemeTypes } from "./theme";
import { User } from "./user";
import { ReactNode } from "react";

export interface SignModalConfig {
  title: string;
  description: ReactNode;
}

export interface AppContextValue {
  theme: ThemeTypes;
  setTheme: (theme: ThemeTypes) => void;
  toggleTheme: () => void;
  showSignModal: boolean;
  setShowSignModal: (show: boolean) => void;
  signModalConfig: SignModalConfig;
  setSignModalConfig: (config: SignModalConfig) => void;
  user: User | null;
  setUser: (user: User | null) => void;
}