// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ThemeProvider } from '@mui/material/styles';
import { createAtTheme } from '../theme';
import { AtLinkProvider, ExternalLink, FactGrid, PageHead, SectionHead } from '../index';

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
  it('exports the fact grid', () => {
    expect(FactGrid).toBeTypeOf('function');
  });
});
