import nextConfig from "eslint-config-next/core-web-vitals";

/** @type {import("eslint").Linter.Config[]} */
const eslintConfig = [
  {
    ignores: [".next/**", "node_modules/**"],
  },
  ...nextConfig,
  {
    // Pin the React version: eslint-plugin-react's auto-detection calls
    // context.getFilename(), which ESLint 10 removed.
    settings: { react: { version: "18.2.0" } },
  },
];

export default eslintConfig;
