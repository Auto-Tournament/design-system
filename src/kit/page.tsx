import { useEffect, useRef, useState } from 'react';
import Box, { type BoxProps } from '@mui/material/Box';
import { useAtLink } from './link';
import { tokens } from '../tokens';

const { color, radius, ease, duration } = tokens;

/** Fades children in once they scroll into view. Honours reduced motion. */
export function Reveal({ delay = 0, sx, ...props }: BoxProps & { delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Box
      ref={ref}
      sx={{
        opacity: shown ? 1 : 0,
        transition: `opacity ${duration.slow}ms ${ease.out} ${delay}ms`,
        '@media (prefers-reduced-motion: reduce)': { opacity: 1, transition: 'none' },
        ...sx,
      }}
      {...props}
    />
  );
}

/** Product card surface used for every in-page UI preview. */
export function ProductCard({ sx, role, ...props }: BoxProps) {
  return (
    <Box
      // A div with aria-label needs an explicit role to be exposed correctly
      // (WCAG 4.1.2 / axe aria-prohibited-attr); these cards are decorative
      // illustrations labelled for screen readers, so "img" fits.
      role={role ?? ('aria-label' in props ? 'img' : undefined)}
      sx={{
        bgcolor: color.paper2,
        border: `1px solid ${color.rule}`,
        borderRadius: `${radius.lg}px`,
        p: 3,
        fontSize: '0.875rem',
        ...sx,
      }}
      {...props}
    />
  );
}

/** Where a page sits: links, the last one the page itself. */
export function Crumbs({ items }: { items: { label: string; href: string }[] }) {
  const linkTo = useAtLink();
  return (
    <Box component="nav" aria-label="Breadcrumb" sx={{ mb: 3 }}>
      <Box component="ol" sx={{ listStyle: 'none', m: 0, p: 0, display: 'flex', flexWrap: 'wrap', gap: 1, color: color.muted, fontSize: '0.875rem' }}>
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <Box component="li" key={item.href} sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
              {last ? (
                <Box component="span" aria-current="page" sx={{ color: color.ink2 }}>
                  {item.label}
                </Box>
              ) : (
                <>
                  <Box {...linkTo(item.href)} sx={{ color: 'inherit', textDecoration: 'none', '&:hover': { color: color.ink } }}>
                    {item.label}
                  </Box>
                  <span aria-hidden>/</span>
                </>
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

/** Label/value rows in a bordered box. */
export function DetailList({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <Box
      component="dl"
      sx={{
        m: 0,
        p: 2.5,
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'max-content 1fr' },
        columnGap: 3,
        rowGap: { xs: 0.25, sm: 1 },
        border: `1px solid ${color.rule}`,
        borderRadius: `${radius.lg}px`,
        bgcolor: color.paper2,
        fontSize: '0.9375rem',
        '& dt': { color: color.muted, mt: { xs: 1, sm: 0 } },
        '& dd': { m: 0, color: color.ink, overflowWrap: 'anywhere' },
      }}
    >
      {rows.map(([k, v]) => (
        <Box key={k} sx={{ display: 'contents' }}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </Box>
      ))}
    </Box>
  );
}
