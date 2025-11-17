import { CAPITALIZED_DOMAIN } from '@/constants/config';
import { BREADCRUMB_HOME, BREADCRUMB_PRIVACY } from "../common/breadcrumb";
import content from './content.md';


export default {
  metadata: {
    title: `Política de privacidad - ${CAPITALIZED_DOMAIN}`,
    description: `Política de privacidad para ${CAPITALIZED_DOMAIN} - Conoce cómo manejamos tu información cuando usas nuestro servicio.`,
  },
  content,
  breadcrumb: {
    items: [
      BREADCRUMB_HOME,
      BREADCRUMB_PRIVACY,
    ],
  },
};
