/* =========================================
   THEME
========================================= */

function toggleTheme() {
    document.body.classList.toggle("light");

    const isLight = document.body.classList.contains("light");

    localStorage.setItem("theme", isLight ? "light" : "dark");
}


/* Load saved theme */

window.addEventListener("DOMContentLoaded", function () {

    // Always start with the original blue/dark landing theme.
    // The Theme button can still switch to the alternate light theme.
    document.body.classList.remove("light");

    updateClock();

    setInterval(updateClock, 1000);

    loadBestScore();
    refreshAuthState();
});


/* =========================================
   CLOCK
========================================= */

function updateClock() {

    const clock = document.getElementById("clock");

    if (!clock) return;

    const now = new Date();

    clock.textContent = now.toLocaleString();
}


/* =========================================
   HOME / TOOLS NAVIGATION
========================================= */

function scrollToTools() {
    const target = document.getElementById("tools");
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
}


let authUser = null;
let authMode = "login";

async function refreshAuthState() {
    try {
        const response = await fetch("/api/auth/me");
        const data = await response.json();
        authUser = data.logged_in ? data.username : null;
        updateAuthUI();
    } catch (_) {
        authUser = null;
    }
}

function updateAuthUI() {
    const heading = document.getElementById("accountHeading");
    const form = document.getElementById("authForm");
    const logout = document.getElementById("logoutBtn");
    const note = document.querySelector(".auth-note");
    const accountBtn = document.querySelector(".account-btn");
    if (authUser) {
        if (heading) heading.textContent = `Welcome, ${authUser}`;
        if (form) form.style.display = "none";
        if (logout) logout.style.display = "inline-flex";
        if (note) note.textContent = "You are signed in and can now use all WebSecurity Toolkit features.";
        if (accountBtn) accountBtn.textContent = "MY ACCOUNT · SIGNED IN";
    } else {
        if (heading) heading.textContent = "Sign in to WebSecurity Toolkit";
        if (form) form.style.display = "block";
        if (logout) logout.style.display = "none";
        if (note) note.textContent = "Your account is stored by this local project. Never reuse a password from your personal email or other important accounts.";
        if (accountBtn) accountBtn.textContent = "MY ACCOUNT";
    }
}

function openTool(tool) {
    if (tool !== "account" && !authUser) {
        openToolPanelOnly("account");
        const result = document.getElementById("accountResult");
        if (result) {
            result.innerHTML = "<span class='info'>Please sign in or create an account to access the tools.</span>";
            result.classList.add("show");
        }
        return;
    }
    openToolPanelOnly(tool);
}

function openToolPanelOnly(tool) {
    document.getElementById("homePage").style.display = "none";

    document.getElementById("toolPage").style.display = "block";

    const panels = document.querySelectorAll(".tool-panel");

    panels.forEach(function (panel) {
        panel.classList.remove("active");
    });

    const selected = document.getElementById(tool + "Tool");

    if (selected) {
        selected.classList.add("active");
    }

    window.scrollTo({ top: 0, behavior: "smooth" });

    if (tool === "quiz") {
        createQuiz();
    }
}


function goHome() {

    document.getElementById("toolPage").style.display = "none";

    document.getElementById("homePage").style.display = "block";

    window.scrollTo({ top: 0, behavior: "smooth" });
}


/* =========================================
   SEARCH
========================================= */

function filterTools() {

    const search = document
        .getElementById("searchBox")
        .value
        .toLowerCase();

    const cards = document.querySelectorAll(".card");

    cards.forEach(function (card) {

        const name = card.dataset.name.toLowerCase();

        if (name.includes(search)) {
            card.style.display = "";
        } else {
            card.style.display = "none";
        }

    });
}


/* =========================================
   PASSWORD STRENGTH
========================================= */

function checkPassword() {
    const password = document.getElementById("passwordInput").value;
    const result = document.getElementById("passwordResult");
    const meter = document.getElementById("passwordMeter");
    const meterFill = document.getElementById("passwordMeterFill");

    if (!password) {
        showResult(result, "<span class='danger'>Please enter a password.</span>");
        if (meter) meter.style.display = "none";
        return;
    }

    const common = [
        "password", "123456", "12345678", "qwerty", "qwerty123",
        "admin", "letmein", "welcome", "iloveyou", "abc123",
        "password123", "admin123"
    ];
    const lower = password.toLowerCase();
    const checks = [];
    let score = 0;

    if (password.length >= 12) { score += 2; checks.push("✓ 12+ characters"); }
    else if (password.length >= 8) { score += 1; checks.push("✓ 8+ characters"); }
    else checks.push("✗ Use at least 8 characters; 12–16+ is better");

    if (/[A-Z]/.test(password)) { score++; checks.push("✓ Uppercase letter"); }
    else checks.push("✗ Add uppercase letters");
    if (/[a-z]/.test(password)) { score++; checks.push("✓ Lowercase letter"); }
    else checks.push("✗ Add lowercase letters");
    if (/\d/.test(password)) { score++; checks.push("✓ Number"); }
    else checks.push("✗ Add numbers");
    if (/[^A-Za-z0-9]/.test(password)) { score++; checks.push("✓ Special character"); }
    else checks.push("✗ Add a special character");

    const repeated = /(.)\1{2,}/.test(password);
    const sequential = /(1234|2345|3456|4567|5678|6789|abcd|bcde|cdef)/i.test(password);
    const commonHit = common.some(word => lower === word || lower.includes(word));
    if (repeated) { score--; checks.push("✗ Avoid repeated characters such as aaa or 111"); }
    else checks.push("✓ No obvious repeated-character pattern");
    if (sequential) { score--; checks.push("✗ Avoid simple sequences such as 1234 or abcd"); }
    else checks.push("✓ No obvious sequence pattern");
    if (commonHit) { score -= 3; checks.push("✗ Matches a common password pattern"); }
    else checks.push("✓ Not an obvious common-password match");

    const charset = (/[a-z]/.test(password) ? 26 : 0)
        + (/[A-Z]/.test(password) ? 26 : 0)
        + (/\d/.test(password) ? 10 : 0)
        + (/[^A-Za-z0-9]/.test(password) ? 33 : 0);
    const entropy = Math.max(0, password.length * Math.log2(Math.max(charset, 1)));

    let strength = "Very Weak";
    let tone = "danger";
    if (commonHit || password.length < 8 || entropy < 30) { strength = "Very Weak"; tone = "danger"; }
    else if (entropy < 45 || score < 5) { strength = "Weak"; tone = "danger"; }
    else if (entropy < 65 || score < 7) { strength = "Good"; tone = "warning"; }
    else if (entropy < 85) { strength = "Strong"; tone = "success"; }
    else { strength = "Excellent"; tone = "success"; }

    const crackSeconds = Math.pow(2, Math.max(entropy - 1, 0)) / 1e10;
    let crackText = "less than a second";
    if (crackSeconds >= 31536000) crackText = `${(crackSeconds / 31536000).toFixed(1)} years`;
    else if (crackSeconds >= 86400) crackText = `${(crackSeconds / 86400).toFixed(1)} days`;
    else if (crackSeconds >= 3600) crackText = `${(crackSeconds / 3600).toFixed(1)} hours`;
    else if (crackSeconds >= 60) crackText = `${(crackSeconds / 60).toFixed(1)} minutes`;
    else if (crackSeconds >= 1) crackText = `${crackSeconds.toFixed(1)} seconds`;

    const recommendations = [];
    if (password.length < 12) recommendations.push("Increase the length to 12–16+ characters.");
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password)) recommendations.push("Use a mix of uppercase and lowercase letters.");
    if (!/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) recommendations.push("Mix numbers and symbols where appropriate.");
    if (commonHit || sequential || repeated) recommendations.push("Avoid common words, sequences, names, and repeated characters.");
    recommendations.push("Use a unique password for every important account; a password manager can help.");

    if (meter && meterFill) {
        meter.style.display = "block";
        meterFill.style.width = `${Math.min(100, Math.max(8, (entropy / 100) * 100))}%`;
    }

    result.innerHTML = `
        <div class="password-summary">
            <h3>Password Strength: <span class="${tone}">${strength}</span></h3>
            <p><b>Estimated entropy:</b> ${entropy.toFixed(0)} bits</p>
            <p><b>Illustrative offline guessing estimate:</b> ${crackText}</p>
        </div>
        <div class="password-checks"><h4>Security checks</h4><ul>${checks.map(x => `<li>${x}</li>`).join("")}</ul></div>
        <div class="password-tips"><h4>Improve it</h4><ul>${recommendations.map(x => `<li>${x}</li>`).join("")}</ul></div>
        <small>Entropy and crack-time figures are estimates, not a guarantee. Passwords are analyzed locally in your browser and are not sent to the Flask server.</small>
    `;
    result.classList.add("show");
}


/* =========================================
   LEARNING HUB FILTERS
========================================= */
function filterLessons() {
    const search = (document.getElementById("learningSearch")?.value || "").toLowerCase().trim();
    const level = document.getElementById("learningLevel")?.value || "all";
    const lessons = document.querySelectorAll("#learningGrid .lesson");
    let visible = 0;
    lessons.forEach(lesson => {
        const matchesSearch = !search || (lesson.dataset.search || "").includes(search) || lesson.textContent.toLowerCase().includes(search);
        const matchesLevel = level === "all" || lesson.dataset.level === level;
        lesson.style.display = matchesSearch && matchesLevel ? "block" : "none";
        if (matchesSearch && matchesLevel) visible++;
    });
    const empty = document.getElementById("learningEmpty");
    if (empty) empty.style.display = visible ? "none" : "block";
}


/* =========================================
   URL SAFETY CHECKER
========================================= */

function checkURL() {

    const input =
        document.getElementById("urlInput").value.trim();

    const result =
        document.getElementById("urlResult");

    if (!input) {

        showResult(
            result,
            "<span class='danger'>Please enter a URL.</span>"
        );

        return;
    }

    let url;

    try {

        url = new URL(input);

    } catch {

        showResult(
            result,
            "<span class='danger'>Invalid URL format.</span>"
        );

        return;
    }

    const warnings = [];

    if (url.protocol !== "https:") {
        warnings.push("The URL does not use HTTPS.");
    }

    if (url.username || url.password) {
        warnings.push("The URL contains embedded credentials.");
    }

    if (url.hostname.includes("@")) {
        warnings.push("Suspicious hostname pattern detected.");
    }

    if (input.length > 150) {
        warnings.push("The URL is unusually long.");
    }

    const suspiciousWords = [
        "login",
        "verify",
        "account",
        "password",
        "secure",
        "update"
    ];

    const lower = input.toLowerCase();

    const found = suspiciousWords.filter(word =>
        lower.includes(word)
    );

    if (found.length > 0) {
        warnings.push(
            "Contains words commonly used in phishing URLs: " +
            found.join(", ")
        );
    }

    if (warnings.length === 0) {

        result.innerHTML = `
            <span class="success">
                ✓ No basic suspicious patterns detected.
            </span>
            <br>
            This does not guarantee that the website is safe.
        `;

    } else {

        result.innerHTML = `
            <span class="warning">
                ⚠ Potential warning signs detected
            </span>

            <ul>
                ${warnings.map(w => `<li>${w}</li>`).join("")}
            </ul>

            <p>
                Treat unfamiliar links carefully and verify
                the domain before entering information.
            </p>
        `;
    }

    result.classList.add("show");
}


/* =========================================
   HASH IDENTIFIER
========================================= */

function identifyHash() {

    const hash =
        document.getElementById("hashInput").value.trim();

    const result =
        document.getElementById("hashResult");

    if (!hash) {

        showResult(
            result,
            "<span class='danger'>Please enter a hash.</span>"
        );

        return;
    }

    if (!/^[a-fA-F0-9]+$/.test(hash)) {

        showResult(
            result,
            "<span class='danger'>Hash must contain hexadecimal characters only.</span>"
        );

        return;
    }

    const length = hash.length;

    let possible = [];

    if (length === 32) {
        possible.push("MD5");
    }

    if (length === 40) {
        possible.push("SHA-1");
    }

    if (length === 64) {
        possible.push("SHA-256");
    }

    if (length === 96) {
        possible.push("SHA-384");
    }

    if (length === 128) {
        possible.push("SHA-512");
    }

    if (possible.length === 0) {

        result.innerHTML = `
            <span class="warning">
                Unknown common hash format
            </span>

            <br><br>

            Length: ${length} hexadecimal characters.
        `;

    } else {

        result.innerHTML = `
            <span class="success">
                Possible hash type:
                <b>${possible.join(", ")}</b>
            </span>

            <br><br>

            Length: ${length} hexadecimal characters.

            <br><br>

            <small>
                Hash length alone cannot prove the exact algorithm.
            </small>
        `;
    }

    result.classList.add("show");
}


/* =========================================
   VULNERABILITY SCANNER
========================================= */

async function scanVulnerability() {

    const input =
        document.getElementById("vulnerabilityInput")
            .value.trim();

    const result =
        document.getElementById("vulnerabilityResult");

    if (!input) {

        showResult(
            result,
            "<span class='danger'>Enter an HTTP/HTTPS URL, including localhost, private, loopback or reserved lab targets.</span>"
        );

        return;
    }

    result.innerHTML =
        "<span class='info'>Scanning...</span>";

    result.classList.add("show");

    try {

        const response = await fetch("/api/scan-vulnerability", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                url: input
            })

        });

        const data = await response.json();

        if (!response.ok) {

            throw new Error(
                data.error || "Scan failed"
            );
        }

        const friendlyFindings = data.findings.map(item => {
            const name = item.name || "Security check";
            const status = item.status || "Not available";
            let level = "info";
            let title = name;
            let explanation = status;

            if (name === "HTTPS") {
                const secure = String(data.final_url || data.target).startsWith("https://") && status === "Present";
                level = secure ? "good" : "warning";
                title = "Secure connection (HTTPS)";
                explanation = secure
                    ? "Good: information between your browser and this site is encrypted in transit."
                    : "This scan did not confirm HTTPS. Use HTTPS for sites that handle logins or personal information.";
            } else if (name === "Server header") {
                level = status.startsWith("Exposed:") ? "info" : "good";
                title = "Web server information";
                explanation = status.startsWith("Exposed:")
                    ? `The site reveals its server software (${status.replace("Exposed:", "").trim()}). This is not proof of a vulnerability, but hiding version details can reduce information available to attackers.`
                    : "The server did not reveal a Server header in this response.";
            } else if (["Content-Security-Policy", "X-Content-Type-Options", "X-Frame-Options", "Strict-Transport-Security", "Referrer-Policy", "Permissions-Policy"].includes(name)) {
                title = ({
                    "Content-Security-Policy": "Content Security Policy",
                    "X-Content-Type-Options": "Prevent content-type guessing",
                    "X-Frame-Options": "Protection against unwanted framing",
                    "Strict-Transport-Security": "HTTPS enforcement (HSTS)",
                    "Referrer-Policy": "Referrer privacy",
                    "Permissions-Policy": "Browser feature permissions"
                })[name] || name;
                if (status === "Present") {
                    level = "good";
                    explanation = "Good: this protective setting is present. Its exact strength depends on how it is configured.";
                } else {
                    level = "warning";
                    explanation = ({
                        "Content-Security-Policy": "Missing: a Content Security Policy can help limit damage from injected scripts. Ask the site administrator to configure an appropriate policy.",
                        "X-Content-Type-Options": "Missing: adding 'nosniff' helps browsers avoid guessing a file's content type.",
                        "X-Frame-Options": "Missing: framing protections can help reduce clickjacking risk. A suitable CSP frame-ancestors rule can also provide protection.",
                        "Strict-Transport-Security": "Missing: this setting tells browsers to prefer HTTPS on future visits. It is useful only when the site supports HTTPS.",
                        "Referrer-Policy": "Missing: a policy can limit how much page-address information is shared when visitors follow links.",
                        "Permissions-Policy": "Missing: this policy can restrict access to browser features such as camera or microphone."
                    })[name] || "This protective setting was not found in the response.";
                }
            } else if (name === "Cookie flags") {
                level = "warning";
                title = "Cookie protection";
                explanation = "The site set cookies. This basic scan cannot confirm their individual flags; an administrator should verify Secure, HttpOnly, and SameSite where appropriate.";
            } else if (name === "Cookies") {
                level = "info";
                title = "Cookies observed";
                explanation = "No Set-Cookie header was seen in this response. The site may still use cookies on other pages or after login.";
            } else if (name === "Target scope") {
                level = "info";
                title = "Address type";
                explanation = `The target was classified as: ${status}. This describes the address, not whether the website is vulnerable.`;
            }
            return { title, explanation, level, status };
        });

        const warnings = friendlyFindings.filter(item => item.level === "warning").length;
        const good = friendlyFindings.filter(item => item.level === "good").length;
        const summary = warnings === 0
            ? "No missing settings were flagged by these basic checks. This does not guarantee the website is secure."
            : `${warnings} item${warnings === 1 ? "" : "s"} need a closer look. These are configuration warnings, not proof that the website has been hacked.`;

        result.innerHTML = `
            <div class="scan-report-head">
                <div class="scan-report-icon" aria-hidden="true">✓</div>
                <div><h3>Website Safety Check</h3><p class="scan-report-sub">A simple explanation of what we checked and what you can improve.</p></div>
            </div>
            <div class="scan-target"><span>Website checked</span><strong>${escapeHTML(data.target)}</strong>
                <span>HTTP response: <b>${escapeHTML(String(data.status_code ?? "Unknown"))}</b> · ${escapeHTML(data.final_url || data.target)}</span>
            </div>
            <div class="scan-summary ${warnings ? "has-warnings" : "all-clear"}">
                <strong>${warnings ? `Needs attention: ${warnings} check${warnings === 1 ? "" : "s"}` : "Basic checks look okay"}</strong>
                <p>${escapeHTML(summary)}</p>
                <div class="scan-counts"><span>✓ ${good} protective setting${good === 1 ? "" : "s"} found</span><span>! ${warnings} item${warnings === 1 ? "" : "s"} to review</span></div>
            </div>
            <h4 class="scan-section-title">What we found</h4>
            <div class="scan-findings">
                ${friendlyFindings.map(item => `
                    <article class="scan-finding ${item.level}">
                        <span class="finding-mark" aria-hidden="true">${item.level === "good" ? "✓" : item.level === "warning" ? "!" : "i"}</span>
                        <div><h5>${escapeHTML(item.title)}</h5><p>${escapeHTML(item.explanation)}</p><small>${item.level === "good" ? "Looks good" : item.level === "warning" ? "Worth checking" : "Extra information"}</small></div>
                    </article>
                `).join("")}
            </div>
            <p class="scan-disclaimer">Important: this is a basic, non-invasive check of the page response, not a full penetration test. Some settings may be applied elsewhere or vary by page. Only scan websites you own or have permission to test.</p>
        `;

    } catch (error) {

        result.innerHTML = `
            <span class="danger">
                Error: ${escapeHTML(error.message)}
            </span>
        `;
    }
}


/* =========================================
   SECURITY HEADERS
========================================= */

async function checkHeaders() {

    const input =
        document.getElementById("headerInput")
            .value.trim();

    const result =
        document.getElementById("headerResult");

    if (!input) {

        showResult(
            result,
            "<span class='danger'>Enter an HTTP/HTTPS URL, including localhost, private, loopback or reserved lab targets.</span>"
        );

        return;
    }

    result.innerHTML =
        "<span class='info'>Checking headers...</span>";

    result.classList.add("show");

    try {

        const response = await fetch("/api/check-headers", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                url: input
            })

        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error || "Header check failed"
            );
        }

        result.innerHTML = `
            <h3>Security Header Report</h3>

            <p>
                Target:
                <b>${escapeHTML(data.target)}</b>
            </p>

            <br>

            <ul>
                ${data.headers.map(header => `
                    <li>
                        <b>${escapeHTML(header.name)}</b>
                        :
                        <span class="${
                            header.present
                                ? "success"
                                : "danger"
                        }">
                            ${
                                header.present
                                    ? "Present"
                                    : "Missing"
                            }
                        </span>
                    </li>
                `).join("")}
            </ul>
        `;

    } catch (error) {

        result.innerHTML = `
            <span class="danger">
                Error: ${escapeHTML(error.message)}
            </span>
        `;
    }
}


/* =========================================
   QUIZ
========================================= */

const quizQuestions = [
    { topic: "Web Security", level: "Intermediate", question: "A login form puts user input directly into an SQL query. Which vulnerability may let an attacker alter the query?", options: ["SQL injection", "Cross-site request forgery", "DNS spoofing", "Directory traversal"], answer: 0, explanation: "SQL injection happens when untrusted input is treated as part of a database query. Parameterized queries are the primary defense." },
    { topic: "Web Security", level: "Intermediate", question: "A website displays user comments as HTML without safely encoding them. What is the main risk?", options: ["Cross-site scripting (XSS)", "A brute-force login", "ARP poisoning", "A disk failure"], answer: 0, explanation: "Unsafe rendering can allow injected JavaScript to run in visitors' browsers. Context-aware output encoding and safe templating help prevent XSS." },
    { topic: "Networking", level: "Beginner", question: "Which protocol normally translates a domain name such as example.com into an IP address?", options: ["DNS", "DHCP", "SSH", "SMTP"], answer: 0, explanation: "DNS resolves domain names to records such as IP addresses. DHCP instead provides network configuration to devices." },
    { topic: "Networking", level: "Intermediate", question: "What is the main purpose of a firewall?", options: ["Filter network traffic using rules", "Encrypt every file on a computer", "Replace software updates", "Guarantee that a site is trustworthy"], answer: 0, explanation: "A firewall permits or blocks network traffic according to configured rules. It is one layer of defense, not a complete security solution." },
    { topic: "Cryptography", level: "Beginner", question: "What security property does encryption primarily provide when correctly implemented?", options: ["Confidentiality", "Availability", "Non-repudiation by itself", "Automatic malware removal"], answer: 0, explanation: "Encryption helps keep information unreadable to parties without the required key. It does not by itself guarantee availability or remove malware." },
    { topic: "Password Security", level: "Beginner", question: "Which password is generally hardest to guess?", options: ["A long, unique, randomly generated password", "Summer2026! used on every site", "A pet's name plus birth year", "The word Password with a number"], answer: 0, explanation: "Length, uniqueness, and randomness make guessing harder. A password manager can help create and store unique passwords." },
    { topic: "Password Security", level: "Intermediate", question: "How should an application store user passwords?", options: ["With a modern password-hashing function and a unique salt", "As readable plain text", "With reversible encryption and the key beside the database", "As an unsalted MD5 hash"], answer: 0, explanation: "Use a purpose-built password hash such as Argon2id, scrypt, or bcrypt with unique salts and suitable cost settings. Never store plain-text passwords." },
    { topic: "Linux", level: "Intermediate", question: "On Linux, what does the command `chmod 600 file.txt` do?", options: ["Owner can read and write; group and others get no permissions", "Everyone can read and write the file", "Only group members can execute it", "It deletes the file"], answer: 0, explanation: "Mode 600 gives the owner read/write permissions (6) and gives group and others no permissions (0 and 0)." },
    { topic: "Incident Response", level: "Intermediate", question: "You suspect a workstation is actively infected with malware. What is a sensible first containment action under your organization's process?", options: ["Isolate it from the network and report it to the response team", "Delete every log immediately", "Keep using it to see what happens", "Post sensitive files online for help"], answer: 0, explanation: "Network isolation can limit spread while preserving evidence. Follow the incident-response plan and notify the authorized team." },
    { topic: "Identity & Access", level: "Beginner", question: "What does multi-factor authentication (MFA) require?", options: ["Two or more different types of proof of identity", "Two passwords of the same type only", "A longer username", "A firewall and an antivirus product"], answer: 0, explanation: "MFA combines distinct factor types, such as something you know and something you have. Two passwords alone are not two different factor types." },
    { topic: "Web Security", level: "Advanced", question: "A server fetches URLs supplied by users. Which test is especially important to prevent server-side request forgery (SSRF)?", options: ["Block loopback, private, link-local and other disallowed destinations, including after DNS resolution and redirects", "Only reject URLs containing the word localhost", "Trust every URL that uses HTTPS", "Check only the file extension"], answer: 0, explanation: "SSRF defenses need destination allowlisting and careful handling of DNS resolution, IP ranges, redirects, and network egress. Blocking one hostname string is not enough." },
    { topic: "Secure Sessions", level: "Intermediate", question: "Which cookie attribute helps stop client-side JavaScript from reading a session cookie?", options: ["HttpOnly", "Accept", "ETag", "Origin"], answer: 0, explanation: "HttpOnly prevents JavaScript APIs such as document.cookie from reading that cookie in supporting browsers. Secure and SameSite address other risks." },
    { topic: "Security Operations", level: "Intermediate", question: "Why are system logs useful during a security investigation?", options: ["They help reconstruct events and timelines", "They prevent every attack automatically", "They replace backups", "They prove that every recorded event is malicious"], answer: 0, explanation: "Logs can help analysts build a timeline and identify suspicious activity. They need appropriate retention, access controls, time synchronization, and interpretation." },
    { topic: "Ethical Hacking", level: "Beginner", question: "Before scanning a real website for vulnerabilities, what should a student do?", options: ["Get explicit authorization and confirm the permitted scope", "Scan it because public websites have no restrictions", "Hide the scan from the owner", "Try every exploit to see what works"], answer: 0, explanation: "Only test systems you own or have explicit permission to assess, and stay within the agreed scope and rules of engagement." },
    { topic: "Risk Management", level: "Advanced", question: "A critical vulnerability affects a server exposed to the internet. Which response is most appropriate?", options: ["Assess exposure and impact, apply a verified fix or mitigation promptly, then validate and document", "Ignore it if no attack has been reported", "Disable monitoring to reduce alerts", "Assume a firewall removes all risk"], answer: 0, explanation: "Prioritize based on severity, exposure, and business impact; mitigate promptly, verify the result, and document the change." }
];

function createQuiz() {
    const container = document.getElementById("quizContainer");
    if (!container) return;
    container.innerHTML = `<div class="quiz-intro"><p><strong>Cybersecurity Student Assessment</strong></p><p>15 questions across networking, web security, Linux, cryptography, password safety, incident response, and ethical hacking. Choose the best answer for each scenario. Explanations appear after you submit.</p><p class="quiz-meta">Beginner → Advanced <span>•</span> 15 marks</p></div>`;
    quizQuestions.forEach(function (q, index) {
        const questionDiv = document.createElement("div");
        questionDiv.className = "quiz-question";
        let html = `<div class="quiz-question-meta"><span>${q.topic}</span><span>${q.level}</span></div><h3>${index + 1}. ${q.question}</h3>`;
        q.options.forEach(function (option, optionIndex) {
            html += `<label class="quiz-option"><input type="radio" name="question${index}" value="${optionIndex}"><span>${option}</span></label>`;
        });
        questionDiv.innerHTML = html;
        container.appendChild(questionDiv);
    });
}

function submitQuiz() {
    let score = 0;
    let answered = 0;
    const review = [];
    quizQuestions.forEach(function (q, index) {
        const selected = document.querySelector(`input[name="question${index}"]:checked`);
        if (selected) {
            answered++;
            const ok = Number(selected.value) === q.answer;
            if (ok) score++;
            review.push(`<div class="quiz-review ${ok ? "correct" : "wrong"}"><b>Q${index + 1}: ${ok ? "Correct" : "Review"}</b><p>${q.explanation}</p></div>`);
        } else {
            review.push(`<div class="quiz-review wrong"><b>Q${index + 1}: Not answered</b><p>Choose an answer to complete this question.</p></div>`);
        }
    });
    const percentage = Math.round((score / quizQuestions.length) * 100);
    let level = percentage >= 90 ? "Excellent" : percentage >= 70 ? "Strong" : percentage >= 50 ? "Developing" : "Keep Learning";
    const result = document.getElementById("quizResult");
    result.innerHTML = `<h3>Score: <span class="success">${score}/${quizQuestions.length}</span></h3><p>${percentage}% correct • ${answered}/${quizQuestions.length} answered • <b>${level}</b></p><div class="quiz-review-list">${review.join("")}</div>`;
    result.classList.add("show");
    saveBestScore(score);
}


/* =========================================
   BEST SCORE
========================================= */

function saveBestScore(score) {

    const oldScore =
        Number(
            localStorage.getItem("bestScore") || 0
        );

    if (score > oldScore) {

        localStorage.setItem(
            "bestScore",
            score
        );
    }

    loadBestScore();
}


function loadBestScore() {

    const best =
        localStorage.getItem("bestScore");

    const element =
        document.getElementById("bestScore");

    if (element) {

        element.textContent =
            best ? best + "/15" : "—";
    }
}


/* =========================================
   ACCOUNT SIGN IN / SIGN UP
========================================= */

function setAuthMode(mode) {
    authMode = mode;
    const heading = document.getElementById("accountHeading");
    const submit = document.getElementById("authSubmit");
    const password = document.getElementById("accountPassword");
    const signin = document.getElementById("signinTab");
    const signup = document.getElementById("signupTab");
    if (heading) heading.textContent = mode === "register" ? "Create your account" : "Sign in to WebSecurity Toolkit";
    if (submit) submit.textContent = mode === "register" ? "Create Account" : "Sign In";
    if (password) password.autocomplete = mode === "register" ? "new-password" : "current-password";
    if (signin) signin.className = mode === "login" ? "action-btn" : "btn-secondary";
    if (signup) signup.className = mode === "register" ? "action-btn" : "btn-secondary";
    const result = document.getElementById("accountResult");
    if (result) { result.innerHTML = ""; result.classList.remove("show"); }
}

async function submitAuth(event) {
    if (event) event.preventDefault();
    const username = document.getElementById("usernameInput").value.trim();
    const password = document.getElementById("accountPassword").value;
    const result = document.getElementById("accountResult");
    result.innerHTML = "<span class='info'>Please wait...</span>";
    result.classList.add("show");
    try {
        const response = await fetch(authMode === "register" ? "/api/auth/register" : "/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not sign in.");
        authUser = data.username;
        updateAuthUI();
        result.innerHTML = `<span class='success'>✓ ${escapeHTML(data.message)} All tools are now available.</span>`;
        result.classList.add("show");
        document.getElementById("accountPassword").value = "";
    } catch (error) {
        result.innerHTML = `<span class='danger'>${escapeHTML(error.message)}</span>`;
        result.classList.add("show");
    }
}

async function logoutUser() {
    try { await fetch("/api/auth/logout", { method: "POST" }); } catch (_) {}
    authUser = null;
    updateAuthUI();
    setAuthMode("login");
    const result = document.getElementById("accountResult");
    if (result) {
        result.innerHTML = "<span class='success'>You have signed out.</span>";
        result.classList.add("show");
    }
    openToolPanelOnly("account");
}


/* =========================================
   HELPERS
========================================= */

function showResult(element, html) {

    element.innerHTML = html;

    element.classList.add("show");
}


function escapeHTML(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
/* =========================================
   STABLE GSAP + LOCOMOTIVE MOTION
   Keeps the original UI and makes animation fail-safe.
========================================= */
(function () {
    function initMotion() {
        const finePointer = window.matchMedia('(pointer: fine)').matches;
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const hasGSAP = !!window.gsap;

        /* Cursor is initialized independently from ScrollTrigger/Locomotive.
           This means the landing-page cursor still works if a scroll library fails. */
        const cursor = document.querySelector('.gsap-cursor');
        const dot = document.querySelector('.gsap-cursor-dot');
        if (finePointer && cursor && dot) {
            // Keep the cursor completely independent from Locomotive Scroll.
            // Use left/top + xPercent so GSAP cannot conflict with CSS transforms.
            cursor.style.opacity = '1';
            dot.style.opacity = '1';

            if (hasGSAP) {
                gsap.set([cursor, dot], { left: 0, top: 0, x: window.innerWidth / 2, y: window.innerHeight / 2, xPercent: -50, yPercent: -50 });
                const ringX = gsap.quickTo(cursor, 'x', { duration: 0.24, ease: 'power3.out' });
                const ringY = gsap.quickTo(cursor, 'y', { duration: 0.24, ease: 'power3.out' });
                const dotX = gsap.quickTo(dot, 'x', { duration: 0.08, ease: 'none' });
                const dotY = gsap.quickTo(dot, 'y', { duration: 0.08, ease: 'none' });
                const moveCursor = e => {
                    ringX(e.clientX); ringY(e.clientY);
                    dotX(e.clientX); dotY(e.clientY);
                };
                window.addEventListener('mousemove', moveCursor, { passive: true });
                window.addEventListener('mouseenter', () => { cursor.style.opacity = '1'; dot.style.opacity = '1'; });
                window.addEventListener('mouseleave', () => { cursor.style.opacity = '0'; dot.style.opacity = '0'; });
            } else {
                window.addEventListener('mousemove', e => {
                    cursor.style.left = e.clientX + 'px'; cursor.style.top = e.clientY + 'px';
                    dot.style.left = e.clientX + 'px'; dot.style.top = e.clientY + 'px';
                    cursor.style.transform = 'translate(-50%, -50%)';
                    dot.style.transform = 'translate(-50%, -50%)';
                }, { passive: true });
            }

            document.querySelectorAll('button, a, input, .card').forEach(el => {
                el.addEventListener('mouseenter', () => document.body.classList.add('cursor-active'));
                el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-active'));
            });
        }

        if (!hasGSAP || reduce) return;
        if (window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

        const intro = gsap.timeline({ defaults: { ease: 'power3.out' } });
        intro.from('header', { y: -14, opacity: 0, duration: 0.5 })
            .from('.hero-eyebrow', { y: 12, opacity: 0, duration: 0.4 }, '-=0.2')
            .from('.hero h1', { y: 22, opacity: 0, duration: 0.65 }, '-=0.15')
            .from('.hero .sub', { y: 12, opacity: 0, duration: 0.45 }, '-=0.28')
            .from('.hero-ctas > *', { y: 10, opacity: 0, duration: 0.4, stagger: 0.07 }, '-=0.22')
            .from('.trust-row span', { opacity: 0, duration: 0.3, stagger: 0.05 }, '-=0.15');

        const marquee = document.querySelector('.hero-marquee-track');
        if (marquee) gsap.to(marquee, { xPercent: -18, duration: 26, ease: 'none', repeat: -1 });

        const glow = document.querySelector('.hero-glow');
        if (glow) gsap.to(glow, { x: 14, y: -8, scale: 1.025, duration: 5.5, ease: 'sine.inOut', repeat: -1, yoyo: true });

        if (!window.ScrollTrigger) return;
        const scroller = {};

        gsap.utils.toArray('.card').forEach((card, i) => {
            gsap.from(card, { y: 20, opacity: 0, duration: 0.55, delay: Math.min(i * 0.03, 0.18), ease: 'power2.out', scrollTrigger: { trigger: card, start: 'top 90%', once: true, ...scroller } });
        });

        const heroContent = document.querySelector('.hero-content');
        if (heroContent) gsap.to(heroContent, { y: -25, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1, ...scroller } });

        const sectionHead = document.querySelector('.section-head');
        if (sectionHead) gsap.from(sectionHead, { y: 14, opacity: 0, duration: 0.5, scrollTrigger: { trigger: sectionHead, start: 'top 92%', once: true, ...scroller } });

        document.querySelectorAll('.result').forEach(el => {
            new MutationObserver(() => {
                if (el.textContent.trim()) gsap.fromTo(el, { y: 8, opacity: 0.4 }, { y: 0, opacity: 1, duration: 0.35, overwrite: true });
            }).observe(el, { childList: true, subtree: true, characterData: true });
        });

        document.querySelectorAll('.card').forEach(card => {
            card.addEventListener('mouseenter', () => gsap.to(card, { y: -2, duration: 0.2 }));
            card.addEventListener('mouseleave', () => gsap.to(card, { y: 0, duration: 0.25 }));
        });

        document.querySelectorAll('.btn-primary, .btn-secondary, .action-btn, .account-btn').forEach(btn => {
            btn.addEventListener('mouseenter', () => gsap.to(btn, { y: -1, duration: 0.18 }));
            btn.addEventListener('mouseleave', () => gsap.to(btn, { y: 0, duration: 0.22 }));
        });

        ScrollTrigger.refresh();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initMotion);
    else initMotion();
})();
