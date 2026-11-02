// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ThemeProvider } from '@mui/material/styles';
import { createAtTheme } from '../theme';
import { AtLinkProvider, ExternalLink, FactGrid, PageHead, ProviderLogo, SectionHead, StatCard, StatusPill } from '../index';

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
  it('exports the fact grid', () => {
    expect(FactGrid).toBeTypeOf('function');
  });
});
