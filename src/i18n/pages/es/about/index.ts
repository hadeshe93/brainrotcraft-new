import { BRAND_NAME } from '@/constants/config';
import { BREADCRUMB_HOME, BREADCRUMB_ABOUT } from "../common/breadcrumb";
import content from './content.md';


export default {
  metadata: {
    title: `Sobre Nosotros - ${BRAND_NAME}`,
    description: `Descubre más sobre cómo se creó ${BRAND_NAME} y quiénes somos.`,
  },
  content: {
    introduction: content,
    members: [],
  },
  breadcrumb: {
    items: [
      BREADCRUMB_HOME,
      BREADCRUMB_ABOUT,
    ],
  },
};
