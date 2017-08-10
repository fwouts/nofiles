import TextBuilder from "textbuilder";
import VirtualFile from "./file";

class VirtualDirectory {
  static builder(): VirtualDirectory.Builder {
    return new VirtualDirectory.Builder();
  }

  private _children: { [key: string]: VirtualFile | VirtualDirectory };

  constructor(children: { [key: string]: VirtualFile | VirtualDirectory }) {
    this._children = Object.assign({}, children);
  }

  list(): { [key: string]: VirtualFile | VirtualDirectory } {
    return Object.assign({}, this._children);
  }

  merged(other: VirtualDirectory): VirtualDirectory {
    return VirtualDirectory.merged(this, other);
  }

  toString(): string {
    return this.inspect(-1, {});
  }

  inspect(depth: number, opts: {} = {}): string {
    let textBuilder = new TextBuilder();
    this.inspectInternal(textBuilder, depth, opts);
    return textBuilder.build();
  }

  private inspectInternal(
    textBuilder: TextBuilder,
    depth: number,
    opts: {}
  ): void {
    for (let childName of Object.keys(this._children).sort()) {
      let child = this._children[childName];
      if (child instanceof VirtualFile) {
        textBuilder.append(`${childName}\n`);
      } else {
        textBuilder.append(`${childName}/`);
        let childDirectory = child;
        textBuilder.indented(() => {
          if (depth == 0) {
            textBuilder.append("...");
          } else {
            childDirectory.inspectInternal(textBuilder, depth - 1, opts);
          }
        });
      }
    }
  }

  static wrap(
    path: string,
    terminalNode: VirtualDirectory | VirtualFile
  ): VirtualDirectory {
    let slashPosition = path.indexOf("/");
    if (slashPosition > -1) {
      let rootName = path.substr(0, slashPosition);
      let remainingPath = path.substr(slashPosition + 1);
      return VirtualDirectory.builder()
        .addDirectory(rootName, this.wrap(remainingPath, terminalNode))
        .build();
    } else {
      return VirtualDirectory.builder().addChild(path, terminalNode).build();
    }
  }

  static unwrap(
    path: string,
    rootDirectory: VirtualDirectory
  ): VirtualDirectory | VirtualFile {
    let slashPosition = path.indexOf("/");
    if (slashPosition > -1) {
      let rootName = path.substr(0, slashPosition);
      let remainingPath = path.substr(slashPosition + 1);
      let child = rootDirectory.list()[rootName];
      if (child instanceof VirtualDirectory) {
        return this.unwrap(remainingPath, child);
      } else if (!child) {
        throw new Error(`No such directory: '${rootName}'`);
      } else {
        throw new Error(`Expected a directory, found a file: '${rootName}'`);
      }
    } else {
      let child = rootDirectory.list()[path];
      if (!child) {
        throw new Error(`No such file or directory: '${path}'`);
      }
      return child;
    }
  }

  static merged(...directories: VirtualDirectory[]): VirtualDirectory {
    // TODO: Consider failing on conflict.
    let mergedChildren: { [key: string]: VirtualFile | VirtualDirectory } = {};
    for (let directory of directories) {
      for (let childName of Object.keys(directory._children)) {
        let child = directory._children[childName];
        if (child instanceof VirtualFile) {
          if (mergedChildren[childName] instanceof VirtualDirectory) {
            throw new Error("Cannot merge file into directory");
          }
          mergedChildren[childName] = child;
        } else if (child instanceof VirtualDirectory) {
          if (mergedChildren[childName] instanceof VirtualFile) {
            throw new Error("Cannot merge directory into file");
          } else if (mergedChildren[childName] instanceof VirtualDirectory) {
            mergedChildren[childName] = (mergedChildren[
              childName
            ] as VirtualDirectory).merged(child);
          } else {
            mergedChildren[childName] = child;
          }
        } else {
          throw new Error();
        }
      }
    }
    return new VirtualDirectory(mergedChildren);
  }
}

namespace VirtualDirectory {
  export class Builder {
    private _children: { [key: string]: VirtualFile | VirtualDirectory };

    constructor() {
      this._children = {};
    }

    addFile(name: string, f: VirtualFile | string): VirtualDirectory.Builder {
      let file =
        f instanceof VirtualFile ? f : new VirtualFile(Buffer.from(f, "utf8"));
      return this.addChild(name, file);
    }

    addDirectory(
      name: string,
      d: VirtualDirectory | VirtualDirectory.Builder
    ): VirtualDirectory.Builder {
      let dir = d instanceof VirtualDirectory ? d : d.build();
      return this.addChild(name, dir);
    }

    addChild(
      name: string,
      child: VirtualFile | VirtualDirectory
    ): VirtualDirectory.Builder {
      if (name in this._children) {
        throw new Error("Conflicting names: " + name);
      }
      this._children[name] = child;
      return this;
    }

    build() {
      return new VirtualDirectory(this._children);
    }
  }
}

export default VirtualDirectory;
