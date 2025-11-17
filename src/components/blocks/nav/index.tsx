'use client';
import { LanguageCode } from '@/types/lang';
import { Link } from '@/i18n/navigation';
import type { NavItem } from '@/types/blocks/base';

import {
  NavigationMenu as NavigationMenuBase,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu';

interface NavigationMenuProps {
  locale: LanguageCode;
  items: NavItem[];
}

export function NavigationMenu({ locale, items }: NavigationMenuProps) {
  return (
    <NavigationMenuBase viewport={false}>
      <NavigationMenuList>
        {items.map((item, itemIndex) => {
          if (item.children) {
            // 有二级菜单
            return (
              <NavigationMenuItem key={itemIndex}>
                <NavigationMenuTrigger>{item.title}</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid w-[300px] gap-4">
                    <li>
                      {
                        item.children.map((child, childIndex) => {
                          return (
                            <NavigationMenuLink asChild key={childIndex}>
                              <Link href={child.link?.url || '#'} className='text-muted-foreground hover:bg-accent hover:text-accent-foreground focus:bg-accent'>
                                <div className="font-medium">{child.title}</div>
                                {
                                  child.description && (<div className="">{child.description}</div>)
                                }
                              </Link>
                            </NavigationMenuLink>
                          );
                        })
                      }
                    </li>
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
            );
          }
          // 无二级菜单
          return (
            <NavigationMenuItem key={itemIndex}>
              <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                <Link href={item.link?.url || '#'} className='text-muted-foreground hover:bg-accent hover:text-accent-foreground focus:bg-accent'>
                  {item.title}
                </Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
          );
        })}
      </NavigationMenuList>
    </NavigationMenuBase>
  );
}
