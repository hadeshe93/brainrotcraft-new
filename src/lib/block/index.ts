import { BaseBlockSection } from "@/types/blocks/base";

export function checkShow(config?: BaseBlockSection) {
  return config && !config.disabled;
}