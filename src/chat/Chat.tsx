import { useLayoutEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { textSize, tokens } from '../tokens';
import { ChatComposer, type ChatComposerProps } from './ChatComposer';
import { ChatMessageLine, type ChatLineMessage, type ChatMessageLineProps } from './ChatMessageLine';

const { color } = tokens;

export interface ChatProps<M extends ChatLineMessage & { id: string | number }> {
  messages: M[];
  /** Who is reading: their messages sit on the right. */
  myId?: string | null;
  /** Rejects to keep the draft; the app shows the error. */
  onSend: (body: string) => Promise<void> | void;
  /** Scrolled to the top, for older messages. */
  onLoadOlder?: () => Promise<void>;
  onDraft?: (value: string) => void;
  placeholder?: string;
  emptyText?: string;
  label?: string;
  /** Read only: this text instead of the input. */
  readOnlyText?: string;
  typingText?: string;
  lineProps?: (message: M) => Partial<ChatMessageLineProps>;
  composerProps?: Partial<Pick<ChatComposerProps, 'maxLength' | 'sendLabel' | 'emojiLabels'>>;
}

/**
 * A whole chat: the messages and the composer. It holds no connection: give it
 * the messages and a way to send, from any backend. Fills its parent's height.
 */
export function Chat<M extends ChatLineMessage & { id: string | number }>({
  messages,
  myId = null,
  onSend,
  onLoadOlder,
  onDraft,
  placeholder = 'Write a message',
  emptyText = 'No messages yet.',
  label = 'Chat',
  readOnlyText,
  typingText,
  lineProps,
  composerProps,
}: ChatProps<M>) {
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const log = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const input = useRef<HTMLInputElement>(null);

  // Keep the newest message in view unless the reader scrolled up.
  useLayoutEffect(() => {
    const el = log.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const onScroll = () => {
    const el = log.current;
    if (!el) return;
    stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    if (el.scrollTop < 40 && onLoadOlder) {
      const before = el.scrollHeight;
      void onLoadOlder().then(() => {
        // Keep the reader's place when the older page lands above.
        requestAnimationFrame(() => {
          if (log.current) log.current.scrollTop += log.current.scrollHeight - before;
        });
      });
    }
  };

  const submit = async () => {
    setSending(true);
    stick.current = true;
    try {
      await onSend(draft);
      setDraft('');
    } catch {
      // The draft stays, to try again; the app says what went wrong.
    } finally {
      setSending(false);
      input.current?.focus();
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <Box
        ref={log}
        role="log"
        aria-live="polite"
        aria-label={label}
        data-testid="chat-log"
        onScroll={onScroll}
        sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: 2.25, py: 2, display: 'flex', flexDirection: 'column', gap: 1.75 }}
      >
        {messages.length === 0 && (
          <Typography sx={{ color: color.muted, fontSize: textSize.md, m: 'auto', textAlign: 'center', maxWidth: 280 }}>
            {emptyText}
          </Typography>
        )}
        {messages.map((m) => (
          <ChatMessageLine
            key={m.id}
            message={m}
            mine={myId !== null && m.senderId === myId && m.senderKind !== 'system'}
            {...lineProps?.(m)}
          />
        ))}
      </Box>
      <Box sx={{ px: 1.75, pt: 1.5, pb: 1.75, borderTop: `1px solid ${color.rule}`, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        {typingText && (
          <Typography aria-live="polite" data-testid="chat-typing" sx={{ fontSize: '0.75rem', color: color.muted, mt: -0.5 }}>
            {typingText}
          </Typography>
        )}
        {readOnlyText ? (
          <Typography sx={{ fontSize: textSize.sm, color: color.muted }}>{readOnlyText}</Typography>
        ) : (
          <ChatComposer
            draft={draft}
            onDraft={(value) => {
              setDraft(value);
              onDraft?.(value);
            }}
            onSubmit={() => void submit()}
            sending={sending}
            placeholder={placeholder}
            inputRef={input}
            {...composerProps}
          />
        )}
      </Box>
    </Box>
  );
}
