<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const emit = defineEmits<{ created: [] }>()
const toast = useToast()

const open = ref(false)

const schema = z.object({
  prefix: z.string().trim().min(1, 'Prefix is required').max(40).regex(/^[a-z0-9_-]+$/i, 'Letters, numbers, - or _ only'),
  count: z.number().int().min(1, 'At least 1').max(100, 'Max 100')
})
type Schema = z.output<typeof schema>
const state = reactive<Partial<Schema>>({ prefix: '', count: 10 })

const generating = ref(false)
const result = ref<{ userName: string, password: string }[] | null>(null)
const csvUrl = ref<string | null>(null)

const csvName = computed(() =>
  `consumers-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.csv`
)

function buildCsv(list: { userName: string, password: string }[]) {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`
  const csv = 'username,password\r\n' + list.map(u => `${esc(u.userName)},${esc(u.password)}`).join('\r\n')
  if (csvUrl.value) URL.revokeObjectURL(csvUrl.value)
  csvUrl.value = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
}

async function onSubmit(event: FormSubmitEvent<Schema>) {
  generating.value = true
  try {
    const res = await $fetch<{ count: number, users: { userName: string, password: string }[] }>(
      '/api/admin/users/bulk',
      { method: 'POST', body: event.data }
    )
    result.value = res.users
    buildCsv(res.users)
    toast.add({
      title: `${res.count} consumer${res.count === 1 ? '' : 's'} created`,
      description: 'Download the CSV — passwords are shown only once.',
      color: 'success'
    })
    emit('created')
  } catch (e: unknown) {
    const msg = (e as { data?: { statusMessage?: string } })?.data?.statusMessage ?? 'Could not generate consumers'
    toast.add({ title: 'Error', description: msg, color: 'error' })
  } finally {
    generating.value = false
  }
}

function reset() {
  result.value = null
  if (csvUrl.value) {
    URL.revokeObjectURL(csvUrl.value)
    csvUrl.value = null
  }
  state.count = 10
}
watch(open, (o) => { if (!o) reset() })
</script>

<template>
  <UModal
    v-model:open="open"
    title="Add multiple consumers"
    description="Generate several consumer accounts at once.">
    <UButton
      label="Add multiple consumers"
      icon="i-lucide-users"
      color="neutral"
      variant="subtle" />

    <template #body>
      <!-- Result: download CSV (passwords shown once) -->
      <div v-if="result" class="space-y-4">
        <div class="flex items-start gap-2 rounded-lg bg-success/10 px-3 py-2.5 text-success">
          <UIcon name="i-lucide-circle-check" class="size-4 shrink-0 mt-0.5" />
          <p class="text-sm leading-relaxed">
            {{ result.length }} consumer account{{ result.length === 1 ? '' : 's' }} created. Download the CSV now —
            the passwords are shown only once and can't be retrieved later.
          </p>
        </div>
        <div class="flex justify-end gap-2">
          <UButton
            label="Done"
            color="neutral"
            variant="subtle"
            @click="open = false" />
          <UButton
            :to="csvUrl ?? undefined"
            :download="csvName"
            external
            icon="i-lucide-download"
            color="primary">
            Download CSV
          </UButton>
        </div>
      </div>

      <!-- Form -->
      <UForm
        v-else
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit">
        <UFormField label="Username prefix" name="prefix" hint="e.g. demo → demo001, demo002…">
          <UInput v-model="state.prefix" class="w-full" />
        </UFormField>

        <UFormField label="How many?" name="count" hint="1–100">
          <UInputNumber
            v-model="state.count"
            :min="1"
            :max="100"
            class="w-full" />
        </UFormField>

        <div class="flex items-start gap-2 rounded-lg border border-dashed border-default bg-elevated/40 px-3 py-2.5">
          <UIcon name="i-lucide-info" class="size-4 shrink-0 mt-0.5 text-dimmed" />
          <p class="text-xs text-muted leading-relaxed">
            Accounts are created with random passwords and no email. You'll get a one-time CSV of
            usernames + passwords to distribute.
          </p>
        </div>

        <div class="flex justify-end gap-2">
          <UButton
            label="Cancel"
            color="neutral"
            variant="subtle"
            @click="open = false" />
          <UButton type="submit" icon="i-lucide-sparkles" :loading="generating">
            Generate
          </UButton>
        </div>
      </UForm>
    </template>
  </UModal>
</template>
