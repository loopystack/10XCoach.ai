// Coach to Voice Mapping (for reference - server will override this)
// Male coaches -> Male voices
// Female coaches -> Female voices
const coachVoiceMap = {
    // Male coaches
    'Alan Wozniak': 'echo',      // Male - Clear, professional
    'Rob Mercer': 'marin',       // Male - Smooth, confident
    'Jeffrey Wells': 'alloy',    // Male - Clear, distinct male voice (changed from 'marin')
    'Hudson Jaxon': 'cedar',     // Male - Deep, authoritative
    'Tanner Chase': 'verse',     // Male - Poetic, melodic
    // Female coaches
    'Teresa Lane': 'shimmer',    // Female - Soft, friendly
    'Camille Quinn': 'coral',    // Female - Bright, energetic
    'Chelsea Fox': 'sage'        // Female - Calm, thoughtful
};

// Coach gender mapping
const coachGenderMap = {
    'Alan Wozniak': 'male',
    'Rob Mercer': 'male',
    'Jeffrey Wells': 'male',
    'Hudson Jaxon': 'male',
    'Tanner Chase': 'male',
    'Teresa Lane': 'female',
    'Camille Quinn': 'female',
    'Chelsea Fox': 'female'
};

class VoiceConversation {
    constructor() {
        this.ws = null;
        this.inputAudioContext = null;
        this.outputAudioContext = null;
        this.mediaStream = null;
        this.isConnected = false;
        this.isRecording = false;
        this.audioLevels = new Array(20).fill(0);
        this.analyser = null;
        this.dataArray = null;
        
        // Audio playback queue
        this.audioQueue = [];
        this.isPlayingAudio = false;
        this.currentResponseId = null;
        
        // Coach selection
        this.selectedCoach = null;
        this.coaches = [];
        
        // DOM elements
        this.coachesGrid = document.getElementById('coachesGrid');
        this.chatInterface = document.getElementById('chatInterface');
        this.selectedCoachInfo = document.getElementById('selectedCoachInfo');
        this.coachAvatar = document.getElementById('coachAvatar');
        this.coachName = document.getElementById('coachName');
        this.coachSpecialty = document.getElementById('coachSpecialty');
        this.coachTagline = document.getElementById('coachTagline');
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.saveConversationBtn = document.getElementById('saveConversationBtn');
        this.changeCoachBtn = document.getElementById('changeCoachBtn');
        this.statusIndicator = document.getElementById('statusIndicator');
        this.statusText = document.getElementById('statusText');
        this.visualizer = document.getElementById('visualizer');
        this.saveTimeout = null; // Track save timeout
        
        this.init();
    }

    async init() {
        // Setup certificate guide
        this.setupCertificateGuide();
        
        // Check for coach from URL params
        const urlParams = new URLSearchParams(window.location.search);
        const coachParam = urlParams.get('coach');
        const coachIdParam = urlParams.get('coachId');
        const apiType = urlParams.get('api') || 'openai'; // 'openai' or 'elevenlabs'
        this.apiType = apiType; // Store for later use
        
        // Fetch coaches from API
        await this.fetchCoaches();
        
        // Select coach from URL or default to first coach
        if (coachParam && this.coaches.length > 0) {
            const coach = this.coaches.find(c => 
                c.name === decodeURIComponent(coachParam) || 
                (coachIdParam && c.id === parseInt(coachIdParam))
            );
            if (coach) {
                this.selectCoach(coach);
            } else {
                this.selectCoach(this.coaches[0]);
            }
        } else if (this.coaches.length > 0) {
            this.selectCoach(this.coaches[0]);
        }
        
        this.setupEventListeners();
        this.setupVisualizer();
        this.setupBackButton();
    }

    setupCertificateGuide() {
        const overlay = document.getElementById('certGuideOverlay');
        const continueBtn = document.getElementById('certGuideContinue');
        const dismissBtn = document.getElementById('certGuideDismiss');
        
        if (!overlay) return;
        
        // Check if user has already dismissed the guide
        const guideDismissed = localStorage.getItem('certGuideDismissed');
        if (guideDismissed === 'true') {
            overlay.classList.add('hidden');
            return;
        }
        
        // Check if page loaded successfully (certificate was accepted)
        // If we're here, the page loaded, so certificate was likely accepted
        // But show guide on first visit to help users understand
        const firstVisit = !sessionStorage.getItem('certGuideShown');
        
        if (firstVisit) {
            sessionStorage.setItem('certGuideShown', 'true');
            // Show guide for 3 seconds, then auto-hide if page loaded successfully
            setTimeout(() => {
                if (overlay && !overlay.classList.contains('hidden')) {
                    overlay.style.opacity = '0';
                    setTimeout(() => {
                        if (overlay) overlay.classList.add('hidden');
                    }, 300);
                }
            }, 3000);
        } else {
            overlay.classList.add('hidden');
        }
        
        if (continueBtn) {
            continueBtn.addEventListener('click', () => {
                overlay.style.opacity = '0';
                setTimeout(() => {
                    overlay.classList.add('hidden');
                }, 300);
            });
        }
        
        if (dismissBtn) {
            dismissBtn.addEventListener('click', () => {
                localStorage.setItem('certGuideDismissed', 'true');
                overlay.style.opacity = '0';
                setTimeout(() => {
                    overlay.classList.add('hidden');
                }, 300);
            });
        }
    }

    setupBackButton() {
        const backBtn = document.getElementById('backToDashboardBtn');
        if (backBtn) {
            backBtn.addEventListener('click', (e) => {
                e.preventDefault();
                // Use same origin (protocol, hostname, port) as current page
                // This ensures HTTPS is preserved if you're on HTTPS
                const dashboardUrl = `${window.location.origin}/dashboard`;
                console.log('Redirecting to:', dashboardUrl); // Debug log
                window.location.href = dashboardUrl;
            });
        }
    }

    async fetchCoaches() {
        try {
            // Try to fetch from main API
            const response = await fetch('/api/coaches');
            if (response.ok) {
                this.coaches = await response.json();
                // Map coach avatars to local avatars folder
                const avatarMap = {
                    'Alan Wozniak': '/avatars/Alan-Wozniak-CEC.jpg',
                    'Rob Mercer': '/avatars/Robertini-Rob-Mercer.jpg',
                    'Teresa Lane': '/avatars/Teresa-Lane.jpg',
                    'Camille Quinn': '/avatars/Camille-Quinn.jpg',
                    'Jeffrey Wells': '/avatars/Jeffrey-Wells.jpg',
                    'Chelsea Fox': '/avatars/Chelsea-Fox.jpg',
                    'Hudson Jaxon': '/avatars/Hudson-Jaxson.jpg',
                    'Tanner Chase': '/avatars/Tanner-Chase.jpg'
                };
                this.coaches = this.coaches.map(coach => ({
                    ...coach,
                    avatar: avatarMap[coach.name] || coach.avatar || `/avatars/${coach.name.replace(/\s+/g, '-')}.jpg`
                }));
            } else {
                // Fallback to default coaches
                this.coaches = this.getDefaultCoaches();
            }
        } catch (error) {
            console.error('Error fetching coaches:', error);
            // Fallback to default coaches
            this.coaches = this.getDefaultCoaches();
        }
        
        this.renderCoaches();
    }

    getDefaultAvatar(coachName) {
        // Use local avatars from the public/avatars folder
        const avatarMap = {
            'Alan Wozniak': '/avatars/Alan-Wozniak-CEC.jpg',
            'Rob Mercer': '/avatars/Robertini-Rob-Mercer.jpg',
            'Teresa Lane': '/avatars/Teresa-Lane.jpg',
            'Camille Quinn': '/avatars/Camille-Quinn.jpg',
            'Jeffrey Wells': '/avatars/Jeffrey-Wells.jpg',
            'Chelsea Fox': '/avatars/Chelsea-Fox.jpg',
            'Hudson Jaxon': '/avatars/Hudson-Jaxson.jpg',
            'Tanner Chase': '/avatars/Tanner-Chase.jpg'
        };
        return avatarMap[coachName] || '/avatars/default.jpg';
    }

    getDefaultCoaches() {
        // Use local avatars from the public/avatars folder
        return [
            { id: 1, name: 'Alan Wozniak', specialty: 'Business Strategy & Problem-Solving Coach', tagline: "Let's think bigger and move faster—with focus.", avatar: '/avatars/Alan-Wozniak-CEC.jpg' },
            { id: 2, name: 'Rob Mercer', specialty: 'Sales Coach', tagline: "Turn problems into conversions.", avatar: '/avatars/Robertini-Rob-Mercer.jpg' },
            { id: 3, name: 'Teresa Lane', specialty: 'Marketing Coach', tagline: "Let's make your message magnetic.", avatar: '/avatars/Teresa-Lane.jpg' },
            { id: 4, name: 'Camille Quinn', specialty: 'Customer Experience Coach', tagline: "Every touchpoint should feel unforgettable.", avatar: '/avatars/Camille-Quinn.jpg' },
            { id: 5, name: 'Jeffrey Wells', specialty: 'Operations Coach', tagline: "We build businesses that run without you.", avatar: '/avatars/Jeffrey-Wells.jpg' },
            { id: 6, name: 'Chelsea Fox', specialty: 'Culture/HR Coach', tagline: "Culture isn't what you say—it's what you build.", avatar: '/avatars/Chelsea-Fox.jpg' },
            { id: 7, name: 'Hudson Jaxon', specialty: 'Finance Coach', tagline: "Profit is power.", avatar: '/avatars/Hudson-Jaxson.jpg' },
            { id: 8, name: 'Tanner Chase', specialty: 'Business Value & BIG EXIT Coach', tagline: "We don't just grow companies—we build buyable ones.", avatar: '/avatars/Tanner-Chase.jpg' }
        ];
    }

    renderCoaches() {
        if (!this.coachesGrid) return;
        
        this.coachesGrid.innerHTML = this.coaches.map(coach => {
            const avatarUrl = coach.avatar || this.getDefaultAvatar(coach.name);
            const description = coach.description || '';
            const hasDescription = description.length > 0;
            return `
            <div class="coach-card" data-coach-id="${coach.id}" data-coach-name="${coach.name}">
                <div class="coach-card-header">
                    <img src="${avatarUrl}" 
                         alt="${coach.name}" 
                         class="coach-card-avatar"
                         onerror="this.src='${this.getDefaultAvatar(coach.name)}'">
                    <div class="coach-card-info">
                        <div class="coach-card-name">${coach.name}</div>
                        <div class="coach-card-specialty">${coach.specialty || 'Coach'}</div>
                    </div>
                </div>
                <div class="coach-card-tagline">"${coach.tagline || ''}"</div>
                ${hasDescription ? `<div class="coach-card-description">${description}</div>` : ''}
                ${hasDescription && description.length > 100 ? `<span class="coach-card-expand-btn" onclick="event.stopPropagation(); this.parentElement.classList.toggle('expanded'); this.textContent = this.parentElement.classList.contains('expanded') ? 'Show Less' : 'Show More';">Show More</span>` : ''}
                <div class="coach-card-tooltip">
                    <div class="tooltip-coach-name">${coach.name}</div>
                    <div class="tooltip-coach-specialty">${coach.specialty || 'Coach'}</div>
                    <div class="tooltip-coach-tagline">"${coach.tagline || ''}"</div>
                    ${hasDescription ? `<div class="tooltip-coach-description">${description}</div>` : '<div class="tooltip-coach-description">Select this coach to start a conversation and get expert guidance.</div>'}
                </div>
            </div>
        `;
        }).join('');
        
        // Add click listeners
        document.querySelectorAll('.coach-card').forEach(card => {
            card.addEventListener('click', () => {
                const coachId = parseInt(card.dataset.coachId);
                const coach = this.coaches.find(c => c.id === coachId);
                if (coach) {
                    this.selectCoach(coach);
                }
            });
        });
    }

    selectCoach(coach) {
        this.selectedCoach = coach;
        
        // Update UI
        document.querySelectorAll('.coach-card').forEach(card => {
            if (parseInt(card.dataset.coachId) === coach.id) {
                card.classList.add('selected');
            } else {
                card.classList.remove('selected');
            }
        });
        
        // Update selected coach info
        if (this.coachAvatar) {
            this.coachAvatar.src = coach.avatar || '/avatars/default.jpg';
            this.coachAvatar.onerror = () => { this.coachAvatar.src = '/avatars/default.jpg'; };
        }
        if (this.coachName) this.coachName.textContent = coach.name;
        if (this.coachSpecialty) this.coachSpecialty.textContent = coach.specialty || 'Coach';
        if (this.coachTagline) this.coachTagline.textContent = `"${coach.tagline || ''}"`;
        
        // Show chat interface and hide placeholder
        if (this.chatInterface) {
            this.chatInterface.style.display = 'flex';
        }
        const placeholder = document.getElementById('chatPlaceholder');
        if (placeholder) {
            placeholder.style.display = 'none';
        }
    }

    setupEventListeners() {
        if (this.startBtn) {
            this.startBtn.addEventListener('click', () => this.startConversation());
        }
        if (this.stopBtn) {
            this.stopBtn.addEventListener('click', () => this.stopConversation());
        }
        if (this.saveConversationBtn) {
            this.saveConversationBtn.addEventListener('click', () => this.saveConversation());
        }
        if (this.changeCoachBtn) {
            this.changeCoachBtn.addEventListener('click', () => {
                if (this.chatInterface) {
                    this.chatInterface.style.display = 'none';
                }
                const placeholder = document.getElementById('chatPlaceholder');
                if (placeholder) {
                    placeholder.style.display = 'flex';
                }
            });
        }
    }
    
    async saveConversation() {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            alert('Not connected. Please start a conversation first.');
            return;
        }
        
        // Get token from URL or localStorage
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token') || localStorage.getItem('token') || sessionStorage.getItem('token');
        
        if (!token) {
            alert('Authentication token not found. Please log in again.');
            return;
        }
        
        // Get coach ID from selected coach
        const coachId = this.selectedCoach?.id || null;
        
        if (!coachId) {
            alert('Coach not selected. Please select a coach first.');
            return;
        }
        
        this.updateStatus('Saving conversation...', 'active');
        if (this.saveConversationBtn) this.saveConversationBtn.disabled = true;
        
        // Set timeout to re-enable button if no response
        this.saveTimeout = setTimeout(() => {
            console.error('⏱️ Save conversation timeout - no response from server');
            this.updateStatus('Save timeout - please try again', '');
            if (this.saveConversationBtn) this.saveConversationBtn.disabled = false;
            alert('Save conversation timed out. Please try again.');
        }, 10000); // 10 second timeout
        
        try {
            const saveMessage = {
                type: 'save_conversation',
                token: token,
                userId: null, // Server will extract from token
                coachId: coachId
            };
            console.log('📤 Sending save_conversation message:', { 
                hasToken: !!token, 
                coachId,
                wsState: this.ws?.readyState,
                wsOpen: this.ws?.readyState === WebSocket.OPEN
            });
            
            if (this.ws.readyState !== WebSocket.OPEN) {
                clearTimeout(this.saveTimeout);
                this.saveTimeout = null;
                throw new Error('WebSocket is not open. State: ' + this.ws.readyState);
            }
            
            this.ws.send(JSON.stringify(saveMessage));
            console.log('✅ Save message sent successfully');
        } catch (error) {
            console.error('❌ Error sending save message:', error);
            if (this.saveTimeout) {
                clearTimeout(this.saveTimeout);
                this.saveTimeout = null;
            }
            this.updateStatus('Error sending save request', '');
            if (this.saveConversationBtn) this.saveConversationBtn.disabled = false;
            alert('Failed to send save request: ' + error.message);
        }
    }

    setupVisualizer() {
        if (!this.visualizer) return;
        
        const ctx = this.visualizer.getContext('2d');
        const width = this.visualizer.width;
        const height = this.visualizer.height;
        
        const draw = () => {
            // Clear canvas
            ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg-primary').trim() || '#ffffff';
            ctx.fillRect(0, 0, width, height);
            
            if (this.isRecording && this.analyser && this.dataArray) {
                // Get current audio levels
                this.analyser.getByteFrequencyData(this.dataArray);
                
                // Update audio levels array (smooth the visualization)
                const step = Math.floor(this.dataArray.length / 20);
                for (let i = 0; i < 20; i++) {
                    const value = this.dataArray[i * step] || 0;
                    this.audioLevels[i] = Math.max(this.audioLevels[i] * 0.7, value / 255);
                }
                
                // Draw bars
                const gradient = ctx.createLinearGradient(0, 0, width, 0);
                gradient.addColorStop(0, '#3b82f6');
                gradient.addColorStop(0.5, '#8b5cf6');
                gradient.addColorStop(1, '#ec4899');
                ctx.fillStyle = gradient;
                
                const barWidth = width / 20;
                for (let i = 0; i < 20; i++) {
                    const barHeight = this.audioLevels[i] * height * 0.8;
                    ctx.fillRect(i * barWidth + 2, height - barHeight, barWidth - 4, barHeight);
                }
            }
            
            requestAnimationFrame(draw);
        };
        
        draw();
    }

    async startConversation() {
        if (!this.selectedCoach) {
            alert('Please select a coach first');
            return;
        }

        try {
            this.updateStatus('Connecting...', 'active');
            if (this.startBtn) this.startBtn.disabled = true;
            if (this.changeCoachBtn) this.changeCoachBtn.disabled = true;

            // Get voice for selected coach (server will use its own mapping, but we send for reference)
            const voice = coachVoiceMap[this.selectedCoach.name] || 'echo';
            
            // Initialize WebSocket connection
            // Use the same protocol and host, but ensure WebSocket upgrade works through nginx
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            // Connect to root path - nginx will proxy WebSocket upgrade to Node.js server
            const wsUrl = `${protocol}//${window.location.host}/`;
            console.log('🔌 Connecting WebSocket to:', wsUrl);
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = async () => {
                console.log('WebSocket connected');
                console.log(`🎤 Starting conversation with coach: ${this.selectedCoach.name}`);
                
                // Get token from URL or storage
                const urlParams = new URLSearchParams(window.location.search);
                const token = urlParams.get('token') || localStorage.getItem('token') || sessionStorage.getItem('token');

                // Try to get user info from various sources
                let userName = null;
                let userId = null;

                // Try to decode token to get user info
                if (token) {
                    try {
                        // Simple base64 decode to get payload (without verification on client)
                        const payload = token.split('.')[1];
                        const decodedPayload = JSON.parse(atob(payload));
                        userName = decodedPayload.name || decodedPayload.userName || decodedPayload.username || decodedPayload.firstName;
                        userId = decodedPayload.userId;
                        console.log('Client: Extracted user info from token:', { userName, userId });
                    } catch (e) {
                        console.warn('Client: Could not decode token payload:', e);
                    }
                }

                // Send coach name and user info - server will use for greeting
                this.ws.send(JSON.stringify({
                    type: 'start',
                    coachName: this.selectedCoach.name.trim(), // Server uses this to determine voice
                    apiType: this.apiType || 'openai', // Pass API type to server
                    token: token, // Pass token for authentication
                    coachId: this.selectedCoach?.id || null, // Pass coach ID
                    userName: userName, // Pass extracted user name
                    userId: userId // Pass extracted user ID
                    // Note: Server ignores 'voice' field and uses its own gender-matched mapping
                }));
            };

            this.ws.onmessage = async (event) => {
                try {
                    const data = JSON.parse(event.data);
                    // Only log important messages, not every audio chunk
                    if (data.type !== 'audio') {
                        console.log('Received message:', data.type);
                    }
                    
                    if (data.type === 'connected') {
                        try {
                            await this.initializeAudio();
                            this.isConnected = true;
                            this.isRecording = true;
                            this.updateStatus('Listening... Speak now!', 'recording');
                            if (this.stopBtn) this.stopBtn.disabled = false;
                            if (this.saveConversationBtn) this.saveConversationBtn.disabled = false;
                            this.currentResponseId = null;
                        } catch (audioError) {
                            console.error('Audio initialization error:', audioError);
                            this.updateStatus(`Error: ${audioError.message}`, '');
                            this.reset();
                        }
                    } else if (data.type === 'audio') {
                        this.queueAudio(data.audio, data.responseId);
                    } else if (data.type === 'greeting') {
                        // Handle initial greeting from coach
                        console.log('👋 Received greeting:', data.message);
                        this.updateStatus(`Connected with ${data.coachName}`, 'success');
                        // Display greeting in UI if needed
                        if (data.message) {
                            // Could show greeting text in the interface
                            console.log(`Greeting: ${data.message}`);
                        }
                    } else if (data.type === 'response_cancelled') {
                        if (!data.responseId || data.responseId === this.currentResponseId) {
                            this.clearAudioQueue();
                            this.currentResponseId = null;
                        }
                    } else if (data.type === 'error') {
                        console.error('❌ Server error:', data.message);
                        // Clear save timeout if this is a save-related error
                        const isSaveError = data.message && (
                            data.message.toLowerCase().includes('save') || 
                            data.message.toLowerCase().includes('token') ||
                            data.message.toLowerCase().includes('user id') ||
                            data.message.toLowerCase().includes('coach id') ||
                            data.message.toLowerCase().includes('conversation')
                        );
                        
                        if (this.saveTimeout && isSaveError) {
                            console.log('Clearing save timeout due to error');
                            clearTimeout(this.saveTimeout);
                            this.saveTimeout = null;
                            if (this.saveConversationBtn) this.saveConversationBtn.disabled = false;
                            alert('Failed to save conversation: ' + data.message);
                        }
                        this.updateStatus(`Error: ${data.message}`, '');
                        if (data.message && (
                            data.message.includes('connection lost') || 
                            data.message.includes('Connection closed') ||
                            data.message.includes('timeout') ||
                            data.message.includes('403 Forbidden')
                        )) {
                            if (!this.ws || this.ws.readyState === WebSocket.CLOSED || this.ws.readyState === WebSocket.CLOSING) {
                                this.reset();
                            } else {
                                setTimeout(() => {
                                    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.isConnected) {
                                        this.updateStatus('Connection recovered', 'recording');
                                    } else {
                                        this.reset();
                                    }
                                }, 2000);
                            }
                        }
                    } else if (data.type === 'disconnected') {
                        this.updateStatus('Disconnected', '');
                        this.reset();
                    } else if (data.type === 'conversation_saved') {
                        console.log('✅ Conversation saved response received:', data);
                        if (this.saveTimeout) {
                            clearTimeout(this.saveTimeout);
                            this.saveTimeout = null;
                        }
                        this.updateStatus('Conversation saved successfully!', 'active');
                        setTimeout(() => {
                            this.updateStatus('Ready', '');
                        }, 3000);
                        alert('Conversation saved successfully!');
                        if (this.saveConversationBtn) this.saveConversationBtn.disabled = false;
                    } else if (data.type === 'notes_sent') {
                        this.updateStatus(data.message || 'Notes sent successfully!', '');
                        alert(data.message || 'Notes sent successfully!');
                    } else if (data.type === 'reminder_created') {
                        this.updateStatus('Reminder created successfully!', '');
                        alert('Reminder created successfully!');
                    } else if (data.type === 'huddle_created') {
                        this.updateStatus('Huddle created and invites sent!', '');
                        alert('Huddle created and invites sent!');
                    } else if (data.type === 'coach_referred') {
                        this.updateStatus(`Transferring to ${data.coachName}...`, '');
                        // Could implement actual coach transfer here
                    } else {
                        // Log unhandled message types for debugging
                        if (data.type !== 'audio') {
                            console.log('⚠️ Unhandled message type:', data.type, data);
                        }
                    }
                } catch (parseError) {
                    console.error('❌ Error parsing message:', parseError, event.data);
                }
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.updateStatus('Connection error - check console for details', '');
            };

            this.ws.onclose = (event) => {
                console.log('WebSocket closed:', event.code, event.reason);
                if (event.code !== 1000 && !this.isConnected) {
                    this.updateStatus(`Connection failed: ${event.reason || 'Unknown error'}`, '');
                }
                this.reset();
            };

        } catch (error) {
            console.error('Error starting conversation:', error);
            this.updateStatus(`Error: ${error.message}`, '');
            this.reset();
        }
    }

    async initializeAudio() {
        try {
            // Get user media
            this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                } 
            });

            // Use separate AudioContext for input (microphone recording)
            this.inputAudioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Ensure audio context is running
            if (this.inputAudioContext.state === 'suspended') {
                await this.inputAudioContext.resume();
                console.log('Input audio context was suspended, resumed it');
            }
            
            const actualSampleRate = this.inputAudioContext.sampleRate;
            console.log('Input audio context sample rate:', actualSampleRate);

            // Create audio source from microphone
            const source = this.inputAudioContext.createMediaStreamSource(this.mediaStream);
            
            // Create analyser for visualization
            this.analyser = this.inputAudioContext.createAnalyser();
            this.analyser.fftSize = 256;
            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
            source.connect(this.analyser);
            
            // Create script processor for audio capture
            const bufferSize = 4096;
            let processor = null;
            
            try {
                processor = this.inputAudioContext.createScriptProcessor(bufferSize, 1, 1);
            } catch (e) {
                console.error('Failed to create ScriptProcessor:', e);
                throw new Error('Audio processing not supported in this browser');
            }
            
            // Buffer to accumulate audio before sending
            let audioBuffer = [];
            const sendInterval = 100; // Send every 100ms
            let lastSendTime = Date.now();
            
            processor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                
                // Check if we should send audio
                const shouldSend = this.isRecording && 
                                  this.isConnected && 
                                  this.ws && 
                                  this.ws.readyState === WebSocket.OPEN;
                
                if (shouldSend) {
                    // Resample to 24kHz if needed
                    let processedData = inputData;
                    if (actualSampleRate !== 24000) {
                        processedData = this.resampleAudio(inputData, actualSampleRate, 24000);
                    }
                    
                    // Convert Float32Array to Int16Array (PCM16)
                    const int16Data = new Int16Array(processedData.length);
                    for (let i = 0; i < processedData.length; i++) {
                        int16Data[i] = Math.max(-32768, Math.min(32767, processedData[i] * 32768));
                    }
                    
                    // Accumulate audio data
                    audioBuffer.push(...Array.from(int16Data));
                    
                    // Send in batches
                    const now = Date.now();
                    if (now - lastSendTime >= sendInterval && audioBuffer.length > 0) {
                        const bufferToSend = new Int16Array(audioBuffer);
                        const base64Audio = this.arrayBufferToBase64(bufferToSend.buffer);
                        
                        try {
                            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                                this.ws.send(JSON.stringify({
                                    type: 'audio',
                                    audio: base64Audio
                                }));
                            }
                        } catch (sendError) {
                            console.error('❌ Error sending audio:', sendError);
                            return;
                        }
                        
                        audioBuffer = [];
                        lastSendTime = now;
                    }
                } else if (!this.isRecording) {
                    audioBuffer = [];
                }
            };

            // Connect the audio processing chain
            source.connect(processor);
            const gainNode = this.inputAudioContext.createGain();
            gainNode.gain.value = 0; // Mute output to prevent feedback
            processor.connect(gainNode);
            gainNode.connect(this.inputAudioContext.destination);
            
            this.audioProcessor = processor;
            this.audioGainNode = gainNode;
            
            console.log('Audio processor initialized and connected');

        } catch (error) {
            console.error('Error initializing audio:', error);
            throw new Error('Could not access microphone. Please check permissions.');
        }
    }

    resampleAudio(input, inputSampleRate, outputSampleRate) {
        if (inputSampleRate === outputSampleRate) {
            return input;
        }
        
        const ratio = inputSampleRate / outputSampleRate;
        const outputLength = Math.round(input.length / ratio);
        const output = new Float32Array(outputLength);
        
        for (let i = 0; i < outputLength; i++) {
            const index = i * ratio;
            const indexFloor = Math.floor(index);
            const indexCeil = Math.min(indexFloor + 1, input.length - 1);
            const fraction = index - indexFloor;
            output[i] = input[indexFloor] * (1 - fraction) + input[indexCeil] * fraction;
        }
        
        return output;
    }

    queueAudio(audioData, responseId) {
        if (responseId && responseId !== this.currentResponseId) {
            this.clearAudioQueue();
            this.currentResponseId = responseId;
        }
        
        if (!this.currentResponseId && responseId) {
            this.currentResponseId = responseId;
        }
        
        if (responseId && responseId !== this.currentResponseId) {
            return;
        }
        
        this.audioQueue.push(audioData);
        
        if (!this.isPlayingAudio) {
            this.playAudioQueue();
        }
    }
    
    clearAudioQueue() {
        this.audioQueue = [];
        this.isPlayingAudio = false;
    }

    async playAudioQueue() {
        if (this.audioQueue.length === 0) {
            this.isPlayingAudio = false;
            return;
        }

        this.isPlayingAudio = true;

        if (!this.outputAudioContext) {
            this.outputAudioContext = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: 24000
            });
        }

        if (this.outputAudioContext.state === 'suspended') {
            await this.outputAudioContext.resume();
        }

        try {
            while (this.audioQueue.length > 0) {
                const audioData = this.audioQueue.shift();
                
                const binaryString = atob(audioData);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                
                const int16Data = new Int16Array(bytes.buffer);
                const float32Data = new Float32Array(int16Data.length);
                const scale = 1 / 32768;
                for (let i = 0; i < int16Data.length; i++) {
                    float32Data[i] = int16Data[i] * scale;
                }

                const audioBuffer = this.outputAudioContext.createBuffer(1, float32Data.length, 24000);
                audioBuffer.getChannelData(0).set(float32Data);

                const source = this.outputAudioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(this.outputAudioContext.destination);
                source.start(0);
                
                await new Promise((resolve) => {
                    source.onended = resolve;
                });
            }
        } catch (error) {
            console.error('Error playing audio:', error);
        }

        this.isPlayingAudio = false;
        
        if (this.audioQueue.length > 0) {
            this.playAudioQueue();
        }
    }

    arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    stopConversation() {
        // Send stop message to server
        if (this.ws) {
            this.ws.send(JSON.stringify({ type: 'stop' }));
        }

        // Update status to show stopping and saving
        this.updateStatus('Stopping and saving conversation...', 'active');

        // Automatically save the conversation (same as clicking save button)
        this.autoSaveOnStop();

        // Reset the client state
        this.reset();
    }

    async autoSaveOnStop() {
        try {
            // Only attempt to save if we have a WebSocket connection
            if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
                console.log('⚠️ Cannot auto-save: No WebSocket connection');
                return;
            }

            // Get authentication token
            const urlParams = new URLSearchParams(window.location.search);
            const token = urlParams.get('token') || localStorage.getItem('token') || sessionStorage.getItem('token');

            if (!token) {
                console.log('⚠️ Cannot auto-save: No authentication token');
                return;
            }

            // Get coach ID
            const coachId = this.selectedCoach?.id || null;

            if (!coachId) {
                console.log('⚠️ Cannot auto-save: No coach selected');
                return;
            }

            console.log('💾 Auto-saving conversation on stop...');

            // Send save request to server (same message as manual save)
            this.ws.send(JSON.stringify({
                type: 'save_conversation',
                token: token,
                coachId: coachId
            }));

            // Update UI to show save is in progress
            this.updateStatus('Saving conversation...', 'active');

            // Set timeout to clear the saving status if no response
            this.saveTimeout = setTimeout(() => {
                console.log('⏱️ Auto-save timeout');
                this.updateStatus('Conversation saved', 'success');
                if (this.saveTimeout) {
                    clearTimeout(this.saveTimeout);
                    this.saveTimeout = null;
                }
            }, 3000); // 3 seconds timeout for auto-save

        } catch (error) {
            console.error('❌ Error during auto-save:', error);
        }
    }

    reset() {
        this.isConnected = false;
        this.isRecording = false;
        
        this.clearAudioQueue();
        this.currentResponseId = null;
        
        if (this.audioProcessor) {
            try {
                this.audioProcessor.disconnect();
            } catch (e) {
                console.warn('Error disconnecting processor:', e);
            }
            this.audioProcessor = null;
        }
        
        if (this.audioGainNode) {
            try {
                this.audioGainNode.disconnect();
            } catch (e) {
                console.warn('Error disconnecting gain node:', e);
            }
            this.audioGainNode = null;
        }
        
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => {
                track.stop();
            });
            this.mediaStream = null;
        }

        if (this.inputAudioContext && this.inputAudioContext.state !== 'closed') {
            this.inputAudioContext.close().catch(e => {
                console.warn('Error closing input audio context:', e);
            });
            this.inputAudioContext = null;
        }

        if (this.outputAudioContext && this.outputAudioContext.state !== 'closed') {
            this.outputAudioContext.close().catch(e => {
                console.warn('Error closing output audio context:', e);
            });
            this.outputAudioContext = null;
        }

        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        if (this.startBtn) this.startBtn.disabled = false;
        if (this.stopBtn) this.stopBtn.disabled = true;
        if (this.changeCoachBtn) this.changeCoachBtn.disabled = false;
        this.updateStatus('Ready to start', '');
    }

    updateStatus(text, indicatorClass) {
        if (this.statusText) this.statusText.textContent = text;
        if (this.statusIndicator) {
            this.statusIndicator.className = `status-indicator ${indicatorClass}`;
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new VoiceConversation();
});