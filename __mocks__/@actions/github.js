module.exports = {
  __esModule: true,
  getOctokit: jest.fn(() => {
    return {
      graphql: jest.fn(() => {
        return new Promise((resolve) => {
          resolve({
            repository: {
              pullRequest: {
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
