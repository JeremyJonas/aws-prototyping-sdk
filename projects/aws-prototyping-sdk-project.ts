/*********************************************************************************************************************
 Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

 Licensed under the Apache License, Version 2.0 (the "License").
 You may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 ******************************************************************************************************************** */
import { Project } from "projen";
import { Stability } from "projen/lib/cdk";
import { PDKProject } from "../private/pdk-project";

/**
 * File patterns to keep in the .gitignore. Also used to determine which files to keep when cleaning.
 */
const filesGlobsToKeep = [
  "node_modules",
  ".eslintrc.json",
  ".git*",
  ".npm*",
  "scripts",
  "scripts/*.ts",
  ".projen",
  "LICENSE",
  ".README.md",
  "README.md",
  "tsconfig.dev.json",
  "tsconfig.json",
  "package.json",
];

/**
 * Contains configuration for the aws-prototyping-sdk package.
 */
export class AwsPrototypingSdkProject extends PDKProject {
  constructor(parent: Project) {
    super({
      parent,
      author: "AWS APJ COPE",
      authorAddress: "apj-cope@amazon.com",
      defaultReleaseBranch: "mainline",
      name: "aws-prototyping-sdk",
      keywords: ["aws", "pdk", "jsii", "projen"],
      eslint: false,
      prettier: false,
      repositoryUrl: "https://github.com/aws/aws-prototyping-sdk",
      devDeps: [
        "@aws-prototyping-sdk/nx-monorepo@0.0.0",
        "@aws-prototyping-sdk/pipeline@0.0.0",
        "projen",
        "ts-node",
        "fs-extra",
      ],
      peerDeps: ["projen", "constructs", "aws-cdk-lib"],
      deps: ["projen", "constructs", "aws-cdk-lib"],
      bundledDeps: ["@nrwl/devkit"],
      stability: Stability.STABLE,
      sampleCode: false,
      excludeTypescript: ["**/samples/**"],
      outdir: ".",
      tsconfigDev: {
        compilerOptions: {
          outDir: ".",
          rootDir: ".",
        },
      },
      publishToPypiConfig: {
        distName: `aws_prototyping_sdk`,
        module: `aws_prototyping_sdk`,
      },
      publishToMavenConfig: {
        mavenEndpoint: "https://aws.oss.sonatype.org",
        mavenGroupId: "software.aws.awsprototypingsdk",
        mavenArtifactId: `aws-prototyping-sdk`,
        javaPackage: `software.aws.awsprototypingsdk`,
      },
      gitignore: ["*", ...filesGlobsToKeep.map((f) => `!${f}`)],
    });

    this.npmignore?.addPatterns("/scripts/", ".README.md");

    const cleanTask = this.addTask("clean", {
      exec: `find . -maxdepth 1 ${[".", "..", "dist", ...filesGlobsToKeep]
        .map((f) => `! -name "${f}"`)
        .join(" ")} -exec rm -rf {} \\;`,
    });

    this.preCompileTask.spawn(cleanTask);
    this.preCompileTask.exec("./scripts/bundle.ts");
    this.package.addField("bundle", {
      exclude: true,
    });
    this.package.addField("main", "./index.js");
    this.package.addField("types", "./index.d.ts");
    this.package.manifest.jsii.tsc.rootDir = ".";
    this.package.manifest.jsii.tsc.outDir = ".";
  }
}