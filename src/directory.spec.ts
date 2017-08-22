import "mocha";

import { ImmutableDirectory, MutableDirectory } from "./directory";

import { ImmutableFile } from "./file";
import { expect } from "chai";

describe("ImmutableDirectory", () => {
  describe("from MutableDirectory", () => {
    it("is correct", () => {
      let mutableDirectory: MutableDirectory = {
        abc: {
          def: {
            ghi: {
              file1: "Abc",
              file2: "Def"
            }
          },
          jkl: {
            file3: "Ghi"
          }
        }
      };
      expect(ImmutableDirectory.from(mutableDirectory)).to.eql(
        ImmutableDirectory.builder()
          .addDirectory(
            "abc",
            ImmutableDirectory.builder()
              .addDirectory(
                "def",
                ImmutableDirectory.builder().addDirectory(
                  "ghi",
                  ImmutableDirectory.builder()
                    .addFile("file1", "Abc")
                    .addFile("file2", "Def")
                )
              )
              .addDirectory(
                "jkl",
                ImmutableDirectory.builder().addFile("file3", "Ghi")
              )
          )
          .build()
      );
    });
  });

  describe("to MutableDirectory", () => {
    it("is correct", () => {
      let immutableDirectory = ImmutableDirectory.builder()
        .addDirectory(
          "abc",
          ImmutableDirectory.builder()
            .addDirectory(
              "def",
              ImmutableDirectory.builder().addDirectory(
                "ghi",
                ImmutableDirectory.builder()
                  .addFile("file1", "Abc")
                  .addFile("file2", "Def")
              )
            )
            .addDirectory(
              "jkl",
              ImmutableDirectory.builder().addFile("file3", "Ghi")
            )
        )
        .build();
      expect(immutableDirectory.toMutable()).to.eql({
        abc: {
          def: {
            ghi: {
              file1: "Abc",
              file2: "Def"
            }
          },
          jkl: {
            file3: "Ghi"
          }
        }
      });
    });
  });

  it("should not let users change files after creating", () => {
    // Create a directory with no files.
    let files: Map<string, ImmutableFile | ImmutableDirectory> = new Map();
    let directory = new ImmutableDirectory(files);

    // Add a new file to the hashmap.
    files.set("new", new ImmutableFile("should be excluded"));

    // Ensure that it was not added to the directory.
    expect(directory.list().size).to.eq(0);
  });

  describe("toString", () => {
    it("shows full depth", () => {
      expect(
        ImmutableDirectory.wrap(
          "abc/def/ghi/jkl/mno/pqr/stu",
          new ImmutableFile("content")
        ).toString()
      ).to.eq(
        `abc/
  def/
    ghi/
      jkl/
        mno/
          pqr/
            stu
`
      );
    });
  });

  describe("inspect", () => {
    it("shows limited depth", () => {
      expect(
        ImmutableDirectory.wrap(
          "abc/def/ghi/jkl/mno/pqr/stu",
          new ImmutableFile("content")
        ).inspect(3)
      ).to.eq(
        `abc/
  def/
    ghi/
      jkl/
        ...
`
      );
    });
  });

  describe("wrap", () => {
    it("should wrap only once if required", () => {
      let node = ImmutableDirectory.builder()
        .addFile("bottom", "terminal node")
        .build();
      let wrapped = ImmutableDirectory.wrap("top", node);
      expect(wrapped).to.eql(
        ImmutableDirectory.builder()
          .addDirectory(
            "top",
            ImmutableDirectory.builder().addFile("bottom", "terminal node")
          )
          .build()
      );
    });
    it("should wrap as many levels as required", () => {
      let node = ImmutableDirectory.builder()
        .addFile("bottom", "terminal node")
        .build();
      let wrapped = ImmutableDirectory.wrap("top/higher/center/lower", node);
      expect(wrapped).to.eql(
        ImmutableDirectory.builder()
          .addDirectory(
            "top",
            ImmutableDirectory.builder().addDirectory(
              "higher",
              ImmutableDirectory.builder().addDirectory(
                "center",
                ImmutableDirectory.builder().addDirectory(
                  "lower",
                  ImmutableDirectory.builder().addFile(
                    "bottom",
                    "terminal node"
                  )
                )
              )
            )
          )
          .build()
      );
    });
    it("should also wrap files", () => {
      let node = new ImmutableFile("terminal node");
      let wrapped = ImmutableDirectory.wrap("top/higher/center/lower", node);
      expect(wrapped).to.eql(
        ImmutableDirectory.builder()
          .addDirectory(
            "top",
            ImmutableDirectory.builder().addDirectory(
              "higher",
              ImmutableDirectory.builder().addDirectory(
                "center",
                ImmutableDirectory.builder().addFile("lower", "terminal node")
              )
            )
          )
          .build()
      );
    });
  });

  describe("unwrap", () => {
    it("should unwrap only once if required", () => {
      let wrapped = ImmutableDirectory.builder()
        .addDirectory(
          "top",
          ImmutableDirectory.builder().addDirectory(
            "higher",
            ImmutableDirectory.builder().addDirectory(
              "center",
              ImmutableDirectory.builder().addDirectory(
                "lower",
                ImmutableDirectory.builder().addFile("bottom", "terminal node")
              )
            )
          )
        )
        .build();
      expect(ImmutableDirectory.unwrap("top", wrapped)).to.eql(
        ImmutableDirectory.builder()
          .addDirectory(
            "higher",
            ImmutableDirectory.builder().addDirectory(
              "center",
              ImmutableDirectory.builder().addDirectory(
                "lower",
                ImmutableDirectory.builder().addFile("bottom", "terminal node")
              )
            )
          )
          .build()
      );
    });
    it("should unwrap as many levels as required", () => {
      let wrapped = ImmutableDirectory.builder()
        .addDirectory(
          "top",
          ImmutableDirectory.builder().addDirectory(
            "higher",
            ImmutableDirectory.builder().addDirectory(
              "center",
              ImmutableDirectory.builder().addDirectory(
                "lower",
                ImmutableDirectory.builder().addFile("bottom", "terminal node")
              )
            )
          )
        )
        .build();
      expect(
        ImmutableDirectory.unwrap("top/higher/center/lower", wrapped)
      ).to.eql(
        ImmutableDirectory.builder().addFile("bottom", "terminal node").build()
      );
      expect(
        ImmutableDirectory.unwrap("top/higher/center/lower/bottom", wrapped)
      ).to.eql(new ImmutableFile("terminal node"));
    });
    it("should fail if intermediary node does not exist", () => {
      let wrapped = ImmutableDirectory.builder()
        .addDirectory(
          "top",
          ImmutableDirectory.builder().addDirectory(
            "higher",
            ImmutableDirectory.builder().addDirectory(
              "center",
              ImmutableDirectory.builder().addDirectory(
                "lower",
                ImmutableDirectory.builder().addFile("bottom", "terminal node")
              )
            )
          )
        )
        .build();
      expect(() => {
        ImmutableDirectory.unwrap("top/non-existent/center/lower", wrapped);
      }).to.throw(Error, "No such directory: 'non-existent'");
    });
    it("should fail if terminal node does not exist", () => {
      let wrapped = ImmutableDirectory.builder()
        .addDirectory(
          "top",
          ImmutableDirectory.builder().addDirectory(
            "higher",
            ImmutableDirectory.builder().addDirectory(
              "center",
              ImmutableDirectory.builder().addDirectory(
                "lower",
                ImmutableDirectory.builder().addFile("bottom", "terminal node")
              )
            )
          )
        )
        .build();
      expect(() => {
        ImmutableDirectory.unwrap(
          "top/higher/center/lower/non-existent",
          wrapped
        );
      }).to.throw(Error, "No such file or directory: 'non-existent'");
    });
    it("should fail if one of the directories is a file", () => {
      let wrapped = ImmutableDirectory.builder()
        .addDirectory(
          "top",
          ImmutableDirectory.builder().addFile("bottom", "terminal node")
        )
        .build();
      expect(() => {
        ImmutableDirectory.unwrap("top/bottom/non-existent", wrapped);
      }).to.throw(Error, "Expected a directory, found a file: 'bottom'");
    });
  });

  describe("merged", () => {
    it("merges correctly", () => {
      let merged = ImmutableDirectory.merged(
        ImmutableDirectory.builder()
          .addDirectory(
            "top1",
            ImmutableDirectory.builder().addFile("file1", "file 1")
          )
          .build(),
        ImmutableDirectory.builder()
          .addDirectory(
            "top1",
            ImmutableDirectory.builder()
              .addFile("file2", "file 2")
              .addDirectory(
                "middle",
                ImmutableDirectory.builder().addFile("file3", "file 3")
              )
          )
          .build(),
        ImmutableDirectory.builder()
          .addDirectory(
            "top2",
            ImmutableDirectory.builder().addFile("file4", "file 4")
          )
          .build()
      );
      expect(merged).to.eql(
        ImmutableDirectory.builder()
          .addDirectory(
            "top1",
            ImmutableDirectory.builder()
              .addFile("file1", "file 1")
              .addFile("file2", "file 2")
              .addDirectory(
                "middle",
                ImmutableDirectory.builder().addFile("file3", "file 3")
              )
          )
          .addDirectory(
            "top2",
            ImmutableDirectory.builder().addFile("file4", "file 4")
          )
          .build()
      );
    });
    it("overrides files with latest", () => {
      let merged = ImmutableDirectory.merged(
        ImmutableDirectory.builder()
          .addDirectory(
            "top",
            ImmutableDirectory.builder().addFile("file", "file v1")
          )
          .build(),
        ImmutableDirectory.builder()
          .addDirectory(
            "top",
            ImmutableDirectory.builder().addFile("file", "file v2")
          )
          .build(),
        ImmutableDirectory.builder()
          .addDirectory(
            "top",
            ImmutableDirectory.builder().addFile("file", "file v3")
          )
          .build()
      );
      expect(merged).to.eql(
        ImmutableDirectory.builder()
          .addDirectory(
            "top",
            ImmutableDirectory.builder().addFile("file", "file v3")
          )
          .build()
      );
    });
    it("refuses to merge file and directory", () => {
      expect(() => {
        ImmutableDirectory.merged(
          ImmutableDirectory.builder()
            .addDirectory(
              "top",
              ImmutableDirectory.builder().addFile("file", "file v1")
            )
            .build(),
          ImmutableDirectory.builder().addFile("top", "file").build()
        );
      }).to.throw(Error, "Cannot merge file into directory");
      expect(() => {
        ImmutableDirectory.merged(
          ImmutableDirectory.builder().addFile("top", "file").build(),
          ImmutableDirectory.builder()
            .addDirectory(
              "top",
              ImmutableDirectory.builder().addFile("file", "file v1")
            )
            .build()
        );
      }).to.throw(Error, "Cannot merge directory into file");
    });
  });

  describe("Builder", () => {
    it("adds files", () => {
      let file1 = new ImmutableFile("1");
      let file2 = new ImmutableFile("2");
      let directory = ImmutableDirectory.builder()
        .addFile("file1", file1)
        .addFile("file2", file2)
        .build();
      expect(directory.list()).to.eql(
        new Map().set("file1", file1).set("file2", file2)
      );
    });
    it("adds directories", () => {
      let dir1 = ImmutableDirectory.builder().build();
      let dir2 = ImmutableDirectory.builder().build();
      let directory = ImmutableDirectory.builder()
        .addDirectory("dir1", dir1)
        .addDirectory("dir2", dir2)
        .build();
      expect(directory.list()).to.eql(
        new Map().set("dir1", dir1).set("dir2", dir2)
      );
    });
    it("rejects duplicates", () => {
      expect(() => {
        ImmutableDirectory.builder()
          .addFile("file", new ImmutableFile(""))
          .addFile("file", new ImmutableFile(""));
      }).to.throw(Error, "Conflicting names: file");
      expect(() => {
        ImmutableDirectory.builder()
          .addDirectory("dir", ImmutableDirectory.builder().build())
          .addDirectory("dir", ImmutableDirectory.builder().build());
      }).to.throw(Error, "Conflicting names: dir");
      expect(() => {
        ImmutableDirectory.builder()
          .addFile("child", new ImmutableFile(""))
          .addDirectory("child", ImmutableDirectory.builder().build());
      }).to.throw(Error, "Conflicting names: child");
    });
  });
});
