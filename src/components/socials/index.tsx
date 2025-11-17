'use client';

import InstagramMockup from './instagram';
import TwitterMockup from './twitter';
import FacebookMockup from './facebook';

export { InstagramMockup, TwitterMockup, FacebookMockup };

export type SocialPlatform = 'instagram' | 'twitter' | 'facebook';

interface SocialMockupProps {
  platform: SocialPlatform;
  imageUrl: string;
  username?: string;
  userAvatar?: string;
  text?: string;
  className?: string;
}

export default function SocialMockup({
  platform,
  imageUrl,
  username,
  userAvatar,
  text,
  className,
}: SocialMockupProps) {
  const commonProps = {
    imageUrl,
    username,
    userAvatar,
    className,
  };

  switch (platform) {
    case 'instagram':
      return (
        <InstagramMockup
          {...commonProps}
          text={text}
        />
      );
    case 'twitter':
      return (
        <TwitterMockup
          {...commonProps}
          text={text}
        />
      );
    case 'facebook':
      return (
        <FacebookMockup
          {...commonProps}
          text={text}
        />
      );
    default:
      return null;
  }
}