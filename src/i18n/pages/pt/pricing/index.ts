import { I18nPageContent } from '@/types/i18n';
import { BREADCRUMB_HOME, BREADCRUMB_PRICING } from '../common/breadcrumb';
import faq from './faq.md';
// import faq from './faq-cn.md';

export default {
  metadata: {
    title: 'Preços - Removedor de Fundo | Simples e Transparente',
    description: `Plano gratuito generoso mais opções pagas flexíveis. Preços simples e transparentes que se ajustam às suas necessidades. Perfeito para fotógrafos, designers e e-commerce.`,
  },
  breadcrumb: {
    items: [BREADCRUMB_HOME, BREADCRUMB_PRICING],
  },
  pricing: {
    title: 'Preços',
    description: 'Preços simples e transparentes. Comece grátis com até 600 imagens/mês, ou obtenha créditos a partir de $4.99 sem assinaturas e sem expiração. 95% mais barato que os concorrentes.',
    items: [
      {
        title: 'Plano Gratuito',
        description: 'O plano gratuito mais generoso da indústria - perfeito para projetos pessoais e criadores de conteúdo',
        label: 'Mais Popular',
        price: 'Gratuito',
        currency: '',
        currency_symbol: '',
        unit: '',
        features_title: 'Tudo o que você precisa para começar:',
        features: [
          {
            content: 'Removedor de imagem única: Uso ilimitado, sem restrições de visualização ou download, até resolução 8K',
            notContained: false,
          },
          {
            content: 'Processamento em lote: 12 imagens por sessão, 50 vezes por mês (até 600 imagens/mês)',
            notContained: false,
          },
          {
            content: 'Todas as ferramentas de edição incluídas - sem limites de tamanho, sem marcas d\'água',
            notContained: false,
          },
          {
            content: '10-20x mais generoso que os concorrentes (Remove.bg, Photoroom, etc.)',
            notContained: false,
          },
        ],
        button: {
          title: 'Comece Grátis Agora',
          type: 'link',
          variant: 'outline',
          size: 'md',
          url: '/#background-remover',
        },
        tip: 'Não é necessário cartão de crédito. Não é necessário registro. Comece instantaneamente.',
        is_featured: false,
        interval: 'month',
        product_id: '',
        product_name: 'Plano Gratuito',
        amount: 0,
        credits: 0,
        group: 'individual',
      },
      {
        title: 'Plano Flexível',
        description: 'Pague uma vez, use para sempre. Sem assinaturas, sem taxas mensais. Perfeito para fotógrafos, vendedores de e-commerce e designers.',
        label: 'Melhor Valor',
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
        unit: 'Pagamento único',
        features_title: 'Desbloqueie processamento em lote poderoso:',
        features: [
          {
            content: 'Processamento em lote: Até 50 imagens por sessão (4x maior que o plano gratuito)',
            notContained: false,
          },
          {
            content: 'Frequência de processamento ilimitada - sem limites mensais, use seus créditos a qualquer momento',
            notContained: false,
          },
          {
            content: 'Créditos nunca expiram - compre uma vez, use quando precisar',
            notContained: false,
          },
          {
            content: '95% mais barato que Remove.bg - de $0.05 a $0.10 por imagem',
            notContained: false,
          },
          {
            content: 'Compre mais, economize mais - até 50% de desconto em pacotes de créditos maiores',
            notContained: false,
          },
          {
            content: 'Mantém todos os recursos gratuitos - removedor de imagem única permanece sempre ilimitado e gratuito',
            notContained: false,
          },
        ],
        button: {
          title: 'Comprar Agora',
          type: 'link',
          variant: 'outline',
          size: 'md',
          url: '',
        },
        tip: 'Pagamento único. Sem taxas ocultas. Acumule compras ilimitadamente.',
        is_featured: true,
        interval: 'one-time',
        product_id: 'iOZVQY6ppYVND37NPOjej',
        product_name: 'Plano Flexível',
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
