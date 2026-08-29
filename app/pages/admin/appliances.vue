<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'auth'
})

type Appliance = {
  id: string
  slug: string
  name: string
  icon: string
  category: 'wet' | 'heating' | 'ev' | 'cooking' | 'leisure' | 'other'
  flexibility: 'high' | 'medium' | 'low'
  typicalPowerKw: number | null
  typicalDurationMin: number | null
  description: string | null
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string | null
}

const toast = useToast()
const { data, status: fetchStatus, refresh } = await useFetch<Appliance[]>(
  '/api/admin/appliances',
  { lazy: true }
)

const categoryOptions = [
  { label: 'Wet', value: 'wet' },
  { label: 'Heating', value: 'heating' },
  { label: 'EV', value: 'ev' },
  { label: 'Cooking', value: 'cooking' },
  { label: 'Leisure', value: 'leisure' },
  { label: 'Other', value: 'other' }
]
const flexibilityOptions = [
  { label: 'High', value: 'high' },
  { label: 'Medium', value: 'medium' },
  { label: 'Low', value: 'low' }
]

const searchQuery = ref('')
const rows = computed(() => {
  const list = data.value ?? []
  if (!searchQuery.value) return list
  const q = searchQuery.value.toLowerCase()
  return list.filter(a => a.name.toLowerCase().includes(q) || a.category.includes(q))
})

// ── Pagination (client-side) ─────────────────────────────────────────────────
const pageSize = 10
const pageIndex = ref(0)
watch(searchQuery, () => { pageIndex.value = 0 })
const paginated = computed(() =>
  rows.value.slice(pageIndex.value * pageSize, (pageIndex.value + 1) * pageSize)
)

// ── Create / edit modal ──────────────────────────────────────────────────────
const showModal = ref(false)
const editingId = ref<string | null>(null)
const saving = ref(false)
const form = reactive({
  name: '',
  icon: 'i-lucide-plug',
  category: 'other' as Appliance['category'],
  flexibility: 'medium' as Appliance['flexibility'],
  typicalPowerKw: null as number | null,
  typicalDurationMin: null as number | null,
  description: '',
  sortOrder: 0,
  isActive: true
})

function resetForm() {
  Object.assign(form, {
    name: '', icon: 'i-lucide-plug', category: 'other', flexibility: 'medium',
    typicalPowerKw: null, typicalDurationMin: null, description: '', sortOrder: 0, isActive: true
  })
}

function openCreate() {
  editingId.value = null
  resetForm()
  showModal.value = true
}

function openEdit(a: Appliance) {
  editingId.value = a.id
  Object.assign(form, {
    name: a.name, icon: a.icon, category: a.category, flexibility: a.flexibility,
    typicalPowerKw: a.typicalPowerKw, typicalDurationMin: a.typicalDurationMin,
    description: a.description ?? '', sortOrder: a.sortOrder, isActive: a.isActive
  })
  showModal.value = true
}

async function save() {
  if (form.name.trim().length < 2) {
    toast.add({ title: 'Name is too short', color: 'error' })
    return
  }
  saving.value = true
  try {
    const body = {
      name: form.name.trim(),
      icon: form.icon.trim(),
      category: form.category,
      flexibility: form.flexibility,
      typicalPowerKw: form.typicalPowerKw,
      typicalDurationMin: form.typicalDurationMin,
      description: form.description.trim() || null,
      sortOrder: form.sortOrder,
      isActive: form.isActive
    }
    if (editingId.value) {
      await $fetch(`/api/admin/appliances/${editingId.value}`, { method: 'PATCH', body })
      toast.add({ title: 'Appliance updated', color: 'success' })
    } else {
      await $fetch('/api/admin/appliances', { method: 'POST', body })
      toast.add({ title: 'Appliance created', color: 'success' })
    }
    showModal.value = false
    await refresh()
  } catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string } }
    toast.add({ title: err?.data?.statusMessage || 'Save failed', color: 'error' })
  } finally {
    saving.value = false
  }
}

// ── Delete ───────────────────────────────────────────────────────────────────
const deleteId = ref<string | null>(null)
const deleting = ref(false)
const deleteTarget = computed(() => (data.value ?? []).find(a => a.id === deleteId.value) ?? null)

async function confirmDelete() {
  if (!deleteId.value) return
  deleting.value = true
  try {
    await $fetch(`/api/admin/appliances/${deleteId.value}`, { method: 'DELETE' })
    toast.add({ title: 'Appliance deleted', color: 'success' })
    deleteId.value = null
    await refresh()
  } catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string } }
    toast.add({ title: err?.data?.statusMessage || 'Delete failed', color: 'error' })
  } finally {
    deleting.value = false
  }
}

const flexColor = (f: string) => (f === 'high' ? 'success' : f === 'medium' ? 'warning' : 'neutral')
</script>

<template>
  <UDashboardPanel id="appliances">
    <template #header>
      <UDashboardNavbar title="Appliances">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <!-- Toolbar -->
      <div class="flex flex-wrap items-center justify-between gap-2 mb-5">
        <UInput
          v-model="searchQuery"
          class="w-full sm:max-w-xs"
          icon="i-lucide-search"
          placeholder="Search name or category…"
        />
        <UButton icon="i-lucide-plus" @click="openCreate">
          Add appliance
        </UButton>
      </div>

      <!-- Table -->
      <div class="overflow-x-auto rounded-lg border border-default">
        <table class="w-full text-sm border-separate border-spacing-0">
          <thead>
            <tr class="bg-elevated/50">
              <th class="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-dimmed border-b border-default">
                Appliance
              </th>
              <th class="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-dimmed border-b border-default">
                Category
              </th>
              <th class="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-dimmed border-b border-default">
                Flexibility
              </th>
              <th class="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-dimmed border-b border-default">
                Power
              </th>
              <th class="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-dimmed border-b border-default">
                Duration
              </th>
              <th class="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-dimmed border-b border-default">
                Order
              </th>
              <th class="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-dimmed border-b border-default">
                Active
              </th>
              <th class="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-dimmed border-b border-default">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="fetchStatus === 'pending'">
              <td colspan="8" class="px-4 py-8 text-center text-sm text-muted">
                Loading…
              </td>
            </tr>
            <tr v-else-if="rows.length === 0">
              <td colspan="8" class="px-4 py-8 text-center text-sm text-muted">
                No appliances found.
              </td>
            </tr>
            <tr
              v-for="a in paginated"
              v-else
              :key="a.id"
              class="group hover:bg-elevated/40 transition-colors"
              :class="{ 'opacity-60': !a.isActive }"
            >
              <!-- Appliance -->
              <td class="px-4 py-3 border-b border-default">
                <div class="flex items-center gap-3">
                  <div class="size-8 rounded-lg bg-elevated flex items-center justify-center shrink-0">
                    <UIcon :name="a.icon" class="size-4 text-primary" />
                  </div>
                  <div class="min-w-0">
                    <p class="font-medium text-highlighted truncate">
                      {{ a.name }}
                    </p>
                    <p class="text-xs text-dimmed font-mono truncate">
                      {{ a.slug }}
                    </p>
                  </div>
                </div>
              </td>
              <!-- Category -->
              <td class="px-4 py-3 border-b border-default">
                <UBadge color="neutral" variant="subtle" class="capitalize">
                  {{ a.category }}
                </UBadge>
              </td>
              <!-- Flexibility -->
              <td class="px-4 py-3 border-b border-default">
                <UBadge :color="flexColor(a.flexibility)" variant="subtle" class="capitalize">
                  {{ a.flexibility }}
                </UBadge>
              </td>
              <!-- Power -->
              <td class="px-4 py-3 border-b border-default text-right tabular-nums text-muted">
                {{ a.typicalPowerKw != null ? `${a.typicalPowerKw} kW` : '—' }}
              </td>
              <!-- Duration -->
              <td class="px-4 py-3 border-b border-default text-right tabular-nums text-muted">
                {{ a.typicalDurationMin != null ? `${a.typicalDurationMin} min` : '—' }}
              </td>
              <!-- Order -->
              <td class="px-4 py-3 border-b border-default text-right tabular-nums text-dimmed">
                {{ a.sortOrder }}
              </td>
              <!-- Active -->
              <td class="px-4 py-3 border-b border-default">
                <UBadge
                  :color="a.isActive ? 'success' : 'neutral'"
                  variant="subtle"
                >
                  {{ a.isActive ? 'Active' : 'Inactive' }}
                </UBadge>
              </td>
              <!-- Actions -->
              <td class="px-3 py-3 border-b border-default">
                <div class="flex items-center justify-end gap-1">
                  <UTooltip text="Edit">
                    <UButton
                      icon="i-lucide-pencil"
                      color="neutral"
                      variant="ghost"
                      size="xs"
                      aria-label="Edit appliance"
                      @click="openEdit(a)"
                    />
                  </UTooltip>
                  <UTooltip text="Delete">
                    <UButton
                      icon="i-lucide-trash-2"
                      color="error"
                      variant="ghost"
                      size="xs"
                      aria-label="Delete appliance"
                      @click="deleteId = a.id"
                    />
                  </UTooltip>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="flex items-center justify-between gap-3 pt-4">
        <p class="text-xs text-muted tabular-nums">
          <template v-if="rows.length > 0">
            {{ pageIndex * pageSize + 1 }}–{{ Math.min((pageIndex + 1) * pageSize, rows.length) }} of {{ rows.length }}
          </template>
          <template v-else>
            0 results
          </template>
        </p>
        <UPagination
          v-if="rows.length > pageSize"
          :page="pageIndex + 1"
          :items-per-page="pageSize"
          :total="rows.length"
          size="xs"
          @update:page="(p: number) => { pageIndex = p - 1 }"
        />
      </div>

      <!-- Column guide -->
      <dl class="mt-4 space-y-1 text-xs text-muted">
        <div class="flex gap-1.5">
          <dt class="font-medium text-dimmed shrink-0">
            Flexibility —
          </dt>
          <dd>how easily this load can shift to a cleaner hour; the smart alert prefers high-flexibility appliances.</dd>
        </div>
        <div class="flex gap-1.5">
          <dt class="font-medium text-dimmed shrink-0">
            Power —
          </dt>
          <dd>typical power draw in kW, used to estimate the carbon impact of shifting the load.</dd>
        </div>
        <div class="flex gap-1.5">
          <dt class="font-medium text-dimmed shrink-0">
            Duration —
          </dt>
          <dd>typical run length in minutes, which helps size the low-carbon window a recommendation targets.</dd>
        </div>
        <div class="flex gap-1.5">
          <dt class="font-medium text-dimmed shrink-0">
            Order —
          </dt>
          <dd>the order appliances appear in the onboarding picker (lower numbers first).</dd>
        </div>
        <div class="flex gap-1.5">
          <dt class="font-medium text-dimmed shrink-0">
            Active —
          </dt>
          <dd>inactive appliances stay in the catalog but are hidden from the end-user onboarding picker. Toggle it from Edit.</dd>
        </div>
      </dl>

      <!-- Create / edit modal -->
      <UModal
        v-model:open="showModal"
        :title="editingId ? 'Edit appliance' : 'New appliance'"
        description="Appliances shown to end-users during onboarding.">
        <template #body>
          <div class="space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <UFormField label="Name" required>
                <UInput v-model="form.name" placeholder="Dishwasher" class="w-full" />
              </UFormField>
              <UFormField label="Icon" hint="Lucide name">
                <UInput v-model="form.icon" placeholder="i-lucide-plug" class="w-full">
                  <template #trailing>
                    <UIcon :name="form.icon || 'i-lucide-help-circle'" class="size-4 text-dimmed" />
                  </template>
                </UInput>
              </UFormField>
              <UFormField label="Category">
                <USelect v-model="form.category" :items="categoryOptions" class="w-full" />
              </UFormField>
              <UFormField label="Flexibility">
                <USelect v-model="form.flexibility" :items="flexibilityOptions" class="w-full" />
              </UFormField>
              <UFormField label="Typical power (kW)">
                <UInputNumber
                  v-model="form.typicalPowerKw"
                  :min="0"
                  :step="0.5"
                  class="w-full" />
              </UFormField>
              <UFormField label="Typical duration (min)">
                <UInputNumber
                  v-model="form.typicalDurationMin"
                  :min="0"
                  :step="15"
                  class="w-full" />
              </UFormField>
            </div>

            <UFormField label="Description" hint="Shown as helper text">
              <UTextarea
                v-model="form.description"
                :rows="2"
                class="w-full"
                placeholder="Short tip about shifting this load…" />
            </UFormField>

            <div class="flex items-end gap-4">
              <UFormField label="Sort order">
                <UInputNumber
                  v-model="form.sortOrder"
                  :min="0"
                  :step="10"
                  class="w-32" />
              </UFormField>
              <UFormField label="Active" class="pb-2">
                <USwitch v-model="form.isActive" />
              </UFormField>
            </div>

            <div class="flex justify-end gap-2 pt-2">
              <UButton
                label="Cancel"
                color="neutral"
                variant="subtle"
                :disabled="saving"
                @click="showModal = false" />
              <UButton :label="editingId ? 'Save changes' : 'Create'" :loading="saving" @click="save" />
            </div>
          </div>
        </template>
      </UModal>

      <!-- Delete confirmation -->
      <UModal
        :open="!!deleteId"
        :title="`Delete ${deleteTarget?.name ?? 'appliance'}?`"
        description="This removes it from the catalog and the onboarding picker. Existing consumer profiles keep the name."
        @update:open="(v: boolean) => { if (!v) deleteId = null }">
        <template #body>
          <div class="flex justify-end gap-2">
            <UButton
              label="Cancel"
              color="neutral"
              variant="subtle"
              :disabled="deleting"
              @click="deleteId = null" />
            <UButton
              label="Delete"
              color="error"
              :loading="deleting"
              @click="confirmDelete" />
          </div>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>
