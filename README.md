# Auto Tournament design system

`@auto-tournament/ui`: the tokens, themes and shared components of Auto Tournament's platform and website. One change here, and each app bumps the version.

```bash
npm install @auto-tournament/ui
```

```ts
import { themeVars, tokens } from '@auto-tournament/ui';

Object.entries(themeVars('ember')).forEach(([k, v]) => document.documentElement.style.setProperty(k, v));
```

Colours in `tokens.color` are CSS variables, with Ember as the fallback when an app sets none.

## Release

Bump `version` in `package.json`, merge, then tag that commit `v1.2.3`. The tag publishes it.

## License

[PolyForm Noncommercial 1.0.0](LICENSE).
