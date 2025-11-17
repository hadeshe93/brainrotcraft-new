import { ReactNode } from "react";

export interface ShowProps {
  when: boolean;
  fallback?: ReactNode;
  children: ReactNode;
}

export default function Show({ when, fallback, children }: ShowProps) {
  if (when) {
    return children;
  }
  return fallback;
}
