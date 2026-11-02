import { useRef, type FormEvent, type RefObject } from 'react';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import InputBase from '@mui/material/InputBase';
import { radii, textSize, tokens } from '../tokens';
import { EmojiPicker } from './EmojiPicker';
import { insertAt } from './emojiData';

const { color } = tokens;

export interface ChatComposerProps {
  draft: string;
  onDraft: (value: string) => void;
  onSubmit: () => void;
  sending?: boolean;
  placeholder: string;
  maxLength?: number;
  sendLabel?: string;
  emojiLabels?: Parameters<typeof EmojiPicker>[0]['labels'];
  /** The app's ref to the input, to focus it itself. */
  inputRef?: RefObject<HTMLInputElement | null>;
}

/** The chat's input, emoji picker and send button. */
export function ChatComposer({
  draft,
  onDraft,
  onSubmit,
  sending = false,
  placeholder,
  maxLength = 500,
  sendLabel = 'Send',
  emojiLabels,
  inputRef,
}: ChatComposerProps) {
  const own = useRef<HTMLInputElement>(null);
  const input = inputRef ?? own;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (draft.trim() && !sending) onSubmit();
  };
  return (
    <Box component="form" onSubmit={submit} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
      <InputBase
        inputRef={input}
        value={draft}
        onChange={(e) => onDraft(e.target.value.slice(0, maxLength))}
        placeholder={placeholder}
        inputProps={{ 'aria-label': placeholder, 'data-testid': 'chat-input', maxLength }}
        sx={{
          flex: 1,
          minWidth: 0,
          px: 1.75,
          py: 0.9,
          borderRadius: radii.md,
          border: `1px solid ${color.rule}`,
          bgcolor: color.paper,
          color: color.ink,
          fontSize: textSize.md,
          '&.Mui-focused': { borderColor: color.accent },
        }}
      />
      <EmojiPicker
        disabled={sending}
        labels={emojiLabels}
        onPick={(char) => {
          const el = input.current;
          const next = insertAt(draft, char, el?.selectionStart ?? null, el?.selectionEnd ?? null);
          if (next.value.length > maxLength) return;
          onDraft(next.value);
          requestAnimationFrame(() => el?.setSelectionRange(next.caret, next.caret));
        }}
        onClose={() => requestAnimationFrame(() => input.current?.focus())}
      />
      <IconButton
        type="submit"
        aria-label={sendLabel}
        data-testid="chat-send"
        disabled={sending || !draft.trim()}
        sx={{
          width: 44,
          height: 44,
          borderRadius: radii.md,
          bgcolor: color.accent,
          color: color.accentInk,
          '&:hover': { bgcolor: color.accent2 },
          '&.Mui-disabled': { bgcolor: color.paper3, color: color.muted },
        }}
      >
        {sending ? (
          <CircularProgress size={16} sx={{ color: 'inherit' }} />
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        )}
      </IconButton>
    </Box>
  );
}
