import app from './app.js';

const PORT = process.env.PORT || 5000;

// На Vercel застосунок експортується як serverless-функція без app.listen()
if (!process.env.VERCEL) {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

export default app;
