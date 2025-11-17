'use client';

import { useState } from 'react';
import Icon from '@/components/icon';
import Image from '@/components/image';
import { cn } from '@/lib/utils';

interface TwitterMockupProps {
  imageUrl: string;
  username?: string;
  userHandle?: string;
  userAvatar?: string;
  text?: string;
  likes?: number;
  retweets?: number;
  replies?: number;
  timestamp?: string;
  verified?: boolean;
  className?: string;
}

export default function TwitterMockup({
  imageUrl,
  username = '',
  userHandle = '',
  userAvatar = '',
  text = '',
  likes = 342,
  retweets = 87,
  replies = 23,
  timestamp = '2h',
  verified = true,
  className,
}: TwitterMockupProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [isRetweeted, setIsRetweeted] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

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
        'bg-white dark:bg-black border dark:border-gray-800 rounded-2xl p-2 max-w-xl mx-auto hover:bg-gray-50 dark:hover:bg-gray-950 transition-colors',
        className
      )}
    >
      {/* Header */}
      <div className="flex gap-1 w-full">
        <img
          src={userAvatar}
          alt={username}
          className="size-8 flex-shrink-0 flex-grow-0 rounded-full object-cover"
        />
        <div className="grow-0">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1">
                <span className="font-bold text-gray-900 dark:text-white">
                  {username}
                </span>
                {verified && (
                  <Icon
                    config={{ name: 'MdiCheckCircle' }}
                    className="w-5 h-5 text-blue-500"
                  />
                )}
              </div>
              <span className="text-gray-500 dark:text-gray-400 text-sm">
                {userHandle} · {timestamp}
              </span>
            </div>
            <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-full transition-colors">
              <Icon
                config={{ name: 'MdiDotsHorizontal' }}
                className="w-5 h-5 text-gray-500 dark:text-gray-400"
              />
            </button>
          </div>

          {/* Text */}
          <div className="mt-2 text-gray-900 dark:text-white text-sm leading-normal line-clamp-2 whitespace-normal">
            {text}
          </div>

          {/* Image */}
          <div className="mt-3 rounded-2xl overflow-hidden border dark:border-gray-800">
            <div className="relative aspect-[3/4] bg-gray-100 dark:bg-gray-900">
              <Image
                src={imageUrl}
                alt="Post image"
                loading='lazy'
                className="object-cover"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between mt-3 gap-1">
            <button className="group flex items-center hover:bg-blue-50 dark:hover:bg-blue-950 rounded-full transition-colors">
              <Icon
                config={{ name: 'MdiCommentOutline' }}
                className="size-4 text-gray-500 dark:text-gray-400 group-hover:text-blue-500"
              />
              <span className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-blue-500">
                {formatNumber(replies)}
              </span>
            </button>

            <button
              onClick={() => setIsRetweeted(!isRetweeted)}
              className="group flex items-center hover:bg-green-50 dark:hover:bg-green-950 rounded-full transition-colors"
            >
              <Icon
                config={{ name: 'MdiRepost' }}
                className={cn(
                  'size-4',
                  isRetweeted
                    ? 'text-green-500'
                    : 'text-gray-500 dark:text-gray-400 group-hover:text-green-500'
                )}
              />
              <span
                className={cn(
                  'text-xs',
                  isRetweeted
                    ? 'text-green-500'
                    : 'text-gray-500 dark:text-gray-400 group-hover:text-green-500'
                )}
              >
                {formatNumber(isRetweeted ? retweets + 1 : retweets)}
              </span>
            </button>

            <button
              onClick={() => setIsLiked(!isLiked)}
              className="group flex items-center hover:bg-red-50 dark:hover:bg-red-950 rounded-full transition-colors"
            >
              <Icon
                config={{ name: isLiked ? 'MdiHeart' : 'MdiHeartOutline' }}
                className={cn(
                  'size-4',
                  isLiked
                    ? 'text-red-500'
                    : 'text-gray-500 dark:text-gray-400 group-hover:text-red-500'
                )}
              />
              <span
                className={cn(
                  'text-xs',
                  isLiked
                    ? 'text-red-500'
                    : 'text-gray-500 dark:text-gray-400 group-hover:text-red-500'
                )}
              >
                {formatNumber(isLiked ? likes + 1 : likes)}
              </span>
            </button>

            <button
              onClick={() => setIsBookmarked(!isBookmarked)}
              className="group hover:bg-blue-50 dark:hover:bg-blue-950 rounded-full transition-colors"
            >
              <Icon
                config={{ name: 'MdiBookmarkOutline' }}
                className={cn(
                  'size-4',
                  isBookmarked
                    ? 'text-blue-500'
                    : 'text-gray-500 dark:text-gray-400 group-hover:text-blue-500'
                )}
              />
            </button>

            <button className="group hover:bg-blue-50 dark:hover:bg-blue-950 rounded-full transition-colors">
              <Icon
                config={{ name: 'MdiShareOutline' }}
                className="size-4 text-gray-500 dark:text-gray-400 group-hover:text-blue-500"
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}