import "dotenv/config";
import app from "./app.js";

const port = Number(process.env.PORT) || 4000;

app.listen(port, "0.0.0.0", () => {
  // Keep startup output explicit for container logs.
  console.log(`Backend listening on port ${port}`);
});
