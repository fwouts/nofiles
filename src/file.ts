export class ImmutableFile {
  private _buffer: Buffer;

  constructor(text: string | Buffer) {
    this._buffer = typeof text == "string" ? Buffer.from(text, "utf8") : text;
  }

  getBuffer() {
    return this._buffer;
  }
}
