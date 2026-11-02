import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import { fontDisplay, radii, tokens } from '../tokens';

const { color } = tokens;

/** One number with its label, as on a dashboard. */
export function StatCard({
  label,
  value,
  children,
}: {
  label: string;
  value: ReactNode;
  children?: ReactNode;
}) {
  return (
    <Box
      sx={{
        bgcolor: color.paper2,
        border: `1px solid ${color.rule}`,
        borderRadius: radii.lg,
        p: { xs: 2.5, md: 3 },
        display: 'grid',
        gap: 1,
        alignContent: 'start',
        minWidth: 0,
      }}
    >
      <Box sx={{ color: color.muted, fontSize: '0.8125rem' }}>{label}</Box>
      <Box sx={{ fontFamily: fontDisplay, fontWeight: 600, fontSize: { xs: '1.25rem', md: '1.375rem' }, color: color.ink, overflowWrap: 'anywhere' }}>
        {value}
      </Box>
      {children && <Box sx={{ color: color.ink2, fontSize: '0.875rem' }}>{children}</Box>}
    </Box>
  );
}

const TONES = {
  good: color.live,
  warn: color.warning,
  bad: color.ban,
  muted: color.muted,
  neutral: color.ink2,
} as const;

/** A state with a dot: "Active", "Payment due". */
export function StatusPill({
  tone = 'neutral',
  children,
}: {
  tone?: keyof typeof TONES;
  children: ReactNode;
}) {
  const shade = TONES[tone];
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignSelf: 'flex-start',
        alignItems: 'center',
        gap: 0.75,
        px: 1.25,
        py: 0.5,
        borderRadius: radii.pill,
        border: `1px solid ${shade}`,
        color: shade,
        fontSize: '0.8125rem',
        fontWeight: 500,
      }}
    >
      <Box component="span" sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: shade }} />
      {children}
    </Box>
  );
}
