// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ThemeProvider } from '@mui/material/styles';
import { createAtTheme } from '../theme';
import { AtLinkProvider, ExternalLink, FactGrid, PageHead, PlayerAvatar, ProviderLogo, SectionHead, StatCard, StatusPill, DataTable, Badge, CompatDot, compatTone, playerInitials, CodeBlock, Crumbs, DetailList, Disclosure, MarkPill, Reveal, StatePill } from '../index';

const render = (node: React.ReactNode) =>
  renderToStaticMarkup(<ThemeProvider theme={createAtTheme()}>{node}</ThemeProvider>);

describe('kit', () => {
  it('renders a page head', () => {
    expect(render(<PageHead title="Teams" />)).toContain('<h1');
  });
  it('links with a plain anchor without a provider', () => {
    expect(render(<SectionHead title="T" link={{ to: '/x', label: 'All' }} />)).toContain('href="/x"');
  });
  it("uses the app's link and its prop", () => {
    const Fake = ({ to, children }: { to: string; children: React.ReactNode }) => <a data-to={to}>{children}</a>;
    const html = render(
      <AtLinkProvider component={Fake} prop="to">
        <SectionHead title="T" link={{ to: '/x', label: 'All' }} />
      </AtLinkProvider>
    );
    expect(html).toContain('data-to="/x"');
  });
  it('labels a link that leaves the app', () => {
    const html = render(<ExternalLink href="https://example.com">Docs</ExternalLink>);
    expect(html).toContain('target="_blank"');
    expect(html).toContain('(opens in a new tab)');
  });
  it('draws sign-in logos, and nothing for an unknown provider', () => {
    expect(render(<ProviderLogo id="steam" />)).toContain('<path');
    expect(render(<ProviderLogo id="google" />)).toContain('#EA4335');
    expect(render(<ProviderLogo id="nope" />)).toBe('');
  });
  it('renders stats and states', () => {
    expect(render(<StatCard label="Servers" value={4} />)).toContain('Servers');
    expect(render(<StatusPill tone="good">Active</StatusPill>)).toContain('Active');
  });
  it('falls back to initials, and uses the generated picture when given', () => {
    expect(playerInitials('Sam Berg')).toBe('SB');
    expect(render(<PlayerAvatar name="Sam Berg" />)).toContain('SB');
    expect(render(<PlayerAvatar name="S" id="7" generatedSrc={(id) => `/a/${id}.svg`} />)).toContain('/a/7.svg');
  });
  it('labels table cells for phones, and says when empty', () => {
    const columns = [{ key: 'a', label: 'Name' }];
    expect(render(<DataTable label="T" columns={columns} rows={[{ key: '1', cells: { a: 'x' } }]} />)).toContain('data-label="Name"');
    expect(render(<DataTable label="T" columns={columns} rows={[]} empty="None" />)).toContain('None');
  });
  it('maps states to tones', () => {
    expect(compatTone('pending')).toBe('warn');
    expect(compatTone(null)).toBe('none');
    expect(render(<Badge tone="good">OK</Badge>)).toContain('OK');
    expect(CompatDot).toBeTypeOf('function');
  });
  it('marks the current page in the crumbs', () => {
    const html = render(<Crumbs items={[{ label: 'Games', href: '/games' }, { label: 'CS2', href: '/games/cs2' }]} />);
    expect(html).toContain('href="/games"');
    expect(html).toContain('aria-current="page"');
  });
  it('renders the rest', () => {
    expect(render(<DetailList rows={[['Key', 'Value']]} />)).toContain('<dt');
    expect(render(<CodeBlock code="ls" />)).toContain('ls');
    expect(render(<Disclosure id="a" title="T">x</Disclosure>)).toContain('a-summary');
    expect(render(<StatePill state="live" label="Live" />)).toContain('Live');
    expect(render(<MarkPill>M</MarkPill>)).toContain('M');
    expect(render(<Reveal>r</Reveal>)).toContain('r');
  });
  it('exports the fact grid', () => {
    expect(FactGrid).toBeTypeOf('function');
  });
});
