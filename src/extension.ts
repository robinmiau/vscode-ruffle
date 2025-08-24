import * as path from 'path';
import * as vscode from 'vscode';

/**
 * SWF metadata from Ruffle Flash Player
 */
interface SwfMetadata {
    width?: number;
    height?: number;
    frameRate?: number;
    numFrames?: number;
    swfVersion?: number;
    isActionScript3?: boolean;
    uncompressedLength?: number;
}

/**
 * Interface for Ruffle player configuration settings
 */
interface RuffleConfig {
    autoplay: string;
    allowScriptAccess: boolean;
    letterbox: string;
    contextMenu: string;
    scale: string;
    quality: string;
}

/**
 * Custom editor provider for SWF files using Ruffle Flash Player.
 * Provides a webview-based interface for viewing SWF files with status bar integration.
 */
class RuffleEditorProvider implements vscode.CustomReadonlyEditorProvider {
    private static readonly viewType = 'ruffle.player';
    private statusBarItem: vscode.StatusBarItem;

    /**
     * Registers the RuffleEditorProvider with VS Code
     * @param context The extension context
     * @returns A disposable for cleanup
     */
    public static register(context: vscode.ExtensionContext): vscode.Disposable {
        const provider = new RuffleEditorProvider(context);
        return vscode.window.registerCustomEditorProvider(
            RuffleEditorProvider.viewType,
            provider
        );
    }

    constructor(private readonly context: vscode.ExtensionContext) {
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 10);
        this.context.subscriptions.push(this.statusBarItem);
    }

    /**
     * Called when a custom document is opened
     * @param uri The URI of the document to open
     * @param openContext Context information about the document opening
     * @param _token Cancellation token
     * @returns A custom document instance
     */
    public async openCustomDocument(
        uri: vscode.Uri,
        openContext: vscode.CustomDocumentOpenContext,
        _token: vscode.CancellationToken
    ): Promise<vscode.CustomDocument> {
        return { uri, dispose: () => { } };
    }

    /**
     * Called to resolve the custom editor for the given document
     * @param document The custom document to resolve
     * @param webviewPanel The webview panel to use for the editor
     * @param _token Cancellation token
     */
    public async resolveCustomEditor(
        document: vscode.CustomDocument,
        webviewPanel: vscode.WebviewPanel,
        _token: vscode.CancellationToken
    ): Promise<void> {
        // Configure webview options
        webviewPanel.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.file(path.dirname(document.uri.fsPath)),
                vscode.Uri.file(path.join(this.context.extensionPath, 'out'))
            ]
        };

        // Set initial HTML content
        this.updateWebviewContent(webviewPanel, document.uri);

        // Watch for file changes to reload SWF
        const fileWatcher = vscode.workspace.createFileSystemWatcher(document.uri.fsPath);
        fileWatcher.onDidChange(() => {
            webviewPanel.webview.postMessage({
                type: 'reload',
                fileUri: webviewPanel.webview.asWebviewUri(document.uri).toString()
            });
        });
        fileWatcher.onDidDelete(() => {
            webviewPanel.dispose();
        });

        // Watch for configuration changes to apply new settings
        const configWatcher = vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('ruffle')) {
                this.updateWebviewContent(webviewPanel, document.uri);
            }
        });

        webviewPanel.onDidChangeViewState(() => {
            if (webviewPanel.active) {
                if (this.statusBarItem.text) {
                    this.statusBarItem.show();
                }
            } else {
                this.statusBarItem.hide();
                this.statusBarItem.text = '';
            }
        });

        webviewPanel.onDidDispose(() => {
            fileWatcher.dispose();
            configWatcher.dispose();
            this.statusBarItem.hide();
            this.statusBarItem.text = '';
        });

        webviewPanel.webview.onDidReceiveMessage(e => {
            try {
                switch (e.type) {
                    case 'metadata':
                        this.updateStatusBar(e.metadata, document.uri);
                        break;
                    case 'openUrl':
                        if (e.url && typeof e.url === 'string') {
                            vscode.env.openExternal(vscode.Uri.parse(e.url));
                        }
                        break;
                    default:
                        console.warn('Ruffle: Unknown message type:', e.type);
                }
            } catch (error) {
                console.error('Ruffle: Error handling webview message:', error);
            }
        });
    }

    /**
     * Updates the webview content with current settings and file URI
     * @param webviewPanel The webview panel to update
     * @param fileUri The URI of the SWF file
     */
    private updateWebviewContent(webviewPanel: vscode.WebviewPanel, fileUri: vscode.Uri) {
        webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview, fileUri);
    }

    /**
     * Updates the status bar with SWF metadata and file information
     * @param metadata The SWF metadata from Ruffle
     * @param fileUri The URI of the SWF file
     */
    private updateStatusBar(metadata: SwfMetadata, fileUri: vscode.Uri) {
        try {
            this.statusBarItem.text = this.formatStatusBarText(metadata);
            this.statusBarItem.show();
        } catch (error) {
            console.error('Ruffle: Error updating status bar:', error);
            this.statusBarItem.text = 'Ruffle: Error loading metadata';
            this.statusBarItem.show();
        }
    }

    /**
     * Formats the status bar text from SWF metadata
     * @param metadata The SWF metadata from Ruffle
     * @returns Formatted status bar text
     */
    private formatStatusBarText(metadata: SwfMetadata): string {
        const dimensions = `${metadata.width || 'Unknown'}×${metadata.height || 'Unknown'}`;
        const fileSize = this.formatFileSize(metadata.uncompressedLength);
        const version = `SWF v${metadata.swfVersion || 'Unknown'}`;
        const actionScript = metadata.isActionScript3 ? 'AS3' : 'AS1/AS2';
        const fps = `${metadata.frameRate || 'Unknown'} FPS`;
        const frames = this.formatFrameCount(metadata.numFrames);

        return `${dimensions} | ${fileSize} | ${version} | ${actionScript} | ${fps} | ${frames}`;
    }

    /**
     * Formats file size from bytes to human readable format
     * @param bytes The file size in bytes
     * @returns Formatted file size string
     */
    private formatFileSize(bytes?: number): string {
        if (bytes === undefined) {
            return 'Unknown size';
        }

        if (bytes < 1024) {
            return `${bytes} B`;
        } else if (bytes < 1024 * 1024) {
            return `${(bytes / 1024).toFixed(1)} KB`;
        } else {
            return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
        }
    }

    /**
     * Formats frame count with proper singular/plural grammar
     */
    private formatFrameCount(numFrames?: number): string {
        if (numFrames === undefined) {
            return 'Unknown frames';
        }
        return numFrames === 1 ? '1 frame' : `${numFrames} frames`;
    }

    /**
     * Generates the HTML content for the webview with Ruffle player
     */
    private getHtmlForWebview(webview: vscode.Webview, fileUri: vscode.Uri): string {
        // Read current configuration
        const config = vscode.workspace.getConfiguration('ruffle');
        const autoplay = config.get<string>('autoplay', 'on');
        const allowScriptAccess = config.get<boolean>('allowScriptAccess', false);
        const letterbox = config.get<string>('letterbox', 'fullscreen');
        const contextMenu = config.get<string>('contextMenu', 'on');
        const scale = config.get<string>('scale', 'showAll');
        const quality = config.get<string>('quality', 'high');

        // Convert URIs for webview usage
        const fileDataUri = webview.asWebviewUri(fileUri);
        const baseDir = vscode.Uri.file(path.dirname(fileUri.fsPath));
        const baseDirUri = webview.asWebviewUri(baseDir);

        // Get URI for bundled Ruffle files
        const ruffleDir = vscode.Uri.file(path.join(this.context.extensionPath, 'out', 'ruffle'));
        const ruffleJsUri = webview.asWebviewUri(vscode.Uri.file(path.join(ruffleDir.fsPath, 'ruffle.js')));

        return this.generateRufflePlayerHtml(fileDataUri.toString(), baseDirUri.toString(), ruffleJsUri.toString(), {
            autoplay,
            allowScriptAccess,
            letterbox,
            contextMenu,
            scale,
            quality
        });
    }

    /**
     * Generates the Ruffle player HTML template
     */
    private generateRufflePlayerHtml(fileDataUri: string, baseDirUri: string, ruffleJsUri: string, config: RuffleConfig): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ruffle Player</title>
    <style>
        html, body {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            overflow: auto;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        #container {
            display: flex;
            justify-content: center;
            align-items: center;
            max-width: 100%;
            max-height: 100%;
        }
        ruffle-player {
            max-width: 100%;
            max-height: 100vh;
            object-fit: contain;
        }
    </style>
</head>
<body>
    <div id="container"></div>

    <script src="${ruffleJsUri}"></script>
    <script>
        const vscode = acquireVsCodeApi();
        let player = null;

        window.RufflePlayer = window.RufflePlayer || {};

        // Intercept window.open calls from Flash content
        const originalWindowOpen = window.open;
        window.open = function(url, target, features) {
            if (url) {
                // Send URL to extension to open externally
                vscode.postMessage({
                    type: 'openUrl',
                    url: url
                });
                return null;
            }
            return originalWindowOpen.call(window, url, target, features);
        };

        function loadSWF(url) {
            const ruffle = window.RufflePlayer.newest();
            player = ruffle.createPlayer();
            const container = document.getElementById("container");

            // Clear previous content
            container.innerHTML = '';

            // Add event listener for metadata
            player.addEventListener("loadedmetadata", () => {
                const metadata = player.metadata;
                if (metadata) {
                    // Set player to use SWF's actual dimensions, but allow CSS to scale it down
                    if (metadata.width && metadata.height) {
                        player.style.width = metadata.width + 'px';
                        player.style.height = metadata.height + 'px';

                        // Check if scaling is needed for large SWFs
                        const viewportWidth = window.innerWidth;
                        const viewportHeight = window.innerHeight;

                        if (metadata.width > viewportWidth || metadata.height > viewportHeight) {
                            // Let CSS handle the scaling with max-width/max-height
                            player.style.maxWidth = '100%';
                            player.style.maxHeight = '100vh';
                        }
                    }

                    // Send metadata to extension for status bar
                    vscode.postMessage({
                        type: 'metadata',
                        metadata
                    });
                }
            });

            container.appendChild(player);

            // Load the SWF with configuration
            player.ruffle().load({
                url: url,
                base: "${baseDirUri}/",
                allowScriptAccess: ${config.allowScriptAccess},
                autoplay: "${config.autoplay}",
                wmode: "transparent",
                splashScreen: false,
                unmuteOverlay: "hidden",
                warnOnUnsupportedContent: false,
                letterbox: "${config.letterbox}",
                contextMenu: "${config.contextMenu}",
                scale: "${config.scale}",
                quality: "${config.quality}"
            });
        }

        // Load initial SWF when page loads
        window.addEventListener("load", () => {
            loadSWF("${fileDataUri}");
        });

        // Handle messages from the extension
        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.type) {
                case 'reload':
                    // Reload the SWF with the new file URI
                    loadSWF(message.fileUri);
                    break;
            }
        });
    </script>
</body>
</html>`;
    }
}

/**
 * Called when the extension is activated
 */
export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(RuffleEditorProvider.register(context));
}

/**
 * Called when the extension is deactivated
 */
export function deactivate() {}
