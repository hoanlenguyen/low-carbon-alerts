<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const emit = defineEmits<{ created: [] }>()

const schema = z.object({
  name: z.string().min(2, 'Too short'),
  userName: z.string().min(3, 'Min 3 characters').max(60),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  password: z.string().min(8, 'Min 8 characters')
})
const open = ref(false)

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  name: '',
  userName: '',
  email: '',
  password: ''
})

const showPassword = ref(false)

// Build a strong random password (avoids look-alike chars like O/0, I/l).
function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*'
  const bytes = new Uint32Array(16)
  crypto.getRandomValues(bytes)
  state.password = Array.from(bytes, n => chars[n % chars.length]).join('')
  showPassword.value = true
}

const toast = useToast()
const creating = ref(false)

async function copyPassword() {
  if (!state.password) return
  await navigator.clipboard.writeText(state.password)
  toast.add({ title: 'Password copied', color: 'success' })
}

async function onSubmit(event: FormSubmitEvent<Schema>) {
  creating.value = true
  try {
    await $fetch('/api/admin/users', { method: 'POST', body: event.data })
    toast.add({ title: 'Consumer added', description: event.data.userName, color: 'success' })
    open.value = false
    state.name = ''
    state.userName = ''
    state.email = ''
    state.password = ''
    showPassword.value = false
    emit('created')
  } catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string } }
    toast.add({ title: err?.data?.statusMessage || 'Could not add consumer', color: 'error' })
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open" title="New consumer" description="Add a new consumer to the database">
    <UButton label="Add consumer" icon="i-lucide-user-plus" color="primary" />

    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField label="Name" name="name">
          <UInput v-model="state.name" placeholder="Jane Smith" class="w-full" />
        </UFormField>
        <UFormField label="Username" name="userName" hint="Login identity">
          <UInput v-model="state.userName" placeholder="jane01" class="w-full" />
        </UFormField>
        <UFormField label="Email" name="email" hint="Optional">
          <UInput v-model="state.email" placeholder="jane@example.com" class="w-full" />
        </UFormField>
        <UFormField label="Password" name="password">
          <div class="flex items-center gap-2">
            <UInput
              v-model="state.password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="At least 8 characters"
              class="flex-1"
            >
              <template #trailing>
                <UButton
                  :icon="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                  color="neutral"
                  variant="link"
                  size="xs"
                  :aria-label="showPassword ? 'Hide password' : 'Show password'"
                  @click="showPassword = !showPassword"
                />
                <UButton
                  v-if="state.password"
                  icon="i-lucide-copy"
                  color="neutral"
                  variant="link"
                  size="xs"
                  aria-label="Copy password"
                  @click="copyPassword"
                />
              </template>
            </UInput>
            <UButton
              icon="i-lucide-refresh-cw"
              color="neutral"
              variant="subtle"
              label="Generate"
              @click="generatePassword"
            />
          </div>
        </UFormField>
        <div class="flex justify-end gap-2">
          <UButton
            label="Cancel"
            color="neutral"
            variant="subtle"
            @click="open = false" />
          <UButton
            label="Create"
            color="primary"
            type="submit"
            :loading="creating" />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
