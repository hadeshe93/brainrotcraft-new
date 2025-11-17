import { BRAND_NAME } from '@/constants/config';
import { BREADCRUMB_HOME, BREADCRUMB_DMCA } from '../common/breadcrumb';
import content from './content.md';

export default {
  metadata: {
    title: `DMCA - ${BRAND_NAME}`,
    description: `Política oficial DMCA para GamesRamp.com. Respeitamos a propriedade intelectual e fornecemos um processo claro para que os proprietários de direitos autorais enviem notificações de remoção.`,
  },
  content,
  breadcrumb: {
    items: [BREADCRUMB_HOME, BREADCRUMB_DMCA],
  },
};
