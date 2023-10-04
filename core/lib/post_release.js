"use strict";
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
exports.pushReleaseToThirdParties = void 0;
const simple_git_1 = require("simple-git");
const helpers_1 = require("./helpers");
const kong_octokit_1 = __importDefault(require("./kong_octokit"));
const publish_npm_1 = __importDefault(require("./publishers/publish_npm"));
const publish_pypi_1 = __importDefault(require("./publishers/publish_pypi"));
const publish_rubygems_1 = __importDefault(require("./publishers/publish_rubygems"));
const types_1 = require("./types");
const publish_crates_io_1 = __importDefault(require("./publishers/publish_crates_io"));
function pushReleaseToThirdParties(payload) {
    return __awaiter(this, void 0, void 0, function* () {
        const args = yield validateAndExtractArgsFromPayload(payload);
        const action = getThirdPartyAction(args.repo);
        yield cloneRepo(args);
        yield action(args);
    });
}
exports.pushReleaseToThirdParties = pushReleaseToThirdParties;
function getThirdPartyAction(repo) {
    switch (repo) {
        case 'test-sdk-repo-public':
        case 'js-client':
        case 'js-lite':
        case 'js-local-eval':
        case 'node-js-server-sdk':
        case 'node-js-lite-server-sdk':
        case 'react-sdk':
        case 'react-native':
            return publish_npm_1.default;
        case 'python-sdk':
            return publish_pypi_1.default;
        case 'ruby-sdk':
            return publish_rubygems_1.default;
        case 'rust-sdk':
            return publish_crates_io_1.default;
        case 'go-sdk':
        case 'android-sdk':
            return () => {
                // noop
            };
        default:
            throw new types_1.SkipActionError(`Post Release not supported for repository: ${repo !== null && repo !== void 0 ? repo : null}`);
    }
}
function validateAndExtractArgsFromPayload(payload) {
    var _a, _b, _c, _d;
    return __awaiter(this, void 0, void 0, function* () {
        const name = (_a = payload.repository) === null || _a === void 0 ? void 0 : _a.name;
        const tag = (_b = payload.release) === null || _b === void 0 ? void 0 : _b.tag_name;
        const isStable = ((_d = (_c = payload.release) === null || _c === void 0 ? void 0 : _c.name) === null || _d === void 0 ? void 0 : _d.toLowerCase().includes('[stable]')) === true;
        if (typeof name !== 'string' || typeof tag !== 'string') {
            throw new Error('Unable to load repository info');
        }
        const githubToken = yield kong_octokit_1.default.token();
        return {
            tag,
            repo: name,
            githubToken,
            workingDir: process.cwd() + '/public-sdk',
            isStable
        };
    });
}
function cloneRepo(args) {
    return __awaiter(this, void 0, void 0, function* () {
        const git = (0, simple_git_1.simpleGit)();
        yield git.clone((0, helpers_1.createGitRepoUrl)(args.githubToken, args.repo), args.workingDir, {
            '--depth': 1,
            '--branch': args.tag
        });
    });
}
