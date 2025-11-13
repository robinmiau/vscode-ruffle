# VS Code Ruffle Extension

A VS Code extension that provides a custom editor for SWF (Flash) files using [Ruffle](https://ruffle.rs/), a Flash Player emulator.

> **Note**: This is an unofficial, community-created extension and is not affiliated with or endorsed by the official Ruffle project.

![VS Code Ruffle Extension showing SWF file with Ruffle logo animation](https://raw.githubusercontent.com/robinmiau/vscode-ruffle/main/screenshot.png)

## Features

- **SWF File Player**: Open and play SWF files directly in VS Code using Ruffle
- **Offline Support**: Works completely offline with Ruffle bundled directly in the extension
- **Status Bar Information**: Display detailed metadata including dimensions, file size, frame count, FPS, SWF version, and ActionScript type
- **Configurable Settings**: Customize autoplay, scaling, quality, and other Ruffle options
- **Responsive Design**: Automatic scaling for different screen sizes
- **Live Reload**: Automatically reload SWF when the file changes
- **Local Resource Loading**: Support for loading additional SWF files and resources required by the main SWF file

## Requirements

- VS Code 1.103.0 or higher

## Extension Settings

This extension contributes the following settings:

- `ruffle.autoplay`: Control autoplay behavior (`"on"`, `"off"`, `"auto"`)
- `ruffle.allowScriptAccess`: Allow ActionScript access (`true`/`false`)
- `ruffle.letterbox`: Letterbox handling (`"fullscreen"`, `"on"`, `"off"`)
- `ruffle.contextMenu`: Show context menu (`"on"`, `"off"`)
- `ruffle.scale`: Scaling mode (`"showAll"`, `"exactFit"`, `"noBorder"`, `"noScale"`)
- `ruffle.quality`: Rendering quality (`"low"`, `"medium"`, `"high"`, `"best"`)

## Development

### Releasing

This project uses automated releases with GitHub Actions. To create a new release:

1. **Bump the version and generate changelog:**
   ```bash
   npm version patch  # or minor, or major
   ```
   This automatically runs `npm run changelog` and commits the updated `CHANGELOG.md`

2. **Push the version commit and tag:**
   ```bash
   git push && git push --tags
   ```

3. **Automated workflow:**
   - The GitHub Actions workflow triggers on the pushed tag
   - Builds and packages the extension
   - Creates a GitHub release with the `.vsix` file
   - Publishes to VS Code Marketplace (if `VSCE_PAT` secret is configured)

**Note:** Dependabot PRs that update `@ruffle-rs/ruffle` automatically trigger a patch version bump and release when merged.

## Acknowledgments

This extension uses:
- [Ruffle](https://ruffle.rs/) - A Flash Player emulator written in Rust
- The Ruffle logo and branding (used with respect to the Ruffle project)

Special thanks to the Ruffle development team for creating an amazing tool for Flash content preservation.

## License

MIT License - see [LICENSE](LICENSE) file for details.
