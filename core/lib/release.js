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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncReposAndCreateRelease = void 0;
const core = __importStar(require("@actions/core"));
const simple_git_1 = require("simple-git");
const helpers_1 = require("./helpers");
const types_1 = require("./types");
const kong_octokit_1 = __importDefault(require("./kong_octokit"));
const PRIV_TO_PUB_REPO_MAP = {
    'ios-client-sdk': 'ios-sdk',
    'private-android-local-eval': 'android-local-eval',
    'private-android-sdk': 'android-sdk',
    'private-dotnet-sdk': 'dotnet-sdk',
    'private-go-sdk': 'go-sdk',
    'private-java-server-sdk': 'java-server-sdk',
    'private-js-client-sdk': 'js-client',
    'private-js-lite': 'js-lite',
    'private-js-local-eval-sdk': 'js-local-eval',
    'private-node-js-lite-server-sdk': 'node-js-lite-server-sdk',
    'private-node-js-server-sdk': 'node-js-server-sdk',
    'private-php-sdk': 'php-sdk',
    'private-python-sdk': 'python-sdk',
    'private-react-native': 'react-native',
    'private-react-sdk': 'react-sdk',
    'private-ruby-sdk': 'ruby-sdk',
    'private-rust-sdk': 'rust-sdk',
    'private-statsig-server-core': 'statsig-server-core',
    'private-swift-on-device-evaluations-sdk': 'swift-on-device-evaluations-sdk',
    'private-unity-sdk': 'unity-sdk',
    'test-sdk-repo-private': 'test-sdk-repo-public'
};
function syncReposAndCreateRelease(payload) {
    return __awaiter(this, void 0, void 0, function* () {
        const workingDir = process.cwd() + '/private-sdk';
        const args = validateAndExtractArgsFromPayload(payload);
        core.debug(`Extracted args: ${JSON.stringify(args)}`);
        payload.pull_request;
        yield pushToPublic(workingDir, args);
        yield createGithubRelease(args);
    });
}
exports.syncReposAndCreateRelease = syncReposAndCreateRelease;
function validateAndExtractArgsFromPayload(payload) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    const headRef = (_b = (_a = payload.pull_request) === null || _a === void 0 ? void 0 : _a.head) === null || _b === void 0 ? void 0 : _b.ref;
    const baseRef = (_d = (_c = payload.pull_request) === null || _c === void 0 ? void 0 : _c.base) === null || _d === void 0 ? void 0 : _d.ref;
    const sha = (_f = (_e = payload.pull_request) === null || _e === void 0 ? void 0 : _e.merge_commit_sha) !== null && _f !== void 0 ? _f : (_h = (_g = payload.pull_request) === null || _g === void 0 ? void 0 : _g.head) === null || _h === void 0 ? void 0 : _h.sha;
    if (typeof headRef !== 'string' || !headRef.startsWith('releases/')) {
        throw new types_1.SkipActionError('Not a branch on releases/*');
    }
    if (baseRef !== 'main' && baseRef !== 'stable') {
        throw new types_1.SkipActionError('Pull request not against a valid branch');
    }
    if (((_j = payload.pull_request) === null || _j === void 0 ? void 0 : _j.merged) !== true) {
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
    return {
        version,
        title: parts.join(' '),
        body: body !== null && body !== void 0 ? body : '',
        publicRepo,
        privateRepo,
        sha,
        isMain: baseRef === 'main',
        isBeta: headRef.includes('betas/')
    };
}
function pushToPublic(dir, args) {
    return __awaiter(this, void 0, void 0, function* () {
        const { title, version, privateRepo, publicRepo, sha } = args;
        const token = yield kong_octokit_1.default.token();
        const git = (0, simple_git_1.simpleGit)();
        const base = args.isMain ? 'main' : 'stable';
        yield git
            .clone((0, helpers_1.createGitRepoUrl)(token, privateRepo), dir)
            .then(() => git
            .cwd(dir)
            .addConfig('user.name', 'statsig-kong[bot]')
            .addConfig('user.email', 'statsig-kong[bot]@users.noreply.github.com'))
            .then(() => git.checkout(sha))
            .then(() => git.addRemote('public', (0, helpers_1.createGitRepoUrl)(token, publicRepo)))
            .then(() => git.push('public', `${sha}:${base}`))
            .then(() => git.checkoutLocalBranch(`releases/${version}`))
            .then(() => git.addAnnotatedTag(version, title))
            .then(() => git.push('public', `releases/${version}`, ['--follow-tags']));
    });
}
function createGithubRelease(args) {
    return __awaiter(this, void 0, void 0, function* () {
        const { title, version, body, publicRepo } = args;
        const response = yield kong_octokit_1.default.get().rest.repos.createRelease({
            owner: 'statsig-io',
            repo: publicRepo,
            tag_name: version,
            body,
            name: title,
            prerelease: args.isBeta,
            generate_release_notes: true,
            make_latest: args.isMain ? 'true' : 'false'
        });
        console.log(`Released: ${JSON.stringify(response)}`);
    });
}
