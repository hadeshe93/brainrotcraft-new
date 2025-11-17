import LucideCalendar1 from '~icons/lucide/calendar-1';
import LucideClock from '~icons/lucide/clock';
import { Link } from '@/i18n/navigation';
import { LanguageCode } from '@/types/lang';
import { BlogListItem } from '@/types/blocks/blog';
import { cn } from '@/lib/utils';

interface BlogListProps {
  locale: LanguageCode;
  className?: string;
  config: {
    posts: Array<BlogListItem>;
  };
}

export default function BlogList({ locale, className, config }: BlogListProps) {
  const { posts } = config;
  return (
    <div className={cn('max-w-4xl mx-auto', className)}>
      <div className="space-y-8">
        {posts.map((post) => (
          <article
            key={post.slug}
            className="rounded-xl overflow-hidden transition-all duration-300 border border-neutral backdrop-blur-sm w-full"
          >
            <div className="block h-full">
              <div className="p-4 md:px-8 md:py-6 flex flex-col h-full">
                <Link locale={locale} href={`/blog/${post.slug}`} className="block h-full cursor-pointer">
                  {/* 文章标题 */}
                  <h2 className="text-lg md:text-xl font-bold text-base-content hover:text-primary transition-colors mb-2">
                    {post.title}
                  </h2>

                  {/* 文章描述 */}
                  <p className="text-sm md:text-base text-neutral-content mb-4 line-clamp-3">
                    {post.description}
                  </p>
                </Link>

                {/* 文章元信息 */}
                <div className="flex items-center justify-between text-xs md:text-sm text-neutral-content pt-2 border-t border-neutral">
                  <div className="flex items-center space-x-3">
                    <img
                      src={post.author.avatar}
                      alt={post.author.username}
                      className="inline-block bg-neutral rounded-full w-8 h-8"
                    />
                    <span className="">{post.author.username}</span>
                  </div>
                  {/* <Link className="flex items-center space-x-3" locale={locale} href={`/about#author-${post.info.author.id}`}>
                    <img
                      src={post.info.author.avatar}
                      alt={post.info.author.username}
                      className="inline-block bg-neutral rounded-full w-8 h-8"
                    />
                    <span className="">{post.info.author.username}</span>
                  </Link> */}

                  <div className="flex items-center space-x-6">
                    <span className="flex items-center">
                      <LucideCalendar1 className="w-5 h-5 mr-2" />
                      <time dateTime={post.publishDate} className="">
                        {post.publishDate}
                      </time>
                    </span>
                    <span className="flex items-center">
                      <LucideClock className="w-5 h-5 mr-2" />
                      {post.readingTime}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
