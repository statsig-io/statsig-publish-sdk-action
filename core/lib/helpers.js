"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasOIDCEnv = exports.createGitRepoUrl = void 0;
function createGitRepoUrl(token, repo) {
    return `https://oauth2:${token}@github.com/statsig-io/${repo}.git`;
}
exports.createGitRepoUrl = createGitRepoUrl;
function hasOIDCEnv() {
    return process.env.ACTIONS_ID_TOKEN_REQUEST_URL !== undefined &&
        process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN !== undefined;
}
exports.hasOIDCEnv = hasOIDCEnv;
