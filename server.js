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

app.post('/api/ai', async (req, res) => {
  try {
    const { prompt } = req.body

    if (!prompt) {
      return res.status(400).json({
        error: 'Prompt is required',
      })
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        systemInstruction:
          'You are INKA, an intelligent financial analysis assistant. Analyze only the financial data provided by the user. Give clear, practical, concise insights. Never invent financial data.',
      },
    })

    res.json({
      answer: response.text,
    })
  } catch (error) {
    console.error('Gemini API Error:', error)

    res.status(500).json({
      error: 'AI request failed',
    })
  }
})

app.listen(3001, () => {
  console.log('INKA AI backend running on http://localhost:3001')
})
