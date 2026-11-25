# What it would take to use EJSON instead of JSON

Status: analysis only, nothing implemented.

## Where plain JSON is used today
- **Input (`/eval`)**: `helpers.js` rewrites a mongosh-like string into JSON with regexes (`quoteJsonKeys`, `cleanRegexValues`,
  `parseFindArgs`) and calls `JSON.parse` on the filter, projection and sort. `ISODate(...)`, `ObjectId(...)` and `/regex/`
  literals are not understood; a regex is special-cased into `{"$regex": ...}`.
- **Output**: `res.status(200).json(result)` serializes the driver's BSON values with plain JSON, which is lossy:
  `ObjectId` becomes a bare string, `Date` an ISO string (with milliseconds), `Int64`/`Decimal128` become numbers or strings,
  `Binary` and regexes are flattened. The browser shows `JSON.stringify(data, null, 2)`.
- **Agent**: the MCP server already speaks EJSON (its tool schemas use `zEJSON`) and returns text, so the AI path is unaffected.

## What EJSON gives you
`bson` (already installed with the `mongodb` driver) exports `EJSON`. Verified locally:
- `EJSON.parse('{"_id":{"$oid":"..."},"d":{"$date":"2018-01-15T00:00:00Z"},"r":{"$regularExpression":{...}}}')` yields real
  `ObjectId`, `Date` and `BSONRegExp` values, so `_id` and date queries work without string tricks.
- `EJSON.stringify(doc, { relaxed: true })` writes `{"_id":{"$oid":"..."},"d":{"$date":"1970-01-01T00:00:00Z"}}`; canonical mode
  (`relaxed: false`) additionally keeps `$numberInt/$numberLong/$numberDouble` for exact numeric types.

## Work required
1. **Input parser (the bulk).**
   - Option A (smaller): accept *EJSON in the query box* (`db.crime.find({"_id":{"$oid":"..."}})`), replacing the
     key-quoting/regex-munging with `EJSON.parse`. Keeps relaxed JSON-ish input but drops mongosh literals.
   - Option B (friendlier, larger): keep mongosh syntax (`ObjectId("..")`, `ISODate("..")`, `/re/i`) with a small tokenizer that
     converts literals to EJSON, then `EJSON.parse`. Removes `quoteJsonKeys`/`cleanRegexValues` entirely.
2. **Security re-check (must not be skipped).** EJSON introduces types that plain JSON cannot express. `{"$code": "..."}`
   parses to a BSON `Code` (JavaScript) and `$function`/`$where` still arrive as plain keys. Keep
   `assertNoForbiddenOperators` (`helpers.js`) and additionally reject `Code`/`CodeWScope`/`$code`/`$scope`/`$dbPointer`/`$ref`
   on the parsed object. Extend `security.fuzz.test.js` with EJSON wrappers (`$code`, `$regularExpression` with huge patterns,
   deeply nested `$date`/`$oid`) and keep the 1024-character input limit.
3. **Output.** Replace `res.json(result)` with `EJSON.stringify(result, { relaxed: true })` and `Content-Type: application/json`.
   The frontend can keep `JSON.stringify(data, null, 2)` after `JSON.parse` (it is still valid JSON), or render `$oid` as
   `ObjectId("...")` for a shell-like look (small formatter in `MongoQueryPromptAuto.vue`).
4. **Tests/docs.** About 900 lines in `helpers.test.js` assert the current parser; roughly the `cleanRegexValues`,
   `parseFindArgs` and `quoteJsonKeys` suites are rewritten or deleted. Update walkthrough text and examples (lessons currently
   use plain filters, no ObjectId/ISODate), and the e2e expectations.
5. **Compatibility.** Output shape changes for `_id`/dates (`"abc"` becomes `{"$oid":"abc"}`), so anything reading raw responses
   (the incident notes feature stores user text only; the AI path is separate) must be checked. Roll out behind a version
   switch if you want a safe fallback.

## Estimate and recommendation
- Output-only change: about half a day, low risk, immediate fidelity win (dates and ids keep their types).
- Input option A: 1 day including fuzz tests. Option B: 2 to 3 days.
- Recommended order: output EJSON first (relaxed), then input Option B for a faithful mongosh experience, with the security
  tests written first.
