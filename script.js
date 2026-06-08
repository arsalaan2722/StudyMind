document.addEventListener('DOMContentLoaded', () => {
    // --- Elements ---
    const loginScreen = document.getElementById('login-screen');
    const chatApp = document.getElementById('chat-app');
    const loginForm = document.getElementById('login-form');
    const usernameInput = document.getElementById('username');
    const displayName = document.getElementById('display-name');
    const welcomeName = document.getElementById('welcome-name');
    const logoutBtn = document.getElementById('logout-btn');
    
    const chatHistoryList = document.getElementById('chat-history-list');
    const newChatBtn = document.getElementById('new-chat-btn');
    const chatMessages = document.getElementById('chat-messages');
    const welcomeView = document.getElementById('welcome-view');
    const currentChatTitle = document.getElementById('current-chat-title');
    
    const chatForm = document.getElementById('chat-form');
    const messageInput = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');
    const attachBtn = document.getElementById('attach-btn');
    const fileUpload = document.getElementById('file-upload');
    const attachmentPreview = document.getElementById('attachment-preview');
    const attachmentName = document.getElementById('attachment-name');
    const removeFileBtn = document.getElementById('remove-file-btn');
    const inputWrapper = document.querySelector('.input-wrapper');
    
    // Navigation items
    const navDashboard = document.getElementById('nav-dashboard');
    const navLibrary = document.getElementById('nav-library');
    const navSessions = document.getElementById('nav-sessions');
    const navInsights = document.getElementById('nav-insights');
    
    // Views
    const libraryView = document.getElementById('library-view');
    const sessionsView = document.getElementById('sessions-view');
    const insightsView = document.getElementById('insights-view');
    const allSessionsList = document.getElementById('all-sessions-list');
    
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.querySelector('.sidebar');
    
    // Settings elements
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsBtn = document.getElementById('close-settings-btn');
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    const settingsUsernameInput = document.getElementById('settings-username');
    const settingsApiKeyInput = document.getElementById('settings-api-key');
    const loginApiKeyInput = document.getElementById('login-api-key');

    let selectedFile = null;

    // --- State ---
    let apiKey = localStorage.getItem('studyMindApiKey') || '';
    let currentUser = localStorage.getItem('studyMindUserV3');
    let chats = JSON.parse(localStorage.getItem('studyMindDataV3')) || {};
    let currentChatId = null;

    // --- Initialization ---
    init();

    function init() {
        if (currentUser) {
            showChatApp();
        } else {
            showLoginScreen();
        }
    }

    function showLoginScreen() {
        loginScreen.classList.add('active');
        chatApp.classList.remove('active');
        if (currentUser) usernameInput.value = currentUser;
        if (apiKey) loginApiKeyInput.value = apiKey;
        usernameInput.focus();
    }

    function showChatApp() {
        loginScreen.classList.remove('active');
        chatApp.classList.add('active');
        displayName.textContent = currentUser;
        if(welcomeName) welcomeName.textContent = currentUser;
        
        renderSidebar();
        
        // Load latest chat or create new
        const chatIds = Object.keys(chats).sort((a, b) => chats[b].updatedAt - chats[a].updatedAt);
        if (chatIds.length > 0) {
            loadChat(chatIds[0]);
        } else {
            createNewChat();
        }
        
        switchView('dashboard');

        // Automatically prompt for API Key if not set
        if (!apiKey) {
            setTimeout(openSettings, 500);
        }
    }

    // --- Authentication ---
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = usernameInput.value.trim();
        const key = loginApiKeyInput.value.trim();
        if (name) {
            currentUser = name;
            localStorage.setItem('studyMindUserV3', name);
            if (key) {
                apiKey = key;
                localStorage.setItem('studyMindApiKey', key);
            }
            showChatApp();
        }
    });

    logoutBtn.addEventListener('click', () => {
        currentUser = null;
        localStorage.removeItem('studyMindUserV3');
        showLoginScreen();
    });

    // --- Chat Management ---
    function saveState() {
        localStorage.setItem('studyMindDataV3', JSON.stringify(chats));
    }

    function createNewChat() {
        currentChatId = Date.now().toString();
        chats[currentChatId] = {
            id: currentChatId,
            title: "New Study Session",
            messages: [],
            updatedAt: Date.now()
        };
        saveState();
        renderSidebar();
        switchView('dashboard');
        renderChatArea();
        
        if (window.innerWidth <= 768) {
            sidebar.classList.remove('open');
        }
    }

    function loadChat(id) {
        if (!chats[id]) return;
        currentChatId = id;
        renderSidebar();
        switchView('dashboard');
        renderChatArea();
        
        if (window.innerWidth <= 768) {
            sidebar.classList.remove('open');
        }
    }

    function deleteChat(id, e) {
        e.stopPropagation();
        delete chats[id];
        saveState();
        
        if (currentChatId === id) {
            const remaining = Object.keys(chats);
            if (remaining.length > 0) {
                loadChat(remaining[0]);
            } else {
                createNewChat();
            }
        } else {
            renderSidebar();
        }
    }

    newChatBtn.addEventListener('click', createNewChat);

    // --- Navigation Logic ---
    function switchView(viewName) {
        // Reset all active classes
        [navDashboard, navLibrary, navSessions, navInsights].forEach(el => el.classList.remove('active'));
        
        // Hide all views
        chatMessages.style.display = 'none';
        inputWrapper.style.display = 'none';
        libraryView.style.display = 'none';
        sessionsView.style.display = 'none';
        insightsView.style.display = 'none';
        
        if (viewName === 'dashboard') {
            navDashboard.classList.add('active');
            chatMessages.style.display = 'block';
            inputWrapper.style.display = 'flex';
            currentChatTitle.textContent = chats[currentChatId] ? chats[currentChatId].title : "Dashboard";
        } else if (viewName === 'library') {
            navLibrary.classList.add('active');
            libraryView.style.display = 'block';
            currentChatTitle.textContent = "Library";
        } else if (viewName === 'sessions') {
            navSessions.classList.add('active');
            sessionsView.style.display = 'block';
            currentChatTitle.textContent = "Sessions";
            renderAllSessionsView();
        } else if (viewName === 'insights') {
            navInsights.classList.add('active');
            insightsView.style.display = 'block';
            currentChatTitle.textContent = "Insights";
        }
        
        if (window.innerWidth <= 768) {
            sidebar.classList.remove('open');
        }
    }
    
    navDashboard.addEventListener('click', () => switchView('dashboard'));
    navLibrary.addEventListener('click', () => switchView('library'));
    navSessions.addEventListener('click', () => switchView('sessions'));
    navInsights.addEventListener('click', () => switchView('insights'));
    
    function renderAllSessionsView() {
        allSessionsList.innerHTML = '';
        const sortedChats = Object.values(chats).sort((a, b) => b.updatedAt - a.updatedAt);
        
        if (sortedChats.length === 0) {
            allSessionsList.innerHTML = '<p style="color:var(--text-muted);">No sessions found.</p>';
            return;
        }
        
        sortedChats.forEach(chat => {
            const date = new Date(chat.updatedAt).toLocaleDateString();
            const msgs = chat.messages.length;
            
            const card = document.createElement('div');
            card.className = 'session-card-large';
            card.innerHTML = `
                <div class="scl-info">
                    <h4>${chat.title}</h4>
                    <p>${date} • ${msgs} messages</p>
                </div>
                <div class="scl-action">
                    <button class="btn-gradient" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;">Open</button>
                </div>
            `;
            card.onclick = () => loadChat(chat.id);
            allSessionsList.appendChild(card);
        });
    }

    // --- Rendering ---
    function renderSidebar() {
        chatHistoryList.innerHTML = '';
        const sortedChats = Object.values(chats).sort((a, b) => b.updatedAt - a.updatedAt);
        
        sortedChats.forEach(chat => {
            const li = document.createElement('li');
            li.className = `history-item ${chat.id === currentChatId ? 'active' : ''}`;
            li.onclick = () => loadChat(chat.id);
            
            li.innerHTML = `
                <i class="fa-regular fa-message"></i>
                <span>${chat.title}</span>
                <i class="fa-solid fa-trash delete-btn" title="Delete"></i>
            `;
            
            const deleteBtn = li.querySelector('.delete-btn');
            deleteBtn.onclick = (e) => deleteChat(chat.id, e);
            
            chatHistoryList.appendChild(li);
        });
    }

    function renderChatArea() {
        const chat = chats[currentChatId];
        currentChatTitle.textContent = chat.title;
        
        chatMessages.innerHTML = '';
        
        if (chat.messages.length === 0) {
            chatMessages.appendChild(welcomeView);
            welcomeView.style.display = 'flex';
        } else {
            chat.messages.forEach(msg => {
                appendMessageUI(msg.role, msg.text, msg.fileName);
            });
            scrollToBottom();
        }
    }

    function appendMessageUI(role, text, fileName = null) {
        if (welcomeView.parentNode === chatMessages) {
            chatMessages.removeChild(welcomeView);
        }

        const msgDiv = document.createElement('div');
        msgDiv.className = `message-wrapper ${role}`;
        
        const avatarIcon = role === 'user' ? '<i class="fa-solid fa-user"></i>' : '<i class="fa-solid fa-robot"></i>';
        const avatarClass = role === 'user' ? 'user-msg-avatar' : 'ai-icon-avatar';
        
        let contentHtml = text;
        if (role === 'ai') {
            try {
                contentHtml = window.marked ? marked.parse(text) : `<p>${text.replace(/\n/g, '<br>')}</p>`;
            } catch (e) {
                contentHtml = `<p>${text.replace(/\n/g, '<br>')}</p>`;
            }
        } else {
            contentHtml = `<p>${text.replace(/\n/g, '<br>')}</p>`;
            if (fileName) {
                contentHtml += `<br><small style="color:#a855f7;"><i>📎 Attached: ${fileName}</i></small>`;
            }
        }

        msgDiv.innerHTML = `
            <div class="${avatarClass}">
                ${avatarIcon}
            </div>
            <div class="message-content">
                ${contentHtml}
            </div>
        `;
        
        chatMessages.appendChild(msgDiv);
        scrollToBottom();
    }

    function appendTypingIndicator() {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message-wrapper ai typing-indicator-wrapper`;
        msgDiv.id = 'typing-indicator';
        
        msgDiv.innerHTML = `
            <div class="ai-icon-avatar">
                <i class="fa-solid fa-robot"></i>
            </div>
            <div class="message-content" style="display:flex; align-items:center;">
                <div class="typing-indicator">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            </div>
        `;
        
        chatMessages.appendChild(msgDiv);
        scrollToBottom();
    }

    function removeTypingIndicator() {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) indicator.remove();
    }

    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // --- File Attachment ---
    attachBtn.addEventListener('click', () => fileUpload.click());

    fileUpload.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            const file = e.target.files[0];
            
            if (file.name.match(/\.(doc|docx|ppt|pptx|xls|xlsx)$/i)) {
                alert("Sorry! The Gemini API currently only supports PDFs, Images, Audio, Video, and Text files. Word and PowerPoint files are not natively supported by the API yet. Please convert your file to a PDF or Text file first.");
                fileUpload.value = '';
                return;
            }

            selectedFile = file;
            attachmentPreview.style.display = 'flex';
            attachmentName.textContent = selectedFile.name;
            
            messageInput.focus();
            sendBtn.disabled = false;
        }
    });

    removeFileBtn.addEventListener('click', () => {
        selectedFile = null;
        fileUpload.value = '';
        attachmentPreview.style.display = 'none';
        messageInput.dispatchEvent(new Event('input'));
    });

    // --- Input Handling ---
    messageInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        if (this.scrollHeight > 150) {
            this.style.overflowY = 'auto';
        } else {
            this.style.overflowY = 'hidden';
        }
        sendBtn.disabled = this.value.trim().length === 0 && !selectedFile;
    });

    messageInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!sendBtn.disabled) {
                chatForm.dispatchEvent(new Event('submit', { cancelable: true }));
            }
        }
    });

    window.submitSuggestion = function(text) {
        messageInput.value = text;
        messageInput.dispatchEvent(new Event('input'));
        chatForm.dispatchEvent(new Event('submit', { cancelable: true }));
    };

    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const text = messageInput.value.trim();
        if (!text && !selectedFile) return;

        const chat = chats[currentChatId];
        
        if (chat.messages.length === 0) {
            const tempTitle = text || selectedFile.name;
            chat.title = tempTitle.substring(0, 30) + (tempTitle.length > 30 ? "..." : "");
            currentChatTitle.textContent = chat.title;
        }

        const userMsg = { role: "user", text: text };
        let fileToUpload = null;

        if (selectedFile) {
            fileToUpload = selectedFile;
            userMsg.fileName = selectedFile.name;
            userMsg.fileMimeType = selectedFile.type || 'application/octet-stream';
        }

        chat.messages.push(userMsg);
        chat.updatedAt = Date.now();
        saveState();
        renderSidebar();
        appendMessageUI('user', text, userMsg.fileName);

        messageInput.value = '';
        messageInput.style.height = 'auto';
        selectedFile = null;
        fileUpload.value = '';
        attachmentPreview.style.display = 'none';
        sendBtn.disabled = true;

        await fetchAIResponse(chat, fileToUpload);
    });

    // --- API Integration ---
    async function fetchAIResponse(chat, fileToUpload = null) {
        if (!apiKey) {
            removeTypingIndicator();
            appendMessageUI('ai', `**Error:** Gemini API key is missing. Please click the gear icon <i class="fa-solid fa-gear"></i> in the top-right header to configure your Gemini API Key. You can get a free key from [Google AI Studio](https://aistudio.google.com/).`);
            const lastUserMsg = chat.messages[chat.messages.length-1];
            if (lastUserMsg && lastUserMsg.text) {
                messageInput.value = lastUserMsg.text; 
            }
            chat.messages.pop(); 
            saveState();
            messageInput.dispatchEvent(new Event('input'));
            return;
        }

        appendTypingIndicator();
        
        let fileUri = null;
        if (fileToUpload) {
            try {
                const uploadUrl = `https://generativelanguage.googleapis.com/upload/v1beta/files?uploadType=media&key=${apiKey}`;
                const fileResp = await fetch(uploadUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': fileToUpload.type || 'application/octet-stream' },
                    body: fileToUpload
                });
                
                if (!fileResp.ok) throw new Error("Failed to upload file to AI");
                const fileDataObj = await fileResp.json();
                fileUri = fileDataObj.file.uri;
                
                chat.messages[chat.messages.length - 1].fileUri = fileUri;
                saveState();
            } catch(e) {
                removeTypingIndicator();
                appendMessageUI('ai', `**Error:** ${e.message}`);
                chat.messages.pop();
                saveState();
                return;
            }
        }

        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;
        
        const contents = chat.messages.map(msg => {
            const parts = [];
            if (msg.fileUri) {
                parts.push({ fileData: { mimeType: msg.fileMimeType, fileUri: msg.fileUri } });
            }
            if (msg.text) {
                parts.push({ text: msg.text });
            } else if (!msg.text && msg.fileUri) {
                parts.push({ text: "Please analyze this file." });
            }
            return {
                role: msg.role === 'user' ? 'user' : 'model',
                parts: parts
            };
        });

        const systemInstruction = "You are StudyMind, an elite AI study companion. Provide clear, highly structured, and encouraging responses. Use markdown formatting beautifully (headers, lists, bold text).";

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    systemInstruction: { parts: [{ text: systemInstruction }] },
                    contents: contents,
                    generationConfig: { temperature: 0.7 }
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || "API Request Failed");
            }

            const data = await response.json();
            const aiText = data.candidates[0].content.parts[0].text;
            
            removeTypingIndicator();
            
            chat.messages.push({ role: "ai", text: aiText });
            chat.updatedAt = Date.now();
            saveState();
            renderSidebar();
            
            appendMessageUI('ai', aiText);

        } catch (error) {
            removeTypingIndicator();
            const errorMsg = `**Error:** ${error.message}\n\nPlease try sending your message again.`;
            appendMessageUI('ai', errorMsg);
            
            const lastUserMsg = chat.messages[chat.messages.length-1];
            if (lastUserMsg.text) {
                messageInput.value = lastUserMsg.text; 
            }
            chat.messages.pop(); 
            saveState();
            messageInput.dispatchEvent(new Event('input'));
        }
    }

    // --- Mobile Sidebar Toggle ---
    mobileMenuBtn.addEventListener('click', () => {
        sidebar.classList.add('open');
    });

    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 && 
            sidebar.classList.contains('open') && 
            !sidebar.contains(e.target) && 
            !mobileMenuBtn.contains(e.target)) {
            sidebar.classList.remove('open');
        }
    });

    // --- Settings Modal Logic ---
    function openSettings() {
        settingsUsernameInput.value = currentUser || '';
        settingsApiKeyInput.value = apiKey || '';
        settingsModal.style.display = 'flex';
        setTimeout(() => {
            settingsModal.classList.add('active');
        }, 10);
    }

    function closeSettings() {
        settingsModal.classList.remove('active');
        setTimeout(() => {
            settingsModal.style.display = 'none';
        }, 300);
    }

    function saveSettings() {
        const newUsername = settingsUsernameInput.value.trim();
        const newApiKey = settingsApiKeyInput.value.trim();

        if (!newUsername) {
            alert("Please enter a valid scholar name.");
            return;
        }

        currentUser = newUsername;
        localStorage.setItem('studyMindUserV3', newUsername);
        displayName.textContent = currentUser;
        if(welcomeName) welcomeName.textContent = currentUser;

        apiKey = newApiKey;
        localStorage.setItem('studyMindApiKey', newApiKey);

        closeSettings();
    }

    // Toggle Password/API Key visibility
    document.querySelectorAll('.toggle-visibility-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            const inputEl = document.getElementById(targetId);
            const iconEl = btn.querySelector('i');
            
            if (inputEl.type === 'password') {
                inputEl.type = 'text';
                iconEl.className = 'fa-regular fa-eye-slash';
            } else {
                inputEl.type = 'password';
                iconEl.className = 'fa-regular fa-eye';
            }
        });
    });

    if (settingsBtn) settingsBtn.addEventListener('click', openSettings);
    if (closeSettingsBtn) closeSettingsBtn.addEventListener('click', closeSettings);
    if (saveSettingsBtn) saveSettingsBtn.addEventListener('click', saveSettings);

    // Close modal when clicking outside card
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            closeSettings();
        }
    });
});
