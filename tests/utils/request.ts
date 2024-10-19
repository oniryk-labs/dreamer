import { IncomingMessage } from 'node:http'
import { Socket } from 'node:net'

export function createRequestFor(path: string) {
  const req = new IncomingMessage(new Socket())
  req.url = path
  return req
}
