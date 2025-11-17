import type { BaseBlockSection } from './base';

export interface Feedback extends BaseBlockSection {
  submitted: {
    title: string;
    description: string;
    backToHome: string;
  };
};

export interface FeedbackPayload {
  name: string;
  email: string;
  message: string;
  cfTurnstileToken: string;
}

export interface FeedbackRecord {
  id: string;
  uuid: string;
  biz: string;
  country: string;
  content: string;
}