import { Link, BaseBlockSection } from "./base";

export interface BreadcrumbItem {
  title: string;
  link?: Link;
}

export interface Breadcrumb extends BaseBlockSection {
  items: BreadcrumbItem[];
}
