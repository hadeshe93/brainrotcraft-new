import localforage from 'localforage';
import { DOMAIN } from '@/constants/config';
import { ThemeTypes } from '@/constants/theme';
import { DEFAULT_THEME } from '@/constants/theme';

export const store = localforage.createInstance({
  name: DOMAIN,
});

// ================================
// Theme
// ================================
export const saveTheme = async (theme: string) => {
  await store.setItem('theme', theme);
};

export const getTheme = async () => {
  let theme = await store.getItem<string>('theme');
  if (!theme && !DEFAULT_THEME) {
    const preferDark = !!window.matchMedia('(prefers-color-scheme: dark)').matches;
    theme = preferDark ? ThemeTypes.Dark : ThemeTypes.Light;
  }
  return theme ? theme : DEFAULT_THEME;
};

// ================================
// Survey
// ================================
export const saveSurveyRecorder = async () => {
  await store.setItem('surveyRecorder', 'done');
};

export const getSurveyRecorder = async () => {
  return await store.getItem<string>('surveyRecorder');
};

// ================================
// Anonymous User ID
// ================================
export const saveAnonymousUserId = async (userId: string) => {
  await store.setItem('anonymousUserId', userId);
};

export const getAnonymousUserId = async () => {
  return await store.getItem<string>('anonymousUserId');
};

// ================================
// User Sign In Convertion
// ================================
export const saveUserSignInConvertion = async (anonymousUserId: string) => {
  await store.setItem('userSignInConvertion', anonymousUserId);
};
export const getUserSignInConvertion = async () => {
  return await store.getItem<string>('userSignInConvertion');
};
export const clearUserSignInConvertion = async () => {
  await store.removeItem('userSignInConvertion');
};