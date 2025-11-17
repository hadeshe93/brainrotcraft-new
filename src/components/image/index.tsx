import { ImgHTMLAttributes } from "react";
import { EAppEnv } from "@/types/base/env";

type ImageFormat = 'auto' | 'webp' | 'avif' | 'jpeg' | 'baseline-jpeg' | 'json';
type ImageWidthSizes = {
  default?: string;
  maxSm?: string;
  maxMd?: string;
  maxLg?: string;
  maxXl?: string;
  minSm?: string;
  minMd?: string;
  minLg?: string;
  minXl?: string;
};
export interface ImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  widthSet?: number[];
  widthSizes?: ImageWidthSizes;
  src: string;
  quality?: number;
  format?: ImageFormat;
}

const isDevEnv = process.env.NEXT_PUBLIC_RUNTIME_ENV === EAppEnv.development;
export default function Image({ widthSet = [], width, height, quality = 85, format = 'auto', src: srcRaw, widthSizes = {}, sizes: sizesRaw, ...props }: ImageProps) {
  const src = isDevEnv ? srcRaw : createImgSrc({ width, height, quality, format, src: srcRaw });
  const srcSet = widthSet.map(width => createImgSrcSetSingle({ width, height, quality, format, src: srcRaw })).join(', ');
  const sizes = sizesRaw ?? createImgSizes(widthSizes);
  const dynamicProps: ImgHTMLAttributes<HTMLImageElement> = {};
  if (!isDevEnv && srcSet) dynamicProps.srcSet = srcSet;
  if (!isDevEnv && sizes) dynamicProps.sizes = sizes;
  return <img src={src} {...dynamicProps} {...props} />;
}

interface CreateImgSrcOptions {
  width?: number | string;
  height?: number | string;
  quality?: number;
  format?: ImageFormat;
  src: string;
}
function createImgSrc({ width, height, quality = 85, format = 'auto', src }: CreateImgSrcOptions) {
  const isWidthTruthy = Number(width) > 0;
  const isHeightTruthy = Number(height) > 0;
  const widthParam = isWidthTruthy ? `,width=${width}` : '';
  const heightParam = isHeightTruthy ? `,height=${height}` : '';
  const srcParam = src.startsWith('/') ? src : `/${src}`;
  return `/cdn-cgi/image/fit=scale-down,format=${format}${widthParam}${heightParam},quality=${quality}${srcParam}`;
}

function createImgSrcSetSingle(options: CreateImgSrcOptions) {
  const src = createImgSrc(options);
  const imgWidthParam = Number(options.width) > 0 ? ` ${options.width}w` : '';
  return `${src}${imgWidthParam}`;
}

function createImgSizes(widthSizes: ImageWidthSizes) {
  const sizes = [];
  if (widthSizes.maxSm) {
    sizes.push(`(max-width: 640px) ${widthSizes.maxSm}`);
  }
  if (widthSizes.maxMd) {
    sizes.push(`(max-width: 768px) ${widthSizes.maxMd}`);
  }
  if (widthSizes.maxLg) {
    sizes.push(`(max-width: 1024px) ${widthSizes.maxLg}`);
  }
  if (widthSizes.maxXl) {
    sizes.push(`(max-width: 1280px) ${widthSizes.maxXl}`);
  }
  if (widthSizes.minSm) {
    sizes.push(`(min-width: 640px) ${widthSizes.minSm}`);
  }
  if (widthSizes.minMd) {
    sizes.push(`(min-width: 768px) ${widthSizes.minMd}`);
  }
  if (widthSizes.minLg) {
    sizes.push(`(min-width: 1024px) ${widthSizes.minLg}`);
  }
  if (widthSizes.minXl) {
    sizes.push(`(min-width: 1280px) ${widthSizes.minXl}`);
  }
  if (widthSizes.default) {
    sizes.push(widthSizes.default);
  }
  return sizes.join(', ');
}