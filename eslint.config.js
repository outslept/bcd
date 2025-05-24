import reactPlugin from "@eslint-react/eslint-plugin";
import { sxzz } from "@sxzz/eslint-config";
import reactDomPlugin from "eslint-plugin-react-dom";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import reactHookExtraPlugin from "eslint-plugin-react-hooks-extra";
import reactRefreshPlugin from "eslint-plugin-react-refresh";
import reactWebApiPlugin from "eslint-plugin-react-web-api";

export const GLOB_SRC = "**/*.?([cm])[jt]s?(x)";

export default sxzz(
  {
    ignores: ["**/generated/**"],
  },

  {
    name: "custom/react-setup",
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
      "react-refresh": reactRefreshPlugin,
      "react-hooks-extra": reactHookExtraPlugin,
      "react-dom": reactDomPlugin,
      "react-web-api": reactWebApiPlugin,
    },
  },

  {
    name: "custom/react-rules",
    files: [GLOB_SRC],
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      sourceType: "module",
    },
    rules: {
      // eslint-plugin-react-x https://eslint-react.xyz/docs/rules/overview#core-rules
      "react/jsx-no-duplicate-props": "warn",
      "react/jsx-uses-vars": "warn",
      "react/no-access-state-in-setstate": "error",
      "react/no-array-index-key": "warn",
      "react/no-children-count": "warn",
      "react/no-children-for-each": "warn",
      "react/no-children-map": "warn",
      "react/no-children-only": "warn",
      "react/no-children-to-array": "warn",
      "react/no-clone-element": "warn",
      "react/no-comment-textnodes": "warn",
      "react/no-component-will-mount": "error",
      "react/no-component-will-receive-props": "error",
      "react/no-component-will-update": "error",
      "react/no-context-provider": "warn",
      "react/no-create-ref": "error",
      "react/no-default-props": "error",
      "react/no-direct-mutation-state": "error",
      "react/no-duplicate-key": "warn",
      "react/no-forward-ref": "warn",
      "react/no-implicit-key": "warn",
      "react/no-missing-key": "error",
      "react/no-nested-component-definitions": "error",
      "react/no-prop-types": "error",
      "react/no-redundant-should-component-update": "error",
      "react/no-set-state-in-component-did-mount": "warn",
      "react/no-set-state-in-component-did-update": "warn",
      "react/no-set-state-in-component-will-update": "warn",
      "react/no-string-refs": "error",
      "react/no-unsafe-component-will-mount": "warn",
      "react/no-unsafe-component-will-receive-props": "warn",
      "react/no-unsafe-component-will-update": "warn",
      "react/no-unstable-context-value": "warn",
      "react/no-unstable-default-props": "warn",
      "react/no-unused-class-component-members": "warn",
      "react/no-unused-state": "warn",
      "react/no-use-context": "warn",
      "react/no-useless-forward-ref": "warn",

      // eslint-plugin-react-dom https://eslint-react.xyz/docs/rules/overview#dom-rules
      "react-dom/no-dangerously-set-innerhtml": "warn",
      "react-dom/no-dangerously-set-innerhtml-with-children": "error",
      "react-dom/no-find-dom-node": "error",
      "react-dom/no-flush-sync": "error",
      "react-dom/no-hydrate": "error",
      "react-dom/no-missing-button-type": "warn",
      "react-dom/no-missing-iframe-sandbox": "warn",
      "react-dom/no-namespace": "error",
      "react-dom/no-render": "error",
      "react-dom/no-render-return-value": "error",
      "react-dom/no-script-url": "warn",
      "react-dom/no-unsafe-iframe-sandbox": "warn",
      "react-dom/no-unsafe-target-blank": "warn",
      "react-dom/no-use-form-state": "error",
      "react-dom/no-void-elements-with-children": "error",

      // eslint-plugin-react-hooks https://github.com/facebook/react/tree/main/packages/eslint-plugin-react-hooks/src/rules
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/rules-of-hooks": "error",

      // eslint-plugin-react-hooks-extra https://eslint-react.xyz/docs/rules/overview#hooks-extra-rules
      "react-hooks-extra/no-direct-set-state-in-use-effect": "error",
      "react-hooks-extra/no-unnecessary-use-prefix": "error",
      "react-hooks-extra/no-unnecessary-use-memo": "error",
      "react-hooks-extra/no-unnecessary-use-callback": "error",
      "react-hooks-extra/prefer-use-state-lazy-initialization": "error",

      // eslint-plugin-react-web-api https://eslint-react.xyz/docs/rules/overview#web-api-rules
      "react-web-api/no-leaked-event-listener": "error",
      "react-web-api/no-leaked-interval": "error",
      "react-web-api/no-leaked-resize-observer": "error",
      "react-web-api/no-leaked-timeout": "error",
    },
  },
);
