import { BRAND_NAME } from '@/constants/config';
import { BREADCRUMB_HOME, BREADCRUMB_ABOUT } from "../common/breadcrumb";
import content from './content.md';


export default {
  metadata: {
    title: `Sobre Nós - ${BRAND_NAME}`,
    description: `Saiba mais sobre como o ${BRAND_NAME} foi construído e quem somos nós.`,
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
