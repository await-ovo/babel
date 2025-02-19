import { declarePreset } from "@babel/helper-plugin-utils";
import transformTypeScript from "@babel/plugin-transform-typescript";
import syntaxJSX from "@babel/plugin-syntax-jsx";
import normalizeOptions from "./normalize-options";
import type { Options } from "./normalize-options";

export default declarePreset((api, opts: Options) => {
  api.assertVersion(7);

  const {
    allExtensions,
    allowNamespaces,
    disallowAmbiguousJSXLike,
    isTSX,
    jsxPragma,
    jsxPragmaFrag,
    onlyRemoveTypeImports,
    optimizeConstEnums,
  } = normalizeOptions(opts);

  const pluginOptions = process.env.BABEL_8_BREAKING
    ? (disallowAmbiguousJSXLike: boolean) => ({
        allowNamespaces,
        disallowAmbiguousJSXLike,
        jsxPragma,
        jsxPragmaFrag,
        onlyRemoveTypeImports,
        optimizeConstEnums,
      })
    : (disallowAmbiguousJSXLike: boolean) => ({
        allowDeclareFields: opts.allowDeclareFields,
        allowNamespaces,
        disallowAmbiguousJSXLike,
        jsxPragma,
        jsxPragmaFrag,
        onlyRemoveTypeImports,
        optimizeConstEnums,
      });

  const getPlugins = (isTSX: boolean, disallowAmbiguousJSXLike: boolean) => {
    if (process.env.BABEL_8_BREAKING) {
      const tsPlugin = [
        transformTypeScript,
        pluginOptions(disallowAmbiguousJSXLike),
      ];
      return isTSX ? [tsPlugin, syntaxJSX] : [tsPlugin];
    } else {
      return [
        [
          transformTypeScript,
          { isTSX, ...pluginOptions(disallowAmbiguousJSXLike) },
        ],
      ];
    }
  };

  return {
    overrides: allExtensions
      ? [{ plugins: getPlugins(isTSX, disallowAmbiguousJSXLike) }]
      : // Only set 'test' if explicitly requested, since it requires that
        // Babel is being called with a filename.
        [
          {
            test: !process.env.BABEL_8_BREAKING
              ? /\.ts$/
              : filename => filename == null || filename.endsWith(".ts"),
            plugins: getPlugins(false, false),
          },
          {
            test: !process.env.BABEL_8_BREAKING
              ? /\.mts$/
              : filename => filename?.endsWith(".mts"),
            sourceType: "module",
            plugins: getPlugins(false, true),
          },
          {
            test: !process.env.BABEL_8_BREAKING
              ? /\.cts$/
              : filename => filename?.endsWith(".cts"),
            sourceType: "script",
            plugins: getPlugins(false, true),
          },
          {
            test: !process.env.BABEL_8_BREAKING
              ? /\.tsx$/
              : filename => filename?.endsWith(".tsx"),
            // disallowAmbiguousJSXLike is a no-op when parsing TSX, since it's
            // always disallowed.
            plugins: getPlugins(true, false),
          },
        ],
  };
});
