import cors from "cors";
import express from "express";
import morgan from "morgan";
import { authRequired } from "./middleware/auth.js";
import actionItemsRouter from "./routes/action-items.routes.js";
import authRouter from "./routes/auth.routes.js";
import dashboardRouter from "./routes/dashboard.routes.js";
import healthRouter from "./routes/health.routes.js";
import projectsRouter from "./routes/projects.routes.js";
import rfisRouter from "./routes/rfis.routes.js";
import submittalsRouter from "./routes/submittals.routes.js";

const app = express();

const buildCorsOrigin = () => {
  const raw = process.env.CORS_ORIGIN;
  if (!raw || raw.trim() === "*") return true;

  return raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
};

app.use(cors({ origin: buildCorsOrigin() }));
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
app.use("/api/submittals", authRequired, submittalsRouter);
app.use("/api/rfis", authRequired, rfisRouter);
app.use("/api/action-items", authRequired, actionItemsRouter);

export default app;
