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
  alt: 'Logo do Brainrot Craft',
};
const BRAND_NAME = 'Brainrot Craft';
const TITLE = 'Brainrot Craft: Jogue o Jogo de Criação Absurdo Gratuitamente';
const DESCRIPTION =
  'Jogue Brainrot Craft online gratuitamente agora mesmo! Arraste e solte elementos para criar centenas de coisas absurdamente inesperadas neste jogo de fusão selvagemente imaginativo.';


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
          title: 'Registro de Alterações',
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
      copyright: '© 2025 • Brainrotcraft.app Todos os direitos reservados Desenvolvido com Next.js',
      nav: [
        {
          title: 'Sobre Nós',
          children: [
            { title: 'Feedback', link: { url: '/feedback' } },
            { title: 'Registro de Alterações', link: { url: '/changelog' } },
            // {
            //   title: 'Status',
            //   link: { url: 'https://free-background-remover.instatus.com/', target: '_blank', rel: 'nofollow' },
            // },
          ],
        },
      ],
      social: {
        items: [
          { title: 'E-mail', type: ESocialType.Email, link: { url: 'mailto:contact@brainrotcraft.app' } },
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
          { title: 'Política de Privacidade', link: { url: '/privacy' } },
          { title: 'Termos de Serviço', link: { url: '/terms' } },
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
      title: 'Pagamento Bem-sucedido | GamesRamp',
      description: 'Seu pagamento foi processado com sucesso. Bem-vindo à assinatura premium do GamesRamp.',
    },
    content: {
      title: 'Pagamento Bem-sucedido!',
      description: 'Obrigado pela sua compra. Sua assinatura foi ativada com sucesso.',
      transactionId: 'ID da Transação',
      nextSteps: {
        title: 'Próximos Passos',
        items: [
          'Você receberá um e-mail de confirmação em breve',
          'Seus recursos premium estão agora ativos',
          'Acesse sua conta para gerenciar a assinatura',
        ],
      },
      actions: {
        dashboard: 'Ir para o Painel',
        home: 'Voltar ao Início',
      },
    },
  },
  paymentCancel: {
    metadata: {
      title: 'Pagamento Cancelado | GamesRamp',
      description: 'Seu pagamento foi cancelado. Você pode tentar novamente a qualquer momento.',
    },
    content: {
      title: 'Pagamento Cancelado',
      defaultMessage: 'Seu pagamento foi cancelado. Você pode tentar novamente a qualquer momento quando estiver pronto.',
      errorMessages: {
        INVALID_PRODUCT_ID: 'Produto selecionado inválido. Por favor, tente novamente com um plano de assinatura válido.',
        INSUFFICIENT_USER_INFO: 'As informações da sua conta estão incompletas. Por favor, atualize seu perfil e tente novamente.',
        CURRENCY_NOT_SUPPORTED: 'A moeda selecionada não é suportada. Por favor, escolha um método de pagamento diferente.',
        PAYMENT_FAILED: 'O processamento do pagamento falhou. Por favor, verifique os detalhes do pagamento e tente novamente.',
      },
      help: {
        title: 'Precisa de Ajuda?',
        items: [
          {
            title: 'Tendo problemas com o pagamento?',
            description: 'Tente usar um método de pagamento ou cartão diferente',
          },
          {
            title: 'Dúvidas sobre preços?',
            description: 'Veja nossos planos de preços para informações detalhadas',
          },
          {
            title: 'Precisa de assistência?',
            description: 'Entre em contato com nossa equipe de suporte para obter ajuda',
          },
        ],
      },
      actions: {
        tryAgain: 'Tentar Novamente',
        home: 'Voltar ao Início',
      },
      disclaimer: 'Nenhuma cobrança foi feita em sua conta. Você pode fechar esta página com segurança ou voltar para tentar novamente mais tarde.',
    },
  },
  pricing,
} satisfies I18nPageContent;
