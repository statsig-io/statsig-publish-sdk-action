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
exports.prepareForRelease = void 0;
const core = __importStar(require("@actions/core"));
const types_1 = require("./types");
const child_process_1 = require("child_process");
const simple_git_1 = require("simple-git");
const helpers_1 = require("./helpers");
function runNpmInstall(payload) {
    var _a, _b, _c;
    return __awaiter(this, void 0, void 0, function* () {
        const repo = (_a = payload.repository) === null || _a === void 0 ? void 0 : _a.name;
        const branch = (_c = (_b = payload.pull_request) === null || _b === void 0 ? void 0 : _b.head) === null || _c === void 0 ? void 0 : _c.ref;
        if (!repo || !branch) {
            throw new Error('Missing required information');
        }
        core.debug(`Running NPM Install: ${repo} ${branch}`);
        const token = core.getInput('gh-token');
        const git = (0, simple_git_1.simpleGit)();
        const dir = process.cwd() + '/private-sdk';
        yield git
            .clone((0, helpers_1.createGitRepoUrl)(token, repo), dir)
            .then(() => git
            .cwd(dir)
            .addConfig('user.name', 'statsig-kong[bot]')
            .addConfig('user.email', 'statsig-kong[bot]@users.noreply.github.com'))
            .then(() => git.checkout(branch));
        (0, child_process_1.execSync)('npm install', { cwd: dir });
        yield git.status().then(status => {
            if (status.isClean()) {
                return;
            }
            const supported = ['package-lock.json', 'src/SDKVersion.ts'];
            const files = status.files
                .filter(file => supported.includes(file.path))
                .map(file => file.path);
            return git
                .add(files)
                .then(() => git.commit(`Bot: Updated File/s [${files.join(', ')}]`))
                .then(() => git.push('origin', branch));
        });
    });
}
function prepareForRelease(payload) {
    var _a, _b, _c, _d, _e;
    return __awaiter(this, void 0, void 0, function* () {
        if (!payload.repository) {
            throw new Error('Failed to load repository information');
        }
        if (!payload.pull_request) {
            throw new Error('Failed to load pull_request information');
        }
        switch ((_a = payload.repository) === null || _a === void 0 ? void 0 : _a.name) {
            case 'test-sdk-repo-private':
            case 'private-js-client-sdk':
            case 'private-node-js-server-sdk':
            case 'private-react-sdk':
            case 'private-react-native':
                return runNpmInstall(payload);
            case 'private-python-sdk':
                throw new types_1.SkipActionError(`Prepare not neccessary for repository: ${(_c = (_b = payload.repository) === null || _b === void 0 ? void 0 : _b.name) !== null && _c !== void 0 ? _c : null}`);
            default:
                throw new types_1.SkipActionError(`Prepare not supported for repository: ${(_e = (_d = payload.repository) === null || _d === void 0 ? void 0 : _d.name) !== null && _e !== void 0 ? _e : null}`);
        }
    });
}
exports.prepareForRelease = prepareForRelease;
