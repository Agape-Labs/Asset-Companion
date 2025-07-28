# Security Policy

Supported Versions
+----------+------------+
| Version  | Supported  |
+----------+------------+
| 1.1.x    |    YES     |
| <1.1.x   |    NO      |
+----------+------------+

===Reporting a Vulnerability===

If you discover a security vulnerability in Asset Companion, please do not create a public issue. Instead, please report it privately:

-Email: labs@agapemedia.co.in
-Or open a GitHub security advisory:
Go to your fork of Asset Companion → Security → New security advisory

We commit to investigating any report within 3 business days and will publish patches and advisories in a timely and transparent manner.

===Security Best Practices===

-No Remote Code
All JavaScript, CSS, and library dependencies are packaged within the extension. No code is loaded at runtime from third-party or CDN sources.

-No Data Collection
The extension does not transmit, collect, or persist user browsing data or extracted asset data outside the user's browser.

-Local-Only Asset Processing
All asset extraction (images, fonts, colors) are performed locally in the user’s browser session.

-Permissions
Only the minimal Chrome extension permissions required for functionality are used (see manifest.json).

-No Background Web Requests
The extension does not make unsolicited network requests or contact remote hosts for telemetry or updates.

===Disclosure Policy===

-Please provide as much detail as possible when reporting security issues (extension version, browser version, steps to reproduce, and any potential impact).
-We will acknowledge receipt within 72 hours and provide regular status updates as we investigate and patch the issue.

===Out of Scope===

-The following are generally not considered security issues:
-Asset extraction does not work on all websites (may be blocked by CSP or CORS)
-User-intended downloads saved to disk
-Features operating only within extension-granted permissions

Thank you for helping keep Asset Companion and its users secure!
