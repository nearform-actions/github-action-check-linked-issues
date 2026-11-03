# github-action-check-linked-issues

GitHub action to check if pull requests have their corresponding issues linked, in order to enforce traceability.

## Inputs

| input                      | required | default | description |
|----------------------------|----|---------------------|------------------------------------------------------------------|
| `github-token`             | No | `${{github.token}}` | Your Github token, it's already available to your Github action. |
| `exclude-branches`         | No | `''`                | A comma-separated list of patterns to ignore source branches. (Any pattern supported by `minimatch`). |
| `exclude-labels`           | No | `''`                | A comma-separated list of labels to ignore. |
| `comment`                  | No | `true`              | A boolean value that allow the action to create a comment. |
| `custom-body-comment`      | No | "No linked issues found. Please add the corresponding issues in the pull request description. <br/> [Use GitHub automation to close the issue when a PR is merged](https://docs.github.com/en/issues/tracking-your-work-with-issues/linking-a-pull-request-to-an-issue#linking-a-pull-request-to-an-issue-using-a-keyword)" | Custom body PR comment. |
| `loose-matching`                  | No | `false`              | Check keyword-prefixed issue references in the PR description on any target branch, without creating GitHub issue links. See [Issue linking](#issue-linking). |
| `skip-linked-issues-check-label` | No | `no-issue` | A label that causes the action to execute but skip the actual linked issues check. If the check is skipped, the `check_skipped` output is set to `true`. Any present comments added by this action are also deleted. Useful when incorporating this action into multi-action workflows.|

## Outputs

| output                | description                                                      |
|-----------------------|------------------------------------------------------------------|
| `linked_issues_count` | The number of GitHub-linked issues, or validated PR description references when `loose-matching` is enabled. |
| `issues`              | A stringified array of those issues, of the form ["some/repo#123", "another/repository#456"]. Loose matches are not necessarily linked on GitHub. |
| `check_skipped`       | Will be set to `true` if the linked issues check was skipped. |

## Issue linking

This action checks for issues; it does not create or update issue links or add items to GitHub Projects.

By default, the action reads GitHub's `closingIssuesReferences`, including issues linked using closing keywords or manually through the sidebar. For automatic linking, use a [supported closing keyword](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/linking-a-pull-request-to-an-issue#linking-a-pull-request-to-an-issue-using-a-keyword) in the PR description, such as `Fixes #123` or `Closes owner/repo#456`.

GitHub interprets these keywords only when the PR targets the repository's **default branch**. Merging that PR into the default branch closes the linked issues. For PRs targeting another branch, GitHub ignores the keywords: no keyword-based link is created, and merging the PR does not close the referenced issues.

With `loose-matching: true`, the action instead parses the PR description and checks that the referenced issues are accessible through the GitHub API, regardless of the target branch. Each reference still needs a supported closing keyword, for example `Fixes #123`, `Fixes owner/repo#456`, or `Fixes https://github.com/owner/repo/issues/456`; a bare `#123` is not enough. This mode does not count sidebar-only links.

A successful loose-matching check does not create a GitHub link or override GitHub's default-branch requirement. Its outputs report matching references, not proof that GitHub has linked the issues.

## Standard Usage

### Triggers

Configure a workflow to run a job on `pull_request` or  `pull_request_target` events.

If you enable the `comment` option (enabled by default) we recommend to listen on `pull_request_target` event.
`pull_request_target` event has write permission to the target repository allowing external forks to create comments.

The linked issue check will automatically succeed (and any present comment added by this action deleted) if a `no-issue` label is attached to the PR. In that case, the `check_skipped` output will also be set to `true`, allowing you to skip subsequent steps in your Github Action, if so desired.

### Permissions

This action needs the following permissions:
- `issues: read`
- `pull-requests: write`

💡 Note that `pull-requests: write` is required only if you enable the `comment` option (enabled by default), see [Disabling comments](#disabling-comments) example below.

### Example

```yaml
name: Check linked issues

on:
  pull_request_target:
    types: [opened, edited, reopened, synchronize]

jobs:
  check_pull_requests:
    runs-on: ubuntu-latest
    name: Check linked issues
    permissions:
        issues: read
        pull-requests: write
    steps:
      - uses: nearform-actions/github-action-check-linked-issues@v1
        id: check-linked-issues
        with:
          exclude-branches: "release/**, dependabot/**"
      # OPTIONAL: Use the output from the `check-linked-issues` step
      - name: Get the output
        run: echo "How many linked issues? ${{ steps.check-linked-issues.outputs.linked_issues_count }}"
```
When the action cannot find any linked issues it will fail explaining the reason.

## Comments

### Adding comments
By default, when the job fails it adds a new comment on Pull Request, but you can also write your custom comment setting
`custom-body-comment`.

```yaml
on:
  pull_request_target:
    types: [opened, edited, reopened, synchronize]

jobs:
  check_pull_requests:
    runs-on: ubuntu-latest
    name: Check linked issues
    permissions:
      issues: read
      pull-requests: write
    steps:
      - uses: nearform-actions/github-action-check-linked-issues@v1
        id: check-linked-issues
        with:
          exclude-branches: "release/**, dependabot/**"
          custom-body-comment: "Here is a custom comment!"

      # OPTIONAL: Use the output from the `check-linked-issues` step
      - name: Get the output
        run: echo "How many linked issues? ${{ steps.check-linked-issues.outputs.linked_issues_count }}"
```

### Disabling comments
To disable comments in your Pull Request, you just need to set `comment` to false.

```yaml
on:
  pull_request_target:
    types: [opened, edited, reopened, synchronize]

jobs:
  check_pull_requests:
    runs-on: ubuntu-latest
    name: Check linked issues
    permissions:
      issues: read
      pull-requests: write
    steps:
      - uses: nearform-actions/github-action-check-linked-issues@v1
        id: check-linked-issues
        with:
          exclude-branches: "release/**, dependabot/**"
          comment: false

      # OPTIONAL: Use the output from the `check-linked-issues` step
      - name: Get the output
        run: echo "How many linked issues? ${{ steps.check-linked-issues.outputs.linked_issues_count }}"
```

## Limitations ⚠️

Prefer closing keywords in the PR description so that edits trigger the example workflow. GitHub also supports [manual sidebar links](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/linking-a-pull-request-to-an-issue#manually-linking-a-pull-request-to-an-issue-using-the-pull-request-sidebar), which the default check can read on its next run. Adding a sidebar link alone does not trigger the workflow shown above; rerun the check or trigger another configured PR event.

Closing keywords in commit messages can close issues when the commits reach the default branch, but GitHub does not list the containing PR as linked. This action does not scan commit messages. See [GitHub's linking documentation](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/linking-a-pull-request-to-an-issue) for these distinctions.

## Referencing issues in another repository

You can also reference issues outside of the repository on which the workflow is running. This works only if the repository containing the issue is `public`. Issues in private repositories are not accessible by this action.

[![banner](https://raw.githubusercontent.com/nearform/.github/refs/heads/master/assets/os-banner-green.svg)](https://www.nearform.com/contact/?utm_source=open-source&utm_medium=banner&utm_campaign=os-project-pages)
