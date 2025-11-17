import type { Image as ImageType } from '@/types/blocks/base';
import CurvedArrow from '@/components/icon/curved-arrow';
import Image from '@/components/image';
import { cn } from '@/lib/utils';

export interface TransformMockupProps {
  sources: ImageType[];
  destinations: ImageType[];
  className?: string;
}

/**
 * 图片转换示意图
 * - 原图在左侧，转换后的图片在右侧，中间用 CurvedArrow 组件连接示意
 * - 左右两侧总体呈现扇形区域
 * - 如果某一侧有多张图片，那么第一张图片在最下面，最后一张图片在最上面，布局像是扇形那样旋转开来
 * @param sources - The source images 原图
 * @param destinations - The destination images 转换后的图片
 * @returns
 */
const ANGLE = 30;
const X_OFFSET = 20;
const Y_OFFSET = 10;
export default function TransformMockup({ sources, destinations, className = '' }: TransformMockupProps) {
  const renderImageFan = (images: ImageType[], side: 'left' | 'right') => {
    const length = images.length;
    const fanAngle = ANGLE / (length - 1); // 每张图片之间的角度差
    const baseRotation = ((side === 'left' ? -1 : 1) * ANGLE) / 2; // 基础旋转角度，让扇形居中
    return images.map((image, index) => {
      const rotation = baseRotation + index * fanAngle * (side === 'left' ? 1 : -1);
      const translateX = side === 'left' ? X_OFFSET * index : X_OFFSET * (length - index - 1); // 左右侧的水平偏移
      const translateY = -(length - index) * Y_OFFSET; // 垂直偏移，越上面的图片越高
      const zIndex = index; // 层级，越上面的图片层级越高

      return (
        <div
          key={`${side}-${index}`}
          className="absolute"
          style={{
            transform: `rotate(${rotation}deg) translate(${translateX}px, ${translateY}px)`,
            transformOrigin: side === 'left' ? 'center bottom' : 'center bottom',
            zIndex,
          }}
        >
          <div className="relative overflow-hidden rounded-none shadow-lg">
            <Image
              src={image.url}
              alt={image.alt || ''}
              className="h-auto w-[120px] object-cover border-3 border-primary/80"
            />
          </div>
        </div>
      );
    });
  };

  return (
    <div className={`relative flex py-10 items-center justify-center ${className}`}>
      {/* 左侧源图片扇形 */}
      <div className="relative flex w-[80px] h-[120px] md:w-[120px] md:h-[160px] items-center justify-center">
        {renderImageFan(sources, 'left')}
      </div>

      {/* 中间箭头 */}
      <div className="mx-4 md:mx-8 flex items-center justify-center">
        <CurvedArrow size={30} className="text-foreground rotate-45" />
      </div>

      {/* 右侧目标图片扇形 */}
      <div className={cn('relative flex w-[80px] h-[120px] md:w-[120px] md:h-[160px] items-center justify-center', destinations.length > 1 ? 'pl-2' : '')}>
        {renderImageFan(destinations, 'right')}
      </div>
    </div>
  );
}
