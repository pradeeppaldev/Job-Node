// server.js
import "./config/instrument.js"; // MUST be first

import express from "express";
import cors from "cors";
import "dotenv/config";
import connectDB from "./config/db.js";
import * as Sentry from "@sentry/node";

const app = express();

await connectDB();

app.get("/debug-sentry", (req, res) => {
  throw new Error("My first Sentry error!");
});

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => res.send("API Working"));

Sentry.setupExpressErrorHandler(app);  // ✅ official method for v8+

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
