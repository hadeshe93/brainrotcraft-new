'use client';

import React, { useState, type ReactNode } from 'react';
import Icon from '../icon';
import { copyToClipboard } from '@/lib/utils';

export interface ShareLinkButtonProps {
  url?: string;
  className?: string;
  iconClassName?: string;
  beforeOnClick?: () => void | Promise<void>;
  children?: ReactNode;
}

const ShareLinkButton: React.FC<ShareLinkButtonProps> = ({
  beforeOnClick,
  url,
  className = '',
  iconClassName = '',
  children,
}) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleShare = async () => {
    const currentContent = url || window.location.href;
    const success = await copyToClipboard(currentContent);
    if (success) {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000); // Reset after 2 seconds
    }
  };

  const onClick = async () => {
    if (beforeOnClick) {
      await beforeOnClick();
    }
    handleShare();
  };

  return (
    <button
      onClick={onClick}
      className={`border-netural-content flex items-center justify-center rounded-full bg-transparent text-blue-700 transition-all ${className}`}
    >
      {children ? (
        children
      ) : (
        <>
          {isCopied ? (
            <Icon config={{ name: 'MdiCheck' }} className={iconClassName} />
          ) : (
            <Icon config={{ name: 'MdiLinkVariant' }} className={iconClassName} />
          )}
        </>
      )}
    </button>
  );
};

export default ShareLinkButton;
