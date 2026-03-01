import cors from "cors";
import express from "express";
import morgan from "morgan";
import { authRequired } from "./middleware/auth.js";
import aorsRouter from "./routes/aors.routes.js";
import authRouter from "./routes/auth.routes.js";
import dashboardRouter from "./routes/dashboard.routes.js";
import eorsRouter from "./routes/eors.routes.js";
import healthRouter from "./routes/health.routes.js";
import projectsRouter from "./routes/projects.routes.js";
import providersRouter from "./routes/providers.routes.js";
import rfisRouter from "./routes/rfis.routes.js";
import submittalsRouter from "./routes/submittals.routes.js";

const app = express();

const normalizeAllowedOrigins = () => {
  const raw = process.env.CORS_ORIGIN;
  if (!raw || raw.trim() === "*") return { allowAll: true, patterns: [] };

  const patterns = raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map((origin) => {
      if (origin === "*") return /^https?:\/\/.+$/i;
      if (!origin.includes("*")) {
        return new RegExp(`^${origin.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
      }
      const escaped = origin
        .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
        .replace(/\*/g, ".*");
      return new RegExp(`^${escaped}$`, "i");
    });

  return { allowAll: false, patterns };
};

const corsRules = normalizeAllowedOrigins();

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser tools or same-origin calls without Origin header.
      if (!origin) return callback(null, true);
      if (corsRules.allowAll) return callback(null, true);

      const isAllowed = corsRules.patterns.some((pattern) => pattern.test(origin));
      if (isAllowed) return callback(null, true);
      return callback(new Error("CORS origin not allowed"), false);
    }
  })
);
app.use(express.json());
app.use(morgan("dev"));

app.get("/", (_req, res) => {
  res.status(200).send("ok");
});

app.get("/api", (_req, res) => {
  res.json({ message: "MG3 ProMag API is running" });
});

app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/dashboard", authRequired, dashboardRouter);
app.use("/api/projects", authRequired, projectsRouter);
app.use("/api/aors", authRequired, aorsRouter);
app.use("/api/eors", authRequired, eorsRouter);
app.use("/api/providers", authRequired, providersRouter);
app.use("/api/submittals", authRequired, submittalsRouter);
app.use("/api/rfis", authRequired, rfisRouter);

export default app;
