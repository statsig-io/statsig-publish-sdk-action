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
exports.release = void 0;
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const child_process_1 = require("child_process");
const simple_git_1 = require("simple-git");
const helpers_1 = require("./helpers");
const types_1 = require("./types");
const PRIV_TO_PUB_REPO_MAP = {
    'private-js-client-sdk': 'js-client',
    'private-rust-sdk': 'rust-sdk',
    'private-node-js-server-sdk': 'node-js-server-sdk',
    'ios-client-sdk': 'ios-sdk',
    'test-sdk-repo-private': 'test-sdk-repo-public'
};
function release(payload) {
    return __awaiter(this, void 0, void 0, function* () {
        const workingDir = process.cwd() + '/private-sdk';
        const args = validateAndExtractArgsFromPayload(payload);
        core.debug(`Extracted args: ${JSON.stringify(args)}`);
        const postRelease = getPostReleaseAction(payload);
        yield pushToPublic(workingDir, args);
        yield createGithubRelease(args);
        yield postRelease(workingDir, args);
    });
}
exports.release = release;
function validateAndExtractArgsFromPayload(payload) {
    var _a, _b, _c, _d, _e;
    const ref = (_b = (_a = payload.pull_request) === null || _a === void 0 ? void 0 : _a.head) === null || _b === void 0 ? void 0 : _b.ref;
    const sha = (_d = (_c = payload.pull_request) === null || _c === void 0 ? void 0 : _c.head) === null || _d === void 0 ? void 0 : _d.sha;
    if (typeof ref !== 'string' || !ref.startsWith('releases/')) {
        throw new types_1.SkipActionError('Not a branch on releases/*');
    }
    if (((_e = payload.pull_request) === null || _e === void 0 ? void 0 : _e.merged) !== true) {
        throw new types_1.SkipActionError('Not a merged pull request');
    }
    const { title, body } = payload.pull_request;
    if (typeof title !== 'string' || !title.startsWith('[release] ')) {
        throw new types_1.SkipActionError('[release] not present in title');
    }
    if (!payload.repository) {
        throw new Error('Unable to load repository info');
    }
    if (typeof sha !== 'string') {
        throw new Error('Unable to load commit SHA');
    }
    const privateRepo = payload.repository.name;
    const publicRepo = PRIV_TO_PUB_REPO_MAP[privateRepo];
    if (!publicRepo) {
        throw new Error(`Unable to get public repo for ${privateRepo}`);
    }
    const parts = title.split(' ').slice(1);
    const version = parts[0];
    const token = core.getInput('gh-token');
    return {
        version,
        title: parts.join(' '),
        body: body !== null && body !== void 0 ? body : '',
        publicRepo,
        privateRepo,
        sha,
        token
    };
}
function getPostReleaseAction(payload) {
    var _a, _b, _c;
    switch ((_a = payload.repository) === null || _a === void 0 ? void 0 : _a.name) {
        case 'test-sdk-repo-private':
        case 'private-js-client-sdk':
        case 'private-node-js-server-sdk':
            return runNpmPublish;
        default:
            throw new types_1.SkipActionError(`Release not supported for repository: ${(_c = (_b = payload.repository) === null || _b === void 0 ? void 0 : _b.name) !== null && _c !== void 0 ? _c : null}`);
    }
}
function pushToPublic(dir, args) {
    return __awaiter(this, void 0, void 0, function* () {
        const { title, version, privateRepo, publicRepo, sha, token } = args;
        const git = (0, simple_git_1.simpleGit)();
        yield git
            .clone((0, helpers_1.createGitRepoUrl)(token, privateRepo), dir)
            .then(() => git
            .cwd(dir)
            .addConfig('user.name', 'statsig-kong[bot]')
            .addConfig('user.email', 'statsig-kong[bot]@users.noreply.github.com'))
            .then(() => git.checkout(sha))
            .then(() => git.addAnnotatedTag(version, title))
            .then(() => git.addRemote('public', (0, helpers_1.createGitRepoUrl)(token, publicRepo)))
            .then(() => git.push('public', 'main', ['--follow-tags']));
    });
}
function createGithubRelease(args) {
    return __awaiter(this, void 0, void 0, function* () {
        const { title, version, body, publicRepo, token } = args;
        const octokit = github.getOctokit(token);
        const response = yield octokit.rest.repos.createRelease({
            owner: 'statsig-io',
            repo: publicRepo,
            tag_name: version,
            body,
            name: title,
            draft: core.getBooleanInput('is-draft'),
            generate_release_notes: true
        });
        console.log(`Released: ${JSON.stringify(response)}`);
    });
}
function runNpmPublish(dir, args) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        const NPM_TOKEN = (_a = core.getInput('npm-token')) !== null && _a !== void 0 ? _a : '';
        if (NPM_TOKEN === '') {
            throw new Error('Call to NPM Publish without settng npm-token');
        }
        const result = (0, child_process_1.execSync)(`npm config set //registry.npmjs.org/:_authToken ${NPM_TOKEN} && npm publish`, {
            cwd: dir,
            env: Object.assign(Object.assign({}, process.env), { NPM_TOKEN, NPM_AUTH_TOKEN: NPM_TOKEN })
        });
        console.log(`Published: ${JSON.stringify(result.toString())}`);
    });
}
