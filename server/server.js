// server.js
import "./config/instrument.js"; // MUST be first

import express from "express";
import cors from "cors";
import "dotenv/config";
import connectDB from "./config/db.js";
import * as Sentry from "@sentry/node";
import { clerkWebhooks } from "./controllers/webhooks.js";

const app = express();

// await connectDB();
(async () => {
  try {
    await connectDB();
  } catch (err) {
    console.error('DB connection failed', err);
  }
})();

app.use(cors());
app.use(express.json());

app.get("/debug-sentry", (req, res) => {
  throw new Error("My first Sentry error!");
});

app.get("/", (req, res) => res.send("API Working"));

app.post('/webhooks', clerkWebhooks)

Sentry.setupExpressErrorHandler(app);  // official method for v8+

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;