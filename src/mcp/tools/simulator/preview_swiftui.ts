/**
 * SwiftUI Preview Generation Plugin
 *
 * Builds an iOS app with SwiftUI preview snapshot support and captures the generated preview image.
 * Based on the xcodebuild.nvim approach using the xcodebuild-nvim-preview Swift package.
 *
 * User Prerequisites:
 * 1. Add xcodebuild-nvim-preview to your Xcode project dependencies
 * 2. Import XcodebuildNvimPreview in your SwiftUI preview code
 * 3. Wrap preview with .setupNvimPreview() modifier
 *
 * Example SwiftUI code:
 * ```swift
 * import SwiftUI
 * import XcodebuildNvimPreview
 *
 * struct MyView_Previews: PreviewProvider {
 *     static var previews: some View {
 *         MyView()
 *             .setupNvimPreview()
 *     }
 * }
 * ```
 */

import * as path from 'path';
import { z } from 'zod';
import {
  ToolResponse,
  createImageContent,
  SharedBuildParams,
  XcodePlatform,
} from '../../../types/common.ts';
import { log } from '../../../utils/logging/index.ts';
import { createErrorResponse } from '../../../utils/responses/index.ts';
import type { CommandExecutor, FileSystemExecutor } from '../../../utils/execution/index.ts';
import {
  getDefaultFileSystemExecutor,
  getDefaultCommandExecutor,
} from '../../../utils/execution/index.ts';
import { executeXcodeBuildCommand } from '../../../utils/build/index.ts';
import { nullifyEmptyStrings } from '../../../utils/schema-helpers.ts';

const LOG_PREFIX = '[SwiftUI Preview]';

// Preview polling configuration
const PREVIEW_POLL_INTERVAL_MS = 500; // 500ms intervals
const PREVIEW_POLL_MAX_ATTEMPTS = 60; // 30 seconds total (60 * 500ms)
const PREVIEW_OUTPUT_DIR = '/tmp/xcodebuild.nvim'; // xcodebuild.nvim output directory

// Schema definition
const baseOptions = {
  scheme: z.string().describe('The scheme to use (Required)'),
  simulatorId: z
    .string()
    .optional()
    .describe(
      'UUID of the simulator (from list_sims). Provide EITHER this OR simulatorName, not both',
    ),
  simulatorName: z
    .string()
    .optional()
    .describe(
      "Name of the simulator (e.g., 'iPhone 16'). Provide EITHER this OR simulatorId, not both",
    ),
  configuration: z.string().optional().describe('Build configuration (Debug, Release, etc.)'),
  derivedDataPath: z
    .string()
    .optional()
    .describe('Path where build products and other derived data will go'),
  extraArgs: z.array(z.string()).optional().describe('Additional xcodebuild arguments'),
  useLatestOS: z
    .boolean()
    .optional()
    .describe('Whether to use the latest OS version for the named simulator'),
  preferXcodebuild: z
    .boolean()
    .optional()
    .describe('If true, prefers xcodebuild over the experimental incremental build system'),
  previewName: z
    .string()
    .optional()
    .describe(
      'Optional preview name to identify which preview snapshot to capture (defaults to product name)',
    ),
};

const baseSchemaObject = z.object({
  projectPath: z
    .string()
    .optional()
    .describe('Path to .xcodeproj file. Provide EITHER this OR workspacePath, not both'),
  workspacePath: z
    .string()
    .optional()
    .describe('Path to .xcworkspace file. Provide EITHER this OR projectPath, not both'),
  ...baseOptions,
});

const baseSchema = z.preprocess(nullifyEmptyStrings, baseSchemaObject);

const previewSwiftUISchema = baseSchema
  .refine((val) => val.projectPath !== undefined || val.workspacePath !== undefined, {
    message: 'Either projectPath or workspacePath is required.',
  })
  .refine((val) => !(val.projectPath !== undefined && val.workspacePath !== undefined), {
    message: 'projectPath and workspacePath are mutually exclusive. Provide only one.',
  })
  .refine((val) => val.simulatorId !== undefined || val.simulatorName !== undefined, {
    message: 'Either simulatorId or simulatorName is required.',
  })
  .refine((val) => !(val.simulatorId !== undefined && val.simulatorName !== undefined), {
    message: 'simulatorId and simulatorName are mutually exclusive. Provide only one.',
  });

export type PreviewSwiftUIParams = z.infer<typeof previewSwiftUISchema>;

/**
 * Helper function to wait for preview snapshot file
 */
async function waitForPreviewSnapshot(
  productName: string,
  previewName: string | undefined,
  fileSystemExecutor: FileSystemExecutor,
  pathUtils: { join: (...paths: string[]) => string } = path,
): Promise<string | null> {
  const effectiveName = previewName ?? productName;
  const expectedPath = pathUtils.join(PREVIEW_OUTPUT_DIR, `${effectiveName}.png`);

  log('info', `${LOG_PREFIX}: Polling for preview snapshot at: ${expectedPath}`);

  for (let attempt = 0; attempt < PREVIEW_POLL_MAX_ATTEMPTS; attempt++) {
    if (fileSystemExecutor.existsSync(expectedPath)) {
      log(
        'info',
        `${LOG_PREFIX}: Preview snapshot found after ${attempt * PREVIEW_POLL_INTERVAL_MS}ms`,
      );
      return expectedPath;
    }

    // Wait before next attempt
    await new Promise((resolve) => setTimeout(resolve, PREVIEW_POLL_INTERVAL_MS));
  }

  log(
    'warning',
    `${LOG_PREFIX}: Preview snapshot not found after ${PREVIEW_POLL_MAX_ATTEMPTS * PREVIEW_POLL_INTERVAL_MS}ms`,
  );
  return null;
}

/**
 * Helper function to extract product name from build settings
 */
async function getProductName(
  params: PreviewSwiftUIParams,
  executor: CommandExecutor,
): Promise<string | null> {
  try {
    const command = ['xcodebuild', '-showBuildSettings'];

    if (params.workspacePath) {
      command.push('-workspace', params.workspacePath);
    } else if (params.projectPath) {
      command.push('-project', params.projectPath);
    }

    command.push('-scheme', params.scheme);
    command.push('-configuration', params.configuration ?? 'Debug');

    // Add destination for simulator
    let destinationString: string;
    if (params.simulatorId) {
      destinationString = `platform=iOS Simulator,id=${params.simulatorId}`;
    } else if (params.simulatorName) {
      destinationString = `platform=iOS Simulator,name=${params.simulatorName}${(params.useLatestOS ?? true) ? ',OS=latest' : ''}`;
    } else {
      destinationString = 'platform=iOS Simulator';
    }
    command.push('-destination', destinationString);

    const result = await executor(command, `${LOG_PREFIX}: Get Product Name`, true, undefined);

    if (!result.success) {
      log('error', `${LOG_PREFIX}: Failed to get build settings: ${result.error}`);
      return null;
    }

    // Extract PRODUCT_NAME from build settings
    const productNameMatch = result.output.match(/^\s*PRODUCT_NAME\s*=\s*(.+)$/m);
    if (productNameMatch?.[1]) {
      const productName = productNameMatch[1].trim();
      log('info', `${LOG_PREFIX}: Product name: ${productName}`);
      return productName;
    }

    log('warning', `${LOG_PREFIX}: Could not find PRODUCT_NAME in build settings`);
    return null;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('error', `${LOG_PREFIX}: Error getting product name: ${errorMessage}`);
    return null;
  }
}

/**
 * Core logic function for SwiftUI preview generation
 */
export async function preview_swiftuiLogic(
  params: PreviewSwiftUIParams,
  executor: CommandExecutor,
  fileSystemExecutor: FileSystemExecutor = getDefaultFileSystemExecutor(),
  pathUtils: { join: (...paths: string[]) => string } = path,
): Promise<ToolResponse> {
  const projectType = params.projectPath ? 'project' : 'workspace';
  const filePath = params.projectPath ?? params.workspacePath;

  log(
    'info',
    `${LOG_PREFIX}: Starting SwiftUI preview build for scheme ${params.scheme} from ${projectType}: ${filePath}`,
  );

  try {
    // Step 1: Get product name from build settings (needed for snapshot filename)
    const productName = await getProductName(params, executor);
    if (!productName) {
      return createErrorResponse(
        'Failed to determine product name from build settings. Cannot locate preview snapshot.',
        'Unable to extract PRODUCT_NAME from xcodebuild -showBuildSettings output.',
      );
    }

    // Step 2: Create SharedBuildParams with preview flag
    const sharedBuildParams: SharedBuildParams = {
      workspacePath: params.workspacePath,
      projectPath: params.projectPath,
      scheme: params.scheme,
      configuration: params.configuration ?? 'Debug',
      derivedDataPath: params.derivedDataPath,
      // Add the xcodebuild.nvim preview flag to extraArgs
      extraArgs: [...(params.extraArgs ?? []), '-xcodebuild-nvim-snapshot'],
    };

    // Step 3: Execute build with preview flag
    log('info', `${LOG_PREFIX}: Building with preview snapshot flag`);
    const buildResult = await executeXcodeBuildCommand(
      sharedBuildParams,
      {
        platform: XcodePlatform.iOSSimulator,
        simulatorName: params.simulatorName,
        simulatorId: params.simulatorId,
        useLatestOS: params.simulatorId ? false : params.useLatestOS,
        logPrefix: 'SwiftUI Preview Build',
      },
      params.preferXcodebuild ?? false,
      'build',
      executor,
    );

    if (buildResult.isError) {
      log('error', `${LOG_PREFIX}: Build failed`);
      return {
        content: [
          {
            type: 'text',
            text: '❌ SwiftUI preview build failed. See build errors above.',
          },
          ...buildResult.content,
        ],
        isError: true,
      };
    }

    log('info', `${LOG_PREFIX}: Build succeeded, waiting for preview snapshot...`);

    // Step 4: Poll for the preview snapshot file
    const snapshotPath = await waitForPreviewSnapshot(
      productName,
      params.previewName,
      fileSystemExecutor,
      pathUtils,
    );

    if (!snapshotPath) {
      return createErrorResponse(
        'Build succeeded but preview snapshot was not generated',
        `Expected snapshot file at ${PREVIEW_OUTPUT_DIR}/${params.previewName ?? productName}.png\n\n` +
          'Ensure your SwiftUI preview code includes:\n' +
          '1. import XcodebuildNvimPreview\n' +
          '2. .setupNvimPreview() modifier on your preview\n\n' +
          'Example:\n' +
          'struct MyView_Previews: PreviewProvider {\n' +
          '    static var previews: some View {\n' +
          '        MyView()\n' +
          '            .setupNvimPreview()\n' +
          '    }\n' +
          '}',
      );
    }

    // Step 5: Read the snapshot image
    log('info', `${LOG_PREFIX}: Reading preview snapshot from: ${snapshotPath}`);
    try {
      const base64Image = await fileSystemExecutor.readFile(snapshotPath, 'base64');

      // Step 6: Clean up the snapshot file
      try {
        await fileSystemExecutor.rm(snapshotPath);
        log('info', `${LOG_PREFIX}: Cleaned up snapshot file`);
      } catch (cleanupError) {
        log('warning', `${LOG_PREFIX}: Failed to clean up snapshot file: ${cleanupError}`);
      }

      // Step 7: Return the preview image
      log('info', `${LOG_PREFIX}: ✅ SwiftUI preview snapshot captured successfully`);
      return {
        content: [
          {
            type: 'text',
            text: `✅ SwiftUI preview snapshot captured for ${productName}`,
          },
          createImageContent(base64Image, 'image/png'),
        ],
        isError: false,
      };
    } catch (readError) {
      const errorMessage = readError instanceof Error ? readError.message : String(readError);
      log('error', `${LOG_PREFIX}: Failed to read snapshot file: ${errorMessage}`);
      return createErrorResponse(
        'Preview snapshot generated but failed to read image file',
        errorMessage,
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('error', `${LOG_PREFIX}: Unexpected error: ${errorMessage}`);

    return createErrorResponse(`Unexpected error generating SwiftUI preview: ${errorMessage}`);
  }
}

export default {
  name: 'preview_swiftui',
  description:
    'Generates a SwiftUI preview snapshot by building with xcodebuild-nvim-preview support. Requires adding xcodebuild-nvim-preview Swift package to your project and .setupNvimPreview() on previews. Example: preview_swiftui({ scheme: "MyApp", simulatorName: "iPhone 16", workspacePath: "/path/to/MyApp.xcworkspace" })',
  schema: {
    projectPath: baseSchemaObject.shape.projectPath,
    workspacePath: baseSchemaObject.shape.workspacePath,
    scheme: baseOptions.scheme,
    simulatorId: baseOptions.simulatorId,
    simulatorName: baseOptions.simulatorName,
    configuration: baseOptions.configuration,
    derivedDataPath: baseOptions.derivedDataPath,
    extraArgs: baseOptions.extraArgs,
    useLatestOS: baseOptions.useLatestOS,
    preferXcodebuild: baseOptions.preferXcodebuild,
    previewName: baseOptions.previewName,
  },
  handler: async (args: Record<string, unknown>): Promise<ToolResponse> => {
    // Validate with full schema
    const validationResult = previewSwiftUISchema.safeParse(args);
    if (!validationResult.success) {
      return createErrorResponse('Parameter validation failed', validationResult.error.message);
    }

    return preview_swiftuiLogic(validationResult.data, getDefaultCommandExecutor());
  },
};
