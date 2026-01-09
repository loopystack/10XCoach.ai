console.log('🚀 Initializing ElevenLabs Voice Chat...');
console.log('📍 Page URL:', window.location.href);

const voiceButton = document.getElementById('voiceButton');
const status = document.getElementById('status');
const transcript = document.getElementById('transcript');
const response = document.getElementById('response');
const audioPlayer = document.getElementById('audioPlayer');

// Check if all required elements exist
if (!voiceButton || !status || !transcript || !response || !audioPlayer) {
    console.error('❌ Required DOM elements not found!');
    console.error('Missing:', {
        voiceButton: !voiceButton,
        status: !status,
        transcript: !transcript,
        response: !response,
        audioPlayer: !audioPlayer
    });
} else {
    console.log('✅ All DOM elements found');
}

let recognition = null;
let isListening = false;
let isProcessing = false;
let currentTranscript = ''; // Track current transcript
let sessionId = null; // Store session ID for conversation continuity
let selectedCoachId = 'alan'; // Default coach

// Load session ID from localStorage or create new one
function getOrCreateSessionId() {
  if (!sessionId) {
    sessionId = localStorage.getItem('voiceChatSessionId');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('voiceChatSessionId', sessionId);
      console.log('🆕 Created new session ID:', sessionId);
    } else {
      console.log('📂 Loaded existing session ID:', sessionId);
    }
  }
  return sessionId;
}

// Check if browser supports Speech Recognition
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = true; // Enable interim results to see partial text
    recognition.lang = 'en-US';

    recognition.onstart = () => {
        isListening = true;
        currentTranscript = ''; // Reset transcript
        voiceButton.classList.add('listening');
        status.textContent = 'Listening...';
        status.classList.add('active');
        transcript.textContent = '';
    };

    recognition.onresult = async (event) => {
        // Build transcript from all results
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = 0; i < event.results.length; i++) {
            const result = event.results[i];
            const transcriptPart = result[0].transcript;
            
            if (result.isFinal) {
                // Final result - add to final transcript
                finalTranscript += transcriptPart;
            } else {
                // Interim result - show as preview
                interimTranscript += transcriptPart;
            }
        }
        
        // Update display with interim results as preview
        const displayText = finalTranscript || interimTranscript;
        if (displayText) {
            transcript.textContent = displayText;
            // Show interim results in a different style
            if (interimTranscript && !finalTranscript) {
                transcript.style.opacity = '0.6';
            } else {
                transcript.style.opacity = '1';
            }
        }
        
        // Only process when we have a final result
        if (finalTranscript) {
            const transcriptText = finalTranscript.trim();
            
            if (!transcriptText) {
                console.log('No final transcript received');
                return;
            }
            
            console.log('✅ Final transcript received:', transcriptText);
            // Count final results manually (event.results is not an array)
            let finalCount = 0;
            for (let i = 0; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    finalCount++;
                }
            }
            console.log('Total results:', event.results.length, 'Final results:', finalCount);
            
            isListening = false;
            voiceButton.classList.remove('listening');
            transcript.style.opacity = '1';

            // Stop recognition to prevent multiple triggers
            recognition.stop();

            // Only process if not already processing
            if (isProcessing) {
                console.log('Already processing, skipping this result');
                // Reset state to allow next attempt
                status.textContent = '';
                status.classList.remove('active');
                voiceButton.disabled = false;
                return;
            }

            try {
                await sendMessageToAI(transcriptText);
            } catch (error) {
                console.error('Error:', error);
                status.textContent = 'Error: ' + error.message;
                status.classList.remove('processing');
                voiceButton.classList.remove('processing');
                voiceButton.disabled = false;
                isProcessing = false;
            }
        }
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        isListening = false;
        voiceButton.classList.remove('listening');
        status.textContent = 'Error: ' + event.error;
        status.classList.remove('active');
        voiceButton.disabled = false;
    };

    recognition.onend = () => {
        isListening = false;
        voiceButton.classList.remove('listening');
        if (!isProcessing) {
            status.textContent = '';
            status.classList.remove('active');
            voiceButton.disabled = false;
            transcript.style.opacity = '1'; // Reset opacity
        }
        // If we have a final transcript but processing didn't start, something went wrong
        // This can happen if recognition ends before processing begins
    };

    voiceButton.addEventListener('click', () => {
        if (isProcessing) {
            console.log('Still processing previous request, please wait...');
            return;
        }
        
        // Reset recognition state
        try {
            recognition.stop();
        } catch (e) {
            // Ignore if already stopped
        }
        
        // Small delay to ensure clean state
        setTimeout(() => {
            if (!isProcessing) {
                currentTranscript = '';
                transcript.textContent = '';
                transcript.style.opacity = '1';
                recognition.start();
            }
        }, 100);
    });
    } else {
    voiceButton.disabled = true;
    status.textContent = 'Speech recognition not supported in this browser. Please use Chrome or Edge.';
    status.classList.add('active');
}

// Coach selector - Panel Cards
const coachSelect = document.getElementById('coachSelect');
const coachList = document.getElementById('coachList');
const coachCards = document.querySelectorAll('.coach-card');
const coachLargeAvatarContainer = document.getElementById('coachLargeAvatarContainer');
const coachLargeAvatar = document.getElementById('coachLargeAvatar');
const coachLargeAvatarImg = document.getElementById('coachLargeAvatarImg');
const coachLargeAvatarFallback = document.getElementById('coachLargeAvatarFallback');
const coachLargeName = document.getElementById('coachLargeName');
const coachLargeDescription = document.getElementById('coachLargeDescription');

// Coach photo mapping
const coachPhotos = {
    alan: '/coaches/Alan-Wozniak-CEC.jpg',
    rob: '/coaches/Robertini-Rob-Mercer.jpg',
    teresa: '/coaches/Teresa-Lane.jpg',
    camille: '/coaches/Camille-Quinn.jpg',
    jeffrey: '/coaches/Jeffrey-Wells.jpg',
    chelsea: '/coaches/Chelsea-Fox.jpg',
    hudson: '/coaches/Hudson-Jaxson.jpg',
    tanner: '/coaches/Tanner-Chase.jpg'
};

if (coachSelect && coachList && coachCards.length > 0) {
    console.log('🔍 Initializing custom coach selector...');
    console.log('📍 Current URL:', window.location.href);
    console.log('📍 Pathname:', window.location.pathname);
    
    // Check URL path for coach route (e.g., /coach-alan)
    const pathMatch = window.location.pathname.match(/\/coach-(\w+)/);
    const coachFromPath = pathMatch ? pathMatch[1] : null;
    console.log('📍 Coach from path:', coachFromPath);
    
    // Check URL parameters for coach selection (from dashboard integration)
    const urlParams = new URLSearchParams(window.location.search);
    const coachFromUrl = urlParams.get('coach') || coachFromPath;
    const tokenFromUrl = urlParams.get('token');
    console.log('📍 Coach from URL params:', urlParams.get('coach'));
    console.log('📍 Final coach selection:', coachFromUrl);
    console.log('📍 Token present:', !!tokenFromUrl);
    
    // Coach data mapping (matches server.js)
    const coachData = {
        alan: { name: 'Alan Wozniak', title: 'Business Strategy & Problem-Solving Coach', tagline: "Let's think bigger and move faster—with focus.", emoji: '👑', avatar: coachPhotos.alan },
        rob: { name: 'Rob Mercer', title: 'Sales Coach', tagline: "Turn problems into conversions.", emoji: '💰', avatar: coachPhotos.rob },
        teresa: { name: 'Teresa Lane', title: 'Marketing Coach', tagline: "Let's make your message magnetic.", emoji: '🎯', avatar: coachPhotos.teresa },
        camille: { name: 'Camille Quinn', title: 'Customer Experience Coach', tagline: "Every touchpoint should feel unforgettable.", emoji: '✨', avatar: coachPhotos.camille },
        jeffrey: { name: 'Jeffrey Wells', title: 'Operations Coach', tagline: "We build businesses that run without you.", emoji: '⚙️', avatar: coachPhotos.jeffrey },
        chelsea: { name: 'Chelsea Fox', title: 'Culture/HR Coach', tagline: "Culture isn't what you say—it's what you build.", emoji: '🧬', avatar: coachPhotos.chelsea },
        hudson: { name: 'Hudson Jaxon', title: 'Finance Coach', tagline: "Profit is power.", emoji: '📊', avatar: coachPhotos.hudson },
        tanner: { name: 'Tanner Chase', title: 'Business Value & BIG EXIT Coach', tagline: "We don't just grow companies—we build buyable ones.", emoji: '💼', avatar: coachPhotos.tanner }
    };
    
    // Function to update coach info
    function updateCoachInfo(coachId) {
        const coach = coachData[coachId];
        if (coach) {
            // Update large avatar
            if (coachLargeAvatarImg) {
                coachLargeAvatarImg.src = coach.avatar;
                coachLargeAvatarImg.alt = coach.name;
                coachLargeAvatarImg.onerror = function() {
                    this.style.display = 'none';
                    if (coachLargeAvatarFallback) {
                        coachLargeAvatarFallback.textContent = coach.emoji;
                        coachLargeAvatarFallback.style.display = 'flex';
                    }
                };
                coachLargeAvatarImg.style.display = 'block';
                if (coachLargeAvatarFallback) {
                    coachLargeAvatarFallback.style.display = 'none';
                }
            }
            
            // Update name and description
            if (coachLargeName) {
                coachLargeName.textContent = coach.name;
            }
            if (coachLargeDescription) {
                coachLargeDescription.textContent = coach.title;
            }
            
            // Show the large avatar container
            if (coachLargeAvatarContainer) {
                coachLargeAvatarContainer.style.display = 'flex';
            }
        }
    }
    
    // Function to select a coach
    function selectCoach(coachId) {
        const validCoachIds = ['alan', 'rob', 'teresa', 'camille', 'jeffrey', 'chelsea', 'hudson', 'tanner'];
        if (!validCoachIds.includes(coachId)) return;
        
        selectedCoachId = coachId;
        coachSelect.value = coachId;
        localStorage.setItem('selectedCoach', selectedCoachId);
        
        // Update coach cards visual state
        coachCards.forEach(card => {
            if (card.dataset.value === coachId) {
                card.classList.add('selected');
            } else {
                card.classList.remove('selected');
            }
        });
        
        // Update coach info header
        updateCoachInfo(coachId);
        
        // Update page title
        const coach = coachData[coachId];
        if (coach) {
            document.title = `${coach.name} - Voice Chat`;
        }
        
        // Clear previous conversation when switching coaches
        sessionId = null;
        localStorage.removeItem('voiceChatSessionId');
        
        console.log('✅ Coach selected:', selectedCoachId);
    }
    
    // Initialize coach selection
    let initialCoachId = null;
    if (coachFromUrl) {
        const validCoachIds = ['alan', 'rob', 'teresa', 'camille', 'jeffrey', 'chelsea', 'hudson', 'tanner'];
        if (validCoachIds.includes(coachFromUrl)) {
            initialCoachId = coachFromUrl;
        }
    } else {
        // Load saved coach preference
        const savedCoach = localStorage.getItem('selectedCoach');
        if (savedCoach && coachData[savedCoach]) {
            initialCoachId = savedCoach;
        }
    }
    
    // Set initial coach
    if (initialCoachId) {
        selectCoach(initialCoachId);
    } else {
        // Default to first coach
        selectCoach('alan');
    }
    
    // Store token if provided in URL (for authentication)
    if (tokenFromUrl) {
        localStorage.setItem('authToken', tokenFromUrl);
        console.log('🔐 Auth token stored from URL');
    }
    
    // Handle coach card clicks
    coachCards.forEach(card => {
        card.addEventListener('click', () => {
            const coachId = card.dataset.value;
            selectCoach(coachId);
        });
    });
} else {
    console.error('❌ Coach selector elements not found');
}

async function sendMessageToAI(message) {
    // Prevent concurrent requests
    if (isProcessing) {
        console.warn('Already processing a request, ignoring new request');
        return;
    }
    
    // Set processing state
    isProcessing = true;
    status.textContent = 'Processing... (this may take up to 60 seconds)';
    status.classList.remove('active');
    status.classList.add('processing');
    voiceButton.classList.add('processing');
    voiceButton.disabled = true;
    response.textContent = ''; // Clear previous response
    
    // Track processing start time
    const processingStartTime = Date.now();
    
    // Update status periodically to show it's still processing
    let statusUpdateInterval = setInterval(() => {
        if (isProcessing) {
            const elapsed = Math.floor((Date.now() - processingStartTime) / 1000);
            status.textContent = `Processing... (${elapsed}s - OpenAI + ElevenLabs may take 30-60 seconds)`;
        } else {
            clearInterval(statusUpdateInterval);
        }
    }, 5000); // Update every 5 seconds
    
    // Safety timeout - increased to allow for OpenAI + ElevenLabs processing
    let processingTimeout = setTimeout(() => {
        if (isProcessing) {
            console.warn('⚠️ Processing timeout - resetting state');
            isProcessing = false;
            if (statusUpdateInterval) {
                clearInterval(statusUpdateInterval);
            }
            status.textContent = 'Processing timeout after 90 seconds. Please try again.';
            status.classList.remove('processing');
            voiceButton.classList.remove('processing');
            voiceButton.disabled = false;
            if (audioPlayer.src) {
                audioPlayer.pause();
                audioPlayer.src = '';
            }
        }
    }, 90000); // 90 seconds to allow for OpenAI API + ElevenLabs audio generation
    
    const clearProcessingTimeout = () => {
        clearTimeout(processingTimeout);
        if (statusUpdateInterval) {
            clearInterval(statusUpdateInterval);
        }
    };
    
    try {
        // Use streaming endpoint for faster response
        // Add timeout and better error handling
        // Increased timeout to 60 seconds to allow for OpenAI + ElevenLabs processing
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout for OpenAI + ElevenLabs
        
        let responseData;
        try {
            responseData = await fetch('/api/voice-chat-stream', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    message,
                    sessionId: getOrCreateSessionId(),
                    coachId: selectedCoachId
                }),
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
        } catch (fetchError) {
            clearTimeout(timeoutId);
            
            // Provide specific error messages for different failure types
            if (fetchError.name === 'AbortError') {
                throw new Error('Connection timeout after 60 seconds. The server is processing your request (OpenAI + ElevenLabs), but it took too long. Please try again or check if the APIs are responding.');
            } else if (fetchError.message.includes('Failed to fetch') || fetchError.message.includes('ERR_CONNECTION')) {
                const currentProtocol = window.location.protocol;
                const currentHost = window.location.host;
                throw new Error(`Cannot connect to server at ${currentProtocol}//${currentHost}. Please check: 1) Server is running, 2) Firewall allows port 5000, 3) Try HTTP instead of HTTPS if using self-signed certificate.`);
            } else if (fetchError.message.includes('CORS') || fetchError.message.includes('network')) {
                throw new Error('Network error: Unable to reach the server. Please check your connection and server status.');
            } else {
                throw new Error(`Connection error: ${fetchError.message}`);
            }
        }

        if (!responseData.ok) {
            let errorMessage = 'Failed to get AI response';
            try {
                const errorBody = await responseData.json();
                errorMessage = errorBody.detail || errorBody.error || errorMessage;
            } catch (e) {
                errorMessage = await responseData.text() || errorMessage;
            }
            throw new Error(errorMessage);
        }

        // Handle streaming response
        const reader = responseData.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullText = '';
        let audioData = null;
        let audioFormat = 'audio/mpeg';
        let receivedSessionId = null;
        let streamComplete = false;

        try {
            while (true) {
                const { done, value } = await reader.read();
                
                if (done) {
                    streamComplete = true;
                    // Process any remaining buffer
                    if (buffer.trim()) {
                        const lines = buffer.split('\n');
                        for (const line of lines) {
                            if (line.trim() && line.startsWith('data: ')) {
                                try {
                                    const data = JSON.parse(line.substring(6));
                                    if (data.type === 'audio') {
                                        audioData = data.audio;
                                        audioFormat = data.audioFormat || 'audio/mpeg';
                                        receivedSessionId = data.sessionId;
                                    }
                                } catch (e) {
                                    console.warn('Error parsing final buffer:', e);
                                }
                            }
                        }
                    }
                    break;
                }

                buffer += decoder.decode(value, { stream: true });
                
                // Process complete lines only (SSE messages end with \n\n)
                let lineEnd = buffer.indexOf('\n\n');
                while (lineEnd !== -1) {
                    const completeMessage = buffer.substring(0, lineEnd);
                    buffer = buffer.substring(lineEnd + 2);
                    
                    // Process the complete message
                    if (completeMessage.startsWith('data: ')) {
                        try {
                            const jsonStr = completeMessage.substring(6);
                            const data = JSON.parse(jsonStr);
                            
                            if (data.type === 'text') {
                                // Update UI immediately as text streams in
                                fullText += data.content;
                                response.textContent = fullText;
                                status.textContent = 'Generating response...';
                            } else if (data.type === 'audio') {
                                // Audio is ready - validate it's complete
                                if (data.audio && data.audio.length > 0) {
                                    audioData = data.audio;
                                    audioFormat = data.audioFormat || 'audio/mpeg';
                                    receivedSessionId = data.sessionId;
                                    console.log('✅ Audio data received:', {
                                        length: data.audio.length,
                                        format: audioFormat,
                                        estimatedSize: Math.round(data.audio.length * 0.75) // Base64 is ~33% larger
                                    });
                                } else {
                                    console.error('❌ Received empty audio data');
                                }
                            } else if (data.type === 'error') {
                                // Server sent an error - stop processing and show error
                                const errorMsg = data.message || 'Server error occurred';
                                const errorDetails = data.details || '';
                                console.error('❌ Server error:', errorMsg, errorDetails);
                                throw new Error(errorMsg);
                            }
                        } catch (e) {
                            // If JSON parsing fails, might be because message is incomplete or corrupted
                            if (!done) {
                                // If message looks like it might be audio (large), wait for more data
                                if (completeMessage.length > 10000 && completeMessage.includes('"type":"audio"')) {
                                    // Large audio message - might be incomplete, put back and wait
                                    buffer = completeMessage + '\n\n' + buffer;
                                    console.warn('⚠️ Large audio message may be incomplete, waiting for more data...');
                                    break;
                                } else {
                                    // Small message - probably corrupted
                                    console.error('Error parsing SSE data:', e.message);
                                    console.error('Message preview:', completeMessage.substring(0, 200));
                                    // Continue processing, don't put back
                                }
                            } else {
                                // Stream ended, message is incomplete
                                console.error('❌ Error parsing SSE data at stream end:', e.message);
                                console.error('Message length:', completeMessage.length);
                                console.error('First 200 chars:', completeMessage.substring(0, 200));
                                if (completeMessage.includes('audio')) {
                                    throw new Error('Received incomplete audio data. The audio message was cut off during transmission.');
                                }
                            }
                        }
                    }
                    
                    lineEnd = buffer.indexOf('\n\n');
                }
            }
        } catch (streamError) {
            console.error('Stream reading error:', streamError);
            if (!streamComplete) {
                throw new Error(`Stream error: ${streamError.message}`);
            }
        } finally {
            // Ensure reader is released
            try {
                reader.releaseLock();
            } catch (e) {
                // Already released
            }
        }
        
        // Validate we received complete audio data
        if (audioData) {
            const expectedMinLength = 100; // Minimum reasonable audio data size
            if (audioData.length < expectedMinLength) {
                console.warn('⚠️ Audio data seems too small:', audioData.length);
                throw new Error('Audio data appears incomplete or corrupted');
            }
        }

        // Update session ID if received
        if (receivedSessionId && receivedSessionId !== sessionId) {
            sessionId = receivedSessionId;
            localStorage.setItem('voiceChatSessionId', sessionId);
        }

        // Update response label with coach name if available
        const coachNames = {
            'alan': 'Alan Wozniak',
            'rob': 'Rob Mercer',
            'teresa': 'Teresa Lane',
            'camille': 'Camille Quinn',
            'jeffrey': 'Jeffrey Wells',
            'chelsea': 'Chelsea Fox',
            'hudson': 'Hudson Jaxon',
            'tanner': 'Tanner Chase'
        };
        const coachName = coachNames[selectedCoachId] || 'AI Coach';
        response.style.setProperty('--coach-name', `"${coachName} replied: "`);

        // Play audio if available
        if (audioData) {
            // Validate audio data completeness before processing
            const base64Pattern = /^[A-Za-z0-9+/]*={0,2}$/;
            if (!base64Pattern.test(audioData)) {
                console.error('❌ Invalid base64 audio data detected');
                console.error('First 100 chars:', audioData.substring(0, 100));
                console.error('Last 100 chars:', audioData.substring(Math.max(0, audioData.length - 100)));
                throw new Error('Received corrupted audio data. The server may have returned invalid data.');
            }
            
            // Check minimum size (very small audio likely incomplete or error)
            const minSize = 500; // ~375 bytes of actual audio
            if (audioData.length < minSize) {
                console.error('❌ Audio data too small, likely incomplete or error:', audioData.length);
                // Check if it's an error message
                try {
                    const decoded = atob(audioData);
                    if (decoded.includes('error') || decoded.includes('Error') || decoded.includes('<!DOCTYPE')) {
                        throw new Error('Server returned an error instead of audio. Check server logs.');
                    }
                } catch (e) {
                    // Not valid base64 or decode failed, continue with error
                }
                throw new Error('Audio data appears incomplete or corrupted. Please try again.');
            }
            
            // Calculate expected decoded size (base64 is 4/3 the size of original)
            const estimatedDecodedSize = Math.floor(audioData.length * 0.75);
            console.log('✅ Audio data validated:', {
                base64Length: audioData.length,
                estimatedDecodedSize: estimatedDecodedSize,
                format: audioFormat
            });
            
            await playAudioFromBase64(audioData, audioFormat, clearProcessingTimeout);
        } else {
            // Fallback to non-streaming if no audio received
            console.log('No audio in stream, using fallback...');
            const fallbackController = new AbortController();
            const fallbackTimeoutId = setTimeout(() => fallbackController.abort(), 60000); // 60 second timeout
            
            try {
                const fallbackResponse = await fetch('/api/voice-chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        message, 
                        sessionId: getOrCreateSessionId(),
                        coachId: selectedCoachId
                    }),
                    signal: fallbackController.signal,
                });
                clearTimeout(fallbackTimeoutId);
                
                if (!fallbackResponse.ok) {
                    throw new Error(`Server error: ${fallbackResponse.status}`);
                }
                
                const fallbackData = await fallbackResponse.json();
                
                if (fallbackData.audio) {
                    await playAudioFromBase64(fallbackData.audio, fallbackData.audioFormat || 'audio/mpeg', clearProcessingTimeout);
                } else {
                    clearProcessingTimeout();
                    status.textContent = '';
                    status.classList.remove('processing');
                    voiceButton.classList.remove('processing');
                    voiceButton.disabled = false;
                    isProcessing = false;
                }
                } catch (fallbackError) {
                clearTimeout(fallbackTimeoutId);
                if (fallbackError.name === 'AbortError') {
                    throw new Error('Fallback request timeout after 60 seconds. Server is processing but taking too long. Please try again.');
                } else if (fallbackError.message.includes('Failed to fetch') || fallbackError.message.includes('ERR_CONNECTION')) {
                    const currentProtocol = window.location.protocol;
                    const currentHost = window.location.host;
                    throw new Error(`Cannot connect to server at ${currentProtocol}//${currentHost}. Please check server status and network connection.`);
                } else {
                    throw fallbackError;
                }
            }
        }
        
    } catch (error) {
        clearProcessingTimeout();
        console.error('Error sending message:', error);
        status.textContent = 'Error: ' + error.message;
        status.classList.remove('processing');
        voiceButton.classList.remove('processing');
        voiceButton.disabled = false;
        isProcessing = false;
        throw error;
    }
}

// Helper function to play audio from base64
async function playAudioFromBase64(audioBase64, audioFormat, clearProcessingTimeout) {
    let audioUrl = null;
    let errorHandlerFired = false; // Flag to prevent infinite error loops
    
    try {
        // Validate audio data
        if (!audioBase64 || audioBase64.length === 0) {
            throw new Error('No audio data received');
        }

        if (audioBase64.includes('<!DOCTYPE') || audioBase64.includes('Just a moment')) {
            throw new Error('Server returned HTML instead of audio');
        }

        const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
        if (!base64Regex.test(audioBase64)) {
            throw new Error('Invalid audio data format');
        }

        const audioBlob = base64ToBlob(audioBase64, audioFormat);
        
        if (audioBlob.size === 0) {
            throw new Error('Audio blob is empty after base64 conversion');
        }
        
        // Log blob info for debugging
        console.log('🎵 Audio blob created:', {
            size: audioBlob.size,
            type: audioBlob.type,
            expectedFormat: audioFormat
        });
        
        // Validate blob is actually audio by checking first few bytes
        // MPEG audio typically starts with 0xFF (MPEG sync word) or ID3 tag (starts with "ID3")
        const firstBytes = await audioBlob.slice(0, 12).arrayBuffer();
        const view = new Uint8Array(firstBytes);
        const firstByte = view[0];
        
        // Check for MPEG sync word (0xFF) or ID3 tag
        const isMPEG = firstByte === 0xFF;
        const isID3 = view[0] === 0x49 && view[1] === 0x44 && view[2] === 0x33; // "ID3"
        const isValidAudio = isMPEG || isID3;
        
        if (!isValidAudio && audioBlob.size > 100) {
            const headerHex = Array.from(view.slice(0, 8))
                .map(b => '0x' + b.toString(16).padStart(2, '0'))
                .join(' ');
            
            // Check if it might be text/error message
            const textDecoder = new TextDecoder();
            const textPreview = textDecoder.decode(firstBytes).substring(0, 100);
            
            if (textPreview.includes('<!DOCTYPE') || textPreview.includes('error') || textPreview.includes('Error') || textPreview.includes('{"error"')) {
                console.error('❌ Server returned text/HTML instead of audio:', textPreview);
                throw new Error('Server returned text instead of audio. Audio generation may have failed. Please try again.');
            }
            
            // Check for JSON error response
            try {
                const text = textDecoder.decode(audioBlob.slice(0, 500));
                const parsed = JSON.parse(text);
                if (parsed.error || parsed.message) {
                    throw new Error(`Server error: ${parsed.message || parsed.error}`);
                }
            } catch (e) {
                // Not JSON, continue
            }
            
            console.error('❌ Audio blob validation failed:', {
                firstBytes: headerHex,
                blobSize: audioBlob.size,
                format: audioFormat,
                firstBytesText: textPreview.substring(0, 50)
            });
            
            // For MPEG, we should see 0xFF. If not, it's likely corrupted
            throw new Error(`Invalid audio format. Expected MPEG audio but got unexpected header. The audio file may be corrupted.`);
        } else if (isValidAudio) {
            console.log('✅ Audio blob validated - appears to be valid MPEG audio');
        }

        // Clean up previous audio and remove old handlers
        if (audioPlayer.src && audioPlayer.src.startsWith('blob:')) {
            URL.revokeObjectURL(audioPlayer.src);
        }
        
        // Remove any existing event handlers to prevent conflicts
        audioPlayer.onended = null;
        audioPlayer.onerror = null;
        
        // Reset audio player state to prevent conflicts
        audioPlayer.pause();
        audioPlayer.src = '';
        // Don't call load() here as it can trigger errors on empty src
        
        // Wait a tiny bit to ensure clean state
        await new Promise(resolve => setTimeout(resolve, 50));

        audioUrl = URL.createObjectURL(audioBlob);
        
        // Set up event handlers using once to prevent multiple triggers
        const endedHandler = () => {
            if (audioUrl) {
                URL.revokeObjectURL(audioUrl);
                audioUrl = null;
            }
            clearProcessingTimeout();
            status.textContent = '';
            status.classList.remove('processing');
            voiceButton.classList.remove('processing');
            voiceButton.disabled = false;
            isProcessing = false;
            // Clean up handlers
            audioPlayer.onended = null;
            audioPlayer.onerror = null;
        };
        
        const errorHandler = (e) => {
            // Prevent infinite loops - only handle error once
            if (errorHandlerFired) {
                console.warn('Error handler already fired, ignoring duplicate error');
                return;
            }
            errorHandlerFired = true;
            
            // Check if src was cleared (this causes "Empty src attribute" error)
            if (!audioPlayer.src || audioPlayer.src === '') {
                console.error('❌ Error handler fired but src is already empty - race condition detected');
                return; // Don't process - src was cleared by another handler
            }
            
            clearProcessingTimeout();
            
            // Get detailed error information from the audio element
            const audioError = audioPlayer.error;
            let errorMessage = 'Error playing audio';
            let errorDetails = {};
            
            if (audioError && audioError.code !== 0) {
                // Audio error codes:
                // MEDIA_ERR_ABORTED (1): The user aborted the loading
                // MEDIA_ERR_NETWORK (2): A network error occurred
                // MEDIA_ERR_DECODE (3): The audio was corrupted or invalid
                // MEDIA_ERR_SRC_NOT_SUPPORTED (4): The audio format is not supported
                const errorMessages = {
                    1: 'Audio loading aborted',
                    2: 'Network error while loading audio',
                    3: 'Audio file is corrupted or invalid',
                    4: 'Audio format not supported by browser'
                };
                
                errorMessage = errorMessages[audioError.code] || 'Unknown audio error';
                errorDetails = {
                    code: audioError.code,
                    message: errorMessage,
                    blobSize: audioBlob.size,
                    audioFormat: audioFormat,
                    blobType: audioBlob.type,
                    readyState: audioPlayer.readyState,
                    networkState: audioPlayer.networkState,
                    src: audioPlayer.src ? audioPlayer.src.substring(0, 50) + '...' : 'empty'
                };
                
                console.error('Audio playback error details:', errorDetails);
                console.error('Audio element error:', audioError);
                console.error('Blob URL:', audioUrl);
                console.error('Blob size:', audioBlob.size, 'bytes');
                console.error('Audio format:', audioFormat);
            } else {
                console.error('Audio playback error event:', e);
                console.error('Audio element state:', {
                    src: audioPlayer.src?.substring(0, 50) || 'empty',
                    readyState: audioPlayer.readyState,
                    networkState: audioPlayer.networkState,
                    paused: audioPlayer.paused,
                    currentTime: audioPlayer.currentTime,
                    duration: audioPlayer.duration
                });
            }
            
            status.textContent = errorMessage;
            status.classList.remove('processing');
            voiceButton.classList.remove('processing');
            voiceButton.disabled = false;
            isProcessing = false;
            
            // Store current src to check if it changed
            const currentSrc = audioPlayer.src;
            
            // Remove handlers FIRST to prevent triggering errors during cleanup
            audioPlayer.onended = null;
            audioPlayer.onerror = null;
            
            // Pause audio first to stop loading
            try {
                if (!audioPlayer.paused) {
                    audioPlayer.pause();
                }
            } catch (e) {
                // Ignore pause errors
            }
            
            // Wait longer to ensure audio loading has stopped before clearing src
            setTimeout(() => {
                try {
                    // Only clear src if it's still the same (wasn't changed by another process)
                    // and audio is paused/ended
                    if (audioPlayer.src === currentSrc && (audioPlayer.paused || audioPlayer.ended || audioPlayer.error)) {
                        audioPlayer.src = '';
                        console.log('✅ Audio src cleared safely');
                    } else {
                        console.warn('⚠️ Skipping src clear - src changed or audio still active');
                    }
                } catch (e) {
                    console.warn('⚠️ Error clearing src:', e);
                }
                
                // Clean up blob URL after clearing src
                setTimeout(() => {
                    if (audioUrl) {
                        URL.revokeObjectURL(audioUrl);
                        audioUrl = null;
                        console.log('✅ Blob URL revoked');
                    }
                }, 100);
            }, 300);
        };
        
        // IMPORTANT: Set error handler BEFORE setting src to catch all errors
        audioPlayer.onerror = errorHandler;
        audioPlayer.onended = endedHandler;
        
        // Validate blob one more time before using it
        console.log('🎵 Preparing to play audio:', {
            blobSize: audioBlob.size,
            blobType: audioBlob.type,
            format: audioFormat,
            urlReady: !!audioUrl
        });
        
        // Wait for audio to load - use addEventListener here for load phase
        let loadPromiseResolved = false;
        let isLoading = false;
        
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                if (!loadPromiseResolved) {
                    loadPromiseResolved = true;
                    errorHandlerFired = true; // Mark as handled
                    isLoading = false;
                    cleanup();
                    reject(new Error('Audio load timeout after 5 seconds'));
                }
            }, 5000);
            
            const cleanup = () => {
                clearTimeout(timeout);
                audioPlayer.removeEventListener('canplay', onCanPlay);
                audioPlayer.removeEventListener('canplaythrough', onCanPlay);
                audioPlayer.removeEventListener('loadeddata', onCanPlay);
                audioPlayer.removeEventListener('error', onLoadError);
            };
            
            const onCanPlay = () => {
                if (!loadPromiseResolved) {
                    loadPromiseResolved = true;
                    isLoading = false;
                    cleanup();
                    console.log('✅ Audio loaded successfully, ready to play');
                    resolve();
                }
            };
            
            const onLoadError = (e) => {
                if (!loadPromiseResolved) {
                    loadPromiseResolved = true;
                    errorHandlerFired = true; // Mark as handled to prevent onerror handler from firing
                    isLoading = false;
                    cleanup();
                    const audioError = audioPlayer.error;
                    let errorMsg = 'Audio load error';
                    
                    if (audioError && audioError.code !== 0) {
                        const errorMessages = {
                            1: 'Audio loading aborted',
                            2: 'Network error while loading audio blob',
                            3: 'Audio file is corrupted or invalid - blob may be malformed',
                            4: 'Audio format not supported by browser - may be corrupted MPEG'
                        };
                        errorMsg = errorMessages[audioError.code] || 'Audio load failed';
                        console.error('❌ Audio load error in Promise:', {
                            code: audioError.code,
                            message: errorMsg,
                            blobSize: audioBlob.size,
                            format: audioFormat,
                            src: audioPlayer.src?.substring(0, 50)
                        });
                        
                        // Check if blob URL is still valid
                        try {
                            fetch(audioUrl, { method: 'HEAD' }).catch(() => {
                                console.error('❌ Blob URL is invalid or revoked');
                            });
                        } catch (e) {
                            console.error('❌ Cannot access blob URL:', e);
                        }
                    }
                    
                    reject(new Error(errorMsg));
                }
            };
            
            // Set src and start loading
            isLoading = true;
            audioPlayer.src = audioUrl;
            
            // Check current state
            if (audioPlayer.readyState >= 2) {
                // Already has enough data, resolve immediately
                if (!loadPromiseResolved) {
                    loadPromiseResolved = true;
                    isLoading = false;
                    cleanup();
                    resolve();
                }
            } else {
                // Wait for audio to load
                audioPlayer.addEventListener('canplay', onCanPlay, { once: true });
                audioPlayer.addEventListener('canplaythrough', onCanPlay, { once: true });
                audioPlayer.addEventListener('loadeddata', onCanPlay, { once: true });
                audioPlayer.addEventListener('error', onLoadError, { once: true });
                audioPlayer.load();
            }
        });
        
        // After load succeeds, error handler is already set for playback errors

        // Play audio with error handling for autoplay policies
        try {
            await audioPlayer.play();
        } catch (playError) {
            // Handle autoplay policy errors
            if (playError.name === 'NotAllowedError' || playError.name === 'NotSupportedError') {
                console.warn('Autoplay blocked by browser. User interaction required.');
                // Try to play again after a brief delay (sometimes helps)
                await new Promise(resolve => setTimeout(resolve, 100));
                try {
                    await audioPlayer.play();
                } catch (retryError) {
                    throw new Error('Audio playback blocked by browser. Please interact with the page first.');
                }
            } else {
                throw playError;
            }
        }
        
    } catch (error) {
        // Mark error as handled to prevent error handler from firing
        errorHandlerFired = true;
        
        // Clean up handlers
        audioPlayer.onended = null;
        audioPlayer.onerror = null;
        
        // Clean up blob URL if it exists
        if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
            audioUrl = null;
        }
        
        clearProcessingTimeout();
        console.error('Audio processing error:', error);
        status.textContent = 'Error: ' + error.message;
        status.classList.remove('processing');
        voiceButton.classList.remove('processing');
        voiceButton.disabled = false;
        isProcessing = false;
        
        // Clear src after a delay to prevent triggering errors
        setTimeout(() => {
            try {
                audioPlayer.pause();
                // Only clear src if audio is paused/ended
                if (audioPlayer.paused || audioPlayer.ended) {
                    audioPlayer.src = '';
                }
            } catch (e) {
                // Ignore cleanup errors
            }
        }, 200);
        
        throw error;
    }
}

// Fallback function for non-streaming (kept for compatibility)
async function sendMessageToAIFallback(message) {
    // Prevent concurrent requests
    if (isProcessing) {
        console.warn('Already processing a request, ignoring new request');
        return;
    }
    
    // Set processing state
    isProcessing = true;
    status.textContent = 'Processing...';
    status.classList.remove('active');
    status.classList.add('processing');
    voiceButton.classList.add('processing');
    voiceButton.disabled = true;
    
    // Safety timeout: reset processing state after 60 seconds if stuck (increased for OpenAI + ElevenLabs)
    let processingTimeout = setTimeout(() => {
        if (isProcessing) {
            console.warn('⚠️ Processing timeout - resetting state');
            isProcessing = false;
            status.textContent = 'Processing timeout. Please try again.';
            status.classList.remove('processing');
            voiceButton.classList.remove('processing');
            voiceButton.disabled = false;
            // Clear any audio that might be stuck
            if (audioPlayer.src) {
                audioPlayer.pause();
                audioPlayer.src = '';
            }
        }
    }, 60000); // Increased to 60 seconds for API calls + audio generation
    
    // Clear timeout when processing completes
    const clearProcessingTimeout = () => {
        clearTimeout(processingTimeout);
    };
    
    // Create an AbortController for fetch timeout
    const controller = new AbortController();
    let fetchTimeout = null;
    
    try {
        fetchTimeout = setTimeout(() => controller.abort(), 45000); // 45 second timeout for API call
        
        const responseData = await fetch('/api/voice-chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                message,
                sessionId: getOrCreateSessionId(), // Include session ID for conversation continuity
                coachId: selectedCoachId // Include selected coach
            }),
            signal: controller.signal, // Add abort signal
        });
        
        if (fetchTimeout) clearTimeout(fetchTimeout); // Clear fetch timeout on success

        if (!responseData.ok) {
            if (fetchTimeout) clearTimeout(fetchTimeout); // Clear timeout on error
            // Try to get error details from response
            let errorMessage = 'Failed to get AI response';
            try {
                const errorBody = await responseData.json();
                errorMessage = errorBody.detail || errorBody.error || errorMessage;
                console.error('Backend error response:', errorBody);
            } catch (e) {
                const errorText = await responseData.text();
                console.error('Backend error (text):', errorText);
                errorMessage = errorText || errorMessage;
            }
            throw new Error(errorMessage);
        }

        const data = await responseData.json();
        
        // Update session ID if server returned a new one
        if (data.sessionId && data.sessionId !== sessionId) {
            sessionId = data.sessionId;
            localStorage.setItem('voiceChatSessionId', sessionId);
            console.log('📂 Updated session ID:', sessionId);
        }
        
        console.log('✅ Received response from server:', {
            hasText: !!data.text,
            hasAudio: !!data.audio,
            audioLength: data.audio ? data.audio.length : 0,
            audioFormat: data.audioFormat,
            sessionId: data.sessionId
        });
        
        // Display AI response text
        response.textContent = data.text;
        
        // Update response label with coach name
        const coachNames = {
            'alan': 'Alan Wozniak',
            'rob': 'Rob Mercer',
            'teresa': 'Teresa Lane',
            'camille': 'Camille Quinn',
            'jeffrey': 'Jeffrey Wells',
            'chelsea': 'Chelsea Fox',
            'hudson': 'Hudson Jaxon',
            'tanner': 'Tanner Chase'
        };
        const coachName = data.coachName || coachNames[data.coachId || selectedCoachId] || 'AI Coach';
        response.style.setProperty('--coach-name', `"${coachName} replied: "`);
        
        // Play audio response using helper function
        if (data.audio) {
            await playAudioFromBase64(data.audio, data.audioFormat || 'audio/mpeg', clearProcessingTimeout);
        } else {
            clearProcessingTimeout();
            status.textContent = '';
            status.classList.remove('processing');
            voiceButton.classList.remove('processing');
            voiceButton.disabled = false;
            isProcessing = false;
        }
    } catch (error) {
        if (fetchTimeout) clearTimeout(fetchTimeout); // Clear fetch timeout on error
        clearProcessingTimeout();
        console.error('Error sending message:', error);
        // Handle abort/timeout errors specifically
        if (error.name === 'AbortError') {
            status.textContent = 'Request timeout. The server took too long to respond.';
        } else {
            status.textContent = 'Error: ' + error.message;
        }
        status.classList.remove('processing');
        voiceButton.classList.remove('processing');
        voiceButton.disabled = false;
        isProcessing = false;
        throw error;
    }
}


function base64ToBlob(base64, mimeType) {
    try {
        // Remove any data URL prefix if present
        const base64Data = base64.replace(/^data:.*,/, '');
        
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type: mimeType || 'audio/mpeg' });
    } catch (error) {
        console.error('Error converting base64 to blob:', error);
        throw new Error('Invalid base64 audio data');
    }
}

