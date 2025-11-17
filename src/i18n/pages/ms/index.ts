import { I18nPageContent } from '@/types/i18n';
import { type Image } from '@/types/blocks/base';
import { ESocialType } from '@/types/blocks/base';
import dmca from './dmca';
import privacy from './privacy';
import terms from './terms';
import userProfile from './user-profile';
import feedback from './feedback';
import changelog from './changelog';
import pricing from './pricing';

const LOGO: Image = {
  url: '/logo.png',
  alt: 'Logo Brainrot Craft',
};
const BRAND_NAME = 'Brainrot Craft';
const TITLE = 'Brainrot Craft: Main Permainan Crafting Absurd Percuma';
const DESCRIPTION =
  'Main Brainrot Craft dalam talian secara percuma sekarang! Seret dan lepas elemen untuk mencipta beratus-ratus perkara yang absurd dan tidak dijangka dalam permainan fusion yang sangat imajinatif ini.';


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
          title: 'Maklum Balas',
          link: {
            url: '/feedback',
          },
        },
        {
          title: 'Log Perubahan',
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
      copyright: '© 2025 • Brainrotcraft.app Hak cipta terpelihara Dibina dengan Next.js',
      nav: [
        {
          title: 'Tentang Kami',
          children: [
            { title: 'Maklum Balas', link: { url: '/feedback' } },
            { title: 'Log Perubahan', link: { url: '/changelog' } },
            // {
            //   title: 'Status',
            //   link: { url: 'https://free-background-remover.instatus.com/', target: '_blank', rel: 'nofollow' },
            // },
          ],
        },
      ],
      social: {
        items: [
          { title: 'E-mel', type: ESocialType.Email, link: { url: 'mailto:contact@brainrotcraft.app' } },
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
          { title: 'Dasar Privasi', link: { url: '/privacy' } },
          { title: 'Terma Perkhidmatan', link: { url: '/terms' } },
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
  userProfile,
  paymentSuccess: {
    metadata: {
      title: 'Pembayaran Berjaya | GamesRamp',
      description: 'Pembayaran anda telah diproses dengan jayanya. Selamat datang ke keahlian premium GamesRamp.',
    },
    content: {
      title: 'Pembayaran Berjaya!',
      description: 'Terima kasih atas pembelian anda. Langganan anda telah diaktifkan dengan jayanya.',
      transactionId: 'ID Transaksi',
      nextSteps: {
        title: 'Apa Seterusnya?',
        items: [
          'Anda akan menerima e-mel pengesahan tidak lama lagi',
          'Ciri premium anda kini aktif',
          'Akses akaun anda untuk mengurus langganan',
        ],
      },
      actions: {
        dashboard: 'Pergi ke Papan Pemuka',
        home: 'Kembali ke Laman Utama',
      },
    },
  },
  paymentCancel: {
    metadata: {
      title: 'Pembayaran Dibatalkan | GamesRamp',
      description: 'Pembayaran anda telah dibatalkan. Anda boleh cuba semula pada bila-bila masa.',
    },
    content: {
      title: 'Pembayaran Dibatalkan',
      defaultMessage: 'Pembayaran anda telah dibatalkan. Anda boleh cuba semula pada bila-bila masa apabila anda bersedia.',
      errorMessages: {
        INVALID_PRODUCT_ID: 'Produk yang dipilih tidak sah. Sila cuba lagi dengan pelan langganan yang sah.',
        INSUFFICIENT_USER_INFO: 'Maklumat akaun anda tidak lengkap. Sila kemas kini profil anda dan cuba lagi.',
        CURRENCY_NOT_SUPPORTED: 'Mata wang yang dipilih tidak disokong. Sila pilih kaedah pembayaran yang berbeza.',
        PAYMENT_FAILED: 'Pemprosesan pembayaran gagal. Sila semak butiran pembayaran anda dan cuba lagi.',
      },
      help: {
        title: 'Perlukan Bantuan?',
        items: [
          {
            title: 'Menghadapi masalah dengan pembayaran?',
            description: 'Cuba gunakan kaedah pembayaran atau kad yang berbeza',
          },
          {
            title: 'Soalan tentang harga?',
            description: 'Lihat pelan harga kami untuk maklumat terperinci',
          },
          {
            title: 'Perlukan bantuan?',
            description: 'Hubungi pasukan sokongan kami untuk bantuan',
          },
        ],
      },
      actions: {
        tryAgain: 'Cuba Lagi',
        home: 'Kembali ke Laman Utama',
      },
      disclaimer: 'Tiada caj dibuat ke akaun anda. Anda boleh menutup halaman ini dengan selamat atau kembali untuk cuba lagi kemudian.',
    },
  },
  pricing,
} satisfies I18nPageContent;
