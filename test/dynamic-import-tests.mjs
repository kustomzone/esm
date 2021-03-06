import assert from "assert"
import compiler from "../build/compiler.js"
import helper from "./helper.js"
import path from "path"

const __dirname = helper.__dirname
const isWin = process.platform === "win32"

const abcId = "./fixture/export/abc.mjs"

const abcNs = {
  a: "a",
  b: "b",
  c: "c",
  default: "default"
}

describe("dynamic import", () => {
  it("should establish live binding of values", () =>
    import("./fixture/live.mjs").then((ns) => {
      ns.reset()
      assert.strictEqual(ns.value, 0)
      ns.add(2)
      assert.strictEqual(ns.value, 2)
    })
    .catch((e) => assert.ifError(e))
  )

  it("should support a variable id", () =>
    import(abcId)
      .then((ns) => assert.deepEqual(ns, abcNs))
      .catch((e) => assert.ifError(e))
  )

  it("should support a template string id", () =>
    import(`${abcId}`)
      .then((ns) => assert.deepEqual(ns, abcNs))
      .catch((e) => assert.ifError(e))
  )

  it("should support an expression id", () =>
    import((() => abcId)())
      .then((ns) => assert.deepEqual(ns, abcNs))
      .catch((e) => assert.ifError(e))
  )

  it("should support the file protocol", () =>
    import("file:" + (isWin ? "///" : "//") + path.join(__dirname, abcId))
      .then((ns) => assert.deepEqual(ns, abcNs))
      .catch((e) => assert.ifError(e))
  )

  it("should support whitespace between `import`, `(`, and `)`", () =>
    import
    /* eslint no-unexpected-multiline: off */
    (
    "./fixture/export/abc.mjs"
    )

      .then((ns) => assert.deepEqual(ns, abcNs))
      .catch((e) => assert.ifError(e))
  )

  it("should support `import()` in an assignment", () => {
    const p = import("./fixture/export/abc.mjs")
    assert.ok(p instanceof Promise)
  })

  it("should support `import()` in a function", () => {
    function p() {
      return import("./fixture/export/abc.mjs")
    }

    assert.ok(p() instanceof Promise)
  })

  it("should support `import()` with yield", () => {
    function* p() {
      yield import("./fixture/export/abc.mjs")
    }

    assert.ok(p())
  })

  it("should expect exactly one argument", () => {
    const invalids = [
      "import()",
      "import(a,b)",
      "import(...[a])",
      "import.then()",
      "import.call(a,b)"
    ]

    invalids.forEach((code) => {
      assert.throws(() => compiler.compile(code), SyntaxError)
    })
  })

  it("should parse URL ids", () =>
    Promise.all([
      import(abcId + "?a"),
      import(abcId + "#a"),
      import(abcId.replace("abc", "%61%62%63"))
    ])
    .then((namespaces) => namespaces.forEach((ns) =>
      assert.deepEqual(ns, abcNs)
    ))
    .catch((e) => assert.ifError(e))
  )

  it("should not parse URL ids with encoded slashes", () =>
    Promise.all([
      abcId.replace("/", "%2f"),
      abcId.replace("/", "%2F"),
      abcId.replace("/", isWin ? "%5c" : "%2f"),
      abcId.replace("/", isWin ? "%5C" : "%2F")
    ].map((id) =>
      import(id)
        .then(() => assert.ok(false))
        .catch(({ code }) => assert.strictEqual(code, "MODULE_NOT_FOUND"))
    ))
  )

  it("should not resolve non-local dependencies", () =>
    Promise.all([
      "home-node-libraries",
      "home-node-modules",
      "node-path",
      "prefix-path"
    ].map((id) =>
      import(id)
        .then(() => assert.ok(false))
        .catch(({ code }) => assert.strictEqual(code, "MODULE_NOT_FOUND"))
    ))
  )
})
