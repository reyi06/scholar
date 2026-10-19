import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { IncomingMessage } from 'node:http'
import { MAX_DOCUMENT_BYTES, documentExtension } from '../src/lib/documents.ts'
import { HttpError } from './httpError.ts'

/**
 * Upload handling: a small `multipart/form-data` reader, and a directory of
 * files kept beside the database.
 *
 * Hand-rolled rather than pulled in, in keeping with the rest of the project.
 * It is deliberately narrow: the endpoint accepts one file and a few text
 * fields, so anything outside that shape is rejected rather than parsed. That
 * is why it is a fraction of the size of a general multipart parser.
 */

/** Where uploaded files live. Set UPLOAD_DIR to move them in a deployment. */
export const UPLOAD_DIR = process.env.UPLOAD_DIR ?? join(process.cwd(), 'uploads')

/** Slack above the file cap for part headers and boundary markers. */
const MULTIPART_OVERHEAD = 16 * 1024

export interface UploadedFile {
  fieldName: string
  fileName: string
  mimeType: string
  data: Buffer
}

export interface MultipartBody {
  fields: Record<string, string>
  files: UploadedFile[]
}

function boundaryFrom(contentType: string | undefined): string {
  if (!contentType) throw new HttpError(400, 'Expected a multipart upload.')
  const match = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType)
  const boundary = (match?.[1] ?? match?.[2] ?? '').trim()
  if (!boundary) throw new HttpError(400, 'The upload was missing its multipart boundary.')
  return boundary
}

async function readBody(req: IncomingMessage, limit: number): Promise<Buffer> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    const buffer = chunk as Buffer
    size += buffer.length
    if (size > limit) throw new HttpError(413, 'That upload is too large.')
    chunks.push(buffer)
  }
  return Buffer.concat(chunks)
}

/** Every slice of `buffer` between occurrences of `delimiter`. */
function splitOn(buffer: Buffer, delimiter: Buffer): Buffer[] {
  const parts: Buffer[] = []
  let start = 0
  let at = buffer.indexOf(delimiter, start)
  while (at !== -1) {
    parts.push(buffer.subarray(start, at))
    start = at + delimiter.length
    at = buffer.indexOf(delimiter, start)
  }
  parts.push(buffer.subarray(start))
  return parts
}

function headerValue(headers: string, name: string): string | null {
  const match = new RegExp(`^${name}:\\s*(.+)$`, 'im').exec(headers)
  return match ? match[1].trim() : null
}

function dispositionParam(disposition: string, param: string): string | undefined {
  return new RegExp(`${param}="([^"]*)"`).exec(disposition)?.[1]
}

/**
 * Read a multipart body into text fields and files.
 *
 * The body is buffered whole rather than streamed, which is safe here because
 * a single upload is capped at a few megabytes (see MAX_DOCUMENT_BYTES).
 */
export async function readMultipart(req: IncomingMessage): Promise<MultipartBody> {
  const boundary = boundaryFrom(req.headers['content-type'])
  const body = await readBody(req, MAX_DOCUMENT_BYTES + MULTIPART_OVERHEAD)
  const delimiter = Buffer.from(`\r\n--${boundary}`)

  // Every boundary is preceded by CRLF except the opening one, which sits at
  // the very start of the body. Prepending a CRLF makes the opening boundary
  // look like the rest, so one split finds all of them; the first slice is then
  // the empty leader before the first boundary.
  const segments = splitOn(Buffer.concat([Buffer.from('\r\n'), body]), delimiter)

  const fields: Record<string, string> = {}
  const files: UploadedFile[] = []

  for (const raw of segments.slice(1)) {
    // The closing delimiter leaves a bare '--' and nothing else.
    if (raw.length < 2 || raw[0] === 0x2d) continue
    // Each part opens with the CRLF that followed its boundary line.
    const part = raw.subarray(2)
    const headEnd = part.indexOf('\r\n\r\n')
    if (headEnd === -1) continue

    const headers = part.subarray(0, headEnd).toString('utf8')
    const data = part.subarray(headEnd + 4)
    const disposition = headerValue(headers, 'content-disposition')
    if (!disposition) continue

    const name = dispositionParam(disposition, 'name')
    if (name === undefined) continue
    const fileName = dispositionParam(disposition, 'filename')

    if (fileName === undefined) {
      fields[name] = data.toString('utf8')
      continue
    }

    files.push({
      fieldName: name,
      fileName,
      mimeType: headerValue(headers, 'content-type') ?? 'application/octet-stream',
      data: Buffer.from(data),
    })
  }

  return { fields, files }
}

/**
 * The on-disk name for a document: its id plus an extension taken from the
 * content type. The uploaded name is never used, because a name is the one part
 * of an upload the sender fully controls and it ends up in a filesystem path.
 */
export function storedNameFor(id: string, mimeType: string): string {
  const extension = documentExtension(mimeType)
  if (!extension) throw new HttpError(400, 'That file type is not accepted.')
  return `${id}${extension}`
}

/**
 * Whether a name is safe to join to the upload directory. Ids are generated by
 * us, so this only has to catch a row that was tampered with directly.
 */
function isSafeStoredName(name: string): boolean {
  return name.length > 0 && !/[\\/]/.test(name) && !name.includes('..')
}

export async function saveUpload(storedName: string, data: Buffer): Promise<void> {
  await mkdir(UPLOAD_DIR, { recursive: true })
  await writeFile(join(UPLOAD_DIR, storedName), data)
}

export async function readUpload(storedName: string): Promise<Buffer | null> {
  if (!isSafeStoredName(storedName)) return null
  try {
    return await readFile(join(UPLOAD_DIR, storedName))
  } catch {
    return null
  }
}

export async function deleteUpload(storedName: string): Promise<void> {
  if (!isSafeStoredName(storedName)) return
  await unlink(join(UPLOAD_DIR, storedName)).catch(() => undefined)
}
