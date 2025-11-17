'use client';
import { useState } from 'react';
import MdiCheckCircleOutline from '~icons/mdi/check-circle-outline';
import Form, { type FormProps } from '@/components/blocks/form';
import { submitFeedback } from '@/services-client/feedback';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import Show from '@/components/show';
import { getFeedbackFormFields, getTextFromTranslator } from './configs';
import { useTranslations } from 'next-intl';
import { Feedback as FeedbackType } from '@/types/blocks/feedback';
import { cn } from '@/lib/utils';
import { useRouter } from '@/i18n/navigation';

interface FeedbackProps {
  config: FeedbackType;
  className?: string;
}
export default function Feedback({ config, className }: FeedbackProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const tFeedback = useTranslations('feedback');
  const tCommon = useTranslations('common');
  const formFields = getFeedbackFormFields({ translations: getTextFromTranslator({ translatorMap: { tFeedback } }) });
  const onSubmit = async (formData: FormData, passby?: any) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const result = await submitFeedback(formData);
      if (!result.success) {
        const error = new Error('API Failed Error');
        // @ts-ignore
        error.apiResponse = result;
        throw error;
      }
      // 成功
      toast.success(tFeedback('successfulSubmit'));
      setIsSubmitted(true);
    } catch (error: any) {
      // 失败
      console.error(error);
      const message = error.apiResponse?.message || tFeedback('failedSubmit');
      toast.error(message);
      setIsSubmitted(false);
    } finally {
      setIsSubmitting(false);
    }
  };
  const onClickBackToHome = () => {
    setIsSubmitted(false);
    router.push('/');
  };
  const submit: FormProps['submit'] = {
    button: {
      title: isSubmitting ? tCommon('submitting') : tCommon('submit'),
      variant: 'default',
    },
    handler: onSubmit,
  };
  return (
    <section className={cn('section-container max-w-4xl mx-auto', className)}>
      <Show
        when={!isSubmitted}
        fallback={<div className="py-10 flex flex-col items-center">
          <MdiCheckCircleOutline className="w-24 h-24 text-primary" />
          <h4 className="mt-4 text-xl">{config.submitted.title}</h4>
          <p className="mt-2 text-neutral-content">{config.submitted.description}</p>
          <Button className="mt-10 btn-primary btn-outline btn-sm px-8" onClick={onClickBackToHome}>
            {config.submitted.backToHome}
          </Button>
        </div>}
      >
        <Form fields={formFields} submit={submit} />
      </Show>
    </section>
  );
}
