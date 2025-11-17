import { I18nPageContent } from '@/types/i18n';
import { BREADCRUMB_HOME, BREADCRUMB_PRICING } from '../common/breadcrumb';
import faq from './faq.md';
// import faq from './faq-cn.md';

export default {
  metadata: {
    title: 'Pricing - Background Remover | Simple & Transparent',
    description: `Generous free plan plus flexible paid options. Simple, transparent pricing that scales with your needs. Perfect for photographers, designers & e-commerce.`,
  },
  breadcrumb: {
    items: [BREADCRUMB_HOME, BREADCRUMB_PRICING],
  },
  pricing: {
    title: 'Pricing',
    description: 'Simple, transparent pricing. Start free with up to 600 images/month, or get credits from $4.99 with no subscriptions and no expiration. 95% cheaper than competitors.',
    items: [
      {
        title: 'Free Plan',
        description: 'The most generous free plan in the industry - perfect for personal projects and content creators',
        label: 'Most Popular',
        price: 'Free',
        currency: '',
        currency_symbol: '',
        unit: '',
        features_title: 'Everything you need to get started:',
        features: [
          {
            content: 'Single image remover: Unlimited use, no preview or download restrictions, up to 8K resolution',
            notContained: false,
          },
          {
            content: 'Batch processing: 12 images per session, 50 times per month (up to 600 images/month)',
            notContained: false,
          },
          {
            content: 'All editing tools included - no size limits, no watermarks',
            notContained: false,
          },
          {
            content: '10-20x more generous than competitors (Remove.bg, Photoroom, etc.)',
            notContained: false,
          },
        ],
        button: {
          title: 'Start Free Now',
          type: 'link',
          variant: 'outline',
          size: 'md',
          url: '/#background-remover',
        },
        tip: 'No credit card required. No registration needed. Start instantly.',
        is_featured: false,
        interval: 'month',
        product_id: '',
        product_name: 'Free Plan',
        amount: 0,
        credits: 0,
        group: 'individual',
      },
      {
        title: 'Flexible Plan',
        description: 'Pay once, use forever. No subscriptions, no monthly fees. Perfect for photographers, e-commerce sellers, and designers.',
        label: 'Best Value',
        price: [
          {
            id: 'qUybNx0negMfQvGARjFJ7',
            credits: 50,
            price: '$4.99',
            amount: 4.99,
          },
          {
            id: 'lzvxwJ-OMr5OIK5bo7bdl',
            credits: 100,
            price: '$8.99',
            amount: 8.99,
          },
          {
            id: 'WJ7PWMUO8fnwehrbsqt6x',
            credits: 250,
            price: '$19.99',
            amount: 19.99,
          },
          {
            id: 'Nnq8ubT-U-krqvBQPnVVd',
            credits: 500,
            price: '$34.99',
            amount: 34.99,
          },
          {
            id: 'ksb3TRD7EyLOMtd5xtGNZ',
            credits: 1000,
            price: '$59.99',
            amount: 59.99,
          },
          {
            id: '2GMBOJ6NLZFq-x7cpFa8i',
            credits: 2000,
            price: '$124.99',
            amount: 124.99,
          },
        ],
        currency: 'USD',
        currency_symbol: '$',
        unit: 'One-time payment',
        features_title: 'Unlock powerful batch processing:',
        features: [
          {
            content: 'Batch processing: Up to 50 images per session (4x larger than free plan)',
            notContained: false,
          },
          {
            content: 'Unlimited processing frequency - no monthly limits, use your credits anytime',
            notContained: false,
          },
          {
            content: 'Credits never expire - purchase once, use whenever you need',
            notContained: false,
          },
          {
            content: '95% cheaper than Remove.bg - from $0.05 to $0.10 per image',
            notContained: false,
          },
          {
            content: 'Buy more, save more - up to 50% discount on larger credit packs',
            notContained: false,
          },
          {
            content: 'Keep all free features - single image remover always remains unlimited and free',
            notContained: false,
          },
        ],
        button: {
          title: 'Buy Now',
          type: 'link',
          variant: 'outline',
          size: 'md',
          url: '',
        },
        tip: 'One-time payment. No hidden fees. Stack purchases unlimited.',
        is_featured: true,
        interval: 'one-time',
        product_id: 'iOZVQY6ppYVND37NPOjej',
        product_name: 'Flexible Plan',
        amount: Infinity,
        credits: 0,
        group: 'individual',
      },
    ],
  },
  markdownRenderer: {
    content: faq,
  },
  // faq: {},
} satisfies I18nPageContent['pricing'];
