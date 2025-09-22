import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pkg from "pg";

const { Pool } = pkg;

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  max: 20
});

// Optional: log pool errors (helps debug network/idle errors)
pool.on("error", (err) => {
  console.error("Unexpected DB error on idle client", err);
});

// Initialize DB + tables
const initDb = async () => {
  try {
    // Test connection first
    console.log("🔌 Testing database connection...");
    await pool.query("SELECT 1");
    console.log("✅ Database connection successful");

    // Then create tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Index for faster sorting by created_at
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
    `);

    // Ensure timestamp columns exist for older schemas (non-destructive)
    await pool.query(`
      ALTER TABLE messages
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    `);

    console.log("✅ Database tables initialized successfully");
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
    console.error("Please check your DATABASE_URL in .env file");
    console.error("Current DATABASE_URL:", process.env.DATABASE_URL ? "*** (exists)" : "MISSING");
    process.exit(1);
  }
};

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Server is running smoothly",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Test database connection
app.get("/api/test-db", async (req, res) => {
  try {
    console.log("🔌 Testing database connection...");
    const { rows } = await pool.query("SELECT NOW() as current_time, version() as pg_version");
    console.log("✅ Database connection successful:", rows[0]);
    
    // Test messages table
    const messagesResult = await pool.query(`
      SELECT COUNT(*) as message_count FROM messages
    `);
    
    res.json({
      success: true,
      database: {
        connected: true,
        time: rows[0].current_time,
        version: rows[0].pg_version.split(' ')[1]
      },
      messages: {
        count: parseInt(messagesResult.rows[0].message_count)
      }
    });
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    res.status(500).json({
      success: false,
      error: "Database connection failed",
      message: error.message
    });
  }
});

// Check table structure
app.get("/api/check-tables", async (req, res) => {
  try {
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log("📊 Available tables:", tables.rows);
    
    // Check messages table structure
    const messageColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'messages'
    `);
    
    res.json({
      success: true,
      tables: tables.rows,
      messages_columns: messageColumns.rows
    });
  } catch (error) {
    console.error("Error checking tables:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "🚀 Welcome to GoodMorning API",
    version: "1.0.0",
    endpoints: {
      health: "/api/health",
      testDb: "/api/test-db",
      checkTables: "/api/check-tables",
      createMessage: "POST /api/messages",
      getMessages: "GET /api/messages",
      getMessage: "GET /api/messages/:id",
    },
  });
});

// Get all messages
app.get("/api/messages", async (req, res) => {
  console.log("📨 Fetching messages request received");
  
  try {
    console.log("🔍 Attempting database query...");
    
    const result = await pool.query(`
      SELECT id, name, email, message, created_at, updated_at
      FROM messages 
      ORDER BY created_at DESC
    `);

    console.log(`✅ Database query successful. Found ${result.rows.length} messages`);
    console.log("Messages data:", result.rows);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error("❌ Error fetching messages:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: "Failed to fetch messages",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get single message by ID
app.get("/api/messages/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      `SELECT id, name, email, message, created_at, updated_at 
       FROM messages 
       WHERE id = $1`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Not found",
        message: "Message not found",
      });
    }

    res.json({
      success: true,
      data: rows[0],
    });
  } catch (error) {
    console.error("Error fetching message:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: "Failed to fetch message",
    });
  }
});

// Create new message
app.post("/api/messages", async (req, res) => {
  try {
    const { name, email, message } = req.body;

    // Validation
    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        message: "All fields (name, email, message) are required",
      });
    }

    if (name.length > 255) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        message: "Name must be less than 255 characters",
      });
    }

    if (email.length > 255) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        message: "Email must be less than 255 characters",
      });
    }

    // Insert message
    const { rows } = await pool.query(
      `INSERT INTO messages (name, email, message) 
       VALUES ($1, $2, $3) 
       RETURNING id, name, email, message, created_at, updated_at`,
      [name.trim(), email.trim(), message.trim()]
    );

    console.log("✅ Message created successfully:", rows[0].id);

    res.status(201).json({
      success: true,
      message: "Message created successfully",
      data: rows[0],
    });
  } catch (error) {
    console.error("Error creating message:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: "Failed to create message",
    });
  }
});

// Delete message
app.delete("/api/messages/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { rowCount } = await pool.query(
      "DELETE FROM messages WHERE id = $1",
      [id]
    );

    if (rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: "Not found",
        message: "Message not found",
      });
    }

    res.json({
      success: true,
      message: "Message deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting message:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: "Failed to delete message",
    });
  }
});

// 404 handler for undefined routes (Express 5 safe)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Not found",
    message: `Route ${req.originalUrl} not found`,
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error("Unhandled error:", error);
  res.status(500).json({
    success: false,
    error: "Internal server error",
    message: "Something went wrong",
  });
});

// Start server
const startServer = async () => {
  try {
    // Initialize database
    await initDb();

    // Start listening
    app.listen(PORT, () => {
      console.log("\n" + "=".repeat(50));
      console.log("🚀 GoodMorning API Server Started");
      console.log("=".repeat(50));
      console.log(`📍 Local: http://localhost:${PORT}`);
      console.log(`📊 Health: http://localhost:${PORT}/api/health`);
      console.log(`🔌 DB Test: http://localhost:${PORT}/api/test-db`);
      console.log(`📊 Tables: http://localhost:${PORT}/api/check-tables`);
      console.log("🛠️  Environment:", process.env.NODE_ENV || "development");
      console.log("=".repeat(50) + "\n");
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down server gracefully...");
  await pool.end();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n🛑 Received SIGTERM. Shutting down...");
  await pool.end();
  process.exit(0);
});

// Start the server
startServer();