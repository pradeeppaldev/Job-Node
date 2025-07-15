// server.js
import "./config/instrument.js"; // MUST be first

import express from "express";
import cors from "cors";
import "dotenv/config";
import connectDB from "./config/db.js";
import * as Sentry from "@sentry/node";
import { clerkWebhooks } from "./controllers/webhooks.js";
import bodyParser from "body-parser";
import companyRoutes from './routes/companyRoutes.js'
import connectCloudinary from "./config/cloudinary.js";
import jobRoutes from './routes/jobRoutes.js'
import userRoutes from './routes/userRoutes.js'
import {clerkMiddleware} from '@clerk/express'

const app = express();

// MongoDB & Cloudinary Connection
await connectDB();
await connectCloudinary();

app.post("/webhooks", bodyParser.raw({ type: "application/json" }), clerkWebhooks);

// Middleware
app.use(cors());
app.use(express.json());
app.use(clerkMiddleware());

// Routes
app.get("/debug-sentry", (req, res) => {
  throw new Error("My first Sentry error!");
});

app.get("/", (req, res) => res.send("API Working"));

app.use('/api/company', companyRoutes)

app.use('/api/jobs', jobRoutes)

app.use('/api/users', userRoutes)

Sentry.setupExpressErrorHandler(app);  // official method for v8+

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;