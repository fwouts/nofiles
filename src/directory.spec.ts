import "mocha";

import VirtualDirectory from "./directory";
import VirtualFile from "./file";
import { expect } from "chai";

describe("VirtualDirectory", () => {
  it("should not let users change files after creating", () => {
    // Create a directory with no files.
    let files: { [key: string]: VirtualFile | VirtualDirectory } = {};
    let directory = new VirtualDirectory(files);

    // Add a new file to the hashmap.
    files["new"] = new VirtualFile("should be excluded");

    // Ensure that it was not added to the directory.
    expect(directory.list()).to.eql({});
  });

  describe("toString", () => {
    it("shows full depth", () => {
      expect(
        VirtualDirectory.wrap(
          "abc/def/ghi/jkl/mno/pqr/stu",
          new VirtualFile("content")
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
        VirtualDirectory.wrap(
          "abc/def/ghi/jkl/mno/pqr/stu",
          new VirtualFile("content")
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
      let node = VirtualDirectory.builder()
        .addFile("bottom", "terminal node")
        .build();
      let wrapped = VirtualDirectory.wrap("top", node);
      expect(wrapped).to.eql(
        VirtualDirectory.builder()
          .addDirectory(
            "top",
            VirtualDirectory.builder().addFile("bottom", "terminal node")
          )
          .build()
      );
    });
    it("should wrap as many levels as required", () => {
      let node = VirtualDirectory.builder()
        .addFile("bottom", "terminal node")
        .build();
      let wrapped = VirtualDirectory.wrap("top/higher/center/lower", node);
      expect(wrapped).to.eql(
        VirtualDirectory.builder()
          .addDirectory(
            "top",
            VirtualDirectory.builder().addDirectory(
              "higher",
              VirtualDirectory.builder().addDirectory(
                "center",
                VirtualDirectory.builder().addDirectory(
                  "lower",
                  VirtualDirectory.builder().addFile("bottom", "terminal node")
                )
              )
            )
          )
          .build()
      );
    });
    it("should also wrap files", () => {
      let node = new VirtualFile("terminal node");
      let wrapped = VirtualDirectory.wrap("top/higher/center/lower", node);
      expect(wrapped).to.eql(
        VirtualDirectory.builder()
          .addDirectory(
            "top",
            VirtualDirectory.builder().addDirectory(
              "higher",
              VirtualDirectory.builder().addDirectory(
                "center",
                VirtualDirectory.builder().addFile("lower", "terminal node")
              )
            )
          )
          .build()
      );
    });
  });

  describe("unwrap", () => {
    it("should unwrap only once if required", () => {
      let wrapped = VirtualDirectory.builder()
        .addDirectory(
          "top",
          VirtualDirectory.builder().addDirectory(
            "higher",
            VirtualDirectory.builder().addDirectory(
              "center",
              VirtualDirectory.builder().addDirectory(
                "lower",
                VirtualDirectory.builder().addFile("bottom", "terminal node")
              )
            )
          )
        )
        .build();
      expect(VirtualDirectory.unwrap("top", wrapped)).to.eql(
        VirtualDirectory.builder()
          .addDirectory(
            "higher",
            VirtualDirectory.builder().addDirectory(
              "center",
              VirtualDirectory.builder().addDirectory(
                "lower",
                VirtualDirectory.builder().addFile("bottom", "terminal node")
              )
            )
          )
          .build()
      );
    });
    it("should unwrap as many levels as required", () => {
      let wrapped = VirtualDirectory.builder()
        .addDirectory(
          "top",
          VirtualDirectory.builder().addDirectory(
            "higher",
            VirtualDirectory.builder().addDirectory(
              "center",
              VirtualDirectory.builder().addDirectory(
                "lower",
                VirtualDirectory.builder().addFile("bottom", "terminal node")
              )
            )
          )
        )
        .build();
      expect(
        VirtualDirectory.unwrap("top/higher/center/lower", wrapped)
      ).to.eql(
        VirtualDirectory.builder().addFile("bottom", "terminal node").build()
      );
      expect(
        VirtualDirectory.unwrap("top/higher/center/lower/bottom", wrapped)
      ).to.eql(new VirtualFile("terminal node"));
    });
    it("should fail if intermediary node does not exist", () => {
      let wrapped = VirtualDirectory.builder()
        .addDirectory(
          "top",
          VirtualDirectory.builder().addDirectory(
            "higher",
            VirtualDirectory.builder().addDirectory(
              "center",
              VirtualDirectory.builder().addDirectory(
                "lower",
                VirtualDirectory.builder().addFile("bottom", "terminal node")
              )
            )
          )
        )
        .build();
      expect(() => {
        VirtualDirectory.unwrap("top/non-existent/center/lower", wrapped);
      }).to.throw(Error, "No such directory: 'non-existent'");
    });
    it("should fail if terminal node does not exist", () => {
      let wrapped = VirtualDirectory.builder()
        .addDirectory(
          "top",
          VirtualDirectory.builder().addDirectory(
            "higher",
            VirtualDirectory.builder().addDirectory(
              "center",
              VirtualDirectory.builder().addDirectory(
                "lower",
                VirtualDirectory.builder().addFile("bottom", "terminal node")
              )
            )
          )
        )
        .build();
      expect(() => {
        VirtualDirectory.unwrap(
          "top/higher/center/lower/non-existent",
          wrapped
        );
      }).to.throw(Error, "No such file or directory: 'non-existent'");
    });
    it("should fail if one of the directories is a file", () => {
      let wrapped = VirtualDirectory.builder()
        .addDirectory(
          "top",
          VirtualDirectory.builder().addFile("bottom", "terminal node")
        )
        .build();
      expect(() => {
        VirtualDirectory.unwrap("top/bottom/non-existent", wrapped);
      }).to.throw(Error, "Expected a directory, found a file: 'bottom'");
    });
  });

  describe("merged", () => {
    it("merges correctly", () => {
      let merged = VirtualDirectory.merged(
        VirtualDirectory.builder()
          .addDirectory(
            "top1",
            VirtualDirectory.builder().addFile("file1", "file 1")
          )
          .build(),
        VirtualDirectory.builder()
          .addDirectory(
            "top1",
            VirtualDirectory.builder()
              .addFile("file2", "file 2")
              .addDirectory(
                "middle",
                VirtualDirectory.builder().addFile("file3", "file 3")
              )
          )
          .build(),
        VirtualDirectory.builder()
          .addDirectory(
            "top2",
            VirtualDirectory.builder().addFile("file4", "file 4")
          )
          .build()
      );
      expect(merged).to.eql(
        VirtualDirectory.builder()
          .addDirectory(
            "top1",
            VirtualDirectory.builder()
              .addFile("file1", "file 1")
              .addFile("file2", "file 2")
              .addDirectory(
                "middle",
                VirtualDirectory.builder().addFile("file3", "file 3")
              )
          )
          .addDirectory(
            "top2",
            VirtualDirectory.builder().addFile("file4", "file 4")
          )
          .build()
      );
    });
    it("overrides files with latest", () => {
      let merged = VirtualDirectory.merged(
        VirtualDirectory.builder()
          .addDirectory(
            "top",
            VirtualDirectory.builder().addFile("file", "file v1")
          )
          .build(),
        VirtualDirectory.builder()
          .addDirectory(
            "top",
            VirtualDirectory.builder().addFile("file", "file v2")
          )
          .build(),
        VirtualDirectory.builder()
          .addDirectory(
            "top",
            VirtualDirectory.builder().addFile("file", "file v3")
          )
          .build()
      );
      expect(merged).to.eql(
        VirtualDirectory.builder()
          .addDirectory(
            "top",
            VirtualDirectory.builder().addFile("file", "file v3")
          )
          .build()
      );
    });
    it("refuses to merge file and directory", () => {
      expect(() => {
        VirtualDirectory.merged(
          VirtualDirectory.builder()
            .addDirectory(
              "top",
              VirtualDirectory.builder().addFile("file", "file v1")
            )
            .build(),
          VirtualDirectory.builder().addFile("top", "file").build()
        );
      }).to.throw(Error, "Cannot merge file into directory");
      expect(() => {
        VirtualDirectory.merged(
          VirtualDirectory.builder().addFile("top", "file").build(),
          VirtualDirectory.builder()
            .addDirectory(
              "top",
              VirtualDirectory.builder().addFile("file", "file v1")
            )
            .build()
        );
      }).to.throw(Error, "Cannot merge directory into file");
    });
  });

  describe("Builder", () => {
    it("adds files", () => {
      let file1 = new VirtualFile("1");
      let file2 = new VirtualFile("2");
      let directory = VirtualDirectory.builder()
        .addFile("file1", file1)
        .addFile("file2", file2)
        .build();
      expect(directory.list()).to.eql({
        file1: file1,
        file2: file2
      });
    });
    it("adds directories", () => {
      let dir1 = VirtualDirectory.builder().build();
      let dir2 = VirtualDirectory.builder().build();
      let directory = VirtualDirectory.builder()
        .addDirectory("dir1", dir1)
        .addDirectory("dir2", dir2)
        .build();
      expect(directory.list()).to.eql({
        dir1: dir1,
        dir2: dir2
      });
    });
    it("rejects duplicates", () => {
      expect(() => {
        VirtualDirectory.builder()
          .addFile("file", new VirtualFile(""))
          .addFile("file", new VirtualFile(""));
      }).to.throw(Error, "Conflicting names: file");
      expect(() => {
        VirtualDirectory.builder()
          .addDirectory("dir", VirtualDirectory.builder().build())
          .addDirectory("dir", VirtualDirectory.builder().build());
      }).to.throw(Error, "Conflicting names: dir");
      expect(() => {
        VirtualDirectory.builder()
          .addFile("child", new VirtualFile(""))
          .addDirectory("child", VirtualDirectory.builder().build());
      }).to.throw(Error, "Conflicting names: child");
    });
  });
});
