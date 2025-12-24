/**
 * Netlify DB POC: Test Database Connection
 *
 * Simple endpoint to verify Netlify DB is provisioned and accessible
 *
 * GET /.netlify/functions/test-connection - Test database connectivity
 */

import { neon } from '@neondatabase/serverless'

export default async (req, context) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  }

  try {
    console.log('Testing Netlify DB connection...')

    // Initialize Neon SQL client
    // Use pooled connection for better serverless performance
    const sql = neon(process.env.NETLIFY_DATABASE_URL)

    // Test query
    const result = await sql`SELECT NOW() as current_time, version() as pg_version`

    // Get table info
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `

    // Get session count
    const sessionCount = await sql`SELECT COUNT(*) as count FROM sessions`

    console.log('Database connection successful!')

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Netlify DB connection successful',
        database: {
          currentTime: result[0].current_time,
          postgresVersion: result[0].pg_version,
          tables: tables.map(t => t.table_name),
          sessionCount: parseInt(sessionCount[0].count)
        },
        environment: {
          databaseUrl: process.env.DATABASE_URL ? '✅ Set' : '❌ Not set',
          adminPassword: process.env.ADMIN_PASSWORD ? '✅ Set' : '❌ Not set'
        }
      }),
      { status: 200, headers }
    )
  } catch (error) {
    console.error('Database connection failed:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Database Connection Failed',
        message: error.message,
        details: error.stack
      }),
      { status: 500, headers }
    )
  }
}

export const config = {
  path: "/test-connection"
}
