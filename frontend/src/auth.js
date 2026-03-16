const ADVISOR_KEY = 'aria_advisor_session'
const CLIENT_KEY  = 'aria_client_session'

// ─── Advisor ─────────────────────────────────────────────────────────────────

export const advisorLogin = (username, password) => {
  if (username === 'rm_demo' && password === 'aria2026') {
    localStorage.setItem(ADVISOR_KEY, JSON.stringify({ username, role: 'advisor' }))
    return true
  }
  return false
}

export const advisorLogout = () => localStorage.removeItem(ADVISOR_KEY)

export const getAdvisorSession = () => {
  try { return JSON.parse(localStorage.getItem(ADVISOR_KEY)) } catch { return null }
}

// ─── Client ──────────────────────────────────────────────────────────────────

const CLIENT_DEMO_MAP = {
  'priya':   { clientId: 1,  clientName: 'Priya Sharma' },
  'rahul':   { clientId: 2,  clientName: 'Rahul Mehta' },
  'anita':   { clientId: 3,  clientName: 'Anita Patel' },
  'vikram':  { clientId: 4,  clientName: 'Vikram Singh' },
  'sunita':  { clientId: 5,  clientName: 'Sunita Reddy' },
  'arjun':   { clientId: 6,  clientName: 'Arjun Kapoor' },
  'meera':   { clientId: 7,  clientName: 'Meera Nair' },
  'rajesh':  { clientId: 8,  clientName: 'Rajesh Kumar' },
  'pooja':   { clientId: 9,  clientName: 'Pooja Gupta' },
  'sanjay':  { clientId: 10, clientName: 'Sanjay Joshi' },
}

const CLIENT_DEMO_PIN = '1234'

export const clientLogin = (identifier, pin) => {
  const key = identifier.toLowerCase().trim()
  if (pin === CLIENT_DEMO_PIN && CLIENT_DEMO_MAP[key]) {
    const { clientId, clientName } = CLIENT_DEMO_MAP[key]
    localStorage.setItem(CLIENT_KEY, JSON.stringify({ clientId, clientName, role: 'client' }))
    return { success: true, clientId }
  }
  return { success: false }
}

export const getClientSession = () => {
  try { return JSON.parse(localStorage.getItem(CLIENT_KEY)) } catch { return null }
}

export const clientLogout = () => localStorage.removeItem(CLIENT_KEY)
