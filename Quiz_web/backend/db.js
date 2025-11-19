const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { quizQuestions } = require('./data');

// Aiven MySQL Database Configuration
const dbConfig = {
  host: process.env.DB_HOST || 'mysql-374b4d8f-priyanshgolwalkar25-646d.d.aivencloud.com',
  port: process.env.DB_PORT || 18058,
  user: process.env.DB_USER || 'avnadmin',
  password: process.env.DB_PASSWORD || 'AVNS_r_rLO_Ooz9b2OqDXMdF',
  database: process.env.DB_NAME || 'defaultdb',
  ssl: {
    rejectUnauthorized: false, // Aiven uses SSL, but we can set to false for now
    // For production, you should use Aiven's CA certificate
  },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
};

let pool;

async function initializeDatabase() {
  console.log('Attempting to initialize database connection...');
  console.log(`Connecting to: ${dbConfig.host}:${dbConfig.port}`);
  console.log(`Database: ${dbConfig.database}`);
  console.log(`User: ${dbConfig.user}`);
  
  try {
    // Create the main pool with the database specified
    pool = mysql.createPool(dbConfig);
    
    // Test the connection with timeout
    const testConnection = await Promise.race([
      pool.getConnection(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout after 10 seconds')), 10000)
      )
    ]);
    
    console.log('✅ Database connection successful!');
    await testConnection.ping();
    testConnection.release();

    // Get a connection to create tables
    const connection = await pool.getConnection();
    console.log('Creating/verifying database tables...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        displayName VARCHAR(255),
        role ENUM('student', 'teacher') NOT NULL,
        avatar VARCHAR(255),
        bio TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);
    await connection.query(`
      CREATE TABLE IF NOT EXISTS classes (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        classCode VARCHAR(255) UNIQUE NOT NULL,
        teacherId VARCHAR(255) NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (teacherId) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
    await connection.query(`
      CREATE TABLE IF NOT EXISTS class_enrollments (
        id VARCHAR(255) PRIMARY KEY,
        classId VARCHAR(255) NOT NULL,
        studentId VARCHAR(255) NOT NULL,
        enrolledAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (classId) REFERENCES classes(id) ON DELETE CASCADE,
        FOREIGN KEY (studentId) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE (classId, studentId)
      );
    `);
    await connection.query(`
      CREATE TABLE IF NOT EXISTS quizzes (
        id VARCHAR(255) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        type ENUM('multiple-choice', 'true-false', 'short-answer') NOT NULL DEFAULT 'multiple-choice',
        classId VARCHAR(255),
        teacherId VARCHAR(255) NOT NULL,
        timeLimit INT,
        totalPoints INT DEFAULT 0,
        startTime DATETIME,
        endTime DATETIME,
        isPublished BOOLEAN DEFAULT FALSE,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (classId) REFERENCES classes(id) ON DELETE SET NULL,
        FOREIGN KEY (teacherId) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
    await connection.query(`
      CREATE TABLE IF NOT EXISTS quiz_questions (
        id VARCHAR(255) PRIMARY KEY,
        quizId VARCHAR(255) NOT NULL,
        questionText TEXT NOT NULL,
        questionType ENUM('multiple-choice', 'true-false', 'short-answer') NOT NULL,
        points INT NOT NULL,
        orderIndex INT NOT NULL,
        options JSON,
        correctAnswer TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (quizId) REFERENCES quizzes(id) ON DELETE CASCADE
      );
    `);
    await connection.query(`
      CREATE TABLE IF NOT EXISTS quiz_attempts (
        id VARCHAR(255) PRIMARY KEY,
        quizId VARCHAR(255) NOT NULL,
        studentId VARCHAR(255) NOT NULL,
        startedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        submittedAt DATETIME,
        score INT,
        totalPoints INT,
        timeTaken INT,
        isCompleted BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (quizId) REFERENCES quizzes(id) ON DELETE CASCADE,
        FOREIGN KEY (studentId) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
    await connection.query(`
      CREATE TABLE IF NOT EXISTS quiz_answers (
        id VARCHAR(255) PRIMARY KEY,
        attemptId VARCHAR(255) NOT NULL,
        questionId VARCHAR(255) NOT NULL,
        answer TEXT NOT NULL,
        isCorrect BOOLEAN,
        pointsEarned INT,
        FOREIGN KEY (attemptId) REFERENCES quiz_attempts(id) ON DELETE CASCADE,
        FOREIGN KEY (questionId) REFERENCES quiz_questions(id) ON DELETE CASCADE
      );
    `);
    await connection.query(`
      CREATE TABLE IF NOT EXISTS leaderboards (
        id VARCHAR(255) PRIMARY KEY,
        classId VARCHAR(255) NOT NULL,
        studentId VARCHAR(255) NOT NULL,
        totalScore INT DEFAULT 0,
        student_rank INT,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (classId) REFERENCES classes(id) ON DELETE CASCADE,
        FOREIGN KEY (studentId) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE (classId, studentId)
      );
    `);
    await connection.query(`
      CREATE TABLE IF NOT EXISTS challenges (
        id VARCHAR(255) PRIMARY KEY,
        challengerId VARCHAR(255) NOT NULL,
        opponentId VARCHAR(255) NOT NULL,
        quizId VARCHAR(255) NOT NULL,
        status ENUM('pending', 'accepted', 'rejected', 'completed') DEFAULT 'pending',
        winnerId VARCHAR(255),
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (challengerId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (opponentId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (quizId) REFERENCES quizzes(id) ON DELETE CASCADE,
        FOREIGN KEY (winnerId) REFERENCES users(id) ON DELETE SET NULL
      );
    `);
    await connection.query(`
      CREATE TABLE IF NOT EXISTS student_connections (
        id VARCHAR(255) PRIMARY KEY,
        studentId VARCHAR(255) NOT NULL,
        connectedStudentId VARCHAR(255) NOT NULL,
        status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (studentId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (connectedStudentId) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE (studentId, connectedStudentId)
      );
    `);
    await connection.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(255) PRIMARY KEY,
        userId VARCHAR(255) NOT NULL,
        type VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        link VARCHAR(500),
        isRead BOOLEAN DEFAULT FALSE,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
    connection.release();

    console.log('✅ Database and tables initialized or already exist.');
    console.log('✅ All tables are ready to use.');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState
    });
    
    // Provide helpful error messages
    if (error.code === 'ECONNREFUSED') {
      console.error('❌ Connection refused. Please check:');
      console.error('   - Database host and port are correct');
      console.error('   - Database server is running');
      console.error('   - Firewall allows connections');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('❌ Access denied. Please check:');
      console.error('   - Username and password are correct');
      console.error('   - User has proper permissions');
    } else if (error.code === 'ENOTFOUND') {
      console.error('❌ Host not found. Please check:');
      console.error('   - Database hostname is correct');
      console.error('   - Internet connection is available');
    }
    
    process.exit(1); // Exit if database connection fails
  }
}

// Export the pool as a getter to ensure it's available after initialization
module.exports = {
  get pool() { return pool; },
  initializeDatabase
};