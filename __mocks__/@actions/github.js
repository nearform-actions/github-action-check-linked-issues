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
                  totalCount: 2,
                  nodes: [
                    {
                      number: 12345,
                      repository: {
                        nameWithOwner: "test/repo",
                      },
                    },
                    {
                      number: 456,
                      repository: {
                        nameWithOwner: "another/repository",
                      },
                    },
                  ],
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
