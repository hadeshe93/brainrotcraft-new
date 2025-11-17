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
  alt: 'Logo de Brainrot Craft',
};
const BRAND_NAME = 'Brainrot Craft';
const TITLE = 'Brainrot Craft: Juega el Absurdo Juego de Construcción Gratis';
const DESCRIPTION =
  '¡Juega a Brainrot Craft en línea gratis ahora mismo! Arrastra y suelta elementos para crear cientos de cosas absurdamente inesperadas en este juego de fusión salvajemente imaginativo.';


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
          title: 'Comentarios',
          link: {
            url: '/feedback',
          },
        },
        {
          title: 'Historial de Cambios',
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
      copyright: '© 2025 • Brainrotcraft.app Todos los derechos reservados Construido con Next.js',
      nav: [
        {
          title: 'Sobre Nosotros',
          children: [
            { title: 'Comentarios', link: { url: '/feedback' } },
            { title: 'Historial de Cambios', link: { url: '/changelog' } },
            // {
            //   title: 'Status',
            //   link: { url: 'https://free-background-remover.instatus.com/', target: '_blank', rel: 'nofollow' },
            // },
          ],
        },
      ],
      social: {
        items: [
          { title: 'Correo electrónico', type: ESocialType.Email, link: { url: 'mailto:contact@brainrotcraft.app' } },
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
          { title: 'Política de Privacidad', link: { url: '/privacy' } },
          { title: 'Términos de Servicio', link: { url: '/terms' } },
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
      title: 'Pago Exitoso | GamesRamp',
      description: 'Tu pago ha sido procesado con éxito. Bienvenido a la membresía premium de GamesRamp.',
    },
    content: {
      title: '¡Pago Exitoso!',
      description: 'Gracias por tu compra. Tu suscripción ha sido activada con éxito.',
      transactionId: 'ID de Transacción',
      nextSteps: {
        title: '¿Qué Sigue?',
        items: [
          'Recibirás un correo de confirmación en breve',
          'Tus funciones premium ya están activas',
          'Accede a tu cuenta para gestionar tu suscripción',
        ],
      },
      actions: {
        dashboard: 'Ir al Panel',
        home: 'Volver al Inicio',
      },
    },
  },
  paymentCancel: {
    metadata: {
      title: 'Pago Cancelado | GamesRamp',
      description: 'Tu pago fue cancelado. Puedes intentarlo nuevamente en cualquier momento.',
    },
    content: {
      title: 'Pago Cancelado',
      defaultMessage: 'Tu pago fue cancelado. Puedes intentarlo nuevamente cuando estés listo.',
      errorMessages: {
        INVALID_PRODUCT_ID: 'Producto seleccionado inválido. Por favor, intenta nuevamente con un plan de suscripción válido.',
        INSUFFICIENT_USER_INFO: 'La información de tu cuenta está incompleta. Por favor, actualiza tu perfil e intenta nuevamente.',
        CURRENCY_NOT_SUPPORTED: 'La moneda seleccionada no es compatible. Por favor, elige un método de pago diferente.',
        PAYMENT_FAILED: 'El procesamiento del pago falló. Por favor, verifica los detalles de tu pago e intenta nuevamente.',
      },
      help: {
        title: '¿Necesitas Ayuda?',
        items: [
          {
            title: '¿Tienes problemas con el pago?',
            description: 'Intenta usar un método de pago o tarjeta diferente',
          },
          {
            title: '¿Preguntas sobre los precios?',
            description: 'Consulta nuestros planes de precios para obtener información detallada',
          },
          {
            title: '¿Necesitas asistencia?',
            description: 'Contacta a nuestro equipo de soporte para recibir ayuda',
          },
        ],
      },
      actions: {
        tryAgain: 'Intentar Nuevamente',
        home: 'Volver al Inicio',
      },
      disclaimer: 'No se realizaron cargos a tu cuenta. Puedes cerrar esta página de forma segura o volver para intentarlo nuevamente más tarde.',
    },
  },
  pricing,
} satisfies I18nPageContent;
