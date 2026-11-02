import { createContext, useContext, useMemo, type ElementType, type ReactNode } from 'react';

interface AtLinkValue {
  component: ElementType;
  /** The prop the router's link takes its address in: `to` or `href`. */
  prop: 'to' | 'href';
}

const AtLinkContext = createContext<AtLinkValue>({ component: 'a', prop: 'href' });

/** Which link in-app links use, so the kit works with any router. Plain `<a>` without it. */
export function AtLinkProvider({
  component,
  prop = 'href',
  children,
}: {
  component: ElementType;
  prop?: AtLinkValue['prop'];
  children: ReactNode;
}) {
  const value = useMemo(() => ({ component, prop }), [component, prop]);
  return <AtLinkContext.Provider value={value}>{children}</AtLinkContext.Provider>;
}

/** The props that make a MUI `component` link go to an in-app address. */
export function useAtLink(): (address: string) => Record<string, unknown> {
  const { component, prop } = useContext(AtLinkContext);
  return (address) => ({ component, [prop]: address });
}
