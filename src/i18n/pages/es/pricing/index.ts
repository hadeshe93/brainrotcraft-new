import { I18nPageContent } from '@/types/i18n';
import { BREADCRUMB_HOME, BREADCRUMB_PRICING } from '../common/breadcrumb';
import faq from './faq.md';
// import faq from './faq-cn.md';

export default {
  metadata: {
    title: 'Precios - Eliminador de fondos | Simple y transparente',
    description: `Plan gratuito generoso más opciones de pago flexibles. Precios simples y transparentes que se escalan con tus necesidades. Perfecto para fotógrafos, diseñadores y comercio electrónico.`,
  },
  breadcrumb: {
    items: [BREADCRUMB_HOME, BREADCRUMB_PRICING],
  },
  pricing: {
    title: 'Precios',
    description: 'Precios simples y transparentes. Comienza gratis con hasta 600 imágenes/mes, u obtén créditos desde $4.99 sin suscripciones y sin vencimiento. 95% más barato que la competencia.',
    items: [
      {
        title: 'Plan Gratuito',
        description: 'El plan gratuito más generoso de la industria - perfecto para proyectos personales y creadores de contenido',
        label: 'Más popular',
        price: 'Gratis',
        currency: '',
        currency_symbol: '',
        unit: '',
        features_title: 'Todo lo que necesitas para comenzar:',
        features: [
          {
            content: 'Eliminador de imagen única: Uso ilimitado, sin restricciones de vista previa o descarga, hasta resolución 8K',
            notContained: false,
          },
          {
            content: 'Procesamiento por lotes: 12 imágenes por sesión, 50 veces por mes (hasta 600 imágenes/mes)',
            notContained: false,
          },
          {
            content: 'Todas las herramientas de edición incluidas - sin límites de tamaño, sin marcas de agua',
            notContained: false,
          },
          {
            content: '10-20x más generoso que la competencia (Remove.bg, Photoroom, etc.)',
            notContained: false,
          },
        ],
        button: {
          title: 'Comenzar gratis ahora',
          type: 'link',
          variant: 'outline',
          size: 'md',
          url: '/#background-remover',
        },
        tip: 'No se requiere tarjeta de crédito. No se necesita registro. Comienza al instante.',
        is_featured: false,
        interval: 'month',
        product_id: '',
        product_name: 'Plan Gratuito',
        amount: 0,
        credits: 0,
        group: 'individual',
      },
      {
        title: 'Plan Flexible',
        description: 'Paga una vez, usa para siempre. Sin suscripciones, sin tarifas mensuales. Perfecto para fotógrafos, vendedores de comercio electrónico y diseñadores.',
        label: 'Mejor valor',
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
        unit: 'Pago único',
        features_title: 'Desbloquea el potente procesamiento por lotes:',
        features: [
          {
            content: 'Procesamiento por lotes: Hasta 50 imágenes por sesión (4x más grande que el plan gratuito)',
            notContained: false,
          },
          {
            content: 'Frecuencia de procesamiento ilimitada - sin límites mensuales, usa tus créditos en cualquier momento',
            notContained: false,
          },
          {
            content: 'Los créditos nunca expiran - compra una vez, usa cuando lo necesites',
            notContained: false,
          },
          {
            content: '95% más barato que Remove.bg - desde $0.05 hasta $0.10 por imagen',
            notContained: false,
          },
          {
            content: 'Compra más, ahorra más - hasta 50% de descuento en paquetes de créditos más grandes',
            notContained: false,
          },
          {
            content: 'Conserva todas las funciones gratuitas - el eliminador de imagen única siempre permanece ilimitado y gratuito',
            notContained: false,
          },
        ],
        button: {
          title: 'Comprar ahora',
          type: 'link',
          variant: 'outline',
          size: 'md',
          url: '',
        },
        tip: 'Pago único. Sin cargos ocultos. Acumulación de compras ilimitada.',
        is_featured: true,
        interval: 'one-time',
        product_id: 'iOZVQY6ppYVND37NPOjej',
        product_name: 'Plan Flexible',
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
