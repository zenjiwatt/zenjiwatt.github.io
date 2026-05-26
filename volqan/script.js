/* ========================================================
   VOLQAN OS — CLASSIC WINDOWS 95 DARK GUI SCRIPT
   ======================================================== */

document.addEventListener('DOMContentLoaded', () => {

    // Correct SHA-256 Hex Signatures
    const CORRECT_USER_HASH = "78666700993dd9db9911facb5adda5972509023b2024b8a18b4df023e50acc95"; // "voloqan"
    const CORRECT_PASS_HASH = "31cc9650f3dd1bca7fdcd1f40a4cd1a77f7a82f0d333be132fec3502ec9d1515"; // "31415926"
    const SESSION_SECRET_HASH = "b4f2c5d3d495b43d3b7617ab6f6d2f3d17dbb94541bf7623a856fa2b8744155b"; // sha256("voloqan_31415926_authenticated")

    // Cryptographic helper utilizing the standard Web Crypto API
    const computeSHA256 = async (message) => {
        const msgBuffer = new TextEncoder().encode(message);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    };

    // Date offset delta for 2012/8/7 Amman Jordan time
    const dateOffset = new Date('2026-05-26T19:54:16+03:00').getTime() - new Date('2012-08-07T19:54:16+03:00').getTime();

    // Selectors
    const crtScreen = document.getElementById('main-crt-screen');
    const monitorPowerBtn = document.getElementById('monitor-power-btn');
    const monitorLed = document.getElementById('monitor-led');

    // 1. PHYSICAL CRT MONITOR POWER TOGGLE BUTTON (Easter Egg)
    let isMonitorOn = true;
    if (monitorPowerBtn) {
        monitorPowerBtn.addEventListener('click', () => {
            isMonitorOn = !isMonitorOn;
            if (isMonitorOn) {
                // Turn CRT screen ON
                crtScreen.classList.remove('screen-off');
                monitorLed.classList.remove('led-off');
                monitorPowerBtn.classList.remove('btn-depressed');
            } else {
                // Turn CRT screen OFF (Collapses screen visually)
                crtScreen.classList.add('screen-off');
                monitorLed.classList.add('led-off');
                monitorPowerBtn.classList.add('btn-depressed');
            }
        });
    }

    // 2. DRAGGABLE WINDOW CONTROLLER WITH 25% OFF-SCREEN MARGINS (75% remains visible)
    const makeWindowDraggable = (winEl) => {
        const titleBar = winEl.querySelector('.win95-title-bar');
        if (!titleBar) return;

        let isDragging = false;
        let startX, startY;
        let initialLeft, initialTop;

        // Click anywhere on the window to bring it to front
        winEl.addEventListener('mousedown', () => {
            document.querySelectorAll('.win95-window').forEach(w => w.style.zIndex = '20');
            winEl.style.zIndex = '30';
        });

        titleBar.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            if (e.target.closest('.win-ctrl-btn')) return;

            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;

            // Get viewport coordinates
            const rect = winEl.getBoundingClientRect();
            
            // Map viewport coordinates to parent relative coordinates (very critical bug fix!)
            const parentRect = winEl.parentElement.getBoundingClientRect();
            const relLeft = rect.left - parentRect.left;
            const relTop = rect.top - parentRect.top;

            winEl.style.position = 'absolute';
            winEl.style.margin = '0';
            winEl.style.left = relLeft + 'px';
            winEl.style.top = relTop + 'px';
            
            initialLeft = relLeft;
            initialTop = relTop;

            titleBar.style.cursor = 'move';
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            // DRAG CONSTRAINTS: Only let 25% (a quarter of the window) leave the screen borders!
            // At least 75% (three-quarters) must remain fully visible inside the screen container bounds
            const parentWidth = winEl.parentElement.clientWidth;
            const parentHeight = winEl.parentElement.clientHeight;

            const minLeft = -(winEl.offsetWidth * 0.25);
            const maxLeft = parentWidth - (winEl.offsetWidth * 0.75);
            const minTop = -(winEl.offsetHeight * 0.25);
            const maxTop = parentHeight - (winEl.offsetHeight * 0.75);

            let finalLeft = initialLeft + dx;
            let finalTop = initialTop + dy;

            if (finalLeft < minLeft) finalLeft = minLeft;
            if (finalLeft > maxLeft) finalLeft = maxLeft;
            if (finalTop < minTop) finalTop = minTop;
            if (finalTop > maxTop) finalTop = maxTop;

            winEl.style.left = finalLeft + 'px';
            winEl.style.top = finalTop + 'px';
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                titleBar.style.cursor = '';
            }
        });
    };

    // 2.5 OLD-SCHOOL RESIZABLE WINDOW CONTROLLER
    const makeWindowResizable = (winEl) => {
        const dirs = ['n', 's', 'e', 'w', 'nw', 'ne', 'se', 'sw'];
        
        dirs.forEach(dir => {
            const handle = document.createElement('div');
            handle.className = `resize-handle resize-handle-${dir}`;
            winEl.appendChild(handle);
            
            handle.addEventListener('mousedown', (e) => {
                if (e.button !== 0) return;
                e.preventDefault();
                e.stopPropagation(); // Stop title bar dragging!
                
                // Bring window to front
                document.querySelectorAll('.win95-window').forEach(w => w.style.zIndex = '20');
                winEl.style.zIndex = '30';
                
                const startX = e.clientX;
                const startY = e.clientY;
                
                const startWidth = winEl.offsetWidth;
                const startHeight = winEl.offsetHeight;
                
                const rect = winEl.getBoundingClientRect();
                const parentRect = winEl.parentElement.getBoundingClientRect();
                const startLeft = rect.left - parentRect.left;
                const startTop = rect.top - parentRect.top;
                
                winEl.style.position = 'absolute';
                winEl.style.margin = '0';
                winEl.style.left = startLeft + 'px';
                winEl.style.top = startTop + 'px';
                
                const onMouseMove = (moveEvent) => {
                    const dx = moveEvent.clientX - startX;
                    const dy = moveEvent.clientY - startY;
                    
                    let newWidth = startWidth;
                    let newHeight = startHeight;
                    let newLeft = startLeft;
                    let newTop = startTop;
                    
                    const minWidth = 320;
                    const minHeight = 220;
                    const maxWidth = winEl.parentElement.clientWidth * 0.95;
                    const maxHeight = winEl.parentElement.clientHeight * 0.95;
                    
                    // Horizontal Resize
                    if (dir.includes('e')) {
                        newWidth = startWidth + dx;
                    } else if (dir.includes('w')) {
                        newWidth = startWidth - dx;
                        if (newWidth >= minWidth) {
                            newLeft = startLeft + dx;
                        }
                    }
                    
                    // Vertical Resize
                    if (dir.includes('s')) {
                        newHeight = startHeight + dy;
                    } else if (dir.includes('n')) {
                        newHeight = startHeight - dy;
                        if (newHeight >= minHeight) {
                            newTop = startTop + dy;
                        }
                    }
                    
                    // Boundary Clamp
                    if (newWidth < minWidth) newWidth = minWidth;
                    if (newHeight < minHeight) newHeight = minHeight;
                    if (newWidth > maxWidth) newWidth = maxWidth;
                    if (newHeight > maxHeight) newHeight = maxHeight;
                    
                    winEl.style.width = newWidth + 'px';
                    winEl.style.height = newHeight + 'px';
                    winEl.style.left = newLeft + 'px';
                    winEl.style.top = newTop + 'px';
                };
                
                const onMouseUp = () => {
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                };
                
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            });
        });
    };

    // Instantiate window controls
    const loginDialog = document.getElementById('login-dialog');
    const secureProgram = document.getElementById('secure-program');
    const internetProgram = document.getElementById('internet-program');

    // Drag-only for password dialogue modal
    makeWindowDraggable(loginDialog);

    // Draggable AND Resizable for programs (Explorer, Vault, and Spotify)
    makeWindowDraggable(secureProgram);
    makeWindowResizable(secureProgram);

    makeWindowDraggable(internetProgram);
    makeWindowResizable(internetProgram);

    const spotifyProg = document.getElementById('spotify-program');
    makeWindowDraggable(spotifyProg);
    makeWindowResizable(spotifyProg);


    // 3. TASKBAR MINIMIZE & RESTORE TABS
    const loginMinimizeBtn = document.getElementById('login-minimize-btn');
    const vaultMinimizeBtn = document.getElementById('vault-minimize-btn');
    const ieMinimizeBtn = document.getElementById('ie-minimize-btn');

    const taskTabLogin = document.getElementById('task-tab-login');
    const taskTabVault = document.getElementById('task-tab-vault');
    const taskTabInternet = document.getElementById('task-tab-internet');

    // Login Dialog Minimize Toggles
    const minimizeLogin = () => {
        loginDialog.classList.add('minimized');
        taskTabLogin.classList.remove('active');
    };
    const restoreLogin = () => {
        loginDialog.classList.remove('minimized');
        taskTabLogin.classList.add('active');
        document.querySelectorAll('.win95-window').forEach(w => w.style.zIndex = '20');
        loginDialog.style.zIndex = '30';
    };
    loginMinimizeBtn.addEventListener('click', minimizeLogin);
    taskTabLogin.addEventListener('click', () => {
        if (loginDialog.classList.contains('minimized') || !taskTabLogin.classList.contains('active')) {
            restoreLogin();
        } else {
            minimizeLogin();
        }
    });

    // Vault Program Minimize Toggles
    const minimizeVault = () => {
        secureProgram.classList.add('minimized');
        taskTabVault.classList.remove('active');
    };
    const restoreVault = () => {
        secureProgram.classList.remove('minimized');
        taskTabVault.classList.add('active');
        document.querySelectorAll('.win95-window').forEach(w => w.style.zIndex = '20');
        secureProgram.style.zIndex = '30';
    };
    if (vaultMinimizeBtn) vaultMinimizeBtn.addEventListener('click', minimizeVault);
    taskTabVault.addEventListener('click', () => {
        if (secureProgram.classList.contains('minimized') || !taskTabVault.classList.contains('active')) {
            restoreVault();
        } else {
            minimizeVault();
        }
    });

    // Internet Explorer Minimize Toggles
    const minimizeInternet = () => {
        internetProgram.classList.add('minimized');
        taskTabInternet.classList.remove('active');
    };
    const restoreInternet = () => {
        internetProgram.classList.remove('minimized');
        taskTabInternet.classList.add('active');
        document.querySelectorAll('.win95-window').forEach(w => w.style.zIndex = '20');
        internetProgram.style.zIndex = '30';
    };
    ieMinimizeBtn.addEventListener('click', minimizeInternet);
    taskTabInternet.addEventListener('click', () => {
        if (internetProgram.classList.contains('minimized') || !taskTabInternet.classList.contains('active')) {
            restoreInternet();
        } else {
            minimizeInternet();
        }
    });


    // 4. PERSISTENT ACCESS VAULT SESSION
    const loginScreen = document.getElementById('login-screen');
    const secureScreen = document.getElementById('secure-screen');
    
    const checkActiveSession = () => {
        const activeSession = sessionStorage.getItem('secure_session_token');
        if (activeSession === SESSION_SECRET_HASH) {
            loginScreen.classList.remove('active');
            secureScreen.classList.add('active');
            
            taskTabLogin.style.display = 'none';
            taskTabVault.style.display = 'flex';
            taskTabVault.classList.add('active');
        }
    };
    checkActiveSession();


    // 5. REVEAL PASSWORD TOGGLE
    const passToggle = document.getElementById('pass-toggle');
    const passwordInput = document.getElementById('password');
    passToggle.addEventListener('click', () => {
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            passToggle.textContent = 'Hide';
        } else {
            passwordInput.type = 'password';
            passToggle.textContent = 'Reveal';
        }
    });


    // 6. PASSWORD FORM DECRYPTION FLOW
    const loginForm = document.getElementById('vault-login-form');
    const usernameInput = document.getElementById('username');
    const spinner = document.getElementById('login-spinner');
    const submitBtn = document.getElementById('login-submit-btn');
    const statusBannerText = document.getElementById('status-banner-text');
    const attemptCountEl = document.getElementById('attempt-count');

    let remainingAttempts = 5;
    let lockoutTimer = null;
    let lockoutRemaining = 0;

    const startLockoutTimer = (durationSeconds) => {
        lockoutRemaining = durationSeconds;
        usernameInput.disabled = true;
        passwordInput.disabled = true;
        submitBtn.disabled = true;
        statusBannerText.style.color = 'var(--red)';
        
        lockoutTimer = setInterval(() => {
            lockoutRemaining--;
            if (lockoutRemaining <= 0) {
                clearInterval(lockoutTimer);
                resetLockout();
            } else {
                statusBannerText.textContent = `SYSTEM LOCK ACTIVE. RETRY IN ${lockoutRemaining}s`;
            }
        }, 1000);
    };

    const resetLockout = () => {
        usernameInput.disabled = false;
        passwordInput.disabled = false;
        submitBtn.disabled = false;
        remainingAttempts = 5;
        attemptCountEl.textContent = remainingAttempts;
        statusBannerText.style.color = '';
        statusBannerText.textContent = 'Status: Connection established. Waiting for login...';
    };

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (lockoutRemaining > 0) return;

        const enteredUser = usernameInput.value.trim();
        const enteredPass = passwordInput.value.trim();

        if (!enteredUser || !enteredPass) return;

        usernameInput.disabled = true;
        passwordInput.disabled = true;
        submitBtn.disabled = true;
        spinner.style.display = 'inline-block';
        statusBannerText.textContent = 'Status: Validating decrypter signatures...';
        
        setTimeout(async () => {
            try {
                const hashedUser = await computeSHA256(enteredUser);
                const hashedPass = await computeSHA256(enteredPass);

                if (hashedUser === CORRECT_USER_HASH && hashedPass === CORRECT_PASS_HASH) {
                    statusBannerText.style.color = 'var(--emerald)';
                    statusBannerText.textContent = 'Status: Decryption successful. Booting shell...';
                    
                    const avatarFrame = document.querySelector('.pixel-padlock-container');
                    if (avatarFrame) {
                        avatarFrame.style.borderColor = 'var(--emerald)';
                    }

                    sessionStorage.setItem('secure_session_token', SESSION_SECRET_HASH);

                    setTimeout(() => {
                        loginScreen.classList.remove('active');
                        secureScreen.classList.add('active');
                        
                        taskTabLogin.style.display = 'none';
                        taskTabVault.style.display = 'flex';
                        taskTabVault.classList.add('active');
                        
                        usernameInput.value = '';
                        passwordInput.value = '';
                        spinner.style.display = 'none';
                    }, 1000);

                } else {
                    remainingAttempts--;
                    attemptCountEl.textContent = remainingAttempts;
                    
                    loginDialog.classList.add('error-shake');
                    statusBannerText.style.color = 'var(--red)';
                    statusBannerText.textContent = 'Error: Invalid identifier or password.';
                    
                    usernameInput.style.backgroundColor = '#401515';
                    passwordInput.style.backgroundColor = '#401515';

                    setTimeout(() => {
                        loginDialog.classList.remove('error-shake');
                        usernameInput.style.backgroundColor = '';
                        passwordInput.style.backgroundColor = '';
                        
                        usernameInput.disabled = false;
                        passwordInput.disabled = false;
                        submitBtn.disabled = false;
                        spinner.style.display = 'none';
                        passwordInput.value = '';
                        passwordInput.focus();

                        if (remainingAttempts <= 0) {
                            startLockoutTimer(30);
                        }
                    }, 400);
                }
            } catch (err) {
                statusBannerText.textContent = 'Error: Cryptographic exception caught.';
                usernameInput.disabled = false;
                passwordInput.disabled = false;
                submitBtn.disabled = false;
                spinner.style.display = 'none';
            }
        }, 800);
    });

    // Logout
    const performLogout = () => {
        sessionStorage.removeItem('secure_session_token');
        
        const avatarFrame = document.querySelector('.pixel-padlock-container');
        if (avatarFrame) {
            avatarFrame.style.borderColor = '';
        }
        
        secureScreen.classList.remove('active');
        loginScreen.classList.add('active');
        
        taskTabVault.style.display = 'none';
        taskTabLogin.style.display = 'flex';
        taskTabLogin.classList.add('active');

        // Reset positions
        loginDialog.style.position = '';
        loginDialog.style.left = '';
        loginDialog.style.top = '';
        loginDialog.style.margin = '';
        
        secureProgram.style.position = '';
        secureProgram.style.left = '';
        secureProgram.style.top = '';
        secureProgram.style.margin = '';
        
        resetLockout();
    };

    const logoutTrigger = document.getElementById('logout-trigger');
    const menuLogout = document.getElementById('menu-logout');
    if (logoutTrigger) logoutTrigger.addEventListener('click', performLogout);
    if (menuLogout) menuLogout.addEventListener('click', performLogout);


    // 7. TASKBAR "HIDE" BUTTON (Minimizes/Restores all windows)
    const hideBtn = document.getElementById('hide-btn');
    if (hideBtn) {
        hideBtn.addEventListener('click', () => {
            const openWindows = [];
            if (loginScreen.classList.contains('active')) {
                openWindows.push({ el: loginDialog, tab: taskTabLogin });
            }
            if (secureScreen.classList.contains('active')) {
                openWindows.push({ el: secureProgram, tab: taskTabVault });
            }
            if (internetScreen.classList.contains('active')) {
                openWindows.push({ el: internetProgram, tab: taskTabInternet });
            }
            
            const anyVisible = openWindows.some(w => !w.el.classList.contains('minimized'));

            if (anyVisible) {
                // Minimize all open windows
                openWindows.forEach(w => {
                    w.el.classList.add('minimized');
                    w.tab.classList.remove('active');
                });
                hideBtn.classList.add('active');
            } else {
                // Restore all open windows
                openWindows.forEach(w => {
                    w.el.classList.remove('minimized');
                    w.tab.classList.add('active');
                });
                hideBtn.classList.remove('active');
            }
        });
    }


    // 8. AMMAN JORDAN TIME & VIRTUAL 2012/8/7 DATE TRAY CLOCK
    const updateTrayClock = () => {
        const trayTime = document.getElementById('tray-time');
        const trayDate = document.getElementById('tray-date');
        
        const now = new Date();
        
        // Calculate Amman, Jordan (UTC+3)
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        const ammanTime = new Date(utc + (3600000 * 3));
        
        // Time HH:MM AM/PM
        let hours = ammanTime.getHours();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        const minutes = String(ammanTime.getMinutes()).padStart(2, '0');
        const timeStr = `${hours}:${minutes} ${ampm}`;
        
        // Calculate virtual old date
        const virtualTime = new Date(now.getTime() - dateOffset);
        const year = virtualTime.getFullYear();
        const month = virtualTime.getMonth() + 1;
        const day = virtualTime.getDate();
        const dateStr = `${year}/${month}/${day}`;
        
        if (trayTime) trayTime.textContent = timeStr;
        if (trayDate) trayDate.textContent = dateStr;
    };
    setInterval(updateTrayClock, 1000);
    updateTrayClock();


    // 9. INTERNET EXPLORER DYNAMIC RETRO NAVIGATION ENGINE
    const iconExplorer = document.getElementById('icon-explorer');
    const internetScreen = document.getElementById('internet-screen');
    const ieCloseBtn = document.getElementById('ie-close-btn');
    const ieMenuClose = document.getElementById('ie-menu-close');
    const ieHomeBtn = document.getElementById('ie-home-btn');
    const ieAddressBar = document.getElementById('ie-address-bar');
    const ieGoBtn = document.getElementById('ie-go-btn');
    
    const ieBackBtn = document.getElementById('ie-back-btn');
    const ieForwardBtn = document.getElementById('ie-forward-btn');
    const ieStopBtn = document.getElementById('ie-stop-btn');
    const ieRefreshBtn = document.getElementById('ie-refresh-btn');
    const ieSearchBtn = document.getElementById('ie-search-btn');
    const ieLogoSpinner = document.getElementById('ie-logo-spinner');
    
    const ieViewport = document.getElementById('ie-viewport');
    const ieLoadingOverlay = document.getElementById('ie-loading-overlay');
    const ieProgressFill = document.getElementById('ie-progress-fill');
    const ieWebpageContainer = document.getElementById('ie-webpage-container');

    // Navigation History States
    let historyStack = ['home.htm'];
    let historyIndex = 0;
    let loadingTimeout = null;

    // Local Storage persistent visitor counter
    let visitorCount = localStorage.getItem('visitor_count');
    if (!visitorCount) {
        visitorCount = 1337;
        localStorage.setItem('visitor_count', visitorCount);
    }
    visitorCount = parseInt(visitorCount) + 1;
    localStorage.setItem('visitor_count', visitorCount);

    const padZero = (num, size) => {
        let s = num + "";
        while (s.length < size) s = "0" + s;
        return s;
    };

    // Virtual Pages Templates Dictionary
    const getPageTemplate = (url) => {
        switch (url) {
            case 'home.htm':
            case 'portfolio.htm':
                return `
                    <marquee class="font-mono" style="color: #ffffff; font-size: 11px; margin-bottom: 8px; font-weight: bold; background: #17191e; padding: 2px;">
                        *** WELCOME TO OMAR ALZR'S PERSONAL CS SECTOR -- NOW FEATURING 100% PROCEDURAL STABILITY ***
                    </marquee>
                    <header class="web-header">
                        <h1 class="web-title">OMAR ALZR</h1>
                        <p class="web-subtitle">Academic CS Database // Volqan-Terminal Node</p>
                    </header>
                    
                    <div class="web-content-block">

                        <div class="web-panel-group">
                            <h3 class="panel-section-title font-mono">[ 01_BIOGRAPHY ]</h3>
                            <div class="panel-section-body">
                                <p class="web-body-p">
                                    I am currently enrolled as a Bachelor of Science student in the **Computer Science** department at **Middle East University** in Amman, Jordan.
                                </p>
                                <p class="web-body-p" style="margin-top: 6px;">
                                    My primary software research resides inside standard procedural flow control and object-oriented inheritance frameworks. I focus on building highly optimal code blocks and algorithmic procedures.
                                </p>
                            </div>
                        </div>

                        <div class="web-panel-group">
                            <h3 class="panel-section-title font-mono">[ CONNECT ]</h3>
                            <div class="panel-section-body social-links-row">
                                <a href="https://www.instagram.com/voloqan/" target="_blank" class="social-link-btn" title="Instagram">
                                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                                    <span>@voloqan</span>
                                </a>
                                <a href="https://github.com/zenjiwatt" target="_blank" class="social-link-btn" title="GitHub">
                                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                                    <span>zenjiwatt</span>
                                </a>
                                <a href="https://www.linkedin.com/in/omar-alzr-192aa33b5/" target="_blank" class="social-link-btn" title="LinkedIn">
                                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                                    <span>Omar Alzr</span>
                                </a>
                            </div>
                        </div>

                        <div class="web-panel-group">
                            <h3 class="panel-section-title font-mono">[ QUICK NAVIGATION ]</h3>
                            <div class="panel-section-body" style="display: flex; flex-direction: column; gap: 6px;">
                                <a href="javascript:void(0);" onclick="window.ieNavigate('skills.htm')" class="ie-web-link">→ View Technical Skillset Matrix (Java, OOP, Classes)</a>
                                <a href="javascript:void(0);" onclick="window.ieNavigate('projects.htm')" class="ie-web-link">→ View Sandbox Repositories (Runnable Stubs)</a>
                                <a href="javascript:void(0);" onclick="window.ieNavigate('guestbook.htm')" class="ie-web-link">→ Sign the Vintage Guestbook Portal</a>
                            </div>
                        </div>

                        <div class="badge-row">
                            <img src="https://www.angelfire.com/goth/gothikgrrl/netscape2.gif" alt="Netscape Optimized" onerror="this.style.display='none'">
                            <img src="https://win98icons.alexmeub.com/images/ie-animated.gif" alt="IE Animated" style="height: 31px;" onerror="this.style.display='none'">
                        </div>
                    </div>
                `;
            case 'skills.htm':
                return `
                    <header class="web-header">
                        <h1 class="web-title">TECHNICAL SKILLS</h1>
                        <p class="web-subtitle">http://www.volqan.me/skills.htm</p>
                    </header>
                    
                    <div class="web-content-block">
                        <div class="web-panel-group">
                            <h3 class="panel-section-title font-mono">[ PRIMARY_LANGUAGE: JAVA ]</h3>
                            <div class="panel-section-body">
                                <table class="web-dossier-table font-mono">
                                    <tr>
                                        <th>OOP PRINCIPLES:</th>
                                        <td class="text-emerald">Classes, Objects, Inheritance, Polymorphism</td>
                                    </tr>
                                    <tr>
                                        <th>FLOW CONTROL:</th>
                                        <td class="text-emerald">Standard loops, recursive solvers, conditional logic</td>
                                    </tr>
                                    <tr>
                                        <th>DATA VERIFICATION:</th>
                                        <td class="text-emerald">Exception handlers (NullPointer exceptions protection)</td>
                                    </tr>
                                </table>
                            </div>
                        </div>

                        <div class="web-panel-group">
                            <h3 class="panel-section-title font-mono">[ ADDITIONAL STUB ARRAYS ]</h3>
                            <div class="panel-section-body">
                                <table class="web-dossier-table font-mono">
                                    <tr>
                                        <th>DATABASES:</th>
                                        <td class="text-muted">[IN PROGRESS - CS CURRICULUM SYLLABUS]</td>
                                    </tr>
                                    <tr>
                                        <th>WEB_DEVELOPMENT:</th>
                                        <td class="text-muted">[IN PROGRESS - SANDBOX EXPERIMENTING]</td>
                                    </tr>
                                </table>
                            </div>
                        </div>

                        <div style="margin-top: 8px;">
                            <a href="javascript:void(0);" onclick="window.ieNavigate('home.htm')" class="ie-web-link">← Return to Homepage</a>
                        </div>
                    </div>
                `;
            case 'projects.htm':
                return `
                    <header class="web-header">
                        <h1 class="web-title">RUNNABLE PROJECTS</h1>
                        <p class="web-subtitle">Click files to compile and run them inside our virtual terminal!</p>
                    </header>
                    
                    <div class="web-content-block">
                        <div class="web-panel-group">
                            <h3 class="panel-section-title font-mono">[ DIRECTORY LISTING: C:\\OMAR\\SANDBOX\\ ]</h3>
                            <div class="panel-section-body">
                                <ul class="web-bullets font-mono" style="list-style: none; margin-left: 0; padding-left: 0;">
                                    <li style="margin-bottom: 10px;">
                                        <button class="win95-btn" onclick="window.runSandboxProject('hello')" style="display: inline-flex; height: 22px;">☕ Run HelloWorld.java</button>
                                        <span style="font-size: 9.5px; opacity: 0.8; margin-left: 6px;">Simple procedural stdout validation</span>
                                    </li>
                                    <li style="margin-bottom: 10px;">
                                        <button class="win95-btn" onclick="window.runSandboxProject('fib')" style="display: inline-flex; height: 22px;">☕ Run RecursiveFibonacci.java</button>
                                        <span style="font-size: 9.5px; opacity: 0.8; margin-left: 6px;">Algorithmic sequence iteration test</span>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        <div class="web-search-box" style="margin-top: 8px;">
                            <label class="font-mono">SIMULATED TERMINAL OUTPUT CONTAINER:</label>
                            <div class="secure-crt-screen" id="sandbox-console" style="height: 140px; min-height: 140px; margin-top: 6px; padding: 8px; font-size: 10px; background-color:#050709;">
                                <div class="font-mono" style="color:var(--crt-green);" id="sandbox-console-logs">
                                    > Select a compilation stub from the array above to run...
                                </div>
                            </div>
                        </div>

                        <div style="margin-top: 8px;">
                            <a href="javascript:void(0);" onclick="window.ieNavigate('home.htm')" class="ie-web-link">← Return to Homepage</a>
                        </div>
                    </div>
                `;
            case 'guestbook.htm':
                return `
                    <header class="web-header">
                        <h1 class="web-title">VINTAGE GUESTBOOK</h1>
                        <p class="web-subtitle">Leave a trace of your connection in Omar Alzr's persistent logbank</p>
                    </header>
                    
                    <div class="web-content-block">
                        <div class="web-panel-group">
                            <h3 class="panel-section-title font-mono">[ SIGN SIGNATURE PORTAL ]</h3>
                            <div class="panel-section-body">
                                <form id="guestbook-form" onsubmit="window.submitGuestbookSignature(event);">
                                    <div class="guestbook-form-group">
                                        <label for="gb-name">Your Nickname:</label>
                                        <input type="text" id="gb-name" required placeholder="e.g. Megabyte_95">
                                    </div>
                                    <div class="guestbook-form-group">
                                        <label for="gb-message">Secure Message:</label>
                                        <textarea id="gb-message" required placeholder="Leave a nostalgic comment..."></textarea>
                                    </div>
                                    <button type="submit" class="win95-btn" style="height: 22px; width: 100px; margin-top: 6px;">Sign Registry</button>
                                </form>
                            </div>
                        </div>

                        <div class="web-panel-group">
                            <h3 class="panel-section-title font-mono">[ PERSISTENT USER CONNECTIONS REGISTERED ]</h3>
                            <div class="panel-section-body guestbook-logs" id="guestbook-logs-container">
                                <!-- Appended dynamically -->
                            </div>
                        </div>

                        <div style="margin-top: 8px;">
                            <a href="javascript:void(0);" onclick="window.ieNavigate('home.htm')" class="ie-web-link">← Return to Homepage</a>
                        </div>
                    </div>
                `;
            default:
                return `
                    <div style="padding: 30px; text-align: center;">
                        <h2 style="color:var(--red);" class="font-mono">HTTP 404 - FILE NOT FOUND</h2>
                        <hr style="border-top:1px dashed var(--win-gray-light); margin: 12px 0;">
                        <p style="font-size:11px;">The request target "${url}" does not exist in Middle East University's CS host array.</p>
                        <button class="win95-btn" onclick="window.ieNavigate('home.htm')" style="margin: 16px auto 0 auto; height: 22px;">Back to Home</button>
                    </div>
                `;
        }
    };

    // Render guestbook lists
    const renderGuestbookLogs = () => {
        const logsContainer = document.getElementById('guestbook-logs-container');
        if (!logsContainer) return;

        let entries = JSON.parse(localStorage.getItem('guestbook_entries') || '[]');
        
        // Seed initial mock entries if empty
        if (entries.length === 0) {
            entries = [
                { name: "admin_volqan", date: "2012/08/07 19:54", message: "Middle East University local databank registry initialized. Status is secure." },
                { name: "Megabyte_W95", date: "2012/08/12 12:44", message: "This CRT screen simulation is extremely clean! Resizing actually functions!" }
            ];
            localStorage.setItem('guestbook_entries', JSON.stringify(entries));
        }

        logsContainer.innerHTML = entries.map(item => `
            <div class="guestbook-post font-mono">
                <div class="guestbook-header">
                    <span style="font-weight: bold; color: var(--cyan);">${item.name}</span>
                    <span>${item.date}</span>
                </div>
                <div class="guestbook-message">${item.message}</div>
            </div>
        `).reverse().join('');
    };

    // Expose Guestbook Submit Handler to window global context
    window.submitGuestbookSignature = (event) => {
        event.preventDefault();
        const nameInput = document.getElementById('gb-name');
        const msgInput = document.getElementById('gb-message');
        if (!nameInput || !msgInput) return;

        const name = nameInput.value.trim();
        const message = msgInput.value.trim();
        if (!name || !message) return;

        // Amman date stamp calculation
        const now = new Date();
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        const ammanTime = new Date(utc + (3600000 * 3));
        const virtualTime = new Date(ammanTime.getTime() - dateOffset);
        
        const year = virtualTime.getFullYear();
        const month = String(virtualTime.getMonth() + 1).padStart(2, '0');
        const day = String(virtualTime.getDate()).padStart(2, '0');
        const hr = String(virtualTime.getHours()).padStart(2, '0');
        const min = String(virtualTime.getMinutes()).padStart(2, '0');
        
        const dateStr = `${year}/${month}/${day} ${hr}:${min}`;

        const entries = JSON.parse(localStorage.getItem('guestbook_entries') || '[]');
        entries.push({ name, date: dateStr, message });
        localStorage.setItem('guestbook_entries', JSON.stringify(entries));

        // Wipe inputs and refresh logs render
        nameInput.value = '';
        msgInput.value = '';
        renderGuestbookLogs();
        alert("Signature saved! Your connection has been persistently logged in local storage.");
    };

    // Expose Runnable Sandbox Compilation handler
    window.runSandboxProject = (projType) => {
        const consoleLogs = document.getElementById('sandbox-console-logs');
        if (!consoleLogs) return;

        consoleLogs.innerHTML = `> javac ${projType === 'hello' ? 'HelloWorld.java' : 'RecursiveFibonacci.java'}<br>> COMPILING SOURCE CODE FILES...`;
        
        setTimeout(() => {
            if (projType === 'hello') {
                consoleLogs.innerHTML = `
                    > javac HelloWorld.java -- SUCCESS<br>
                    > java HelloWorld<br>
                    Hello, World! volqan secure node active.<br>
                    Process terminated with exit code 0.<br>
                    > _
                `;
            } else {
                consoleLogs.innerHTML = `
                    > javac RecursiveFibonacci.java -- SUCCESS<br>
                    > java RecursiveFibonacci 8<br>
                    Calculating Fib(8) recursively...<br>
                    Fibonacci sequence: 0, 1, 1, 2, 3, 5, 8, 13, 21<br>
                    Process terminated with exit code 0.<br>
                    > _
                `;
            }
        }, 800);
    };

    // Dynamic Swapping Page Router with Progress Bar loader
    const navigateToPage = (url, skipHistory = false) => {
        if (loadingTimeout) clearTimeout(loadingTimeout);

        // Spin IE Logo and show Loading Overlay
        ieLogoSpinner.classList.add('spinning');
        ieLoadingOverlay.style.display = 'flex';
        ieProgressFill.style.width = '0%';
        ieAddressBar.value = `http://www.volqan.me/${url}`;

        // Disable Address bar controls while busy
        ieGoBtn.disabled = true;
        ieAddressBar.disabled = true;

        // Animate progress bar fill over 600ms
        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += 10;
            ieProgressFill.style.width = `${progress}%`;
            if (progress >= 100) {
                clearInterval(progressInterval);
            }
        }, 50);

        loadingTimeout = setTimeout(() => {
            // Render target template into webpage container
            ieWebpageContainer.innerHTML = getPageTemplate(url);

            // Execute scripts or sub-renders if relevant
            if (url === 'guestbook.htm') {
                renderGuestbookLogs();
            }

            // Stop animations and hide loaders
            ieLogoSpinner.classList.remove('spinning');
            ieLoadingOverlay.style.display = 'none';
            ieGoBtn.disabled = false;
            ieAddressBar.disabled = false;

            // Manage history pointer
            if (!skipHistory) {
                // Wipe any forward history branches if we navigate away
                historyStack = historyStack.slice(0, historyIndex + 1);
                historyStack.push(url);
                historyIndex = historyStack.length - 1;
            }

            updateHistoryButtons();
        }, 700);
    };

    // Expose to window global context so HTML anchor targets can call it
    window.ieNavigate = (url) => {
        navigateToPage(url);
    };

    const updateHistoryButtons = () => {
        ieBackBtn.disabled = historyIndex === 0;
        ieForwardBtn.disabled = historyIndex === historyStack.length - 1;
    };

    // Register Tool Strip Events
    ieBackBtn.addEventListener('click', () => {
        if (historyIndex > 0) {
            historyIndex--;
            navigateToPage(historyStack[historyIndex], true);
        }
    });

    ieForwardBtn.addEventListener('click', () => {
        if (historyIndex < historyStack.length - 1) {
            historyIndex++;
            navigateToPage(historyStack[historyIndex], true);
        }
    });

    ieStopBtn.addEventListener('click', () => {
        if (loadingTimeout) {
            clearTimeout(loadingTimeout);
            ieLogoSpinner.classList.remove('spinning');
            ieLoadingOverlay.style.display = 'none';
            ieGoBtn.disabled = false;
            ieAddressBar.disabled = false;
            alert("Loading operation aborted by client.");
        }
    });

    ieRefreshBtn.addEventListener('click', () => {
        navigateToPage(historyStack[historyIndex], true);
    });

    ieHomeBtn.addEventListener('click', () => {
        navigateToPage('home.htm');
    });

    ieSearchBtn.addEventListener('click', () => {
        navigateToPage('projects.htm');
    });

    // Go Button and Address Bar Keypress listeners
    const handleAddressGo = () => {
        const addr = ieAddressBar.value.trim().toLowerCase();
        let targetPage = 'home.htm';

        // 🥚 EASTER EGG: dih.exe
        if (addr.includes('pornhub') || addr.includes('porn')) {
            triggerDihExe();
            return;
        }

        if (addr.includes('skills')) {
            targetPage = 'skills.htm';
        } else if (addr.includes('projects') || addr.includes('sandbox')) {
            targetPage = 'projects.htm';
        } else if (addr.includes('guestbook') || addr.includes('sign')) {
            targetPage = 'guestbook.htm';
        } else if (addr.includes('home') || addr.includes('index') || addr.includes('portfolio')) {
            targetPage = 'home.htm';
        } else {
            // Standard search index mapping if typing query terms
            targetPage = 'unknown.htm';
        }
        navigateToPage(targetPage);
    };

    ieGoBtn.addEventListener('click', handleAddressGo);
    ieAddressBar.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleAddressGo();
        }
    });

    const openInternet = () => {
        internetScreen.classList.add('active');
        internetProgram.classList.remove('minimized');
        taskTabInternet.style.display = 'flex';
        taskTabInternet.classList.add('active');
        document.querySelectorAll('.win95-window').forEach(w => w.style.zIndex = '20');
        internetProgram.style.zIndex = '30';

        // Load home page initially
        navigateToPage('home.htm', true);
    };

    const closeInternet = () => {
        internetScreen.classList.remove('active');
        taskTabInternet.style.display = 'none';
        
        // Reset absolute coordinates
        internetProgram.style.position = '';
        internetProgram.style.left = '';
        internetProgram.style.top = '';
        internetProgram.style.margin = '';
    };

    if (iconExplorer) {
        // Support both single click and double click for retro shortcuts!
        iconExplorer.addEventListener('click', openInternet);
        iconExplorer.addEventListener('dblclick', openInternet);
    }
    if (ieCloseBtn) ieCloseBtn.addEventListener('click', closeInternet);
    if (ieMenuClose) ieMenuClose.addEventListener('click', closeInternet);


    // ========================================================
    // 9.5 WINDOW MAXIMIZE & RESTORE TOGGLERS
    // ========================================================
    const makeWindowMaximizable = (winEl, maxBtnId) => {
        const maxBtn = document.getElementById(maxBtnId);
        if (!maxBtn) return;

        let isMaximized = false;
        let prevLeft, prevTop, prevWidth, prevHeight;

        maxBtn.addEventListener('click', () => {
            isMaximized = !isMaximized;
            if (isMaximized) {
                // Save coordinates before expanding
                prevLeft = winEl.style.left;
                prevTop = winEl.style.top;
                prevWidth = winEl.style.width;
                prevHeight = winEl.style.height;

                winEl.classList.add('maximized');
                maxBtn.textContent = '❐'; // W95 Double box restore symbol
                maxBtn.title = 'Restore Window';
            } else {
                winEl.classList.remove('maximized');
                winEl.style.left = prevLeft;
                winEl.style.top = prevTop;
                winEl.style.width = prevWidth;
                winEl.style.height = prevHeight;
                maxBtn.textContent = '■';
                maxBtn.title = 'Maximize Window';
            }
        });
    };

    makeWindowMaximizable(secureProgram, 'vault-maximize-btn');
    makeWindowMaximizable(internetProgram, 'ie-maximize-btn');
    makeWindowMaximizable(document.getElementById('spotify-program'), 'spotify-maximize-btn');


    // ========================================================
    // 10. SPOTIFY RETRO PLAYER ENGINE (SYNTHETIC WEB AUDIO)
    // ========================================================
    const iconSpotify = document.getElementById('icon-spotify');
    const spotifyScreen = document.getElementById('spotify-screen');
    const spotifyProgram = document.getElementById('spotify-program');
    const spotifyMinimizeBtn = document.getElementById('spotify-minimize-btn');
    const spotifyCloseBtn = document.getElementById('spotify-close-btn');
    const taskTabSpotify = document.getElementById('task-tab-spotify');

    const waPlay = document.getElementById('wa-play');
    const waPause = document.getElementById('wa-pause');
    const waStop = document.getElementById('wa-stop');
    const waPrev = document.getElementById('wa-prev');
    const waNext = document.getElementById('wa-next');
    const waVolume = document.getElementById('wa-volume');
    const waTrackProgress = document.getElementById('wa-track-progress');
    const waTimeDisplay = document.getElementById('wa-time-display');
    const waMarqueeText = document.getElementById('wa-marquee-text');
    const waPlaylistList = document.getElementById('wa-playlist-list');
    const spotifyStatusText = document.getElementById('spotify-status-text');
    const waVinylDisc = document.getElementById('wa-vinyl-disc');

    let audioCtx = null;
    let analyser = null;
    let isPlaying = false;
    let currentTrackIndex = 0;
    let trackTime = 0;
    let playerInterval = null;
    let synthNotesInterval = null;
    let visualizerAnimation = null;

    // Single HTML5 Audio Element for playing local MP3s
    const localAudio = new Audio();
    let localAudioSource = null;

    const tracks = [];

    const initAudio = () => {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioCtx.createAnalyser();
            analyser.fftSize = 64; // Small fftSize for 8 visualizer bars
            analyser.connect(audioCtx.destination);
        }
    };

    const connectLocalAudio = () => {
        if (!localAudioSource && audioCtx) {
            localAudioSource = audioCtx.createMediaElementSource(localAudio);
            localAudioSource.connect(analyser);
        }
    };

    const playProceduralTone = (freq, duration) => {
        if (!audioCtx || audioCtx.state === 'suspended') return;
        
        try {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            
            osc.type = currentTrackIndex === 0 ? 'square' : currentTrackIndex === 1 ? 'sawtooth' : 'triangle';
            osc.frequency.value = freq;
            
            const volValue = parseInt(waVolume.value) / 250; // soft volume ceiling
            gain.gain.setValueAtTime(volValue, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
            
            osc.connect(gain);
            gain.connect(analyser); // connect to our real analyser!
            
            osc.start();
            osc.stop(audioCtx.currentTime + duration);
        } catch (e) {
            console.error("Audio error", e);
        }
    };

    // Smooth spectrum visualizer loop
    const drawVisualizer = () => {
        if (!isPlaying) return;
        
        const specBars = document.querySelectorAll('.winamp-spectrum-bar');
        if (specBars.length > 0 && analyser) {
            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            analyser.getByteFrequencyData(dataArray);
            
            specBars.forEach((bar, idx) => {
                const dataIdx = Math.floor((idx / specBars.length) * bufferLength);
                const val = dataArray[dataIdx] || 0;
                // Scale value (0-255) to classic bar height (max 26px)
                const h = Math.max(3, Math.floor((val / 255) * 26));
                bar.style.height = `${h}px`;
            });
        }
        
        visualizerAnimation = requestAnimationFrame(drawVisualizer);
    };

    // Generate a beautiful unique HSL gradient based on the hash of the song's name as a procedural cover art fallback
    const getProceduralCover = (songName) => {
        let hash = 0;
        for (let i = 0; i < songName.length; i++) {
            hash = songName.charCodeAt(i) + ((hash << 5) - hash);
        }
        const hue1 = Math.abs(hash % 360);
        const hue2 = (hue1 + 120) % 360;
        return `radial-gradient(circle, hsl(${hue1}, 80%, 45%) 10%, hsl(${hue2}, 95%, 15%) 100%)`;
    };

    const startSynthPlayback = () => {
        if (tracks.length === 0) {
            spotifyStatusText.textContent = "Status: Playlist empty. Load tracks!";
            alert("Your playlist is currently empty. Click '+ Add Folder' or '+ Add MP3' to select files!");
            return;
        }

        initAudio();
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        
        isPlaying = true;
        waPlay.style.backgroundColor = 'var(--win-gray-dark)';
        waPlay.style.color = '#10b981';
        
        const track = tracks[currentTrackIndex];
        spotifyStatusText.textContent = `Status: Playing track ${currentTrackIndex + 1}...`;
        
        if (waVinylDisc) {
            waVinylDisc.classList.add('spinning');
            if (track.coverUrl) {
                waVinylDisc.style.backgroundImage = `url(${track.coverUrl})`;
            } else {
                waVinylDisc.style.backgroundImage = getProceduralCover(track.name);
            }
        }
        if (visualizerAnimation) cancelAnimationFrame(visualizerAnimation);
        drawVisualizer();
        
        if (track.isLocal) {
            // Local MP3 Playback
            connectLocalAudio();
            localAudio.src = track.fileUrl;
            localAudio.volume = parseInt(waVolume.value) / 100;
            localAudio.currentTime = trackTime;
            // Listen for loading errors (like browser CORS blocks when opened via file:// protocol)
            const handleLoadError = (e) => {
                console.error("Local file loading error / blocked by CORS policy:", e);
                
                if (window.location.protocol === 'file:') {
                    alert(
                        "🔒 BROWSER SECURITY NOTICE\n\n" +
                        "Because you opened Volqan OS directly via a double-clicked file:// index.html, modern browsers block loading local default folder files (CORS security constraint).\n\n" +
                        "TO RESOLVE THIS:\n" +
                        "1. Simply click the '+ Add MP3' button or use 'File -> Open' and select your songs manually! (Fully supported!)\n" +
                        "OR\n" +
                        "2. Double-click the newly created 'run_server.bat' script in your 'volqan' directory to host it on a local HTTP server where relative defaults load instantly!"
                    );
                } else {
                    alert("Error: Failed to load default audio track. Please verify your files inside the /music folder.");
                }
                stopSynthPlayback();
            };
            localAudio.addEventListener('error', handleLoadError, { once: true });

            // Listen for metadata loading to dynamically extract the actual duration!
            const handleMetadata = () => {
                track.duration = Math.floor(localAudio.duration);
                localAudio.removeEventListener('error', handleLoadError);
                
                // Dynamically update the playlist item's text duration in the playlist block!
                const playlistItems = document.querySelectorAll('.wa-playlist-item');
                const item = playlistItems[currentTrackIndex];
                if (item) {
                    const mins = Math.floor(track.duration / 60);
                    const secs = String(track.duration % 60).padStart(2, '0');
                    item.textContent = `${currentTrackIndex + 1}. ${track.name} (${mins}:${secs})`;
                }
            };
            localAudio.addEventListener('loadedmetadata', handleMetadata, { once: true });
            
            localAudio.play().catch(err => {
                console.error("Playback error", err);
                spotifyStatusText.textContent = `Status: Playback blocked by browser policy.`;
            });
            
            waMarqueeText.innerHTML = `<marquee scrollamount="2">PLAYING LOCAL MP3: ${track.name} -- SYSTEM GRAPHICS ACTIVE --</marquee>`;
            
            playerInterval = setInterval(() => {
                trackTime = Math.floor(localAudio.currentTime);
                waTrackProgress.value = (trackTime / track.duration) * 100;
                
                const mins = String(Math.floor(trackTime / 60)).padStart(2, '0');
                const secs = String(trackTime % 60).padStart(2, '0');
                waTimeDisplay.textContent = `${mins}:${secs}`;
                
                if (localAudio.ended) {
                    playNextTrack();
                }
            }, 500);
            
        } else {
            // Procedural Chiptunes Playback
            waMarqueeText.innerHTML = `<marquee scrollamount="2">PLAYING: ${track.name} -- PROCEDURAL CHIPTUNE STREAMS ACTIVE --</marquee>`;
            
            playerInterval = setInterval(() => {
                trackTime++;
                waTrackProgress.value = (trackTime / track.duration) * 100;
                
                const mins = String(Math.floor(trackTime / 60)).padStart(2, '0');
                const secs = String(trackTime % 60).padStart(2, '0');
                waTimeDisplay.textContent = `${mins}:${secs}`;
                
                if (trackTime >= track.duration) {
                    playNextTrack();
                }
            }, 1000);
            
            let notePointer = 0;
            synthNotesInterval = setInterval(() => {
                const trackNotes = track.notes;
                const note = trackNotes[notePointer];
                playProceduralTone(note, 0.22);
                notePointer = (notePointer + 1) % trackNotes.length;
            }, 250);
        }
    };

    const stopSynthPlayback = (paused = false) => {
        isPlaying = false;
        waPlay.style.backgroundColor = '';
        waPlay.style.color = '';
        if (playerInterval) clearInterval(playerInterval);
        if (synthNotesInterval) clearInterval(synthNotesInterval);
        if (visualizerAnimation) cancelAnimationFrame(visualizerAnimation);
        
        localAudio.pause();
        
        if (waVinylDisc) waVinylDisc.classList.remove('spinning');
        const specBars = document.querySelectorAll('.winamp-spectrum-bar');
        specBars.forEach(bar => bar.style.height = `3px`);
        
        if (!paused) {
            trackTime = 0;
            localAudio.currentTime = 0;
            waTrackProgress.value = 0;
            waTimeDisplay.textContent = "00:00";
            spotifyStatusText.textContent = `Status: Player stopped.`;
            waMarqueeText.textContent = "SELECT A TRACK TO COMPILATE SYNTHESIZER PLAYBACK...";
        } else {
            spotifyStatusText.textContent = `Status: Playback paused.`;
            waMarqueeText.textContent = "PLAYBACK PAUSED";
        }
    };

    const playNextTrack = () => {
        stopSynthPlayback();
        currentTrackIndex = (currentTrackIndex + 1) % tracks.length;
        updateActivePlaylistTrack();
        startSynthPlayback();
    };

    const playPrevTrack = () => {
        stopSynthPlayback();
        currentTrackIndex = (currentTrackIndex - 1 + tracks.length) % tracks.length;
        updateActivePlaylistTrack();
        startSynthPlayback();
    };

    const updateActivePlaylistTrack = () => {
        const items = document.querySelectorAll('.wa-playlist-item');
        items.forEach((item, idx) => {
            if (idx === currentTrackIndex) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    };

    // Spotify Window Control Events
    const openSpotify = () => {
        spotifyScreen.classList.add('active');
        spotifyProgram.classList.remove('minimized');
        taskTabSpotify.style.display = 'flex';
        taskTabSpotify.classList.add('active');
        document.querySelectorAll('.win95-window').forEach(w => w.style.zIndex = '20');
        spotifyProgram.style.zIndex = '30';
    };

    const closeSpotify = () => {
        stopSynthPlayback();
        spotifyScreen.classList.remove('active');
        taskTabSpotify.style.display = 'none';
        
        spotifyProgram.style.position = '';
        spotifyProgram.style.left = '';
        spotifyProgram.style.top = '';
        spotifyProgram.style.margin = '';
    };

    const minimizeSpotify = () => {
        spotifyProgram.classList.add('minimized');
        taskTabSpotify.classList.remove('active');
    };

    const restoreSpotify = () => {
        spotifyProgram.classList.remove('minimized');
        taskTabSpotify.classList.add('active');
        document.querySelectorAll('.win95-window').forEach(w => w.style.zIndex = '20');
        spotifyProgram.style.zIndex = '30';
    };

    if (iconSpotify) {
        iconSpotify.addEventListener('click', openSpotify);
        iconSpotify.addEventListener('dblclick', openSpotify);
    }
    spotifyMinimizeBtn.addEventListener('click', minimizeSpotify);
    spotifyCloseBtn.addEventListener('click', closeSpotify);
    
    taskTabSpotify.addEventListener('click', () => {
        if (spotifyProgram.classList.contains('minimized') || !taskTabSpotify.classList.contains('active')) {
            restoreSpotify();
        } else {
            minimizeSpotify();
        }
    });

    // Faceplate Event Listeners
    waPlay.addEventListener('click', () => {
        if (!isPlaying) {
            startSynthPlayback();
        }
    });

    waPause.addEventListener('click', () => {
        if (isPlaying) {
            stopSynthPlayback(true);
        }
    });

    waStop.addEventListener('click', () => {
        stopSynthPlayback();
    });

    waNext.addEventListener('click', playNextTrack);
    waPrev.addEventListener('click', playPrevTrack);

    // Playlist Selection
    document.querySelectorAll('.wa-playlist-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const idx = parseInt(e.target.getAttribute('data-index'));
            stopSynthPlayback();
            currentTrackIndex = idx;
            updateActivePlaylistTrack();
            startSynthPlayback();
        });
    });

    // Volume Adjustment
    waVolume.addEventListener('input', () => {
        initAudio();
        const volPercent = parseInt(waVolume.value) / 100;
        localAudio.volume = volPercent;
        spotifyStatusText.textContent = `Status: Volume set to ${waVolume.value}%`;
    });

    // Track Progress Drag / Seeking
    waTrackProgress.addEventListener('input', () => {
        const track = tracks[currentTrackIndex];
        const newTime = Math.floor((parseInt(waTrackProgress.value) / 100) * track.duration);
        trackTime = newTime;
        if (track.isLocal) {
            localAudio.currentTime = newTime;
        }
        const mins = String(Math.floor(trackTime / 60)).padStart(2, '0');
        const secs = String(trackTime % 60).padStart(2, '0');
        waTimeDisplay.textContent = `${mins}:${secs}`;
    });

    // File/Folder upload elements
    const waAddFileBtn = document.getElementById('wa-add-file-btn');
    const waAddFolderBtn = document.getElementById('wa-add-folder-btn');
    const waFileInput = document.getElementById('wa-file-input');
    const waFolderInput = document.getElementById('wa-folder-input');
    const waMenuOpen = document.getElementById('wa-menu-open');
    const waMenuOpenFolder = document.getElementById('wa-menu-open-folder');
    const waMenuExit = document.getElementById('wa-menu-exit');
    const waPlaylistEmptyState = document.getElementById('wa-playlist-empty-state');

    const triggerFileInput = () => { if (waFileInput) waFileInput.click(); };
    const triggerFolderInput = () => { if (waFolderInput) waFolderInput.click(); };

    if (waAddFileBtn) waAddFileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        triggerFileInput();
    });
    if (waAddFolderBtn) waAddFolderBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        triggerFolderInput();
    });
    if (waMenuOpen) waMenuOpen.addEventListener('click', triggerFileInput);
    if (waMenuOpenFolder) waMenuOpenFolder.addEventListener('click', triggerFolderInput);
    if (waMenuExit) waMenuExit.addEventListener('click', () => { closeSpotify(); });

    // Shared function to add track to the playlist UI
    const addTrackToPlaylistUI = (file, fileUrl, coverUrl = null) => {
        // Temporary audio element to extract duration
        const tempAudio = new Audio(fileUrl);
        
        tempAudio.addEventListener('loadedmetadata', () => {
            const duration = Math.floor(tempAudio.duration) || 180;
            
            // Add to tracks array
            const newTrack = {
                name: file.name,
                duration: duration,
                isLocal: true,
                fileUrl: fileUrl,
                coverUrl: coverUrl
            };
            tracks.push(newTrack);
            
            // Hide empty state if first item
            if (waPlaylistEmptyState) waPlaylistEmptyState.style.display = 'none';

            // Append to Playlist Editor DOM
            const index = tracks.length - 1;
            const newItem = document.createElement('div');
            newItem.className = 'wa-playlist-item';
            newItem.setAttribute('data-index', index);
            
            // Format duration text MM:SS
            const mins = Math.floor(duration / 60);
            const secs = String(duration % 60).padStart(2, '0');
            newItem.textContent = `${index + 1}. ${file.name} (${mins}:${secs})`;
            
            // Add click listener
            newItem.addEventListener('click', () => {
                stopSynthPlayback();
                currentTrackIndex = index;
                updateActivePlaylistTrack();
                startSynthPlayback();
            });
            
            if (waPlaylistList) waPlaylistList.appendChild(newItem);
            
            // If it's the first track loaded, automatically play it!
            if (tracks.length === 1) {
                currentTrackIndex = 0;
                updateActivePlaylistTrack();
                startSynthPlayback();
            }
            
            spotifyStatusText.textContent = `Status: Loaded track "${file.name}"`;
        });
    };

    // Handle single file input
    if (waFileInput) {
        waFileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            const audioFiles = files.filter(f => f.type.startsWith('audio/') || f.name.endsWith('.mp3') || f.name.endsWith('.wav'));
            const imageFile = files.find(f => f.type.startsWith('image/') || f.name.endsWith('.jpg') || f.name.endsWith('.png') || f.name.endsWith('.jpeg'));
            
            const coverUrl = imageFile ? URL.createObjectURL(imageFile) : null;
            
            audioFiles.forEach(file => {
                const fileUrl = URL.createObjectURL(file);
                addTrackToPlaylistUI(file, fileUrl, coverUrl);
            });
        });
    }

    // Handle folder input (multiple files)
    if (waFolderInput) {
        waFolderInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            
            // Check if there are any image files in the folder (CORS safe relative reading!)
            const imageFile = files.find(file => 
                file.type.startsWith('image/') || 
                file.name.endsWith('.jpg') || 
                file.name.endsWith('.jpeg') || 
                file.name.endsWith('.png') || 
                file.name.endsWith('.webp') || 
                file.name.endsWith('.gif')
            );

            const folderCoverUrl = imageFile ? URL.createObjectURL(imageFile) : null;
            
            // Filter for audio files
            const audioFiles = files.filter(file => 
                file.type.startsWith('audio/') || 
                file.name.endsWith('.mp3') || 
                file.name.endsWith('.wav') || 
                file.name.endsWith('.m4a') || 
                file.name.endsWith('.ogg')
            );

            if (audioFiles.length === 0) {
                alert("No audio files (MP3, WAV, etc.) found in the selected folder!");
                return;
            }

            // Stop current playback, clear previous playlist if importing new folder
            stopSynthPlayback();
            tracks.length = 0; // clear tracks array
            
            // Clear playlist DOM list except empty state
            const items = waPlaylistList.querySelectorAll('.wa-playlist-item');
            items.forEach(item => item.remove());
            
            if (waPlaylistEmptyState) waPlaylistEmptyState.style.display = 'block';

            spotifyStatusText.textContent = `Status: Processing ${audioFiles.length} songs...`;

            // Add all audio files
            audioFiles.forEach(file => {
                const fileUrl = URL.createObjectURL(file);
                addTrackToPlaylistUI(file, fileUrl, folderCoverUrl);
            });
        });
    }


    // ========================================================
    // 11. CLICKABLE DIRECT VAULT LAUNCHER (NO LOGIN REQUIRED!)
    // ========================================================
    const iconVault = document.getElementById('icon-vault');
    const openVault = () => {
        secureScreen.classList.add('active');
        secureProgram.classList.remove('minimized');
        taskTabVault.style.display = 'flex';
        taskTabVault.classList.add('active');
        document.querySelectorAll('.win95-window').forEach(w => w.style.zIndex = '20');
        secureProgram.style.zIndex = '30';
    };
    if (iconVault) {
        iconVault.addEventListener('click', openVault);
        iconVault.addEventListener('dblclick', openVault);
    }


    // ========================================================
    // 12. RETRO NOTEPAD CONTROLLER & TEXT SHORTCUT
    // ========================================================
    const iconText = document.getElementById('icon-text');
    const notepadScreen = document.getElementById('notepad-screen');
    const notepadProgram = document.getElementById('notepad-program');
    const notepadMinimizeBtn = document.getElementById('notepad-minimize-btn');
    const notepadCloseBtn = document.getElementById('notepad-close-btn');
    const notepadMenuClose = document.getElementById('notepad-menu-close');
    const taskTabNotepad = document.getElementById('task-tab-notepad');

    const openNotepad = () => {
        notepadScreen.classList.add('active');
        notepadProgram.classList.remove('minimized');
        taskTabNotepad.style.display = 'flex';
        taskTabNotepad.classList.add('active');
        document.querySelectorAll('.win95-window').forEach(w => w.style.zIndex = '20');
        notepadProgram.style.zIndex = '30';
    };

    const closeNotepad = () => {
        notepadScreen.classList.remove('active');
        taskTabNotepad.style.display = 'none';

        notepadProgram.style.position = '';
        notepadProgram.style.left = '';
        notepadProgram.style.top = '';
        notepadProgram.style.margin = '';
    };

    const minimizeNotepad = () => {
        notepadProgram.classList.add('minimized');
        taskTabNotepad.classList.remove('active');
    };

    const restoreNotepad = () => {
        notepadProgram.classList.remove('minimized');
        taskTabNotepad.classList.add('active');
        document.querySelectorAll('.win95-window').forEach(w => w.style.zIndex = '20');
        notepadProgram.style.zIndex = '30';
    };

    if (iconText) {
        iconText.addEventListener('click', openNotepad);
        iconText.addEventListener('dblclick', openNotepad);
    }
    notepadMinimizeBtn.addEventListener('click', minimizeNotepad);
    notepadCloseBtn.addEventListener('click', closeNotepad);
    if (notepadMenuClose) notepadMenuClose.addEventListener('click', closeNotepad);

    taskTabNotepad.addEventListener('click', () => {
        if (notepadProgram.classList.contains('minimized') || !taskTabNotepad.classList.contains('active')) {
            restoreNotepad();
        } else {
            minimizeNotepad();
        }
    });

    // Make Notepad Draggable, Resizable, Maximizable
    makeWindowDraggable(notepadProgram);
    makeWindowResizable(notepadProgram);
    makeWindowMaximizable(notepadProgram, 'notepad-maximize-btn');

    // 12. EASTER EGG: dih.exe POPUP CONTROLLER
    // ==========================================
    const dihScreen = document.getElementById('dih-screen');
    const dihProgram = document.getElementById('dih-program');
    const dihCloseBtn = document.getElementById('dih-close-btn');

    window.triggerDihExe = () => {
        // Clear the IE address bar
        const ieBar = document.getElementById('ie-address-bar');
        if (ieBar) ieBar.value = 'http://www.volqan.me/nice_try.htm';

        // Show the popup with shake animation
        dihScreen.classList.add('active');
        dihProgram.classList.add('visible');

        // Re-trigger the shake animation
        dihProgram.style.animation = 'none';
        dihProgram.offsetHeight; // force reflow
        dihProgram.style.animation = 'dihShake 0.5s ease-in-out';

        // Bring to absolute front
        document.querySelectorAll('.win95-window').forEach(w => w.style.zIndex = '20');
        dihProgram.style.zIndex = '999';
    };

    const closeDihExe = () => {
        dihProgram.classList.remove('visible');
        dihScreen.classList.remove('active');
    };

    if (dihCloseBtn) dihCloseBtn.addEventListener('click', closeDihExe);

    // Make dih.exe draggable too
    makeWindowDraggable(dihProgram);
});
