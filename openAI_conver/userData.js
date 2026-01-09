// User data functions for OpenAI conversations
const https = require('https');

async function getUserConversationHistory(userId, coachId, token, limit = 5) {
  try {
    // Skip fetching history if token is invalid or server is still starting
    if (!token || token === 'invalid' || token === 'undefined') {
      console.log('Skipping conversation history fetch - invalid token');
      return [];
    }

    // Use HTTPS if server is using HTTPS, otherwise HTTP
    const useHttps = process.env.HTTPS !== 'false';
    const protocol = useHttps ? 'https' : 'http';
    const mainApiUrl = process.env.MAIN_API_URL || `${protocol}://localhost:3001`;
    
    // For local development with self-signed certs, disable SSL verification
    // Node.js fetch doesn't support agent, so we set environment variable
    const originalReject = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    if (useHttps) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // Allow self-signed certs
    }
    
    try {
      // Fetch recent sessions for this user and coach
      const response = await fetch(`${mainApiUrl}/api/sessions?coachId=${coachId}&limit=${limit}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(5000)
      });

    if (response.ok) {
      const sessions = await response.json();
      const conversationHistory = [];

      // Extract key conversation points from recent sessions
      for (const session of sessions) {
        if (session.transcript) {
          try {
            const transcript = typeof session.transcript === 'string'
              ? JSON.parse(session.transcript)
              : session.transcript;

            if (Array.isArray(transcript)) {
              // Extract key exchanges (user questions and coach responses)
              const keyExchanges = transcript
                .filter(msg => msg.role === 'user' || msg.role === 'assistant')
                .slice(-4) // Last 4 messages from this session
                .map(msg => ({
                  role: msg.role,
                  content: msg.content || msg.text,
                  date: session.startTime ? new Date(session.startTime).toLocaleDateString() : 'recent'
                }));

              if (keyExchanges.length > 0) {
                conversationHistory.push({
                  sessionDate: session.startTime ? new Date(session.startTime).toLocaleDateString() : 'recent',
                  keyExchanges: keyExchanges,
                  summary: session.summary || null
                });
              }
            }
          } catch (parseError) {
            console.warn('Error parsing session transcript:', parseError);
          }
        }
      }

      return conversationHistory.slice(0, 3); // Return last 3 sessions max
    }
    return [];
    } finally {
      // Restore original SSL rejection setting
      if (useHttps) {
        if (originalReject !== undefined) {
          process.env.NODE_TLS_REJECT_UNAUTHORIZED = originalReject;
        } else {
          delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
        }
      }
    }
  } catch (error) {
    console.error('Error fetching conversation history:', error);
    // Restore original SSL rejection setting on error
    if (useHttps && originalReject !== undefined) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = originalReject;
    }
    return [];
  }
}

async function getUserQuizResults(userId, token) {
  try {
    // Use HTTPS if server is using HTTPS, otherwise HTTP
    const useHttps = process.env.HTTPS !== 'false';
    const protocol = useHttps ? 'https' : 'http';
    const mainApiUrl = process.env.MAIN_API_URL || `${protocol}://localhost:3001`;
    const response = await fetch(`${mainApiUrl}/api/quiz/results?limit=1`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const results = await response.json();
      if (results.length > 0) {
        const latestResult = results[0];
        return {
          id: latestResult.id,
          totalScore: latestResult.totalScore,
          pillarScores: latestResult.pillarScores || {},
          createdAt: latestResult.createdAt,
          quiz: latestResult.quiz
        };
      }
    }
    return null;
  } catch (error) {
    console.error('Error fetching quiz results:', error);
    return null;
  }
}

module.exports = { getUserConversationHistory, getUserQuizResults };
