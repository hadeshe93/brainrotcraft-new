import { FormField as FormFieldType } from '@/types/blocks/form';
import { I18nTranslator } from '@/types/i18n';

interface GetFeedbackFormFieldsProps {
  translations: {
    name: string;
    email: string;
    message: string;
    securityCheck: string;
    submit: string;
    errorRequiredName: string;
    errorRequiredEmail: string;
    errorRequiredMessage: string;
    errorRequiredCfTurnstileToken: string;
    successfulSubmit: string;
    failedSubmit: string;
  },
}
export function getFeedbackFormFields({ translations }: GetFeedbackFormFieldsProps): FormFieldType[] {
  return [{
    name: 'name',
    title: translations.name,
    type: 'text',
    placeholder: translations.name,
    validation: {
      required: true,
      message: translations.errorRequiredName,
    },
  }, {
    name: 'email',
    title: translations.email,
    type: 'email',
    placeholder: translations.email,
    validation: {
      required: true,
      message: translations.errorRequiredEmail,
    },
  }, {
    name: 'message',
    title: translations.message,
    type: 'textarea',
    placeholder: translations.message,
    validation: {
      required: true,
      message: translations.errorRequiredMessage,
    },
  }, {
    name: 'cfTurnstileToken',
    title: translations.securityCheck,
    type: 'cf_turnstile',
    validation: {
      required: true,
      message: translations.errorRequiredCfTurnstileToken,
    },
  }];
}

interface GetTextFromTranslatorProps {
  translatorMap: Record<string, I18nTranslator<'feedback'>>;
}
export function getTextFromTranslator(props: GetTextFromTranslatorProps) {
  const { translatorMap } = props;
  const { tFeedback } = translatorMap;
  return {
    name: tFeedback('name'),
    email: tFeedback('email'),
    message: tFeedback('message'),
    securityCheck: tFeedback('securityCheck'),
    submit: tFeedback('submit'),
    errorRequiredName: tFeedback('errorRequiredName'),
    errorRequiredEmail: tFeedback('errorRequiredEmail'),
    errorRequiredMessage: tFeedback('errorRequiredMessage'),
    errorRequiredCfTurnstileToken: tFeedback('errorRequiredCfTurnstileToken'),
    successfulSubmit: tFeedback('successfulSubmit'),
    failedSubmit: tFeedback('failedSubmit'),
  };
}