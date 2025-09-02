import * as esbuild from "esbuild-wasm";
import esbuildWasmURL from "esbuild-wasm/esbuild.wasm?url";

// TODO idk about all this initialization
const esbuildInitalized =
  typeof window !== "undefined"
    ? esbuild.initialize({
        wasmURL: esbuildWasmURL,
      })
    : Promise.resolve();

export async function transformJavaScript(
  source: string,
  sourcePath?: string,
): Promise<string> {
  await esbuildInitalized;
  const transformOptions: esbuild.TransformOptions = {
    loader: "tsx",
    // jsx: "automatic",
    jsx: "transform",
    jsxImportSource: "npm:react",
    sourcefile: sourcePath,
    tsconfigRaw: '{"compilerOptions": {"verbatimModuleSyntax": true}}',
  };
  return (await esbuild.transform(source, transformOptions)).code;
}
