export class SkipActionError extends Error {
  constructor(reason: string) {
    super(reason);
    Object.setPrototypeOf(this, SkipActionError.prototype);
  }
}
