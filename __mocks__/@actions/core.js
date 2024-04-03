module.exports = {
  __esModule: true,
  info: jest.fn(),
  debug: jest.fn(),
  notice: jest.fn(),
  getInput: jest.fn(),
  getBooleanInput: jest.fn(() => {
    const github = require("@actions/github");
    return github.context.looseMatching ?? false;
  }),
  setFailed: jest.fn(),
  setOutput: jest.fn(),
};
