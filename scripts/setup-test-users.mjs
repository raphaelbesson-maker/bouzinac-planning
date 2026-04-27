import { execFileSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'

const TEST_PASSWORD = 'Bouzinac2026!'

const TEST_USERS = [
  { email: 'admin@bouzinac.fr', nom: 'Admin Test', role: 'Admin' },
  { email: 'adv@bouzinac.fr', nom: 'ADV Test', role: 'ADV' },
  { email: 'atelier@bouzinac.fr', nom: 'Atelier Test', role: 'Atelier' },
]

function parseEnvOutput(raw) {
  return Object.fromEntries(
    raw
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && line.includes('=') && !line.startsWith('Stopped services:'))
      .map((line) => {
        const [key, ...rest] = line.split('=')
        const value = rest.join('=').replace(/^"|"$/g, '')
        return [key, value]
      })
  )
}

function resolveLocalSupabaseEnv() {
  const apiUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SERVICE_ROLE_KEY

  if (apiUrl && serviceRoleKey) {
    return { apiUrl, serviceRoleKey }
  }

  const statusOutput = execFileSync('supabase', ['status', '-o', 'env'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  const env = parseEnvOutput(statusOutput)
  return {
    apiUrl: env.API_URL,
    serviceRoleKey: env.SERVICE_ROLE_KEY,
  }
}

async function upsertAuthUser(adminClient, user) {
  const { data: listed, error: listError } = await adminClient.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  })

  if (listError) throw listError

  const existing = listed.users.find((candidate) => candidate.email === user.email)

  if (existing) {
    const { data, error } = await adminClient.auth.admin.updateUserById(existing.id, {
      email: user.email,
      password: TEST_PASSWORD,
      email_confirm: true,
      user_metadata: { name: user.nom, role: user.role },
      app_metadata: { provider: 'email', providers: ['email'] },
    })

    if (error) throw error
    return data.user
  }

  const { data, error } = await adminClient.auth.admin.createUser({
    email: user.email,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: { name: user.nom, role: user.role },
    app_metadata: { provider: 'email', providers: ['email'] },
  })

  if (error) throw error
  return data.user
}

async function main() {
  const { apiUrl, serviceRoleKey } = resolveLocalSupabaseEnv()

  if (!apiUrl || !serviceRoleKey) {
    throw new Error(
      'Impossible de resoudre SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY. Lancez `supabase start` ou fournissez les variables d environnement.'
    )
  }

  const adminClient = createClient(apiUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const operateurs = []

  for (const user of TEST_USERS) {
    const authUser = await upsertAuthUser(adminClient, user)
    operateurs.push({ id: authUser.id, nom: user.nom, role: user.role })
  }

  const { error: upsertError } = await adminClient.from('operateurs').upsert(operateurs)

  if (upsertError) throw upsertError

  console.log('Comptes de test prets:')
  for (const user of TEST_USERS) {
    console.log(`- ${user.email} / ${TEST_PASSWORD} (${user.role})`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
