'use client';
import { useState } from 'react';
import Image from '@/components/image';
import { cn } from '@/lib/utils';
import Icon from '@/components/icon';
import type { Image as ImageType } from '@/types/blocks/base';

export interface StyleSelectorProps {
  wrapperClassName?: string;
  className?: string;
  itemClassName?: string;
  imageClassName?: string;
  options: {
    id: string;
    title: string;
    description: string;
    preview_image: ImageType;
  }[];
  value: string;
  onChange: (value: string) => void;
}

export function StyleSelector(props: StyleSelectorProps) {
  console.log('StyleSelector props:', props);
  const { options, value, onChange } = props;
  const [selected, setSelected] = useState(value);
  const onSelect = (id: string) => {
    setSelected(id);
    onChange(id);
  };
  return (
    <div className={props.wrapperClassName || ''}>
      <div className={cn(props.className || '')}>
        {options.map((option) => (
          <div
            key={option.id}
            style={{ aspectRatio: 3 / 4 }}
            className={cn(
              'group border-foreground/10 relative flex cursor-pointer flex-col items-center overflow-hidden rounded-lg border-2 transition-all duration-200',
              props.itemClassName || '',
              selected === option.id && 'border-primary',
            )}
            onClick={() => onSelect(option.id)}
          >
            <Image
              src={option.preview_image.url}
              alt={option.preview_image.alt}
              className={cn('h-auto w-full transition-all duration-200 hover:scale-105', props.imageClassName || '')}
            />
            <Icon
              config={{ name: 'MdiCheckCircle' }}
              className={cn(
                'text-primary absolute right-1 bottom-1 size-7',
                selected === option.id ? 'block' : 'hidden',
              )}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/80 p-2 opacity-0 transition-all duration-200 group-hover:opacity-100">
              <h3 className="text-foreground line-clamp-2 text-sm font-medium">{option.title}</h3>
              <p className="text-foreground/80 line-clamp-3 text-xs">{option.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
