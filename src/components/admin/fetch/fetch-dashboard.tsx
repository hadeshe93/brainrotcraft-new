'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import MdiFolder from '~icons/mdi/folder';
import MdiLabel from '~icons/mdi/label';
import MdiStar from '~icons/mdi/star';
import MdiGamepad from '~icons/mdi/gamepad';
import FetchCategoriesDialog from './fetch-categories-dialog';
import FetchTagsDialog from './fetch-tags-dialog';
import FetchFeaturedDialog from './fetch-featured-dialog';
import FetchGamesDialog from './fetch-games-dialog';

export default function FetchDashboard() {
  const [categoriesDialogOpen, setCategoriesDialogOpen] = useState(false);
  const [tagsDialogOpen, setTagsDialogOpen] = useState(false);
  const [featuredDialogOpen, setFeaturedDialogOpen] = useState(false);
  const [gamesDialogOpen, setGamesDialogOpen] = useState(false);

  const cards = [
    {
      icon: MdiFolder,
      title: '拉取分类',
      description: '从母站点同步分类数据',
      onClick: () => setCategoriesDialogOpen(true),
      color: 'text-blue-500',
    },
    {
      icon: MdiLabel,
      title: '拉取标签',
      description: '从母站点同步标签数据',
      onClick: () => setTagsDialogOpen(true),
      color: 'text-green-500',
    },
    {
      icon: MdiStar,
      title: '拉取特性合集',
      description: '从母站点同步特性合集数据',
      onClick: () => setFeaturedDialogOpen(true),
      color: 'text-yellow-500',
    },
    {
      icon: MdiGamepad,
      title: '拉取游戏',
      description: '从母站点同步游戏数据',
      onClick: () => setGamesDialogOpen(true),
      color: 'text-purple-500',
    },
  ];

  return (
    <>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">数据拉取管理</h2>
          <p className="text-muted-foreground">从母站点同步游戏数据到本地</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {cards.map((card, index) => {
            const Icon = card.icon;
            return (
              <Card
                key={index}
                className="cursor-pointer transition-all hover:scale-105 hover:shadow-lg"
                onClick={card.onClick}
              >
                <div className="space-y-4 p-6">
                  <div className={`bg-muted flex h-12 w-12 items-center justify-center rounded-lg ${card.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{card.title}</h3>
                    <p className="text-muted-foreground text-sm">{card.description}</p>
                  </div>
                  <div className="pt-2">
                    <button className="text-primary text-sm hover:underline">点击拉取数据 →</button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Dialogs */}
      <FetchCategoriesDialog open={categoriesDialogOpen} onOpenChange={setCategoriesDialogOpen} />
      <FetchTagsDialog open={tagsDialogOpen} onOpenChange={setTagsDialogOpen} />
      <FetchFeaturedDialog open={featuredDialogOpen} onOpenChange={setFeaturedDialogOpen} />
      <FetchGamesDialog open={gamesDialogOpen} onOpenChange={setGamesDialogOpen} />
    </>
  );
}
