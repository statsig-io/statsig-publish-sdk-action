"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SkipActionError = void 0;
class SkipActionError extends Error {
    constructor(reason) {
        super(reason);
        Object.setPrototypeOf(this, SkipActionError.prototype);
    }
}
exports.SkipActionError = SkipActionError;
