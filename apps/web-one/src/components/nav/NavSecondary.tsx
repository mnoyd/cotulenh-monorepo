import * as React from 'react';

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from '@/components/ui/sidebar';
import { NavData } from '@/components/nav/AppSidebar';
import { useTranslations } from 'next-intl';

export function NavSecondary({
  items,
  ...props
}: {
  items: NavData['navSecondary'];
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  const t = useTranslations('nav');

  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild size="sm">
                <a href={item.url}>
                  <item.icon />
                  <span>{t(item.title)}</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
