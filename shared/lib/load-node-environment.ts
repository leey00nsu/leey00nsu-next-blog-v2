import path from 'node:path'
import dotenv from 'dotenv'

export function loadNodeEnvironment(
  projectDirectory: string = process.cwd(),
): void {
  dotenv.config({
    path: path.resolve(projectDirectory, '.env'),
  })
  dotenv.config({
    path: path.resolve(projectDirectory, '.env.local'),
    override: true,
  })
}

loadNodeEnvironment()
