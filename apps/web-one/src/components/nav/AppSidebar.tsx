import * as React from 'react';
import { BookOpen, Command, LifeBuoy, Send, SquareTerminal, Users } from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from '@/components/ui/sidebar';
import { NavMain } from '@/components/nav/NavMain';
import { NavSecondary } from '@/components/nav/NavSecondary';
import { NavUser } from '@/components/nav/NavUser';
import LanguageSelector from '@/components/LanguageSelector';
import ThemeToggle from '@/components/ThemeToggle';
import Link from 'next/link';
import { Messages, useTranslations } from 'next-intl';

import type { LucideIcon } from 'lucide-react';

export type NavData = {
  user: {
    name: string;
    email: string;
  };
  navMain: {
    title: keyof Messages['nav'];
    url: string;
    icon: LucideIcon;
    isActive?: boolean;
    items: {
      title: keyof Messages['nav'];
      url: string;
    }[];
  }[];
  navSecondary: {
    title: keyof Messages['nav'];
    url: string;
    icon: LucideIcon;
  }[];
};

const navData: NavData = {
  user: {
    name: 'shadcn',
    email: 'm@example.com'
  },
  navMain: [
    {
      title: 'play',
      url: '/play',
      icon: SquareTerminal,

      items: [
        {
          title: 'findMatch',
          url: '/find'
        },
        {
          title: 'playWithBot',
          url: '/bot'
        },
        {
          title: 'history',
          url: '/history'
        }
      ]
    },
    {
      title: 'learn',
      url: '/learn',
      icon: BookOpen,

      items: [
        {
          title: 'rules',
          url: '/rules'
        },
        {
          title: 'coach',
          url: '/coach'
        },
        {
          title: 'tutorials',
          url: '/tutorials'
        }
      ]
    },
    {
      title: 'community',
      url: '/community',
      icon: Users,

      items: [
        {
          title: 'clubs',
          url: '/clubs'
        },
        {
          title: 'forums',
          url: '/forums'
        },
        {
          title: 'members',
          url: '/members'
        },
        {
          title: 'blogs',
          url: '/blogs'
        }
      ]
    }
  ],
  navSecondary: [
    {
      title: 'support',
      url: '#',
      icon: LifeBuoy
    },
    {
      title: 'feedback',
      url: '#',
      icon: Send
    }
  ]
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const t = useTranslations();

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Command className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{t('main.title')}</span>
                  <span className="truncate text-xs">Cotulenh.vn</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navData.navMain} />
        <NavSecondary items={navData.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <div className="flex justify-between items-center">
          <LanguageSelector />
          <ThemeToggle />
        </div>
        <NavUser user={navData.user} />
      </SidebarFooter>
    </Sidebar>
  );
}
