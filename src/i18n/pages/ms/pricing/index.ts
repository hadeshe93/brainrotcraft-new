import { I18nPageContent } from '@/types/i18n';
import { BREADCRUMB_HOME, BREADCRUMB_PRICING } from '../common/breadcrumb';
import faq from './faq.md';
// import faq from './faq-cn.md';

export default {
  metadata: {
    title: 'Harga - Background Remover | Mudah & Telus',
    description: `Pelan percuma yang murah hati ditambah pilihan berbayar yang fleksibel. Harga mudah dan telus yang berkembang mengikut keperluan anda. Sempurna untuk jurugambar, pereka & e-dagang.`,
  },
  breadcrumb: {
    items: [BREADCRUMB_HOME, BREADCRUMB_PRICING],
  },
  pricing: {
    title: 'Harga',
    description: 'Harga mudah dan telus. Mulakan percuma dengan sehingga 600 imej/bulan, atau dapatkan kredit dari $4.99 tanpa langganan dan tanpa tarikh luput. 95% lebih murah daripada pesaing.',
    items: [
      {
        title: 'Pelan Percuma',
        description: 'Pelan percuma paling murah hati dalam industri - sempurna untuk projek peribadi dan pencipta kandungan',
        label: 'Paling Popular',
        price: 'Percuma',
        currency: '',
        currency_symbol: '',
        unit: '',
        features_title: 'Semua yang anda perlukan untuk bermula:',
        features: [
          {
            content: 'Penyingkir imej tunggal: Penggunaan tanpa had, tiada sekatan pratonton atau muat turun, sehingga resolusi 8K',
            notContained: false,
          },
          {
            content: 'Pemprosesan kumpulan: 12 imej per sesi, 50 kali sebulan (sehingga 600 imej/bulan)',
            notContained: false,
          },
          {
            content: 'Semua alat penyuntingan disertakan - tiada had saiz, tiada tanda air',
            notContained: false,
          },
          {
            content: '10-20x lebih murah hati daripada pesaing (Remove.bg, Photoroom, dll.)',
            notContained: false,
          },
        ],
        button: {
          title: 'Mulakan Percuma Sekarang',
          type: 'link',
          variant: 'outline',
          size: 'md',
          url: '/#background-remover',
        },
        tip: 'Tiada kad kredit diperlukan. Tiada pendaftaran diperlukan. Mulakan serta-merta.',
        is_featured: false,
        interval: 'month',
        product_id: '',
        product_name: 'Pelan Percuma',
        amount: 0,
        credits: 0,
        group: 'individual',
      },
      {
        title: 'Pelan Fleksibel',
        description: 'Bayar sekali, guna selamanya. Tiada langganan, tiada yuran bulanan. Sempurna untuk jurugambar, penjual e-dagang, dan pereka.',
        label: 'Nilai Terbaik',
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
        unit: 'Pembayaran sekali',
        features_title: 'Buka kunci pemprosesan kumpulan yang berkuasa:',
        features: [
          {
            content: 'Pemprosesan kumpulan: Sehingga 50 imej per sesi (4x lebih besar daripada pelan percuma)',
            notContained: false,
          },
          {
            content: 'Kekerapan pemprosesan tanpa had - tiada had bulanan, gunakan kredit anda bila-bila masa',
            notContained: false,
          },
          {
            content: 'Kredit tidak luput - beli sekali, gunakan bila-bila masa anda perlukan',
            notContained: false,
          },
          {
            content: '95% lebih murah daripada Remove.bg - dari $0.05 hingga $0.10 per imej',
            notContained: false,
          },
          {
            content: 'Beli lebih banyak, jimat lebih banyak - sehingga 50% diskaun untuk pakej kredit yang lebih besar',
            notContained: false,
          },
          {
            content: 'Kekalkan semua ciri percuma - penyingkir imej tunggal sentiasa kekal tanpa had dan percuma',
            notContained: false,
          },
        ],
        button: {
          title: 'Beli Sekarang',
          type: 'link',
          variant: 'outline',
          size: 'md',
          url: '',
        },
        tip: 'Pembayaran sekali. Tiada bayaran tersembunyi. Pembelian disusun tanpa had.',
        is_featured: true,
        interval: 'one-time',
        product_id: 'iOZVQY6ppYVND37NPOjej',
        product_name: 'Pelan Fleksibel',
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
