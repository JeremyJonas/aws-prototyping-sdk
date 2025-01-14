/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: Apache-2.0 */
import { renderProjenInitOptions } from "projen/lib/javascript/render-options";
import { synthSnapshot } from "projen/lib/util/synth";
import { PDKPipelineTsProject } from "../src";

describe("PDK Pipeline TS Unit Tests", () => {
  it("Defaults", () => {
    const project = new PDKPipelineTsProject({
      cdkVersion: "2.0.0",
      defaultReleaseBranch: "mainline",
      name: "Defaults",
    });
    expect(synthSnapshot(project)).toMatchSnapshot();
  });

  it("projenrc synth correctly", () => {
    const project = new PDKPipelineTsProject(
      renderProjenInitOptions(
        "@aws-prototyping-sdk/pipeline.PDKPipelineTsProject",
        {
          cdkVersion: "2.0.0",
          defaultReleaseBranch: "mainline",
          name: "ProjenRc",
        }
      )
    );
    expect(synthSnapshot(project)[".projenrc.ts"]).toMatchSnapshot();
  });

  it("With Context", () => {
    const project = new PDKPipelineTsProject({
      cdkVersion: "2.0.0",
      defaultReleaseBranch: "mainline",
      name: "WithContext",
      context: {
        sonarqubeScannerConfig: {
          sonarqubeEndpoint: "https://my.endpoint",
          sonarqubeAuthorizedGroup: "group",
          sonarqubeDefaultProfileOrGateName: "default",
          sonarqubeSpecificProfileOrGateName: "specific",
          sonarqubeProjectName: "WithContext",
          sonarqubeTags: ["sample"],
          preArchiveCommands: ["echo here"],
        },
      },
    });
    expect(synthSnapshot(project)).toMatchSnapshot();
  });

  it("Custom AppEntrypoint", () => {
    const project = new PDKPipelineTsProject({
      cdkVersion: "2.0.0",
      defaultReleaseBranch: "mainline",
      name: "CustomAppEntrypoint",
      appEntrypoint: "updated.ts",
    });
    expect(synthSnapshot(project)).toMatchSnapshot();
  });
});
