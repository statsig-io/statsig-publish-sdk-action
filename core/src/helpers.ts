export function createGitRepoUrl(token: string, repo: string): string {
  return `https://oauth2:${token}@github.com/statsig-io/${repo}.git`;
}
