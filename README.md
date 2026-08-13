# ngx-edit-images

Angular workspace for **`@ebdev/ngx-image-editor`** — a professional image editor
with a free forever tier and offline Ed25519-licensed premium tools.

Homepage: [ngx-image-editor.ebdev-design.com](https://ngx-image-editor.ebdev-design.com/)

## Projects

| Project | Path | Description |
| --- | --- | --- |
| `ngx-image-editor` | `projects/ngx-image-editor` | Publishable library |
| `demo` | `projects/demo` | Dark marketing demo app |

## Scripts

```bash
npm start          # serve the demo
npm run build      # build the library
npm run build:demo # build the demo app
npm test           # unit tests (Vitest)
npm run e2e        # Playwright end-to-end
npm run license    # generate a signed license key
npm run pack:lib   # build + npm pack
npm run publish:dry
```

## License tooling

```bash
# Generate a key for a customer
npm run license -- --licensee "Acme Inc" --domains "*.acme.com,localhost"

# Print a new keypair (rotate carefully)
npm run license -- --keypair
```

Private keys live under `tools/` and must never be published.

## License

See [LICENSE](./LICENSE). Free Features may be used forever, including in
commercial applications. Premium Features require a purchased license key.
