'use client';

import { useState } from 'react';
import Icon from '@/components/icon';
import Image from '@/components/image';
import { cn } from '@/lib/utils';

interface FacebookMockupProps {
  imageUrl: string;
  username?: string;
  userAvatar?: string;
  text?: string;
  likes?: number;
  comments?: number;
  shares?: number;
  timestamp?: string;
  privacy?: 'public' | 'friends' | 'private';
  className?: string;
}

export default function FacebookMockup({
  imageUrl,
  username = '',
  userAvatar = '',
  text = '',
  likes = 523,
  comments = 42,
  shares = 18,
  timestamp = '2 hrs',
  privacy = 'public',
  className,
}: FacebookMockupProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [reaction, setReaction] = useState<'like' | 'love' | 'wow' | null>(null);

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const getPrivacyIcon = () => {
    switch (privacy) {
      case 'public':
        return 'MdiEarth';
      case 'friends':
        return 'MdiAccountMultiple';
      case 'private':
        return 'MdiShield';
      default:
        return 'MdiEarth';
    }
  };

  const handleLike = () => {
    setIsLiked(!isLiked);
    setReaction(isLiked ? null : 'like');
  };

  return (
    <div
      className={cn(
        'bg-white dark:bg-gray-900 rounded-lg shadow-sm border dark:border-gray-800 max-w-lg mx-auto',
        className
      )}
    >
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          <img
            src={userAvatar}
            alt={username}
            className="w-10 h-10 rounded-full object-cover"
          />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {username}
                </h3>
                <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                  <span>{timestamp}</span>
                  <span>·</span>
                  <Icon
                    config={{ name: getPrivacyIcon() }}
                    className="w-3 h-3"
                  />
                </div>
              </div>
              <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                <Icon
                  config={{ name: 'MdiDotsHorizontal' }}
                  className="w-5 h-5 text-gray-500 dark:text-gray-400"
                />
              </button>
            </div>
          </div>
        </div>

        {/* Text */}
        <div className="mt-3 text-gray-900 dark:text-white text-[15px]">
          {text}
        </div>
      </div>

      {/* Image */}
      <div className="relative aspect-[4/3] bg-gray-100 dark:bg-gray-800">
        <Image
          src={imageUrl}
          alt="Post image"
          className="object-cover"
          loading='lazy'
        />
      </div>

      {/* Stats */}
      <div className="px-4 py-2 flex items-center justify-between border-b dark:border-gray-800">
        <div className="flex items-center gap-1">
          <div className="flex -space-x-1">
            <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
              <Icon
                config={{ name: 'MdiThumbUpOutline' }}
                className="w-3 h-3 text-white"
              />
            </div>
            <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
              <Icon
                config={{ name: 'MdiHeart' }}
                className="w-3 h-3 text-white"
              />
            </div>
            <div className="w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center">
              <Icon
                config={{ name: 'MdiEmoticonOutline' }}
                className="w-3 h-3 text-white"
              />
            </div>
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">
            {formatNumber(isLiked ? likes + 1 : likes)}
          </span>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
          <span>{formatNumber(comments)} comments</span>
          <span>{formatNumber(shares)} shares</span>
        </div>
      </div>

      {/* Actions */}
      <div className="p-1 flex items-center">
        <button
          onClick={handleLike}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-colors',
            isLiked
              ? 'text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-800'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          )}
        >
          <Icon
            config={{ name: isLiked ? 'MdiThumbUpOutline' : 'MdiThumbUpOutline' }}
            className="w-5 h-5"
          />
          <span className="text-sm font-medium">Like</span>
        </button>

        <button className="flex-1 flex items-center justify-center gap-2 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
          <Icon
            config={{ name: 'MdiCommentOutline' }}
            className="w-5 h-5"
          />
          <span className="text-sm font-medium">Comment</span>
        </button>

        <button className="flex-1 flex items-center justify-center gap-2 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
          <Icon
            config={{ name: 'MdiShareOutline' }}
            className="w-5 h-5"
          />
          <span className="text-sm font-medium">Share</span>
        </button>
      </div>
    </div>
  );
}