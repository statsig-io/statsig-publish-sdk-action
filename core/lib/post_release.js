"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.postRelease = void 0;
const core = __importStar(require("@actions/core"));
const child_process_1 = require("child_process");
const types_1 = require("./types");
function postRelease(payload) {
    return __awaiter(this, void 0, void 0, function* () {
        const workingDir = process.cwd() + '/private-sdk';
        const action = getPostReleaseAction(payload);
        yield action(workingDir);
    });
}
exports.postRelease = postRelease;
function getPostReleaseAction(payload) {
    var _a, _b, _c;
    switch ((_a = payload.repository) === null || _a === void 0 ? void 0 : _a.name) {
        case 'test-sdk-repo-private':
        case 'private-js-client-sdk':
        case 'private-node-js-server-sdk':
            return runNpmPublish;
        case 'ios-client-sdk':
            return noop;
        default:
            throw new types_1.SkipActionError(`Release not supported for repository: ${(_c = (_b = payload.repository) === null || _b === void 0 ? void 0 : _b.name) !== null && _c !== void 0 ? _c : null}`);
    }
}
function runNpmPublish(dir) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        const NPM_TOKEN = (_a = core.getInput('npm-token')) !== null && _a !== void 0 ? _a : '';
        if (NPM_TOKEN === '') {
            throw new Error('Call to NPM Publish without settng npm-token');
        }
        const result = (0, child_process_1.execSync)(`npm install && npm config set //registry.npmjs.org/:_authToken ${NPM_TOKEN} && npm publish`, {
            cwd: dir,
            env: Object.assign(Object.assign({}, process.env), { NPM_TOKEN, NPM_AUTH_TOKEN: NPM_TOKEN })
        });
        console.log(`Published: ${JSON.stringify(result.toString())}`);
    });
}
function noop() {
    return __awaiter(this, void 0, void 0, function* () { });
}
