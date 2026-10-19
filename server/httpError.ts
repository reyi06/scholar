/**
 * An error carrying the HTTP status it should be reported with.
 *
 * Kept in its own module because both the router (`server/index.ts`) and the
 * upload reader (`server/uploads.ts`) throw it, and the router imports the
 * upload reader — so the class cannot live in the router.
 */
export class HttpError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}
