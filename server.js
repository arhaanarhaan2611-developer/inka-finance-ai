
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { GoogleGenAI } from '@google/genai'

const app = express()

app.use(cors())
app.use(express.json())

const PORT = process.env.PORT || 3001

// ========================================
// INKA FINANCE AI CONFIGURATION
// ========================================

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
})

const PRIMARY_MODEL = 'gemini-3.5-flash-lite'
const FALLBACK_MODEL = 'gemini-3.8-flash'

const SYSTEM_INSTRUCTION = `
You are INKA, an intelligent financial analysis assistant.

Analyze ONLY the financial data provided by the user.

Rules:
- Be clear and practical.
- Keep answers short.
- Do not invent financial data.
- If the data is insufficient, say so.
- Prefer simple English.
- Give the most useful answer first.
- Avoid unnecessary explanations.
`

function isTemporaryError(error) {
  const status = error?.status || error?.code

  return (
    status === 503 ||
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 504
  )
}

// ========================================
// GEMINI STREAMING FUNCTION
// ========================================

async function streamFromModel(model, prompt, res) {
  console.log(`\nTrying Gemini model: ${model}`)

  const startTime = Date.now()

  console.log('Starting Gemini request...')

  const stream = await ai.models.generateContentStream({
    model,
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      maxOutputTokens: 256,
    },
  })

  console.log(
    `Gemini stream started after ${Date.now() - startTime} ms`
  )

  let sentSomething = false
  let firstChunk = true

  for await (const chunk of stream) {
    const text = chunk.text

    if (text) {
      if (firstChunk) {
        console.log(
          `FIRST AI TEXT ARRIVED AFTER ${Date.now() - startTime} ms`
        )
        firstChunk = false
      }

      sentSomething = true
      res.write(text)
    }
  }

  console.log(
    `Gemini finished after ${Date.now() - startTime} ms`
  )

  return sentSomething
}

// ========================================
// ORIGINAL INKA AI ENDPOINT
// ========================================

app.post('/api/ai', async (req, res) => {
  const requestStart = Date.now()

  const { prompt } = req.body || {}

  if (typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({
      error: 'Prompt is required',
    })
  }

  console.log('\n==============================')
  console.log('INKA request received')
  console.log(`Prompt length: ${prompt.length} characters`)

  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')

  res.flushHeaders()

  try {
    // PRIMARY MODEL
    try {
      await streamFromModel(
        PRIMARY_MODEL,
        prompt,
        res
      )

      res.end()

      console.log(
        `TOTAL REQUEST TIME: ${Date.now() - requestStart} ms`
      )
      console.log('INKA response completed with primary model')
      console.log('==============================\n')

      return
    } catch (error) {
      console.error(
        `Primary model failed: ${
          error?.status ||
          error?.code ||
          error?.message
        }`
      )

      if (res.writableEnded) {
        return
      }

      if (!isTemporaryError(error)) {
        throw error
      }

      console.log('Trying fallback Gemini model...')
    }

    // FALLBACK MODEL
    try {
      await streamFromModel(
        FALLBACK_MODEL,
        prompt,
        res
      )

      res.end()

      console.log(
        `TOTAL REQUEST TIME: ${Date.now() - requestStart} ms`
      )
      console.log('INKA response completed with fallback model')
      console.log('==============================\n')

      return
    } catch (error) {
      console.error(
        `Fallback model failed: ${
          error?.status ||
          error?.code ||
          error?.message
        }`
      )

      if (!res.headersSent) {
        return res.status(503).json({
          error:
            'INKA AI is temporarily busy. Please try again in a moment.',
        })
      }

      res.end()
    }
  } catch (error) {
    console.error('========== GEMINI ERROR ==========')
    console.error(error)
    console.error('==================================')

    if (!res.headersSent) {
      return res.status(500).json({
        error: 'INKA AI request failed.',
      })
    }

    res.end()
  }
})

// ========================================
// NEW INKA LIVE MARKET DATA API
// ========================================

app.get('/api/markets', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store')

  try {
    const apiKey = process.env.TWELVE_DATA_API_KEY

    if (!apiKey) {
      return res.status(503).json({
        connected: false,
        error: 'Twelve Data API key is missing',
      })
    }

    const url = new URL(
      'https://api.twelvedata.com/quote'
    )

    // Initial market connection test
    url.searchParams.set('symbol', 'AAPL')
    url.searchParams.set('apikey', apiKey)

    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      throw new Error(
        `Market provider returned HTTP ${response.status}`
      )
    }

    const data = await response.json()

    if (
      data.status === 'error' ||
      !data.symbol ||
      data.close == null ||
      !Number.isFinite(Number(data.close))
    ) {
      return res.status(502).json({
        connected: false,
        error: data.message || 'Market data unavailable',
      })
    }

    return res.json({
      connected: true,
      provider: 'Twelve Data',
      market: {
        symbol: data.symbol,
        name: data.name || data.symbol,
        price: Number(data.close),
        change:
          data.change == null
            ? null
            : Number(data.change),
        percentChange:
          data.percent_change == null
            ? null
            : Number(data.percent_change),
        currency: data.currency || 'USD',
        datetime: data.datetime || null,
      },
    })
  } catch (error) {
    console.error(
      'INKA market API error:',
      error.message
    )

    return res.status(503).json({
      connected: false,
      error: 'Unable to retrieve market data',
    })
  }
})

// ========================================
// BACKEND HEALTH CHECK
// ========================================

app.get('/', (req, res) => {
  res.send('INKA AI backend is running.')
})

// ========================================
// START INKA BACKEND
// ========================================

app.listen(PORT, () => {
  console.log(
    `INKA AI backend running on http://localhost:${PORT}`
  )
})
