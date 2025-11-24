const { app } = require('./server');
const connectDB = require('./database'); // Import your database connection module


const PORT = process.env.PORT || 8080;

connectDB().then(() => {
  app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
});
