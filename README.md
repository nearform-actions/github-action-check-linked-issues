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
| `loose-matching`                  | No | `false`              | A boolean value indicating whether the action should verify linked issues inside a PR's description, merging onto any branch (including non-default branches like `main` or `master`). When enabled, this option supports both local issues (e.g., `#123`) and external ones (e.g., `https://github.com/org-name/repo/issues/123` or `org-name/repo#123`). Associating a pull request with an issue requires the use of any of the [supported keywords](https://docs.github.com/en/issues/tracking-your-work-with-issues/linking-a-pull-request-to-an-issue#linking-a-pull-request-to-an-issue-using-a-keyword) in the pull request's description (e.g., `fixes #123`).|
| `skip-linked-issues-check-label` | No | `no-issue` | A label that causes the action to execute but skip the actual linked issues check. If the check is skipped, the `check_skipped` output is set to `true`. Any present comments added by this action are also deleted. Useful when incorporating this action into multi-action workflows.|

## Outputs

| output                | description                                                      |
|-----------------------|------------------------------------------------------------------|
| `linked_issues_count` | The total number of issues linked to your pull request.          |
| `issues`              | A stringified array containing the numbers of the linked issues, of the form ["some/repo#123", "another/repository#456"] |
| `check_skipped`       | Will be set to `true` if the linked issues check was skipped. |

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

Currently **you must link issues from the pull request description**.

_See the [docs](https://docs.github.com/en/issues/tracking-your-work-with-issues/linking-a-pull-request-to-an-issue#linking-a-pull-request-to-an-issue-using-a-keyword) for more information about the supported syntax._

### Why?

When you manually link up issues from the sidebar on the github.com UI, the workflow doesn't trigger. On the other hand, if you link up issues from your commits, then the PR doesn't get linked on your _Projects_ board.

This is a GitHub limitation. This table shows what happens:

| Linked from:    | Workflow triggered? | Query works? | Appears on Projects? |
| --------------- | ------------------- | ------------ | -------------------- |
| Sidebar UI      | ❌ | ✅ | ✅ |
| Commit message  | ✅ | ❌ | ❌ |
| PR description  | ✅ | ✅ | ✅ |


Please **DO NOT** link issues manually from the sidebar, neither from commit messages.

## Referencing issues in another repository

You can also reference issues outside of the repository on which the workflow is running. This works only if the repository containing the issue is `public`. Issues in private repositories are not accessible by this action.

[![banner](https://raw.githubusercontent.com/nearform/.github/refs/heads/master/assets/os-banner-green.svg)](https://www.nearform.com/contact/?utm_source=open-source&utm_medium=banner&utm_campaign=os-project-pages)
