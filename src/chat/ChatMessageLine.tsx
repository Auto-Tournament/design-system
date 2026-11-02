import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useAtLink } from '../kit/link';
import { fontDisplay, radii, textSize, tokens, withRgbAlpha } from '../tokens';

const { color } = tokens;
const enemy = color.info;
const admin = color.sideT;

export interface ChatLineMessage {
  senderId: string | null;
  senderKind: 'player' | 'admin' | 'system' | string;
  senderName: string;
  senderAvatar?: string | null;
  body: string;
  /** Epoch seconds. */
  createdAt: number;
}

function ShieldIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z" />
    </svg>
  );
}

function ChatAvatar({ message, overlay }: { message: ChatLineMessage; overlay?: ReactNode }) {
  const isAdmin = message.senderKind === 'admin';
  const picture = isAdmin ? null : message.senderAvatar;
  return (
    <Box sx={{ position: 'relative', width: 32, height: 32, flex: 'none' }}>
      <Box
        aria-hidden
        sx={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          fontFamily: fontDisplay,
          fontWeight: 600,
          fontSize: textSize.sm,
          bgcolor: isAdmin ? withRgbAlpha(admin, 0.16) : color.paper3,
          color: isAdmin ? admin : color.ink,
          backgroundImage: picture ? `url(${picture})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {isAdmin ? <ShieldIcon /> : picture ? null : (message.senderName.trim()[0] ?? '?').toUpperCase()}
      </Box>
      {overlay}
    </Box>
  );
}

export interface ChatMessageLineProps {
  message: ChatLineMessage;
  mine?: boolean;
  /** The other team, in a match: its own colour. */
  isEnemy?: boolean;
  teamName?: string | null;
  /** Epoch seconds to a clock. */
  formatTime?: (seconds: number) => string;
  /** A system line's text, for apps that store them as keys. */
  systemText?: (body: string) => string;
  /** Where a player's name goes; plain text without it. */
  profilePath?: (playerId: string) => string;
  /** On the avatar: a presence dot, say. */
  avatarOverlay?: ReactNode;
  youLabel?: string;
  adminLabel?: string;
}

const defaultClock = (seconds: number) =>
  new Date(seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/** One line of a chat: a system note, your own bubble, or someone else's. */
export function ChatMessageLine({
  message,
  mine = false,
  isEnemy = false,
  teamName = null,
  formatTime = defaultClock,
  systemText = (body) => body,
  profilePath,
  avatarOverlay,
  youLabel = 'You',
  adminLabel = 'Admin',
}: ChatMessageLineProps) {
  const linkTo = useAtLink();
  if (message.senderKind === 'system') {
    return (
      <Typography
        component="div"
        data-testid="chat-system-line"
        sx={{
          alignSelf: 'center',
          fontSize: textSize.xs,
          color: color.muted,
          px: 1.5,
          py: 0.6,
          borderRadius: radii.pill,
          bgcolor: color.paper3,
          textAlign: 'center',
        }}
      >
        {systemText(message.body)}
      </Typography>
    );
  }
  if (mine) {
    return (
      <Box
        data-testid="chat-message"
        data-mine="true"
        sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 32px', gap: 1.25 }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5, minWidth: 0 }}>
          <Typography sx={{ fontSize: textSize.sm, color: color.muted }}>
            {youLabel} · {formatTime(message.createdAt)}
          </Typography>
          <Box
            sx={{
              maxWidth: '100%',
              px: 1.5,
              py: 1.1,
              borderRadius: '14px 4px 14px 14px',
              bgcolor: color.accent,
              color: color.accentInk,
              fontSize: textSize.md,
              overflowWrap: 'anywhere',
              whiteSpace: 'pre-wrap',
            }}
          >
            {message.body}
          </Box>
        </Box>
        <ChatAvatar message={message} overlay={avatarOverlay} />
      </Box>
    );
  }
  const isAdmin = message.senderKind === 'admin';
  const nameColor = isAdmin ? admin : isEnemy ? enemy : color.ink;
  const bubble = isAdmin ? withRgbAlpha(admin, 0.16) : isEnemy ? withRgbAlpha(enemy, 0.14) : color.paper3;
  const canLink = profilePath && message.senderId && message.senderKind === 'player';
  return (
    <Box
      data-testid="chat-message"
      data-kind={isAdmin ? 'admin' : isEnemy ? 'enemy' : 'friend'}
      sx={{ display: 'grid', gridTemplateColumns: '32px minmax(0, 1fr)', gap: 1.25 }}
    >
      <ChatAvatar message={message} overlay={avatarOverlay} />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: 0 }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'baseline', fontSize: textSize.sm, flexWrap: 'wrap' }}>
          {canLink ? (
            <Box
              {...linkTo(profilePath(message.senderId as string))}
              data-testid="chat-sender-link"
              sx={{
                fontWeight: 600,
                color: nameColor,
                textDecoration: 'none',
                '&:hover, &:focus-visible': { textDecoration: 'underline' },
              }}
            >
              {message.senderName}
            </Box>
          ) : (
            <Box component="span" sx={{ fontWeight: 600, color: nameColor }}>
              {message.senderName}
            </Box>
          )}
          {isAdmin && (
            <Box
              component="span"
              sx={{
                px: 0.9,
                borderRadius: radii.pill,
                bgcolor: withRgbAlpha(admin, 0.16),
                color: admin,
                fontSize: '0.6875rem',
                fontWeight: 600,
              }}
            >
              {adminLabel}
            </Box>
          )}
          <Box component="span" sx={{ color: color.muted }}>
            {teamName ? `${teamName} · ` : ''}
            {formatTime(message.createdAt)}
          </Box>
        </Box>
        <Box
          sx={{
            alignSelf: 'flex-start',
            maxWidth: '100%',
            px: 1.5,
            py: 1.1,
            borderRadius: '4px 14px 14px 14px',
            bgcolor: bubble,
            fontSize: textSize.md,
            overflowWrap: 'anywhere',
            whiteSpace: 'pre-wrap',
          }}
        >
          {message.body}
        </Box>
      </Box>
    </Box>
  );
}
