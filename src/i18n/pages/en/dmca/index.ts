import { BRAND_NAME } from '@/constants/config';
import { BREADCRUMB_HOME, BREADCRUMB_DMCA } from '../common/breadcrumb';
import content from './content.md';

export default {
  metadata: {
    title: `DMCA - ${BRAND_NAME}`,
    description: `Official DMCA policy for GamesRamp.com. We respect intellectual property and provide a clear process for copyright owners to submit takedown notices.`,
  },
  content,
  breadcrumb: {
    items: [BREADCRUMB_HOME, BREADCRUMB_DMCA],
  },
};
