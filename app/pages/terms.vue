<script setup lang="ts">
definePageMeta({ layout: false })

const updated = '14 August 2026'
const contact = 'lowcarbonalertadmin@gmail.com'

useSeoMeta({
  title: 'Terms of Service — Hiilivahti',
  description: 'The terms that govern your use of the Hiilivahti application.'
})
</script>

<template>
  <div class="min-h-screen bg-default text-default">
    <div class="max-w-2xl mx-auto px-4 py-12">
      <NuxtLink to="/" class="text-sm text-primary hover:underline">
        ← Hiilivahti
      </NuxtLink>

      <h1 class="mt-6 text-2xl font-semibold text-highlighted">
        Terms of Service
      </h1>
      <p class="mt-1 text-sm text-muted">
        Last updated: {{ updated }}
      </p>

      <div class="mt-8 space-y-8 text-sm leading-relaxed text-muted">
        <section>
          <p>
            These terms govern your use of Hiilivahti — Low Carbon Alerts (“the Service”). By creating an account or
            using the Service, you agree to these terms. If you do not agree, please do not use the Service.
          </p>
        </section>

        <section>
          <h2 class="text-base font-semibold text-highlighted mb-2">
            The Service
          </h2>
          <p>
            Hiilivahti is an educational application that provides information about electricity-grid
            carbon intensity and sends notifications about lower-carbon energy windows. The information is
            provided for general guidance only, may be inaccurate or delayed, and is not professional
            energy, financial, or legal advice. You are responsible for any decisions you make based on it.
          </p>
        </section>

        <section>
          <h2 class="text-base font-semibold text-highlighted mb-2">
            Your account
          </h2>
          <ul class="list-disc pl-5 space-y-1">
            <li>You must provide accurate information and keep your login credentials secure.</li>
            <li>You are responsible for activity that occurs under your account.</li>
            <li>
              Notify us promptly of any unauthorised use at
              <a :href="`mailto:${contact}`" class="text-primary hover:underline">{{ contact }}</a>.
            </li>
          </ul>
        </section>

        <section>
          <h2 class="text-base font-semibold text-highlighted mb-2">
            Acceptable use
          </h2>
          <p>You agree not to:</p>
          <ul class="list-disc pl-5 space-y-1 mt-2">
            <li>Use the Service for any unlawful purpose or in breach of these terms.</li>
            <li>Attempt to disrupt, attack, reverse-engineer, or gain unauthorised access to the Service or its data.</li>
            <li>Interfere with other users’ use of the Service.</li>
          </ul>
        </section>

        <section>
          <h2 class="text-base font-semibold text-highlighted mb-2">
            Availability
          </h2>
          <p>
            The Service is provided “as is” and “as available”, without warranties of any kind. We may
            change, suspend, or discontinue any part of the Service at any time without notice.
          </p>
        </section>

        <section>
          <h2 class="text-base font-semibold text-highlighted mb-2">
            Limitation of liability
          </h2>
          <p>
            To the fullest extent permitted by law, we are not liable for any indirect, incidental, or
            consequential damages, or for any loss arising from your use of, or reliance on, the Service.
          </p>
        </section>

        <section>
          <h2 class="text-base font-semibold text-highlighted mb-2">
            Your data
          </h2>
          <p>
            Our handling of your personal data is described in our
            <NuxtLink to="/privacy" class="text-primary hover:underline">Privacy Policy</NuxtLink>.
          </p>
        </section>

        <section>
          <h2 class="text-base font-semibold text-highlighted mb-2">
            Changes to these terms
          </h2>
          <p>
            We may update these terms from time to time. Continued use of the Service after changes take
            effect constitutes acceptance of the revised terms.
          </p>
        </section>

        <section>
          <h2 class="text-base font-semibold text-highlighted mb-2">
            Contact
          </h2>
          <p>
            Questions about these terms? Email
            <a :href="`mailto:${contact}`" class="text-primary hover:underline">{{ contact }}</a>.
          </p>
        </section>
      </div>

      <div class="mt-10 pt-6 border-t border-default text-sm text-muted">
        <NuxtLink to="/privacy" class="text-primary hover:underline">
          Privacy Policy
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
