// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ThemeProvider } from '@mui/material/styles';
import { createAtTheme } from '../theme';
import { Chat } from './Chat';
import { ChatMessageLine } from './ChatMessageLine';
import { insertAt, searchEmoji } from './emojiData';
import { addTypist, typingLine } from './typing';

const render = (node: React.ReactNode) =>
  renderToStaticMarkup(<ThemeProvider theme={createAtTheme()}>{node}</ThemeProvider>);
const message = (over = {}) => ({
  id: 1,
  senderId: 'a',
  senderKind: 'player',
  senderName: 'Sam',
  body: 'gg',
  createdAt: 1000,
  ...over,
});

describe('chat', () => {
  it('shows your own messages as yours', () => {
    expect(render(<Chat messages={[message()]} myId="a" onSend={() => undefined} />)).toContain('data-mine="true"');
    expect(render(<Chat messages={[message()]} myId="b" onSend={() => undefined} />)).toContain('data-kind="friend"');
  });
  it('says so when empty, and holds no input when read only', () => {
    const html = render(<Chat messages={[]} onSend={() => undefined} emptyText="Quiet" readOnlyText="Read only" />);
    expect(html).toContain('Quiet');
    expect(html).toContain('Read only');
    expect(html).not.toContain('chat-input');
  });
  it('marks system lines and admins', () => {
    expect(render(<ChatMessageLine message={message({ senderKind: 'system' })} />)).toContain('chat-system-line');
    expect(render(<ChatMessageLine message={message({ senderKind: 'admin' })} adminLabel="Staff" />)).toContain('Staff');
  });
  it('links a name only when given where to', () => {
    expect(render(<ChatMessageLine message={message()} />)).not.toContain('chat-sender-link');
    expect(render(<ChatMessageLine message={message()} profilePath={(id) => `/p/${id}`} />)).toContain('href="/p/a"');
  });
  it('escapes what people write', () => {
    expect(render(<ChatMessageLine message={message({ body: '<img src=x>' })} />)).not.toContain('<img');
  });
  it('keeps the helpers', () => {
    expect(insertAt('ab', 'X', 1, 1).value).toBe('aXb');
    expect(searchEmoji('fire').length).toBeGreaterThan(0);
    expect(typingLine([], () => '')).toBe('');
    expect(addTypist).toBeTypeOf('function');
  });
});
