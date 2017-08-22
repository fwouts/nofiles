import { ImmutableFile } from "./file";
import TextBuilder from "textbuilder";

export type MutableDirectory = { [key: string]: string | MutableDirectory };

export class ImmutableDirectory {
  static builder(): ImmutableDirectoryBuilder {
    return new ImmutableDirectoryBuilder();
  }

  private _children: Map<string, ImmutableFile | ImmutableDirectory>;

  constructor(children: Map<string, ImmutableFile | ImmutableDirectory>) {
    this._children = new Map(children);
  }

  static from(mutableDirectory: MutableDirectory): ImmutableDirectory {
    let builder = ImmutableDirectory.builder();
    for (let key of Object.keys(mutableDirectory)) {
      let entry = mutableDirectory[key];
      if (typeof entry == "string") {
        builder.addFile(key, entry);
      } else {
        builder.addDirectory(key, this.from(entry));
      }
    }
    return builder.build();
  }

  toMutable(): MutableDirectory {
    let mutable: MutableDirectory = {};
    for (let [name, child] of this._children.entries()) {
      if (child instanceof ImmutableFile) {
        mutable[name] = child.getBuffer().toString("utf8");
      } else {
        mutable[name] = child.toMutable();
      }
    }
    return mutable;
  }

  list(): Map<string, ImmutableFile | ImmutableDirectory> {
    return new Map(this._children);
  }

  merged(other: ImmutableDirectory): ImmutableDirectory {
    return ImmutableDirectory.merged(this, other);
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
    for (let [childName, child] of this._children.entries()) {
      if (child instanceof ImmutableFile) {
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
    terminalNode: ImmutableDirectory | ImmutableFile
  ): ImmutableDirectory {
    let slashPosition = path.indexOf("/");
    if (slashPosition > -1) {
      let rootName = path.substr(0, slashPosition);
      let remainingPath = path.substr(slashPosition + 1);
      return ImmutableDirectory.builder()
        .addDirectory(rootName, this.wrap(remainingPath, terminalNode))
        .build();
    } else {
      return ImmutableDirectory.builder().addChild(path, terminalNode).build();
    }
  }

  static unwrap(
    path: string,
    rootDirectory: ImmutableDirectory
  ): ImmutableDirectory | ImmutableFile {
    let slashPosition = path.indexOf("/");
    if (slashPosition > -1) {
      let rootName = path.substr(0, slashPosition);
      let remainingPath = path.substr(slashPosition + 1);
      let child = rootDirectory.list().get(rootName);
      if (child instanceof ImmutableDirectory) {
        return this.unwrap(remainingPath, child);
      } else if (!child) {
        throw new Error(`No such directory: '${rootName}'`);
      } else {
        throw new Error(`Expected a directory, found a file: '${rootName}'`);
      }
    } else {
      let child = rootDirectory.list().get(path);
      if (!child) {
        throw new Error(`No such file or directory: '${path}'`);
      }
      return child;
    }
  }

  static merged(...directories: ImmutableDirectory[]): ImmutableDirectory {
    // TODO: Consider failing on conflict.
    let mergedChildren: Map<
      string,
      ImmutableFile | ImmutableDirectory
    > = new Map();
    for (let directory of directories) {
      for (let [childName, child] of directory._children.entries()) {
        if (child instanceof ImmutableFile) {
          if (mergedChildren.get(childName) instanceof ImmutableDirectory) {
            throw new Error("Cannot merge file into directory");
          }
          mergedChildren.set(childName, child);
        } else if (child instanceof ImmutableDirectory) {
          if (mergedChildren.get(childName) instanceof ImmutableFile) {
            throw new Error("Cannot merge directory into file");
          } else if (
            mergedChildren.get(childName) instanceof ImmutableDirectory
          ) {
            mergedChildren.set(
              childName,
              (mergedChildren.get(childName) as ImmutableDirectory).merged(
                child
              )
            );
          } else {
            mergedChildren.set(childName, child);
          }
        } else {
          throw new Error();
        }
      }
    }
    return new ImmutableDirectory(mergedChildren);
  }
}

export class ImmutableDirectoryBuilder {
  private _children: Map<string, ImmutableFile | ImmutableDirectory>;

  constructor() {
    this._children = new Map();
  }

  addFile(name: string, f: ImmutableFile | string): ImmutableDirectoryBuilder {
    let file =
      f instanceof ImmutableFile
        ? f
        : new ImmutableFile(Buffer.from(f, "utf8"));
    return this.addChild(name, file);
  }

  addDirectory(
    name: string,
    d: ImmutableDirectory | ImmutableDirectoryBuilder
  ): ImmutableDirectoryBuilder {
    let dir = d instanceof ImmutableDirectory ? d : d.build();
    return this.addChild(name, dir);
  }

  addChild(
    name: string,
    child: ImmutableFile | ImmutableDirectory
  ): ImmutableDirectoryBuilder {
    if (this._children.has(name)) {
      throw new Error("Conflicting names: " + name);
    }
    this._children.set(name, child);
    return this;
  }

  build() {
    return new ImmutableDirectory(this._children);
  }
}
