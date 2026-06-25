module.exports = {
  // ... your other config settings
  rules: {
    // Force single quotes in JavaScript/TypeScript
    'quotes': ['error', 'single'],
    // Disallow semicolons at the end of statements
    'semi': ['error', 'never'],

    // Force single quotes inside Vue templates
    'vue/html-quotes': ['error', 'single'],
    // If you are using the prettier plugin inside eslint, match it here:
    'prettier/prettier': ['error', { singleQuote: true, semi: false }]
  }
}
