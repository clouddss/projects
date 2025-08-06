#!/usr/bin/env node

const { spawn } = require('node:child_process')

const env = { ...process.env }

;(async() => {
  try {
    // If running the web server then prerender pages
    if (process.argv.slice(-3).join(' ') === 'pnpm run start') {
      console.log('Prerendering pages...')
      await exec('npx next build --experimental-build-mode generate')
    }

    // launch application
    const command = process.argv.slice(2).join(' ')
    console.log(`Launching application: ${command}`)
    await exec(command)
  } catch (error) {
    console.error('Application failed to start:', error.message)
    process.exit(1)
  }
})()

function exec(command) {
  const child = spawn(command, { shell: true, stdio: 'inherit', env })
  return new Promise((resolve, reject) => {
    child.on('exit', code => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`${command} failed rc=${code}`))
      }
    })
    
    child.on('error', (error) => {
      reject(new Error(`Failed to start command: ${error.message}`))
    })
  })
}
