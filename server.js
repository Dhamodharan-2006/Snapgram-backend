const express    = require('express');
const mongoose   = require('mongoose');
const cors       = require('cors');
const http       = require('http');
const dotenv     = require('dotenv');
const helmet     = require('helmet');
const morgan     = require('morgan');
const compression = require('compression');
const { initSocket } = require('./socket');

// Load env BEFORE anything else
dotenv.config();
const PORT = process.env.PORT || 5000;
const MONGO = process.env.MONGODB_URI;

if (!MONGO) {
  console.error('MONGODB_URI is not set in .env file!');
  process.exit(1);
}

const app    = express();
const server = http.createServer(app);

initSocket(server);

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(compression());
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

app.use(cors({
  origin: 'https://snapgram-frontend-yfp0.onrender.com',
  credentials: true,
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.get('/', (req, res) => res.json({
  message: 'SnapGram API Running 🚀',
  version: '1.0.0',
}));

app.use('/api/auth',          require('./routes/authRoutes'));
app.use('/api/users',         require('./routes/userRoutes'));
app.use('/api/posts',         require('./routes/postRoutes'));
app.use('/api/messages',      require('./routes/messageRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/stories',       require('./routes/storyRoutes'));
app.use('/api/admin',         require('./routes/adminRoutes'));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Server Error' });
});



mongoose
  .connect(MONGO, {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 30000,
    family: 4,
  })
  .then(() => {
    console.log('MongoDB Connected');
    server.listen(PORT, '0.0.0.0', () => {
      console.log('Server running on port ' + PORT);
    });
  })
  .catch(err => {
    console.error('MongoDB error:', err.message);
    process.exit(1);
  });