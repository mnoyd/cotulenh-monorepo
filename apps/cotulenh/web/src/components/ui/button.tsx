'use client';

import { Button as ButtonPrimitive } from '@base-ui/react/button';

import { buttonVariants, type ButtonVariants } from '@/components/ui/button-variants';
import { cn } from '@/lib/utils/cn';

function Button({
  className,
  variant = 'default',
  size = 'default',
  ...props
}: ButtonPrimitive.Props & ButtonVariants) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
