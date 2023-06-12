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
const simple_git_1 = require("simple-git");
const helpers_1 = require("./helpers");
function postRelease(payload) {
    return __awaiter(this, void 0, void 0, function* () {
        const args = validateAndExtractArgsFromPayload(payload);
        const action = getPostReleaseAction(args.repo);
        yield cloneRepo(args);
        yield action(args);
    });
}
exports.postRelease = postRelease;
function getPostReleaseAction(repo) {
    switch (repo) {
        case 'test-sdk-repo-public':
        case 'js-client':
        case 'node-js-server-sdk':
        case 'react-sdk':
        case 'react-native':
            return runNpmPublish;
        default:
            throw new types_1.SkipActionError(`Release not supported for repository: ${repo !== null && repo !== void 0 ? repo : null}`);
    }
}
function validateAndExtractArgsFromPayload(payload) {
    var _a, _b;
    const name = (_a = payload.repository) === null || _a === void 0 ? void 0 : _a.name;
    const tag = (_b = payload.release) === null || _b === void 0 ? void 0 : _b.tag_name;
    if (typeof name !== 'string' || typeof tag !== 'string') {
        throw new Error('Unable to load repository info');
    }
    const token = core.getInput('gh-token');
    return {
        tag,
        repo: name,
        token,
        workingDir: process.cwd() + '/public-sdk'
    };
}
function cloneRepo(args) {
    return __awaiter(this, void 0, void 0, function* () {
        const git = (0, simple_git_1.simpleGit)();
        yield git.clone((0, helpers_1.createGitRepoUrl)(args.token, args.repo), args.workingDir, {
            '--depth': 1,
            '--branch': args.tag
        });
    });
}
function runNpmPublish(args) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        const NPM_TOKEN = (_a = core.getInput('npm-token')) !== null && _a !== void 0 ? _a : '';
        if (NPM_TOKEN === '') {
            throw new Error('Call to NPM Publish without settng npm-token');
        }
        const result = (0, child_process_1.execSync)(`npm install && npm config set //registry.npmjs.org/:_authToken ${NPM_TOKEN} && npm publish`, {
            cwd: args.workingDir,
            env: Object.assign(Object.assign({}, process.env), { NPM_TOKEN, NPM_AUTH_TOKEN: NPM_TOKEN })
        });
        console.log(`Published: ${JSON.stringify(result.toString())}`);
    });
}
