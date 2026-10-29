const express = require("express");
const { db } = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;
const MODES = ["Remote", "Hybrid", "On-site"];

app.use(express.json({ limit: "10kb" }));

// Safe request log: method, path and status only (never request bodies)
app.use((req, res, next) => {
  res.on("finish", () => console.log(`${req.method} ${req.path} ${res.statusCode}`));
  next();
});

const toRecord = (row) => ({ ...row, skills: JSON.parse(row.skills) });

const fail = (res, code, message, details) =>
  res.status(code).json({ status: "error", error: { message, details: details || [] } });

// Checks a request body; returns a list of problems (empty list = valid)
function validate(body, { partial = false } = {}) {
  const errors = [];
  const has = (k) => body[k] !== undefined;
  const text = (k, max = 100) => {
    if (!partial || has(k)) {
      if (typeof body[k] !== "string" || body[k].trim() === "")
        errors.push(`${k} is required and must be a non-empty string`);
      else if (body[k].length > max) errors.push(`${k} must be at most ${max} characters`);
    }
  };
  text("title");
  text("domain");
  text("location");
  if (!partial || has("mode")) {
    if (!MODES.includes(body.mode)) errors.push(`mode must be one of: ${MODES.join(", ")}`);
  }
  if (!partial || has("skills")) {
    if (!Array.isArray(body.skills) || body.skills.length > 20 ||
        !body.skills.every((s) => typeof s === "string" && s.trim() !== ""))
      errors.push("skills must be an array of up to 20 non-empty strings");
  }
  if (!partial || has("openings")) {
    if (!Number.isInteger(body.openings) || body.openings < 0)
      errors.push("openings must be a whole number, 0 or more");
  }
  return errors;
}

// LIST: GET /internships?page=1&limit=5&domain=...&mode=...&q=...
app.get("/internships", (req, res) => {
  const page = parseInt(req.query.page ?? "1", 10);
  const limit = parseInt(req.query.limit ?? "5", 10);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 50)
    return fail(res, 400, "page must be 1 or more and limit must be between 1 and 50");
  if (req.query.mode && !MODES.includes(req.query.mode))
    return fail(res, 400, `mode must be one of: ${MODES.join(", ")}`);

  const where = [];
  const params = {};
  if (req.query.domain) { where.push("domain = @domain"); params.domain = req.query.domain; }
  if (req.query.mode) { where.push("mode = @mode"); params.mode = req.query.mode; }
  if (req.query.q) { where.push("(title LIKE @q OR skills LIKE @q)"); params.q = `%${req.query.q}%`; }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const total = db.prepare(`SELECT COUNT(*) AS n FROM internships ${clause}`).get(params).n;
  const rows = db
    .prepare(`SELECT * FROM internships ${clause} ORDER BY id LIMIT @limit OFFSET @offset`)
    .all({ ...params, limit, offset: (page - 1) * limit });

  res.json({
    status: "success",
    data: rows.map(toRecord),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

// DETAIL: GET /internships/:id
app.get("/internships/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM internships WHERE id = ?").get(req.params.id);
  if (!row) return fail(res, 404, "Internship not found");
  res.json({ status: "success", data: toRecord(row) });
});

// CREATE: POST /internships
app.post("/internships", (req, res) => {
  const errors = validate(req.body || {});
  if (errors.length) return fail(res, 400, "Validation failed", errors);

  const last = db
    .prepare("SELECT id FROM internships ORDER BY CAST(SUBSTR(id, 5) AS INTEGER) DESC LIMIT 1")
    .get();
  const next = last ? parseInt(last.id.slice(4), 10) + 1 : 101;
  const record = { ...req.body, id: `INT-${next}` };

  db.prepare(
    `INSERT INTO internships (id, title, domain, mode, location, skills, openings)
     VALUES (@id, @title, @domain, @mode, @location, @skills, @openings)`
  ).run({
    id: record.id,
    title: record.title.trim(),
    domain: record.domain.trim(),
    mode: record.mode,
    location: record.location.trim(),
    skills: JSON.stringify(record.skills),
    openings: record.openings,
  });

  const row = db.prepare("SELECT * FROM internships WHERE id = ?").get(record.id);
  res.status(201).json({ status: "success", data: toRecord(row) });
});

// UPDATE: PUT /internships/:id (send only the fields you want to change)
app.put("/internships/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM internships WHERE id = ?").get(req.params.id);
  if (!existing) return fail(res, 404, "Internship not found");

  const body = req.body || {};
  const errors = validate(body, { partial: true });
  if (errors.length) return fail(res, 400, "Validation failed", errors);

  const merged = { ...toRecord(existing), ...body, id: existing.id };
  db.prepare(
    `UPDATE internships
     SET title=@title, domain=@domain, mode=@mode, location=@location, skills=@skills, openings=@openings
     WHERE id=@id`
  ).run({
    id: merged.id,
    title: merged.title.trim(),
    domain: merged.domain.trim(),
    mode: merged.mode,
    location: merged.location.trim(),
    skills: JSON.stringify(merged.skills),
    openings: merged.openings,
  });

  const row = db.prepare("SELECT * FROM internships WHERE id = ?").get(existing.id);
  res.json({ status: "success", data: toRecord(row) });
});

// DELETE: DELETE /internships/:id
app.delete("/internships/:id", (req, res) => {
  const result = db.prepare("DELETE FROM internships WHERE id = ?").run(req.params.id);
  if (result.changes === 0) return fail(res, 404, "Internship not found");
  res.json({ status: "success", data: { id: req.params.id, deleted: true } });
});

// Unknown routes
app.use((req, res) => fail(res, 404, "Route not found"));

// Errors (for example, invalid JSON in the request body)
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") return fail(res, 400, "Request body is not valid JSON");
  console.error("Unexpected error:", err.message);
  fail(res, 500, "Something went wrong on the server");
});

if (require.main === module) {
  app.listen(PORT, () => console.log(`Internship API running on http://localhost:${PORT}`));
}

module.exports = app;
