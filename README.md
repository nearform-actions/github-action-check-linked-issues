# github-action-check-linked-issues

GitHub action to check if pull requests have their corresponding issues linked, in order to enforce traceability.

### Why?

When you manually link up issues from the sidebar on the github.com UI, the workflow doesn't trigger. On the other hand, if you link up issues from your commits, then the PR doesn't get linked on your _Projects_ board.

This is a GitHub limitation. This table shows what happens:

| Linked from:    | Workflow triggered? | Query works? | Appears on Projects? |
| --------------- | ------------------- | ------------ | -------------------- |
| Sidebar UI      | ❌ | ✅ | ✅ |
| Commit message  | ✅ | ❌ | ❌ |
| PR description  | ✅ | ✅ | ✅ |


Please **DO NOT** link issues manually from the sidebar, neither from commit messages.

## Input / Output

See [action.yml](action.yml).

## Usage

Configure a workflow to run a job on these `pull_request` events:

```yaml
on:
  pull_request:
    types: [opened, edited, reopened, synchronize]

jobs:
  check_pull_requests:
    runs-on: ubuntu-latest
    name: Check linked issues
    steps:
      - uses: nearform/github-action-check-linked-issues@v1
        id: check-linked-issues
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          exclude-branches: "release/**, dependabot/**"
      # OPTIONAL: Use the output from the `check-linked-issues` step
      - name: Get the output
        run: echo "How many linked issues? ${{ steps.check-linked-issues.outputs.linked_issues_count }}"
```

 When the job fails, it will add a new comment by default. You can also write your custom comment:

```yaml
on:
  pull_request:
    types: [opened, edited, reopened, synchronize]

jobs:
  check_pull_requests:
    runs-on: ubuntu-latest
    name: Check linked issues
    steps:
      - uses: nearform/github-action-check-linked-issues@v1
        id: check-linked-issues
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          exclude-branches: "release/**, dependabot/**"
          custom-body-comment: "Here is a custom comment!"

      # OPTIONAL: Use the output from the `check-linked-issues` step
      - name: Get the output
        run: echo "How many linked issues? ${{ steps.check-linked-issues.outputs.linked_issues_count }}"
```

Or disable the feature to add comments. Setting `comment` to an empty string.

```yaml
on:
  pull_request:
    types: [opened, edited, reopened, synchronize]

jobs:
  check_pull_requests:
    runs-on: ubuntu-latest
    name: Check linked issues
    steps:
      - uses: nearform/github-action-check-linked-issues@v1
        id: check-linked-issues
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          exclude-branches: "release/**, dependabot/**"
          comment: ""

      # OPTIONAL: Use the output from the `check-linked-issues` step
      - name: Get the output
        run: echo "How many linked issues? ${{ steps.check-linked-issues.outputs.linked_issues_count }}"
```

When the action cannot find any linked issues it will fail explaining the reason.

## Limitations ⚠️

Currently **you must link issues from the pull request description**.

_See the [docs](https://docs.github.com/en/issues/tracking-your-work-with-issues/linking-a-pull-request-to-an-issue#linking-a-pull-request-to-an-issue-using-a-keyword) for more information about the supported syntax._
