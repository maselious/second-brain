import express, {Request, Response} from 'express'
import multer from 'multer'
import {exec, execSync} from 'child_process'
import path from 'path'
import fs from 'fs'
import 'dotenv/config'
import {fileURLToPath} from 'url'

// Получаем текущую папку (т.к. __dirname нет в ESM)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const upload = multer({dest: 'uploads/'})

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 МБ

const MODEL_NAME = process.env.WHISPER_MODEL || 'base'
const MODEL_PATH = `/app/models/ggml-${MODEL_NAME}.bin`
const AUDIO_DIR = '/audios'
const OUTPUT_DIR = '/output'

// Скачивание модели при необходимости
function ensureModel() {
  if (!fs.existsSync(MODEL_PATH)) {
    console.log(`🔽 Model not found. Downloading ${MODEL_NAME}...`)
    execSync(`/app/models/download-ggml-model.sh ${MODEL_NAME}`, {stdio: 'inherit'})
  } else {
    console.log(`✅ Model ${MODEL_NAME} already exists`)
  }
}

ensureModel()

app.use(express.json())

app.post('/transcribe', async (req: Request, res: Response): Promise<void> => {
  try {
    const {file} = req.body

    // 1. Проверка наличия поля
    if (!file || typeof file !== 'string') {
      res.status(400).json({error: 'Missing or invalid "file" parameter'})
      return
    }

    // 2. Проверка расширения
    if (!file.endsWith('.ogg')) {
      res.status(400).json({error: '"file" must be an .ogg file'})
      return
    }

    const inputOgg = path.join(AUDIO_DIR, file)

    const wavFilename = file.replace(/\.[^.]+$/, '.wav')
    const inputWav = path.join(AUDIO_DIR, wavFilename)

    const outputPath = path.join(OUTPUT_DIR, file.replace(/\.[^.]+$/, '.txt'))

    // 3. Проверка существования файла
    if (!fs.existsSync(inputOgg)) {
      res.status(404).json({error: `File ${file} not found in ${AUDIO_DIR}`})
      return
    }

    // 3.1. Проверка размера (10 МБ)
    const stats = fs.statSync(inputOgg)
    if (stats.size > MAX_FILE_SIZE) {
      res.status(413).json({
        error: `File ${file} is too large (${(stats.size / 1024 / 1024).toFixed(2)} MB). Max allowed is ${(MAX_FILE_SIZE / 1024 / 1024).toFixed(2)} MB.`
      })
      return
    }

    console.log(`🎧 Converting OGG to WAV: ${inputWav}`)
    execSync(`ffmpeg -y -i "${inputOgg}" -ar 16000 -ac 1 "${inputWav}"`, {stdio: 'inherit'})

    const command = `whisper-cli -m ${MODEL_PATH} -f "${inputWav}" -otxt -of "${outputPath.replace('.txt', '')}" -l ru`
    console.log(`🗣️ Whisper CLI: ${command}`)

    await execPromise(command)
    .catch((err) => {
      if (err) {
        console.error('❌ Whisper error:', err)
        return res.status(500).json({error: 'Whisper CLI failed'})
      }
    })
    .finally(() => {
      // Удаляем WAV вне зависимости от результата
      if (fs.existsSync(inputWav)) {
        try {
          fs.unlinkSync(inputWav)
          console.log(`🧹 Deleted temp file: ${inputWav}`)
        } catch (unlinkErr) {
          console.warn(`⚠️ Could not delete ${inputWav}:`, unlinkErr)
        }
      }
    })

    const transcript = fs.readFileSync(outputPath, 'utf-8')
    res.json({text: transcript})

  } catch (err) {
    console.error('[transcribe error]', err)
    res.status(500).json({error: 'Internal error'})
  }
})

function execPromise(command: string): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`\n🟡 Running command:\n${command}`)

    exec(command, (error, stdout, stderr) => {
      if (stdout) {
        console.log(`🟢 stdout:\n${stdout}`)
      }

      // if (stderr) {
      //   console.warn(`🟠 stderr:\n${stderr}`)
      // }

      if (error) {
        console.error(`🔴 Command failed with code ${error.code}: ${command}`)
        reject(new Error(stderr || error.message))
      } else {
        console.log('✅ Command succeeded')
        resolve()
      }
    })
  })
}

app.listen(3000, () => console.log(`✅ Whisper API running on http://localhost:3000`))
