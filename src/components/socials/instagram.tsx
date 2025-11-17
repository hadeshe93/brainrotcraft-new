'use client';

import { useState } from 'react';
import Icon from '@/components/icon';
import { cn } from '@/lib/utils';
import Image from '@/components/image';

interface InstagramMockupProps {
  imageUrl: string;
  username?: string;
  userAvatar?: string;
  likes?: number;
  text?: string;
  timestamp?: string;
  className?: string;
}

export default function InstagramMockup({
  imageUrl,
  username = '',
  userAvatar = '',
  likes = 2048,
  text = '',
  timestamp = '2 hours ago',
  className,
}: InstagramMockupProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  return (
    <div
      className={cn(
        'bg-white dark:bg-neutral-900 rounded-lg shadow-lg overflow-hidden max-w-md mx-auto',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-500 via-red-500 to-yellow-500 p-0.5">
            <div className="w-full h-full rounded-full bg-white dark:bg-gray-900 p-0.5">
              <img
                src={userAvatar}
                alt={username}
                className="w-full h-full rounded-full object-cover"
              />
            </div>
          </div>
          <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
            {username}
          </span>
        </div>
        <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
          <Icon
            config={{ name: 'MdiDotsHorizontal' }}
            className="w-5 h-5 text-gray-900 dark:text-gray-100"
          />
        </button>
      </div>

      {/* Image */}
      <div className="relative aspect-square bg-gray-100 dark:bg-gray-800">
        <Image
          src={imageUrl}
          alt="Post image"
          className="object-cover"
          loading='lazy'
        />
      </div>

      {/* Actions */}
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsLiked(!isLiked)}
              className="hover:scale-110 transition-transform"
            >
              <Icon
                config={{ name: isLiked ? 'MdiHeart' : 'MdiHeartOutline' }}
                className={cn(
                  'size-5',
                  isLiked ? 'text-red-500' : 'text-gray-900 dark:text-gray-100'
                )}
              />
            </button>
            <button className="hover:scale-110 transition-transform">
              <Icon
                config={{ name: 'MdiCommentOutline' }}
                className="size-5 text-gray-900 dark:text-gray-100"
              />
            </button>
            <button className="hover:scale-110 transition-transform">
              <Icon
                config={{ name: 'MdiSendVariantOutline' }}
                className="size-5 text-gray-900 dark:text-gray-100 -rotate-12"
              />
            </button>
          </div>
          <button
            onClick={() => setIsSaved(!isSaved)}
            className="hover:scale-110 transition-transform"
          >
            <Icon
              config={{ name: 'MdiBookmarkOutline' }}
              className={cn(
                'size-5',
                isSaved ? 'text-gray-900 dark:text-gray-100' : 'text-gray-900 dark:text-gray-100'
              )}
            />
          </button>
        </div>

        {/* Likes */}
        <div className="font-semibold text-sm text-gray-900 dark:text-gray-100 mb-1">
          {formatNumber(isLiked ? likes + 1 : likes)} likes
        </div>

        {/* Caption */}
        <div className="text-sm text-gray-900 dark:text-gray-100 mb-1 line-clamp-2">
          <span className="font-semibold mr-2">{username}</span>
          {text}
        </div>

        {/* Timestamp */}
        <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">
          {timestamp}
        </div>
      </div>
    </div>
  );
}