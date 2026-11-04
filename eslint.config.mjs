import coreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const config = [
  ...coreWebVitals,
  ...nextTypescript,
  {
    ignores: [".next/**", "out/**", "coverage/**", "node_modules/**", "public/sw.js"],
  },
];

export default config;
