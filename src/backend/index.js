// const express = require('express');
// const { MongoClient } = require('mongodb');
// const bcrypt = require('bcrypt');
// const jwt = require('jsonwebtoken');
// const cors = require('cors');
// const nodemailer = require('nodemailer');

// const app = express();
// app.use(express.json());
// app.use(cors());
// app.use('/', require('./routes/user'));

// const uri = 'mongodb+srv://<user>:<password>@cluster0.mongodb.net/timesheetApp';
// const client = new MongoClient(uri);

// async function connectDB() {
//   await client.connect();
//   console.log('Connected to MongoDB');
// }
// connectDB();

// // Custom UID generator
// function generateCustomUid() {
//     const { v4: uuidv4 } = require('uuid');
//     const base64Uid = Buffer.from(uuidv4().replace(/-/g, '')).toString('base64');
//     return base64Uid.substring(0, 28).replace(/[\+\/]/g, 'x'); // 28 chars, safe characters
//   }

// // Signup
// app.post('/signup', async (req, res) => {
//   const { email, password, role, username } = req.body;
//   const existingUser = await client.db('timesheetApp').collection('users').findOne({ email });
//   if (existingUser) return res.status(400).json({ error: 'Email already in use' });

//   const hashedPassword = await bcrypt.hash(password, 10);
//   const userId = generateCustomUid();
//   const user = {
//     _id: new MongoClient.ObjectId(),
//     userId,
//     email,
//     passwordHash: hashedPassword,
//     role,
//     username,
//     createdAt: new Date(),
//     updatedAt: new Date(),
//   };
//   await client.db('timesheetApp').collection('users').insertOne(user);
//   const token = jwt.sign({ email, role }, 'your_jwt_secret', { expiresIn: '1h' });
//   res.json({ token, userId });
// });

// // Login
// app.post('/login', async (req, res) => {
//     const { email, password } = req.body;
//     const user = await client.db('timesheetApp').collection('users').findOne({ email });
//     if (user && await bcrypt.compare(password, user.passwordHash)) {
//       const token = jwt.sign({ email, role: user.role, userId: user.userId }, 'your_jwt_secret', { expiresIn: '1h' });
//       res.json({ token, userId: user.userId });
//     } else {
//       res.status(401).json({ error: 'Invalid credentials' });
//     }
//   });

// // authenticate (protected route)
// app.get('/authenticate', async (req, res) => {
//   const token = req.headers['authorization']?.split(' ')[1];
//   if (!token) return res.status(401).json({ error: 'No token' });
//   const decoded = jwt.verify(token, 'your_jwt_secret');
//   const user = await client.db('timesheetApp').collection('users').findOne({ email: decoded.email });
//   if (user) res.json({ email: user.email, role: user.role });
//   else res.status(404).json({ error: 'User not found' });
// });

// // Forgot Password
// const transporter = nodemailer.createTransport({
//   service: 'gmail',
//   auth: {
//     user: 'your-email@gmail.com',
//     pass: 'your-app-password', // Use an App Password if 2FA is enabled
//   },
// });

// app.post('/forgot-password', async (req, res) => {
//   const { email } = req.body;
//   const user = await client.db('timesheetApp').collection('users').findOne({ email });
//   if (!user) return res.status(404).json({ error: 'User not found' });

//   const resetToken = jwt.sign({ email }, 'your_jwt_secret', { expiresIn: '1h' });
//   const resetLink = `http://<your-app-url>/reset-password?token=${resetToken}`;

//   await transporter.sendMail({
//     from: 'your-email@gmail.com',
//     to: email,
//     subject: 'Password Reset',
//     text: `Click this link to reset your password: ${resetLink}`,
//   });
//   res.json({ message: 'Reset email sent' });
// });

// // Add reset password endpoint (optional, implement later)
// app.post('/reset-password', async (req, res) => {
//   // Implement password reset logic here
// });

// app.listen(3000, () => console.log('Server running on port 3000'));

//---------------------------------------------------------------------------------

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const userRoutes = require('./routes/user');
const holidaysRouter = require('./routes/holidays');
const leavesRouter = require('./routes/leaves')
const compoffRoutes = require('./routes/compoff')
const attendanceRoutes = require('./routes/attendance');
const tasksRoutes = require('./routes/tasks');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());

// Connect to MongoDB with Mongoose
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch((err) => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// mount user routes
app.use('/api/user', userRoutes);

// mount holidays routes
app.use('/api/holidays', holidaysRouter);

// mount leaves route
app.use('/api/leaves', leavesRouter);

// mount compoff route
app.use('/api/compoff', compoffRoutes);

// mount attendance route
app.use('/api/attendance', attendanceRoutes);

// mount tasks route
app.use('/api/tasks', tasksRoutes);

// Root route
app.get('/', (req, res) => {
  res.send('API is running');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});