// Configuration file for API keys
// IMPORTANT: For production, use environment variables instead of hardcoding the keys
// 
// To set API keys:
// 1. Add them here directly (not recommended for production)
// 2. Or create a .env file with: OPENAI_API_KEY=your_key_here
// 3. Or set environment variables before running: export OPENAI_API_KEY=your_key_here

export const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || '28d40c4f2338abccd73083f28e01751ef349929258790cf6b800a7767c6fec82';
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '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';
export const PORT = process.env.PORT || 5000;


