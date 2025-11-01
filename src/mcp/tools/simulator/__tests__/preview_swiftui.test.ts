/**
 * Tests for preview_swiftui plugin
 * Following CLAUDE.md testing standards with dependency injection
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { z } from 'zod';
import {
  createMockExecutor,
  createMockFileSystemExecutor,
} from '../../../../test-utils/mock-executors.ts';
import previewSwiftUIPlugin, { preview_swiftuiLogic } from '../preview_swiftui.ts';

describe('preview_swiftui tool', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(previewSwiftUIPlugin.name).toBe('preview_swiftui');
    });

    it('should have correct description', () => {
      expect(previewSwiftUIPlugin.description).toContain('SwiftUI preview snapshot');
      expect(previewSwiftUIPlugin.description).toContain('xcodebuild-nvim-preview');
    });

    it('should have handler function', () => {
      expect(typeof previewSwiftUIPlugin.handler).toBe('function');
    });

    it('should have correct schema fields', () => {
      const schema = previewSwiftUIPlugin.schema;
      expect(schema).toHaveProperty('projectPath');
      expect(schema).toHaveProperty('workspacePath');
      expect(schema).toHaveProperty('scheme');
      expect(schema).toHaveProperty('simulatorId');
      expect(schema).toHaveProperty('simulatorName');
      expect(schema).toHaveProperty('configuration');
      expect(schema).toHaveProperty('derivedDataPath');
      expect(schema).toHaveProperty('extraArgs');
      expect(schema).toHaveProperty('useLatestOS');
      expect(schema).toHaveProperty('preferXcodebuild');
      expect(schema).toHaveProperty('previewName');
    });
  });

  describe('Parameter Validation', () => {
    it('should reject missing both projectPath and workspacePath', async () => {
      const result = await previewSwiftUIPlugin.handler({
        scheme: 'MyScheme',
        simulatorName: 'iPhone 16',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('validation failed');
    });

    it('should reject both projectPath and workspacePath provided', async () => {
      const result = await previewSwiftUIPlugin.handler({
        projectPath: '/path/to/project.xcodeproj',
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 'MyScheme',
        simulatorName: 'iPhone 16',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('validation failed');
    });

    it('should reject missing scheme parameter', async () => {
      const result = await previewSwiftUIPlugin.handler({
        workspacePath: '/path/to/workspace.xcworkspace',
        simulatorName: 'iPhone 16',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('validation failed');
    });

    it('should reject missing both simulatorId and simulatorName', async () => {
      const result = await previewSwiftUIPlugin.handler({
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 'MyScheme',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('validation failed');
    });

    it('should reject both simulatorId and simulatorName provided', async () => {
      const result = await previewSwiftUIPlugin.handler({
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 'MyScheme',
        simulatorId: 'ABC-123',
        simulatorName: 'iPhone 16',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('validation failed');
    });

    it('should accept valid minimal parameters with workspace', async () => {
      const callHistory: string[] = [];

      const trackingExecutor = async (
        command: string[],
        logPrefix?: string,
        useShell?: boolean,
        env?: Record<string, string>,
      ) => {
        callHistory.push(command.join(' '));

        // First call is showBuildSettings
        if (command.includes('-showBuildSettings')) {
          return {
            success: true,
            output: '    PRODUCT_NAME = MyApp',
            process: { pid: 12345 },
          };
        }

        // Second call is the build command
        return {
          success: true,
          output: 'BUILD SUCCEEDED',
          process: { pid: 12345 },
        };
      };

      let pollAttempts = 0;
      const mockFileSystemExecutor = createMockFileSystemExecutor({
        existsSync: () => {
          pollAttempts++;
          // Return false on first call to trigger polling, then fail after 2 attempts
          return false;
        },
      });

      // Should not throw during logic execution
      const result = await preview_swiftuiLogic(
        {
          workspacePath: '/path/to/workspace.xcworkspace',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
        },
        trackingExecutor,
        mockFileSystemExecutor,
      );

      expect(result.isError).toBe(true); // Fails because snapshot never appears
      expect(callHistory.length).toBeGreaterThan(0);
    }, 60000);

    it('should accept valid minimal parameters with project', async () => {
      const callHistory: string[] = [];

      const trackingExecutor = async (
        command: string[],
        logPrefix?: string,
        useShell?: boolean,
        env?: Record<string, string>,
      ) => {
        callHistory.push(command.join(' '));

        if (command.includes('-showBuildSettings')) {
          return {
            success: true,
            output: '    PRODUCT_NAME = MyApp',
            process: { pid: 12345 },
          };
        }

        return {
          success: true,
          output: 'BUILD SUCCEEDED',
          process: { pid: 12345 },
        };
      };

      const mockFileSystemExecutor = createMockFileSystemExecutor({
        existsSync: () => false,
      });

      const result = await preview_swiftuiLogic(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorId: 'ABC-123-DEF',
        },
        trackingExecutor,
        mockFileSystemExecutor,
      );

      expect(result.isError).toBe(true); // Fails because snapshot never appears
      expect(callHistory.length).toBeGreaterThan(0);
    }, 60000);
  });

  describe('Command Generation', () => {
    it('should generate correct build settings command', async () => {
      const callHistory: Array<{ command: string[] }> = [];

      const trackingExecutor = async (
        command: string[],
        logPrefix?: string,
        useShell?: boolean,
        env?: Record<string, string>,
      ) => {
        callHistory.push({ command });

        if (command.includes('-showBuildSettings')) {
          return {
            success: true,
            output: '    PRODUCT_NAME = MyApp',
            process: { pid: 12345 },
          };
        }

        return {
          success: false,
          output: '',
          error: 'Test error',
          process: { pid: 12345 },
        };
      };

      const mockFileSystemExecutor = createMockFileSystemExecutor();

      await preview_swiftuiLogic(
        {
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
        },
        trackingExecutor,
        mockFileSystemExecutor,
      );

      // First command should be build settings
      expect(callHistory[0].command).toContain('xcodebuild');
      expect(callHistory[0].command).toContain('-showBuildSettings');
      expect(callHistory[0].command).toContain('-workspace');
      expect(callHistory[0].command).toContain('/path/to/MyProject.xcworkspace');
      expect(callHistory[0].command).toContain('-scheme');
      expect(callHistory[0].command).toContain('MyScheme');
      expect(callHistory[0].command).toContain('-configuration');
      expect(callHistory[0].command).toContain('Debug');
    });

    it('should include preview snapshot flag in build command', async () => {
      const callHistory: Array<{ command: string[] }> = [];

      const trackingExecutor = async (
        command: string[],
        logPrefix?: string,
        useShell?: boolean,
        env?: Record<string, string>,
      ) => {
        callHistory.push({ command });

        if (command.includes('-showBuildSettings')) {
          return {
            success: true,
            output: '    PRODUCT_NAME = MyApp',
            process: { pid: 12345 },
          };
        }

        return {
          success: false,
          output: '',
          error: 'Test error',
          process: { pid: 12345 },
        };
      };

      const mockFileSystemExecutor = createMockFileSystemExecutor();

      await preview_swiftuiLogic(
        {
          workspacePath: '/path/to/workspace.xcworkspace',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
        },
        trackingExecutor,
        mockFileSystemExecutor,
      );

      // Find the build command (not the showBuildSettings)
      const buildCommand = callHistory.find((call) => !call.command.includes('-showBuildSettings'));

      if (buildCommand) {
        expect(buildCommand.command).toContain('-xcodebuild-nvim-snapshot');
      }
    });

    it('should handle all optional parameters in command', async () => {
      const callHistory: Array<{ command: string[] }> = [];

      const trackingExecutor = async (
        command: string[],
        logPrefix?: string,
        useShell?: boolean,
        env?: Record<string, string>,
      ) => {
        callHistory.push({ command });

        if (command.includes('-showBuildSettings')) {
          return {
            success: true,
            output: '    PRODUCT_NAME = MyApp',
            process: { pid: 12345 },
          };
        }

        return {
          success: false,
          output: '',
          error: 'Test error',
          process: { pid: 12345 },
        };
      };

      const mockFileSystemExecutor = createMockFileSystemExecutor();

      await preview_swiftuiLogic(
        {
          workspacePath: '/path/to/workspace.xcworkspace',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
          configuration: 'Release',
          derivedDataPath: '/custom/derived/path',
          extraArgs: ['--verbose'],
          useLatestOS: false,
          previewName: 'CustomPreview',
        },
        trackingExecutor,
        mockFileSystemExecutor,
      );

      // Check build settings command includes configuration
      const buildSettingsCmd = callHistory[0];
      expect(buildSettingsCmd.command).toContain('Release');

      // Check build command includes extra args
      const buildCommand = callHistory.find((call) => !call.command.includes('-showBuildSettings'));
      if (buildCommand) {
        expect(buildCommand.command).toContain('--verbose');
      }
    });
  });

  describe('Response Processing', () => {
    it('should successfully capture preview snapshot', async () => {
      const mockExecutor = async (
        command: string[],
        logPrefix?: string,
        useShell?: boolean,
        env?: Record<string, string>,
      ) => {
        if (command.includes('-showBuildSettings')) {
          return {
            success: true,
            output: '    PRODUCT_NAME = MyApp',
            process: { pid: 12345 },
          };
        }

        return {
          success: true,
          output: 'BUILD SUCCEEDED',
          process: { pid: 12345 },
        };
      };

      const mockImageData = Buffer.from('fake-preview-image-data').toString('base64');
      let existsCallCount = 0;

      const mockFileSystemExecutor = createMockFileSystemExecutor({
        existsSync: (filePath: string) => {
          existsCallCount++;
          // Simulate snapshot appearing on second attempt
          return existsCallCount > 1;
        },
        readFile: async () => mockImageData,
        rm: async () => {},
      });

      const mockPathUtils = {
        join: (...paths: string[]) => paths.join('/'),
      };

      const result = await preview_swiftuiLogic(
        {
          workspacePath: '/path/to/workspace.xcworkspace',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
        },
        mockExecutor,
        mockFileSystemExecutor,
        mockPathUtils,
      );

      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(2);
      expect(result.content[0].text).toContain('✅');
      expect(result.content[0].text).toContain('captured');
      expect(result.content[1].type).toBe('image');
      expect(result.content[1]).toHaveProperty('mimeType', 'image/png');
    });

    it('should handle build failure', async () => {
      const mockExecutor = async (
        command: string[],
        logPrefix?: string,
        useShell?: boolean,
        env?: Record<string, string>,
      ) => {
        if (command.includes('-showBuildSettings')) {
          return {
            success: true,
            output: '    PRODUCT_NAME = MyApp',
            process: { pid: 12345 },
          };
        }

        return {
          success: false,
          output: 'Build failed: Compilation error',
          error: 'Build failed: Compilation error',
          process: { pid: 12345 },
        };
      };

      const mockFileSystemExecutor = createMockFileSystemExecutor();

      const result = await preview_swiftuiLogic(
        {
          workspacePath: '/path/to/workspace.xcworkspace',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
        },
        mockExecutor,
        mockFileSystemExecutor,
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('❌');
      expect(result.content[0].text).toContain('build failed');
    });

    it('should handle missing product name', async () => {
      const mockExecutor = async (
        command: string[],
        logPrefix?: string,
        useShell?: boolean,
        env?: Record<string, string>,
      ) => {
        if (command.includes('-showBuildSettings')) {
          return {
            success: true,
            output: 'No product name here',
            process: { pid: 12345 },
          };
        }

        return {
          success: true,
          output: 'BUILD SUCCEEDED',
          process: { pid: 12345 },
        };
      };

      const mockFileSystemExecutor = createMockFileSystemExecutor();

      const result = await preview_swiftuiLogic(
        {
          workspacePath: '/path/to/workspace.xcworkspace',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
        },
        mockExecutor,
        mockFileSystemExecutor,
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Failed to determine product name');
    });

    it('should handle snapshot file not appearing', async () => {
      const mockExecutor = async (
        command: string[],
        logPrefix?: string,
        useShell?: boolean,
        env?: Record<string, string>,
      ) => {
        if (command.includes('-showBuildSettings')) {
          return {
            success: true,
            output: '    PRODUCT_NAME = MyApp',
            process: { pid: 12345 },
          };
        }

        return {
          success: true,
          output: 'BUILD SUCCEEDED',
          process: { pid: 12345 },
        };
      };

      const mockFileSystemExecutor = createMockFileSystemExecutor({
        existsSync: () => false, // Snapshot never appears
      });

      const result = await preview_swiftuiLogic(
        {
          workspacePath: '/path/to/workspace.xcworkspace',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
        },
        mockExecutor,
        mockFileSystemExecutor,
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain(
        'Build succeeded but preview snapshot was not generated',
      );
      expect(result.content[0].text).toContain('XcodebuildNvimPreview');
      expect(result.content[0].text).toContain('setupNvimPreview');
    }, 60000);

    it('should handle file read error', async () => {
      const mockExecutor = async (
        command: string[],
        logPrefix?: string,
        useShell?: boolean,
        env?: Record<string, string>,
      ) => {
        if (command.includes('-showBuildSettings')) {
          return {
            success: true,
            output: '    PRODUCT_NAME = MyApp',
            process: { pid: 12345 },
          };
        }

        return {
          success: true,
          output: 'BUILD SUCCEEDED',
          process: { pid: 12345 },
        };
      };

      const mockFileSystemExecutor = createMockFileSystemExecutor({
        existsSync: () => true,
        readFile: async () => {
          throw new Error('Permission denied');
        },
      });

      const result = await preview_swiftuiLogic(
        {
          workspacePath: '/path/to/workspace.xcworkspace',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
        },
        mockExecutor,
        mockFileSystemExecutor,
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('failed to read image file');
    });

    it('should use custom preview name when provided', async () => {
      const mockExecutor = async (
        command: string[],
        logPrefix?: string,
        useShell?: boolean,
        env?: Record<string, string>,
      ) => {
        if (command.includes('-showBuildSettings')) {
          return {
            success: true,
            output: '    PRODUCT_NAME = MyApp',
            process: { pid: 12345 },
          };
        }

        return {
          success: true,
          output: 'BUILD SUCCEEDED',
          process: { pid: 12345 },
        };
      };

      const mockImageData = Buffer.from('fake-preview-data').toString('base64');
      let checkedPath: string | undefined;

      const mockFileSystemExecutor = createMockFileSystemExecutor({
        existsSync: (filePath: string) => {
          checkedPath = filePath;
          return filePath.includes('CustomPreview.png');
        },
        readFile: async () => mockImageData,
        rm: async () => {},
      });

      const mockPathUtils = {
        join: (...paths: string[]) => paths.join('/'),
      };

      const result = await preview_swiftuiLogic(
        {
          workspacePath: '/path/to/workspace.xcworkspace',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
          previewName: 'CustomPreview',
        },
        mockExecutor,
        mockFileSystemExecutor,
        mockPathUtils,
      );

      expect(result.isError).toBe(false);
      expect(checkedPath).toContain('CustomPreview.png');
    });

    it('should handle unexpected errors gracefully', async () => {
      const mockExecutor = async (
        command: string[],
        logPrefix?: string,
        useShell?: boolean,
        env?: Record<string, string>,
      ) => {
        if (command.includes('-showBuildSettings')) {
          return {
            success: true,
            output: '    PRODUCT_NAME = MyApp',
            process: { pid: 12345 },
          };
        }

        return {
          success: true,
          output: 'BUILD SUCCEEDED',
          process: { pid: 12345 },
        };
      };

      const mockFileSystemExecutor = createMockFileSystemExecutor({
        existsSync: () => true,
        readFile: async () => {
          // Throw error during file read
          throw new Error('Unexpected file system error');
        },
      });

      const result = await preview_swiftuiLogic(
        {
          workspacePath: '/path/to/workspace.xcworkspace',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
        },
        mockExecutor,
        mockFileSystemExecutor,
      );

      expect(result.isError).toBe(true);
      // Error is caught in inner try-catch for file operations
      expect(result.content[0].text).toContain('failed to read image file');
    });
  });
});
