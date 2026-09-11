import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { GoogleGenAI } from '@google/genai'

const app = express()

app.use(cors())
app.use(express.json())

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
})

const PORT = process.env.PORT || 3001

// Fast primary model + fallback model
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

async function streamFromModel(model, prompt, res) {
  console.log(`Trying Gemini model: ${model}`)

  const stream = await ai.models.generateContentStream({
    model,
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,

      // Keep INKA responses short for faster generation.
      maxOutputTokens: 256,
    },
  })

  let sentSomething = false

  for await (const chunk of stream) {
    const text = chunk.text

    if (text) {
      sentSomething = true
      res.write(text)
    }
  }

  return sentSomething
}

app.post('/api/ai', async (req, res) => {
  const { prompt } = req.body

  if (!prompt || !prompt.trim()) {
    return res.status(400).json({
      error: 'Prompt is required',
    })
  }

  console.log('INKA request received')

  // Tell proxies not to buffer the stream.
  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')

  res.flushHeaders()

  try {
    // First attempt: fastest model.
    try {
      await streamFromModel(
        PRIMARY_MODEL,
        prompt,
        res
      )

      res.end()

      console.log('INKA response completed with primary model')
      return
    } catch (error) {
      console.error(
        `Primary model failed: ${error?.status || error?.code || error?.message}`
      )

      // If the request already started sending text,
      // we cannot safely switch models mid-response.
      if (res.writableEnded) {
        return
      }

      // Only fallback for temporary Gemini errors.
      if (!isTemporaryError(error)) {
        throw error
      }

      console.log('Trying fallback Gemini model...')
    }

    // Second attempt: fallback model.
    try {
      await streamFromModel(
        FALLBACK_MODEL,
        prompt,
        res
      )

      res.end()

      console.log('INKA response completed with fallback model')
      return
    } catch (error) {
      console.error(
        `Fallback model failed: ${error?.status || error?.code || error?.message}`
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

app.get('/', (req, res) => {
  res.send('INKA AI backend is running.')
})

app.listen(PORT, () => {
  console.log(
    `INKA AI backend running on http://localhost:${PORT}`
  )
})