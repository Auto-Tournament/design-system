// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ThemeProvider } from '@mui/material/styles';
import { createAtTheme } from '../theme';
import { AtLinkProvider, ExternalLink, FactGrid, PageHead, PlayerAvatar, ProviderLogo, SectionHead, StatCard, StatusPill, DataTable, Badge, CompatDot, compatTone, playerInitials, CodeBlock, Crumbs, DetailList, Disclosure, MarkPill, Reveal, StatePill, AvatarDot, BracketCard, EventMark, HighlightCard, ProfileCard, RatingChart, ServersCard, UsageMeter, VetoCard, clock } from '../index';

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
  it('renders clip cards and timeline marks', () => {
    expect(render(<HighlightCard to="/c/1" title="Ace" sub="Round 1" video="/1.mp4" />)).toContain('href="/c/1"');
    expect(render(<EventMark at="50%" kind="kill" title="Kill" />)).toContain('Kill');
    expect(clock(65)).toBe('1:05');
  });
  it('draws a rating chart, or says there is no history', () => {
    const points = [{ eloAfter: 1000, createdAt: 1 }, { eloAfter: 1100, createdAt: 2 }];
    expect(render(<RatingChart history={points} chartLabel={(a, b) => `${a}-${b}`} />)).toContain('1000-1100');
    expect(render(<RatingChart history={[]} noHistoryText="None" />)).toContain('None');
  });
  it('turns the meter red only past the limit, and renders the status dot', () => {
    expect(render(<UsageMeter used={2} max={4} of="of 4" />)).toContain('of 4');
    expect(render(<AvatarDot shade="#0f0" label="Online" size={32} />)).toContain('Online');
  });
  it('renders the demo cards', () => {
    for (const Card of [BracketCard, VetoCard, ServersCard, ProfileCard]) expect(render(<Card />).length).toBeGreaterThan(100);
  });
  it('exports the fact grid', () => {
    expect(FactGrid).toBeTypeOf('function');
  });
});
