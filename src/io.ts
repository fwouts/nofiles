import * as fs from "fs";
import * as path from "path";

import VirtualDirectory from "./directory";
import VirtualFile from "./file";

export function generate(
  directory: VirtualDirectory,
  destinationPath: string,
  replace = false
) {
  if (fs.existsSync(destinationPath)) {
    if (replace) {
      // Delete if it's not a directory, otherwise leave it as is.
      if (!fs.lstatSync(destinationPath).isDirectory()) {
        deleteRecursively(destinationPath);
      }
    } else {
      throw new Error("Destination path already exists: " + destinationPath);
    }
  } else {
    fs.mkdirSync(destinationPath);
  }
  let list = directory.list();
  for (let name of Object.keys(list)) {
    let child = list[name];
    let childDestinationPath = path.join(destinationPath, name);
    if (child instanceof VirtualDirectory) {
      if (fs.existsSync(childDestinationPath)) {
        if (!fs.lstatSync(childDestinationPath).isDirectory()) {
          // Existing file is not a directory, delete it before creating directory.
          deleteRecursively(childDestinationPath);
        }
      }
      generate(child, childDestinationPath, true);
    } else {
      let skipWrite = false;
      if (fs.existsSync(childDestinationPath)) {
        if (fs.lstatSync(childDestinationPath).isFile()) {
          // Only write if content have changed.
          skipWrite =
            fs.readFileSync(childDestinationPath).toString("utf8") ===
            child.getBuffer().toString("utf8");
        } else {
          // Existing file is not a file, delete it before writing.
          deleteRecursively(childDestinationPath);
        }
      }
      if (!skipWrite) {
        // This replaces the file if it already exists.
        fs.writeFileSync(childDestinationPath, child.getBuffer());
      }
    }
  }
}

export function read(
  sourcePath: string
): VirtualDirectory | VirtualFile | null {
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`No file at ${sourcePath}`);
  }
  let lstat = fs.lstatSync(sourcePath);
  if (lstat.isDirectory()) {
    let directory = VirtualDirectory.builder();
    for (let childName of fs.readdirSync(sourcePath)) {
      let childDestinationPath = path.join(sourcePath, childName);
      let child = read(childDestinationPath);
      if (child) {
        directory.addChild(childName, child);
      }
    }
    return directory.build();
  } else if (lstat.isFile()) {
    return new VirtualFile(fs.readFileSync(sourcePath));
  } else if (lstat.isSymbolicLink()) {
    // Symbolic links are ignored.
    return null;
  } else {
    throw new Error(`Unsupported path: ${sourcePath}`);
  }
}

function deleteRecursively(p: string) {
  if (!fs.existsSync(p)) {
    return;
  }
  if (fs.lstatSync(p).isDirectory()) {
    fs.readdirSync(p).forEach(file => deleteRecursively(path.join(p, file)));
    fs.rmdirSync(p);
  } else {
    fs.unlinkSync(p);
  }
}
