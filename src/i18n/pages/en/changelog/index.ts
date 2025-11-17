import { BRAND_NAME } from '@/constants/config';
import { BREADCRUMB_HOME, BREADCRUMB_CHANGELOG } from '../common/breadcrumb';

const title = `Changelog - ${BRAND_NAME}`;
const description = `See the latest updates and changlogs to ${BRAND_NAME}. Discover new features, bug fixes, and enhancements to make your playing experience even better.`;

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
        version: 'Version',
        date: 'Date',
        changes: ['Changes'],
      },
      {
        version: 'v1.3',
        date: '2025-11-15',
        changes: [
          '- Added new game categories, tags, and other Brainrot series games'
        ],
      },
      {
        version: 'v1.2',
        date: '2025-09-25',
        changes: [
          '- Added [Italian Brainrot Clicker](/italian-brainrot-clicker)'
        ],
      },
      {
        version: 'v1.1',
        date: '2025-07-23',
        changes: [
          '- Added [the changelog page](/changelog)'
        ],
      },
      {
        version: 'v1.0',
        date: '2025-07-22',
        changes: [
          '- Released the initial version of the website'
        ],
      },
    ],
  },
  breadcrumb: {
    items: [BREADCRUMB_HOME, BREADCRUMB_CHANGELOG],
  },
};
