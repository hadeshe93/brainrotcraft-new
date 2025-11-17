import { BRAND_NAME } from '@/constants/config';
import { BREADCRUMB_HOME, BREADCRUMB_DMCA } from '../common/breadcrumb';
import content from './content.md';

export default {
  metadata: {
    title: `DMCA - ${BRAND_NAME}`,
    description: `Dasar DMCA rasmi untuk GamesRamp.com. Kami menghormati harta intelek dan menyediakan proses yang jelas untuk pemilik hak cipta menghantar notis penyingkiran.`,
  },
  content,
  breadcrumb: {
    items: [BREADCRUMB_HOME, BREADCRUMB_DMCA],
  },
};
