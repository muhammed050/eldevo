import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | ElDevo",
  description:
    "Learn how ElDevo handles information, cookies, analytics, search tools, and advertising.",
  alternates: {
    canonical: "https://eldevo.com/privacy-policy/",
  },
};

export default function Page() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-4xl font-bold">Privacy Policy</h1>

      <p className="mt-4 leading-7 text-slate-400">Last updated: August 16, 2026</p>

      <p className="mt-6 leading-7 text-slate-400">
        Welcome to ElDevo. This Privacy Policy explains how information may be collected, used, and
        protected when you visit or use the ElDevo website and its developer tools.
      </p>

      <p className="mt-3 leading-7 text-slate-400">
        By using ElDevo, you acknowledge that you have read and understood this Privacy Policy. If
        you do not agree with this policy, please discontinue use of the website.
      </p>

      {/* 1. Information We Collect */}
      <h2 className="mt-10 text-xl font-semibold">1. Information We Collect</h2>

      <p className="mt-3 leading-7 text-slate-400">
        ElDevo is designed to provide developer tools that can be used directly in your web browser.
        Depending on how you use the website, limited technical or usage information may be
        processed by ElDevo or by third-party services that support the website.
      </p>

      <p className="mt-3 leading-7 text-slate-400">
        Such information may include browser type, device information, operating system, IP address,
        approximate geographic location, referring pages, pages visited, interactions with the
        website, timestamps, and other standard technical information.
      </p>

      {/* 2. Tool Input */}
      <h2 className="mt-10 text-xl font-semibold">2. Tool Input and Processing</h2>

      <p className="mt-3 leading-7 text-slate-400">
        Many ElDevo tools are designed to process input directly in your browser. When a tool
        performs its operation locally, the input is not intentionally transmitted to an ElDevo
        application server for processing.
      </p>

      <p className="mt-3 leading-7 text-slate-400">
        However, you should always review the behavior of a particular tool before entering
        confidential information. Do not enter passwords, private keys, API keys, authentication
        tokens, financial information, personal information, or other sensitive data unless you
        understand how the relevant tool processes that information.
      </p>

      {/* 3. Cookies */}
      <h2 className="mt-10 text-xl font-semibold">3. Cookies and Similar Technologies</h2>

      <p className="mt-3 leading-7 text-slate-400">
        ElDevo and third-party service providers may use cookies, local storage, pixels, tags, or
        similar technologies to operate the website, remember preferences, understand website usage,
        improve performance, measure traffic, and support advertising.
      </p>

      <p className="mt-3 leading-7 text-slate-400">
        Some cookies or similar technologies may be placed by third-party providers rather than
        directly by ElDevo. You can control or delete cookies through your browser settings.
        Disabling certain cookies may affect some website functionality.
      </p>

      {/* 4. Google Analytics */}
      <h2 className="mt-10 text-xl font-semibold">4. Google Analytics</h2>

      <p className="mt-3 leading-7 text-slate-400">
        ElDevo may use Google Analytics to understand how visitors use the website and to improve
        its performance, content, and user experience.
      </p>

      <p className="mt-3 leading-7 text-slate-400">
        Google Analytics may collect information such as pages visited, interactions with the
        website, browser and device information, approximate geographic information, traffic
        sources, and other technical or usage data.
      </p>

      <p className="mt-3 leading-7 text-slate-400">
        Google Analytics may use cookies and similar technologies to help measure website usage.
        Information processed through Google Analytics is handled by Google according to Google's
        applicable terms and privacy policies.
      </p>

      <p className="mt-3 leading-7 text-slate-400">
        Where required by applicable law, ElDevo may request user consent before enabling analytics
        technologies or provide appropriate privacy controls.
      </p>

      {/* 5. Google Search Console */}
      <h2 className="mt-10 text-xl font-semibold">5. Google Search Console</h2>

      <p className="mt-3 leading-7 text-slate-400">
        ElDevo may use Google Search Console to monitor the website&apos;s presence and performance
        in Google Search, identify technical problems, understand search visibility, and improve the
        website.
      </p>

      <p className="mt-3 leading-7 text-slate-400">
        Google Search Console is primarily an administrative and search performance service. ElDevo
        does not use Search Console as a general visitor analytics service.
      </p>

      {/* 6. Advertising */}
      <h2 className="mt-10 text-xl font-semibold">6. Advertising</h2>

      <p className="mt-3 leading-7 text-slate-400">
        ElDevo may introduce advertising on the website in the future through third-party
        advertising providers, including Google AdSense.
      </p>

      <p className="mt-3 leading-7 text-slate-400">
        If advertising services are enabled, advertising providers may use cookies or similar
        technologies to deliver, personalize, measure, or limit advertising, subject to applicable
        laws, user consent requirements, and the providers&apos; policies.
      </p>

      <p className="mt-3 leading-7 text-slate-400">
        Advertising practices and available privacy controls may vary depending on your location,
        applicable regulations, and your consent choices.
      </p>

      {/* 7. Third-Party Services */}
      <h2 className="mt-10 text-xl font-semibold">7. Third-Party Services</h2>

      <p className="mt-3 leading-7 text-slate-400">
        ElDevo may rely on third-party providers for hosting, security, analytics, search
        performance monitoring, content delivery, advertising, and other website functionality.
      </p>

      <p className="mt-3 leading-7 text-slate-400">
        Third-party providers may process information according to their own privacy policies, terms
        of service, and applicable laws. ElDevo recommends reviewing the privacy policies of
        relevant third-party services when appropriate.
      </p>

      {/* 8. How We Use Information */}
      <h2 className="mt-10 text-xl font-semibold">8. How Information May Be Used</h2>

      <p className="mt-3 leading-7 text-slate-400">
        Information processed through ElDevo or its supporting services may be used to:
      </p>

      <ul className="mt-3 list-disc space-y-2 pl-6 leading-7 text-slate-400">
        <li>Operate and maintain the website.</li>
        <li>Provide and improve developer tools.</li>
        <li>Understand website usage and performance.</li>
        <li>Identify and resolve technical problems.</li>
        <li>Protect the website against abuse, fraud, and security threats.</li>
        <li>Measure traffic and search performance.</li>
        <li>Support advertising where advertising is enabled.</li>
        <li>Comply with applicable legal obligations.</li>
      </ul>

      {/* 9. Data Security */}
      <h2 className="mt-10 text-xl font-semibold">9. Data Security</h2>

      <p className="mt-3 leading-7 text-slate-400">
        We take reasonable measures to protect the website and information processed through our
        services. However, no website, internet transmission, or electronic storage system can be
        guaranteed to be completely secure.
      </p>

      <p className="mt-3 leading-7 text-slate-400">
        Users are responsible for taking reasonable precautions when using online developer tools
        and should avoid submitting sensitive information unless they understand the applicable
        processing model.
      </p>

      {/* 10. Data Retention */}
      <h2 className="mt-10 text-xl font-semibold">10. Data Retention</h2>

      <p className="mt-3 leading-7 text-slate-400">
        ElDevo does not intentionally retain locally processed tool input on an ElDevo application
        server when the relevant tool performs its operation entirely within the browser.
      </p>

      <p className="mt-3 leading-7 text-slate-400">
        Information processed by third-party services, such as analytics, hosting, security, or
        advertising providers, may be retained according to their respective policies and applicable
        legal requirements.
      </p>

      {/* 11. Children's Privacy */}
      <h2 className="mt-10 text-xl font-semibold">11. Children&apos;s Privacy</h2>

      <p className="mt-3 leading-7 text-slate-400">
        ElDevo is not intended to knowingly collect personal information from children. If you
        believe that a child has provided personal information through the website, please contact
        us so that appropriate action can be taken.
      </p>

      {/* 12. Your Rights */}
      <h2 className="mt-10 text-xl font-semibold">12. Your Privacy Rights and Choices</h2>

      <p className="mt-3 leading-7 text-slate-400">
        Depending on your location and applicable law, you may have rights regarding your personal
        information. These rights may include requesting access to, correction of, deletion of, or
        restriction of certain processing of your personal information.
      </p>

      <p className="mt-3 leading-7 text-slate-400">
        You may also have choices regarding cookies, analytics, and personalized advertising.
        Available rights and controls may vary depending on your jurisdiction and the services being
        used.
      </p>

      {/* 13. International Users */}
      <h2 className="mt-10 text-xl font-semibold">13. International Users</h2>

      <p className="mt-3 leading-7 text-slate-400">
        ElDevo may be accessed by users from different countries. Information processed by ElDevo or
        its third-party providers may be transferred to and processed in countries other than the
        country where you are located, subject to applicable laws and the relevant provider&apos;s
        policies.
      </p>

      {/* 14. Policy Changes */}
      <h2 className="mt-10 text-xl font-semibold">14. Changes to This Privacy Policy</h2>

      <p className="mt-3 leading-7 text-slate-400">
        We may update this Privacy Policy from time to time to reflect changes to the website,
        services, technology, or applicable legal requirements.
      </p>

      <p className="mt-3 leading-7 text-slate-400">
        When changes are made, the updated version will be posted on this page and the &quot;Last
        updated&quot; date will be revised.
      </p>

      {/* 15. Contact */}
      <h2 className="mt-10 text-xl font-semibold">15. Contact Us</h2>

      <p className="mt-3 leading-7 text-slate-400">
        If you have questions, concerns, or requests regarding this Privacy Policy or ElDevo&apos;s
        privacy practices, please contact us through the contact information provided on the ElDevo
        website.
      </p>
    </article>
  );
}
