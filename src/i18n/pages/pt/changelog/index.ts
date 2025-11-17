import { BRAND_NAME } from '@/constants/config';
import { BREADCRUMB_HOME, BREADCRUMB_CHANGELOG } from '../common/breadcrumb';

const title = `Registro de Alterações - ${BRAND_NAME}`;
const description = `Veja as últimas atualizações e registros de alterações do ${BRAND_NAME}. Descubra novos recursos, correções de bugs e melhorias para tornar sua experiência de jogo ainda melhor.`;

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
        version: 'Versão',
        date: 'Data',
        changes: ['Alterações'],
      },
      {
        version: 'v1.3',
        date: '2025-11-15',
        changes: [
          '- Adicionadas novas categorias de jogos, tags e outros jogos da série Brainrot'
        ],
      },
      {
        version: 'v1.2',
        date: '2025-09-25',
        changes: [
          '- Adicionado [Italian Brainrot Clicker](/italian-brainrot-clicker)'
        ],
      },
      {
        version: 'v1.1',
        date: '2025-07-23',
        changes: [
          '- Adicionada [a página de registro de alterações](/changelog)'
        ],
      },
      {
        version: 'v1.0',
        date: '2025-07-22',
        changes: [
          '- Lançada a versão inicial do site'
        ],
      },
    ],
  },
  breadcrumb: {
    items: [BREADCRUMB_HOME, BREADCRUMB_CHANGELOG],
  },
};
