const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(async () => {
    console.log('db connected');
    // Resincroniza índices del modelo User para aplicar sparse en microsoftId
    const User = require('./User');
    await User.syncIndexes().catch((e) => console.warn('syncIndexes User:', e.message));
}).catch(error => console.error(error));