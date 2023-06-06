"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGitRepoUrl = void 0;
function createGitRepoUrl(token, repo) {
    return `https://oauth2:${token}@github.com/statsig-io/${repo}.git`;
}
exports.createGitRepoUrl = createGitRepoUrl;
