const core = require("@actions/core");
const github = require("@actions/github");

const PRIV_TO_PUB_REPO_MAP = {
  "private-js-client-sdk": "js-client",
  "private-rust-sdk": "rust-sdk",
};

try {
  const payload = github.context.payload;

  const ref = payload?.pull_request?.head?.ref;
  if (typeof ref !== "string" || !ref.startsWith("releases/")) {
    console.log("Skip: Not a branch on releases/*");
    return;
  }

  if (payload.pull_request?.merged !== true) {
    console.log("Skip: Not a merged pull request");
    return;
  }

  if (!payload.repository) {
    core.setFailed("Unable to load repository info");
    return;
  }

  const privateRepo = payload.repository.name;
  const publicRepo = PRIV_TO_PUB_REPO_MAP[privateRepo];

  if (!publicRepo) {
    console.log("Skip: Unable to get public repo for " + privateRepo);
    return;
  }

  const token = core.getInput("gh-token");
  const octokit = github.getOctokit(token);
  const { title, body } = payload.pull_request;

  const json = JSON.stringify(github.context.payload, undefined, 2);
  console.log(`The event payload: ${json}`);
} catch (error) {
  core.setFailed(error.message);
}
