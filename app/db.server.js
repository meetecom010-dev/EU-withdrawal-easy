import mongoose from "mongoose";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME;

// Cache the connection promise on `global` in dev so Vite/HMR reloads reuse
// the same connection instead of opening a new one on every file change.
async function createConnection() {
  if (!uri) {
    throw new Error(
      "MONGODB_URI is not set. Add it to your .env file (see .env.example).",
    );
  }

  mongoose.set("strictQuery", true);
  // MONGODB_URI can omit the database name (e.g. "mongodb://localhost:27017/")
  // in which case MONGODB_DB_NAME picks which database to use — otherwise
  // the driver silently falls back to a database called "test".
  await mongoose.connect(uri, dbName ? { dbName } : undefined);
  console.log(
    `Connected to MongoDB database "${mongoose.connection.name}" at ${mongoose.connection.host}`,
  );
  return mongoose.connection;
}

if (process.env.NODE_ENV !== "production") {
  if (!global.mongooseGlobal) {
    global.mongooseGlobal = createConnection();
  }
}

const connectionPromise = global.mongooseGlobal ?? createConnection();

export default async function connectDB() {
  await connectionPromise;
  return mongoose.connection;
}
