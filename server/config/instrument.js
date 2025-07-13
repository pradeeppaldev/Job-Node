// instrument.js
import * as Sentry from "@sentry/node";

// Initialize as early as possible, before any other imports
Sentry.init({
  dsn: process.env.SENTRY_DSN || "https://681be2999a75fa60a3984147c2db1017@o4509652799979520.ingest.us.sentry.io/4509652811382784",
  sendDefaultPii: true,
  tracesSampleRate: 1.0
});
