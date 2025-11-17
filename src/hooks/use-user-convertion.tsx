import { useState, useEffect, useRef } from 'react';
import { useAppContext } from '@/contexts/app';
import { useTranslations } from 'next-intl';
import { useDialog } from './use-dialog';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { saveUserSignInConvertion, getUserSignInConvertion, clearUserSignInConvertion } from '@/lib/storage';
import { getAnonymousUserId } from '@/lib/fingerprint';
import TurnstileModal, { type TurnstileModalRef } from '@/components/cf-tunrstile-modal';
import { CF_TURNSTILE_SITEKEY } from '@/constants/config';

export enum EUserConvertionScene {
  SingleUpload = 'single_upload',
  BatchUpload = 'batch_upload',
}

export enum EUserConvertionType {
  RunOutFreeQuota = 'run_out_free_quota',
  RunOutCredits = 'run_out_credits',
  ExceedMaxBulkUploadCount = 'exceed_max_bulk_upload_count',
}

interface ConvertUserOptions {
  scene: EUserConvertionScene;
  convertionType?: EUserConvertionType;
  carryOn?: (token: string) => void;
}
export function useUserConvertion() {
  const tCommon = useTranslations('common');
  const tUserConvertion = useTranslations('user_convertion');
  const tSignModal = useTranslations('sign_modal');
  const tForm = useTranslations('form');
  const turnstileModalRef = useRef<TurnstileModalRef>(null);
  const { show: showDialog, hide: hideDialog } = useDialog();
  const { setShowSignModal, setSignModalConfig, user } = useAppContext();
  const hideDialogRef = useRef(hideDialog);
  const textMap = {
    [EUserConvertionType.RunOutFreeQuota]: {
      anonymous: {
        description: tUserConvertion('free_quota_used_up'),
        description_2: tUserConvertion('sign_in_to_get_more_quota'),
      },
      signedIn: {
        description: tUserConvertion('free_quota_used_up'),
        description_2: tUserConvertion('buy_credits_to_get_more_usage'),
      },
    },
    [EUserConvertionType.RunOutCredits]: {
      description: tUserConvertion('run_out_credits'),
      description_2: tUserConvertion('buy_credits_to_get_more_usage'),
    },
    [EUserConvertionType.ExceedMaxBulkUploadCount]: {
      description: tUserConvertion('exceed_max_bulk_upload_count'),
      description_2: tUserConvertion('buy_credits_to_upgrade_max_bulk_upload_count'),
    },
  };
  const onClickNoThanks = async (carryOn: ConvertUserOptions['carryOn']) => {
    const result = await turnstileModalRef?.current?.render({
      title: tForm('security_check_title'),
      description: tForm('explanation_for_security_check'),
      sitekey: CF_TURNSTILE_SITEKEY,
    });
    const { success, data } = result || {};
    if (success && data?.token) {
      carryOn?.(data.token);
      setTimeout(() => {
        hideDialogRef.current?.();
      }, 300);
    }
  };

  // 尝试弹窗转化用户
  const convertUser = async (options: ConvertUserOptions) => {
    const isSignedInUser = !!user?.uuid;
    const { convertionType = EUserConvertionType.RunOutFreeQuota } = options;
    let messageMap = {
      description: '',
      description_2: '',
    };
    if (convertionType === EUserConvertionType.RunOutFreeQuota) {
      messageMap = textMap[EUserConvertionType.RunOutFreeQuota][isSignedInUser ? 'signedIn' : 'anonymous'];
    } else if (convertionType === EUserConvertionType.RunOutCredits) {
      messageMap = textMap[EUserConvertionType.RunOutCredits];
    } else if (convertionType === EUserConvertionType.ExceedMaxBulkUploadCount) {
      messageMap = textMap[EUserConvertionType.ExceedMaxBulkUploadCount];
    }

    // 匿名用户
    if (!isSignedInUser && convertionType === EUserConvertionType.RunOutFreeQuota) {
      const anonymousUserId = await getAnonymousUserId();
      if (anonymousUserId) {
        saveUserSignInConvertion(anonymousUserId);
      }

      // 展示登录弹窗
      setSignModalConfig({
        title: tCommon('note'),
        description: (
          <div>
            <p>{messageMap.description}</p>
            <p className="text-primary font-bold">{messageMap.description_2}</p>
          </div>
        ),
      });
      setShowSignModal(true);
    } else {
      showDialog({
        title: tCommon('note'),
        description: (
          <div>
            <p>{messageMap.description}</p>
            <p className="text-primary font-bold">{messageMap.description_2}</p>
          </div>
        ),
        content: (
          <div className="flex flex-col gap-2">
            {/* 跳转去价格页面 */}
            <Link href="/pricing" onClick={hideDialog}>
              <Button className="w-full" variant="default">
                {tForm('unlock_usage_frequency_restrictions')}
              </Button>
            </Link>
            {/* 继续进行安全检查 */}
            {options.scene === EUserConvertionScene.SingleUpload && (
              <div className="space-y-1">
                <Button className="block w-full" variant="outline" onClick={() => onClickNoThanks(options.carryOn)}>
                  {tForm('no_thanks')}
                </Button>
                <p className="text-muted-foreground text-xs">{tForm('explanation_for_security_check')}</p>
                <TurnstileModal ref={turnstileModalRef} />
              </div>
            )}
          </div>
        ),
      });
    }
  };

  const init = async () => {
    const isSignedInUser = !!user?.uuid;
    const userSignInConvertion = await getUserSignInConvertion();
    if (isSignedInUser && userSignInConvertion) {
      showDialog({
        title: tCommon('congratulations'),
        description: (
          <div>
            <p>{tSignModal('sign_in_success_and_more_quota')}</p>
          </div>
        ),
        content: (
          <Button className="w-full" variant="outline" onClick={hideDialog}>
            {tCommon('close')}
          </Button>
        ),
      });
      clearUserSignInConvertion();
    }
  };

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    hideDialogRef.current = hideDialog;
  }, [hideDialog]);

  return {
    convertUser,
  };
}
