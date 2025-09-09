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
const child_process_1 = require("child_process");
const kong_octokit_1 = __importDefault(require("./kong_octokit"));
const simple_git_1 = __importDefault(require("simple-git"));
const helpers_1 = require("./helpers");
function backMergeToMain(args) {
    return __awaiter(this, void 0, void 0, function* () {
        // Only act on rc branch publishes
        if (args.fromBranch !== 'rc') {
            console.log('Not a rc branch publish, skipping back-merge to main');
            return;
        }
        const token = yield kong_octokit_1.default.token();
        const git = (0, simple_git_1.default)();
        const dir = process.cwd() + '/private-sdk-back-merge';
        yield git
            .clone((0, helpers_1.createGitRepoUrl)(token, args.privateRepo), dir)
            .then(() => git
            .cwd(dir)
            .addConfig('user.name', 'statsig-kong[bot]')
            .addConfig('user.email', 'statsig-kong[bot]@users.noreply.github.com'));
        console.log('Fetching all and checking out main');
        yield git.fetch('origin');
        yield git.checkout('main');
        yield git.pull('origin', 'main');
        (0, child_process_1.execSync)('pnpm install --dir cli', { cwd: dir, stdio: 'inherit' });
        const tagToBump = generateTagToBump(args.version);
        (0, child_process_1.execSync)(`./tore bump-version ${tagToBump} --create-branch`, { cwd: dir, stdio: 'inherit' });
        console.log('Merging release branch back to main');
        (0, child_process_1.execSync)('./tore merge-to-main', { cwd: dir, stdio: 'inherit' });
    });
}
exports.default = backMergeToMain;
function generateTagToBump(tag) {
    if (tag.startsWith("v")) {
        tag = tag.substring(1);
    }
    const rcMatch = tag.match(/^(.*)-rc\.(\d+)$/);
    if (rcMatch) {
        // if tag is rc, just increment rc number
        const base = rcMatch[1];
        const rcNumber = parseInt(rcMatch[2], 10) + 1;
        return `${base}-rc.${rcNumber}`;
    }
    else {
        // if tag is not rc, add rc.1
        return `${tag}-rc.1`;
    }
}
