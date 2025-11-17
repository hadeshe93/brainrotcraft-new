import { EAppEnv } from "@/types/base/env";

export const getAppEnv = () => {
  if (process.env.NEXT_PUBLIC_RUNTIME_ENV === 'development') {
    return EAppEnv.development;
  }
  return EAppEnv.production;
};

export const checkIsDevEnv = () => getAppEnv() === EAppEnv.development;
export const checkIsProdEnv = () => getAppEnv() === EAppEnv.production;