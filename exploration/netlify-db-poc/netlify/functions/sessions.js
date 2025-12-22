/**
 * Netlify DB POC: Session Configuration API
 *
 * Demonstrates reading/writing session data to Netlify DB (Neon PostgreSQL)
 *
 * GET  /.netlify/functions/sessions - Retrieve all sessions
 * POST /.netlify/functions/sessions - Update sessions (password protected)
 */

import { neon } from '@netlify/neon'

// CORS headers for all responses
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json'
}

export default async (req, context) => {
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return new Response('', { status: 200, headers })
  }

  // Initialize Neon SQL client (auto-uses NETLIFY_DATABASE_URL)
  const sql = neon(process.env.DATABASE_URL)

  // ============================================================
  // GET - Retrieve sessions
  // ============================================================
  if (req.method === 'GET') {
    try {
      console.log('GET /sessions - Fetching from Netlify DB')

      // Query sessions ordered by sort_order
      const sessions = await sql`
        SELECT id, label, start_time, end_time, display, enabled, sort_order
        FROM sessions
        ORDER BY sort_order ASC
      `

      // Query metadata
      const metadataRows = await sql`SELECT key, value FROM metadata`
      const metadata = Object.fromEntries(
        metadataRows.map(row => [row.key, row.value])
      )

      console.log(`Retrieved ${sessions.length} sessions from database`)

      return new Response(
        JSON.stringify({
          sessions: sessions.map(s => ({
            id: s.id,
            label: s.label,
            startTime: s.start_time,
            endTime: s.end_time,
            display: s.display,
            enabled: s.enabled,
            sortOrder: s.sort_order
          })),
          metadata: {
            lastModified: metadata.last_modified,
            modifiedBy: metadata.modified_by,
            version: parseInt(metadata.version)
          }
        }),
        { status: 200, headers }
      )
    } catch (error) {
      console.error('Error fetching sessions:', error)

      return new Response(
        JSON.stringify({
          error: 'Database Error',
          message: error.message,
          details: 'Failed to retrieve sessions from database'
        }),
        { status: 500, headers }
      )
    }
  }

  // ============================================================
  // POST - Update sessions (password protected)
  // ============================================================
  if (req.method === 'POST') {
    try {
      // 1. Verify password
      const authHeader = req.headers.get('authorization')
      const password = authHeader?.replace('Bearer ', '')

      if (!password || password !== process.env.ADMIN_PASSWORD) {
        console.log('Authentication failed: Invalid password')
        return new Response(
          JSON.stringify({
            error: 'Unauthorized',
            message: 'Invalid password'
          }),
          { status: 401, headers }
        )
      }

      // 2. Parse request body
      const body = await req.json()
      const { sessions } = body

      if (!sessions || !Array.isArray(sessions)) {
        return new Response(
          JSON.stringify({
            error: 'Bad Request',
            message: 'Sessions array is required'
          }),
          { status: 400, headers }
        )
      }

      // 3. Validate sessions
      const validationErrors = validateSessions(sessions)
      if (validationErrors.length > 0) {
        return new Response(
          JSON.stringify({
            error: 'Validation Failed',
            details: validationErrors
          }),
          { status: 400, headers }
        )
      }

      console.log(`POST /sessions - Updating ${sessions.length} sessions`)

      // 4. Update database in transaction
      await sql.transaction(async (sql) => {
        // Delete all existing sessions
        await sql`DELETE FROM sessions`

        // Insert new sessions
        for (const session of sessions) {
          await sql`
            INSERT INTO sessions (id, label, start_time, end_time, display, enabled, sort_order)
            VALUES (
              ${session.id},
              ${session.label},
              ${session.startTime},
              ${session.endTime},
              ${session.display},
              ${session.enabled},
              ${session.sortOrder || 0}
            )
          `
        }

        // Update metadata
        const currentVersion = await sql`SELECT value FROM metadata WHERE key = 'version'`
        const newVersion = parseInt(currentVersion[0]?.value || '0') + 1

        await sql`
          UPDATE metadata
          SET value = ${new Date().toISOString()}
          WHERE key = 'last_modified'
        `

        await sql`
          UPDATE metadata
          SET value = 'admin'
          WHERE key = 'modified_by'
        `

        await sql`
          UPDATE metadata
          SET value = ${newVersion.toString()}
          WHERE key = 'version'
        `
      })

      console.log('Sessions updated successfully')

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Sessions updated successfully',
          sessionsUpdated: sessions.length
        }),
        { status: 200, headers }
      )
    } catch (error) {
      console.error('Error updating sessions:', error)

      return new Response(
        JSON.stringify({
          error: 'Database Error',
          message: error.message,
          details: 'Failed to update sessions in database'
        }),
        { status: 500, headers }
      )
    }
  }

  // Unsupported HTTP method
  return new Response(
    JSON.stringify({
      error: 'Method Not Allowed',
      message: `HTTP method ${req.method} is not supported`
    }),
    { status: 405, headers }
  )
}

/**
 * Validate sessions array
 * Returns array of error messages (empty if valid)
 */
function validateSessions(sessions) {
  const errors = []

  if (sessions.length === 0) {
    errors.push('At least one session is required')
    return errors
  }

  const enabledCount = sessions.filter(s => s.enabled).length
  if (enabledCount === 0) {
    errors.push('At least one session must be enabled')
  }

  const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/

  sessions.forEach((session, index) => {
    const prefix = `Session ${index + 1}`

    if (!session.id) {
      errors.push(`${prefix}: ID is required`)
    }

    if (!session.label || session.label.trim() === '') {
      errors.push(`${prefix}: Label is required`)
    }

    if (!session.startTime) {
      errors.push(`${prefix}: Start time is required`)
    } else if (!timeRegex.test(session.startTime)) {
      errors.push(`${prefix}: Invalid start time format (must be HH:MM)`)
    }

    if (!session.endTime) {
      errors.push(`${prefix}: End time is required`)
    } else if (!timeRegex.test(session.endTime)) {
      errors.push(`${prefix}: Invalid end time format (must be HH:MM)`)
    }

    if (session.startTime && session.endTime && session.startTime >= session.endTime) {
      errors.push(`${prefix}: Start time must be before end time`)
    }

    if (!session.display || session.display.trim() === '') {
      errors.push(`${prefix}: Display format is required`)
    }

    if (typeof session.enabled !== 'boolean') {
      errors.push(`${prefix}: Enabled must be true or false`)
    }
  })

  const ids = sessions.map(s => s.id)
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index)
  if (duplicateIds.length > 0) {
    errors.push(`Duplicate session IDs: ${duplicateIds.join(', ')}`)
  }

  return errors
}

// Export config for Netlify Functions v2
export const config = {
  path: "/sessions"
}
