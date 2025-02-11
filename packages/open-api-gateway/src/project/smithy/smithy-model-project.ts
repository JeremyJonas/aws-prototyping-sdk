/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: Apache-2.0 */
import { Project, ProjectOptions, SampleFile } from "projen";

/**
 * Options for the smithy model project
 */
export interface SmithyModelOptions extends ProjectOptions {
  /**
   * The namespace of the service, eg com.mycompany
   */
  readonly serviceNamespace: string;
  /**
   * The name of the service, eg MyService
   */
  readonly serviceName: string;
}

/**
 * A project which contains a hello-world Smithy model
 */
export class SmithyModelProject extends Project {
  constructor(options: SmithyModelOptions) {
    super(options);

    // HACK: remove all components but the ones we are registering - removes .gitignore, tasks, etc since these are
    // unused and a distraction for end-users!
    // @ts-ignore
    this._components = [];

    new SampleFile(this, "main.smithy", {
      contents: `$version: "2"
namespace ${options.serviceNamespace}

use aws.protocols#restJson1

@title("A Sample Hello World API")

/// A sample smithy api
@restJson1
service ${options.serviceName} {
    version: "1.0"
    operations: [SayHello]
}

@readonly
@http(method: "GET", uri: "/hello")
operation SayHello {
    input: SayHelloInput
    output: SayHelloOutput
    errors: [ApiError]
}

string Name
string Message

@input
structure SayHelloInput {
    @httpQuery("name")
    @required
    name: Name
}

@output
structure SayHelloOutput {
    @required
    message: Message
}

@error("client")
structure ApiError {
    @required
    errorMessage: Message
}
`,
    });
  }
}
