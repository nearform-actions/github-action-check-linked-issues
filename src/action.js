import * as core from "@actions/core";
import * as github from "@actions/github";

const format = (obj) => JSON.stringify(obj, undefined, 2);

async function run() {
  core.info(`
    *** ACTION RUN - START ***
    `);

  try {
    const { payload, eventName } = github.context;

    if (eventName !== "pull_request") {
      throw new Error(
        `This action can only run on "pull_request", but "${eventName}" was received. Please check your workflow.`
      );
    }

    core.debug(`
    *** PAYLOAD ***
    ${format(payload)}
    `);

    const {
      number,
      repository: { owner, name },
    } = payload;

    const token = core.getInput("github-token");
    const octokit = github.getOctokit(token);
    const data = await octokit.graphql(
      `
      query getLinkedIssues($owner: String!, $name: String!, $number: Int!) {
        repository(owner: $owner, name: $name) {
          pullRequest(number: $number) {
            closingIssuesReferences {
              totalCount
            }
          }
        }
      }
      `,
      {
        owner: owner.login,
        name,
        number,
      }
    );

    core.debug(`
    *** GRAPHQL DATA ***
    ${format(data)}
    `);

    const linkedIssuesCount =
      data?.repository?.pullRequest?.closingIssuesReferences?.totalCount;

    core.setOutput("linked_issues_count", linkedIssuesCount);

    if (!linkedIssuesCount) {
      core.setFailed(
        `No linked issues found. Please add the corresponding issues in the pull request description.`
      );
    }
  } catch (error) {
    core.setFailed(error.message);
  } finally {
    core.info(`
    *** ACTION RUN - END ***
    `);
  }
}

export { run };
