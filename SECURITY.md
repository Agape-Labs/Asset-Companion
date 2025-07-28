# Security Policy for Asset Companion

The security of the **Asset Companion** extension is a top priority. We welcome the help of security researchers and the community in keeping our extension safe for everyone.

## Supported Versions

Only the most recent version of the extension is supported with security updates. Please ensure you are on the latest version before reporting.

| Version | Supported          |
| ------- | ------------------ |
| 1.1.x   | :white_check_mark: |
| < 1.1   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it to us privately. **Please do not create a public GitHub issue.**

### How to Report

We offer two private channels for reporting:

1.  **GitHub Private Vulnerability Reporting (Preferred Method):**
    *   Navigate to the main page of the repository.
    *   Under the repository name, click the **Security** tab.
    *   Click **Report a vulnerability** to open the advisory form. This is the most secure and direct way to reach us.

2.  **Email:**
    *   If you are unable to use GitHub's private reporting, you can send an email to: **labs@agapemedia.co.in**

### What to Include

To help us resolve the issue quickly, please include as much detail as possible:
*   A clear description of the vulnerability and its potential impact.
*   The version of the extension and the browser you are using.
*   Step-by-step instructions to reproduce the issue.
*   Any proof-of-concept code, screenshots, or screen recordings.

## Disclosure Policy & Our Commitment

*   We will provide an initial confirmation of your report within **3 business days (72 hours)**.
*   We will work to investigate and patch the issue in a timely manner.
*   We will provide you with regular status updates as we progress.
*   We will publicly credit you for your discovery (unless you prefer to remain anonymous) once the vulnerability is resolved.

## Security Best Practices

Asset Companion is built with the following security principles in mind:

*   **No Remote Code:** All JavaScript, CSS, and library dependencies are packaged within the extension. No code is loaded at runtime from third-party or CDN sources.
*   **No Data Collection:** The extension does not transmit, collect, or store user browsing data or extracted asset data outside of the user's local browser session.
*   **Local-Only Processing:** All asset extraction (images, fonts, colors) is performed locally in the user’s browser. No data is sent to a remote server.
*   **Minimal Permissions:** We only request the minimal Chrome extension permissions required for core functionality (as defined in `manifest.json`).
*   **No Background Web Requests:** The extension does not make unsolicited network requests or contact remote hosts for telemetry, updates, or any other purpose.

## Out of Scope

The following items are generally not considered security vulnerabilities:

*   Asset extraction failing on certain websites (often due to site-specific Content Security Policies (CSP) or Cross-Origin Resource Sharing (CORS) rules).
*   Issues related to files intentionally downloaded to the user's local disk by the user.
*   Features operating as intended within the scope of the permissions granted by the user upon installation.

Thank you for helping keep Asset Companion and its users secure!
