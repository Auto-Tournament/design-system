import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import type { ReactNode } from 'react';
import { fontDisplay, radii, tokens } from '../tokens';

const { color } = tokens;

/** The status dot on an avatar's corner. The avatar's size scales it. */
export function AvatarDot({
  shade,
  label,
  size,
  corner = 'bottom',
  testId,
  state,
}: {
  shade: string;
  label: string;
  size: number;
  corner?: 'bottom' | 'top';
  testId?: string;
  state?: string;
}) {
  const dot = Math.min(14, Math.max(8, Math.round(size * 0.28)));
  const ring = size >= 56 ? 3 : 2;
  return (
    <Tooltip title={label}>
      <Box
        component="span"
        role="img"
        aria-label={label}
        data-testid={testId}
        data-presence={state}
        sx={{
          position: 'absolute',
          right: size >= 56 ? '4%' : -1,
          [corner]: size >= 56 ? '4%' : -1,
          width: dot,
          height: dot,
          borderRadius: '50%',
          bgcolor: shade,
          boxShadow: `0 0 0 ${ring}px ${color.paper}`,
        }}
      />
    </Tooltip>
  );
}

/** How much of something is used: a big number, what it's of, and a bar that turns red past the limit. */
export function UsageMeter({ used, max, of }: { used: number; max: number; of: ReactNode }) {
  const pct = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0;
  const over = used > max;
  return (
    <Box sx={{ display: 'grid', gap: 1.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.25, flexWrap: 'wrap' }}>
        <Box sx={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: '2.5rem', lineHeight: 1, color: over ? color.ban : color.ink }}>
          {used}
        </Box>
        <Box sx={{ color: color.ink2 }}>{of}</Box>
      </Box>
      <Box aria-hidden sx={{ height: 10, borderRadius: radii.pill, bgcolor: color.paper3, overflow: 'hidden' }}>
        <Box sx={{ width: `${pct}%`, height: '100%', bgcolor: over ? color.ban : color.accent, borderRadius: radii.pill }} />
      </Box>
    </Box>
  );
}
