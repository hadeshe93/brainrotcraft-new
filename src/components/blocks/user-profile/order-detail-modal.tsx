'use client';

import { useTranslations, useFormatter } from 'next-intl';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import Icon from '@/components/icon';
import { formatAmount } from '@/lib/utils';
import type { UserOrder } from '@/types/user';
import RedirectPaymentPortalButton from '@/components/redirect-payment-portal-button';
import { EUserOrderStatus } from '@/types/user';

interface OrderDetailModalProps {
  order: UserOrder;
  isOpen: boolean;
  onClose: () => void;
}

export default function OrderDetailModal({ order, isOpen, onClose }: OrderDetailModalProps) {
  const t = useTranslations('user_profile');
  const format = useFormatter();

  // 格式化日期显示
  const formatDate = (dateString: string) => {
    return format.dateTime(new Date(dateString), {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 获取订单状态的图标和颜色
  const getOrderStatusConfig = (status: UserOrder['orderStatus']) => {
    switch (status) {
      case EUserOrderStatus.Paid:
        return {
          icon: 'MdiCheckCircle',
          className: 'text-green-500 bg-green-50 border-green-200',
          textColor: 'text-green-800',
          bgColor: 'bg-green-100 border-green-300',
          text: t('order_status_paid'),
        };
      case EUserOrderStatus.Pending:
        return {
          icon: 'MdiClockOutline',
          className: 'text-yellow-500 bg-yellow-50 border-yellow-200',
          textColor: 'text-yellow-800',
          bgColor: 'bg-yellow-100 border-yellow-300',
          text: t('order_status_pending'),
        };
      case EUserOrderStatus.Failed:
        return {
          icon: 'MdiCloseCircle',
          className: 'text-red-500 bg-red-50 border-red-200',
          textColor: 'text-red-800',
          bgColor: 'bg-red-100 border-red-300',
          text: t('order_status_failed'),
        };
      case EUserOrderStatus.Refunded:
        return {
          icon: 'MdiUndo',
          className: 'text-blue-500 bg-blue-50 border-blue-200',
          textColor: 'text-blue-800',
          bgColor: 'bg-blue-100 border-blue-300',
          text: t('order_status_refunded'),
        };
      case EUserOrderStatus.Cancelled:
        return {
          icon: 'MdiCancel',
          className: 'text-gray-500 bg-gray-50 border-gray-200',
          textColor: 'text-gray-800',
          bgColor: 'bg-gray-100 border-gray-300',
          text: t('order_status_cancelled'),
        };
      default:
        return {
          icon: 'MdiHelpCircle',
          className: 'text-gray-500 bg-gray-50 border-gray-200',
          textColor: 'text-gray-800',
          bgColor: 'bg-gray-100 border-gray-300',
          text: status,
        };
    }
  };

  const statusConfig = getOrderStatusConfig(order.orderStatus);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader className="mb-4">
          <DialogTitle>{t('order_details')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 订单状态头部 */}
          <div className={`flex items-center justify-between rounded-lg border p-4 ${statusConfig.bgColor}`}>
            <div className="flex items-center gap-3">
              <Icon config={{ name: statusConfig.icon }} className={`h-6 w-6 ${statusConfig.textColor}`} />
              <div>
                <p className={`font-medium ${statusConfig.textColor}`}>
                  {t('order_number')} #{order.orderNumber}
                </p>
                <p className={`text-sm ${statusConfig.textColor}`}>
                  {t('status')}: {statusConfig.text}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className={`text-lg font-bold ${statusConfig.textColor}`}>
                {formatAmount(order.orderAmount, order.orderCurrency)}
              </p>
              <p className="text-muted-foreground text-sm">{formatDate(order.createdAt)}</p>
            </div>
          </div>

          {/* 具体详情 */}
          <div className="flex flex-col gap-6">
            {/* 左侧：订单基本信息 */}
            <div className="space-y-4">
              {/* 产品信息 */}
              <div className="bg-muted/30 rounded-lg p-4">
                <h3 className="mb-3 flex items-center gap-2 font-semibold">
                  <Icon config={{ name: 'MdiPackageVariant' }} className="h-4 w-4" />
                  {t('product_details')}
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex gap-4">
                    <span className="text-muted-foreground min-w-[80px] shrink-0">{t('product')}:</span>
                    <span className="flex-1 text-right font-medium">{order.productName}</span>
                  </div>
                  <div className="flex gap-4">
                    <span className="text-muted-foreground min-w-[80px] shrink-0">{t('price')}:</span>
                    <span className="flex-1 text-right font-medium">
                      {formatAmount(order.productPriceSnapshot, order.orderCurrency)}
                    </span>
                  </div>
                  {order.creditsAmountSnapshot > 0 && (
                    <div className="flex gap-4">
                      <span className="text-muted-foreground min-w-[80px] shrink-0">{t('credits')}:</span>
                      <span className="flex flex-1 items-center justify-end gap-1 text-right font-medium">
                        <Icon config={{ name: 'EpCoin' }} className="h-3 w-3" />
                        {order.creditsAmountSnapshot}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* 付款信息 */}
              <div className="bg-muted/30 rounded-lg p-4">
                <h3 className="mb-3 flex items-center gap-2 font-semibold">
                  <Icon config={{ name: 'MdiCreditCard' }} className="h-4 w-4" />
                  {t('payment_information')}
                </h3>
                <div className="space-y-2 text-sm">
                  {order.paymentMethod && (
                    <div className="flex gap-4">
                      <span className="text-muted-foreground min-w-[100px] shrink-0">{t('payment_method')}:</span>
                      <span className="flex-1 text-right font-medium capitalize">{order.paymentMethod}</span>
                    </div>
                  )}
                  {order.paymentTime && (
                    <div className="flex gap-4">
                      <span className="text-muted-foreground min-w-[100px] shrink-0">{t('payment_time')}:</span>
                      <span className="flex-1 text-right font-medium">{formatDate(order.paymentTime)}</span>
                    </div>
                  )}
                  {order.paymentPlatformOrderId && (
                    <div className="flex gap-4">
                      <span className="text-muted-foreground shrink-0">{t('transaction_id')}:</span>
                      <span className="bg-muted/50 rounded p-2 font-mono text-xs break-all">
                        {order.paymentPlatformOrderId}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* 订阅信息（如果是订阅产品）*/}
              {order.subscriptionId && (
                <div className="bg-muted/30 rounded-lg p-4">
                  <h3 className="mb-3 flex items-center gap-2 font-semibold">
                    <Icon config={{ name: 'MdiCalendarCheck' }} className="h-4 w-4" />
                    {t('subscription_details')}
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex gap-4">
                      <span className="text-muted-foreground min-w-[100px] shrink-0">{t('cycle')}:</span>
                      <span className="flex-1 text-right font-medium capitalize">{order.subscriptionCycle}</span>
                    </div>
                    {order.subscriptionStartTime && (
                      <div className="flex gap-4">
                        <span className="text-muted-foreground min-w-[100px] shrink-0">{t('start_time')}:</span>
                        <span className="flex-1 text-right font-medium">{formatDate(order.subscriptionStartTime)}</span>
                      </div>
                    )}
                    {order.subscriptionEndTime && (
                      <div className="flex gap-4">
                        <span className="text-muted-foreground min-w-[100px] shrink-0">{t('end_time')}:</span>
                        <span className="flex-1 text-right font-medium">{formatDate(order.subscriptionEndTime)}</span>
                      </div>
                    )}
                    <div className="mt-2 flex gap-4 border-t pt-2">
                      <span className="min-w-[120px] shrink-0 font-medium"></span>
                      <span className="flex-1 text-right font-bold">
                        <RedirectPaymentPortalButton
                          buttonProps={{ variant: 'outline', size: 'sm' }}
                          subscriptionId={order.subscriptionId}
                          customerId={order.customerId}
                          sessionId={order.paymentPlatformOrderId}
                        >
                          Manage Subscription
                        </RedirectPaymentPortalButton>
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 右侧：订单时间线和其他信息 */}
            <div className="space-y-4">
              {/* 订单时间线 */}
              <div className="bg-muted/30 rounded-lg p-4">
                <h3 className="mb-3 flex items-center gap-2 font-semibold">
                  <Icon config={{ name: 'MdiTimeline' }} className="h-4 w-4" />
                  {t('order_timeline')}
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Icon config={{ name: 'MdiPlus' }} className="mt-0.5 h-4 w-4 text-blue-500" />
                    <div className="text-sm">
                      <p className="font-medium">{t('order_created')}</p>
                      <p className="text-muted-foreground">{formatDate(order.createdAt)}</p>
                    </div>
                  </div>

                  {order.paymentTime && (
                    <div className="flex items-start gap-3">
                      <Icon config={{ name: 'MdiCheckCircle' }} className="mt-0.5 h-4 w-4 text-green-500" />
                      <div className="text-sm">
                        <p className="font-medium">{t('payment_completed')}</p>
                        <p className="text-muted-foreground">{formatDate(order.paymentTime)}</p>
                      </div>
                    </div>
                  )}

                  {order.refundTime && (
                    <div className="flex items-start gap-3">
                      <Icon config={{ name: 'MdiUndo' }} className="mt-0.5 h-4 w-4 text-blue-500" />
                      <div className="text-sm">
                        <p className="font-medium">{t('refund_processed')}</p>
                        <p className="text-muted-foreground">{formatDate(order.refundTime)}</p>
                        {order.refundAmount > 0 && (
                          <p className="text-muted-foreground">
                            {t('amount')}: {formatAmount(order.refundAmount, order.orderCurrency)}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    <Icon config={{ name: 'MdiUpdate' }} className="mt-0.5 h-4 w-4 text-gray-500" />
                    <div className="text-sm">
                      <p className="font-medium">{t('last_updated')}</p>
                      <p className="text-muted-foreground">{formatDate(order.updatedAt)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 备注信息 */}
              {false && order.remarks && (
                <div className="bg-muted/30 rounded-lg p-4">
                  <h3 className="mb-3 flex items-center gap-2 font-semibold">
                    <Icon config={{ name: 'MdiNoteText' }} className="h-4 w-4" />
                    {t('notes')}
                  </h3>
                  <p className="text-muted-foreground text-sm">{order.remarks}</p>
                </div>
              )}

              {/* 订单摘要 */}
              <div className="bg-muted/30 rounded-lg p-4">
                <h3 className="mb-3 flex items-center gap-2 font-semibold">
                  <Icon config={{ name: 'MdiReceiptText' }} className="h-4 w-4" />
                  {t('order_summary')}
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">{t('order_id')}:</span>
                    <span className="bg-muted/50 rounded p-2 font-mono text-xs break-all">{order.uuid}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">{t('product_id')}:</span>
                    <span className="bg-muted/50 rounded p-2 font-mono text-xs break-all">{order.productUuid}</span>
                  </div>
                  <div className="mt-2 flex gap-4 border-t pt-2">
                    <span className="min-w-[120px] shrink-0 font-medium">{t('total_amount')}:</span>
                    <span className="flex-1 text-right font-bold">
                      {formatAmount(order.orderAmount, order.orderCurrency)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 底部操作按钮 */}
          <div className="flex justify-end border-t pt-4">
            <Button onClick={onClose} variant="outline" className="px-6">
              {t('close_modal')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
