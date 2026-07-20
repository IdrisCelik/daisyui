import { afterEach, expect, test } from "bun:test"
import { writeFile } from "node:fs/promises"
import { join } from "node:path"
import { cssToJs } from "./cssToJs.js"
import { createTempDirTracker } from "./testUtils.js"

const tempDirs = createTempDirTracker("daisyui-css-to-js-")

afterEach(tempDirs.cleanup)

test("cssToJs compiles CSS and returns a kebab-case JS object string", async () => {
  const dir = await tempDirs.make()
  const file = join(dir, "style.css")
  await writeFile(file, ".btn-test{background-color:red;--custom-var:var(--another-var)}")

  const result = JSON.parse(await cssToJs(file))

  expect(result[".btn-test"]).toEqual({
    "background-color": "red",
    "--custom-var": "var(--another-var)",
  })
})

test("cssToJs wraps read and parse errors with file context", async () => {
  await expect(cssToJs(join(await tempDirs.make(), "missing.css"))).rejects.toThrow(
    "Error converting CSS to JS:",
  )
})

test("menu-paged compiles its nested page and back-button states", async () => {
  const result = JSON.parse(await cssToJs(join(import.meta.dirname, "../src/components/menu.css")))
  const paged = result[".menu-paged"]["@layer daisyui.l1.l2"]

  expect(paged).toMatchObject({
    "--menu-paged-arrow": "135deg",
    "--menu-paged-back-arrow": "-45deg",
    '[dir="rtl"] &': {
      "--menu-paged-arrow": "-45deg",
      "--menu-paged-back-arrow": "135deg",
    },
    ":where(li ul, li menu):before": {
      "--tw-content": "none",
      content: "var(--tw-content)",
    },
    "details::details-content": { transition: "none" },
    ":where(li > details > summary):after": {
      rotate: "var(--menu-paged-arrow)",
      translate: "0",
      transition: "none",
    },
  })
  expect(
    paged[
      "&:has(> li > details[open]) > li:not(:has(> details[open])), :where(:is(ul, menu):has(> li > details[open]) > li:not(:has(> details[open])))"
    ],
  ).toEqual({ display: "none" })
  expect(
    paged[
      ":where(li:has(> details[open]), details[open], details[open] > :is(ul, menu)), :where(details[open])::details-content"
    ],
  ).toEqual({ display: "contents" })
  expect(
    paged[":where(details[open]:has(> :is(ul, menu) > li > details[open]) > summary)"],
  ).toEqual({ display: "none" })
  expect(paged[":where(li > details[open] > summary):after"]).toEqual({
    order: -1,
    "justify-self": "flex-start",
    rotate: "var(--menu-paged-back-arrow)",
  })

  expect(result[".menu-horizontal"]["@layer daisyui.l1.l2"]["&.menu-paged"]).toEqual({
    "--menu-paged-arrow": "-135deg",
    "--menu-paged-back-arrow": "45deg",
    "& > li:not(.menu-title) > details > :is(ul, menu)": {
      animation: "none",
      transition: "none",
    },
  })
  expect(result[".menu-vertical"]["@layer daisyui.l1.l2"]["&.menu-paged"]).toEqual({
    "--menu-paged-arrow": "135deg",
    "--menu-paged-back-arrow": "-45deg",
    '[dir="rtl"] &': {
      "--menu-paged-arrow": "-45deg",
      "--menu-paged-back-arrow": "135deg",
    },
  })
})
