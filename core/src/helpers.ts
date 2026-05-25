export function createGitRepoUrl(token: string, repo: string): string {
  return `https://oauth2:${token}@github.com/statsig-io/${repo}.git`;
}

export function hasOIDCEnv(): boolean {
  return !!process.env.ACTIONS_ID_TOKEN_REQUEST_URL &&
    !!process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
}