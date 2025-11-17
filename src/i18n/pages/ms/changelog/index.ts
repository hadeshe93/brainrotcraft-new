import { BRAND_NAME } from '@/constants/config';
import { BREADCRUMB_HOME, BREADCRUMB_CHANGELOG } from '../common/breadcrumb';

const title = `Log Perubahan - ${BRAND_NAME}`;
const description = `Lihat kemas kini dan log perubahan terkini untuk ${BRAND_NAME}. Temui ciri baharu, pembaikan pepijat, dan penambahbaikan untuk menjadikan pengalaman bermain anda lebih baik.`;

export default {
  metadata: {
    title,
    description,
    og: {
      title,
      description,
    },
  },
  introduction: {
    title,
    description: [description],
  },
  changelog: {
    list: [
      {
        version: 'Versi',
        date: 'Tarikh',
        changes: ['Perubahan'],
      },
      {
        version: 'v1.3',
        date: '2025-11-15',
        changes: [
          '- Menambah kategori permainan baharu, tag, dan permainan siri Brainrot yang lain'
        ],
      },
      {
        version: 'v1.2',
        date: '2025-09-25',
        changes: [
          '- Menambah [Italian Brainrot Clicker](/italian-brainrot-clicker)'
        ],
      },
      {
        version: 'v1.1',
        date: '2025-07-23',
        changes: [
          '- Menambah [halaman log perubahan](/changelog)'
        ],
      },
      {
        version: 'v1.0',
        date: '2025-07-22',
        changes: [
          '- Melancarkan versi awal laman web'
        ],
      },
    ],
  },
  breadcrumb: {
    items: [BREADCRUMB_HOME, BREADCRUMB_CHANGELOG],
  },
};
