import * as esbuild from "esbuild-wasm";
import esbuildWasmURL from "esbuild-wasm/esbuild.wasm?url";

// TODO idk about all this initialization
const esbuildInitalized = esbuild.initialize({
  wasmURL: esbuildWasmURL,
});

export async function transformJavaScript(
  source: string,
  loader: "ts" | "jsx" | "tsx",
  sourcePath?: string,
): Promise<string> {
  await esbuildInitalized;
  return (
    await esbuild.transform(source, getTransformOptions(loader, sourcePath))
  ).code;
}

function getTransformOptions(
  loader: "ts" | "jsx" | "tsx",
  sourcePath?: string,
): esbuild.TransformOptions {
  switch (loader) {
    case "ts":
      return {
        loader,
        sourcefile: sourcePath,
        tsconfigRaw: '{"compilerOptions": {"verbatimModuleSyntax": true}}',
      };
    case "jsx":
      return {
        loader,
        jsx: "automatic",
        jsxImportSource: "npm:react",
        sourcefile: sourcePath,
      };
    case "tsx":
      return {
        loader,
        // jsx: "automatic",
        jsx: "transform",
        jsxImportSource: "npm:react",
        sourcefile: sourcePath,
        tsconfigRaw: '{"compilerOptions": {"verbatimModuleSyntax": true}}',
      };
    default:
      throw new Error(`unknown loader: ${loader}`);
  }
}
