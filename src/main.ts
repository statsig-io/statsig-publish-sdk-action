import * as core from "@actions/core";

async function run(): Promise<void> {
  try {
    const token = core.getInput("gh-token");
    console.log(`Got Token ${token}`);
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    }
  }
}

run();
