
import dns from "node:dns";
import app from "./app.js";
import { env } from "./config/env.js";
import { connectDB } from "./config/db.js";

// Use DNS servers that successfully resolved MongoDB Atlas
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const start = async () => {
  try {
    await connectDB();

    app.listen(env.port, () => {
      console.log(
        `StockPilot API (Auth module) running on port ${env.port} [${env.nodeEnv}]`
      );
    });
  } catch (error) {
    console.error("Server startup failed.", { name: error.name, code: error.code });
    process.exit(1);
  }
};

start();
