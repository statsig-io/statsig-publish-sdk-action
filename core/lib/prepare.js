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
exports.prepareForRelease = void 0;
const core = __importStar(require("@actions/core"));
const child_process_1 = require("child_process");
const simple_git_1 = require("simple-git");
const helpers_1 = require("./helpers");
const kong_octokit_1 = __importDefault(require("./kong_octokit"));
const types_1 = require("./types");
function runNpmInstall(payload) {
    var _a, _b, _c;
    return __awaiter(this, void 0, void 0, function* () {
        const repo = (_a = payload.repository) === null || _a === void 0 ? void 0 : _a.name;
        const branch = (_c = (_b = payload.pull_request) === null || _b === void 0 ? void 0 : _b.head) === null || _c === void 0 ? void 0 : _c.ref;
        if (!repo || !branch) {
            throw new Error('Missing required information');
        }
        core.debug(`Running NPM Install: ${repo} ${branch}`);
        const token = yield kong_octokit_1.default.token();
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
function runJsMonorepoVersionSync(payload) {
    var _a, _b, _c;
    return __awaiter(this, void 0, void 0, function* () {
        core.info('Running JS Monorepo Version Sync');
        const repo = (_a = payload.repository) === null || _a === void 0 ? void 0 : _a.name;
        const branch = (_c = (_b = payload.pull_request) === null || _b === void 0 ? void 0 : _b.head) === null || _c === void 0 ? void 0 : _c.ref;
        if (!repo || !branch) {
            throw new Error('Missing required information');
        }
        const token = yield kong_octokit_1.default.token();
        const git = (0, simple_git_1.simpleGit)();
        const dir = process.cwd() + '/private-sdk';
        core.info(`Cloning ${(0, helpers_1.createGitRepoUrl)(token, repo)} to ${dir}`);
        yield git
            .clone((0, helpers_1.createGitRepoUrl)(token, repo), dir)
            .then(() => git
            .cwd(dir)
            .addConfig('user.name', 'statsig-kong[bot]')
            .addConfig('user.email', 'statsig-kong[bot]@users.noreply.github.com'))
            .then(() => git.checkout(branch));
        (0, child_process_1.execSync)('pnpm install', { cwd: dir });
        core.info(`Running exec nx run statsig:sync-version: ${repo} ${branch}`);
        (0, child_process_1.execSync)('pnpm exec nx run statsig:sync-version', { cwd: dir, stdio: 'inherit' });
        yield git.status().then(status => {
            if (status.isClean()) {
                return;
            }
            const supported = ['package-lock.json', 'src/SDKVersion.ts'];
            const files = status.files
                .filter(file => {
                core.info(`Checking file: ${file.path}`);
                return supported.includes(file.path);
            })
                .map(file => file.path);
            return git
                .add(files)
                .then(() => git.commit(`Bot: Updated File/s [${files.join(', ')}]`))
                .then(() => git.push('origin', branch));
        });
    });
}
function runServerCoreSyncVersion(payload) {
    var _a, _b, _c;
    return __awaiter(this, void 0, void 0, function* () {
        const repo = (_a = payload.repository) === null || _a === void 0 ? void 0 : _a.name;
        const branch = (_c = (_b = payload.pull_request) === null || _b === void 0 ? void 0 : _b.head) === null || _c === void 0 ? void 0 : _c.ref;
        if (!repo || !branch) {
            throw new Error('Missing required information');
        }
        core.debug(`Running pnpm sync-version: ${repo} ${branch}`);
        const token = yield kong_octokit_1.default.token();
        const git = (0, simple_git_1.simpleGit)();
        const dir = process.cwd() + '/private-sdk';
        yield git
            .clone((0, helpers_1.createGitRepoUrl)(token, repo), dir)
            .then(() => git
            .cwd(dir)
            .addConfig('user.name', 'statsig-kong[bot]')
            .addConfig('user.email', 'statsig-kong[bot]@users.noreply.github.com'))
            .then(() => git.checkout(branch));
        (0, child_process_1.execSync)('pnpm install --dir cli', { cwd: dir, stdio: 'inherit' });
        (0, child_process_1.execSync)('./tore sync-version', { cwd: dir, stdio: 'inherit' });
        yield git.status().then(status => {
            if (status.isClean()) {
                return;
            }
            const supported = [
                'package.json',
                'gradle.properties',
                'Cargo.lock',
                'Cargo.toml',
                'statsig_metadata.rs',
                'post-install.php'
            ];
            const originalCount = status.files.length;
            const files = status.files
                .filter(file => supported.some(s => file.path.includes(s)))
                .map(file => file.path);
            if (files.length !== originalCount) {
                console.error('More files changed than expected', status.files.map(f => f.path), files);
                const err = new Error('More files changed than expected');
                err.name = 'MissingChangesError';
                throw err;
            }
            return git
                .add(files)
                .then(() => git.commit(`Bot: Version synchronized in ${files.length} files`))
                .then(() => git.push('origin', branch));
        });
    });
}
function prepareForRelease(payload) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    return __awaiter(this, void 0, void 0, function* () {
        if (!payload.repository) {
            throw new Error('Failed to load repository information');
        }
        if (!payload.pull_request) {
            throw new Error('Failed to load pull_request information');
        }
        const baseRef = (_a = payload.pull_request.base) === null || _a === void 0 ? void 0 : _a.ref;
        if (baseRef === 'stable' &&
            !((_c = (_b = payload.pull_request.title) === null || _b === void 0 ? void 0 : _b.toLowerCase()) === null || _c === void 0 ? void 0 : _c.endsWith('[stable]'))) {
            kong_octokit_1.default.get().pulls.update({
                owner: 'statsig-io',
                repo: payload.repository.name,
                title: `${payload.pull_request.title} [Stable]`,
                pull_number: payload.pull_request.number
            });
        }
        switch ((_d = payload.repository) === null || _d === void 0 ? void 0 : _d.name) {
            case 'test-sdk-repo-private':
            case 'private-js-client-sdk':
            case 'private-js-lite':
            case 'private-node-js-server-sdk':
            case 'private-node-js-lite-server-sdk':
            case 'private-react-sdk':
            case 'private-react-native':
                return runNpmInstall(payload);
            case 'private-js-client-monorepo':
                return runJsMonorepoVersionSync(payload);
            case 'private-statsig-server-core':
                return runServerCoreSyncVersion(payload);
            case 'private-python-sdk':
            case 'private-go-sdk':
                throw new types_1.SkipActionError(`Prepare not neccessary for repository: ${(_f = (_e = payload.repository) === null || _e === void 0 ? void 0 : _e.name) !== null && _f !== void 0 ? _f : null}`);
            default:
                throw new types_1.SkipActionError(`Prepare not supported for repository: ${(_h = (_g = payload.repository) === null || _g === void 0 ? void 0 : _g.name) !== null && _h !== void 0 ? _h : null}`);
        }
    });
}
exports.prepareForRelease = prepareForRelease;
