import Image, { ImageProps } from '@/components/image';

export default function BrandImage(props: ImageProps) {
  return (
    <Image
      width="64"
      height="64"
      widthSet={[64, 128]}
      widthSizes={{
        default: '64px',
      }}
      className="w-8"
      {...props}
    />
  );
}
