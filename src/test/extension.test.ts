import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

suite('Ruffle Extension Test Suite', () => {
    let testSwfUri: vscode.Uri;
    const testWorkspaceFolder = path.join(__dirname, '..', '..', '.vscode-test', 'test-workspace');

    suiteSetup(async () => {
        // Create test workspace folder
        if (!fs.existsSync(testWorkspaceFolder)) {
            fs.mkdirSync(testWorkspaceFolder, { recursive: true });
        }

        // Create a minimal valid SWF file for testing
        const minimalSwf = Buffer.from([
            0x46, 0x57, 0x53, // 'FWS' signature (uncompressed SWF)
            0x0A,             // Version 10
            0x3C, 0x00, 0x00, 0x00, // File length (60 bytes)
            0x78, 0x00, 0x05, 0x5F, 0x00, 0x00, 0x0F, 0xA0, 0x00, // Stage size (550x400 pixels)
            0x00, 0x18, // Frame rate (24 fps)
            0x00, 0x01, // Frame count (1 frame)
            0x43, 0x02, // ShowFrame tag
            0x00, 0x00  // End tag
        ]);

        const testSwfPath = path.join(testWorkspaceFolder, 'test.swf');
        fs.writeFileSync(testSwfPath, minimalSwf);
        testSwfUri = vscode.Uri.file(testSwfPath);
    });

    suiteTeardown(async () => {
        // Clean up test files
        if (fs.existsSync(testWorkspaceFolder)) {
            fs.rmSync(testWorkspaceFolder, { recursive: true, force: true });
        }
    });

    test('Extension should be present and activate', async () => {
        const ext = vscode.extensions.getExtension('RobinMiau.ruffle');
        assert.ok(ext, 'Extension should be installed');

        if (!ext.isActive) {
            await ext.activate();
        }

        assert.strictEqual(ext.isActive, true, 'Extension should be active');
    });

    test('Ruffle files should be bundled', () => {
        const ruffleJsPath = path.join(__dirname, '..', '..', 'out', 'ruffle', 'ruffle.js');
        assert.ok(fs.existsSync(ruffleJsPath), 'ruffle.js should exist in out/ruffle folder');
    });

    test('Configuration settings should exist with correct types and defaults', () => {
        const config = vscode.workspace.getConfiguration('ruffle');

        const configTests = [
            { key: 'autoplay', type: 'string', default: 'on' },
            { key: 'allowScriptAccess', type: 'boolean', default: false },
            { key: 'letterbox', type: 'string', default: 'fullscreen' },
            { key: 'contextMenu', type: 'string', default: 'on' },
            { key: 'scale', type: 'string', default: 'showAll' },
            { key: 'quality', type: 'string', default: 'high' }
        ];

        for (const test of configTests) {
            const value = config.get(test.key);
            assert.ok(value !== undefined, `${test.key} should exist`);
            assert.strictEqual(typeof value, test.type, `${test.key} should be a ${test.type}`);
            assert.strictEqual(value, test.default, `${test.key} default should be "${test.default}"`);
        }
    });

    test('SWF file should open with custom editor', async function() {
        this.timeout(5000);

        const tabOpenPromise = new Promise<void>((resolve) => {
            const disposable = vscode.window.tabGroups.onDidChangeTabGroups(() => {
                if (vscode.window.tabGroups.activeTabGroup.activeTab) {
                    disposable.dispose();
                    resolve();
                }
            });
        });

        await vscode.commands.executeCommand('vscode.open', testSwfUri);
        await tabOpenPromise;

        const activeTab = vscode.window.tabGroups.activeTabGroup.activeTab;
        assert.ok(activeTab, 'Tab should be open');

        const tabInput = activeTab.input as any;
        if (tabInput?.uri) {
            assert.ok(tabInput.uri.fsPath.includes('test.swf'), 'Tab should be for the SWF file');
        }

        await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    });
});

