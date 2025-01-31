export type PublishActionArgs = {
  tag: string;
  repo: string;
  githubToken: string;
  workingDir: string;
  isStable: boolean;
  isBeta: boolean;
};
