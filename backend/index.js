//  accept to include .ppt, .pptx, .xls, .xlsx: accept=".pdf,.doc,.docx,.rtf,.txt,.ppt,.pptx,.xls,.xlsx".

const express = require('express');
const cors = require('cors');
const paymentRouter = require('./router/paymentRouter'); 
const dotenv = require('dotenv');
const apiRoutes = require("./router/apiRoutes")
const connectDB = require('./config/database');
const { multerErrorHandler } = require('./middleware/errorMiddleware');

dotenv.config();
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', apiRoutes);
app.use('/api/payment', paymentRouter);
 
// Error Handling Middleware
app.use(multerErrorHandler);

// Connect to MongoDB
connectDB();


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

