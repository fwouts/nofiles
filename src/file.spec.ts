import "mocha";

import { ImmutableFile } from "./file";
import { expect } from "chai";

describe("ImmutableFile", () => {
  it("stores the text", () => {
    let file = new ImmutableFile("some text");
    expect(file.getBuffer()).to.be.eql(Buffer.from("some text", "utf8"));
  });
  it("stores the buffer", () => {
    let file = new ImmutableFile(Buffer.from("some text", "utf8"));
    expect(file.getBuffer()).to.be.eql(Buffer.from("some text", "utf8"));
  });
});
