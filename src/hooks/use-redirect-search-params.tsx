import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAppContext } from '@/contexts/app';
import { ECommonErrorCode, EPaymentErrorCode, EThrottleErrorCode } from '@/types/services/errors';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { useDialog } from './use-dialog';
import { Button } from '@/components/ui/button';

export function useRedirectSearchParams() {
  const [searchParams, setSearchParams] = useState<Record<string, string>>({});
  const { setShowSignModal, setSignModalConfig, user } = useAppContext();
  const { show: showDialog, hide: hideDialog } = useDialog();
  const tError = useTranslations('error');
  const tSubscription = useTranslations('subscription');
  const tCommon = useTranslations('common');
  useEffect(() => {
    const { searchParams } = new URL(window.location.href);
    setSearchParams(Object.fromEntries(searchParams.entries()));
  }, []);
  // 检测URL查询参数，处理服务端重定向返回的状态
  useEffect(() => {
    const needLogin = searchParams['needLogin'];
    const errorCode = searchParams['errorCode'];

    if (needLogin === '1') {
      setShowSignModal(true);
      // 清除URL参数，避免重复触发
      const url = new URL(window.location.href);
      url.searchParams.delete('needLogin');
      window.history.replaceState({}, '', url.toString());
    }

    if (errorCode) {
      // 根据错误码显示相应的错误信息
      const errorMessage = tError(errorCode) || tError(`${ECommonErrorCode.UNKNOWN_ERROR}`);
      const replicatedSubscriptionErrorCodes = [EPaymentErrorCode.TRY_SUBSCRIBE_SAME_PLAN, EPaymentErrorCode.TRY_SUBSCRIBE_MULTIPLE_PLANS].map(code => code.toString());
      // @ts-ignore
      if (replicatedSubscriptionErrorCodes.includes(errorCode)) {
        showDialog({
          title: tError(`${errorCode}`),
          description: tSubscription((errorCode as unknown as EPaymentErrorCode) === EPaymentErrorCode.TRY_SUBSCRIBE_SAME_PLAN ? 'already_subscribed_the_plan' : 'already_subscribed_other_plan'),
          content: (
            <Button variant="outline" onClick={hideDialog}>
              {tCommon('close')}
            </Button>
          ),
        });
      } else {
        toast.error(errorMessage);
      }
      // 清除URL参数
      const url = new URL(window.location.href);
      url.searchParams.delete('errorCode');
      window.history.replaceState({}, '', url.toString());
    }
  }, [searchParams, setShowSignModal]);

  return searchParams;
}