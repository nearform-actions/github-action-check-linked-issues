module.exports = {
  __esModule: true,
  getOctokit: jest.fn(() => {
    return {
      graphql: jest.fn(() => {
        return new Promise((resolve) => {
          resolve({
            repository: {
              pullRequest: {
                id: "fake-pr-id",
                comments: {
                  nodes: [
                    {
                      id: "fake-comment-id",
                      author: {
                        login: "fake-login",
                      },
                    },
                    {
                      id: "fake-comment-id-2",
                      author: {
                        login: "github-actions",
                      },
                    },
                  ],
                },
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
