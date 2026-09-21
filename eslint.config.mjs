import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });
const config = [
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts", "docs/design-refs/**", "docs/prototype-screenshots/**", "docs/Recriação página inicial aluno/**"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];
export default config;
