import { BRAND_NAME } from '@/constants/config';
import { BREADCRUMB_HOME, BREADCRUMB_CHANGELOG } from '../common/breadcrumb';

const title = `Historial de Cambios - ${BRAND_NAME}`;
const description = `Consulta las últimas actualizaciones y cambios de ${BRAND_NAME}. Descubre nuevas funciones, correcciones de errores y mejoras para que tu experiencia de juego sea aún mejor.`;

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
        version: 'Versión',
        date: 'Fecha',
        changes: ['Cambios'],
      },
      {
        version: 'v1.3',
        date: '2025-11-15',
        changes: [
          '- Añadidas nuevas categorías de juegos, etiquetas y otros juegos de la serie Brainrot'
        ],
      },
      {
        version: 'v1.2',
        date: '2025-09-25',
        changes: [
          '- Añadido [Italian Brainrot Clicker](/italian-brainrot-clicker)'
        ],
      },
      {
        version: 'v1.1',
        date: '2025-07-23',
        changes: [
          '- Añadida [la página de historial de cambios](/changelog)'
        ],
      },
      {
        version: 'v1.0',
        date: '2025-07-22',
        changes: [
          '- Lanzada la versión inicial del sitio web'
        ],
      },
    ],
  },
  breadcrumb: {
    items: [BREADCRUMB_HOME, BREADCRUMB_CHANGELOG],
  },
};
