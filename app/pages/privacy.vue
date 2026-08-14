<script setup lang="ts">
definePageMeta({ layout: false })

const updated = '14 August 2026'
const contact = 'lowcarbonalertadmin@gmail.com'

useSeoMeta({
  title: 'Privacy Policy — Low Carbon Alerts',
  description: 'How Low Carbon Alerts collects, uses, and protects your personal data.'
})
</script>

<template>
  <div class="min-h-screen bg-default text-default">
    <div class="max-w-2xl mx-auto px-4 py-12">
      <NuxtLink to="/" class="text-sm text-primary hover:underline">
        ← Low Carbon Alerts
      </NuxtLink>

      <h1 class="mt-6 text-2xl font-semibold text-highlighted">
        Privacy Policy
      </h1>
      <p class="mt-1 text-sm text-muted">
        Last updated: {{ updated }}
      </p>

      <div class="mt-8 space-y-8 text-sm leading-relaxed text-muted">
        <section>
          <p>
            Low Carbon Alerts (“the Service”, “we”, “us”) is an educational application that tracks the
            carbon intensity of the electricity grid and notifies registered users when lower-carbon
            energy windows are available. This policy explains what personal data we collect, why, and
            the choices you have. If you have questions, contact us at
            <a :href="`mailto:${contact}`" class="text-primary hover:underline">{{ contact }}</a>.
          </p>
        </section>

        <section>
          <h2 class="text-base font-semibold text-highlighted mb-2">
            Data we collect
          </h2>
          <ul class="list-disc pl-5 space-y-1">
            <li><strong>Account details</strong> — your name, email address, and a securely hashed password (we never store passwords in plain text).</li>
            <li><strong>Google sign-in data</strong> — if you sign in with Google, we receive your Google account ID, email, name, and profile picture.</li>
            <li><strong>Energy profile</strong> — optional details you provide during onboarding (such as housing type, appliances, and your active hours) used to personalise recommendations.</li>
            <li><strong>Usage data</strong> — notifications sent to and read by you, and, if you enable push notifications, your device’s messaging token.</li>
            <li><strong>Technical data</strong> — a secure session cookie that keeps you signed in.</li>
          </ul>
        </section>

        <section>
          <h2 class="text-base font-semibold text-highlighted mb-2">
            How we use your data
          </h2>
          <ul class="list-disc pl-5 space-y-1">
            <li>To create and secure your account and keep you signed in.</li>
            <li>To send low-carbon alerts, weekly summaries, and account emails (such as password resets).</li>
            <li>To personalise the recommendations and content you see.</li>
            <li>To operate, maintain, and improve the Service.</li>
          </ul>
          <p class="mt-2">
            Our legal bases (under the EU GDPR) are your consent, the performance of the service you
            requested, and our legitimate interest in operating and improving the Service.
          </p>
        </section>

        <section>
          <h2 class="text-base font-semibold text-highlighted mb-2">
            Service providers
          </h2>
          <p>We share the minimum data necessary with trusted providers who process it on our behalf:</p>
          <ul class="list-disc pl-5 space-y-1 mt-2">
            <li><strong>Google</strong> — sign-in (OAuth) and sending account emails via the Gmail API; push notifications via Firebase Cloud Messaging.</li>
            <li><strong>Cloudflare</strong> — application hosting and database.</li>
            <li><strong>OpenAI</strong> — generating the wording of personalised messages from limited, profile-derived context.</li>
          </ul>
          <p class="mt-2">
            Some providers may process data outside the European Economic Area under appropriate
            safeguards. We do not sell your personal data.
          </p>
        </section>

        <section>
          <h2 class="text-base font-semibold text-highlighted mb-2">
            Cookies
          </h2>
          <p>
            We use a single, essential first-party cookie to keep you signed in. We do not use
            third-party advertising or tracking cookies.
          </p>
        </section>

        <section>
          <h2 class="text-base font-semibold text-highlighted mb-2">
            Data retention
          </h2>
          <p>
            We keep your data for as long as your account is active. You may ask us to delete your
            account and associated data at any time.
          </p>
        </section>

        <section>
          <h2 class="text-base font-semibold text-highlighted mb-2">
            Your rights
          </h2>
          <p>
            Subject to applicable law, you may request access to, correction of, or deletion of your
            personal data, object to or restrict its processing, and request a copy of your data. To
            exercise any of these rights, email
            <a :href="`mailto:${contact}`" class="text-primary hover:underline">{{ contact }}</a>.
          </p>
        </section>

        <section>
          <h2 class="text-base font-semibold text-highlighted mb-2">
            Children
          </h2>
          <p>The Service is not directed to children under 16, and we do not knowingly collect their data.</p>
        </section>

        <section>
          <h2 class="text-base font-semibold text-highlighted mb-2">
            Changes to this policy
          </h2>
          <p>
            We may update this policy from time to time. Material changes will be reflected by the
            “Last updated” date above.
          </p>
        </section>

        <section>
          <h2 class="text-base font-semibold text-highlighted mb-2">
            Contact
          </h2>
          <p>
            Questions about this policy or your data? Email
            <a :href="`mailto:${contact}`" class="text-primary hover:underline">{{ contact }}</a>.
          </p>
        </section>
      </div>

      <div class="mt-10 pt-6 border-t border-default text-sm text-muted">
        <NuxtLink to="/terms" class="text-primary hover:underline">
          Terms of Service
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
