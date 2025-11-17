'use client';

import { Loader } from 'lucide-react';
import LucideX from '~icons/lucide/x';
import LucideCheck from '~icons/lucide/check';
import { PricingItem, Pricing as PricingType } from '@/types/blocks/pricing';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAppContext } from '@/contexts/app';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Icon from '@/components/icon';
import { Label } from '@/components/ui/label';
import { useRouter } from '@/i18n/navigation';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { gaReportEvent, GA_EVENT_MAP } from '@/lib/ga/report';

interface PricingProps {
  config: PricingType;
  className?: string;
}

interface HandleCheckoutParams {
  item: PricingItem;
  price_id?: string;
  cn_pay?: boolean;
}

export default function Pricing({ config: pricing, className }: PricingProps) {
  if (pricing.disabled) {
    return null;
  }

  const { user, setShowSignModal } = useAppContext();
  const router = useRouter();
  const [group, setGroup] = useState(pricing.groups?.[0]?.name ?? pricing.items?.[0]?.group);
  const [isLoading, setIsLoading] = useState(false);
  const [productId, setProductId] = useState<string | null>(null);
  const isSignedIn = !!user?.uuid;

  const handleCheckout = (params: HandleCheckoutParams) => {
    const { item, price_id, cn_pay } = params;
    if (isLoading) {
      return;
    }

    try {
      // 提前进行上报
      gaReportEvent(GA_EVENT_MAP.ACTION_CLICK_PRICING_ITEM, {
        // event_category: 'pricing',
        // event_label: item.title,
        // value: item.amount,
        product_id: item.product_id,
        price_id: price_id,
        cn_pay: cn_pay,
        is_signed_in_user: isSignedIn,
      });
    } catch (err) {
      console.error('[gaReportEvent] error:', err);
    }

    if (item.product_id === '') {
      router.push(item.button?.url || '/');
      return;
    }

    if (!isSignedIn) {
      setShowSignModal(true);
      return;
    }

    setIsLoading(true);
    setProductId(item.product_id);

    // 创建表单并提交到服务端
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '/api/payment/checkout';

    // 只添加 product_id 字段，让服务端处理映射
    const productIdInput = document.createElement('input');
    productIdInput.type = 'hidden';
    productIdInput.name = 'product_id';
    productIdInput.value = item.product_id;
    form.appendChild(productIdInput);
    if (price_id) {
      const priceIdInput = document.createElement('input');
      priceIdInput.type = 'hidden';
      priceIdInput.name = 'price_id';
      priceIdInput.value = price_id;
      form.appendChild(priceIdInput);
    }

    // 如果是人民币支付，添加标识
    if (cn_pay) {
      const cnPayInput = document.createElement('input');
      cnPayInput.type = 'hidden';
      cnPayInput.name = 'cn_pay';
      cnPayInput.value = 'true';
      form.appendChild(cnPayInput);
    }

    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
  };

  useEffect(() => {
    if (pricing.items) {
      setGroup(pricing.items[0].group);
      setProductId(pricing.items[0].product_id);
      setIsLoading(false);
    }
  }, [pricing.items]);

  return (
    <section id={pricing.id || pricing.name} className={cn('py-16', className)}>
      <div className="container">
        <div className="mx-auto mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">{pricing.title}</h2>
          <p className="text-muted-foreground lg:text-lg">{pricing.description}</p>
        </div>
        <div className="flex flex-col items-center gap-2">
          {pricing.groups && pricing.groups.length > 0 && (
            <div className="bg-muted mb-12 flex items-center rounded-lg p-2 md:inline-flex">
              <RadioGroup
                value={group}
                className="flex h-full flex-col md:flex-row"
                onValueChange={(value) => {
                  setGroup(value);
                }}
              >
                {pricing.groups.map((item, i) => {
                  return (
                    <div key={i} className="group relative h-full">
                      <RadioGroupItem value={item.name || ''} id={item.name} className="peer sr-only" />
                      <Label
                        htmlFor={item.name}
                        className={`text-muted-foreground hover:text-foreground hover:bg-accent flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${group === item.name ? 'bg-primary text-primary-foreground font-semibold shadow-sm' : ''} `}
                      >
                        {item.title}
                        {item.label && (
                          <Badge
                            className={`border-0 px-2 py-0.5 text-xs font-medium transition-colors ${
                              group === item.name
                                ? 'bg-background text-primary font-semibold shadow-sm'
                                : 'bg-primary text-primary-foreground'
                            } `}
                          >
                            {item.label}
                          </Badge>
                        )}
                      </Label>
                    </div>
                  );
                })}
              </RadioGroup>
            </div>
          )}
          <div
            className={`mt-0 grid gap-6 md:min-w-96 md:grid-cols-${
              pricing.items?.filter((item) => !item.group || item.group === group)?.length
            }`}
          >
            {pricing.items?.map((item, index) => {
              if (item.group && item.group !== group) {
                return null;
              }
              return (
                <PriceItem
                  key={index}
                  item={item}
                  isLoading={isLoading}
                  productId={productId}
                  handleCheckout={handleCheckout}
                />
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

interface PriceItemProps {
  item: PricingItem;
  isLoading: boolean;
  productId: string | null;
  handleCheckout: (params: HandleCheckoutParams) => void;
}
function PriceItem({ item, isLoading, productId, handleCheckout }: PriceItemProps) {
  const t = useTranslations('pricing');
  const price = item.price;
  const isPriceList = Array.isArray(price);
  const [sliderValue, setSliderValue] = useState(0);
  const priceString = typeof price === 'string' ? price : price?.[sliderValue]?.price;
  const selectedCredits = (price as any[])[sliderValue]?.credits;
  const selectedAmount = (price as any[])[sliderValue]?.amount;
  const priceId = (price as any[])[sliderValue]?.id;
  const onSliderValueChanged = (value: number[]) => {
    const index = value[0];
    setSliderValue(index);
  };

  return (
    <div
      className={`rounded-lg p-6 ${
        item.is_featured ? 'border-primary bg-card text-card-foreground border-2' : 'border-muted border'
      }`}
    >
      <div className="flex h-full flex-col justify-between gap-5">
        <div>
          <div className="mb-4 flex items-center gap-2">
            {item.title && <h3 className="text-xl font-semibold md:text-2xl">{item.title}</h3>}
            <div className="flex-1"></div>
            {item.label && (
              <Badge variant={item.amount > 0 ? 'default' : 'outline'} className="border-primary px-1.5">
                {item.label}
              </Badge>
            )}
          </div>
          <div className="mb-4 flex items-end gap-2">
            {item.original_price && (
              <span className="text-muted-foreground text-xl font-semibold line-through">{item.original_price}</span>
            )}
            {priceString && <span className="text-5xl font-semibold">{priceString}</span>}
            {item.unit && <span className="block font-semibold">/{item.unit}</span>}
          </div>
          {isPriceList && (
            <div className="w-full space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span>{t('selected_credits')}: <span className="font-bold">{selectedCredits}</span></span>
                <span className="text-muted-foreground">|</span>
                <span>{t('cost_per_image')}: <span className="font-bold">{item.currency_symbol}{(selectedAmount / selectedCredits).toFixed(4)}</span></span>
              </div>
              <Slider
                min={0}
                max={price?.length - 1 || 1}
                step={1}
                defaultValue={[0]}
                onValueChange={onSliderValueChanged}
              />
              <div className="flex items-center justify-between">
                <span>{price[0].credits}</span>
                <span>{price[price.length - 1].credits}</span>
              </div>
            </div>
          )}
          {item.description && <p className="text-muted-foreground">{item.description}</p>}
          {item.features_title && <p className="mt-6 mb-3 font-semibold">{item.features_title}</p>}
          {item.features && (
            <ul className="flex flex-col gap-3">
              {item.features.map((feature, fi) => {
                return (
                  <li className="flex gap-2" key={`feature-${fi}`}>
                    {feature.notContained ? (
                      <LucideX className="mt-1 size-4 shrink-0 text-red-500" />
                    ) : (
                      <LucideCheck className="mt-1 size-4 shrink-0 text-green-500" />
                    )}
                    {feature.content}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="flex flex-col gap-2">
          {item.cn_amount && item.cn_amount > 0 ? (
            <div className="mt-2 flex items-center gap-x-2">
              <span className="text-sm">人民币支付 👉</span>
              <div
                className="hover:bg-base-200 inline-block rounded-md p-2 hover:cursor-pointer"
                onClick={() => handleCheckout({item, price_id: priceId, cn_pay: true})}
              >
                <img src="/imgs/cnpay.png" alt="cnpay" className="h-10 w-20 rounded-lg" />
              </div>
            </div>
          ) : null}
          {item.button && (
            <Button
              variant={item.amount > 0 ? 'default' : 'outline'}
              className="flex w-full items-center justify-center gap-2 font-semibold"
              disabled={isLoading}
              onClick={() => handleCheckout({item, price_id: priceId})}
            >
              {(!isLoading || (isLoading && productId !== item.product_id)) && <p>{item.button.title}</p>}

              {isLoading && productId === item.product_id && <p>{item.button.title}</p>}
              {isLoading && productId === item.product_id && <Loader className="mr-2 h-4 w-4 animate-spin" />}
              {item.button.icon && <Icon config={{ name: item.button.icon }} className="size-4" />}
            </Button>
          )}
          {item.tip && <p className="text-muted-foreground mt-2 text-sm">{item.tip}</p>}
        </div>
      </div>
    </div>
  );
}
