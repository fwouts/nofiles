import "mocha";

import VirtualFile from "./file";
import { expect } from "chai";

describe("VirtualFile", () => {
  it("stores the text", () => {
    let file = new VirtualFile("some text");
    expect(file.getBuffer()).to.be.eql(Buffer.from("some text", "utf8"));
  });
  it("stores the buffer", () => {
    let file = new VirtualFile(Buffer.from("some text", "utf8"));
    expect(file.getBuffer()).to.be.eql(Buffer.from("some text", "utf8"));
  });
});
