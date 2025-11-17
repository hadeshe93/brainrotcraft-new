import { LanguageCode } from '@/types/lang';
import MarkdownRenderer from '../markdown-renderer';
import { BlogPost as BlogPostType } from '@/types/blocks/blog';
import { cn } from '@/lib/utils';

interface BlogPostProps {
  locale: LanguageCode;
  className?: string;
  config: {
    post: BlogPostType;
  };
}

export default function BlogPost({ locale, config, className }: BlogPostProps) {
  const { post } = config;
  return (
    <article className={cn('max-w-4xl mx-auto blog-article', className)}>
      {/* Article Header */}
      <header className="text-center">
        <h1 className="text-4xl font-bold mb-4">
          {post.title}
        </h1>
        <p className="text-base text-neutral-content mb-8">
          {post.description}
        </p>
        <div className="flex items-center justify-center text-sm text-neutral-content space-x-4">
          <time dateTime={post.publishDate}>
            {/* {formatDate(post.info.publishDate)} */}
            {post.publishDate}
          </time>
          <span>·</span>
          <div className="flex items-center space-x-2">
            <div  className="block w-6 h-6 overflow-hidden rounded-full">
              <img src={post.author.avatar} alt={post.author.username} className="w-full h-full object-cover" />
            </div>
            <span>{post.author.username}</span>
          </div>
          {/* <Link locale={locale} href={`/about#author-${post.info.author.id}`} className="flex items-center space-x-2">
            <div  className="block w-6 h-6 overflow-hidden rounded-full">
              <img src={post.info.author.avatar} alt={post.info.author.username} className="w-full h-full object-cover" />
            </div>
            <span>{post.info.author.username}</span>
          </Link> */}
          <span>·</span>
          <span>{post.readingTime}</span>
        </div>
      </header>


      {/* Article Content */}
      <MarkdownRenderer config={{ content: post.content }} className='!max-w-full' />
    </article>
  );
}