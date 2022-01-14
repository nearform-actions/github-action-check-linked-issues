module.exports = {
  __esModule: true,
  getOctokit: jest.fn(() => {
    return {
      paginate: jest.fn(() => {
        return new Promise((resolve) =>
          resolve([
            {
              node_id: "fake-node-id",
              body: '<!-- metadata = {"action":"linked_issue"} -->',
            },
          ])
        );
      }),
      graphql: jest.fn(() => {
        return new Promise((resolve) => {
          resolve({
            repository: {
              pullRequest: {
                id: "fake-pr-id",
                closingIssuesReferences: {
                  totalCount: 1,
                },
              },
            },
          });
        });
      }),
    };
  }),
  context: jest.fn(),
};
