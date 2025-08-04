'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Link, usePathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';

function LanguageSelector() {
  const currentLocale = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations('locale');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-16 uppercase">
          {currentLocale}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {routing.locales.map((locale) => (
          <DropdownMenuItem key={locale} className="p-0">
            <Link
              href={{
                pathname,
                query: Object.fromEntries(searchParams.entries())
              }}
              locale={locale}
              className={`w-full px-2 py-1.5 capitalize ${
                currentLocale === locale ? 'bg-accent text-accent-foreground' : ''
              }`}
            >
              {t(locale)}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default LanguageSelector;
