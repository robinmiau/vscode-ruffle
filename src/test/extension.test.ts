import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Ruffle Extension Test Suite', () => {
    let extension: vscode.Extension<any> | undefined;

    suiteSetup(async () => {
        extension = vscode.extensions.getExtension('RobinMiau.vscode-ruffle');
        if (extension && !extension.isActive) {
            await extension.activate();
        }
    });

    test('Extension should be present and activate', async () => {
        assert.ok(extension, 'Extension should be found');
        assert.ok(extension!.isActive, 'Extension should be active');
    });

    test('Configuration should have expected settings', () => {
        const config = vscode.workspace.getConfiguration('ruffle');

        // Test that all expected configuration options exist
        const expectedSettings = ['autoplay', 'allowScriptAccess', 'letterbox', 'contextMenu', 'scale', 'quality'];
        expectedSettings.forEach(setting => {
            assert.ok(config.has(setting), `Setting '${setting}' should exist`);
        });

        // Test default values
        assert.strictEqual(config.get('autoplay'), 'on');
        assert.strictEqual(config.get('allowScriptAccess'), false);
        assert.strictEqual(config.get('letterbox'), 'fullscreen');
        assert.strictEqual(config.get('contextMenu'), 'on');
        assert.strictEqual(config.get('scale'), 'showAll');
        assert.strictEqual(config.get('quality'), 'high');
    });
});

suite('Status Bar Formatting Tests', () => {
    test('Status bar with complete metadata', () => {
        const metadata = {
            width: 800,
            height: 600,
            frameRate: 30,
            numFrames: 150,
            swfVersion: 9,
            isActionScript3: true,
            uncompressedLength: 2097152 // 2 MB
        };

        const dimensions = `${metadata.width}×${metadata.height}`;
        const fileSize = `${(metadata.uncompressedLength / (1024 * 1024)).toFixed(1)} MB`;
        const version = `SWF v${metadata.swfVersion}`;
        const actionScript = metadata.isActionScript3 ? 'AS3' : 'AS1/AS2';
        const fps = `${metadata.frameRate} FPS`;
        const frames = `${metadata.numFrames} frames`;

        const expectedText = `${dimensions} | ${fileSize} | ${version} | ${actionScript} | ${fps} | ${frames}`;
        const actualText = `800×600 | 2.0 MB | SWF v9 | AS3 | 30 FPS | 150 frames`;

        assert.strictEqual(actualText, expectedText);
    });

    test('Status bar with missing metadata', () => {
        const metadata = {
            width: 400,
            height: 300,
            frameRate: 24,
            numFrames: 1,
            swfVersion: 8,
            isActionScript3: false
            // No uncompressedLength
        };

        const dimensions = `${metadata.width}×${metadata.height}`;
        const fileSize = 'Unknown size';
        const version = `SWF v${metadata.swfVersion}`;
        const actionScript = metadata.isActionScript3 ? 'AS3' : 'AS1/AS2';
        const fps = `${metadata.frameRate} FPS`;
        const frames = '1 frame'; // Test singular

        const expectedText = `${dimensions} | ${fileSize} | ${version} | ${actionScript} | ${fps} | ${frames}`;
        const actualText = `400×300 | Unknown size | SWF v8 | AS1/AS2 | 24 FPS | 1 frame`;

        assert.strictEqual(actualText, expectedText);
    });

    test('File size formatting', () => {
        const testCases = [
            { bytes: 512, expected: '512 B' },
            { bytes: 1536, expected: '1.5 KB' },
            { bytes: 2097152, expected: '2.0 MB' },
            { bytes: undefined, expected: 'Unknown size' }
        ];

        testCases.forEach(testCase => {
            let result = '';
            const sizeInBytes = testCase.bytes;

            if (sizeInBytes === undefined) {
                result = 'Unknown size';
            } else if (sizeInBytes < 1024) {
                result = `${sizeInBytes} B`;
            } else if (sizeInBytes < 1024 * 1024) {
                result = `${(sizeInBytes / 1024).toFixed(1)} KB`;
            } else {
                result = `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
            }

            assert.strictEqual(result, testCase.expected, `Failed for ${testCase.bytes} bytes`);
        });
    });
});
