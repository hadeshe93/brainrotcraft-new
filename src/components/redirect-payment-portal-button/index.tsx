'use client';

import { ReactNode, useState, useEffect } from 'react';
import { type PortalSessionRequest } from '@/types/services/payment';
import { Button, ButtonProps } from '../ui/button';
import Icon from '../icon';

export type RedirectPaymentPortalButtonProps = PortalSessionRequest & {
  buttonProps?: ButtonProps;
  children?: ReactNode;
};

export default function RedirectPaymentPortalButton(props: RedirectPaymentPortalButtonProps) {
  const { sessionId = '', customerId = '', subscriptionId = '', buttonProps = {}, children = null } = props;
  const [isLoading, setIsLoading] = useState(false);
  const [disabledForm, setDisabledForm] = useState(false);
  const onLoading = async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
    setDisabledForm(true);
  };
  useEffect(() => {
    if (isLoading) {
      onLoading();
    }
  }, [isLoading]);
  return (
    <form action={`/api/payment/portal`} method="post">
      <input type="hidden" name="customerId" value={`${customerId || ''}`} />
      <input type="hidden" name="subscriptionId" value={`${subscriptionId || ''}`} />
      <input type="hidden" name="sessionId" value={`${sessionId || ''}`} />
      <div className="inline-block" onClick={() => setIsLoading(true)}>
        <Button type="submit" disabled={disabledForm} {...buttonProps}>
          {isLoading ? <Icon config={{ name: 'MdiLoading' }} className="mr-2 size-4 animate-spin" /> : null} {children}
        </Button>
      </div>
    </form>
  );
}
