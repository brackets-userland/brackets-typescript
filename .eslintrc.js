module.exports = {
  extends: 'pureprofile',
  parser: 'espree',
  parserOptions: { ecmaVersion: 5 },
  env: { node: true },
  rules: {
    // disable es6 rules
    'no-console': 0,
    'no-param-reassign': 0,
    'no-var': 0,
    'prefer-arrow-callback': 0,
    'prefer-reflect': 0,
    'prefer-rest-params': 0,
    'prefer-spread': 0,
    'prefer-template': 0,    
    'strict': [2, 'function']
  },
  globals: {
    $: false,
    brackets: false,
    define: false
  }
};
