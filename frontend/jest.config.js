module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testPathIgnorePatterns: ['/node_modules/', '/.expo/', '/dist/'],
  clearMocks: true,
  moduleNameMapper: { '^bcryptjs/index.js$': 'bcryptjs' },
};
