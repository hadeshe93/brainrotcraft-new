import { CAPITALIZED_DOMAIN } from '@/constants/config';
import { BREADCRUMB_HOME, BREADCRUMB_PRIVACY } from "../common/breadcrumb";
import content from './content.md';


export default {
  metadata: {
    title: `Política de Privacidade - ${CAPITALIZED_DOMAIN}`,
    description: `Política de Privacidade para ${CAPITALIZED_DOMAIN} - Saiba como lidamos com suas informações quando você usa nosso serviço.`,
  },
  content,
  breadcrumb: {
    items: [
      BREADCRUMB_HOME,
      BREADCRUMB_PRIVACY,
    ],
  },
};
