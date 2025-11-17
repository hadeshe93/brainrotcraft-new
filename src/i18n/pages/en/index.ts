import { I18nPageContent } from '@/types/i18n';
import { type Image } from '@/types/blocks/base';
import { ESocialType } from '@/types/blocks/base';
import dmca from './dmca';
import privacy from './privacy';
import terms from './terms';
import userProfile from './user-profile';
import feedback from './feedback';
import changelog from './changelog';
import about from './about';
import pricing from './pricing';

const LOGO: Image = {
  url: '/logo.png',
  alt: 'Logo of Brainrot Craft',
};
const BRAND_NAME = 'Brainrot Craft';
const TITLE = 'Brainrot Craft: Play The Absurd Crafting Game for Free';
const DESCRIPTION =
  'Play Brainrot Craft online for free right now! Drag and drop elements to craft hundreds of absurdly unexpected things in this wildly imaginative fusion game.';


export default {
  layout: {
    metadata: {
      title: TITLE,
      description: DESCRIPTION,
      image: LOGO,
    },
    header: {
      brand: {
        title: BRAND_NAME,
        description: DESCRIPTION,
        logo: LOGO,
        link: {
          url: '/',
        },
      },
      nav: [
        {
          title: 'Feedback',
          link: {
            url: '/feedback',
          },
        },
        {
          title: 'Changelog',
          link: {
            url: '/changelog',
          },
        },
      ],
      showTheme: true,
      showShare: true,
      showLocale: true,
      showSign: false,
    },
    footer: {
      brand: {
        title: BRAND_NAME,
        description: DESCRIPTION,
        extraDescriptions: [
          // `We achieve a carbon rating of A on [Website Carbon Calculator](https://www.websitecarbon.com/website/freebackgroundremover-net/)`,
        ],
        logo: LOGO,
        link: { url: '/', target: '_self' },
      },
      copyright: '© 2025 • Brainrotcraft.app All rights reserved Built with Next.js',
      nav: [
        {
          title: 'About Us',
          children: [
            { title: 'Feedback', link: { url: '/feedback' } },
            { title: 'Changelog', link: { url: '/changelog' } },
            // {
            //   title: 'Status',
            //   link: { url: 'https://free-background-remover.instatus.com/', target: '_blank', rel: 'nofollow' },
            // },
          ],
        },
      ],
      social: {
        items: [
          { title: 'Email', type: ESocialType.Email, link: { url: 'mailto:contact@gamesramp.com' } },
          { title: 'Linktree', type: ESocialType.Linktree, link: { url: 'https://linktr.ee/thebrainrotcraft', target: '_blank', rel: 'nofollow' } },
          // {
          //   title: 'Bluesky',
          //   type: ESocialType.Bluesky,
          //   link: { url: 'https://bsky.app/profile/freegameshub.bsky.social' },
          // },
          {
            title: 'Pinterest',
            type: ESocialType.Pinterest,
            link: { url: 'https://www.pinterest.com/thebrainrotcraft/', target: '_blank', rel: 'nofollow' },
          },
          {
            title: 'Instagram',
            type: ESocialType.Instagram,
            link: { url: 'https://www.instagram.com/brainrotcraft/profilecard/', target: '_blank', rel: 'nofollow' },
          },
          // { title: 'Ko-fi', type: ESocialType.KoFi, link: { url: 'https://ko-fi.com/freebackgroundremover' } },
        ],
      },
      badge: {
        items: [
          // { type: 'stripe_climate', percentage: 1, url: 'https://climate.stripe.com/4d2oxW' }
        ],
      },
      agreement: {
        items: [
          // { title: 'DMCA', link: { url: '/dmca' } },
          { title: 'Privacy Policy', link: { url: '/privacy' } },
          { title: 'Terms of Service', link: { url: '/terms' } },
        ],
      },
    },
  },
  home: {
  },
  feedback,
  changelog,
  dmca,
  privacy,
  terms,
  about,
  userProfile,
  paymentSuccess: {
    metadata: {
      title: 'Payment Successful | GamesRamp',
      description: 'Your payment has been processed successfully. Welcome to GamesRamp premium membership.',
    },
    content: {
      title: 'Payment Successful!',
      description: 'Thank you for your purchase. Your subscription has been activated successfully.',
      transactionId: 'Transaction ID',
      nextSteps: {
        title: "What's Next?",
        items: [
          "You'll receive a confirmation email shortly",
          'Your premium features are now active',
          'Access your account to manage subscription',
        ],
      },
      actions: {
        dashboard: 'Go to Dashboard',
        home: 'Back to Home',
      },
    },
  },
  paymentCancel: {
    metadata: {
      title: 'Payment Cancelled | GamesRamp',
      description: 'Your payment was cancelled. You can retry anytime.',
    },
    content: {
      title: 'Payment Cancelled',
      defaultMessage: "Your payment was cancelled. You can retry anytime when you're ready.",
      errorMessages: {
        INVALID_PRODUCT_ID: 'Invalid product selected. Please try again with a valid subscription plan.',
        INSUFFICIENT_USER_INFO: 'Your account information is incomplete. Please update your profile and try again.',
        CURRENCY_NOT_SUPPORTED: 'The selected currency is not supported. Please choose a different payment method.',
        PAYMENT_FAILED: 'Payment processing failed. Please check your payment details and try again.',
      },
      help: {
        title: 'Need Help?',
        items: [
          {
            title: 'Having trouble with payment?',
            description: 'Try using a different payment method or card',
          },
          {
            title: 'Questions about pricing?',
            description: 'View our pricing plans for detailed information',
          },
          {
            title: 'Need assistance?',
            description: 'Contact our support team for help',
          },
        ],
      },
      actions: {
        tryAgain: 'Try Again',
        home: 'Back to Home',
      },
      disclaimer: 'No charges were made to your account. You can safely close this page or return to try again later.',
    },
  },
  pricing,
} satisfies I18nPageContent;
