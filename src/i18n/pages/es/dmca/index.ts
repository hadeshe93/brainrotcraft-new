import { BRAND_NAME } from '@/constants/config';
import { BREADCRUMB_HOME, BREADCRUMB_DMCA } from '../common/breadcrumb';
import content from './content.md';

export default {
  metadata: {
    title: `DMCA - ${BRAND_NAME}`,
    description: `Política DMCA oficial para GamesRamp.com. Respetamos la propiedad intelectual y proporcionamos un proceso claro para que los titulares de derechos de autor presenten avisos de eliminación.`,
  },
  content,
  breadcrumb: {
    items: [BREADCRUMB_HOME, BREADCRUMB_DMCA],
  },
};
