const fs = require("fs").promises;
const fssync = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const srcDir = "./src";
const distDir = "./dist";
const distSrcDir = path.join(distDir, "src");
const assetsDir = "./assets";
const jsonFiles = ["system.json", "projects.json", "info.json"];
const filePattern = "**/*.@(css|html|js)";

const terserOptions = { mangle: true, compress: true };
const htmlMinifierOptions = {
  collapseWhitespace: true,
  removeComments: true,
  minifyCSS: true,
  minifyJS: false,
  removeAttributeQuotes: false,
  removeOptionalTags: false,
};
const obfuscationOptions = {
  compact: true,
  controlFlowFlattening: false,
  deadCodeInjection: false,
  selfDefending: false,
  stringArray: true,
  stringArrayEncoding: ["base64"],
  stringArrayThreshold: 0.5,
  transformObjectKeys: false,
  unicodeEscapeSequence: false,
  simplify: true,
  target: "browser",
  renameGlobals: false,
  reservedNames: [
    "^setupRobustOverlayHover$",
    "^checkInitialHover$",
    "^alignDescCardToMedia$",
  ],
};

const GHPAGES_REPO = "PortfolioXP"; // <-- your repo name

async function cleanDist() {
  if (fssync.existsSync(distDir)) {
    execSync(`rd /s /q dist`);
  }
  await fs.mkdir(distDir, { recursive: true });
}

async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

async function rewriteBasePathsInDist(basePath) {
  const exts = [".html", ".js", ".css"];
  async function walk(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (let entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (exts.includes(path.extname(fullPath))) {
        let content = await fs.readFile(fullPath, "utf8");
        // Rewrite root-relative asset and JSON paths
        content = content
          .replace(
            /(src|href)=\["']\/(assets|apps|styles|scripts|info\.json|projects\.json|system\.json)/g,
            `$1=\"${basePath}$2`,
          )
          .replace(
            /url\(\s*["']?\/(assets|apps|styles|scripts)\//g,
            `url(${basePath}$1/`,
          );
        await fs.writeFile(fullPath, content, "utf8");
      }
    }
  }
  await walk(distDir);
}

async function main() {
  const { glob } = await import("glob");
  const terser = await import("terser");
  const csso = await import("csso");
  const HTMLMinifier = (await import("html-minifier-terser")).default;
  const JavaScriptObfuscator = (await import("javascript-obfuscator")).default;

  await cleanDist();

  // 1. Minify/obfuscate src files and output to dist/src
  const srcFiles = await glob(filePattern, {
    cwd: srcDir,
    nodir: true,
    dot: true,
  });
  await Promise.all(
    srcFiles.map(async (file) => {
      const srcFilePath = path.join(srcDir, file);
      const distFilePath = path.join(distSrcDir, file); // Output to dist/src/...
      await fs.mkdir(path.dirname(distFilePath), { recursive: true });
      const ext = path.extname(file).toLowerCase();
      const content = await fs.readFile(srcFilePath, "utf8");
      let out;
      if (ext === ".js") {
        const min = await terser.minify(content, terserOptions);
        const obf = JavaScriptObfuscator.obfuscate(
          min.code,
          obfuscationOptions,
        );
        out = obf.getObfuscatedCode();
      } else if (ext === ".css") {
        out = csso.minify(content).css;
      } else if (ext === ".html") {
        out = await HTMLMinifier.minify(content, htmlMinifierOptions);
      }
      await fs.writeFile(distFilePath, out, "utf8");
    }),
  );

  // 2. Copy assets to dist/assets
  if (fssync.existsSync(assetsDir)) {
    await copyDir(assetsDir, path.join(distDir, "assets"));
  }

  // 3. Copy JSON files to dist/
  for (let file of jsonFiles) {
    if (fssync.existsSync(file)) {
      await fs.copyFile(file, path.join(distDir, file));
    }
  }

  // 4. Process index.html and output to dist/index.html
  if (fssync.existsSync("index.html")) {
    let html = await fs.readFile("index.html", "utf8");
    html = html.replace(
      /(href|src)=(['"])(\.\/?\/)?src\/(styles|scripts|apps)\//g,
      "$1=$2src/$4/",
    );
    const minified = await HTMLMinifier.minify(html, htmlMinifierOptions);
    await fs.writeFile(path.join(distDir, "index.html"), minified, "utf8");
  }

  // 5. Rewrite base paths for local or GitHub Pages
  const isGitHubPages = process.env.GHPAGES === "true";
  const basePath = isGitHubPages ? `/${GHPAGES_REPO}/` : "/";
  await rewriteBasePathsInDist(basePath);

  console.log(
    "Build complete. dist/ mirrors the project root and is ready for deployment.",
  );
}

main().catch((err) => {
  console.error("[BUILD SCRIPT] CRITICAL ERROR IN MAIN:", err);
  process.exit(1); // Exit with error code if main crashes
});
