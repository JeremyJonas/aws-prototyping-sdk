/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: Apache-2.0 */
import * as path from "path";
import { DependencyType } from "projen";
import { NodePackageManager } from "projen/lib/javascript";
import { TypeScriptProject } from "projen/lib/typescript";
import {
  GeneratedTypeScriptInfrastructureOptions,
  MockResponseDataGenerationOptions,
} from "../../../types";
import { OpenApiGeneratorIgnoreFile } from "../../components/open-api-generator-ignore-file";
import { OpenApiToolsJsonFile } from "../../components/open-api-tools-json-file";
import {
  buildCleanOpenApiGeneratedCodeCommand,
  buildInvokeMockDataGeneratorCommand,
  buildInvokeOpenApiGeneratorCommandArgs,
  buildTypeSafeApiExecCommand,
  OtherGenerators,
  TypeSafeApiScript,
} from "../../components/utils";
import { GeneratedTypescriptRuntimeProject } from "../../runtime/generated-typescript-runtime-project";

export interface GeneratedTypescriptCdkInfrastructureProjectOptions
  extends GeneratedTypeScriptInfrastructureOptions {
  /**
   * OpenAPI spec path, relative to the project outdir
   */
  readonly specPath: string;
  /**
   * Generated typescript types project
   */
  readonly generatedTypescriptTypes: GeneratedTypescriptRuntimeProject;

  /**
   * Whether the infrastructure and client projects are parented by an nx-monorepo or not
   */
  readonly isWithinMonorepo?: boolean;
}

export class GeneratedTypescriptCdkInfrastructureProject extends TypeScriptProject {
  /**
   * Path to the openapi specification
   * @private
   */
  private readonly specPath: string;

  /**
   * The generated typescript types
   * @private
   */
  private readonly generatedTypescriptTypes: GeneratedTypescriptRuntimeProject;

  /**
   * Mock data generator options
   * @private
   */
  private readonly mockDataOptions?: MockResponseDataGenerationOptions;

  constructor(options: GeneratedTypescriptCdkInfrastructureProjectOptions) {
    super({
      ...options,
      sampleCode: false,
      jest: false,
      eslint: false,
      prettier: false,
      tsconfig: {
        compilerOptions: {
          lib: ["dom", "es2019"],
          // Generated code imports all models, and may not reference them all
          noUnusedLocals: false,
          noUnusedParameters: false,
          skipLibCheck: true,
          ...options?.tsconfig?.compilerOptions,
        },
      },
      npmignoreEnabled: false,
    });
    this.specPath = options.specPath;
    this.generatedTypescriptTypes = options.generatedTypescriptTypes;
    this.mockDataOptions = options.mockDataOptions;

    this.addDeps(
      ...[
        "@aws-prototyping-sdk/type-safe-api",
        "constructs",
        "aws-cdk-lib",
        "cdk-nag",
        // If within a monorepo, add a regular dependency. Otherwise, use a file dependency to ensure the types can be
        // resolved
        options.isWithinMonorepo
          ? options.generatedTypescriptTypes.package.packageName
          : `${
              options.generatedTypescriptTypes.package.packageName
            }@file:${path.relative(
              this.outdir,
              options.generatedTypescriptTypes.outdir
            )}`,
      ].filter(
        (dep) => !this.deps.tryGetDependency(dep, DependencyType.RUNTIME)
      )
    );

    // Ignore everything but the target files
    const openapiGeneratorIgnore = new OpenApiGeneratorIgnoreFile(this);
    openapiGeneratorIgnore.addPatterns(
      "/*",
      "**/*",
      "*",
      `!${this.srcdir}/index.ts`,
      `!${this.srcdir}/api.ts`,
      `!${this.srcdir}/mock-integrations.ts`
    );

    // Add OpenAPI Generator cli configuration
    OpenApiToolsJsonFile.ensure(this).addOpenApiGeneratorCliConfig(
      options.openApiGeneratorCliConfig
    );

    const generateTask = this.addTask("generate");
    generateTask.exec(buildCleanOpenApiGeneratedCodeCommand());
    generateTask.exec(
      buildTypeSafeApiExecCommand(
        TypeSafeApiScript.GENERATE,
        this.buildGenerateCommandArgs()
      )
    );
    generateTask.exec(this.buildGenerateMockDataCommand());

    this.preCompileTask.spawn(generateTask);

    // Ignore the generated code
    this.gitignore.addPatterns(this.srcdir, ".openapi-generator", "mocks");

    // If we're not in a monorepo, we need to link the generated types such that the local dependency can be resolved
    if (!options.isWithinMonorepo) {
      switch (this.package.packageManager) {
        case NodePackageManager.NPM:
        case NodePackageManager.YARN:
        case NodePackageManager.YARN2:
          this.tasks
            .tryFind("install")
            ?.prependExec(
              `${this.package.packageManager} link ${this.generatedTypescriptTypes.package.packageName}`
            );
          break;
        case NodePackageManager.PNPM:
          this.tasks
            .tryFind("install")
            ?.prependExec(
              `${this.package.packageManager} link /${path.relative(
                this.outdir,
                this.generatedTypescriptTypes.outdir
              )}`
            );
          break;
        default:
          console.warn(
            `Unknown package manager ${this.package.packageManager}. Cannot link generated typescript client.`
          );
      }
    }
  }

  public buildGenerateCommandArgs = () => {
    return buildInvokeOpenApiGeneratorCommandArgs({
      generator: "typescript-fetch",
      specPath: this.specPath,
      generatorDirectory: OtherGenerators.TYPESCRIPT_CDK_INFRASTRUCTURE,
      srcDir: this.srcdir,
      normalizers: {
        KEEP_ONLY_FIRST_TAG_IN_OPERATION: true,
      },
      extraVendorExtensions: {
        "x-runtime-package-name":
          this.generatedTypescriptTypes.package.packageName,
        // Spec path relative to the source directory
        "x-relative-spec-path": path.join("..", this.specPath),
      },
    });
  };

  public buildGenerateMockDataCommand = () => {
    return buildInvokeMockDataGeneratorCommand({
      specPath: this.specPath,
      ...this.mockDataOptions,
    });
  };
}
