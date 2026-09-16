<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

// Controlled externally (opened from the admin sidebar item / app header button).
const open = defineModel<boolean>('open', { default: false })

const { user } = useUserSession()
const route = useRoute()
const toast = useToast()

const MAX_MESSAGE = 2000

const categoryItems = [
  { label: 'Bug', value: 'bug' },
  { label: 'Idea', value: 'idea' },
  { label: 'Question', value: 'question' },
  { label: 'Other', value: 'other' }
]

const schema = z.object({
  category: z.enum(['bug', 'idea', 'question', 'other']),
  message: z.string().min(5, 'Please add a little more detail').max(MAX_MESSAGE, 'Message is too long'),
  email: z.union([z.literal(''), z.string().email('Invalid email')])
})
type Schema = z.output<typeof schema>

const state = reactive<Schema>({
  category: 'idea',
  message: '',
  email: user.value?.email ?? ''
})

// Keep the prefilled email in sync if the session resolves after mount.
watch(() => user.value?.email, (e) => {
  if (!state.email && e) state.email = e
})

const loading = ref(false)

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true
  try {
    await $fetch('/api/feedback', {
      method: 'POST',
      body: {
        category: event.data.category,
        message: event.data.message,
        email: event.data.email,
        pageUrl: route.fullPath
      }
    })
    toast.add({ title: 'Thanks for your feedback!', description: 'We’ve sent it to our team.', color: 'success' })
    open.value = false
    state.category = 'idea'
    state.message = ''
  } catch (e: unknown) {
    const msg = (e as { data?: { statusMessage?: string } })?.data?.statusMessage ?? 'Could not send feedback'
    toast.add({ title: 'Error', description: msg, color: 'error' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Send feedback"
    description="Found a bug or have an idea? Let us know — it goes straight to our team."
  >
    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField label="Type" name="category">
          <USelect
            v-model="state.category"
            :items="categoryItems"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Message" name="message" :hint="`${state.message.length}/${MAX_MESSAGE}`">
          <UTextarea
            v-model="state.message"
            :rows="5"
            :maxlength="MAX_MESSAGE"
            autoresize
            class="w-full"
            placeholder="Tell us what's on your mind…"
          />
        </UFormField>

        <UFormField label="Your email" name="email" hint="Optional" help="So we can reply to you.">
          <UInput
            v-model="state.email"
            type="email"
            class="w-full"
            autocomplete="email"
            placeholder="name@example.com"
          />
        </UFormField>

        <div class="flex justify-end gap-2">
          <UButton
            label="Cancel"
            color="neutral"
            variant="subtle"
            @click="open = false"
          />
          <UButton
            label="Send feedback"
            color="primary"
            type="submit"
            :loading="loading"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
