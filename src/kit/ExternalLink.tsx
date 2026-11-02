import type { ReactNode } from 'react';
import Link, { type LinkProps } from '@mui/material/Link';
import { ArrowSquareOutIcon } from '@phosphor-icons/react';
import { Box } from '@mui/material';

/** Read by a screen reader, not shown. */
export const visuallyHidden = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
} as const;

export interface ExternalLinkProps extends Omit<LinkProps, 'href' | 'target' | 'rel' | 'children'> {
  href: string;
  children: ReactNode;
  /** For a link whose content already shows an external-open icon of its own. */
  hideIcon?: boolean;
  /** Read by a screen reader. */
  newTabLabel?: string;
  'data-testid'?: string;
}

/**
 * A link that leaves the app: always `target="_blank"` with
 * `rel="noopener noreferrer"`, the open-in-new arrow, and a visually hidden
 * "(opens in a new tab)" for screen readers. Every link out of the platform
 * should be this, never a button — see `ManageRail`'s Documentation link for
 * the pattern this generalizes.
 */
export function ExternalLink({
  href,
  children,
  hideIcon,
  newTabLabel = '(opens in a new tab)',
  sx,
  ...rest
}: ExternalLinkProps) {
  return (
    <Link href={href} target="_blank" rel="noopener noreferrer" sx={sx} {...rest}>
      {children}
      {!hideIcon && (
        <Box component={ArrowSquareOutIcon} size="0.9em" aria-hidden sx={{ ml: 0.5, verticalAlign: 'middle' }} />
      )}
      <span style={visuallyHidden}> {newTabLabel}</span>
    </Link>
  );
}
