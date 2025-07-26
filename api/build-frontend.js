// Vercel Serverless Function for triggering frontend build
export default function handler(req, res) {
  res.status(200).json({ message: 'Frontend build trigger endpoint' });
}